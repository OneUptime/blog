# How to Configure ImagePolicy for Latest Tag in Flux

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Flux CD, GitOps, Kubernetes, Image Automation, ImagePolicy, Latest Tag

Description: Learn how to configure Flux ImagePolicy to work with the 'latest' tag and understand why versioned tags are preferred.

---

The `latest` tag is a common convention in container registries, but it poses challenges for automated image updates. This guide explains how to handle the `latest` tag in Flux ImagePolicy, why it is generally not recommended, and what alternatives you should use instead.

## Prerequisites

- A Kubernetes cluster with Flux and image automation controllers installed
- An ImageRepository scanning your target image
- kubectl access to your cluster

## The Problem with the Latest Tag

The `latest` tag is a mutable tag that can point to different image digests at different times. It does not convey version information and cannot be sorted or compared meaningfully. When Flux scans an image repository and finds a `latest` tag, it has no way to determine if the underlying image has changed because the tag name remains the same.

For Flux image automation to work effectively, it needs tags that change when new images are published. The `latest` tag does not change -- only its underlying digest does.

## Step 1: Why You Should Avoid the Latest Tag

Consider these issues:

1. **No version tracking** -- You cannot tell which version of your application is running.
2. **No rollback** -- There is no previous tag to roll back to.
3. **No change detection** -- Flux detects new images by comparing tag names, not digests.
4. **No reproducibility** -- The same tag may refer to different images over time.

## Step 2: Use SemVer Tags Instead

The recommended approach is to tag images with semantic versions and use a SemVer policy.

```yaml
# imagepolicy-semver-recommended.yaml
# Recommended: use semver tags instead of latest
apiVersion: image.toolkit.fluxcd.io/v1beta2
kind: ImagePolicy
metadata:
  name: my-app
  namespace: flux-system
spec:
  imageRepositoryRef:
    name: my-app
  policy:
    semver:
      # Select the latest stable version
      range: ">=1.0.0"
```

## Step 3: Use Timestamp Tags as an Alternative

If you cannot use SemVer, timestamp-based tags are a good alternative to `latest`.

```yaml
# imagepolicy-timestamp-alt.yaml
# Alternative to latest: use timestamp tags
apiVersion: image.toolkit.fluxcd.io/v1beta2
kind: ImagePolicy
metadata:
  name: my-app
  namespace: flux-system
spec:
  imageRepositoryRef:
    name: my-app
  filterTags:
    # Match timestamp tags like 20260305-120000
    pattern: "^(?P<ts>[0-9]{8}-[0-9]{6})$"
    extract: "$ts"
  policy:
    alphabetical:
      order: asc
```

## Step 4: Use Build Number Tags as an Alternative

Sequential build numbers are another good replacement for `latest`.

```yaml
# imagepolicy-buildnum-alt.yaml
# Alternative to latest: use build number tags
apiVersion: image.toolkit.fluxcd.io/v1beta2
kind: ImagePolicy
metadata:
  name: my-app
  namespace: flux-system
spec:
  imageRepositoryRef:
    name: my-app
  filterTags:
    # Match build number tags
    pattern: "^(?P<num>[0-9]+)$"
    extract: "$num"
  policy:
    numerical:
      order: asc
```

## Step 5: Select the Most Recent Tag When All Tags Are Unique

If your CI/CD pipeline produces unique tags for every build (e.g., Git SHA + timestamp), use alphabetical or numerical sorting to get the "latest" build.

```yaml
# imagepolicy-latest-build.yaml
# Get the latest build using SHA-based tags with timestamps
apiVersion: image.toolkit.fluxcd.io/v1beta2
kind: ImagePolicy
metadata:
  name: my-app
  namespace: flux-system
spec:
  imageRepositoryRef:
    name: my-app
  filterTags:
    # Match tags like main-20260305T120000-abc1234
    pattern: "^main-(?P<ts>[0-9]{8}T[0-9]{6})-[a-f0-9]+$"
    extract: "$ts"
  policy:
    alphabetical:
      order: asc
```

## Step 6: Modify Your CI/CD Pipeline

Update your CI/CD pipeline to produce versioned tags. Here is an example GitHub Actions workflow.

```yaml
# .github/workflows/build.yaml
# Build and push with a timestamp tag instead of 'latest'
name: Build and Push
on:
  push:
    branches: [main]
jobs:
  build:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - name: Set tag
        id: tag
        run: |
          # Generate a timestamp-based tag
          echo "TAG=$(date +%Y%m%d%H%M%S)-${GITHUB_SHA::7}" >> $GITHUB_OUTPUT
      - name: Build and push
        run: |
          docker build -t ghcr.io/my-org/my-app:${{ steps.tag.outputs.TAG }} .
          docker push ghcr.io/my-org/my-app:${{ steps.tag.outputs.TAG }}
```

## Step 7: Exclude the Latest Tag from ImageRepository

If your registry contains a `latest` tag alongside versioned tags, exclude it from scanning.

```yaml
# imagerepository-no-latest.yaml
# Exclude the latest tag from scan results
apiVersion: image.toolkit.fluxcd.io/v1beta2
kind: ImageRepository
metadata:
  name: my-app
  namespace: flux-system
spec:
  image: ghcr.io/my-org/my-app
  interval: 5m0s
  exclusionList:
    # Exclude the mutable latest tag
    - "^latest$"
```

## Step 8: Pin to a Specific Tag

If you need to use a specific tag without automation, simply set the tag in your deployment manifest and do not create an ImagePolicy for it.

```yaml
# deployment.yaml
# Pin to a specific version without image automation
apiVersion: apps/v1
kind: Deployment
metadata:
  name: my-app
spec:
  template:
    spec:
      containers:
        - name: my-app
          image: ghcr.io/my-org/my-app:1.5.2
```

## Summary

You have learned why the `latest` tag is not suitable for Flux image automation and what alternatives to use instead. Semantic version tags, timestamp tags, and build number tags all provide the unique, sortable identifiers that Flux needs to detect and apply image updates automatically. If you are currently using `latest`, consider updating your CI/CD pipeline to produce versioned tags for a more reliable GitOps workflow.
