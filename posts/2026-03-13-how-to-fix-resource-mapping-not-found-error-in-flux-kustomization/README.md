# How to Fix resource mapping not found Error in Flux Kustomization

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Flux, Kubernetes, GitOps, Troubleshooting, Error Messages, Kustomization, CRDs, Resource Mapping

Description: Learn how to diagnose and fix the "resource mapping not found" error in Flux Kustomization caused by missing Custom Resource Definitions.

---

When Flux attempts to apply manifests that reference custom resource types, you may encounter:

```
kustomize controller: failed to reconcile kustomization 'flux-system/my-app': resource mapping not found for name: "my-resource" namespace: "default" from "my-resource.yaml": no matches for kind "MyCustomResource" in version "example.com/v1alpha1"
```

or:

```
resource mapping not found for name: "my-certificate" namespace: "cert-manager" from "certificate.yaml": no matches for kind "Certificate" in version "cert-manager.io/v1"
```

This error means Flux tried to apply a resource whose Custom Resource Definition (CRD) is not installed in the cluster. The Kubernetes API server does not recognize the resource kind.

## Root Causes

### 1. CRDs Not Yet Installed

The most common cause is that the CRDs have not been installed before the resources that depend on them. This happens when CRDs and custom resources are in the same Kustomization without proper ordering.

### 2. Missing dependsOn

The Kustomization applying custom resources does not declare a dependency on the Kustomization that installs the CRDs or the operator that provides them.

### 3. CRD Installation Failed

The Kustomization that should install the CRDs failed, leaving the cluster without the required resource definitions.

### 4. Wrong API Version

The manifests reference an API version that does not match the installed CRD version. For example, using `v1alpha1` when only `v1` is installed.

## Diagnostic Steps

### Step 1: Identify the Missing Resource Type

From the error message, note the kind and API version (e.g., `Certificate` in `cert-manager.io/v1`).

### Step 2: Check If the CRD Exists

```bash
kubectl get crd certificates.cert-manager.io
```

If not found, the CRD is missing.

### Step 3: Check Available Versions

If the CRD exists, check which versions are served:

```bash
kubectl get crd certificates.cert-manager.io -o jsonpath='{.spec.versions[*].name}'
```

### Step 4: Check CRD-Installing Kustomization

```bash
flux get kustomizations -A
```

Look for the Kustomization responsible for installing the operator or CRDs and check its status.

### Step 5: Check for Dependency Order

```bash
kubectl get kustomization my-app -n flux-system -o jsonpath='{.spec.dependsOn}'
```

## How to Fix

### Fix 1: Add dependsOn to Ensure CRD Order

Ensure the Kustomization that applies custom resources depends on the one that installs the CRDs:

```yaml
apiVersion: kustomize.toolkit.fluxcd.io/v1
kind: Kustomization
metadata:
  name: cert-manager
  namespace: flux-system
spec:
  interval: 10m
  path: ./infrastructure/cert-manager
  prune: true
  sourceRef:
    kind: GitRepository
    name: flux-system
---
apiVersion: kustomize.toolkit.fluxcd.io/v1
kind: Kustomization
metadata:
  name: certificates
  namespace: flux-system
spec:
  interval: 10m
  path: ./infrastructure/certificates
  prune: true
  dependsOn:
    - name: cert-manager
  sourceRef:
    kind: GitRepository
    name: flux-system
```

### Fix 2: Separate CRDs from Custom Resources

Move CRDs into their own directory and Kustomization:

```
infrastructure/
  cert-manager/
    crds/
      kustomization.yaml
    config/
      kustomization.yaml
```

Apply CRDs before the operator configuration:

```yaml
apiVersion: kustomize.toolkit.fluxcd.io/v1
kind: Kustomization
metadata:
  name: cert-manager-crds
  namespace: flux-system
spec:
  interval: 10m
  path: ./infrastructure/cert-manager/crds
  prune: false
  sourceRef:
    kind: GitRepository
    name: flux-system
---
apiVersion: kustomize.toolkit.fluxcd.io/v1
kind: Kustomization
metadata:
  name: cert-manager
  namespace: flux-system
spec:
  interval: 10m
  path: ./infrastructure/cert-manager/config
  prune: true
  dependsOn:
    - name: cert-manager-crds
  sourceRef:
    kind: GitRepository
    name: flux-system
```

### Fix 3: Update the API Version in Manifests

If the CRD is installed but with a different version, update your manifests:

```bash
# Check available versions
kubectl get crd certificates.cert-manager.io -o jsonpath='{.spec.versions[*].name}'
```

Update the `apiVersion` in your manifest files accordingly.

### Fix 4: Add Health Checks for CRD Readiness

Use health checks to ensure CRDs are fully registered before proceeding:

```yaml
apiVersion: kustomize.toolkit.fluxcd.io/v1
kind: Kustomization
metadata:
  name: cert-manager
  namespace: flux-system
spec:
  interval: 10m
  path: ./infrastructure/cert-manager
  prune: true
  healthChecks:
    - apiVersion: apps/v1
      kind: Deployment
      name: cert-manager
      namespace: cert-manager
  sourceRef:
    kind: GitRepository
    name: flux-system
```

### Fix 5: Force Reconciliation

After installing the CRDs:

```bash
flux reconcile kustomization my-app --with-source
```

## Prevention

Always structure your Flux repository with clear dependency ordering. Install CRDs and operators before the resources that depend on them. Use `dependsOn` to make these dependencies explicit. Set `prune: false` for CRD Kustomizations to prevent accidental deletion of CRDs during reconciliation.
