# How to Fix 'kustomize build failed' Error in Flux CD

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Flux CD, Kustomize, build failed, Troubleshooting, Kubernetes, GitOps, YAML

Description: A practical guide to diagnosing and fixing 'kustomize build failed' errors in Flux CD Kustomization resources with local testing techniques.

---

## Introduction

The "kustomize build failed" error in Flux CD occurs when the kustomize-controller cannot successfully build the manifests from your repository. This is one of the most common errors because it involves YAML syntax, file structure, and kustomize configuration. This guide covers all major causes and shows you how to test fixes locally before pushing.

## Understanding the Error

The error appears in the Kustomization resource status:

```bash
# Check the Kustomization status
flux get kustomizations -A

# Get the detailed error message
kubectl describe kustomization <name> -n flux-system
```

Typical error messages include:

```text
kustomize build failed: accumulating resources: ...
```

```text
kustomize build failed: yaml: line X: did not find expected key
```

## Cause 1: Invalid YAML Syntax

YAML syntax errors are the most frequent cause of build failures.

### Diagnosing

Look for the line number in the error message:

```text
kustomize build failed: yaml: line 15: mapping values are not allowed in this context
```

### Common YAML Mistakes

```yaml
# WRONG: Incorrect indentation
apiVersion: apps/v1
kind: Deployment
metadata:
  name: my-app
spec:
  replicas: 3
    selector:  # This line has wrong indentation
      matchLabels:
        app: my-app

# CORRECT: Proper indentation
apiVersion: apps/v1
kind: Deployment
metadata:
  name: my-app
spec:
  replicas: 3
  selector:  # Same level as replicas
    matchLabels:
      app: my-app
```

```yaml
# WRONG: Tab characters instead of spaces
apiVersion: v1
kind: ConfigMap
metadata:
	name: my-config  # Tab used here - YAML requires spaces

# CORRECT: Use spaces only
apiVersion: v1
kind: ConfigMap
metadata:
  name: my-config  # Two spaces for indentation
```

### Fix: Validate YAML Locally

```bash
# Install yamllint for YAML validation
pip install yamllint

# Validate a specific file
yamllint my-deployment.yaml

# Validate all YAML files in a directory
yamllint ./kubernetes/

# Use kubectl to validate the manifest
kubectl apply --dry-run=client -f my-deployment.yaml
```

## Cause 2: Missing kustomization.yaml File

Flux requires a `kustomization.yaml` file in the target directory.

### Diagnosing

```bash
# Check the path configured in the Kustomization
kubectl get kustomization <name> -n flux-system -o jsonpath='{.spec.path}'
```

The error will look like:

```text
kustomize build failed: unable to find one of 'kustomization.yaml', 'kustomization.yml' or 'Kustomization' in directory '...'
```

### Fix

Create a `kustomization.yaml` file in the target directory:

```yaml
# kustomization.yaml
apiVersion: kustomize.config.k8s.io/v1beta1
kind: Kustomization

# List all resources that should be included
resources:
  - deployment.yaml
  - service.yaml
  - configmap.yaml
  - ingress.yaml
```

Or update the Kustomization path to point to the correct directory:

```yaml
apiVersion: kustomize.toolkit.fluxcd.io/v1
kind: Kustomization
metadata:
  name: my-app
  namespace: flux-system
spec:
  interval: 10m
  # Make sure this path exists and contains kustomization.yaml
  path: ./clusters/production/my-app
  sourceRef:
    kind: GitRepository
    name: my-app
  prune: true
```

## Cause 3: Missing Resource Files

When `kustomization.yaml` references files that do not exist.

### Diagnosing

The error message will specify which resource could not be found:

```python
kustomize build failed: accumulating resources: accumulating resources from 'missing-file.yaml': evalsymlink failure on '/tmp/.../missing-file.yaml'
```

### Fix

Either create the missing file or remove it from `kustomization.yaml`:

```yaml
# kustomization.yaml
apiVersion: kustomize.config.k8s.io/v1beta1
kind: Kustomization

resources:
  - deployment.yaml
  - service.yaml
  # Remove or comment out files that do not exist
  # - missing-file.yaml
```

## Cause 4: Wrong Path in Kustomization

The `spec.path` in the Flux Kustomization might not match the actual directory structure in the Git repository.

### Diagnosing

```bash
# Check the configured path
kubectl get kustomization <name> -n flux-system -o jsonpath='{.spec.path}'

# Check the GitRepository artifact to see what is available
kubectl get gitrepository <git-repo-name> -n flux-system -o jsonpath='{.status.artifact.url}'
```

### Fix

```yaml
apiVersion: kustomize.toolkit.fluxcd.io/v1
kind: Kustomization
metadata:
  name: my-app
  namespace: flux-system
spec:
  interval: 10m
  # The path is relative to the repository root
  # Use ./ prefix and no trailing slash
  path: ./deploy/overlays/production
  sourceRef:
    kind: GitRepository
    name: my-app
  prune: true
```

```bash
# Verify the directory structure in your repo
# The path should match exactly, including case sensitivity
ls -la deploy/overlays/production/
```

## Cause 5: Invalid Kustomize Patches

Incorrectly formatted patches will cause build failures.

### Diagnosing

```text
kustomize build failed: trouble configuring builtin PatchTransformer with config: ...
```

### Fix: Strategic Merge Patch

```yaml
# kustomization.yaml
apiVersion: kustomize.config.k8s.io/v1beta1
kind: Kustomization

resources:
  - deployment.yaml

# Strategic merge patches must include apiVersion, kind, and name
patches:
  - target:
      kind: Deployment
      name: my-app
    patch: |
      apiVersion: apps/v1
      kind: Deployment
      metadata:
        name: my-app
      spec:
        replicas: 5
```

### Fix: JSON6902 Patch

```yaml
# kustomization.yaml
apiVersion: kustomize.config.k8s.io/v1beta1
kind: Kustomization

resources:
  - deployment.yaml

# JSON patches require correct paths
patches:
  - target:
      kind: Deployment
      name: my-app
    patch: |
      - op: replace
        path: /spec/replicas
        value: 5
      - op: add
        path: /metadata/labels/environment
        value: production
```

## Cause 6: Duplicate Resource Definitions

Including the same resource twice causes kustomize to fail.

### Diagnosing

```text
kustomize build failed: accumulating resources: may not add resource with an already registered id: Deployment.v1.apps/my-app.default
```

### Fix

Remove the duplicate entry from your `kustomization.yaml`:

```yaml
# kustomization.yaml
apiVersion: kustomize.config.k8s.io/v1beta1
kind: Kustomization

resources:
  - deployment.yaml
  # - another-file-with-same-deployment.yaml  # Remove duplicate
  - service.yaml
```

If you are using overlays that inherit from a base, ensure you are not re-declaring resources:

```yaml
# overlays/production/kustomization.yaml
apiVersion: kustomize.config.k8s.io/v1beta1
kind: Kustomization

resources:
  - ../../base  # Base already includes deployment.yaml
  # Do NOT also include deployment.yaml here
```

## Cause 7: Unsupported Kustomize Features

Flux uses a specific version of kustomize. Some newer or deprecated features might not be available.

### Diagnosing

```bash
# Check which version of kustomize the kustomize-controller uses
kubectl exec -n flux-system deploy/kustomize-controller -- kustomize version 2>/dev/null
# Or check the controller image version
kubectl get deploy kustomize-controller -n flux-system -o jsonpath='{.spec.template.spec.containers[0].image}'
```

### Fix

Avoid using features not supported by the bundled kustomize version. If you need a specific feature, pin the controller version that supports it.

## Testing Kustomize Builds Locally

Always test your kustomize builds locally before pushing to Git:

```bash
# Install kustomize CLI
curl -s "https://raw.githubusercontent.com/kubernetes-sigs/kustomize/master/hack/install_kustomize.sh" | bash

# Build and validate locally
kustomize build ./deploy/overlays/production/

# Build and pipe to kubectl for server-side validation
kustomize build ./deploy/overlays/production/ | kubectl apply --dry-run=server -f -

# Build and save the output for inspection
kustomize build ./deploy/overlays/production/ > /tmp/rendered.yaml
cat /tmp/rendered.yaml | kubectl apply --dry-run=client -f -
```

## Forcing Reconciliation After Fix

```bash
# After pushing your fix to Git, force Flux to pick it up
flux reconcile source git <git-repo-name>

# Then reconcile the Kustomization
flux reconcile kustomization <name>

# Watch the status
flux get kustomizations -w
```

## Summary

The "kustomize build failed" error covers a wide range of issues from simple YAML typos to complex patch configurations. The most effective approach is to always test your kustomize builds locally using `kustomize build` before pushing changes. This catches most issues before they reach your cluster. When debugging in the cluster, the error messages from Flux usually point directly to the problematic file and line, making it straightforward to locate and fix the issue.
