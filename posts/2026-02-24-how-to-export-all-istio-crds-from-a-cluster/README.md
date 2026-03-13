# How to Export All Istio CRDs from a Cluster

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Istio, CRDs, Kubernetes, Migration, Backup

Description: Complete guide to exporting all Istio Custom Resource Definitions and their instances from a Kubernetes cluster for migration, backup, or audit purposes.

---

Exporting Istio CRDs and their instances is something you'll need to do when migrating between clusters, setting up disaster recovery, or just auditing what's configured in your mesh. It sounds simple, but there are some nuances that can trip you up if you just blindly dump everything with kubectl.

The main challenge is separating the CRD definitions (the schema) from the CRD instances (your actual configuration). You need both for a complete export, but they serve different purposes during restoration.

## Finding All Istio CRDs

First, let's identify every Istio-related CRD in the cluster:

```bash
kubectl get crd | grep istio.io
```

This gives you a list like:

```text
authorizationpolicies.security.istio.io
destinationrules.networking.istio.io
envoyfilters.networking.istio.io
gateways.networking.istio.io
istiooperators.install.istio.io
peerauthentications.security.istio.io
proxyconfigs.networking.istio.io
requestauthentications.security.istio.io
serviceentries.networking.istio.io
sidecars.networking.istio.io
telemetries.telemetry.istio.io
virtualservices.networking.istio.io
wasmplugins.extensions.istio.io
workloadentries.networking.istio.io
workloadgroups.networking.istio.io
```

## Exporting CRD Definitions

The CRD definitions tell Kubernetes about the Istio resource types. Export them:

```bash
mkdir -p istio-export/crds

kubectl get crd -o name | grep istio.io | while read crd; do
  name=$(echo "$crd" | sed 's|customresourcedefinition.apiextensions.k8s.io/||')
  echo "Exporting CRD definition: $name"
  kubectl get crd "$name" -o yaml > "istio-export/crds/$name.yaml"
done
```

## Exporting CRD Instances

The instances are your actual Istio configuration. This is the more important part:

```bash
mkdir -p istio-export/resources

# Get all Istio CRD names (short names for kubectl)
ISTIO_RESOURCES=$(kubectl api-resources --api-group=networking.istio.io -o name 2>/dev/null)
ISTIO_RESOURCES="$ISTIO_RESOURCES $(kubectl api-resources --api-group=security.istio.io -o name 2>/dev/null)"
ISTIO_RESOURCES="$ISTIO_RESOURCES $(kubectl api-resources --api-group=telemetry.istio.io -o name 2>/dev/null)"
ISTIO_RESOURCES="$ISTIO_RESOURCES $(kubectl api-resources --api-group=install.istio.io -o name 2>/dev/null)"
ISTIO_RESOURCES="$ISTIO_RESOURCES $(kubectl api-resources --api-group=extensions.istio.io -o name 2>/dev/null)"

for resource in $ISTIO_RESOURCES; do
  count=$(kubectl get "$resource" --all-namespaces --no-headers 2>/dev/null | wc -l)
  if [ "$count" -gt 0 ]; then
    echo "Exporting $resource ($count instances)..."
    kubectl get "$resource" --all-namespaces -o yaml > "istio-export/resources/$resource.yaml"
  fi
done
```

## A Complete Export Script

Here's a comprehensive script that handles everything:

```bash
#!/bin/bash
# export-istio-crds.sh

set -e

EXPORT_DIR="istio-export-$(date +%Y%m%d-%H%M%S)"
mkdir -p "$EXPORT_DIR/crds"
mkdir -p "$EXPORT_DIR/resources"
mkdir -p "$EXPORT_DIR/resources-individual"

echo "=== Exporting Istio CRD Definitions ==="
kubectl get crd -o name | grep istio.io | while read crd; do
  name=$(echo "$crd" | sed 's|customresourcedefinition.apiextensions.k8s.io/||')
  kubectl get crd "$name" -o yaml > "$EXPORT_DIR/crds/$name.yaml"
  echo "  Exported: $name"
done

echo ""
echo "=== Exporting Istio Resource Instances ==="

# Discover all Istio API groups
API_GROUPS="networking.istio.io security.istio.io telemetry.istio.io install.istio.io extensions.istio.io"

for group in $API_GROUPS; do
  resources=$(kubectl api-resources --api-group="$group" -o name 2>/dev/null || true)
  for resource in $resources; do
    # Get instances across all namespaces
    instances=$(kubectl get "$resource" --all-namespaces --no-headers 2>/dev/null || true)
    count=$(echo "$instances" | grep -c . 2>/dev/null || echo 0)

    if [ "$count" -gt 0 ]; then
      # Bulk export
      kubectl get "$resource" --all-namespaces -o yaml > "$EXPORT_DIR/resources/$resource.yaml"

      # Individual exports (useful for selective restoration)
      mkdir -p "$EXPORT_DIR/resources-individual/$resource"
      echo "$instances" | while read line; do
        ns=$(echo "$line" | awk '{print $1}')
        name=$(echo "$line" | awk '{print $2}')
        kubectl get "$resource" "$name" -n "$ns" -o yaml > \
          "$EXPORT_DIR/resources-individual/$resource/${ns}_${name}.yaml"
      done

      echo "  $resource: $count instances"
    fi
  done
done

echo ""
echo "=== Exporting Related Resources ==="

# Istio ConfigMaps
kubectl get configmap -n istio-system -o yaml > "$EXPORT_DIR/istio-configmaps.yaml"
echo "  ConfigMaps exported"

# Namespace labels (important for injection)
kubectl get namespaces -l istio-injection=enabled -o yaml > "$EXPORT_DIR/injected-namespaces.yaml" 2>/dev/null || true
kubectl get namespaces -l istio.io/rev -o yaml > "$EXPORT_DIR/revision-namespaces.yaml" 2>/dev/null || true
echo "  Namespace labels exported"

# Summary
echo ""
echo "=== Export Summary ==="
echo "Export directory: $EXPORT_DIR"
echo "CRD definitions: $(ls "$EXPORT_DIR/crds/" | wc -l)"
echo "Resource types with instances: $(ls "$EXPORT_DIR/resources/" | wc -l)"
total_resources=$(find "$EXPORT_DIR/resources-individual" -name "*.yaml" | wc -l)
echo "Total individual resources: $total_resources"

# Create archive
tar czf "$EXPORT_DIR.tar.gz" "$EXPORT_DIR"
echo "Archive: $EXPORT_DIR.tar.gz"
```

## Cleaning Exported Resources

The exported YAML files contain cluster-specific metadata that needs to be removed before importing to another cluster:

```bash
#!/bin/bash
# clean-export.sh

EXPORT_DIR=$1

if [ -z "$EXPORT_DIR" ]; then
  echo "Usage: $0 <export-directory>"
  exit 1
fi

find "$EXPORT_DIR/resources-individual" -name "*.yaml" | while read file; do
  python3 << PYEOF
import yaml

with open("$file", 'r') as f:
    doc = yaml.safe_load(f)

if doc and 'metadata' in doc:
    meta = doc['metadata']
    for field in ['resourceVersion', 'uid', 'creationTimestamp', 'generation', 'managedFields']:
        meta.pop(field, None)

    if 'annotations' in meta:
        meta['annotations'].pop('kubectl.kubernetes.io/last-applied-configuration', None)
        if not meta['annotations']:
            del meta['annotations']

    if 'status' in doc:
        del doc['status']

with open("$file", 'w') as f:
    yaml.dump(doc, f, default_flow_style=False)
PYEOF
done

echo "Cleaned all resources in $EXPORT_DIR"
```

## Exporting Specific Resource Types

Sometimes you only need certain types. Here are targeted exports:

```bash
# Just networking resources
kubectl get virtualservices,destinationrules,gateways,serviceentries \
  --all-namespaces -o yaml > istio-networking.yaml

# Just security resources
kubectl get peerauthentications,requestauthentications,authorizationpolicies \
  --all-namespaces -o yaml > istio-security.yaml

# Just resources in a specific namespace
kubectl get virtualservices,destinationrules,gateways -n my-namespace -o yaml > my-namespace-istio.yaml
```

## Exporting as JSON

JSON is sometimes easier to work with programmatically:

```bash
kubectl get virtualservices --all-namespaces -o json > virtualservices.json
```

With JSON, you can use jq to filter and transform:

```bash
# Extract just the spec of each VirtualService
kubectl get virtualservices --all-namespaces -o json | \
  jq '.items[] | {name: .metadata.name, namespace: .metadata.namespace, spec: .spec}'
```

## Generating a Manifest List

For documentation and auditing, generate a summary of everything that was exported:

```bash
#!/bin/bash
# generate-manifest.sh

echo "# Istio Configuration Manifest"
echo "# Generated: $(date)"
echo ""

API_GROUPS="networking.istio.io security.istio.io telemetry.istio.io"

for group in $API_GROUPS; do
  echo "## $group"
  resources=$(kubectl api-resources --api-group="$group" -o name 2>/dev/null || true)
  for resource in $resources; do
    kubectl get "$resource" --all-namespaces --no-headers 2>/dev/null | while read line; do
      ns=$(echo "$line" | awk '{print $1}')
      name=$(echo "$line" | awk '{print $2}')
      echo "- $resource/$name (namespace: $ns)"
    done
  done
  echo ""
done
```

## Verifying the Export

Always verify your export is complete:

```bash
# Compare counts between live cluster and export
echo "Live cluster resource counts:"
for resource in virtualservices destinationrules gateways serviceentries peerauthentications authorizationpolicies; do
  live_count=$(kubectl get "$resource" --all-namespaces --no-headers 2>/dev/null | wc -l)
  export_count=$(grep "^  name:" "istio-export/resources/$resource.yaml" 2>/dev/null | wc -l)
  echo "  $resource: live=$live_count export=$export_count"
done
```

Having a reliable export process is the foundation of any disaster recovery or migration plan. The key is automation so that you can run it regularly and trust that the export is complete. Don't wait until you actually need the export to find out it was missing something important.
