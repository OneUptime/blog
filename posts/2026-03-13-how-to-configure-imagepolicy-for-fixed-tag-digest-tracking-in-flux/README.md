# How to Configure ImagePolicy for Fixed Tag Digest Tracking in Flux

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Flux, ImagePolicy, Digest, Image-automation, GitOps, Kubernetes

Description: Learn how to configure Flux ImagePolicy to track image digest changes for fixed tags like latest or stable.

---

## Introduction

Some container images use fixed tags that get overwritten with new builds. Tags like `latest`, `stable`, or `production` always point to the most recent build, but the tag name never changes. Traditional Flux image policies that track tag names will not detect updates to these fixed tags because the tag string remains the same. Digest tracking solves this by monitoring the image digest (the SHA256 hash of the image content) behind a fixed tag.

This guide shows you how to configure Flux to detect when a fixed tag's underlying image changes by tracking its digest.

## Prerequisites

- A Kubernetes cluster with Flux v2 installed
- The image-reflector-controller and image-automation-controller deployed
- A container registry with images using fixed tags
- A GitRepository source configured in Flux

## Understanding Fixed Tags and Digests

When you push a new image with the tag `latest`, the registry updates the tag to point to the new image manifest. The tag name stays the same, but the digest changes. A digest looks like `sha256:a1b2c3d4e5f6...` and uniquely identifies the image content.

Without digest tracking, Flux sees the same tag `latest` and determines nothing has changed. With digest tracking, Flux compares the digest behind the tag and detects when it points to a new image.

## Configuring ImageRepository for Digest Scanning

First, set up the ImageRepository to scan your registry:

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

The interval controls how often Flux checks the registry. For fixed tags, you may want a shorter interval since updates are not discoverable through tag name changes.

## Configuring ImagePolicy for a Fixed Tag

To track a specific fixed tag and use its digest in deployments:

```yaml
apiVersion: image.toolkit.fluxcd.io/v1
kind: ImagePolicy
metadata:
  name: my-app-latest
  namespace: flux-system
spec:
  imageRepositoryRef:
    name: my-app
  filterTags:
    pattern: '^latest$'
  policy:
    alphabetical: {}
  digestReflectionPolicy: Always
  interval: 10m
```

This policy filters for the exact tag `latest`. Since there is only one matching tag, the policy always selects it. The key is `digestReflectionPolicy: Always`, which tells Flux to refresh and reflect the digest behind this tag at the specified interval.

## Using Digest in Deployment Manifests

To reference the image with its digest in a Deployment, use a digest-pinned image reference and the basic `$imagepolicy` marker:

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
          image: docker.io/myorg/my-app:latest@sha256:ec0119616bb8be9199575c05bfc23a6bf0fbdb0690ee15834e7b43bc3f4f6017 # {"$imagepolicy": "flux-system:my-app-latest"}
```

When Flux detects that the digest behind `latest` has changed, it can update the deployment image reference to the new `tag@digest` value. Because the pod template changes, Kubernetes can roll out the updated pods.

## Forcing Rolling Updates on Digest Changes

Since the image tag does not change, Kubernetes will not automatically trigger a new rollout if the manifest only contains `docker.io/myorg/my-app:latest`. To force rolling updates when the digest changes, pin the digest in the image reference so Flux can update the pod template:

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
          image: docker.io/myorg/my-app:latest@sha256:ec0119616bb8be9199575c05bfc23a6bf0fbdb0690ee15834e7b43bc3f4f6017 # {"$imagepolicy": "flux-system:my-app-latest"}
```

Alternatively, consider switching to unique tags (like SemVer or timestamps) rather than relying on fixed tags, as this provides a more reliable update mechanism.

## Tracking Multiple Fixed Tags

You can track several fixed tags with separate policies:

```yaml
apiVersion: image.toolkit.fluxcd.io/v1
kind: ImagePolicy
metadata:
  name: my-app-stable
  namespace: flux-system
spec:
  imageRepositoryRef:
    name: my-app
  filterTags:
    pattern: '^stable$'
  policy:
    alphabetical: {}
  digestReflectionPolicy: Always
  interval: 10m
---
apiVersion: image.toolkit.fluxcd.io/v1
kind: ImagePolicy
metadata:
  name: my-app-edge
  namespace: flux-system
spec:
  imageRepositoryRef:
    name: my-app
  filterTags:
    pattern: '^edge$'
  policy:
    alphabetical: {}
  digestReflectionPolicy: Always
  interval: 10m
```

Use the stable policy for production and the edge policy for staging:

```yaml
# Production

image: docker.io/myorg/my-app:stable@sha256:ec0119616bb8be9199575c05bfc23a6bf0fbdb0690ee15834e7b43bc3f4f6017 # {"$imagepolicy": "flux-system:my-app-stable"}

# Staging
image: docker.io/myorg/my-app:edge@sha256:ec0119616bb8be9199575c05bfc23a6bf0fbdb0690ee15834e7b43bc3f4f6017 # {"$imagepolicy": "flux-system:my-app-edge"}
```

## Using Image Pull Policy

When working with fixed tags, ensure your Kubernetes deployment uses the correct image pull policy:

```yaml
containers:
  - name: my-app
    image: docker.io/myorg/my-app:latest
    imagePullPolicy: Always
```

The `Always` pull policy ensures Kubernetes queries the registry for the image digest every time a pod starts, and then uses the cached image only when the resolved digest is already present on the node.

## Limitations and Recommendations

Fixed tag tracking has some limitations. The primary issue is that Kubernetes does not trigger rollouts when the tag stays the same. While digest tracking in Flux detects the change, the deployment mechanism needs additional configuration to respond.

For most use cases, switching to unique tags (SemVer, timestamps, or build numbers) provides a better experience. Each new image gets a distinct tag, Kubernetes naturally triggers rollouts, and you have a clear history of which version ran at any point.

## Verifying the Configuration

```bash
flux get image repository my-app
flux get image policy my-app-latest
```

Check the current digest:

```bash
kubectl -n flux-system get imagepolicy my-app-latest -o jsonpath='{.status.latestRef.digest}'
```

## Conclusion

Fixed tag digest tracking in Flux lets you monitor when mutable tags like `latest` or `stable` point to new images. While the configuration is straightforward using `filterTags` with an exact pattern, the deployment side requires additional handling because Kubernetes does not automatically roll out pods when the tag name stays the same. For production workloads, consider whether unique immutable tags would better serve your deployment pipeline and provide clearer auditability.
