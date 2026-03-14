# How to Configure ImagePolicy to Track Multiple Architectures in Flux

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Flux, ImagePolicy, Multi-Arch, image-automation, GitOps, Kubernetes

Description: Learn how to configure Flux ImagePolicy to track container images that support multiple CPU architectures like amd64 and arm64.

---

## Introduction

Modern Kubernetes clusters often run nodes with different CPU architectures. A cluster might have both amd64 and arm64 nodes, especially when using cloud providers that offer ARM-based instances for cost savings. Your container images need to support these architectures, and your Flux image automation needs to select tags that have multi-architecture manifests available.

This guide explains how to configure Flux ImagePolicy and ImageRepository to work with multi-architecture images, whether they use manifest lists or architecture-specific tags.

## Prerequisites

- A Kubernetes cluster with Flux v2 installed
- The image-reflector-controller and image-automation-controller deployed
- A container registry with multi-architecture images
- A GitRepository source configured in Flux
- Familiarity with Docker manifest lists and OCI image indexes

## How Multi-Architecture Images Work

Multi-architecture images use a manifest list (or OCI image index) that maps a single tag to multiple platform-specific images. When you push a multi-arch image with tag `1.2.3`, the registry stores a manifest list that points to separate images for `linux/amd64`, `linux/arm64`, and other platforms. The container runtime on each node automatically pulls the correct platform variant.

## Scanning Multi-Architecture Images

The Flux ImageRepository scans tags from the registry and works with multi-arch images by default. The tag scanning process reads the tag list, which is architecture-agnostic:

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

This scans all tags regardless of architecture. The ImageRepository does not filter by architecture at the scanning stage.

## Standard ImagePolicy with Multi-Arch Images

If your images are properly built as multi-arch manifests, a standard ImagePolicy works without any special configuration:

```yaml
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
```

Since multi-arch images share a single tag across all architectures, the policy selects the latest tag and Kubernetes handles pulling the correct architecture variant at runtime.

## Handling Architecture-Specific Tags

Some registries use architecture-specific tags like `1.2.3-amd64` and `1.2.3-arm64` instead of manifest lists. In this case, you need to filter tags for a specific architecture:

```yaml
apiVersion: image.toolkit.fluxcd.io/v1
kind: ImagePolicy
metadata:
  name: my-app-amd64
  namespace: flux-system
spec:
  imageRepositoryRef:
    name: my-app
  filterTags:
    pattern: '^(?P<version>[0-9]+\.[0-9]+\.[0-9]+)-amd64$'
    extract: '$version'
  policy:
    semver:
      range: ">=1.0.0"
```

And for arm64 nodes:

```yaml
apiVersion: image.toolkit.fluxcd.io/v1
kind: ImagePolicy
metadata:
  name: my-app-arm64
  namespace: flux-system
spec:
  imageRepositoryRef:
    name: my-app
  filterTags:
    pattern: '^(?P<version>[0-9]+\.[0-9]+\.[0-9]+)-arm64$'
    extract: '$version'
  policy:
    semver:
      range: ">=1.0.0"
```

## Using Separate Deployments per Architecture

When your images use architecture-specific tags, you need separate deployments or node-affinity-based scheduling. Here is a deployment for amd64 nodes:

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: my-app-amd64
  namespace: default
spec:
  selector:
    matchLabels:
      app: my-app
      arch: amd64
  template:
    metadata:
      labels:
        app: my-app
        arch: amd64
    spec:
      nodeSelector:
        kubernetes.io/arch: amd64
      containers:
        - name: my-app
          image: docker.io/myorg/my-app:1.2.3-amd64 # {"$imagepolicy": "flux-system:my-app-amd64"}
```

And for arm64:

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: my-app-arm64
  namespace: default
spec:
  selector:
    matchLabels:
      app: my-app
      arch: arm64
  template:
    metadata:
      labels:
        app: my-app
        arch: arm64
    spec:
      nodeSelector:
        kubernetes.io/arch: arm64
      containers:
        - name: my-app
          image: docker.io/myorg/my-app:1.2.3-arm64 # {"$imagepolicy": "flux-system:my-app-arm64"}
```

## Filtering for Tags with Manifest Lists Only

If your registry contains a mix of single-arch and multi-arch tags, and you want to ensure you only select tags with manifest lists, you can use a naming convention. For example, tag multi-arch images without an architecture suffix and single-arch images with one:

```yaml
apiVersion: image.toolkit.fluxcd.io/v1
kind: ImagePolicy
metadata:
  name: my-app-multiarch
  namespace: flux-system
spec:
  imageRepositoryRef:
    name: my-app
  filterTags:
    pattern: '^(?P<version>[0-9]+\.[0-9]+\.[0-9]+)$'
    extract: '$version'
  policy:
    semver:
      range: ">=1.0.0"
```

This pattern excludes tags with architecture suffixes, selecting only bare version tags that should be multi-arch manifest lists.

## Building Multi-Architecture Images in CI

Here is a GitHub Actions workflow that builds and pushes multi-arch images using Docker Buildx:

```yaml
- name: Set up Docker Buildx
  uses: docker/setup-buildx-action@v3

- name: Build and push multi-arch
  uses: docker/build-push-action@v5
  with:
    platforms: linux/amd64,linux/arm64
    push: true
    tags: myorg/my-app:${{ env.VERSION }}
```

This produces a single tag with a manifest list covering both architectures.

## Verifying Architecture Support

Check which platforms an image supports:

```bash
docker manifest inspect myorg/my-app:1.2.3
```

This shows the manifest list with entries for each supported platform.

## Conclusion

Flux image automation works naturally with multi-architecture container images. When your images use manifest lists with shared tags, no special configuration is needed beyond a standard ImagePolicy. When your registry uses architecture-specific tags, use the `filterTags` pattern to select the right architecture and pair each policy with architecture-specific deployments using node selectors. The recommended approach is to build proper multi-arch images with Docker Buildx and use shared tags, as this simplifies both your Flux configuration and your deployment manifests.
