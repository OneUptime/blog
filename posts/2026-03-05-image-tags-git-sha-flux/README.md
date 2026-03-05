# How to Configure Image Tags with Git SHA for Flux Automation

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Flux CD, GitOps, Kubernetes, Image Automation, Git SHA, CI/CD

Description: Learn how to use Git SHA-based image tags with Flux image automation by combining commit hashes with sortable components like timestamps or build numbers.

---

## Introduction

Git commit SHAs are a popular choice for image tags because they create a direct link between a container image and the exact source code it was built from. However, SHAs alone are not sortable chronologically. Flux image automation needs a way to determine which tag is "latest." This guide shows how to combine Git SHAs with sortable components to make them work with Flux.

## Prerequisites

- A Kubernetes cluster with Flux installed
- Image automation controllers deployed
- A CI/CD pipeline that builds container images

## The Challenge with Plain Git SHA Tags

A Git SHA like `a1b2c3d` is a hexadecimal hash. While each commit produces a unique SHA, there is no inherent ordering. Commit `f9e8d7c` is not necessarily newer than `a1b2c3d` from a sorting perspective.

Flux ImagePolicy cannot determine which SHA tag represents the latest build when using only the SHA as the tag.

## Solution 1: Timestamp Prefix with Git SHA

Prepend a Unix timestamp or sortable date to the SHA. The timestamp provides the ordering while the SHA provides traceability.

### CI/CD Pipeline Configuration

```bash
# Build and tag with timestamp-sha format
# This produces tags like: 1709654400-a1b2c3d
TIMESTAMP=$(date +%s)
SHA=$(git rev-parse --short HEAD)
TAG="${TIMESTAMP}-${SHA}"

docker build -t ghcr.io/my-org/my-app:${TAG} .
docker push ghcr.io/my-org/my-app:${TAG}
```

### GitHub Actions Example

```yaml
# .github/workflows/build.yaml
# Build workflow that produces timestamp-sha tags
name: Build and Push

on:
  push:
    branches: [main]

jobs:
  build:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4

      - name: Set image tag
        run: |
          TIMESTAMP=$(date +%s)
          SHA=$(echo ${{ github.sha }} | cut -c1-7)
          echo "IMAGE_TAG=${TIMESTAMP}-${SHA}" >> $GITHUB_ENV

      - name: Build and push
        uses: docker/build-push-action@v5
        with:
          push: true
          tags: ghcr.io/my-org/my-app:${{ env.IMAGE_TAG }}
```

### Flux ImagePolicy Configuration

Extract the timestamp portion for numerical sorting.

```yaml
# image-policy-timestamp-sha.yaml
# Extracts the timestamp prefix from timestamp-sha tags for sorting
apiVersion: image.toolkit.fluxcd.io/v1beta2
kind: ImagePolicy
metadata:
  name: my-app
  namespace: flux-system
spec:
  imageRepositoryRef:
    name: my-app
  filterTags:
    pattern: "^(?P<ts>[0-9]+)-[a-f0-9]{7}$"
    extract: "$ts"
  policy:
    numerical:
      order: asc
```

The regex `^(?P<ts>[0-9]+)-[a-f0-9]{7}$` captures the timestamp into the named group `ts`, and Flux sorts by this extracted value.

## Solution 2: Branch-SHA-Timestamp Format

Include the branch name for additional context, useful when building from multiple branches.

### CI/CD Pipeline Configuration

```bash
# Build and tag with branch-sha-timestamp format
# This produces tags like: main-a1b2c3d-1709654400
BRANCH=$(git rev-parse --abbrev-ref HEAD | sed 's/\//-/g')
SHA=$(git rev-parse --short HEAD)
TIMESTAMP=$(date +%s)
TAG="${BRANCH}-${SHA}-${TIMESTAMP}"

docker build -t ghcr.io/my-org/my-app:${TAG} .
docker push ghcr.io/my-org/my-app:${TAG}
```

### Flux ImagePolicy Configuration

Filter by branch and extract the timestamp.

```yaml
# image-policy-branch-sha-ts.yaml
# Only considers tags from the main branch, sorts by timestamp
apiVersion: image.toolkit.fluxcd.io/v1beta2
kind: ImagePolicy
metadata:
  name: my-app
  namespace: flux-system
spec:
  imageRepositoryRef:
    name: my-app
  filterTags:
    pattern: "^main-[a-f0-9]{7}-(?P<ts>[0-9]+)$"
    extract: "$ts"
  policy:
    numerical:
      order: asc
```

By anchoring the pattern to `^main-`, only images built from the main branch are considered for production deployment.

## Solution 3: Build Number with Git SHA

Use the CI build number as the primary sort key with the SHA for reference.

### CI/CD Pipeline Configuration

```bash
# Build and tag with build number and SHA
# This produces tags like: 142-a1b2c3d
TAG="${BUILD_NUMBER}-$(git rev-parse --short HEAD)"

docker build -t ghcr.io/my-org/my-app:${TAG} .
docker push ghcr.io/my-org/my-app:${TAG}
```

### Flux ImagePolicy Configuration

```yaml
# image-policy-build-sha.yaml
# Extracts the build number for numerical sorting
apiVersion: image.toolkit.fluxcd.io/v1beta2
kind: ImagePolicy
metadata:
  name: my-app
  namespace: flux-system
spec:
  imageRepositoryRef:
    name: my-app
  filterTags:
    pattern: "^(?P<build>[0-9]+)-[a-f0-9]{7}$"
    extract: "$build"
  policy:
    numerical:
      order: asc
```

## Setting Up the ImageRepository

The ImageRepository configuration is the same regardless of which tag format you choose.

```yaml
# image-repository.yaml
# Scans the registry for all available tags
apiVersion: image.toolkit.fluxcd.io/v1beta2
kind: ImageRepository
metadata:
  name: my-app
  namespace: flux-system
spec:
  image: ghcr.io/my-org/my-app
  interval: 5m
```

## Adding Markers to Deployment Manifests

Place the image policy marker on the image line of your deployment.

```yaml
# deployment.yaml
# Deployment with image policy marker for SHA-based tags
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
      containers:
        - name: app
          image: ghcr.io/my-org/my-app:1709654400-a1b2c3d # {"$imagepolicy": "flux-system:my-app"}
          ports:
            - containerPort: 8080
```

When Flux updates the tag, the entire tag value is replaced with the new one, for example `1709740800-e4f5g6h`.

## Verifying the Configuration

After deploying all resources, verify the pipeline works end to end.

```bash
# Check that the ImageRepository is scanning
flux get image repository my-app -n flux-system

# Verify the ImagePolicy resolves the correct tag
flux get image policy my-app -n flux-system

# Check the automation status
flux get image update flux-system -n flux-system
```

## Tracing an Image Back to Source Code

One of the main benefits of including the Git SHA in the tag is traceability. You can always determine which commit produced a running container.

```bash
# Find the Git SHA from the running container's image tag
kubectl get deployment my-app -o jsonpath='{.spec.template.spec.containers[0].image}'
# Output: ghcr.io/my-org/my-app:1709740800-e4f5g6h

# Look up the commit
git show e4f5g6h
```

## Conclusion

Git SHA-based image tags provide excellent traceability between container images and source code. By combining the SHA with a sortable component like a timestamp or build number, you make these tags compatible with Flux image automation. The `filterTags` pattern with a named capture group gives Flux the ability to extract the sortable portion while the full tag retains its traceability value.
