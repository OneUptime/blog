# How to Structure a Flux Repository for Single Cluster Single Environment

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Flux, Kubernetes, GitOps, Repository Structure, Best Practices

Description: Learn how to organize your Flux GitOps repository for a single Kubernetes cluster running a single environment.

---

Starting with a single cluster and a single environment is the most common entry point for teams adopting Flux and GitOps. Getting the repository structure right from the beginning makes it easier to scale later when you add more clusters or environments.

This guide presents a clean, maintainable repository structure for a single cluster running one environment.

## When to Use This Pattern

This pattern works well when you have:

- One Kubernetes cluster for all workloads
- No separation between staging and production (or you are running only production)
- A small to medium number of applications
- A team getting started with GitOps

## Recommended Directory Structure

```text
fleet-repo/
  clusters/
    my-cluster/
      flux-system/
        gotk-components.yaml
        gotk-sync.yaml
        kustomization.yaml
      infrastructure.yaml
      apps.yaml
  infrastructure/
    sources/
      helmrepositories.yaml
      kustomization.yaml
    controllers/
      cert-manager/
        helmrelease.yaml
        kustomization.yaml
      ingress-nginx/
        helmrelease.yaml
        kustomization.yaml
      kustomization.yaml
    kustomization.yaml
  apps/
    app-one/
      deployment.yaml
      service.yaml
      ingress.yaml
      kustomization.yaml
    app-two/
      deployment.yaml
      service.yaml
      kustomization.yaml
    kustomization.yaml
```

## The clusters Directory

The `clusters` directory contains the entry point for each cluster. For a single cluster setup, there is one subdirectory:

```yaml
# clusters/my-cluster/infrastructure.yaml
apiVersion: kustomize.toolkit.fluxcd.io/v1
kind: Kustomization
metadata:
  name: infrastructure
  namespace: flux-system
spec:
  interval: 10m
  path: ./infrastructure
  prune: true
  sourceRef:
    kind: GitRepository
    name: flux-system
  wait: true
```

```yaml
# clusters/my-cluster/apps.yaml
apiVersion: kustomize.toolkit.fluxcd.io/v1
kind: Kustomization
metadata:
  name: apps
  namespace: flux-system
spec:
  interval: 10m
  path: ./apps
  prune: true
  sourceRef:
    kind: GitRepository
    name: flux-system
  dependsOn:
    - name: infrastructure
```

The `dependsOn` ensures infrastructure is ready before applications are deployed.

## The infrastructure Directory

Infrastructure contains shared services that applications depend on. Things like ingress controllers, certificate managers, and monitoring tools belong here.

```yaml
# infrastructure/sources/helmrepositories.yaml
apiVersion: source.toolkit.fluxcd.io/v1
kind: HelmRepository
metadata:
  name: jetstack
  namespace: flux-system
spec:
  interval: 24h
  url: https://charts.jetstack.io
---
apiVersion: source.toolkit.fluxcd.io/v1
kind: HelmRepository
metadata:
  name: ingress-nginx
  namespace: flux-system
spec:
  interval: 24h
  url: https://kubernetes.github.io/ingress-nginx
```

```yaml
# infrastructure/controllers/cert-manager/helmrelease.yaml
apiVersion: helm.toolkit.fluxcd.io/v2
kind: HelmRelease
metadata:
  name: cert-manager
  namespace: cert-manager
spec:
  interval: 30m
  chart:
    spec:
      chart: cert-manager
      version: "1.14.x"
      sourceRef:
        kind: HelmRepository
        name: jetstack
        namespace: flux-system
  values:
    installCRDs: true
```

The infrastructure kustomization.yaml ties it together:

```yaml
# infrastructure/kustomization.yaml
apiVersion: kustomize.config.k8s.io/v1beta1
kind: Kustomization
resources:
  - sources
  - controllers
```

## The apps Directory

Applications go in the `apps` directory, each in its own subdirectory:

```yaml
# apps/app-one/deployment.yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: app-one
  namespace: default
spec:
  replicas: 2
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
          image: app-one:1.0.0
          ports:
            - containerPort: 8080
```

```yaml
# apps/app-one/kustomization.yaml
apiVersion: kustomize.config.k8s.io/v1beta1
kind: Kustomization
resources:
  - deployment.yaml
  - service.yaml
  - ingress.yaml
```

The top-level apps kustomization:

```yaml
# apps/kustomization.yaml
apiVersion: kustomize.config.k8s.io/v1beta1
kind: Kustomization
resources:
  - app-one
  - app-two
```

## Bootstrapping Flux

Bootstrap Flux into your cluster using:

```bash
flux bootstrap github \
  --owner=your-org \
  --repository=fleet-repo \
  --branch=main \
  --path=./clusters/my-cluster \
  --personal
```

This creates the `flux-system` directory inside `clusters/my-cluster/` with the Flux components and a sync configuration.

## Adding a New Application

To add a new application:

1. Create a new directory under `apps/`:

```bash
mkdir apps/app-three
```

2. Add your manifests:

```yaml
# apps/app-three/deployment.yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: app-three
  namespace: default
spec:
  replicas: 1
  selector:
    matchLabels:
      app: app-three
  template:
    metadata:
      labels:
        app: app-three
    spec:
      containers:
        - name: app-three
          image: app-three:1.0.0
```

3. Create the kustomization and add it to the parent:

```yaml
# apps/app-three/kustomization.yaml
apiVersion: kustomize.config.k8s.io/v1beta1
kind: Kustomization
resources:
  - deployment.yaml
```

4. Update `apps/kustomization.yaml` to include the new directory:

```yaml
apiVersion: kustomize.config.k8s.io/v1beta1
kind: Kustomization
resources:
  - app-one
  - app-two
  - app-three
```

5. Commit and push. Flux will detect the change and deploy the new application.

## Scaling Beyond Single Environment

When you eventually need multiple environments, this structure scales naturally. You can add environment-specific overlays without restructuring the entire repository. The `apps/` directory becomes a base, and you create overlays for each environment.

## Conclusion

A single cluster, single environment setup with Flux benefits from a clear separation between infrastructure and applications. The directory structure presented here is straightforward to understand and maintain while providing a solid foundation for growth. As your needs evolve, this structure can be extended to support multiple environments and clusters without starting over.
