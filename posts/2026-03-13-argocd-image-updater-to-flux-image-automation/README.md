# How to Migrate ArgoCD Image Updater to Flux Image Automation

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Flux CD, ArgoCD, Image Updater, Image Automation, Migration, GitOps, Container Registry

Description: Learn how to migrate from ArgoCD Image Updater to Flux CD Image Automation Controller for automated container image tag updates in GitOps workflows.

---

## Introduction

ArgoCD Image Updater automates image tag updates in ArgoCD Applications using annotations. Flux CD's Image Automation uses dedicated CRDs (ImageRepository, ImagePolicy, ImageUpdateAutomation). This guide walks through converting ArgoCD Image Updater configurations to their Flux CD equivalents.

## Prerequisites

- ArgoCD with Image Updater installed and configured
- Flux CD with image automation controllers installed
- A container registry accessible from the cluster
- A fleet repository with deployment manifests

## Step 1: Inventory ArgoCD Image Updater Configurations

```bash
# Find all Applications with image updater annotations
kubectl get applications -n argocd \
  -o jsonpath='{range .items[*]}{.metadata.name}{"\n"}{.metadata.annotations}{"\n---\n"}{end}' \
  | grep -A5 "image-updater"

# Export for reference
kubectl get applications -n argocd -o yaml > argocd-apps-with-image-updater.yaml
```

## Step 2: Map ArgoCD Image Updater Annotations to Flux CRDs

**ArgoCD Image Updater** (annotation-based):

```yaml
apiVersion: argoproj.io/v1alpha1
kind: Application
metadata:
  name: myapp
  namespace: argocd
  annotations:
    # Define images to track
    argocd-image-updater.argoproj.io/image-list: myapp=ghcr.io/your-org/myapp
    # Update strategy
    argocd-image-updater.argoproj.io/myapp.update-strategy: semver
    # Write back to Git
    argocd-image-updater.argoproj.io/write-back-method: git
    argocd-image-updater.argoproj.io/git-branch: main
    # Allowed version range
    argocd-image-updater.argoproj.io/myapp.allow-tags: regexp:^[0-9]+\.[0-9]+\.[0-9]+$
    # Registry credentials
    argocd-image-updater.argoproj.io/myapp.pull-secret: pullsecret:argocd/ghcr-credentials
```

**Flux CD equivalent** (CRD-based):

```yaml
# 1. ImageRepository: polls the container registry
apiVersion: image.toolkit.fluxcd.io/v1
kind: ImageRepository
metadata:
  name: myapp
  namespace: flux-system
spec:
  image: ghcr.io/your-org/myapp
  interval: 1m
  secretRef:
    name: ghcr-credentials  # Registry pull secret in flux-system namespace

---
# 2. ImagePolicy: which tags to track (replaces allow-tags + update-strategy)
apiVersion: image.toolkit.fluxcd.io/v1
kind: ImagePolicy
metadata:
  name: myapp
  namespace: flux-system
spec:
  imageRepositoryRef:
    name: myapp
  filterTags:
    pattern: '^[0-9]+\.[0-9]+\.[0-9]+$'   # replaces allow-tags regexp
  policy:
    semver:
      range: ">=1.0.0"                        # replaces update-strategy: semver

---
# 3. ImageUpdateAutomation: commits updated tags to Git (replaces write-back-method: git)
apiVersion: image.toolkit.fluxcd.io/v1
kind: ImageUpdateAutomation
metadata:
  name: fleet
  namespace: flux-system
spec:
  interval: 5m
  sourceRef:
    kind: GitRepository
    name: fleet-repo
  git:
    checkout:
      ref:
        branch: main
    commit:
      author:
        email: fluxbot@your-org.com
        name: Flux Image Bot
      messageTemplate: "chore(image): update {{range .Updated.Images}}{{.}}{{end}}"
    push:
      branch: main
  update:
    path: ./apps
    strategy: Setters
```

## Step 3: Add Image Policy Annotations to Deployment YAML

This is the key step: annotate the image field in your deployment with the policy reference:

```yaml
# apps/myapp/deployment.yaml
spec:
  containers:
    - name: myapp
      # The comment tells Flux Image Automation which policy governs this field
      image: ghcr.io/your-org/myapp:1.0.0 # {"$imagepolicy": "flux-system:myapp"}
```

For Kustomize `kustomization.yaml` images field:

```yaml
# apps/myapp/kustomization.yaml
images:
  - name: ghcr.io/your-org/myapp
    newTag: "1.0.0" # {"$imagepolicy": "flux-system:myapp:tag"}
```

## Step 4: Migrate Registry Credentials

```bash
# ArgoCD Image Updater used a secret in argocd namespace
# Flux needs it in flux-system namespace

# Copy the credentials to flux-system
kubectl get secret ghcr-credentials -n argocd -o yaml | \
  sed 's/namespace: argocd/namespace: flux-system/' | \
  kubectl apply -f -
```

Or create a new secret:

```bash
kubectl create secret docker-registry ghcr-credentials \
  --docker-server=ghcr.io \
  --docker-username=your-username \
  --docker-password=your-pat \
  --namespace=flux-system
```

## Step 5: Verify Image Automation is Working

```bash
# Check ImageRepository is scanning successfully
flux get images repository myapp -n flux-system

# Check ImagePolicy is resolving the latest tag
flux get images policy myapp -n flux-system

# Check ImageUpdateAutomation status
flux get images update fleet -n flux-system

# Watch for Flux Bot commits in your fleet repository
git log --oneline -10 origin/main
```

## Step 6: Disable ArgoCD Image Updater for Migrated Applications

```bash
# Remove image updater annotations from ArgoCD Application
kubectl annotate application myapp -n argocd \
  argocd-image-updater.argoproj.io/image-list- \
  argocd-image-updater.argoproj.io/myapp.update-strategy- \
  argocd-image-updater.argoproj.io/write-back-method- \
  --overwrite

# After full Flux migration, uninstall ArgoCD Image Updater
helm uninstall argocd-image-updater -n argocd
```

## Best Practices

- Migrate one image at a time; verify each ImagePolicy is resolving the expected tag before moving to the next.
- During the parallel operation period, ensure only one tool (Image Updater or Flux Image Automation) is writing to the fleet repository for any given image to avoid commit conflicts.
- Test the SemVer range on the ImagePolicy against your actual image tags before enabling ImageUpdateAutomation.
- Set `filterTags.pattern` to exclude development tags (PR tags, branch tags) from production policies.
- Monitor the ImageUpdateAutomation object's `status.lastAutomationRunTime` to confirm it is running on schedule.

## Conclusion

Migrating from ArgoCD Image Updater to Flux Image Automation requires converting annotation-based configuration to dedicated CRDs and adding policy annotation comments to deployment manifests. The Flux approach is more explicit and provides better separation of concerns between registry polling (ImageRepository), version selection (ImagePolicy), and Git commit automation (ImageUpdateAutomation). The migration is safe to do incrementally, one image policy at a time.
