# How to Export Istio Configuration to YAML

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Istio, YAML, Kubernetes, Configuration Management, Backup

Description: How to export Istio configuration resources to clean YAML files for backup, migration, version control, and documentation purposes.

---

Exporting your Istio configuration to YAML files is something you'll need for backups, migrating between clusters, storing in version control, or just documenting what's currently running. The raw `kubectl get -o yaml` output includes a lot of cluster-specific metadata that makes the files noisy and non-portable. This post covers how to get clean, reusable YAML exports.

## Basic Export with kubectl

The simplest export is:

```bash
kubectl get virtualservice my-route -n default -o yaml
```

This gives you the full resource including metadata you probably don't want:

```yaml
apiVersion: networking.istio.io/v1
kind: VirtualService
metadata:
  annotations:
    kubectl.kubernetes.io/last-applied-configuration: |
      {"apiVersion":"networking.istio.io/v1","kind":"VirtualService"...}
  creationTimestamp: "2024-01-15T10:30:00Z"
  generation: 3
  managedFields:
  - apiVersion: networking.istio.io/v1
    fieldsType: FieldsV1
    fieldsV1: ...
    manager: kubectl-client-side-apply
    operation: Update
    time: "2024-01-15T10:30:00Z"
  name: my-route
  namespace: default
  resourceVersion: "123456"
  uid: abc-def-123
spec:
  hosts:
  - my-service
  http:
  - route:
    - destination:
        host: my-service
```

The `creationTimestamp`, `generation`, `managedFields`, `resourceVersion`, `uid`, and the `last-applied-configuration` annotation are all cluster-specific and should be stripped for a clean export.

## Exporting All Resources of a Type

Export all VirtualServices across namespaces:

```bash
kubectl get vs -A -o yaml > virtualservices-all.yaml
```

This produces a List document containing all resources. For individual files per resource:

```bash
mkdir -p exports/virtualservices

for line in $(kubectl get vs -A -o jsonpath='{range .items[*]}{.metadata.namespace}/{.metadata.name}{"\n"}{end}'); do
  ns=$(echo $line | cut -d/ -f1)
  name=$(echo $line | cut -d/ -f2)
  kubectl get vs $name -n $ns -o yaml > exports/virtualservices/${ns}_${name}.yaml
done
```

## Cleaning Exported YAML

To strip the cluster-specific fields, you can use `yq` (the YAML processor):

```bash
# Using yq v4
kubectl get vs my-route -n default -o yaml | yq eval '
  del(.metadata.resourceVersion) |
  del(.metadata.uid) |
  del(.metadata.creationTimestamp) |
  del(.metadata.generation) |
  del(.metadata.managedFields) |
  del(.metadata.annotations["kubectl.kubernetes.io/last-applied-configuration"]) |
  del(.status)
' -
```

For a batch cleanup of all exported files:

```bash
for file in exports/**/*.yaml; do
  yq eval '
    del(.metadata.resourceVersion) |
    del(.metadata.uid) |
    del(.metadata.creationTimestamp) |
    del(.metadata.generation) |
    del(.metadata.managedFields) |
    del(.metadata.annotations["kubectl.kubernetes.io/last-applied-configuration"]) |
    del(.status)
  ' -i "$file"
done
```

If you don't have `yq`, you can use Python:

```bash
kubectl get vs my-route -n default -o yaml | python3 -c "
import yaml, sys

doc = yaml.safe_load(sys.stdin)
meta = doc.get('metadata', {})

# Remove cluster-specific fields
for key in ['resourceVersion', 'uid', 'creationTimestamp', 'generation', 'managedFields', 'selfLink']:
    meta.pop(key, None)

# Clean annotations
annotations = meta.get('annotations', {})
annotations.pop('kubectl.kubernetes.io/last-applied-configuration', None)
if not annotations:
    meta.pop('annotations', None)

# Remove status
doc.pop('status', None)

print(yaml.dump(doc, default_flow_style=False))
"
```

## Complete Export Script

Here's a comprehensive script that exports all Istio resources to clean YAML files organized by type and namespace:

```bash
#!/bin/bash
EXPORT_DIR="${1:-istio-export-$(date +%Y%m%d)}"
mkdir -p $EXPORT_DIR

RESOURCE_TYPES="virtualservices destinationrules gateways serviceentries sidecars envoyfilters workloadentries workloadgroups peerauthentications authorizationpolicies requestauthentications telemetries wasmplugins"

for rtype in $RESOURCE_TYPES; do
  items=$(kubectl get $rtype -A --no-headers 2>/dev/null)
  if [ -z "$items" ]; then
    continue
  fi

  mkdir -p $EXPORT_DIR/$rtype

  echo "$items" | while read ns name rest; do
    kubectl get $rtype $name -n $ns -o yaml | python3 -c "
import yaml, sys
doc = yaml.safe_load(sys.stdin)
meta = doc.get('metadata', {})
for key in ['resourceVersion', 'uid', 'creationTimestamp', 'generation', 'managedFields', 'selfLink']:
    meta.pop(key, None)
annot = meta.get('annotations', {})
annot.pop('kubectl.kubernetes.io/last-applied-configuration', None)
if not annot:
    meta.pop('annotations', None)
doc.pop('status', None)
print(yaml.dump(doc, default_flow_style=False))
" > $EXPORT_DIR/$rtype/${ns}_${name}.yaml

    echo "  Exported $rtype/$ns/$name"
  done
done

echo "Export complete: $EXPORT_DIR"
find $EXPORT_DIR -name "*.yaml" | wc -l
echo "files exported"
```

## Exporting Envoy Configuration

Beyond Istio CRDs, you might want to export the actual Envoy proxy configuration for a specific pod:

```bash
# Full config dump
istioctl proxy-config all <pod-name> -o yaml > envoy-config-full.yaml

# Just listeners
istioctl proxy-config listener <pod-name> -o yaml > envoy-listeners.yaml

# Just clusters
istioctl proxy-config cluster <pod-name> -o yaml > envoy-clusters.yaml

# Just routes
istioctl proxy-config route <pod-name> -o yaml > envoy-routes.yaml

# Bootstrap configuration
istioctl proxy-config bootstrap <pod-name> -o yaml > envoy-bootstrap.yaml
```

These exports are useful for comparing configurations between pods or debugging why one pod behaves differently from another.

## Exporting with istioctl bug-report

The `istioctl bug-report` command creates a comprehensive export of the entire Istio installation state:

```bash
istioctl bug-report --full-secrets
```

This generates a tar.gz file containing:
- All Istio CRD instances
- Control plane logs
- Proxy configurations
- Cluster state information
- Istio installation parameters

It's primarily meant for bug reports to the Istio team, but it also serves as a thorough backup of the mesh state.

## Exporting to a Git Repository

For ongoing configuration management, export to a Git repository:

```bash
#!/bin/bash
REPO_DIR="/path/to/istio-config-repo"

cd $REPO_DIR

# Export all resources
RESOURCE_TYPES="virtualservices destinationrules gateways serviceentries sidecars peerauthentications authorizationpolicies requestauthentications telemetries"

for rtype in $RESOURCE_TYPES; do
  mkdir -p $rtype
  kubectl get $rtype -A -o yaml | yq eval '
    del(.items[].metadata.resourceVersion) |
    del(.items[].metadata.uid) |
    del(.items[].metadata.creationTimestamp) |
    del(.items[].metadata.generation) |
    del(.items[].metadata.managedFields) |
    del(.items[].metadata.annotations["kubectl.kubernetes.io/last-applied-configuration"]) |
    del(.items[].status) |
    del(.metadata)
  ' - > $rtype/all.yaml 2>/dev/null
done

# Commit changes
git add .
git diff --cached --quiet || git commit -m "Istio config export $(date +%Y-%m-%d)"
```

Run this on a schedule (cron job or Kubernetes CronJob) to maintain a history of configuration changes.

## Comparing Exports

Once you have exports, you can diff them to see what changed:

```bash
diff -r istio-export-20240115/ istio-export-20240116/
```

Or for a specific resource:

```bash
diff istio-export-20240115/virtualservices/default_my-route.yaml \
     istio-export-20240116/virtualservices/default_my-route.yaml
```

If you're storing exports in Git, `git diff` and `git log` give you a full history of changes.

## Format Considerations

When exporting for re-import, keep the YAML clean and minimal. Remove everything that Kubernetes will auto-generate (uid, timestamps, resource versions). Keep namespace information if you need to restore to the same namespace structure. Remove it if you're migrating to a different namespace layout.

For documentation purposes, you might want to add comments to the exported YAML explaining what each resource does. YAML supports comments with `#`, though `kubectl apply` ignores them.

Clean YAML exports are the foundation of good Istio configuration management. Whether you use them for backups, migrations, or version control, taking the time to strip out the noise makes your exported files reusable and readable.
