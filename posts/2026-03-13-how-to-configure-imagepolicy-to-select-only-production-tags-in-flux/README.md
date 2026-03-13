# How to Configure ImagePolicy to Select Only Production Tags in Flux

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: flux, fluxcd, image-policy, kubernetes, gitops, production

Description: Learn how to configure Flux CD ImagePolicy to select only production-ready image tags for automated deployments.

---

## Introduction

In a multi-environment CI/CD pipeline, not every container image tag should reach production. Tags meant for development, testing, or staging need to be filtered out so that only verified production-ready images are deployed. Flux CD's ImagePolicy resource gives you the tools to enforce this separation through tag filtering and version policies.

This guide covers several strategies for ensuring your production cluster only receives production-grade image tags.

## Prerequisites

- A Kubernetes cluster with Flux CD installed
- The `image-reflector-controller` and `image-automation-controller` deployed
- A tagging strategy that distinguishes production images from others
- An ImageRepository resource configured for your container registry

## Strategy 1: Production Prefix

If your pipeline tags production images with a `prod-` prefix (e.g., `prod-v1.5.0`):

```yaml
apiVersion: image.toolkit.fluxcd.io/v1beta2
kind: ImagePolicy
metadata:
  name: my-app-prod
  namespace: flux-system
spec:
  imageRepositoryRef:
    name: my-app
  filterTags:
    pattern: '^prod-v(?P<version>\d+\.\d+\.\d+)$'
    extract: '$version'
  policy:
    semver:
      range: '>=1.0.0'
```

Only tags matching the `prod-v` prefix with a valid semver suffix are considered. The semver policy then picks the highest version.

## Strategy 2: Stable Release Tags Only

If production images use clean semantic version tags like `v1.5.0` while pre-releases use `v1.5.0-rc.1`:

```yaml
apiVersion: image.toolkit.fluxcd.io/v1beta2
kind: ImagePolicy
metadata:
  name: my-app-prod
  namespace: flux-system
spec:
  imageRepositoryRef:
    name: my-app
  filterTags:
    pattern: '^v(?P<version>\d+\.\d+\.\d+)$'
    extract: '$version'
  policy:
    semver:
      range: '>=1.0.0'
```

The strict regex `^\d+\.\d+\.\d+$` (after extracting past the `v` prefix) ensures no pre-release tags are matched. The `$` anchor is critical here as it prevents tags like `v1.5.0-rc.1` or `v1.5.0-beta` from matching.

## Strategy 3: Release Channel Tags

Some teams use a channel-based tagging system with tags like `stable-v1.5.0`, `beta-v1.6.0-rc.1`, and `canary-v1.6.0-alpha.1`:

```yaml
apiVersion: image.toolkit.fluxcd.io/v1beta2
kind: ImagePolicy
metadata:
  name: my-app-stable
  namespace: flux-system
spec:
  imageRepositoryRef:
    name: my-app
  filterTags:
    pattern: '^stable-v(?P<version>\d+\.\d+\.\d+)$'
    extract: '$version'
  policy:
    semver:
      range: '>=1.0.0'
```

Only images explicitly tagged for the `stable` channel are selected.

## Strategy 4: Semver Range Constraints

You can use semver ranges to restrict which major or minor versions are eligible for production:

```yaml
apiVersion: image.toolkit.fluxcd.io/v1beta2
kind: ImagePolicy
metadata:
  name: my-app-prod
  namespace: flux-system
spec:
  imageRepositoryRef:
    name: my-app
  filterTags:
    pattern: '^v(?P<version>\d+\.\d+\.\d+)$'
    extract: '$version'
  policy:
    semver:
      range: '>=2.0.0 <3.0.0'
```

This constrains the policy to only select `v2.x.x` images, preventing accidental major version upgrades.

## Setting Up the ImageRepository

Make sure your ImageRepository is configured:

```yaml
apiVersion: image.toolkit.fluxcd.io/v1beta2
kind: ImageRepository
metadata:
  name: my-app
  namespace: flux-system
spec:
  image: registry.example.com/my-app
  interval: 5m
```

## Marking Deployment Manifests

Add the image policy marker to your production deployment:

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: my-app
  namespace: production
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
      containers:
        - name: my-app
          image: registry.example.com/my-app:v1.5.0 # {"$imagepolicy": "flux-system:my-app-prod"}
          ports:
            - containerPort: 8080
```

The comment marker links this image reference to the `my-app-prod` policy. When a new production tag is detected, Flux updates this line automatically.

## Verifying the Configuration

Check the policy status:

```bash
kubectl -n flux-system get imagepolicy my-app-prod
```

Expected output:

```
NAME           LATESTIMAGE
my-app-prod    registry.example.com/my-app:prod-v1.5.0
```

Inspect details with describe:

```bash
kubectl -n flux-system describe imagepolicy my-app-prod
```

Look for the `Ready` condition to confirm the policy is reconciling without errors.

## Combining with ImageUpdateAutomation

To complete the automation loop, configure an ImageUpdateAutomation resource:

```yaml
apiVersion: image.toolkit.fluxcd.io/v1beta2
kind: ImageUpdateAutomation
metadata:
  name: prod-image-updates
  namespace: flux-system
spec:
  interval: 5m
  sourceRef:
    kind: GitRepository
    name: my-app-repo
  git:
    checkout:
      ref:
        branch: main
    commit:
      author:
        name: flux-bot
        email: flux@example.com
      messageTemplate: |
        chore: update production images

        {{ range .Changed.Changes -}}
        - {{ .OldValue }} -> {{ .NewValue }}
        {{ end -}}
    push:
      branch: main
  update:
    path: ./clusters/production
    strategy: Setters
```

This resource watches for policy changes and commits the updated image references back to your Git repository.

## Conclusion

Selecting only production tags in Flux CD requires a combination of regex filtering and semver policies. Whether you use environment prefixes, clean semver tags, or release channels, the ImagePolicy resource provides the flexibility to enforce production-only image selection. Pair this with an ImageUpdateAutomation resource to create a fully automated, production-safe GitOps pipeline.
