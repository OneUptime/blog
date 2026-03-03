# How to Structure Your Git Repository for ArgoCD

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: ArgoCD, GitOps, Kubernetes, Repository Structure, DevOps

Description: Learn how to structure your Git repository for ArgoCD deployments, including directory layouts, environment separation, and best practices for maintainable GitOps workflows.

---

Getting your Git repository structure right is one of the most important decisions you will make when adopting ArgoCD. A poorly organized repo leads to deployment confusion, merge conflicts, and maintenance nightmares. A well-structured repo makes deployments predictable and teams productive.

This guide walks you through practical repository structures that work well with ArgoCD in production environments.

## Why Repository Structure Matters

ArgoCD reads manifests from Git and applies them to your Kubernetes clusters. The way you organize those manifests directly impacts:

- How easy it is to promote changes across environments
- How multiple teams collaborate without stepping on each other
- How ArgoCD ApplicationSets can auto-discover and manage applications
- How quickly new engineers onboard and understand the deployment landscape

A flat dump of YAML files might work for a single application, but it falls apart the moment you add a second environment or a second team.

## The Basic Layout

For a single application deployed to multiple environments, start with this structure:

```text
my-app/
  base/
    deployment.yaml
    service.yaml
    kustomization.yaml
  overlays/
    dev/
      kustomization.yaml
      patches/
        resource-limits.yaml
    staging/
      kustomization.yaml
      patches/
        resource-limits.yaml
        replicas.yaml
    production/
      kustomization.yaml
      patches/
        resource-limits.yaml
        replicas.yaml
        hpa.yaml
```

Each ArgoCD Application points to the appropriate overlay directory:

```yaml
apiVersion: argoproj.io/v1alpha1
kind: Application
metadata:
  name: my-app-dev
  namespace: argocd
spec:
  project: default
  source:
    repoURL: https://github.com/myorg/my-app.git
    targetRevision: main
    path: overlays/dev
  destination:
    server: https://kubernetes.default.svc
    namespace: my-app-dev
```

## Multi-Application Repository Structure

When you manage multiple applications from a single repo, add a top-level directory per application:

```text
apps/
  frontend/
    base/
      deployment.yaml
      service.yaml
      ingress.yaml
      kustomization.yaml
    overlays/
      dev/
        kustomization.yaml
      staging/
        kustomization.yaml
      production/
        kustomization.yaml
  backend-api/
    base/
      deployment.yaml
      service.yaml
      kustomization.yaml
    overlays/
      dev/
        kustomization.yaml
      staging/
        kustomization.yaml
      production/
        kustomization.yaml
  worker/
    base/
      deployment.yaml
      service.yaml
      kustomization.yaml
    overlays/
      dev/
        kustomization.yaml
      staging/
        kustomization.yaml
      production/
        kustomization.yaml
```

This works well with the ArgoCD Git directory generator in ApplicationSets:

```yaml
apiVersion: argoproj.io/v1alpha1
kind: ApplicationSet
metadata:
  name: all-apps-dev
  namespace: argocd
spec:
  generators:
    - git:
        repoURL: https://github.com/myorg/platform.git
        revision: main
        directories:
          - path: apps/*/overlays/dev
  template:
    metadata:
      # Extract app name from path
      name: '{{path[1]}}-dev'
    spec:
      project: default
      source:
        repoURL: https://github.com/myorg/platform.git
        targetRevision: main
        path: '{{path}}'
      destination:
        server: https://kubernetes.default.svc
        namespace: '{{path[1]}}-dev'
```

## Helm-Based Repository Structure

If you prefer Helm over Kustomize, organize your repo like this:

```text
apps/
  frontend/
    Chart.yaml
    values.yaml
    values-dev.yaml
    values-staging.yaml
    values-production.yaml
    templates/
      deployment.yaml
      service.yaml
      ingress.yaml
```

The ArgoCD Application references the specific values file for each environment:

```yaml
apiVersion: argoproj.io/v1alpha1
kind: Application
metadata:
  name: frontend-staging
  namespace: argocd
spec:
  project: default
  source:
    repoURL: https://github.com/myorg/platform.git
    targetRevision: main
    path: apps/frontend
    helm:
      valueFiles:
        - values.yaml
        - values-staging.yaml
  destination:
    server: https://kubernetes.default.svc
    namespace: frontend-staging
```

## Infrastructure and Platform Components

Separate your platform infrastructure from application workloads:

```text
platform/
  argocd/
    base/
      ...
    overlays/
      production/
        ...
  cert-manager/
    base/
      ...
    overlays/
      production/
        ...
  ingress-nginx/
    base/
      ...
    overlays/
      production/
        ...
  monitoring/
    base/
      ...
    overlays/
      production/
        ...
apps/
  frontend/
    ...
  backend-api/
    ...
```

This separation lets you give different teams different access levels. The platform team manages `platform/`, while application teams manage their directories under `apps/`.

## The App-of-Apps Bootstrap

At the root of your repo, create an app-of-apps pattern for bootstrapping:

```text
bootstrap/
  dev-cluster/
    applications.yaml     # ArgoCD Application resources for dev
  staging-cluster/
    applications.yaml     # ArgoCD Application resources for staging
  production-cluster/
    applications.yaml     # ArgoCD Application resources for production
```

The bootstrap Application manages all other Applications:

```yaml
apiVersion: argoproj.io/v1alpha1
kind: Application
metadata:
  name: bootstrap-dev
  namespace: argocd
spec:
  project: default
  source:
    repoURL: https://github.com/myorg/platform.git
    targetRevision: main
    path: bootstrap/dev-cluster
  destination:
    server: https://kubernetes.default.svc
    namespace: argocd
  syncPolicy:
    automated:
      prune: true
      selfHeal: true
```

## Common Shared Resources

Put shared resources like ConfigMaps, RBAC rules, and network policies in a common directory:

```text
common/
  namespaces/
    dev-namespaces.yaml
    staging-namespaces.yaml
    production-namespaces.yaml
  network-policies/
    default-deny.yaml
  rbac/
    developer-role.yaml
    viewer-role.yaml
```

## Directory Naming Conventions

Stick to consistent naming conventions:

- Use lowercase with hyphens for directory names: `backend-api`, not `BackendApi`
- Use the same environment names everywhere: `dev`, `staging`, `production`
- Keep file names descriptive: `deployment.yaml`, not `dep.yaml`
- Group related patches in a `patches/` subdirectory

## What to Avoid

Several patterns cause problems at scale:

**Avoid deeply nested directories.** Three to four levels deep is the practical maximum. Deeper nesting makes paths unwieldy and hard to reference in ArgoCD Applications.

**Avoid environment-specific branches.** Using `dev`, `staging`, and `production` branches instead of directory-based separation makes promotion workflows brittle and merge conflicts constant.

**Avoid mixing application code with manifests.** Keep your deployment manifests in a separate repository or at minimum a separate directory tree from your application source code.

**Avoid putting secrets in Git.** Use Sealed Secrets, External Secrets Operator, or a similar tool instead.

## A Practical Verification Step

After setting up your structure, verify ArgoCD can render manifests from each path:

```bash
# For Kustomize-based apps
kustomize build apps/frontend/overlays/dev

# For Helm-based apps
helm template frontend apps/frontend -f apps/frontend/values-dev.yaml

# Verify ArgoCD can see the app
argocd app create test-frontend \
  --repo https://github.com/myorg/platform.git \
  --path apps/frontend/overlays/dev \
  --dest-server https://kubernetes.default.svc \
  --dest-namespace test \
  --dry-run
```

## Summary

A well-structured Git repository is the foundation of a successful ArgoCD deployment. Use directory-based environment separation, keep infrastructure and applications separate, follow consistent naming, and leverage ApplicationSets for auto-discovery. The time you invest in getting the structure right pays off every time you deploy, onboard a new team member, or scale to more applications.

For monitoring your ArgoCD deployments and Kubernetes cluster health, consider integrating with [OneUptime](https://oneuptime.com/blog/post/2026-02-26-argocd-send-metrics-oneuptime/view) for end-to-end observability.
