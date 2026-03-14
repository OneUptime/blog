# How to Configure ImagePolicy with Tag Pattern for Monorepo Services

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Flux, ImagePolicy, Monorepo, Tag-Pattern, Image-automation, GitOps, Kubernetes

Description: Learn how to configure Flux ImagePolicy with tag patterns to track separate services from a monorepo that share a single container registry.

---

## Introduction

In a monorepo setup, multiple services live in the same Git repository and often push container images to the same registry or organization. Each service may use a tag prefix or naming convention to distinguish its images, such as `api-1.2.3`, `web-1.2.3`, or `worker-1.2.3`. Flux ImagePolicy needs to filter tags for each service independently to select the correct latest version.

This guide shows you how to configure Flux ImagePolicy with tag patterns to track individual services from a monorepo, ensuring each service is updated independently based on its own tags.

## Prerequisites

- A Kubernetes cluster with Flux v2 installed
- The image-reflector-controller and image-automation-controller deployed
- A monorepo CI pipeline that tags images with service-specific prefixes
- A GitRepository source configured in Flux

## Monorepo Tagging Strategies

Common tagging patterns for monorepo services include:

- Service prefix with version: `api-1.2.3`, `web-2.0.1`
- Service prefix with timestamp: `api-20260313143022`, `web-20260313143022`
- Path-based prefix: `services-api-1.2.3`, `services-web-1.2.3`
- Separate repositories per service: `myorg/monorepo-api:1.2.3`, `myorg/monorepo-web:1.2.3`

This guide focuses on the first pattern where all services share a single image repository with service-prefixed tags.

## Setting Up ImageRepository

If all services push to the same repository:

```yaml
apiVersion: image.toolkit.fluxcd.io/v1
kind: ImageRepository
metadata:
  name: monorepo
  namespace: flux-system
spec:
  image: docker.io/myorg/monorepo
  interval: 5m
```

If each service has its own repository:

```yaml
apiVersion: image.toolkit.fluxcd.io/v1
kind: ImageRepository
metadata:
  name: monorepo-api
  namespace: flux-system
spec:
  image: docker.io/myorg/monorepo-api
  interval: 5m
---
apiVersion: image.toolkit.fluxcd.io/v1
kind: ImageRepository
metadata:
  name: monorepo-web
  namespace: flux-system
spec:
  image: docker.io/myorg/monorepo-web
  interval: 5m
```

## Configuring ImagePolicy for Each Service

When services share a repository with prefixed tags, create an ImagePolicy for each service with a tag filter:

```yaml
apiVersion: image.toolkit.fluxcd.io/v1
kind: ImagePolicy
metadata:
  name: api-service
  namespace: flux-system
spec:
  imageRepositoryRef:
    name: monorepo
  filterTags:
    pattern: '^api-(?P<version>[0-9]+\.[0-9]+\.[0-9]+)$'
    extract: '$version'
  policy:
    semver:
      range: ">=1.0.0"
---
apiVersion: image.toolkit.fluxcd.io/v1
kind: ImagePolicy
metadata:
  name: web-service
  namespace: flux-system
spec:
  imageRepositoryRef:
    name: monorepo
  filterTags:
    pattern: '^web-(?P<version>[0-9]+\.[0-9]+\.[0-9]+)$'
    extract: '$version'
  policy:
    semver:
      range: ">=1.0.0"
---
apiVersion: image.toolkit.fluxcd.io/v1
kind: ImagePolicy
metadata:
  name: worker-service
  namespace: flux-system
spec:
  imageRepositoryRef:
    name: monorepo
  filterTags:
    pattern: '^worker-(?P<version>[0-9]+\.[0-9]+\.[0-9]+)$'
    extract: '$version'
  policy:
    semver:
      range: ">=1.0.0"
```

Each policy filters tags by its service prefix, extracts the version portion, and applies SemVer ordering to find the latest version for that specific service.

## Marking Deployments for Each Service

Each deployment uses its own image policy marker:

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: api
  namespace: default
spec:
  selector:
    matchLabels:
      app: api
  template:
    metadata:
      labels:
        app: api
    spec:
      containers:
        - name: api
          image: docker.io/myorg/monorepo:api-1.2.3 # {"$imagepolicy": "flux-system:api-service"}
---
apiVersion: apps/v1
kind: Deployment
metadata:
  name: web
  namespace: default
spec:
  selector:
    matchLabels:
      app: web
  template:
    metadata:
      labels:
        app: web
    spec:
      containers:
        - name: web
          image: docker.io/myorg/monorepo:web-2.0.1 # {"$imagepolicy": "flux-system:web-service"}
---
apiVersion: apps/v1
kind: Deployment
metadata:
  name: worker
  namespace: default
spec:
  selector:
    matchLabels:
      app: worker
  template:
    metadata:
      labels:
        app: worker
    spec:
      containers:
        - name: worker
          image: docker.io/myorg/monorepo:worker-1.5.0 # {"$imagepolicy": "flux-system:worker-service"}
```

## Using Timestamp Tags with Service Prefix

If your CI pipeline uses timestamps instead of SemVer:

```yaml
apiVersion: image.toolkit.fluxcd.io/v1
kind: ImagePolicy
metadata:
  name: api-service-ts
  namespace: flux-system
spec:
  imageRepositoryRef:
    name: monorepo
  filterTags:
    pattern: '^api-(?P<ts>[0-9]{14})-[a-fA-F0-9]{7}$'
    extract: '$ts'
  policy:
    numerical:
      order: asc
```

## CI Pipeline for Monorepo Tagging

A GitHub Actions workflow that detects which service changed and tags accordingly:

```yaml
jobs:
  detect-changes:
    runs-on: ubuntu-latest
    outputs:
      api: ${{ steps.changes.outputs.api }}
      web: ${{ steps.changes.outputs.web }}
    steps:
      - uses: dorny/paths-filter@v2
        id: changes
        with:
          filters: |
            api:
              - 'services/api/**'
            web:
              - 'services/web/**'

  build-api:
    needs: detect-changes
    if: needs.detect-changes.outputs.api == 'true'
    runs-on: ubuntu-latest
    steps:
      - name: Build and push
        run: |
          VERSION=$(cat services/api/VERSION)
          docker build -t myorg/monorepo:api-${VERSION} services/api/
          docker push myorg/monorepo:api-${VERSION}
```

## Configuring ImageUpdateAutomation

A single ImageUpdateAutomation handles all services:

```yaml
apiVersion: image.toolkit.fluxcd.io/v1
kind: ImageUpdateAutomation
metadata:
  name: monorepo-automation
  namespace: flux-system
spec:
  interval: 10m
  sourceRef:
    kind: GitRepository
    name: my-repo
  git:
    checkout:
      ref:
        branch: main
    commit:
      author:
        name: flux-bot
        email: flux@example.com
      messageTemplate: "Update {{ range .Changed.Changes }}{{ .OldValue }} -> {{ .NewValue }} {{ end }}"
    push:
      branch: main
  update:
    path: ./clusters/production
    strategy: Setters
```

## Verifying per-Service Policies

```bash
flux get image policy api-service
flux get image policy web-service
flux get image policy worker-service
```

## Conclusion

Configuring ImagePolicy with tag patterns for monorepo services lets Flux track each service independently even when they share a container registry. The `filterTags` pattern isolates tags by service prefix, and the `extract` field pulls out the version component for proper ordering. Whether you use SemVer or timestamps, the pattern-based filtering ensures each service is updated only when its own images change, not when other services in the monorepo publish new versions.
