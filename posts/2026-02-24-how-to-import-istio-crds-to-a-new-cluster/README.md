# How to Import Istio CRDs to a New Cluster

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Istio, CRD, Kubernetes, Migration, Cluster Setup

Description: Step-by-step guide to importing Istio Custom Resource Definitions and configuration resources into a new Kubernetes cluster during migration or disaster recovery.

---

Importing Istio CRDs into a new cluster is something you'll face during cluster migrations, blue-green cluster upgrades, or disaster recovery scenarios. The process has a specific order of operations that matters, and getting it wrong can leave you with broken configurations or rejected resources.

This guide walks through the entire import process, from preparing the target cluster to verifying that everything works.

## Prerequisites

Before importing, you need:

1. A target Kubernetes cluster with kubectl access
2. Exported Istio CRD definitions and resource instances (see the export guide)
3. The exported files cleaned of cluster-specific metadata (resourceVersion, uid, etc.)

Check your target cluster:

```bash
kubectl cluster-info
kubectl get nodes
```

## Step 1: Install Istio CRD Definitions

The CRD definitions need to be installed first. Without them, Kubernetes won't recognize the Istio resource types.

If you're installing Istio fresh on the target cluster, the CRDs come with the installation:

```bash
# Using istioctl
istioctl install --set profile=default

# Or using Helm (CRDs are in the base chart)
helm install istio-base istio/base -n istio-system --create-namespace
```

If you only need the CRDs without a full Istio installation (for example, you're pre-staging resources before the actual migration):

```bash
# Apply CRD definitions from your export
for crd_file in istio-export/crds/*.yaml; do
  echo "Applying CRD: $(basename $crd_file)"
  kubectl apply -f "$crd_file"
done
```

Verify the CRDs are installed:

```bash
kubectl get crd | grep istio.io | wc -l
```

## Step 2: Install Istiod (If Not Already Running)

For the imported resources to actually work, you need Istiod running. Apply your IstioOperator configuration:

```bash
# If you exported the IstioOperator resource
istioctl install -f istio-export/istiooperator.yaml

# Or use the same Helm values
helm install istiod istio/istiod -n istio-system --values helm-values.yaml
```

Wait for it to be ready:

```bash
kubectl wait --for=condition=ready pod -l app=istiod -n istio-system --timeout=300s
```

## Step 3: Prepare Namespaces

Your Istio resources are namespaced, so the target namespaces need to exist. Also, set up injection labels:

```bash
# Create namespaces if they don't exist
kubectl create namespace my-app --dry-run=client -o yaml | kubectl apply -f -
kubectl create namespace another-app --dry-run=client -o yaml | kubectl apply -f -

# Label for sidecar injection
kubectl label namespace my-app istio-injection=enabled --overwrite
kubectl label namespace another-app istio-injection=enabled --overwrite
```

If you exported namespace configurations:

```bash
kubectl apply -f istio-export/injected-namespaces.yaml
```

## Step 4: Import Resources in Order

The import order matters because of resource dependencies:

```bash
#!/bin/bash
# import-istio-resources.sh

IMPORT_DIR="${1:-istio-export/resources}"

# Phase 1: Authentication and authorization foundations
echo "Phase 1: Security foundations..."
for resource in peerauthentications requestauthentications; do
  if [ -f "$IMPORT_DIR/$resource.yaml" ]; then
    kubectl apply -f "$IMPORT_DIR/$resource.yaml"
    echo "  Applied: $resource"
  fi
done

# Phase 2: Service discovery
echo "Phase 2: Service discovery..."
for resource in serviceentries workloadentries workloadgroups; do
  if [ -f "$IMPORT_DIR/$resource.yaml" ]; then
    kubectl apply -f "$IMPORT_DIR/$resource.yaml"
    echo "  Applied: $resource"
  fi
done

# Phase 3: Traffic policies
echo "Phase 3: Traffic policies..."
for resource in destinationrules; do
  if [ -f "$IMPORT_DIR/$resource.yaml" ]; then
    kubectl apply -f "$IMPORT_DIR/$resource.yaml"
    echo "  Applied: $resource"
  fi
done

# Phase 4: Gateways and routing
echo "Phase 4: Gateways and routing..."
for resource in gateways; do
  if [ -f "$IMPORT_DIR/$resource.yaml" ]; then
    kubectl apply -f "$IMPORT_DIR/$resource.yaml"
    echo "  Applied: $resource"
  fi
done

for resource in virtualservices; do
  if [ -f "$IMPORT_DIR/$resource.yaml" ]; then
    kubectl apply -f "$IMPORT_DIR/$resource.yaml"
    echo "  Applied: $resource"
  fi
done

# Phase 5: Access control
echo "Phase 5: Access control..."
for resource in authorizationpolicies; do
  if [ -f "$IMPORT_DIR/$resource.yaml" ]; then
    kubectl apply -f "$IMPORT_DIR/$resource.yaml"
    echo "  Applied: $resource"
  fi
done

# Phase 6: Advanced configuration
echo "Phase 6: Advanced configuration..."
for resource in sidecars envoyfilters proxyconfigs telemetries; do
  if [ -f "$IMPORT_DIR/$resource.yaml" ]; then
    kubectl apply -f "$IMPORT_DIR/$resource.yaml"
    echo "  Applied: $resource"
  fi
done

echo "Import complete!"
```

## Importing Individual Resources

If you exported resources individually (one file per resource), the import is more granular:

```bash
# Import all resources from individual files
find istio-export/resources-individual -name "*.yaml" | sort | while read file; do
  echo "Applying: $file"
  kubectl apply -f "$file" 2>&1 | tail -1
done
```

## Handling Import Errors

Some common errors you'll encounter and how to fix them:

**Namespace doesn't exist:**
```
Error from server (NotFound): namespaces "my-app" not found
```
Fix: Create the namespace first.

```bash
kubectl create namespace my-app
```

**Resource already exists:**
```
Error from server (AlreadyExists): ...
```
Fix: Use `--server-side --force-conflicts` or delete the existing resource first.

```bash
kubectl apply -f resource.yaml --server-side --force-conflicts
```

**Invalid field:**
```
Error from server (BadRequest): error when creating "resource.yaml": ... unknown field "xyz"
```
Fix: This usually means a version mismatch. The exported resource has fields that don't exist in the target cluster's CRD version. You'll need to manually edit the YAML to remove the unknown fields.

**CRD not found:**
```
error: the server doesn't have a resource type "virtualservices"
```
Fix: Install the Istio CRDs first (Step 1).

## Dry-Run Before Applying

Always do a dry run first to catch errors before they cause problems:

```bash
for file in istio-export/resources/*.yaml; do
  echo "Dry-run: $(basename $file)"
  kubectl apply -f "$file" --dry-run=server 2>&1 | grep -i "error\|created\|configured"
done
```

The `--dry-run=server` flag validates against the actual cluster API server, catching issues that client-side dry runs would miss.

## Verifying the Import

After importing, run a full verification:

```bash
# Check resource counts
echo "Imported resources:"
for resource in virtualservices destinationrules gateways serviceentries peerauthentications requestauthentications authorizationpolicies sidecars envoyfilters; do
  count=$(kubectl get "$resource" --all-namespaces --no-headers 2>/dev/null | wc -l)
  echo "  $resource: $count"
done

# Run Istio analysis
istioctl analyze --all-namespaces

# Check proxy sync status (once workloads are running)
istioctl proxy-status
```

The `istioctl analyze` output will tell you about any configuration issues:

```
Warning [IST0101] (VirtualService my-namespace/my-vs) Referenced host not found: "my-service.my-namespace.svc.cluster.local"
```

## Handling Version Differences

If the source and target clusters run different Istio versions, you might need to adjust resources:

```bash
# Check the API version of exported resources
grep "apiVersion:" istio-export/resources/virtualservices.yaml | head -5

# If they use an old API version, check if it's still supported
kubectl api-versions | grep istio
```

For major version differences, consult the Istio migration guides for any breaking API changes.

## Automated Import Pipeline

For repeated imports (like in a CI/CD pipeline), wrap everything in a script with error handling:

```bash
#!/bin/bash
set -e

IMPORT_DIR=$1
ERRORS=0

import_resource() {
  local file=$1
  if kubectl apply -f "$file" 2>/tmp/import-error; then
    echo "OK: $(basename $file)"
  else
    echo "FAIL: $(basename $file)"
    cat /tmp/import-error
    ERRORS=$((ERRORS + 1))
  fi
}

# Import all resources
for file in "$IMPORT_DIR"/resources/*.yaml; do
  import_resource "$file"
done

if [ $ERRORS -gt 0 ]; then
  echo "Import completed with $ERRORS errors"
  exit 1
else
  echo "Import completed successfully"
fi
```

Importing Istio CRDs is straightforward when you follow the right order and handle the edge cases. The key takeaways: install CRDs before resources, respect the dependency order, clean up cluster-specific metadata, and always verify after import.
