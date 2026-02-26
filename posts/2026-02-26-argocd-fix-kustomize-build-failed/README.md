# How to Fix 'kustomize build failed' Error in ArgoCD

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: ArgoCD, GitOps, Kubernetes, Troubleshooting, Kustomize

Description: Resolve the kustomize build failed error in ArgoCD by fixing missing resources, invalid patches, version incompatibilities, and remote base resolution problems.

---

The "kustomize build failed" error in ArgoCD appears when the repo server cannot process your Kustomize overlays into valid Kubernetes manifests. ArgoCD runs `kustomize build` internally, and any issue that makes this command fail will cause this error.

You will see something like:

```
rpc error: code = Unknown desc = `kustomize build` failed:
Error: accumulating resources: accumulating resources from 'deployment.yaml':
evalsymlink failure on '/tmp/repo/deployment.yaml' : lstat deployment.yaml: no such file or directory
```

This guide covers all the common causes and provides practical solutions.

## Reproduce the Error Locally

Before doing anything in ArgoCD, try building the kustomize output locally:

```bash
# Navigate to your kustomize directory
cd overlays/production

# Build and check for errors
kustomize build .

# If you need to check with the same kustomize version ArgoCD uses
kubectl exec -n argocd deployment/argocd-repo-server -- kustomize version
```

This gives you immediate feedback without waiting for ArgoCD reconciliation cycles.

## Cause 1: Missing Resource Files

The most common cause. A file referenced in `kustomization.yaml` does not exist:

```
Error: accumulating resources from 'deployment.yaml': no such file or directory
```

**Check your kustomization.yaml:**

```yaml
# kustomization.yaml
apiVersion: kustomize.config.k8s.io/v1beta1
kind: Kustomization

resources:
  - deployment.yaml    # Does this file exist?
  - service.yaml       # Does this file exist?
  - ingress.yaml       # Maybe this was deleted or renamed
```

**Fix:** Ensure all referenced files exist, or remove references to deleted files.

```bash
# List files in the directory
ls -la

# Compare with what kustomization.yaml references
grep -A20 "resources:" kustomization.yaml
```

## Cause 2: Invalid Patches

Patches that reference fields or resources incorrectly:

```
Error: no matches for OriginalId apps~v1~Deployment|~|my-deployment
```

This means the patch is targeting a resource that does not exist in the base.

**Check your patch targets:**

```yaml
# kustomization.yaml
patches:
  - target:
      kind: Deployment
      name: my-deployment  # Does this name match the base resource?
    patch: |
      - op: replace
        path: /spec/replicas
        value: 3
```

**Fix by verifying the patch target matches a real resource:**

```bash
# Build the base first to see what resources are available
kustomize build base/
```

**Common patch mistakes:**

```yaml
# WRONG - wrong apiVersion group
patches:
  - target:
      group: apps
      version: v1
      kind: Deployment
      name: nginx  # Must match exactly

# Make sure the name matches what is in the base YAML
```

## Cause 3: Missing Base Directory

If using overlays that reference a base:

```
Error: accumulating resources from '../base': evalsymlink failure
```

**Check the base reference:**

```yaml
# overlays/production/kustomization.yaml
resources:
  - ../../base  # Is this path correct relative to this file?
```

**Fix by verifying the directory structure:**

```
repo/
  base/
    kustomization.yaml
    deployment.yaml
  overlays/
    production/
      kustomization.yaml  # References ../../base
    staging/
      kustomization.yaml
```

If the path is wrong, update it:

```yaml
resources:
  - ../../base  # Correct relative path
```

## Cause 4: Kustomize Version Incompatibility

Your kustomization file uses features not supported by the version of Kustomize bundled with ArgoCD:

**Check ArgoCD's Kustomize version:**

```bash
kubectl exec -n argocd deployment/argocd-repo-server -- kustomize version
```

**Common version-related issues:**

- `replacements` (introduced in Kustomize 4.5.1, replacing `vars`)
- `components` (introduced in Kustomize 3.7.0)
- `openapi` customization

**If you need a newer Kustomize version:**

```yaml
# argocd-cm ConfigMap
apiVersion: v1
kind: ConfigMap
metadata:
  name: argocd-cm
  namespace: argocd
data:
  # Override the kustomize binary path
  kustomize.path.v4.5.7: /custom-tools/kustomize
```

You can mount a custom Kustomize binary using an init container on the repo server:

```yaml
# Repo server deployment - add init container
initContainers:
  - name: install-kustomize
    image: alpine:3.19
    command:
      - /bin/sh
      - -c
      - |
        wget https://github.com/kubernetes-sigs/kustomize/releases/download/kustomize%2Fv5.3.0/kustomize_v5.3.0_linux_amd64.tar.gz
        tar xzf kustomize_v5.3.0_linux_amd64.tar.gz
        mv kustomize /custom-tools/
    volumeMounts:
      - name: custom-tools
        mountPath: /custom-tools
```

## Cause 5: Remote Base Cannot Be Fetched

If your kustomization references a remote base:

```yaml
resources:
  - https://github.com/org/shared-base//base?ref=v1.0.0
```

And ArgoCD cannot fetch it:

```
Error: accumulating resources from 'https://github.com/org/shared-base//base?ref=v1.0.0':
unable to access 'https://github.com/org/shared-base/': Authentication required
```

**Fix options:**

1. **Vendor the remote base locally** (recommended):

```bash
# Download the remote base into your repo
git clone https://github.com/org/shared-base /tmp/shared
cp -r /tmp/shared/base ./vendor/shared-base

# Update kustomization.yaml
# resources:
#   - ../../vendor/shared-base
```

2. **Configure Git credentials for the remote base** in ArgoCD:

```bash
argocd repo add https://github.com/org/shared-base \
  --username x-access-token \
  --password ghp_token
```

3. **Use the ref tag properly** for private repos:

```yaml
resources:
  - github.com/org/shared-base//base?ref=v1.0.0
```

## Cause 6: YAML Syntax Errors

Invalid YAML in resource files:

```
Error: YAML parse error in deployment.yaml: yaml: line 15: found character that cannot start any token
```

**Common YAML issues:**

```yaml
# WRONG - tabs instead of spaces
spec:
	replicas: 3    # Tab character!

# WRONG - missing quotes around special characters
metadata:
  annotations:
    note: value: with: colons  # Needs quotes

# CORRECT
metadata:
  annotations:
    note: "value: with: colons"
```

**Validate YAML before pushing:**

```bash
yamllint overlay/production/
```

## Cause 7: Duplicate Resources

Two files defining the same resource:

```
Error: may not add resource with an already registered id: apps_v1_Deployment|~|my-deployment
```

**Fix by removing the duplicate.** Check all resource files:

```bash
grep -rn "kind: Deployment" . | grep "name: my-deployment"
```

## Cause 8: Invalid Kustomization File

The `kustomization.yaml` file itself has structural issues:

```
Error: invalid Kustomization: json: cannot unmarshal string into Go value of type types.Kustomization
```

**Validate the structure:**

```yaml
# Correct kustomization.yaml structure
apiVersion: kustomize.config.k8s.io/v1beta1
kind: Kustomization

resources:
  - deployment.yaml
  - service.yaml

patches:
  - path: patch.yaml

namespace: production

commonLabels:
  app: my-app
```

**Common mistakes:**
- Wrong `apiVersion` or `kind`
- Using deprecated fields without the migration
- Mixing `patchesStrategicMerge` with `patches` in newer versions

## Cause 9: ArgoCD Kustomize Build Options

ArgoCD passes specific build options that might conflict:

```yaml
# Check if build options are set
# argocd-cm ConfigMap
data:
  kustomize.buildOptions: "--enable-helm --load-restrictor LoadRestrictionsNone"
```

If you need specific build options:

```yaml
# argocd-cm ConfigMap
data:
  kustomize.buildOptions: "--load-restrictor LoadRestrictionsNone"
```

Or per application:

```yaml
spec:
  source:
    kustomize:
      commonLabels:
        app: my-app
```

## Debugging Checklist

1. Run `kustomize build .` locally in the same directory
2. Check all file references in `kustomization.yaml` exist
3. Verify patch targets match real resources
4. Check base directory paths are correct
5. Validate YAML syntax with `yamllint`
6. Check Kustomize version compatibility
7. Look for duplicate resource definitions
8. Check repo server logs: `kubectl logs -n argocd deployment/argocd-repo-server`

## Summary

The "kustomize build failed" error means ArgoCD cannot process your Kustomize configuration. Start by running `kustomize build` locally to get the exact error. The most common causes are missing resource files, incorrect patch targets, path issues with base references, and Kustomize version incompatibilities. Fix the underlying Kustomize issue, push to Git, and let ArgoCD re-render.
