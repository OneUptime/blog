# How to Fix Flux Reconciliation Skipping Resources

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Flux, Kubernetes, GitOps, Troubleshooting, Reconciliation, Kustomize, Resources

Description: Troubleshoot and fix cases where Flux reconciliation completes successfully but silently skips certain resources, leaving them unapplied in the cluster.

---

Flux reports a successful reconciliation, yet some resources defined in your Git repository are not present in the cluster. This silent skipping is particularly dangerous because everything looks green, but your desired state does not match reality. This post explains why Flux might skip resources and how to ensure every resource gets applied.

## Symptoms

Reconciliation shows as `Ready` and `True`, but specific resources are missing from the cluster:

```bash
flux get kustomization my-app
```

```
NAME        REVISION              SUSPENDED   READY   MESSAGE
my-app      main@sha1:abc123      False       True    Applied revision: main@sha1:abc123
```

But when you check for expected resources:

```bash
kubectl get deployment my-new-service -n production
```

```
Error from server (NotFound): deployments.apps "my-new-service" not found
```

## Diagnostic Commands

### View the last applied inventory

```bash
kubectl get kustomization my-app -n flux-system -o jsonpath='{.status.inventory.entries}' | jq .
```

### Build the kustomization locally and compare

```bash
kustomize build ./path/to/app/ | kubectl diff -f -
```

### Check what Flux actually built

```bash
kubectl logs -n flux-system deployment/kustomize-controller | grep "my-app" | grep "applied"
```

### List the resources Flux thinks it manages

```bash
kubectl get kustomization my-app -n flux-system -o jsonpath='{.status.inventory.entries[*].id}'
```

## Common Root Causes

### 1. Resource not included in kustomization.yaml

The most common cause is that a new file exists in the directory but is not referenced in the `kustomization.yaml` resources list.

```yaml
# kustomization.yaml - missing the new resource
apiVersion: kustomize.config.k8s.io/v1beta1
kind: Kustomization
resources:
  - deployment.yaml
  - service.yaml
  # - new-configmap.yaml  <-- missing!
```

### 2. Path mismatch in the Flux Kustomization

The `spec.path` in the Flux Kustomization does not point to the directory containing the resources:

```yaml
spec:
  path: ./apps/production  # But the resource is in ./apps/staging
```

### 3. Namespace scope filtering

If the Kustomization has `targetNamespace` set, resources in other namespaces may be silently skipped or applied to the wrong namespace.

### 4. Kustomize patches removing resources

Strategic merge patches or JSON patches might inadvertently remove or null out resources.

### 5. Conditional generation not producing output

If you use generators or Helm values that conditionally include resources, the conditions may not be met.

## Step-by-Step Fixes

### Fix 1: Verify the kustomize build output

Build locally and check if the resource appears in the output:

```bash
kustomize build ./path/to/app/ | grep "kind: Deployment" -A 5
```

If the resource is missing from the build output, check your `kustomization.yaml`:

```bash
cat ./path/to/app/kustomization.yaml
```

Add the missing resource:

```yaml
resources:
  - deployment.yaml
  - service.yaml
  - new-configmap.yaml  # Add the missing resource
```

### Fix 2: Check the Flux Kustomization path

Verify the path matches where your resources live:

```bash
kubectl get kustomization my-app -n flux-system -o jsonpath='{.spec.path}'
```

Update if needed:

```yaml
spec:
  path: ./apps/production/my-app
```

### Fix 3: Check for namespace issues

If using `targetNamespace`, verify it is correct and the resources are compatible:

```bash
kubectl get kustomization my-app -n flux-system -o jsonpath='{.spec.targetNamespace}'
```

For cluster-scoped resources like ClusterRoles, you may need a separate Kustomization without `targetNamespace`.

### Fix 4: Debug patches

Review your patches to ensure they are not removing resources:

```bash
kustomize build ./path/to/app/ > with-patches.yaml
# Remove patches from kustomization.yaml temporarily
kustomize build ./path/to/app/ > without-patches.yaml
diff with-patches.yaml without-patches.yaml
```

### Fix 5: Force a full re-apply

If the inventory is stale, force Flux to re-apply everything:

```bash
flux reconcile kustomization my-app --with-source --force
```

Or annotate the Kustomization to trigger a full reconciliation:

```bash
kubectl annotate kustomization my-app -n flux-system reconcile.fluxcd.io/requestedAt="$(date +%s)" --overwrite
```

## Prevention Strategies

1. **Use CI validation** to compare the kustomize build output against expected resources before merging.
2. **Avoid manual resource lists** where possible. Use the directory-based approach where all YAML files in a directory are automatically included.
3. **Review the Flux inventory** after each deployment to confirm all expected resources are tracked.
4. **Use the flux diff kustomization** command to preview what will change before applying:

```bash
flux diff kustomization my-app --path ./path/to/app/
```

5. **Set up automated inventory checks** that compare expected resources against the Flux inventory and alert on mismatches.

Silent skipping is one of the harder Flux issues to catch because everything reports as healthy. Building inventory validation into your workflow is the best defense against missing resources.
