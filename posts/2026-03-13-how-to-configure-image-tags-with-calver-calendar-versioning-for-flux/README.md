# How to Configure Image Tags with CalVer (Calendar Versioning) for Flux

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Flux, Calver, image-automation, ImagePolicy, Versioning, GitOps, Kubernetes

Description: Learn how to configure Flux ImagePolicy to track container image tags that follow Calendar Versioning (CalVer) schemes.

---

## Introduction

Calendar Versioning (CalVer) is a versioning scheme that uses dates as the basis for version numbers. Instead of arbitrary major and minor numbers, CalVer tags encode when the release was made. Tags like `2026.03.13`, `2026.3.1`, or `v2026.03` are all examples of CalVer. This scheme works well for projects that release on a regular cadence and where the release date is more meaningful than a sequence number.

Flux ImagePolicy can track CalVer-tagged images using a combination of tag filtering and numerical or alphabetical sorting. This guide walks you through configuring Flux to handle various CalVer formats.

## Prerequisites

- A Kubernetes cluster with Flux v2 installed
- The image-reflector-controller and image-automation-controller deployed
- A container registry with images tagged using CalVer format
- A GitRepository source configured in Flux

## Common CalVer Formats

CalVer comes in several flavors depending on the project:

- `YYYY.MM.DD` - Full date: `2026.03.13`
- `YYYY.MM` - Year and month: `2026.03`
- `YYYY.MM.MICRO` - Year, month, and build: `2026.03.1`
- `YY.MM` - Short year: `26.03`
- `YYYY.0M.0D` - Zero-padded: `2026.03.13`

The key property of all these formats is that lexicographic sorting gives chronological ordering when the components are zero-padded.

## Setting Up the ImageRepository

```yaml
apiVersion: image.toolkit.fluxcd.io/v1
kind: ImageRepository
metadata:
  name: my-app
  namespace: flux-system
spec:
  image: docker.io/myorg/my-app
  interval: 5m
```

## Using SemVer Policy with CalVer

When your CalVer tags use a three-component format like `2026.03.13` or `2026.3.1`, they happen to be valid SemVer strings. You can use the SemVer policy directly:

```yaml
apiVersion: image.toolkit.fluxcd.io/v1
kind: ImagePolicy
metadata:
  name: my-app-calver
  namespace: flux-system
spec:
  imageRepositoryRef:
    name: my-app
  policy:
    semver:
      range: ">=2026.1.0"
```

This selects the highest version starting from 2026. If your registry has `2026.1.15`, `2026.2.1`, and `2026.3.13`, it picks `2026.3.13`.

## Constraining to a Specific Year

To only track releases from a specific year:

```yaml
apiVersion: image.toolkit.fluxcd.io/v1
kind: ImagePolicy
metadata:
  name: my-app-2026
  namespace: flux-system
spec:
  imageRepositoryRef:
    name: my-app
  policy:
    semver:
      range: ">=2026.0.0 <2027.0.0"
```

## Constraining to a Specific Month

To track only releases from a specific month:

```yaml
apiVersion: image.toolkit.fluxcd.io/v1
kind: ImagePolicy
metadata:
  name: my-app-march
  namespace: flux-system
spec:
  imageRepositoryRef:
    name: my-app
  policy:
    semver:
      range: ">=2026.3.0 <2026.4.0"
```

## Two-Component CalVer with Filter Tags

For two-component CalVer tags like `2026.03`, you cannot use SemVer (which requires three components). Instead, use tag filtering with alphabetical ordering:

```yaml
apiVersion: image.toolkit.fluxcd.io/v1
kind: ImagePolicy
metadata:
  name: my-app-ym
  namespace: flux-system
spec:
  imageRepositoryRef:
    name: my-app
  filterTags:
    pattern: '^(?P<ts>[0-9]{4}\.[0-9]{2})$'
    extract: '$ts'
  policy:
    alphabetical:
      order: asc
```

Since the format is zero-padded, alphabetical ordering gives the correct chronological order.

## CalVer with Build Number Suffix

Some projects append a build number to the CalVer date, producing tags like `2026.03.13-1` or `2026.03.13-2` for multiple releases on the same day:

```yaml
apiVersion: image.toolkit.fluxcd.io/v1
kind: ImagePolicy
metadata:
  name: my-app-calver-build
  namespace: flux-system
spec:
  imageRepositoryRef:
    name: my-app
  filterTags:
    pattern: '^(?P<calver>[0-9]{4}\.[0-9]{2}\.[0-9]{2})-(?P<build>[0-9]+)$'
    extract: '$calver-$build'
  policy:
    alphabetical:
      order: asc
```

## CalVer with v Prefix

If your tags use a `v` prefix like `v2026.03.13`:

```yaml
apiVersion: image.toolkit.fluxcd.io/v1
kind: ImagePolicy
metadata:
  name: my-app-v-calver
  namespace: flux-system
spec:
  imageRepositoryRef:
    name: my-app
  filterTags:
    pattern: '^v(?P<ts>[0-9]{4}\.[0-9]{2}\.[0-9]{2})$'
    extract: '$ts'
  policy:
    alphabetical:
      order: asc
```

The filter strips the `v` prefix before comparison, ensuring correct ordering.

## Marking Deployments for Updates

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: my-app
  namespace: default
spec:
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
          image: docker.io/myorg/my-app:2026.03.13 # {"$imagepolicy": "flux-system:my-app-calver"}
```

## CI Pipeline CalVer Tagging

A GitHub Actions step to generate CalVer tags:

```yaml
- name: Generate CalVer tag
  run: |
    CALVER=$(date -u +%Y.%m.%d)
    BUILD_NUM=${{ github.run_number }}
    echo "IMAGE_TAG=${CALVER}-${BUILD_NUM}" >> $GITHUB_ENV

- name: Build and push
  run: |
    docker build -t myorg/my-app:${{ env.IMAGE_TAG }} .
    docker push myorg/my-app:${{ env.IMAGE_TAG }}
```

## Verifying the Configuration

```bash
flux get image repository my-app
flux get image policy my-app-calver
```

## Conclusion

Calendar Versioning provides a human-readable tagging scheme that naturally sorts chronologically. Flux supports CalVer tags through its SemVer policy when the format has three components, and through alphabetical or numerical policies with tag filtering for other formats. The zero-padded date format is essential for correct sorting, so make sure your CI pipeline produces consistently formatted tags. CalVer works particularly well for teams that release frequently and want the release date embedded directly in the version number.
