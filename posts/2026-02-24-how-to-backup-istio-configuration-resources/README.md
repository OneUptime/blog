# How to Backup Istio Configuration Resources

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Istio, Backups, Kubernetes, Disaster Recovery, Configuration

Description: A comprehensive guide to backing up all Istio configuration resources including VirtualServices, DestinationRules, Gateways, and other CRDs from your Kubernetes cluster.

---

Istio configuration is stored as Kubernetes custom resources, and losing those resources means losing your traffic routing rules, security policies, and mesh configuration. If someone accidentally deletes a VirtualService, or if you need to migrate to a new cluster, having good backups makes all the difference between a quick recovery and a long, painful reconstruction effort.

Here's how to set up reliable backups for your Istio configuration.

## What Needs to Be Backed Up

Istio uses quite a few custom resource types. Here are the main ones you need to capture:

**Networking:**
- VirtualService
- DestinationRule
- Gateway
- ServiceEntry
- Sidecar
- EnvoyFilter
- WorkloadEntry
- WorkloadGroup
- ProxyConfig

**Security:**
- PeerAuthentication
- RequestAuthentication
- AuthorizationPolicy

**Telemetry:**
- Telemetry

**Installation:**
- IstioOperator (if you used operator-based install)

## Manual Backup with kubectl

The simplest approach is using kubectl to export all Istio resources:

```bash
#!/bin/bash
# backup-istio.sh

BACKUP_DIR="istio-backup-$(date +%Y%m%d-%H%M%S)"
mkdir -p "$BACKUP_DIR"

# Networking resources
for resource in virtualservices destinationrules gateways serviceentries sidecars envoyfilters workloadentries workloadgroups proxyconfigs; do
  echo "Backing up $resource..."
  kubectl get "$resource" --all-namespaces -o yaml > "$BACKUP_DIR/$resource.yaml"
done

# Security resources
for resource in peerauthentications requestauthentications authorizationpolicies; do
  echo "Backing up $resource..."
  kubectl get "$resource" --all-namespaces -o yaml > "$BACKUP_DIR/$resource.yaml"
done

# Telemetry resources
kubectl get telemetry --all-namespaces -o yaml > "$BACKUP_DIR/telemetry.yaml"

# IstioOperator
kubectl get istiooperators --all-namespaces -o yaml > "$BACKUP_DIR/istiooperator.yaml"

# Istio ConfigMaps
kubectl get configmap -n istio-system -o yaml > "$BACKUP_DIR/configmaps.yaml"

# Istio Secrets (careful with these)
kubectl get secrets -n istio-system -o yaml > "$BACKUP_DIR/secrets.yaml"

echo "Backup saved to $BACKUP_DIR"
tar czf "$BACKUP_DIR.tar.gz" "$BACKUP_DIR"
```

Make it executable and run it:

```bash
chmod +x backup-istio.sh
./backup-istio.sh
```

## Cleaning Up the Exported YAML

The raw kubectl output includes metadata fields that will cause problems during restore. You need to strip out the managed fields, resource version, UID, and other cluster-specific data:

```bash
#!/bin/bash
# clean-backup.sh

for file in "$1"/*.yaml; do
  echo "Cleaning $file..."
  # Remove cluster-specific metadata
  python3 -c "
import yaml, sys

with open('$file', 'r') as f:
    docs = list(yaml.safe_load_all(f))

cleaned = []
for doc in docs:
    if doc is None:
        continue
    if 'items' in doc:
        for item in doc['items']:
            meta = item.get('metadata', {})
            meta.pop('resourceVersion', None)
            meta.pop('uid', None)
            meta.pop('creationTimestamp', None)
            meta.pop('generation', None)
            meta.pop('managedFields', None)
            if 'annotations' in meta:
                meta['annotations'].pop('kubectl.kubernetes.io/last-applied-configuration', None)
            cleaned.append(item)

with open('$file', 'w') as f:
    yaml.dump_all(cleaned, f, default_flow_style=False)
"
done
```

## Automated Backups with CronJob

For production environments, you want automated backups. Here's a CronJob that backs up Istio resources daily:

```yaml
apiVersion: batch/v1
kind: CronJob
metadata:
  name: istio-backup
  namespace: istio-system
spec:
  schedule: "0 2 * * *"
  jobTemplate:
    spec:
      template:
        spec:
          serviceAccountName: istio-backup
          containers:
            - name: backup
              image: bitnami/kubectl:latest
              command:
                - /bin/bash
                - -c
                - |
                  BACKUP_DIR="/backup/istio-$(date +%Y%m%d-%H%M%S)"
                  mkdir -p "$BACKUP_DIR"

                  RESOURCES="virtualservices destinationrules gateways serviceentries sidecars envoyfilters peerauthentications requestauthentications authorizationpolicies telemetry"

                  for resource in $RESOURCES; do
                    kubectl get "$resource" --all-namespaces -o yaml > "$BACKUP_DIR/$resource.yaml" 2>/dev/null
                  done

                  kubectl get istiooperators --all-namespaces -o yaml > "$BACKUP_DIR/istiooperator.yaml" 2>/dev/null

                  # Upload to S3 (or your preferred storage)
                  # aws s3 cp "$BACKUP_DIR" "s3://my-backups/istio/$BACKUP_DIR" --recursive

                  echo "Backup completed: $BACKUP_DIR"
              volumeMounts:
                - name: backup-volume
                  mountPath: /backup
          restartPolicy: OnFailure
          volumes:
            - name: backup-volume
              persistentVolumeClaim:
                claimName: istio-backup-pvc
```

Create the required RBAC:

```yaml
apiVersion: v1
kind: ServiceAccount
metadata:
  name: istio-backup
  namespace: istio-system
---
apiVersion: rbac.authorization.k8s.io/v1
kind: ClusterRole
metadata:
  name: istio-backup
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
  - apiGroups: [""]
    resources: ["configmaps", "secrets"]
    verbs: ["get", "list"]
---
apiVersion: rbac.authorization.k8s.io/v1
kind: ClusterRoleBinding
metadata:
  name: istio-backup
roleRef:
  apiGroup: rbac.authorization.k8s.io
  kind: ClusterRole
  name: istio-backup
subjects:
  - kind: ServiceAccount
    name: istio-backup
    namespace: istio-system
```

## Using Velero for Istio Backups

Velero is a popular Kubernetes backup tool that works well for Istio resources. You can configure it to specifically back up Istio CRDs:

```bash
# Install Velero (assuming AWS backend)
velero install \
  --provider aws \
  --bucket my-backup-bucket \
  --secret-file ./credentials-velero

# Create a backup of all Istio resources
velero backup create istio-backup \
  --include-resources virtualservices,destinationrules,gateways,serviceentries,sidecars,envoyfilters,peerauthentications,requestauthentications,authorizationpolicies,telemetry \
  --include-namespaces "*"

# Create a scheduled backup
velero schedule create istio-daily \
  --schedule="0 2 * * *" \
  --include-resources virtualservices,destinationrules,gateways,serviceentries,sidecars,envoyfilters,peerauthentications,requestauthentications,authorizationpolicies,telemetry \
  --include-namespaces "*" \
  --ttl 720h
```

## Backing Up to Git

Storing Istio configuration in Git gives you version history and audit trails. Here's a simple approach:

```bash
#!/bin/bash
# git-backup-istio.sh

cd /path/to/istio-config-repo

RESOURCES="virtualservices destinationrules gateways serviceentries sidecars envoyfilters peerauthentications requestauthentications authorizationpolicies telemetry"

for resource in $RESOURCES; do
  mkdir -p "$resource"

  # Get list of all resources with their namespaces
  kubectl get "$resource" --all-namespaces -o custom-columns=NAMESPACE:.metadata.namespace,NAME:.metadata.name --no-headers 2>/dev/null | while read ns name; do
    kubectl get "$resource" "$name" -n "$ns" -o yaml > "$resource/${ns}_${name}.yaml"
  done
done

git add -A
git commit -m "Istio config backup $(date +%Y-%m-%d_%H:%M:%S)"
git push
```

## Verifying Backups

Backups are useless if they can't be restored. Periodically verify your backups:

```bash
# Count resources in backup vs. live cluster
echo "Live cluster:"
for resource in virtualservices destinationrules gateways serviceentries; do
  count=$(kubectl get "$resource" --all-namespaces --no-headers 2>/dev/null | wc -l)
  echo "  $resource: $count"
done

echo "Backup:"
for resource in virtualservices destinationrules gateways serviceentries; do
  if [ -f "backup/$resource.yaml" ]; then
    count=$(grep "^  name:" "backup/$resource.yaml" | wc -l)
    echo "  $resource: $count"
  fi
done
```

## What Not to Forget

A few things that people commonly miss when backing up Istio config:

1. **EnvoyFilters** - These are often created manually and forgotten about, but they can be critical for custom proxy configurations
2. **Namespace labels** - The `istio-injection=enabled` label on namespaces controls sidecar injection. Back up your namespace configurations too
3. **IstioOperator resource** - This defines your entire Istio installation. Without it, you can't recreate the mesh
4. **Custom certificates** - If you're using custom CA certificates, those secrets are essential

```bash
# Backup namespace labels
kubectl get namespaces -o yaml > "$BACKUP_DIR/namespaces.yaml"
```

A consistent backup strategy for Istio configuration protects you from accidental deletions, helps with disaster recovery, and makes cluster migrations much smoother. Automate it, verify it, and you'll thank yourself later.
