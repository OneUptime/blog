# How to Back Up and Restore Istio CRDs

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Istio, Backup, Disaster Recovery, Kubernetes, CRDs

Description: Step-by-step methods for backing up and restoring Istio Custom Resource Definitions and their instances for disaster recovery scenarios.

---

Losing your Istio configuration in a cluster failure or a bad upgrade can mean hours of manual reconstruction. Your VirtualServices, DestinationRules, AuthorizationPolicies, and other Istio resources represent significant effort to get right. Having a reliable backup and restore process for these resources is essential for any production mesh.

## What Needs to Be Backed Up

There are two distinct things to back up:

1. **CRD definitions**: The Custom Resource Definition objects themselves that define the schema for Istio resources. These are usually reinstalled with Istio, but having a backup avoids version mismatches.

2. **CRD instances**: The actual VirtualService, DestinationRule, Gateway, and other resources that contain your configuration.

## Backing Up CRD Definitions

Export all Istio CRD definitions:

```bash
kubectl get crds -o yaml | grep -A1000 "istio.io" > istio-crds-definitions.yaml
```

A cleaner approach is to export each CRD individually:

```bash
mkdir -p istio-backup/crds

for crd in $(kubectl get crds -o name | grep istio); do
  name=$(echo $crd | sed 's|customresourcedefinition.apiextensions.k8s.io/||')
  kubectl get crd $name -o yaml > istio-backup/crds/$name.yaml
done
```

## Backing Up CRD Instances

Create a comprehensive backup of all Istio resource instances:

```bash
mkdir -p istio-backup/resources

# Networking resources
for resource in virtualservices destinationrules gateways serviceentries sidecars envoyfilters workloadentries workloadgroups; do
  echo "Backing up $resource..."
  kubectl get $resource -A -o yaml > istio-backup/resources/$resource.yaml 2>/dev/null
done

# Security resources
for resource in peerauthentications authorizationpolicies requestauthentications; do
  echo "Backing up $resource..."
  kubectl get $resource -A -o yaml > istio-backup/resources/$resource.yaml 2>/dev/null
done

# Telemetry resources
for resource in telemetries; do
  echo "Backing up $resource..."
  kubectl get $resource -A -o yaml > istio-backup/resources/$resource.yaml 2>/dev/null
done

# Extensions
for resource in wasmplugins; do
  echo "Backing up $resource..."
  kubectl get $resource -A -o yaml > istio-backup/resources/$resource.yaml 2>/dev/null
done
```

## Creating a Complete Backup Script

Here's a script that creates a timestamped backup of everything:

```bash
#!/bin/bash
TIMESTAMP=$(date +%Y%m%d-%H%M%S)
BACKUP_DIR="istio-backup-$TIMESTAMP"
mkdir -p $BACKUP_DIR/crds $BACKUP_DIR/resources $BACKUP_DIR/configmaps $BACKUP_DIR/secrets

echo "Backing up Istio CRD definitions..."
for crd in $(kubectl get crds -o name | grep istio); do
  name=$(echo $crd | sed 's|customresourcedefinition.apiextensions.k8s.io/||')
  kubectl get crd $name -o yaml > $BACKUP_DIR/crds/$name.yaml
done

echo "Backing up Istio resource instances..."
RESOURCES="virtualservices destinationrules gateways serviceentries sidecars envoyfilters workloadentries workloadgroups peerauthentications authorizationpolicies requestauthentications telemetries wasmplugins"

for resource in $RESOURCES; do
  count=$(kubectl get $resource -A --no-headers 2>/dev/null | wc -l)
  if [ "$count" -gt 0 ]; then
    kubectl get $resource -A -o yaml > $BACKUP_DIR/resources/$resource.yaml
    echo "  $resource: $count instances"
  fi
done

echo "Backing up Istio ConfigMaps..."
kubectl get configmaps -n istio-system -o yaml > $BACKUP_DIR/configmaps/istio-system-configmaps.yaml

echo "Backing up Istio secrets (non-sensitive metadata only)..."
kubectl get secrets -n istio-system -o yaml > $BACKUP_DIR/secrets/istio-system-secrets.yaml

echo "Backup complete: $BACKUP_DIR"
ls -la $BACKUP_DIR/
```

Save this as `backup-istio.sh` and run it regularly.

## Cleaning Up Backup Files for Restore

Before restoring, you need to remove cluster-specific metadata from the backup files. Fields like `resourceVersion`, `uid`, and `creationTimestamp` will cause conflicts if you try to apply them to a different cluster.

```bash
#!/bin/bash
# clean-backup.sh - Remove cluster-specific fields from backup files

for file in $(find $1 -name "*.yaml"); do
  # Remove resourceVersion, uid, creationTimestamp, and managedFields
  # Using a temporary file for portability
  python3 << 'PYEOF' "$file"
import yaml, sys

filepath = sys.argv[1]
with open(filepath) as f:
    docs = list(yaml.safe_load_all(f))

REMOVE_KEYS = ['resourceVersion', 'uid', 'creationTimestamp', 'generation', 'managedFields', 'selfLink']

def clean_metadata(obj):
    if isinstance(obj, dict):
        meta = obj.get('metadata', {})
        for key in REMOVE_KEYS:
            meta.pop(key, None)
        if 'annotations' in meta:
            meta['annotations'].pop('kubectl.kubernetes.io/last-applied-configuration', None)
        if 'items' in obj:
            for item in obj['items']:
                clean_metadata(item)

for doc in docs:
    if doc:
        clean_metadata(doc)

with open(filepath, 'w') as f:
    yaml.dump_all(docs, f, default_flow_style=False)
PYEOF
done
```

## Restoring Istio CRDs

To restore in a new or recovered cluster, follow this order:

### Step 1: Install Istio (which installs CRDs)

```bash
istioctl install --set profile=default
```

Or if you need to restore the exact CRD versions from backup:

```bash
kubectl apply -f istio-backup/crds/
```

### Step 2: Restore Resource Instances

Apply the backed-up resources:

```bash
# Clean the files first
./clean-backup.sh istio-backup/resources/

# Apply in order - some resources depend on others
kubectl apply -f istio-backup/resources/gateways.yaml
kubectl apply -f istio-backup/resources/serviceentries.yaml
kubectl apply -f istio-backup/resources/destinationrules.yaml
kubectl apply -f istio-backup/resources/virtualservices.yaml
kubectl apply -f istio-backup/resources/sidecars.yaml
kubectl apply -f istio-backup/resources/peerauthentications.yaml
kubectl apply -f istio-backup/resources/authorizationpolicies.yaml
kubectl apply -f istio-backup/resources/requestauthentications.yaml
kubectl apply -f istio-backup/resources/telemetries.yaml
kubectl apply -f istio-backup/resources/envoyfilters.yaml
```

### Step 3: Verify

```bash
istioctl analyze -A
```

Check that all resources are present:

```bash
for resource in vs dr gw se sc pa ap ra telemetry ef; do
  echo "$resource:"
  kubectl get $resource -A --no-headers 2>/dev/null | wc -l
done
```

## Using Velero for Automated Backups

Velero is a popular Kubernetes backup tool that can handle Istio resources along with everything else in your cluster:

```bash
# Install Velero
velero install --provider aws --bucket my-backup-bucket --secret-file ./credentials

# Create a backup schedule for Istio resources
velero schedule create istio-daily \
  --schedule="0 2 * * *" \
  --include-resources="virtualservices,destinationrules,gateways,serviceentries,sidecars,envoyfilters,peerauthentications,authorizationpolicies,requestauthentications,telemetries,wasmplugins" \
  --include-namespaces="*"
```

Restore from a Velero backup:

```bash
velero restore create --from-backup istio-daily-20240115020000 \
  --include-resources="virtualservices,destinationrules,gateways,serviceentries,sidecars,envoyfilters,peerauthentications,authorizationpolicies,requestauthentications,telemetries,wasmplugins"
```

## GitOps as a Backup Strategy

If you manage Istio configurations through GitOps (ArgoCD, Flux, etc.), your Git repository IS your backup. Every Istio resource is defined in YAML files in your repo, and the GitOps tool reconciles the cluster state with what's in Git.

This is arguably the best backup strategy because:
- Every change is tracked with commit history
- Restore is just resyncing from Git
- You get review processes and audit trails for free

Example ArgoCD Application for Istio configs:

```yaml
apiVersion: argoproj.io/v1alpha1
kind: Application
metadata:
  name: istio-config
  namespace: argocd
spec:
  project: default
  source:
    repoURL: https://github.com/myorg/istio-configs.git
    targetRevision: main
    path: manifests/
  destination:
    server: https://kubernetes.default.svc
  syncPolicy:
    automated:
      prune: true
      selfHeal: true
```

## Testing Your Backups

A backup that has never been tested is just a guess. Periodically restore your Istio configuration to a staging or test cluster:

```bash
# In a test cluster
./clean-backup.sh latest-backup/resources/
kubectl apply -f latest-backup/resources/

# Verify
istioctl analyze -A
kubectl get vs,dr,gw,se -A
```

Compare the resource counts between production and the test restore to make sure nothing was missed.

Having a reliable Istio backup process means you can recover from disasters, migrations, and bad upgrades with confidence. Whether you use scripts, Velero, or GitOps, the important thing is that your Istio configuration is stored somewhere outside the cluster and can be restored quickly.
