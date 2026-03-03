# How to Handle Secret Rotation on Talos Linux

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Talos Linux, Kubernetes, Secret, Security, Secret Rotation, DevOps

Description: A comprehensive guide to implementing secret rotation strategies on Talos Linux to keep your Kubernetes cluster secure and credentials fresh.

---

Rotating secrets is a critical security practice that limits the window of exposure if credentials are compromised. On Talos Linux, where the operating system itself is designed with security as a priority, having a solid secret rotation strategy completes the picture. Stale credentials sitting in your cluster for months or years are a liability, and automating their rotation reduces both risk and operational burden.

This guide covers manual and automated approaches to secret rotation on Talos Linux clusters.

## Why Rotate Secrets?

Secret rotation matters for several reasons:

- Leaked credentials have a limited useful lifetime if they are regularly rotated
- Compliance frameworks (SOC 2, PCI DSS, HIPAA) often require periodic credential rotation
- Former team members who had access to secrets lose that access after rotation
- It reduces the blast radius of a security breach

The goal is to make rotation routine and ideally automatic, so it does not become a task that gets deferred indefinitely.

## Understanding the Rotation Challenge

Rotating a Kubernetes Secret involves several coordinated steps:

1. Generate new credentials in the external system (database, API provider, etc.)
2. Update the Kubernetes Secret with the new credentials
3. Ensure running applications pick up the new credentials
4. Verify the application works with the new credentials
5. Revoke the old credentials

The tricky part is step 3. How your application consumes the Secret determines how you handle this.

## Manual Secret Rotation

Let us start with the manual approach, which is fine for small clusters or infrequent rotations.

### Step 1: Update the Secret

```bash
# Update a secret with new credentials
kubectl create secret generic db-credentials \
  --from-literal=username=dbadmin \
  --from-literal=password='NewR0tatedP@ss2024!' \
  --dry-run=client -o yaml | kubectl apply -f -

# Or patch a specific key
kubectl patch secret db-credentials --type merge \
  -p '{"stringData":{"password":"NewR0tatedP@ss2024!"}}'
```

### Step 2: Restart Applications

If your application reads secrets as environment variables, you need to restart pods:

```bash
# Rolling restart of a deployment
kubectl rollout restart deployment myapp

# Watch the rollout
kubectl rollout status deployment myapp
```

If your application mounts secrets as volumes and watches for file changes, the kubelet will update the mounted files automatically within about 60 seconds. No restart needed in this case.

### Step 3: Verify

```bash
# Check that pods are running with new secrets
kubectl get pods -l app=myapp

# Verify the application is healthy
kubectl exec deployment/myapp -- curl -s localhost:8080/health
```

## Dual-Credential Rotation Pattern

The safest rotation approach uses dual credentials, where both the old and new credentials work simultaneously during the transition:

```yaml
# Step 1: Application supports both credential sets
apiVersion: v1
kind: Secret
metadata:
  name: api-credentials
type: Opaque
stringData:
  # Current active credentials
  api-key: "current-key-12345"
  api-secret: "current-secret-67890"
  # New credentials (application tries these first)
  api-key-new: "new-key-abcde"
  api-secret-new: "new-secret-fghij"
```

The rotation process:

1. Create new credentials in the external system (do not revoke old ones yet)
2. Add new credentials to the Secret alongside the old ones
3. Update the application to prefer new credentials but fall back to old ones
4. Verify the application works with new credentials
5. Remove old credentials from the Secret
6. Revoke old credentials in the external system

## Automated Rotation with CronJobs

For regular rotation schedules, use a Kubernetes CronJob:

```yaml
# secret-rotator-rbac.yaml
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
  verbs: ["get", "update", "patch"]
  resourceNames: ["db-credentials"]
---
apiVersion: rbac.authorization.k8s.io/v1
kind: RoleBinding
metadata:
  name: secret-rotator-binding
  namespace: default
subjects:
- kind: ServiceAccount
  name: secret-rotator
  namespace: default
roleRef:
  kind: Role
  name: secret-rotator-role
  apiGroup: rbac.authorization.k8s.io
```

```yaml
# secret-rotation-cronjob.yaml
apiVersion: batch/v1
kind: CronJob
metadata:
  name: rotate-db-password
  namespace: default
spec:
  schedule: "0 2 1 * *"  # Run at 2 AM on the first of each month
  jobTemplate:
    spec:
      template:
        spec:
          serviceAccountName: secret-rotator
          containers:
          - name: rotator
            image: bitnami/kubectl:latest
            command: ['sh', '-c']
            args:
            - |
              # Generate a new random password
              NEW_PASSWORD=$(head -c 32 /dev/urandom | base64 | tr -dc 'A-Za-z0-9!@#$%' | head -c 24)

              # Update the Kubernetes secret
              kubectl patch secret db-credentials --type merge \
                -p "{\"stringData\":{\"password\":\"${NEW_PASSWORD}\"}}"

              echo "Secret rotated successfully at $(date)"

              # Trigger a rolling restart of the application
              kubectl rollout restart deployment myapp

              # Wait for rollout to complete
              kubectl rollout status deployment myapp --timeout=300s
          restartPolicy: OnFailure
```

## Using External Secrets Operator

The External Secrets Operator (ESO) can automatically sync secrets from external providers and handle rotation:

```bash
# Install External Secrets Operator using Helm
helm repo add external-secrets https://charts.external-secrets.io
helm install external-secrets external-secrets/external-secrets \
  --namespace external-secrets --create-namespace
```

Configure a SecretStore to connect to your secrets provider:

```yaml
# secret-store.yaml
apiVersion: external-secrets.io/v1beta1
kind: SecretStore
metadata:
  name: vault-store
  namespace: default
spec:
  provider:
    vault:
      server: "https://vault.internal.svc.cluster.local:8200"
      path: "secret"
      version: "v2"
      auth:
        kubernetes:
          mountPath: "kubernetes"
          role: "myapp-role"
```

```yaml
# external-secret.yaml
apiVersion: external-secrets.io/v1beta1
kind: ExternalSecret
metadata:
  name: db-credentials
  namespace: default
spec:
  refreshInterval: 1h  # Check for updates every hour
  secretStoreRef:
    name: vault-store
    kind: SecretStore
  target:
    name: db-credentials
    creationPolicy: Owner
  data:
  - secretKey: username
    remoteRef:
      key: database/creds/myapp
      property: username
  - secretKey: password
    remoteRef:
      key: database/creds/myapp
      property: password
```

With this setup, the External Secrets Operator checks Vault every hour and updates the Kubernetes Secret if the remote values have changed.

## HashiCorp Vault Integration

For a complete rotation solution with Vault on Talos Linux:

```yaml
# vault-agent-sidecar.yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: myapp
spec:
  selector:
    matchLabels:
      app: myapp
  template:
    metadata:
      labels:
        app: myapp
      annotations:
        vault.hashicorp.com/agent-inject: "true"
        vault.hashicorp.com/role: "myapp"
        vault.hashicorp.com/agent-inject-secret-db-creds: "database/creds/myapp"
        vault.hashicorp.com/agent-inject-template-db-creds: |
          {{- with secret "database/creds/myapp" -}}
          export DB_USERNAME="{{ .Data.username }}"
          export DB_PASSWORD="{{ .Data.password }}"
          {{- end }}
    spec:
      serviceAccountName: myapp-sa
      containers:
      - name: myapp
        image: myapp:latest
        command: ['sh', '-c', 'source /vault/secrets/db-creds && exec ./myapp']
```

Vault can generate dynamic database credentials with automatic expiration, which is the gold standard for secret rotation.

## Reloader for Automatic Pod Restarts

Stakater Reloader watches for Secret and ConfigMap changes and triggers rolling updates automatically:

```bash
# Install Reloader
helm repo add stakater https://stakater.github.io/stakater-charts
helm install reloader stakater/reloader --namespace default
```

Annotate your Deployments to enable automatic restarts on Secret changes:

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: myapp
  annotations:
    # Restart when this specific secret changes
    secret.reloader.stakater.com/reload: "db-credentials,api-credentials"
spec:
  template:
    spec:
      containers:
      - name: myapp
        image: myapp:latest
        envFrom:
        - secretRef:
            name: db-credentials
```

Now when you rotate the `db-credentials` Secret, Reloader automatically triggers a rolling restart of the Deployment.

## Monitoring Rotation

Track when secrets were last rotated:

```bash
# Check when a secret was last modified
kubectl get secret db-credentials -o jsonpath='{.metadata.resourceVersion}'
kubectl get secret db-credentials -o jsonpath='{.metadata.managedFields[*].time}'

# Add annotations to track rotation
kubectl annotate secret db-credentials \
  last-rotated="$(date -u +%Y-%m-%dT%H:%M:%SZ)" --overwrite

# Find secrets that haven't been rotated recently
kubectl get secrets -o json | jq -r '
  .items[] |
  select(.type == "Opaque") |
  .metadata.name + " - Last modified: " +
  (.metadata.managedFields[-1].time // "unknown")'
```

## Best Practices

1. **Automate everything.** Manual rotation is error-prone and gets skipped. Use the External Secrets Operator, Vault, or at minimum a CronJob.

2. **Test rotation in staging first.** A botched rotation in production can cause outages. Practice the process in a non-production environment.

3. **Use volume mounts over environment variables.** Volume-mounted secrets update automatically, while environment variables require pod restarts.

4. **Keep rotation logs.** Annotate secrets with rotation timestamps and maintain audit logs.

5. **Set up alerts.** Monitor for secrets that have not been rotated within their expected rotation period.

## Wrapping Up

Secret rotation on Talos Linux follows the same Kubernetes patterns as any other distribution, but the security-focused nature of Talos makes it especially important to get right. Start with manual rotation to understand the process, then move to automated solutions like the External Secrets Operator or HashiCorp Vault. Use Reloader to automatically restart pods when secrets change, and always monitor your rotation schedule to catch missed rotations before they become security risks.
