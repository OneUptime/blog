# How to Handle Kustomize Version Differences in ArgoCD

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: ArgoCD, GitOps, Kubernetes, Kustomize

Description: Learn how to handle Kustomize version mismatches between your local environment and ArgoCD, including feature compatibility, API version differences, and version pinning strategies.

---

You build and test your Kustomize manifests locally with one version of Kustomize, then ArgoCD renders them with a different version. The output differs. Resources that build cleanly on your machine fail in ArgoCD. Features you rely on do not exist in the version ArgoCD ships with. This version mismatch is one of the most common sources of confusion when using Kustomize with ArgoCD.

This guide covers identifying version differences, understanding feature compatibility, configuring ArgoCD to use specific Kustomize versions, and keeping your local and server environments in sync.

## The Version Mismatch Problem

ArgoCD bundles a specific version of Kustomize in its repo server container. Each ArgoCD release may ship a different Kustomize version:

| ArgoCD Version | Bundled Kustomize Version |
|---------------|--------------------------|
| 2.7.x | 5.1.x |
| 2.8.x | 5.2.x |
| 2.9.x | 5.3.x |
| 2.10.x | 5.3.x |
| 2.11.x | 5.4.x |

Your local Kustomize might be a completely different version. Check both:

```bash
# Check your local Kustomize version
kustomize version

# Check what ArgoCD is using
kubectl exec -n argocd deploy/argocd-repo-server -- kustomize version

# Also check kubectl's built-in Kustomize
kubectl version --client -o json | jq '.kustomizeVersion'
```

## Features That Changed Between Versions

Several Kustomize features were added, changed, or deprecated across versions. Knowing which version introduced a feature prevents silent failures:

### Components (v3.7.0+)

```yaml
# Only works with Kustomize 3.7.0 and later
apiVersion: kustomize.config.k8s.io/v1alpha1
kind: Component
```

If your ArgoCD ships with an older Kustomize, components silently fail or produce errors.

### Replacements (v4.5.0+)

```yaml
# Replacements replaced vars in Kustomize 4.5.0+
replacements:
  - source:
      kind: ConfigMap
      name: my-config
      fieldPath: data.hostname
    targets:
      - select:
          kind: Deployment
        fieldPaths:
          - spec.template.spec.containers.[name=app].env.[name=HOSTNAME].value
```

### Labels transformer (v4.1.0+)

```yaml
# The 'labels' field with includeSelectors control
labels:
  - pairs:
      environment: prod
    includeSelectors: false
```

### helmCharts (v4.1.0+)

```yaml
# Inflate Helm charts within Kustomize
helmCharts:
  - name: cert-manager
    repo: https://charts.jetstack.io
    version: 1.13.0
```

This requires the `--enable-helm` build flag.

## Checking ArgoCD Kustomize Version

The most reliable way to check:

```bash
# Get the ArgoCD server version info (includes tool versions)
argocd version

# Or check directly in the repo server pod
kubectl exec -n argocd deploy/argocd-repo-server -- kustomize version
```

## Matching Your Local Version

Install the same version locally that ArgoCD uses:

```bash
# Install a specific Kustomize version
# Using go install
GOBIN=$(pwd) GO111MODULE=on go install sigs.k8s.io/kustomize/kustomize/v5@v5.3.0

# Using curl (example for Linux)
curl -Lo kustomize.tar.gz \
  "https://github.com/kubernetes-sigs/kustomize/releases/download/kustomize%2Fv5.3.0/kustomize_v5.3.0_linux_amd64.tar.gz"
tar xzf kustomize.tar.gz
sudo mv kustomize /usr/local/bin/kustomize
```

Or use a version manager:

```bash
# Using asdf
asdf plugin add kustomize
asdf install kustomize 5.3.0
asdf local kustomize 5.3.0
```

## Configuring a Custom Kustomize Version in ArgoCD

If you need a different Kustomize version than what ArgoCD bundles, you have several options.

### Option 1: Custom Repo Server Image

Build a repo server image with your preferred Kustomize version:

```dockerfile
FROM quay.io/argoproj/argocd:v2.9.3

USER root

# Replace the bundled Kustomize with a specific version
RUN curl -Lo /usr/local/bin/kustomize \
    "https://github.com/kubernetes-sigs/kustomize/releases/download/kustomize%2Fv5.4.1/kustomize_v5.4.1_linux_amd64.tar.gz" \
    | tar xz -C /usr/local/bin/

USER argocd
```

### Option 2: Custom Kustomize Binary Path

Configure ArgoCD to use a custom binary path:

```yaml
# argocd-cm ConfigMap
apiVersion: v1
kind: ConfigMap
metadata:
  name: argocd-cm
  namespace: argocd
data:
  # Point to a custom Kustomize binary
  kustomize.path.v5.4.1: /custom-tools/kustomize-5.4.1
```

Then reference it in the Application:

```yaml
spec:
  source:
    kustomize:
      version: v5.4.1
```

## Kustomize Build Options

Different Kustomize versions support different build flags. Configure them in ArgoCD:

```yaml
# argocd-cm ConfigMap
apiVersion: v1
kind: ConfigMap
metadata:
  name: argocd-cm
  namespace: argocd
data:
  # Global build options for all Kustomize applications
  kustomize.buildOptions: "--enable-helm --enable-alpha-plugins --load-restrictor LoadRestrictionsNone"
```

Common build options:

```bash
# Enable Helm chart inflation within Kustomize
--enable-helm

# Allow alpha plugins
--enable-alpha-plugins

# Disable file load restrictions (needed for remote bases)
--load-restrictor LoadRestrictionsNone

# Enable management of external plugins
--enable-exec
```

## API Version Compatibility

The `apiVersion` in kustomization.yaml matters:

```yaml
# Old API version (deprecated but still works)
apiVersion: kustomize.config.k8s.io/v1beta1
kind: Kustomization

# Components use alpha API
apiVersion: kustomize.config.k8s.io/v1alpha1
kind: Component
```

Using a newer API version with an older Kustomize binary causes failures. Stick with `v1beta1` for Kustomization files until the version you target fully supports the newer API.

## Testing Against the ArgoCD Version

Create a CI step that tests your Kustomize builds with the same version ArgoCD uses:

```yaml
# .github/workflows/kustomize-test.yaml
name: Test Kustomize Builds
on: [pull_request]

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4

      - name: Install Kustomize (matching ArgoCD version)
        run: |
          curl -Lo kustomize.tar.gz \
            "https://github.com/kubernetes-sigs/kustomize/releases/download/kustomize%2Fv5.3.0/kustomize_v5.3.0_linux_amd64.tar.gz"
          tar xzf kustomize.tar.gz
          sudo mv kustomize /usr/local/bin/

      - name: Build all overlays
        run: |
          for overlay in apps/*/overlays/*/; do
            echo "Building ${overlay}..."
            kustomize build "${overlay}" > /dev/null
          done
```

## Debugging Version-Related Failures

When a build fails in ArgoCD but works locally:

```bash
# Check the ArgoCD repo server logs for build errors
kubectl logs -n argocd deploy/argocd-repo-server | grep -i kustomize

# Try building with the same flags ArgoCD uses
# Check argocd-cm for kustomize.buildOptions
kubectl get cm argocd-cm -n argocd -o jsonpath='{.data.kustomize\.buildOptions}'

# Build locally with those exact options
kustomize build --enable-helm overlays/production/
```

Common error patterns:
- `unknown field "components"` - Kustomize version too old for components
- `unknown field "replacements"` - Kustomize version too old for replacements
- `unknown field "helmCharts"` - Need `--enable-helm` flag or newer version

For more on using a custom Kustomize binary in ArgoCD, see the next section on [custom Kustomize binaries](https://oneuptime.com/blog/post/2026-02-26-argocd-custom-kustomize-binary/view).
