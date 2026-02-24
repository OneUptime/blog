# How to Set Up Backup and Recovery for Istio Configuration

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Istio, Backup, Disaster Recovery, Configuration Management, Kubernetes

Description: A practical guide to backing up and restoring Istio configuration including VirtualServices, DestinationRules, Gateways, and other mesh resources.

---

Losing your Istio configuration is one of those things that sounds unlikely until it happens. Maybe someone accidentally runs `kubectl delete` on the wrong namespace. Maybe a failed upgrade wipes out custom resources. Whatever the cause, if you do not have backups of your Istio configuration, rebuilding everything from memory is going to be painful.

This guide walks through how to set up reliable backups for your Istio configuration and, more importantly, how to restore them when things go sideways.

## What Needs to Be Backed Up

Istio stores its configuration as Kubernetes custom resources. The key resource types you need to back up include:

- VirtualServices
- DestinationRules
- Gateways
- ServiceEntries
- Sidecars
- AuthorizationPolicies
- PeerAuthentications
- RequestAuthentications
- EnvoyFilters
- WorkloadEntries
- WorkloadGroups
- Telemetry resources

On top of those, you should also back up the IstioOperator resource if you used the operator for installation, and any ConfigMaps related to Istio (like `istio` and `istio-sidecar-injector` in the `istio-system` namespace).

## Manual Backup with kubectl

The simplest backup approach is exporting resources with kubectl:

```bash
#!/bin/bash

BACKUP_DIR="istio-backup-$(date +%Y%m%d-%H%M%S)"
mkdir -p "$BACKUP_DIR"

# List of Istio CRD types
ISTIO_RESOURCES=(
  "virtualservices"
  "destinationrules"
  "gateways"
  "serviceentries"
  "sidecars"
  "authorizationpolicies"
  "peerauthentications"
  "requestauthentications"
  "envoyfilters"
  "workloadentries"
  "workloadgroups"
  "telemetries"
)

for resource in "${ISTIO_RESOURCES[@]}"; do
  echo "Backing up $resource..."
  kubectl get "$resource" --all-namespaces -o yaml > "$BACKUP_DIR/$resource.yaml"
done

# Back up IstioOperator resource
kubectl get istiooperator --all-namespaces -o yaml > "$BACKUP_DIR/istiooperator.yaml"

# Back up Istio ConfigMaps
kubectl get configmap istio -n istio-system -o yaml > "$BACKUP_DIR/configmap-istio.yaml"
kubectl get configmap istio-sidecar-injector -n istio-system -o yaml > "$BACKUP_DIR/configmap-injector.yaml"

echo "Backup completed in $BACKUP_DIR"
```

This gives you a snapshot of everything Istio-related in your cluster.

## Cleaning Up Exported Resources for Restore

Raw kubectl exports contain metadata that will cause problems during restore. Fields like `resourceVersion`, `uid`, `creationTimestamp`, and `managedFields` need to be stripped out. Here is a script that cleans up the exports:

```bash
#!/bin/bash

# Clean up Kubernetes metadata that prevents clean restore
cleanup_yaml() {
  local file=$1
  # Use yq to remove cluster-specific metadata
  yq eval 'del(.items[].metadata.resourceVersion,
    .items[].metadata.uid,
    .items[].metadata.creationTimestamp,
    .items[].metadata.generation,
    .items[].metadata.managedFields,
    .metadata.resourceVersion)' "$file" > "${file%.yaml}-clean.yaml"
}

for f in istio-backup-*/*.yaml; do
  echo "Cleaning $f"
  cleanup_yaml "$f"
done
```

You will need `yq` installed for this. Install it with:

```bash
# macOS
brew install yq

# Linux
wget https://github.com/mikefarah/yq/releases/latest/download/yq_linux_amd64 -O /usr/local/bin/yq
chmod +x /usr/local/bin/yq
```

## Automated Backups with CronJobs

Running manual backups is fine for one-off situations, but you want this automated. Here is a Kubernetes CronJob that backs up Istio config to a PersistentVolume:

```yaml
apiVersion: batch/v1
kind: CronJob
metadata:
  name: istio-config-backup
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
                  BACKUP_DIR="/backups/$(date +%Y%m%d-%H%M%S)"
                  mkdir -p "$BACKUP_DIR"
                  for r in virtualservices destinationrules gateways serviceentries sidecars authorizationpolicies peerauthentications requestauthentications envoyfilters; do
                    kubectl get "$r" --all-namespaces -o yaml > "$BACKUP_DIR/$r.yaml" 2>/dev/null || true
                  done
                  # Keep only last 30 days of backups
                  find /backups -maxdepth 1 -type d -mtime +30 -exec rm -rf {} \;
              volumeMounts:
                - name: backup-storage
                  mountPath: /backups
          restartPolicy: OnFailure
          volumes:
            - name: backup-storage
              persistentVolumeClaim:
                claimName: istio-backup-pvc
```

Create the ServiceAccount with proper RBAC:

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
  name: istio-backup-role
rules:
  - apiGroups: ["networking.istio.io"]
    resources: ["*"]
    verbs: ["get", "list"]
  - apiGroups: ["security.istio.io"]
    resources: ["*"]
    verbs: ["get", "list"]
  - apiGroups: ["telemetry.istio.io"]
    resources: ["*"]
    verbs: ["get", "list"]
  - apiGroups: ["install.istio.io"]
    resources: ["*"]
    verbs: ["get", "list"]
---
apiVersion: rbac.authorization.k8s.io/v1
kind: ClusterRoleBinding
metadata:
  name: istio-backup-binding
subjects:
  - kind: ServiceAccount
    name: istio-backup-sa
    namespace: istio-system
roleRef:
  kind: ClusterRole
  name: istio-backup-role
  apiGroup: rbac.authorization.k8s.io
```

## Backing Up to Object Storage

For production environments, you probably want backups stored outside the cluster. Here is an approach using AWS S3:

```bash
#!/bin/bash

BACKUP_DIR="/tmp/istio-backup-$(date +%Y%m%d-%H%M%S)"
S3_BUCKET="s3://my-istio-backups"
CLUSTER_NAME="production-cluster"

mkdir -p "$BACKUP_DIR"

# Export all Istio resources
for r in virtualservices destinationrules gateways serviceentries sidecars authorizationpolicies peerauthentications requestauthentications envoyfilters; do
  kubectl get "$r" --all-namespaces -o yaml > "$BACKUP_DIR/$r.yaml" 2>/dev/null || true
done

# Compress and upload
tar czf "$BACKUP_DIR.tar.gz" -C /tmp "$(basename $BACKUP_DIR)"
aws s3 cp "$BACKUP_DIR.tar.gz" "$S3_BUCKET/$CLUSTER_NAME/"

# Clean up local files
rm -rf "$BACKUP_DIR" "$BACKUP_DIR.tar.gz"

echo "Backup uploaded to $S3_BUCKET/$CLUSTER_NAME/"
```

## Restoring Istio Configuration

When it is time to restore, the process depends on the scope of what went wrong.

For restoring individual resources:

```bash
# Restore a specific VirtualService
kubectl apply -f backup/virtualservices-clean.yaml -l metadata.name=my-service

# Restore all DestinationRules
kubectl apply -f backup/destinationrules-clean.yaml
```

For a full restore after a disaster:

```bash
#!/bin/bash

BACKUP_DIR=$1

if [ -z "$BACKUP_DIR" ]; then
  echo "Usage: restore.sh <backup-directory>"
  exit 1
fi

# Restore in dependency order
# First: ServiceEntries (external services)
echo "Restoring ServiceEntries..."
kubectl apply -f "$BACKUP_DIR/serviceentries-clean.yaml" 2>/dev/null || true

# Second: DestinationRules (traffic policies)
echo "Restoring DestinationRules..."
kubectl apply -f "$BACKUP_DIR/destinationrules-clean.yaml" 2>/dev/null || true

# Third: VirtualServices (routing rules)
echo "Restoring VirtualServices..."
kubectl apply -f "$BACKUP_DIR/virtualservices-clean.yaml" 2>/dev/null || true

# Fourth: Gateways
echo "Restoring Gateways..."
kubectl apply -f "$BACKUP_DIR/gateways-clean.yaml" 2>/dev/null || true

# Fifth: Security policies
echo "Restoring security policies..."
kubectl apply -f "$BACKUP_DIR/authorizationpolicies-clean.yaml" 2>/dev/null || true
kubectl apply -f "$BACKUP_DIR/peerauthentications-clean.yaml" 2>/dev/null || true
kubectl apply -f "$BACKUP_DIR/requestauthentications-clean.yaml" 2>/dev/null || true

# Validate the restored configuration
echo "Validating restored configuration..."
istioctl analyze --all-namespaces
```

## Using GitOps as Your Backup Strategy

The most reliable backup strategy is storing all your Istio configuration in Git. If every change goes through a Git repository and gets applied via a GitOps tool like Argo CD or Flux, your Git repo is effectively your backup. Restoring is just re-syncing from Git.

```bash
# If using Argo CD, force a sync to restore from Git
argocd app sync istio-config --force

# If using Flux, reconcile the source
flux reconcile source git istio-config
flux reconcile kustomization istio-config
```

This approach has the added benefit of giving you an audit trail of every change.

## Testing Your Backups

Backups are worthless if you never test them. Set up a regular process to restore backups into a test cluster:

```bash
# Create a test namespace
kubectl create namespace backup-test

# Restore configs into the test namespace
for f in backup/*-clean.yaml; do
  # Modify namespace to backup-test for testing
  yq eval '.items[].metadata.namespace = "backup-test"' "$f" | kubectl apply -f -
done

# Validate
istioctl analyze -n backup-test

# Clean up
kubectl delete namespace backup-test
```

Run this monthly at minimum. Quarterly is better than never, but monthly gives you real confidence that your recovery process actually works when you need it.

## Wrapping Up

Backing up Istio configuration is not complicated, but it does require deliberate effort. Whether you go with automated CronJobs, object storage uploads, or a GitOps-first approach, the important thing is that you have a tested recovery process. The worst time to figure out how to restore your mesh configuration is during an actual outage.
