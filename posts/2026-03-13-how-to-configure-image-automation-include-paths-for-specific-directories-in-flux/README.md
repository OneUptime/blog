# How to Configure Image Automation Include Paths for Specific Directories in Flux

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: flux, image-automation, include-paths, gitops, kubernetes

Description: Learn how to configure Flux ImageUpdateAutomation to only scan and update image tags in specific directories using include paths.

---

## Introduction

In large repositories with multiple environments, clusters, or applications, you may want Flux image automation to only update manifests in specific directories. The `update.path` field provides a basic directory scope, but when you need more granular control, you can use include paths to restrict which directories the automation scans for image policy markers.

This guide shows you how to configure include paths in Flux ImageUpdateAutomation to target specific directories within your repository.

## Prerequisites

- A Kubernetes cluster with Flux v2 installed
- The image-reflector-controller and image-automation-controller deployed
- A repository with multiple directories containing Kubernetes manifests
- ImagePolicies configured for your container images

## Repository Structure

Consider a repository with the following structure:

```
├── clusters/
│   ├── staging/
│   │   ├── apps/
│   │   │   ├── api/
│   │   │   ├── web/
│   │   │   └── worker/
│   │   └── infrastructure/
│   │       ├── monitoring/
│   │       └── ingress/
│   └── production/
│       ├── apps/
│       │   ├── api/
│       │   ├── web/
│       │   └── worker/
│       └── infrastructure/
│           ├── monitoring/
│           └── ingress/
├── base/
│   └── apps/
└── overlays/
```

## Basic Path Configuration

The simplest approach uses the `update.path` field to scope the automation to a single directory tree:

```yaml
apiVersion: image.toolkit.fluxcd.io/v1beta2
kind: ImageUpdateAutomation
metadata:
  name: production-updates
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
        name: Flux Bot
        email: flux@example.com
      messageTemplate: "chore: update production images"
    push:
      branch: main
  update:
    path: ./clusters/production
    strategy: Setters
```

This scans everything under `./clusters/production` including both `apps/` and `infrastructure/`.

## Using Include Paths for Specific Subdirectories

To restrict the automation to only the `apps/` directory within production, keeping infrastructure manifests unaffected:

```yaml
apiVersion: image.toolkit.fluxcd.io/v1beta2
kind: ImageUpdateAutomation
metadata:
  name: production-app-updates
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
        name: Flux Bot
        email: flux@example.com
      messageTemplate: "chore: update production app images"
    push:
      branch: main
  update:
    path: ./clusters/production/apps
    strategy: Setters
```

## Multiple Automation Resources for Different Paths

Create separate automation resources for different directory scopes:

```yaml
apiVersion: image.toolkit.fluxcd.io/v1beta2
kind: ImageUpdateAutomation
metadata:
  name: production-app-updates
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
        name: Flux App Bot
        email: flux-apps@example.com
      messageTemplate: "chore: update production app images"
    push:
      branch: main
  update:
    path: ./clusters/production/apps
    strategy: Setters
---
apiVersion: image.toolkit.fluxcd.io/v1beta2
kind: ImageUpdateAutomation
metadata:
  name: production-infra-updates
  namespace: flux-system
spec:
  interval: 30m
  sourceRef:
    kind: GitRepository
    name: my-repo
  git:
    checkout:
      ref:
        branch: main
    commit:
      author:
        name: Flux Infra Bot
        email: flux-infra@example.com
      messageTemplate: "chore: update production infra images"
    push:
      branch: main
  update:
    path: ./clusters/production/infrastructure
    strategy: Setters
```

This setup lets you run app image updates every ten minutes while checking infrastructure images every thirty minutes.

## Scanning a Single Application

To restrict automation to a single application:

```yaml
apiVersion: image.toolkit.fluxcd.io/v1beta2
kind: ImageUpdateAutomation
metadata:
  name: api-updates
  namespace: flux-system
spec:
  interval: 5m
  sourceRef:
    kind: GitRepository
    name: my-repo
  git:
    checkout:
      ref:
        branch: main
    commit:
      author:
        name: Flux Bot
        email: flux@example.com
      messageTemplate: "chore: update api image"
    push:
      branch: main
  update:
    path: ./clusters/production/apps/api
    strategy: Setters
```

## Scanning the Entire Repository

To scan all directories from the repository root:

```yaml
spec:
  update:
    path: ./
    strategy: Setters
```

This is the broadest scope and will find image policy markers anywhere in the repository. Use this only if you want a single automation to handle all environments.

## Combining Path with Environment-Specific Branches

For a multi-environment setup where each environment has its own directory:

```yaml
apiVersion: image.toolkit.fluxcd.io/v1beta2
kind: ImageUpdateAutomation
metadata:
  name: staging-updates
  namespace: flux-system
spec:
  interval: 5m
  sourceRef:
    kind: GitRepository
    name: my-repo
  git:
    checkout:
      ref:
        branch: main
    commit:
      author:
        name: Flux Bot
        email: flux@example.com
      messageTemplate: "chore: update staging images"
    push:
      branch: main
  update:
    path: ./clusters/staging/apps
    strategy: Setters
---
apiVersion: image.toolkit.fluxcd.io/v1beta2
kind: ImageUpdateAutomation
metadata:
  name: production-updates
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
        name: Flux Bot
        email: flux@example.com
      messageTemplate: "chore: update production images"
    push:
      branch: flux/production-images
  update:
    path: ./clusters/production/apps
    strategy: Setters
```

Staging gets direct commits while production changes go through a pull request branch.

## Verifying Path Configuration

Check which files the automation would scan:

```bash
find ./clusters/production/apps -name "*.yaml" -o -name "*.yml" | head -20
```

Verify the automation is running against the correct path:

```bash
flux get image update production-app-updates
kubectl -n flux-system describe imageupdateautomation production-app-updates
```

## Conclusion

Include paths in Flux ImageUpdateAutomation give you precise control over which directories are scanned for image policy markers. By scoping each automation resource to a specific directory, you can apply different update intervals, commit authors, and push strategies to different parts of your repository. This is especially valuable in multi-environment and multi-team setups where different areas of the repository have different update cadences and approval requirements.
