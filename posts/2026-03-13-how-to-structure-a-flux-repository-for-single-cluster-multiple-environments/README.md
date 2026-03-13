# How to Structure a Flux Repository for Single Cluster Multiple Environments

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Flux, Kubernetes, GitOps, Repository Structure, Kustomize, Environment

Description: Learn how to organize a Flux repository to manage multiple environments like staging and production on a single Kubernetes cluster.

---

Running multiple environments on a single Kubernetes cluster is a common pattern, especially for smaller teams that want to maintain staging and production workloads without the overhead of separate clusters. Flux combined with Kustomize overlays makes this manageable by sharing a common base configuration while allowing environment-specific customizations.

This guide explains how to structure your Flux repository for this pattern.

## When to Use This Pattern

This pattern is appropriate when you have:

- One Kubernetes cluster shared across environments
- Namespaces used to separate environments (for example, `staging` and `production`)
- Most configuration is the same across environments with small differences like replica counts, resource limits, or image tags
- You want to promote changes from staging to production through Git

## Recommended Directory Structure

```text
fleet-repo/
  clusters/
    my-cluster/
      flux-system/
      infrastructure.yaml
      apps-staging.yaml
      apps-production.yaml
  infrastructure/
    sources/
      kustomization.yaml
    controllers/
      kustomization.yaml
    kustomization.yaml
  apps/
    base/
      app-one/
        deployment.yaml
        service.yaml
        kustomization.yaml
      app-two/
        deployment.yaml
        service.yaml
        kustomization.yaml
      kustomization.yaml
    staging/
      kustomization.yaml
      patches/
    production/
      kustomization.yaml
      patches/
```

## Cluster Entry Points

Define separate Kustomization resources for each environment:

```yaml
# clusters/my-cluster/apps-staging.yaml
apiVersion: kustomize.toolkit.fluxcd.io/v1
kind: Kustomization
metadata:
  name: apps-staging
  namespace: flux-system
spec:
  interval: 5m
  path: ./apps/staging
  prune: true
  sourceRef:
    kind: GitRepository
    name: flux-system
  dependsOn:
    - name: infrastructure
```

```yaml
# clusters/my-cluster/apps-production.yaml
apiVersion: kustomize.toolkit.fluxcd.io/v1
kind: Kustomization
metadata:
  name: apps-production
  namespace: flux-system
spec:
  interval: 10m
  path: ./apps/production
  prune: true
  sourceRef:
    kind: GitRepository
    name: flux-system
  dependsOn:
    - name: infrastructure
```

Notice the different reconciliation intervals. Staging uses a shorter interval for faster feedback during development.

## Base Configuration

The base directory contains the shared configuration common to all environments:

```yaml
# apps/base/app-one/deployment.yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: app-one
spec:
  replicas: 1
  selector:
    matchLabels:
      app: app-one
  template:
    metadata:
      labels:
        app: app-one
    spec:
      containers:
        - name: app-one
          image: app-one:latest
          ports:
            - containerPort: 8080
          resources:
            requests:
              cpu: 100m
              memory: 128Mi
            limits:
              cpu: 200m
              memory: 256Mi
```

```yaml
# apps/base/app-one/kustomization.yaml
apiVersion: kustomize.config.k8s.io/v1beta1
kind: Kustomization
resources:
  - deployment.yaml
  - service.yaml
```

## Staging Overlay

The staging overlay customizes the base for the staging environment:

```yaml
# apps/staging/kustomization.yaml
apiVersion: kustomize.config.k8s.io/v1beta1
kind: Kustomization
namespace: staging
resources:
  - ../base
patches:
  - path: patches/replicas.yaml
    target:
      kind: Deployment
images:
  - name: app-one
    newTag: staging-latest
  - name: app-two
    newTag: staging-latest
```

```yaml
# apps/staging/patches/replicas.yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: not-important
spec:
  replicas: 1
```

The `namespace` field in the kustomization automatically places all resources into the `staging` namespace.

## Production Overlay

The production overlay applies production-specific settings:

```yaml
# apps/production/kustomization.yaml
apiVersion: kustomize.config.k8s.io/v1beta1
kind: Kustomization
namespace: production
resources:
  - ../base
patches:
  - path: patches/replicas.yaml
    target:
      kind: Deployment
  - path: patches/resources.yaml
    target:
      kind: Deployment
images:
  - name: app-one
    newTag: "1.2.3"
  - name: app-two
    newTag: "2.0.1"
```

```yaml
# apps/production/patches/replicas.yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: not-important
spec:
  replicas: 3
```

```yaml
# apps/production/patches/resources.yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: not-important
spec:
  template:
    spec:
      containers:
        - name: "*"
          resources:
            requests:
              cpu: 500m
              memory: 512Mi
            limits:
              cpu: "1"
              memory: 1Gi
```

## Namespace Setup

Create namespaces as part of your infrastructure:

```yaml
# infrastructure/namespaces/namespaces.yaml
apiVersion: v1
kind: Namespace
metadata:
  name: staging
  labels:
    environment: staging
---
apiVersion: v1
kind: Namespace
metadata:
  name: production
  labels:
    environment: production
```

## Promotion Workflow

To promote a change from staging to production:

1. Update the image tag in the staging overlay
2. Verify the deployment works in staging
3. Update the image tag in the production overlay
4. Commit and push

This can be automated using Flux image automation or a CI pipeline that updates the manifests.

## Environment-Specific Secrets

Use Flux variable substitution to inject environment-specific values:

```yaml
# clusters/my-cluster/apps-production.yaml
apiVersion: kustomize.toolkit.fluxcd.io/v1
kind: Kustomization
metadata:
  name: apps-production
  namespace: flux-system
spec:
  interval: 10m
  path: ./apps/production
  prune: true
  sourceRef:
    kind: GitRepository
    name: flux-system
  postBuild:
    substituteFrom:
      - kind: ConfigMap
        name: production-vars
      - kind: Secret
        name: production-secrets
```

## Testing Overlays Locally

Verify each overlay produces the expected output:

```bash
# Build and inspect staging
kustomize build apps/staging | grep -A 5 "replicas:"

# Build and inspect production
kustomize build apps/production | grep -A 5 "replicas:"
```

## Conclusion

Running multiple environments on a single cluster with Flux requires a well-organized repository structure that maximizes shared configuration while allowing environment-specific customizations. The base-and-overlay pattern with Kustomize keeps your manifests DRY and makes it clear what differs between environments. Combined with namespace isolation and separate Flux Kustomization resources for each environment, this approach provides a clean and scalable way to manage multi-environment deployments.
