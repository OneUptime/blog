# How to Configure ImagePolicy to Select Only Staging Tags in Flux

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: flux, fluxcd, image-policy, kubernetes, gitops, staging

Description: Learn how to configure Flux CD ImagePolicy to filter and select only staging-specific image tags for your staging environment.

---

## Introduction

Staging environments serve as the final validation step before production. They need to receive images that have passed initial testing but are not yet promoted to production. Flux CD's ImagePolicy allows you to filter image tags so that your staging cluster picks up only the images intended for it, whether they are tagged with a staging prefix, pre-release identifiers, or release candidate markers.

This guide demonstrates multiple approaches to selecting staging-specific tags using Flux CD image automation.

## Prerequisites

- A Kubernetes cluster dedicated to staging with Flux CD installed
- The `image-reflector-controller` and `image-automation-controller` deployed
- Container images tagged with a staging identifier in your registry
- An ImageRepository resource pointing to your container registry

## Approach 1: Staging Prefix Tags

If your CI pipeline produces tags like `staging-v1.5.0`:

```yaml
apiVersion: image.toolkit.fluxcd.io/v1beta2
kind: ImageRepository
metadata:
  name: my-app
  namespace: flux-system
spec:
  image: registry.example.com/my-app
  interval: 5m
---
apiVersion: image.toolkit.fluxcd.io/v1beta2
kind: ImagePolicy
metadata:
  name: my-app-staging
  namespace: flux-system
spec:
  imageRepositoryRef:
    name: my-app
  filterTags:
    pattern: '^staging-v(?P<version>\d+\.\d+\.\d+)$'
    extract: '$version'
  policy:
    semver:
      range: '>=0.1.0'
```

The regex requires the `staging-v` prefix and extracts the semantic version. The lower semver bound of `>=0.1.0` is permissive to allow early-stage versions in staging.

## Approach 2: Release Candidate Tags

Many teams use release candidate tags like `v1.5.0-rc.1`, `v1.5.0-rc.2` for staging. To select only RC tags:

```yaml
apiVersion: image.toolkit.fluxcd.io/v1beta2
kind: ImagePolicy
metadata:
  name: my-app-staging
  namespace: flux-system
spec:
  imageRepositoryRef:
    name: my-app
  filterTags:
    pattern: '^v(?P<version>\d+\.\d+\.\d+-rc\.\d+)$'
    extract: '$version'
  policy:
    semver:
      range: '>=1.0.0-rc.0'
```

The semver range `>=1.0.0-rc.0` ensures that pre-release versions with the `rc` prefix are included in the comparison. Semantic versioning treats pre-release tags as lower than the release version, so `v1.5.0-rc.2` is less than `v1.5.0`.

## Approach 3: Branch-Based Staging Tags

If images built from a `release` branch are tagged like `release-20260313-abc1234`:

```yaml
apiVersion: image.toolkit.fluxcd.io/v1beta2
kind: ImagePolicy
metadata:
  name: my-app-staging
  namespace: flux-system
spec:
  imageRepositoryRef:
    name: my-app
  filterTags:
    pattern: '^release-(?P<ts>\d{8})-[a-f0-9]+$'
    extract: '$ts'
  policy:
    numerical:
      order: asc
```

This extracts the date portion and uses numerical sorting to select the most recent build from the release branch.

## Approach 4: Pre-Release Versions Including Beta and RC

To accept both beta and RC versions for staging while rejecting alpha builds:

```yaml
apiVersion: image.toolkit.fluxcd.io/v1beta2
kind: ImagePolicy
metadata:
  name: my-app-staging
  namespace: flux-system
spec:
  imageRepositoryRef:
    name: my-app
  filterTags:
    pattern: '^v(?P<version>\d+\.\d+\.\d+-(beta|rc)\.\d+)$'
    extract: '$version'
  policy:
    semver:
      range: '>=1.0.0-beta.0'
```

The regex alternation `(beta|rc)` matches both beta and RC tags. Alpha versions are excluded because they do not match the pattern.

## Configuring the ImageUpdateAutomation

Connect the staging policy to an automation resource:

```yaml
apiVersion: image.toolkit.fluxcd.io/v1beta2
kind: ImageUpdateAutomation
metadata:
  name: staging-image-updates
  namespace: flux-system
spec:
  interval: 5m
  sourceRef:
    kind: GitRepository
    name: my-app-repo
  git:
    checkout:
      ref:
        branch: staging
    commit:
      author:
        name: flux-bot
        email: flux@example.com
      messageTemplate: 'chore(staging): update image to {{.NewImage}}'
    push:
      branch: staging
  update:
    path: ./clusters/staging
    strategy: Setters
```

This configuration checks out the `staging` branch, updates image references in the `./clusters/staging` directory, and pushes changes back to the same branch.

## Deployment Manifest Markers

In your staging deployment manifest:

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: my-app
  namespace: staging
spec:
  replicas: 2
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
          image: registry.example.com/my-app:staging-v1.4.0 # {"$imagepolicy": "flux-system:my-app-staging"}
```

## Monitoring the Policy

Check the status of your staging policy:

```bash
kubectl -n flux-system get imagepolicy my-app-staging -o wide
```

View detailed conditions:

```bash
kubectl -n flux-system describe imagepolicy my-app-staging
```

List recent image updates committed by the automation controller:

```bash
kubectl -n flux-system describe imageupdateautomation staging-image-updates
```

## Conclusion

Configuring Flux CD to select only staging tags ensures your staging environment receives the right images without manual intervention. Whether you use staging prefixes, release candidates, or branch-based tags, the combination of `filterTags` regex patterns and appropriate version policies gives you precise control. This keeps your staging environment in sync with your release pipeline and provides a reliable pre-production validation step.
