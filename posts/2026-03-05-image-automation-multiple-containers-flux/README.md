# How to Configure Image Automation for Multiple Container Images in Flux

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Flux CD, GitOps, Kubernetes, Image Automation, Multi-Container, Deployments

Description: Learn how to set up Flux image automation for pods that run multiple container images, including init containers and sidecars.

---

## Introduction

Many Kubernetes workloads run more than one container per pod. A typical example is an application container with a sidecar proxy, or a main container with init containers. Each container may have its own image that needs independent automated updates. This guide shows how to configure Flux image automation for pods with multiple container images.

## Prerequisites

- A Kubernetes cluster with Flux installed
- The image-reflector-controller and image-automation-controller deployed
- Familiarity with ImageRepository, ImagePolicy, and ImageUpdateAutomation resources

## Step 1: Create ImageRepository Resources for Each Image

Every container image that you want to automate needs its own ImageRepository.

```yaml
# image-repositories.yaml
# One ImageRepository per container image to scan
apiVersion: image.toolkit.fluxcd.io/v1
kind: ImageRepository
metadata:
  name: my-app
  namespace: flux-system
spec:
  image: ghcr.io/my-org/my-app
  interval: 5m
---
apiVersion: image.toolkit.fluxcd.io/v1
kind: ImageRepository
metadata:
  name: envoy-proxy
  namespace: flux-system
spec:
  image: docker.io/envoyproxy/envoy
  interval: 30m
---
apiVersion: image.toolkit.fluxcd.io/v1
kind: ImageRepository
metadata:
  name: db-migrator
  namespace: flux-system
spec:
  image: ghcr.io/my-org/db-migrator
  interval: 5m
```

## Step 2: Create ImagePolicy Resources for Each Image

Each image needs its own ImagePolicy to select the appropriate tag.

```yaml
# image-policies.yaml
# Separate policies allow different tag selection strategies per image
apiVersion: image.toolkit.fluxcd.io/v1
kind: ImagePolicy
metadata:
  name: my-app
  namespace: flux-system
spec:
  imageRepositoryRef:
    name: my-app
  policy:
    semver:
      range: ">=1.0.0"
---
apiVersion: image.toolkit.fluxcd.io/v1
kind: ImagePolicy
metadata:
  name: envoy-proxy
  namespace: flux-system
spec:
  imageRepositoryRef:
    name: envoy-proxy
  filterTags:
    pattern: "^v1\\.28\\.[0-9]+$"
  policy:
    semver:
      range: "1.28.x"
---
apiVersion: image.toolkit.fluxcd.io/v1
kind: ImagePolicy
metadata:
  name: db-migrator
  namespace: flux-system
spec:
  imageRepositoryRef:
    name: db-migrator
  policy:
    semver:
      range: ">=1.0.0"
```

Notice that each policy can use a different tag selection strategy. The envoy proxy is pinned to the 1.28.x line while the application images use broader ranges.

## Step 3: Add Markers to the Deployment

Place an image policy marker on each container image line. Each marker references the corresponding ImagePolicy.

```yaml
# deployment.yaml
# Multi-container deployment with separate image policy markers
apiVersion: apps/v1
kind: Deployment
metadata:
  name: my-app
  namespace: default
spec:
  replicas: 3
  selector:
    matchLabels:
      app: my-app
  template:
    metadata:
      labels:
        app: my-app
    spec:
      initContainers:
        - name: db-migrator
          image: ghcr.io/my-org/db-migrator:1.0.0 # {"$imagepolicy": "flux-system:db-migrator"}
          command: ["migrate", "--up"]
      containers:
        - name: app
          image: ghcr.io/my-org/my-app:1.0.0 # {"$imagepolicy": "flux-system:my-app"}
          ports:
            - containerPort: 8080
          resources:
            requests:
              cpu: 100m
              memory: 128Mi
        - name: envoy-sidecar
          image: docker.io/envoyproxy/envoy:v1.28.0 # {"$imagepolicy": "flux-system:envoy-proxy"}
          ports:
            - containerPort: 9901
          resources:
            requests:
              cpu: 50m
              memory: 64Mi
```

Each container's image line has its own marker pointing to a different ImagePolicy. Flux processes all markers independently during each automation run.

## Step 4: Configure ImageUpdateAutomation

A single ImageUpdateAutomation resource handles all markers within its configured path. You do not need one per image.

```yaml
# image-update-automation.yaml
# Single automation resource handles all image policy markers in the path
apiVersion: image.toolkit.fluxcd.io/v1
kind: ImageUpdateAutomation
metadata:
  name: flux-system
  namespace: flux-system
spec:
  interval: 10m
  sourceRef:
    kind: GitRepository
    name: flux-system
  git:
    checkout:
      ref:
        branch: main
    commit:
      author:
        email: flux@example.com
        name: Flux
      messageTemplate: |
        Automated image update

        {{range .Changed.Changes}}
        - {{.OldValue}} -> {{.NewValue}}
        {{end}}
    push:
      branch: main
  update:
    path: ./clusters/production
    strategy: Setters
```

## Working with HelmRelease Values

For Helm-based deployments, the same approach applies. Place markers on each image field within the HelmRelease values.

```yaml
# helmrelease.yaml
# HelmRelease with markers for multiple container images
apiVersion: helm.toolkit.fluxcd.io/v2
kind: HelmRelease
metadata:
  name: my-app
  namespace: default
spec:
  interval: 10m
  chart:
    spec:
      chart: my-app
      version: "1.0.0"
      sourceRef:
        kind: HelmRepository
        name: my-charts
        namespace: flux-system
  values:
    app:
      image:
        repository: ghcr.io/my-org/my-app # {"$imagepolicy": "flux-system:my-app:name"}
        tag: 1.0.0 # {"$imagepolicy": "flux-system:my-app:tag"}
    sidecar:
      image:
        repository: docker.io/envoyproxy/envoy # {"$imagepolicy": "flux-system:envoy-proxy:name"}
        tag: v1.28.0 # {"$imagepolicy": "flux-system:envoy-proxy:tag"}
    initContainers:
      migrator:
        image:
          repository: ghcr.io/my-org/db-migrator # {"$imagepolicy": "flux-system:db-migrator:name"}
          tag: 1.0.0 # {"$imagepolicy": "flux-system:db-migrator:tag"}
```

## Verifying the Setup

Check that all policies are resolving and the automation is working.

```bash
# Verify all ImageRepository resources are scanning
flux get image repository --all-namespaces

# Verify all ImagePolicy resources have resolved a tag
flux get image policy --all-namespaces

# Check the ImageUpdateAutomation status
flux get image update --all-namespaces

# Force a reconciliation to test
flux reconcile image update flux-system -n flux-system
```

## Commit Message Details

The `messageTemplate` in the ImageUpdateAutomation supports listing all changes. When multiple images update simultaneously, the commit message will include all of them.

Example commit message output:

```text
Automated image update

- ghcr.io/my-org/my-app:1.0.0 -> ghcr.io/my-org/my-app:1.1.0
- docker.io/envoyproxy/envoy:v1.28.0 -> docker.io/envoyproxy/envoy:v1.28.1
```

## Best Practices

1. **Use consistent naming.** Name your ImageRepository and ImagePolicy resources after the application they represent to keep the relationship clear.
2. **Set appropriate scan intervals.** Third-party images (like envoy) change less frequently, so use longer intervals to reduce API calls.
3. **Pin third-party images conservatively.** Use tight semver ranges for third-party images (e.g., `1.28.x`) while allowing broader ranges for your own images.
4. **Test marker syntax carefully.** A typo in one marker does not affect the others, but the mismatched container will not receive updates.

## Conclusion

Flux image automation handles multiple container images naturally. Each image gets its own ImageRepository and ImagePolicy, while markers in the deployment manifest link each container to the correct policy. A single ImageUpdateAutomation resource processes all markers in one pass, producing a single commit that captures all image tag changes.
