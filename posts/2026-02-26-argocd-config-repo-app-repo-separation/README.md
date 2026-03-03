# How to Handle Config Repo vs Application Repo Separation

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: ArgoCD, GitOps, Kubernetes, Repository Management, CI/CD

Description: Learn how to properly separate configuration repositories from application source code repositories when using ArgoCD for GitOps-based Kubernetes deployments.

---

A common question when adopting ArgoCD is whether to keep Kubernetes manifests alongside application source code or in a separate repository. The short answer is: separate them. The longer answer is that there are good reasons for this, practical patterns for doing it, and some edge cases where co-locating makes sense.

This guide explains the separation pattern, how to implement it, and how to wire your CI/CD pipeline to bridge the two repos.

## Why Separate Config from Application Code

When you commit application code and Kubernetes manifests to the same repository, every code commit triggers ArgoCD reconciliation even when nothing about the deployment changed. This creates unnecessary sync cycles and makes it harder to understand what actually changed in production.

Separation gives you several benefits:

**Independent lifecycles.** Application code and deployment configuration change at different rates and for different reasons. A code change might add a feature. A config change might adjust resource limits or add an environment variable.

**Cleaner audit trails.** When you look at the config repo history, every commit represents an intentional deployment change. No noise from application code changes.

**Faster ArgoCD reconciliation.** ArgoCD only clones the config repo. A large application repo with thousands of source files and test fixtures slows down the clone and increases memory usage on the repo server.

**Different access controls.** Developers can push code without having the ability to change production resource limits or replica counts.

## The Two-Repo Pattern

Here is the standard setup:

```text
# Repo 1: Application Source Code
myorg/backend-api
  src/
  tests/
  Dockerfile
  .github/workflows/build.yaml

# Repo 2: Deployment Configuration
myorg/backend-api-config
  base/
    deployment.yaml
    service.yaml
    configmap.yaml
    kustomization.yaml
  overlays/
    dev/
      kustomization.yaml
    staging/
      kustomization.yaml
    production/
      kustomization.yaml
```

ArgoCD watches only the config repo:

```yaml
apiVersion: argoproj.io/v1alpha1
kind: Application
metadata:
  name: backend-api-production
  namespace: argocd
spec:
  project: default
  source:
    repoURL: https://github.com/myorg/backend-api-config.git
    targetRevision: main
    path: overlays/production
  destination:
    server: https://kubernetes.default.svc
    namespace: backend-api
  syncPolicy:
    automated:
      prune: true
      selfHeal: true
```

## Bridging the Gap with CI/CD

The key question becomes: how does a new container image built from the application repo make it into the config repo? The answer is your CI/CD pipeline.

Here is a GitHub Actions workflow in the application repo that updates the config repo after a successful build:

```yaml
# In myorg/backend-api/.github/workflows/build.yaml
name: Build and Update Config
on:
  push:
    branches: [main]

jobs:
  build:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4

      - name: Build and push Docker image
        run: |
          docker build -t myorg/backend-api:${{ github.sha }} .
          docker push myorg/backend-api:${{ github.sha }}

      - name: Update config repo with new image tag
        run: |
          # Clone the config repo
          git clone https://x-access-token:${{ secrets.CONFIG_REPO_TOKEN }}@github.com/myorg/backend-api-config.git
          cd backend-api-config

          # Update the image tag in the dev overlay
          cd overlays/dev
          kustomize edit set image myorg/backend-api=myorg/backend-api:${{ github.sha }}

          # Commit and push
          git config user.name "CI Bot"
          git config user.email "ci@myorg.com"
          git add .
          git commit -m "Update backend-api image to ${{ github.sha }}"
          git push
```

This flow looks like:

```mermaid
graph LR
    A[Developer pushes code] --> B[CI builds image]
    B --> C[CI pushes to registry]
    C --> D[CI updates config repo]
    D --> E[ArgoCD detects change]
    E --> F[ArgoCD syncs to cluster]
```

## Using ArgoCD Image Updater Instead

An alternative to the CI-driven approach is ArgoCD Image Updater, which watches container registries and automatically updates image tags:

```yaml
apiVersion: argoproj.io/v1alpha1
kind: Application
metadata:
  name: backend-api-dev
  namespace: argocd
  annotations:
    # Tell Image Updater to watch this image
    argocd-image-updater.argoproj.io/image-list: backend=myorg/backend-api
    argocd-image-updater.argoproj.io/backend.update-strategy: latest
    argocd-image-updater.argoproj.io/write-back-method: git
    argocd-image-updater.argoproj.io/git-branch: main
spec:
  project: default
  source:
    repoURL: https://github.com/myorg/backend-api-config.git
    targetRevision: main
    path: overlays/dev
  destination:
    server: https://kubernetes.default.svc
    namespace: backend-api-dev
```

This removes the need for your CI pipeline to know about the config repo at all. The CI pipeline just builds and pushes the image, and Image Updater handles the rest.

## Shared Config Repository

For smaller teams, you might prefer a single config repo for all applications rather than one per app:

```text
myorg/platform-config
  apps/
    backend-api/
      base/
      overlays/
    frontend/
      base/
      overlays/
    worker/
      base/
      overlays/
  infrastructure/
    cert-manager/
    ingress-nginx/
```

This still separates config from application code, but consolidates all deployment configuration in one place. It works well when you have a small platform team managing deployments.

## When Co-locating Makes Sense

There are cases where keeping manifests in the application repo is acceptable:

**Single-developer projects.** If you are the only person working on a project, the overhead of a separate repo adds friction without much benefit.

**Tightly coupled config.** If your deployment manifests are generated from application code (like auto-generated Dockerfiles or Helm charts generated by a framework), keeping them together avoids synchronization issues.

**Rapid prototyping.** During early development, you may want to iterate quickly on both code and deployment config. You can always split later.

For these cases, point ArgoCD at a subdirectory within the application repo:

```yaml
apiVersion: argoproj.io/v1alpha1
kind: Application
metadata:
  name: my-prototype
  namespace: argocd
spec:
  source:
    repoURL: https://github.com/myorg/my-app.git
    targetRevision: main
    path: deploy/overlays/dev    # Only watch this subdirectory
  destination:
    server: https://kubernetes.default.svc
    namespace: my-prototype
```

## Handling Multiple Sources

ArgoCD supports multiple sources, which lets you pull the Helm chart from one repo and values from another:

```yaml
apiVersion: argoproj.io/v1alpha1
kind: Application
metadata:
  name: backend-api-staging
  namespace: argocd
spec:
  project: default
  sources:
    - repoURL: https://github.com/myorg/helm-charts.git
      targetRevision: main
      path: charts/backend-api
      helm:
        valueFiles:
          - $values/overlays/staging/values.yaml
    - repoURL: https://github.com/myorg/backend-api-config.git
      targetRevision: main
      ref: values
  destination:
    server: https://kubernetes.default.svc
    namespace: backend-api-staging
```

This pattern lets you maintain reusable Helm charts in one repo and environment-specific values in another.

## Security Considerations

When separating repos, keep these security practices in mind:

- Use separate credentials for the config repo with minimal permissions
- Enable branch protection on the config repo's main branch
- Require pull request reviews for production overlay changes
- Use CODEOWNERS to enforce approval requirements per directory
- Never store secrets in the config repo - use External Secrets Operator or Sealed Secrets

## Summary

Separating your configuration repository from your application source code is a best practice that pays dividends as your team and deployment footprint grow. It gives you cleaner audit trails, faster ArgoCD performance, and better access control. Bridge the gap with CI/CD pipelines or ArgoCD Image Updater, and you get a robust GitOps workflow that scales with your organization.
