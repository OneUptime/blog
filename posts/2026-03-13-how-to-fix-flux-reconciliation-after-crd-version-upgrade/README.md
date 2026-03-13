# How to Fix Flux Reconciliation After CRD Version Upgrade

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Flux, Kubernetes, GitOps, Troubleshooting, Reconciliation, CRD, APIVersion, Upgrade

Description: Resolve Flux reconciliation failures that occur after upgrading Custom Resource Definitions to new API versions, including conversion webhook issues and manifest migration.

---

Upgrading CRDs to new API versions is a common maintenance task, but it frequently breaks Flux reconciliation. The stored version changes, conversion webhooks may not be in place, and your Git manifests may reference the old API version. This post walks through how to handle CRD version upgrades without disrupting Flux.

## Symptoms

After a CRD version upgrade, Flux may report errors like:

```bash
flux get kustomizations
```

```text
NAME        REVISION              SUSPENDED   READY   MESSAGE
my-app      main@sha1:abc123      False       False   no matches for kind "MyResource" in version "v1alpha1"
```

Or:

```text
Apply failed: resource mapping not found for name "my-resource" namespace "production" from "": no matches for kind "MyResource" in version "example.com/v1alpha1"
```

## Diagnostic Commands

### Check the current CRD versions

```bash
kubectl get crd myresources.example.com -o jsonpath='{.spec.versions[*].name}'
```

### Check the stored version

```bash
kubectl get crd myresources.example.com -o jsonpath='{.status.storedVersions}'
```

### Check which API version Flux manifests use

```bash
grep -r "apiVersion.*example.com" ./path/to/app/
```

### Verify conversion webhook status

```bash
kubectl get crd myresources.example.com -o jsonpath='{.spec.conversion}'
```

### Check if the old API version is still served

```bash
kubectl get crd myresources.example.com -o jsonpath='{.spec.versions}' | jq '.[] | {name: .name, served: .served, storage: .storage}'
```

## Common Root Causes

### 1. Manifests reference a removed API version

The CRD no longer serves the old API version that your Git manifests use.

### 2. Conversion webhook not available

The CRD is configured for webhook conversion between versions, but the conversion webhook is not running or not reachable.

### 3. Storage version migration not complete

The CRD's storage version changed, but existing objects have not been migrated from the old storage version.

### 4. Operator upgraded before manifests updated

The operator that manages the CRD was upgraded (installing new CRD versions) before the application manifests were updated to use the new API version.

### 5. Kustomize patches using old API version

Patches in your kustomization reference the old API version.

## Step-by-Step Fixes

### Fix 1: Update manifests to the new API version

Update all references in your Git repository to use the new API version:

```yaml
# Before
apiVersion: example.com/v1alpha1
kind: MyResource
metadata:
  name: my-resource

# After
apiVersion: example.com/v1
kind: MyResource
metadata:
  name: my-resource
```

Check for any field changes between versions and update accordingly. Commit and push:

```bash
git add . && git commit -m "Migrate MyResource manifests to v1 API" && git push
```

### Fix 2: Keep the old version served during migration

If you cannot update all manifests at once, ensure the CRD continues serving the old version:

```yaml
apiVersion: apiextensions.k8s.io/v1
kind: CustomResourceDefinition
metadata:
  name: myresources.example.com
spec:
  versions:
    - name: v1
      served: true
      storage: true
    - name: v1alpha1
      served: true        # Keep serving the old version
      storage: false
```

### Fix 3: Fix the conversion webhook

If the CRD uses webhook conversion, ensure the webhook is running:

```bash
kubectl get pods -n operator-namespace -l app=operator
kubectl logs -n operator-namespace deployment/operator | grep conversion
```

Check the webhook service:

```bash
kubectl get service -n operator-namespace operator-webhook
```

Verify the webhook configuration in the CRD:

```bash
kubectl get crd myresources.example.com -o jsonpath='{.spec.conversion}' | jq .
```

### Fix 4: Migrate stored objects

If the stored version has changed, you may need to migrate existing objects. Use the storage version migrator or manually touch each object:

```bash
# List all objects of the custom resource
kubectl get myresources.example.com --all-namespaces -o name | while read obj; do
  kubectl patch $obj --type=merge -p '{}'
done
```

Update the stored versions in the CRD status:

```bash
kubectl get crd myresources.example.com -o json | jq '.status.storedVersions = ["v1"]' | kubectl replace -f -
```

### Fix 5: Coordinate CRD and manifest upgrades

Follow this order to upgrade without disruption:

1. Update the CRD to serve both old and new versions
2. Update your Git manifests to the new API version
3. Let Flux reconcile the manifests
4. Remove the old version from the CRD

```bash
# Step 1: Deploy CRD with both versions
flux reconcile kustomization infra-crds --with-source

# Step 2-3: Deploy updated manifests
flux reconcile kustomization apps --with-source

# Step 4: Remove old version from CRD (after verifying everything works)
flux reconcile kustomization infra-crds --with-source
```

### Fix 6: Update kustomize patches

Check all patches and overlays for old API version references:

```bash
grep -r "v1alpha1" ./path/to/overlays/
```

Update patches to reference the new version:

```yaml
# kustomization.yaml
patches:
  - target:
      group: example.com
      version: v1          # Updated from v1alpha1
      kind: MyResource
      name: my-resource
    patch: |
      - op: replace
        path: /spec/replicas
        value: 3
```

## Prevention Strategies

1. **Stage CRD upgrades** by first adding the new version alongside the old one, then migrating manifests, then removing the old version.
2. **Test CRD upgrades in staging** before applying to production to catch manifest incompatibilities.
3. **Track API version deprecations** in your CRDs and plan migrations before versions are removed.
4. **Use kustomize replacements** instead of hard-coded API versions where possible.
5. **Pin operator versions** and upgrade them intentionally rather than using auto-update channels.

```yaml
# Use a specific version, not latest
apiVersion: source.toolkit.fluxcd.io/v1
kind: HelmRepository
metadata:
  name: operator-repo
spec:
  url: https://charts.example.com
---
apiVersion: helm.toolkit.fluxcd.io/v2
kind: HelmRelease
metadata:
  name: operator
spec:
  chart:
    spec:
      chart: operator
      version: "2.5.x"  # Pin to a specific minor version
```

CRD version upgrades require careful coordination between the CRD definition, the operator, and the application manifests. Planning the upgrade sequence in advance prevents reconciliation failures.
