# How to Build OCI Artifacts from Kustomize Overlays with Flux

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Flux CD, GitOps, Kubernetes, OCI, Kustomize, Overlays

Description: Learn how to package Kustomize overlays as OCI artifacts and deploy them using Flux CD's OCIRepository source.

---

## Introduction

Kustomize overlays let you maintain environment-specific configurations (development, staging, production) from a shared base. When combined with Flux CD's OCI support, you can package each overlay as a separate OCI artifact, push it to a container registry, and have Flux pull and apply the correct overlay per cluster. This approach gives you precise control over what gets deployed where, with the speed and caching benefits of OCI distribution.

This guide covers structuring Kustomize overlays, building and pushing them as OCI artifacts, and configuring Flux to consume them.

## Prerequisites

- A Kubernetes cluster with Flux CD installed (v0.35 or later)
- The `flux` CLI installed
- The `kustomize` CLI installed
- An OCI-compatible container registry
- `kubectl` configured to access your cluster

## Step 1: Structure Your Kustomize Overlays

A typical Kustomize directory structure with overlays looks like this.

```bash
# Directory structure for a Kustomize project with overlays
tree manifests/
# manifests/
# ├── base/
# │   ├── deployment.yaml
# │   ├── service.yaml
# │   └── kustomization.yaml
# ├── overlays/
# │   ├── dev/
# │   │   ├── kustomization.yaml
# │   │   └── replicas-patch.yaml
# │   ├── staging/
# │   │   ├── kustomization.yaml
# │   │   └── replicas-patch.yaml
# │   └── production/
# │       ├── kustomization.yaml
# │       ├── replicas-patch.yaml
# │       └── hpa.yaml
```

Here is an example base kustomization.

```yaml
# manifests/base/kustomization.yaml
apiVersion: kustomize.config.k8s.io/v1beta1
kind: Kustomization
resources:
  - deployment.yaml
  - service.yaml
```

And a production overlay that patches replicas and adds an HPA.

```yaml
# manifests/overlays/production/kustomization.yaml
apiVersion: kustomize.config.k8s.io/v1beta1
kind: Kustomization
resources:
  - ../../base
  - hpa.yaml
patches:
  - path: replicas-patch.yaml
    target:
      kind: Deployment
      name: app
```

```yaml
# manifests/overlays/production/replicas-patch.yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: app
spec:
  replicas: 5
```

## Step 2: Build and Push Overlay as OCI Artifact (Option A - Push Raw Overlay)

You can push the raw Kustomize overlay directory, letting Flux's Kustomize controller build it at reconciliation time.

```bash
# Push the entire manifests directory including base and overlay
flux push artifact oci://registry.example.com/kustomize/app-production:v1.0.0 \
  --path=./manifests \
  --source="$(git config --get remote.origin.url)" \
  --revision="main@sha1:$(git rev-parse HEAD)"
```

With this approach, the OCI artifact contains the full Kustomize structure, and you set the `path` in the Flux Kustomization to the overlay.

```yaml
# kustomization-raw-overlay.yaml -- Flux Kustomization with overlay path
apiVersion: kustomize.toolkit.fluxcd.io/v1
kind: Kustomization
metadata:
  name: app-production
  namespace: flux-system
spec:
  interval: 10m
  sourceRef:
    kind: OCIRepository
    name: app-manifests
  # Point to the specific overlay within the artifact
  path: ./overlays/production
  prune: true
  wait: true
```

## Step 3: Build and Push Overlay as OCI Artifact (Option B - Push Pre-Built Manifests)

Alternatively, you can pre-build the Kustomize overlay and push the rendered output. This removes the need for Flux to resolve Kustomize references at reconciliation time.

```bash
# Build the Kustomize overlay into a temporary directory
mkdir -p /tmp/app-production
kustomize build manifests/overlays/production > /tmp/app-production/manifests.yaml

# Push the pre-built manifests as an OCI artifact
flux push artifact oci://registry.example.com/rendered/app-production:v1.0.0 \
  --path=/tmp/app-production \
  --source="$(git config --get remote.origin.url)" \
  --revision="main@sha1:$(git rev-parse HEAD)"
```

The Flux Kustomization for pre-built manifests is simpler since the path is the root.

```yaml
# kustomization-prebuilt.yaml -- Flux Kustomization for pre-built manifests
apiVersion: kustomize.toolkit.fluxcd.io/v1
kind: Kustomization
metadata:
  name: app-production
  namespace: flux-system
spec:
  interval: 10m
  sourceRef:
    kind: OCIRepository
    name: app-manifests-prebuilt
  path: ./
  prune: true
  wait: true
```

## Step 4: Configure OCIRepository

Create the OCIRepository resource for your chosen approach.

```yaml
# ocirepository-kustomize.yaml -- OCIRepository for Kustomize overlay artifacts
apiVersion: source.toolkit.fluxcd.io/v1beta2
kind: OCIRepository
metadata:
  name: app-manifests
  namespace: flux-system
spec:
  interval: 5m
  url: oci://registry.example.com/kustomize/app-production
  ref:
    semver: ">=1.0.0"
  secretRef:
    name: registry-auth
```

Apply the resources.

```bash
# Apply the OCIRepository and Kustomization
kubectl apply -f ocirepository-kustomize.yaml
kubectl apply -f kustomization-raw-overlay.yaml
```

## Step 5: Automate with CI

Here is a CI script that builds and pushes all overlays as separate artifacts.

```bash
#!/bin/bash
# ci-push-overlays.sh -- Push each Kustomize overlay as a separate OCI artifact

VERSION="${1:?Usage: $0 <version>}"
REGISTRY="registry.example.com/kustomize"
SOURCE_URL="$(git config --get remote.origin.url)"
REVISION="main@sha1:$(git rev-parse HEAD)"

# Loop through each overlay directory
for overlay in manifests/overlays/*/; do
  # Extract the overlay name (dev, staging, production)
  env_name=$(basename "$overlay")

  echo "Pushing overlay: $env_name (version: $VERSION)"

  # Push the entire manifests tree (base + overlays)
  flux push artifact "oci://${REGISTRY}/app-${env_name}:${VERSION}" \
    --path=./manifests \
    --source="$SOURCE_URL" \
    --revision="$REVISION"
done
```

Run the script to push all overlays.

```bash
# Push all overlays with version v1.2.0
chmod +x ci-push-overlays.sh
./ci-push-overlays.sh v1.2.0
```

## Multi-Environment Setup

For deploying different overlays to different clusters, create an OCIRepository and Kustomization pair per environment.

```yaml
# Per-environment OCIRepository and Kustomization for staging
apiVersion: source.toolkit.fluxcd.io/v1beta2
kind: OCIRepository
metadata:
  name: app-staging
  namespace: flux-system
spec:
  interval: 5m
  url: oci://registry.example.com/kustomize/app-staging
  ref:
    semver: ">=1.0.0"
  secretRef:
    name: registry-auth
---
apiVersion: kustomize.toolkit.fluxcd.io/v1
kind: Kustomization
metadata:
  name: app-staging
  namespace: flux-system
spec:
  interval: 10m
  sourceRef:
    kind: OCIRepository
    name: app-staging
  path: ./overlays/staging
  prune: true
```

## Choosing Between Raw and Pre-Built

| Aspect | Raw Overlay (Option A) | Pre-Built (Option B) |
|--------|----------------------|---------------------|
| Artifact contents | Full Kustomize tree | Rendered YAML |
| Flux processing | Builds overlay at reconciliation | Applies YAML directly |
| Debugging | Can inspect overlay structure | See exact applied manifests |
| Artifact size | Larger (includes base + all overlays) | Smaller (only rendered output) |
| Flexibility | Flux can apply post-rendering patches | What you build is what you deploy |

For most teams, Option A (raw overlay) is recommended because it preserves the Kustomize structure and allows Flux to apply additional post-rendering transformations if needed.

## Conclusion

Packaging Kustomize overlays as OCI artifacts with Flux gives you environment-specific deployment artifacts that are fast to distribute and easy to version. Whether you push raw overlays or pre-built manifests, the OCIRepository source in Flux handles both approaches cleanly. Combined with a CI pipeline that pushes artifacts on every change, you get a reliable, scalable GitOps workflow that decouples manifest building from cluster deployment.
