# Flux CD vs ArgoCD: Which Is Easier to Install

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Flux CD, ArgoCD, Installation, GitOps, Kubernetes, Getting Started, Comparison

Description: Compare the installation complexity of Flux CD and ArgoCD, including prerequisites, bootstrap process, resource requirements, and Day 2 upgrade paths.

---

## Introduction

The initial installation experience shapes how quickly teams can adopt a GitOps tool and how confident they are in managing it long-term. Flux CD and ArgoCD both have mature installation stories, but they differ in approach: Flux CD bootstraps itself into Git and uses Kustomize to manage its own components, while ArgoCD provides a single install YAML and an optional Helm chart with a feature-rich UI from day one.

This comparison examines the installation process for both tools across several dimensions: prerequisites, initial setup complexity, resource requirements, and Day 2 upgrade paths.

## Prerequisites

- A Kubernetes cluster (1.26+)
- kubectl configured with cluster admin access
- Flux CD: GitHub/GitLab/Gitea account and repository, flux CLI
- ArgoCD: No external dependencies required for basic installation

## Step 1: Installing Flux CD

Flux CD uses a bootstrap process that installs controllers and stores configuration in Git:

```bash
# Install the Flux CLI
curl -s https://fluxcd.io/install.sh | sudo bash

# Verify prerequisites
flux check --pre

# Bootstrap with GitHub
export GITHUB_TOKEN=ghp_your_token
flux bootstrap github \
  --owner=your-org \
  --repository=fleet-repo \
  --branch=main \
  --path=clusters/production \
  --personal

# Verify installation
flux check
kubectl get pods -n flux-system
```

The bootstrap stores all Flux component manifests in Git at `clusters/production/flux-system/`, meaning Flux manages its own configuration through GitOps from day one.

## Step 2: Installing ArgoCD

ArgoCD can be installed with a single manifest apply:

```bash
# Create namespace and install
kubectl create namespace argocd
kubectl apply -n argocd -f \
  https://raw.githubusercontent.com/argoproj/argo-cd/stable/manifests/install.yaml

# Wait for pods
kubectl wait --for=condition=available deployment -l "app.kubernetes.io/name=argocd-server" \
  -n argocd --timeout=120s

# Port-forward the UI
kubectl port-forward svc/argocd-server -n argocd 8080:443

# Get initial admin password
argocd admin initial-password -n argocd
```

Alternatively with Helm:

```bash
helm repo add argo https://argoproj.github.io/argo-helm
helm install argocd argo/argo-cd \
  --namespace argocd \
  --create-namespace
```

## Step 3: Resource Requirements Comparison

| Component | Flux CD | ArgoCD |
|---|---|---|
| Default pods | 6 controllers | 7 components |
| Idle memory | ~150 MB | ~300 MB |
| Idle CPU | ~100m | ~200m |
| External dependencies | Git repository | None required |

Flux CD is modular; you can install only what you need:

```bash
# Minimal Flux (no image automation)
flux install \
  --components=source-controller,kustomize-controller,helm-controller,notification-controller
```

## Step 4: Day 2 Upgrades

**Flux CD** upgrades itself via Git:

```bash
# Export new component manifests and commit to Git
flux install --export > clusters/production/flux-system/gotk-components.yaml
git add clusters/production/flux-system/gotk-components.yaml
git commit -m "chore: upgrade Flux to latest"
git push
# Flux reconciles and upgrades itself automatically
```

**ArgoCD** upgrades via kubectl or Helm:

```bash
# Via manifest
kubectl apply -n argocd -f \
  https://raw.githubusercontent.com/argoproj/argo-cd/v2.10.0/manifests/install.yaml

# Via Helm
helm upgrade argocd argo/argo-cd \
  --namespace argocd --version 7.0.0
```

## Step 5: High Availability Setup

**Flux CD HA** uses replicated controllers via Kustomize patches in the fleet repository.

**ArgoCD HA** has a dedicated HA manifest:

```bash
kubectl apply -n argocd -f \
  https://raw.githubusercontent.com/argoproj/argo-cd/stable/manifests/ha/install.yaml
```

ArgoCD's HA setup requires Redis Sentinel and is more operationally complex, while Flux CD controllers are stateless and easier to scale.

## Best Practices

- Use Flux CD when you want the installation managed as code in Git from day one.
- Use ArgoCD when you need a visual dashboard immediately for team onboarding.
- For both tools, pin versions explicitly in production to avoid unintended upgrades.
- Test upgrades in staging before production, regardless of the tool.
- Document the exact installation flags so the setup is reproducible.

## Conclusion

Flux CD requires more initial understanding of the bootstrap concept but rewards teams with a fully GitOps-managed installation. ArgoCD is faster to install and provides immediate UI value, making it more accessible for teams exploring GitOps. For experienced platform teams, Flux CD's self-managing approach is more elegant; for teams that value visual tooling and rapid onboarding, ArgoCD has the edge.
