# Flux CD vs ArgoCD: Which Is Better for Air-Gapped Environments

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Flux CD, ArgoCD, Air-Gapped, Disconnected, GitOps, Kubernetes, Security

Description: Compare Flux CD and ArgoCD for Kubernetes deployments in air-gapped or disconnected environments, covering image mirroring, registry configuration, and offline operation.

---

## Introduction

Air-gapped Kubernetes environments—where clusters have no direct internet access—present unique challenges for GitOps tools. Both Flux CD and ArgoCD can operate in disconnected environments, but they have different dependencies and approaches to image mirroring, registry configuration, and offline operation.

The key challenge is that GitOps tools themselves need to pull their own images, access Git repositories, and poll container registries. All of these normally assume internet connectivity. In air-gapped environments, you must provide local mirrors for all external dependencies.

## Prerequisites

- An air-gapped Kubernetes cluster
- A local container registry (Harbor, Nexus, or similar)
- A local Git server (Gitea, GitLab, or Bitbucket)
- Access to pull images on a connected machine for mirroring

## Step 1: Mirror Flux CD Images to a Local Registry

Before disconnecting, pull and push all Flux CD images to your local registry:

```bash
#!/bin/bash
# mirror-flux-images.sh
LOCAL_REGISTRY="registry.internal.example.com"
FLUX_VERSION="v2.2.3"

FLUX_IMAGES=(
  "ghcr.io/fluxcd/source-controller:v1.2.4"
  "ghcr.io/fluxcd/kustomize-controller:v1.2.2"
  "ghcr.io/fluxcd/helm-controller:v0.37.4"
  "ghcr.io/fluxcd/notification-controller:v1.2.4"
  "ghcr.io/fluxcd/image-reflector-controller:v0.31.2"
  "ghcr.io/fluxcd/image-automation-controller:v0.37.1"
)

for image in "${FLUX_IMAGES[@]}"; do
  local_tag="$LOCAL_REGISTRY/${image#*/}"
  docker pull "$image"
  docker tag "$image" "$local_tag"
  docker push "$local_tag"
  echo "Mirrored: $local_tag"
done
```

## Step 2: Bootstrap Flux CD Against Local Git and Registry

```bash
# Bootstrap Flux pointing to local Gitea instance
flux bootstrap git \
  --url=https://gitea.internal.example.com/your-org/fleet-repo \
  --branch=main \
  --path=clusters/airgapped \
  --username=git \
  --password=$GITEA_PASSWORD \
  --ca-file=/path/to/internal-ca.crt

# Patch Flux components to use local registry
flux install \
  --registry=registry.internal.example.com/fluxcd \
  --image-pull-secret=internal-registry-secret \
  --export > clusters/airgapped/flux-system/gotk-components.yaml
```

## Step 3: Configure Flux Sources for Local Repositories

```yaml
# Use local Gitea instead of GitHub
apiVersion: source.toolkit.fluxcd.io/v1
kind: GitRepository
metadata:
  name: fleet-repo
  namespace: flux-system
spec:
  interval: 1m
  url: https://gitea.internal.example.com/your-org/fleet-repo
  ref:
    branch: main
  secretRef:
    name: gitea-credentials
  # Trust the internal CA
  certSecretRef:
    name: internal-ca-cert
---
# Use local Harbor registry for Helm charts
apiVersion: source.toolkit.fluxcd.io/v1
kind: HelmRepository
metadata:
  name: internal-charts
  namespace: flux-system
spec:
  interval: 10m
  url: https://harbor.internal.example.com/chartrepo/production
  secretRef:
    name: harbor-credentials
```

## Step 4: Mirror ArgoCD Images and Configure for Air-Gapped Use

```bash
# Mirror ArgoCD images
ARGOCD_VERSION="v2.10.0"
ARGOCD_IMAGES=(
  "quay.io/argoproj/argocd:$ARGOCD_VERSION"
  "redis:7.0.11-alpine"
  "ghcr.io/dex/dex:v2.38.0"
)

for image in "${ARGOCD_IMAGES[@]}"; do
  local_tag="$LOCAL_REGISTRY/${image#*/}"
  docker pull "$image"
  docker tag "$image" "$local_tag"
  docker push "$local_tag"
done
```

Configure ArgoCD to use local images:

```yaml
# Override ArgoCD images in values.yaml for Helm install
global:
  image:
    repository: registry.internal.example.com/argoproj/argocd
    tag: v2.10.0
    imagePullSecret: internal-registry-secret

redis:
  image:
    repository: registry.internal.example.com/redis
    tag: 7.0.11-alpine

dex:
  image:
    repository: registry.internal.example.com/dex/dex
    tag: v2.38.0
```

## Step 5: Configure ArgoCD to Use Local Git Repository

```bash
# Add local Git repository to ArgoCD
argocd repo add https://gitea.internal.example.com/your-org/fleet-repo \
  --username git \
  --password $GITEA_PASSWORD \
  --insecure-skip-server-verification # or use --tls-client-cert-path
```

## Comparison for Air-Gapped Environments

| Dimension | Flux CD | ArgoCD |
|---|---|---|
| External dependencies | Git + container registry | Git + container registry + ArgoCD API |
| Image count to mirror | 6 images | 4+ images (Redis, Dex, etc.) |
| Internal CA support | Yes, native via certSecretRef | Yes, via argocd-cm configmap |
| Offline Git operation | Yes, uses local Git server | Yes, uses local Git server |
| UI accessibility | N/A (no UI) | UI requires ArgoCD server connectivity |
| Registry mirroring | Supported for source types | Supported for app images |

## Best Practices

- Automate the image mirroring process with a script that reads the exact image versions from Flux or ArgoCD release notes.
- Use Harbor or Nexus as your internal registry; they support both OCI and Helm chart proxy/mirror functionality.
- Configure internal CA certificates as Kubernetes Secrets and reference them in both Flux source specs and ArgoCD repository config.
- Test the full air-gapped flow in a staging environment that simulates the network restrictions before deploying to production.
- Establish a process for regularly syncing new versions of Flux/ArgoCD images and application images from a connected bastion host.

## Conclusion

Both Flux CD and ArgoCD can operate in air-gapped environments with appropriate configuration. Flux CD has a slight operational advantage due to its smaller image footprint and no dependency on a central API server for cluster management. ArgoCD's centralized architecture means the control plane must be accessible from all managed clusters, which can be a challenge in strict air-gap scenarios. For edge or classified environments, Flux CD's distributed model is typically the preferred choice.
