# How to Rotate Kubernetes Secrets on Talos Linux

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Talos Linux, Kubernetes, Secrets Rotation, Security, DevOps

Description: A practical guide to rotating Kubernetes secrets on Talos Linux clusters, covering manual, automated, and tool-based rotation strategies.

---

Secret rotation is a critical security practice that limits the window of exposure if a secret is compromised. In Kubernetes, secrets can contain database passwords, API tokens, TLS certificates, and other credentials that should be changed periodically. On Talos Linux, where the operating system is immutable and all management happens through APIs, secret rotation needs to be handled entirely through Kubernetes-native approaches.

This guide covers multiple strategies for rotating secrets on Talos Linux, from simple manual processes to fully automated pipelines.

## Why Secret Rotation Matters

Secrets that never change become liabilities over time. Team members leave the organization but may still know old passwords. Credentials get accidentally logged or exposed in debugging sessions. Compliance frameworks like SOC 2, PCI DSS, and HIPAA all require regular credential rotation. Even if you trust your current security posture, rotation ensures that any past breach has a limited blast radius.

## Manual Secret Rotation

The simplest approach is manually updating Kubernetes secrets. While not ideal for production at scale, it is useful for understanding the mechanics.

```bash
# Step 1: Generate a new credential
NEW_PASSWORD=$(openssl rand -base64 24)
echo "New password: $NEW_PASSWORD"

# Step 2: Update the secret in Kubernetes
kubectl create secret generic db-credentials \
  --from-literal=password="$NEW_PASSWORD" \
  --from-literal=username="dbadmin" \
  --dry-run=client -o yaml | kubectl apply -f -

# Step 3: Verify the update
kubectl get secret db-credentials -o jsonpath='{.data.password}' | base64 -d
```

After updating the secret, pods that mount it as a volume will see the new value within the kubelet sync period (typically 1-2 minutes). However, pods that use secrets as environment variables will NOT pick up the change until they are restarted.

```bash
# Restart pods to pick up new environment variable values
kubectl rollout restart deployment/my-app
```

## Rolling Restart Strategy

When rotating secrets that are consumed as environment variables, you need a strategy to restart pods without downtime.

```bash
# Annotate the deployment to track secret versions
kubectl patch deployment my-app -p \
  "{\"spec\":{\"template\":{\"metadata\":{\"annotations\":{\"secret-version\":\"$(date +%s)\"}}}}}"
```

This triggers a rolling restart because the pod template changed. A more structured approach uses a hash of the secret contents.

```yaml
# deployment-with-secret-hash.yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: my-app
spec:
  replicas: 3
  selector:
    matchLabels:
      app: my-app
  template:
    metadata:
      labels:
        app: my-app
      annotations:
        # Update this hash when the secret changes
        secret-hash: "sha256-abc123"
    spec:
      containers:
        - name: app
          image: my-app:latest
          envFrom:
            - secretRef:
                name: db-credentials
```

## Automated Rotation with CronJobs

For regular rotation, create a CronJob that generates new credentials and updates both the external system and the Kubernetes secret.

```yaml
# secret-rotation-job.yaml
apiVersion: batch/v1
kind: CronJob
metadata:
  name: rotate-db-password
  namespace: default
spec:
  schedule: "0 2 1 * *"  # Run at 2 AM on the first day of each month
  concurrencyPolicy: Forbid
  jobTemplate:
    spec:
      template:
        spec:
          serviceAccountName: secret-rotator
          containers:
            - name: rotator
              image: bitnami/kubectl:latest
              command:
                - /bin/bash
                - -c
                - |
                  set -e

                  # Generate a new password
                  NEW_PASS=$(head -c 32 /dev/urandom | base64 | tr -d '=' | head -c 32)

                  # Update the Kubernetes secret
                  kubectl create secret generic db-credentials \
                    --from-literal=password="$NEW_PASS" \
                    --from-literal=username="dbadmin" \
                    --dry-run=client -o yaml | kubectl apply -f -

                  echo "Secret rotated successfully at $(date)"

                  # Trigger a rolling restart of dependent deployments
                  kubectl rollout restart deployment/my-app

                  echo "Rolling restart initiated"
          restartPolicy: OnFailure
```

Create the service account and RBAC rules for the rotation job.

```yaml
# rotator-rbac.yaml
apiVersion: v1
kind: ServiceAccount
metadata:
  name: secret-rotator
  namespace: default
---
apiVersion: rbac.authorization.k8s.io/v1
kind: Role
metadata:
  name: secret-rotator-role
  namespace: default
rules:
  - apiGroups: [""]
    resources: ["secrets"]
    verbs: ["get", "create", "update", "patch"]
  - apiGroups: ["apps"]
    resources: ["deployments"]
    verbs: ["get", "patch"]
---
apiVersion: rbac.authorization.k8s.io/v1
kind: RoleBinding
metadata:
  name: secret-rotator-binding
  namespace: default
roleRef:
  apiGroup: rbac.authorization.k8s.io
  kind: Role
  name: secret-rotator-role
subjects:
  - kind: ServiceAccount
    name: secret-rotator
    namespace: default
```

```bash
kubectl apply -f rotator-rbac.yaml
kubectl apply -f secret-rotation-job.yaml
```

## Rotation with External Secrets Operator

If you use the External Secrets Operator (ESO) with an external provider, rotation becomes simpler. You rotate the secret in the external provider, and ESO picks up the change during its next sync.

```yaml
# External secret with a short refresh interval
apiVersion: external-secrets.io/v1beta1
kind: ExternalSecret
metadata:
  name: rotating-db-secret
  namespace: default
spec:
  # Refresh every 5 minutes to pick up rotations quickly
  refreshInterval: 5m
  secretStoreRef:
    name: aws-secrets-manager
    kind: ClusterSecretStore
  target:
    name: db-credentials
    creationPolicy: Owner
  data:
    - secretKey: password
      remoteRef:
        key: production/database
        property: password
```

Rotate the secret in AWS Secrets Manager.

```bash
# Update the secret in AWS
aws secretsmanager update-secret \
  --secret-id production/database \
  --secret-string '{"username":"dbadmin","password":"new-rotated-password-123"}'

# ESO will pick up the change within 5 minutes
# Watch the sync status
kubectl get externalsecret rotating-db-secret -w
```

## Dual-Password Rotation Pattern

For database credentials, a common pattern is to maintain two passwords simultaneously. This allows zero-downtime rotation.

```bash
# Step 1: Add a second password to the database
# (The database accepts both passwords during the transition)
psql -h db.example.com -U postgres -c \
  "ALTER USER dbadmin WITH PASSWORD 'new-password-456';"

# Step 2: Update the Kubernetes secret with the new password
kubectl create secret generic db-credentials \
  --from-literal=password="new-password-456" \
  --from-literal=username="dbadmin" \
  --dry-run=client -o yaml | kubectl apply -f -

# Step 3: Restart the application pods
kubectl rollout restart deployment/my-app

# Step 4: Wait for all old pods to terminate
kubectl rollout status deployment/my-app

# Step 5: Remove the old password from the database
# (Only after all pods are using the new password)
```

## TLS Certificate Rotation

TLS certificates are a special case of secret rotation. With cert-manager installed on your Talos Linux cluster, certificate rotation can be fully automated.

```yaml
# certificate.yaml
apiVersion: cert-manager.io/v1
kind: Certificate
metadata:
  name: my-app-tls
  namespace: default
spec:
  secretName: my-app-tls-secret
  duration: 90d
  renewBefore: 30d
  issuerRef:
    name: letsencrypt-prod
    kind: ClusterIssuer
  dnsNames:
    - app.example.com
    - www.app.example.com
```

cert-manager handles the renewal automatically 30 days before expiration. Ingress controllers typically pick up the new certificate without pod restarts.

## Monitoring Rotation Health

Set up monitoring to ensure rotations are happening on schedule.

```yaml
# rotation-monitor.yaml
apiVersion: batch/v1
kind: CronJob
metadata:
  name: check-secret-age
  namespace: monitoring
spec:
  schedule: "0 8 * * *"  # Check every morning
  jobTemplate:
    spec:
      template:
        spec:
          serviceAccountName: secret-monitor
          containers:
            - name: checker
              image: bitnami/kubectl:latest
              command:
                - /bin/bash
                - -c
                - |
                  # Check the age of secrets
                  echo "Checking secret ages..."
                  kubectl get secrets --all-namespaces \
                    -o custom-columns=\
                    NAMESPACE:.metadata.namespace,\
                    NAME:.metadata.name,\
                    CREATED:.metadata.creationTimestamp \
                    --sort-by=.metadata.creationTimestamp

                  # Alert on secrets older than 90 days
                  THRESHOLD=$(date -d "90 days ago" +%s 2>/dev/null || date -v-90d +%s)
                  kubectl get secrets --all-namespaces -o json | \
                    jq -r '.items[] |
                    select(.metadata.creationTimestamp) |
                    select((.metadata.creationTimestamp | fromdateiso8601) < '"$THRESHOLD"') |
                    "\(.metadata.namespace)/\(.metadata.name) - created: \(.metadata.creationTimestamp)"'
          restartPolicy: OnFailure
```

## Talos-Specific Rotation Considerations

Talos Linux has some unique aspects to consider for secret rotation:

1. **Talos machine config secrets**: The Talos machine configuration contains its own secrets (cluster CA, bootstrap token, etc.). These can be rotated using talosctl.

```bash
# Rotate the Talos cluster secrets
talosctl gen secrets --from-controlplane-config controlplane.yaml > new-secrets.yaml

# Apply updated machine config with new secrets
talosctl apply-config --nodes 10.0.0.10 --file updated-controlplane.yaml
```

2. **etcd encryption keys**: If you have encryption at rest enabled, rotate those keys periodically (covered in a separate guide).

3. **No SSH access**: Since you cannot SSH into Talos nodes, all rotation must be done through kubectl, talosctl, or automated controllers.

4. **Kubelet certificate rotation**: Talos enables kubelet certificate rotation by default, so node certificates are handled automatically.

## Building a Rotation Runbook

Document your rotation procedures in a runbook that covers:

- Which secrets exist and their rotation schedule
- How to rotate each type of secret (database, API key, TLS cert, etc.)
- How to verify the rotation was successful
- Rollback procedures if something goes wrong
- Who is responsible for each rotation

## Wrapping Up

Secret rotation on Talos Linux follows the same Kubernetes patterns as any other cluster, but the immutable nature of Talos means you must rely entirely on Kubernetes-native tools and APIs. Whether you use manual rotation for simple setups, CronJobs for scheduled automation, or External Secrets Operator for provider-integrated rotation, the important thing is to have a process in place and to follow it consistently. Regular rotation, combined with monitoring and alerting, reduces the risk of credential compromise and keeps your Talos Linux cluster secure over time.
