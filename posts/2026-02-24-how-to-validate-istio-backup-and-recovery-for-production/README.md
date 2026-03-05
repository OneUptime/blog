# How to Validate Istio Backup and Recovery for Production

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Istio, Backup, Disaster Recovery, Kubernetes, Production

Description: Practical guide for validating Istio backup and recovery procedures for production including configuration export, secret management, and restoration testing.

---

Nobody thinks about backup and recovery until they need it, and by then it is too late to figure it out. With Istio, a bad configuration push or an accidental deletion can take down routing for your entire mesh. Having a tested backup and recovery process is not optional for production.

Here is how to validate that you can actually recover your Istio configuration when things go wrong.

## Identify What Needs to Be Backed Up

Istio stores its configuration as Kubernetes custom resources. Here is what you need to capture:

```bash
# List all Istio CRDs
kubectl get crd | grep istio

# The key resources to back up
kubectl get virtualservice -A
kubectl get destinationrule -A
kubectl get gateway -A
kubectl get serviceentry -A
kubectl get sidecar -A
kubectl get authorizationpolicy -A
kubectl get peerauthentication -A
kubectl get requestauthentication -A
kubectl get telemetry -A
kubectl get envoyfilter -A
```

Beyond the custom resources, you also need to back up:

- TLS certificates and secrets in the istio-system namespace
- The IstioOperator configuration used for installation
- Any custom ConfigMaps

## Export All Istio Configuration

Create a comprehensive backup script:

```bash
#!/bin/bash
BACKUP_DIR="istio-backup-$(date +%Y%m%d-%H%M%S)"
mkdir -p "$BACKUP_DIR"

# Export all Istio custom resources
RESOURCES=(
  virtualservice
  destinationrule
  gateway
  serviceentry
  sidecar
  authorizationpolicy
  peerauthentication
  requestauthentication
  telemetry
  envoyfilter
  workloadentry
  workloadgroup
)

for resource in "${RESOURCES[@]}"; do
  echo "Exporting $resource..."
  kubectl get "$resource" -A -o yaml > "$BACKUP_DIR/$resource.yaml" 2>/dev/null
done

# Export IstioOperator
kubectl get istiooperator -n istio-system -o yaml > "$BACKUP_DIR/istiooperator.yaml" 2>/dev/null

# Export secrets (certificates)
kubectl get secret -n istio-system -o yaml > "$BACKUP_DIR/istio-secrets.yaml"

# Export configmaps
kubectl get configmap -n istio-system -o yaml > "$BACKUP_DIR/istio-configmaps.yaml"

echo "Backup saved to $BACKUP_DIR"
tar czf "$BACKUP_DIR.tar.gz" "$BACKUP_DIR"
```

Run this script and verify the output contains actual data:

```bash
ls -la istio-backup-*/
wc -l istio-backup-*/*.yaml
```

## Validate Backup Completeness

A backup is worthless if it is incomplete. Cross-check your backup against the live cluster:

```bash
# Count resources in cluster
for resource in virtualservice destinationrule gateway serviceentry authorizationpolicy peerauthentication; do
  LIVE=$(kubectl get "$resource" -A --no-headers 2>/dev/null | wc -l)
  BACKUP=$(grep "kind:" "istio-backup-latest/$resource.yaml" 2>/dev/null | wc -l)
  echo "$resource: live=$LIVE backup=$BACKUP"
done
```

The numbers should match. If your backup has fewer resources than what is running, something was missed.

## Clean Up Kubernetes Metadata

Exported YAML includes metadata that will cause problems during restoration (like resourceVersion, uid, and managedFields). Strip these before storing your backup:

```bash
# Use yq to clean up exported resources
for file in "$BACKUP_DIR"/*.yaml; do
  yq eval 'del(.items[].metadata.resourceVersion, .items[].metadata.uid, .items[].metadata.creationTimestamp, .items[].metadata.generation, .items[].metadata.managedFields, .items[].metadata.annotations["kubectl.kubernetes.io/last-applied-configuration"])' -i "$file"
done
```

## Test Restoration in a Non-Production Environment

This is the most important step that most teams skip. You need to actually test restoring your backup.

Set up a test cluster or namespace and try restoring:

```bash
# Create a test namespace
kubectl create namespace istio-restore-test

# Try applying the backed up resources
for file in istio-backup-latest/*.yaml; do
  echo "Restoring $file..."
  kubectl apply -f "$file" --dry-run=server 2>&1 | tail -5
done
```

The `--dry-run=server` flag validates that the resources can be applied without actually creating them. Fix any errors before considering your backup valid.

## Back Up TLS Certificates

Istio certificates are critical. If you lose your CA certificate, all mTLS communication breaks because new certificates will not be trusted by workloads holding old ones.

```bash
# Back up the CA secret
kubectl get secret istio-ca-secret -n istio-system -o yaml > istio-ca-backup.yaml

# Back up gateway TLS secrets
kubectl get secrets -n istio-system -l istio/gateway -o yaml > gateway-certs-backup.yaml

# Verify the CA certificate
kubectl get secret istio-ca-secret -n istio-system -o jsonpath='{.data.ca-cert\.pem}' | base64 -d | openssl x509 -text -noout | grep "Not After"
```

Store these secrets encrypted. Never put raw TLS secrets in plaintext storage.

## Set Up Automated Backups

Manual backups get forgotten. Schedule a CronJob in your cluster:

```yaml
apiVersion: batch/v1
kind: CronJob
metadata:
  name: istio-backup
  namespace: istio-system
spec:
  schedule: "0 */6 * * *"
  jobTemplate:
    spec:
      template:
        spec:
          serviceAccountName: istio-backup-sa
          containers:
            - name: backup
              image: bitnami/kubectl:latest
              command:
                - /bin/bash
                - -c
                - |
                  BACKUP_DIR="/backup/istio-$(date +%Y%m%d-%H%M%S)"
                  mkdir -p "$BACKUP_DIR"
                  for r in virtualservice destinationrule gateway serviceentry authorizationpolicy peerauthentication; do
                    kubectl get "$r" -A -o yaml > "$BACKUP_DIR/$r.yaml"
                  done
                  echo "Backup complete: $BACKUP_DIR"
              volumeMounts:
                - name: backup-storage
                  mountPath: /backup
          restartPolicy: OnFailure
          volumes:
            - name: backup-storage
              persistentVolumeClaim:
                claimName: istio-backup-pvc
```

Create the required ServiceAccount and RBAC:

```yaml
apiVersion: v1
kind: ServiceAccount
metadata:
  name: istio-backup-sa
  namespace: istio-system
---
apiVersion: rbac.authorization.k8s.io/v1
kind: ClusterRole
metadata:
  name: istio-backup-reader
rules:
  - apiGroups: ["networking.istio.io", "security.istio.io", "telemetry.istio.io"]
    resources: ["*"]
    verbs: ["get", "list"]
  - apiGroups: [""]
    resources: ["secrets", "configmaps"]
    verbs: ["get", "list"]
---
apiVersion: rbac.authorization.k8s.io/v1
kind: ClusterRoleBinding
metadata:
  name: istio-backup-reader-binding
subjects:
  - kind: ServiceAccount
    name: istio-backup-sa
    namespace: istio-system
roleRef:
  kind: ClusterRole
  name: istio-backup-reader
  apiGroup: rbac.authorization.k8s.io
```

## Practice Recovery Scenarios

Document and practice these specific scenarios:

1. Single resource deletion recovery:

```bash
# Simulate accidental VirtualService deletion
kubectl delete virtualservice my-service -n production

# Restore from backup
kubectl apply -f istio-backup-latest/virtualservice.yaml -l app=my-service
```

2. Namespace-wide configuration loss:

```bash
# Restore all Istio resources for a namespace
for file in istio-backup-latest/*.yaml; do
  kubectl apply -f "$file" -n production
done
```

3. Complete mesh reconstruction:

```bash
# Reinstall Istio
istioctl install -f istio-backup-latest/istiooperator.yaml

# Restore certificates
kubectl apply -f istio-ca-backup.yaml

# Restore all configuration
for file in istio-backup-latest/*.yaml; do
  kubectl apply -f "$file"
done
```

## Validate Recovery Time

Time your recovery process. If it takes 2 hours to restore Istio configuration, that is your minimum downtime for a total loss scenario. Document this number and work to reduce it.

```bash
time (
  for file in istio-backup-latest/*.yaml; do
    kubectl apply -f "$file" 2>/dev/null
  done
)
```

For most environments, configuration restoration should take under 5 minutes. If it takes longer, you might have too many resources or your backup format needs optimization.

Backup and recovery is the kind of thing that feels like a waste of time until the day it saves you. Validate your backups regularly, test your recovery process at least quarterly, and keep your backup scripts in version control alongside your Istio configuration.
