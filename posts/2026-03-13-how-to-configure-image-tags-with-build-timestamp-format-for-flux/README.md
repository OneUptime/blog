# How to Configure Image Tags with Build Timestamp Format for Flux

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Flux, image-automation, ImagePolicy, Timestamp, GitOps, Kubernetes

Description: Learn how to configure Flux ImagePolicy to track container image tags that use build timestamps for chronological ordering.

---

## Introduction

Build timestamps are a straightforward way to tag container images that naturally sort in chronological order. Tags like `20260313143022` or `build-1710345622` encode the build time directly, making it trivial for Flux to determine which image is the most recent. Unlike SemVer, timestamp-based tags do not carry information about breaking changes, but they work well for continuous deployment pipelines where every commit to a branch triggers a new build.

This guide shows you how to configure Flux ImagePolicy to track images tagged with various timestamp formats and how to set up your CI pipeline to produce these tags.

## Prerequisites

- A Kubernetes cluster with Flux v2 installed
- The image-reflector-controller and image-automation-controller deployed
- A CI pipeline that can tag images with timestamp-based formats
- A GitRepository source configured in Flux

## Common Timestamp Tag Formats

Several timestamp formats work well for image tagging:

- Unix timestamp: `1710345622`
- Date-time compact: `20260313143022` (YYYYMMDDHHmmss)
- Date only: `20260313`
- Prefixed timestamp: `build-1710345622`
- Date with separator: `2026-03-13-143022`

All of these formats share a key property: lexicographic or numerical ordering corresponds to chronological ordering.

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

## Unix Timestamp Tags

For images tagged with plain Unix timestamps like `1710345622`:

```yaml
apiVersion: image.toolkit.fluxcd.io/v1
kind: ImagePolicy
metadata:
  name: my-app
  namespace: flux-system
spec:
  imageRepositoryRef:
    name: my-app
  filterTags:
    pattern: '^(?P<ts>[0-9]{10})$'
    extract: '$ts'
  policy:
    numerical:
      order: asc
```

The pattern matches exactly ten digits (a Unix timestamp) and extracts them for numerical comparison. The `asc` order means the highest number (most recent timestamp) is selected.

## Compact Date-Time Tags

For tags in the format `20260313143022`:

```yaml
apiVersion: image.toolkit.fluxcd.io/v1
kind: ImagePolicy
metadata:
  name: my-app-datetime
  namespace: flux-system
spec:
  imageRepositoryRef:
    name: my-app
  filterTags:
    pattern: '^(?P<ts>[0-9]{14})$'
    extract: '$ts'
  policy:
    numerical:
      order: asc
```

This matches fourteen-digit date-time strings. Because the format starts with the year and proceeds to seconds, numerical ordering gives chronological ordering.

## Prefixed Timestamp Tags

For tags like `build-1710345622`:

```yaml
apiVersion: image.toolkit.fluxcd.io/v1
kind: ImagePolicy
metadata:
  name: my-app-prefixed
  namespace: flux-system
spec:
  imageRepositoryRef:
    name: my-app
  filterTags:
    pattern: '^build-(?P<ts>[0-9]{10})$'
    extract: '$ts'
  policy:
    numerical:
      order: asc
```

The filter strips the `build-` prefix and extracts only the numerical timestamp for comparison.

## Combining Timestamp with Git SHA

A popular format combines a timestamp with a Git SHA for traceability. Tags look like `20260313143022-abc1234`:

```yaml
apiVersion: image.toolkit.fluxcd.io/v1
kind: ImagePolicy
metadata:
  name: my-app-ts-sha
  namespace: flux-system
spec:
  imageRepositoryRef:
    name: my-app
  filterTags:
    pattern: '^(?P<ts>[0-9]{14})-[a-fA-F0-9]{7}$'
    extract: '$ts'
  policy:
    numerical:
      order: asc
```

This extracts the timestamp portion while ignoring the SHA suffix, giving correct chronological ordering while keeping the SHA in the actual tag for traceability.

## CI Pipeline Examples

Here are examples for generating timestamp tags in common CI systems.

GitHub Actions:

```yaml
- name: Set image tag
  run: |
    TIMESTAMP=$(date -u +%Y%m%d%H%M%S)
    SHA=$(echo "$GITHUB_SHA" | head -c 7)
    echo "IMAGE_TAG=${TIMESTAMP}-${SHA}" >> $GITHUB_ENV

- name: Build and push
  run: |
    docker build -t myorg/my-app:${{ env.IMAGE_TAG }} .
    docker push myorg/my-app:${{ env.IMAGE_TAG }}
```

GitLab CI:

```yaml
build:
  script:
    - TIMESTAMP=$(date -u +%Y%m%d%H%M%S)
    - SHA=$(echo "$CI_COMMIT_SHA" | head -c 7)
    - docker build -t myorg/my-app:${TIMESTAMP}-${SHA} .
    - docker push myorg/my-app:${TIMESTAMP}-${SHA}
```

## Marking Deployments for Updates

Add the image policy marker to your deployment:

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
          image: docker.io/myorg/my-app:20260313143022-abc1234 # {"$imagepolicy": "flux-system:my-app-ts-sha"}
```

## Handling Timezone Considerations

Always use UTC timestamps in your CI pipeline to avoid ordering issues caused by timezone differences. The `-u` flag in the `date` command ensures UTC output. If different CI runners are in different timezones and do not normalize to UTC, you may get incorrect ordering.

## Verifying the Configuration

```bash
flux get image repository my-app
flux get image policy my-app-ts-sha
```

To see the latest selected tag:

```bash
kubectl -n flux-system get imagepolicy my-app-ts-sha -o jsonpath='{.status.latestImage}'
```

## Conclusion

Timestamp-based image tags provide a natural chronological ordering that works well with Flux image automation. By using the `filterTags` pattern to extract the timestamp component and the `numerical` policy for ordering, you get a reliable and predictable way to track the most recent build. Combining timestamps with Git SHAs gives you both correct ordering and commit traceability in a single tag format.
