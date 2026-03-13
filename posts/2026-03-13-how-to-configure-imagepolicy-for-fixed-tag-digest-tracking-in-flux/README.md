# How to Configure ImagePolicy for Fixed Tag Digest Tracking in Flux

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: flux, imagepolicy, digest, image-automation, gitops, kubernetes

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
apiVersion: image.toolkit.fluxcd.io/v1beta2
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
apiVersion: image.toolkit.fluxcd.io/v1beta2
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
    alphabetical:
      order: asc
```

This policy filters for the exact tag `latest`. Since there is only one matching tag, the policy always selects it. The key is that Flux tracks whether the digest behind this tag has changed.

## Using Digest in Deployment Manifests

To reference the image with its digest, use the `$imagepolicy` marker with the `:tag` or `:name` suffix to control what gets written:

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
          image: docker.io/myorg/my-app:latest # {"$imagepolicy": "flux-system:my-app-latest"}
```

When Flux detects that the digest behind `latest` has changed, it can update the deployment. However, since the tag name does not change, Kubernetes may not trigger a rolling update unless you use additional mechanisms.

## Forcing Rolling Updates on Digest Changes

Since the image tag does not change, Kubernetes will not automatically trigger a new rollout. To force rolling updates when the digest changes, annotate the pod template with the digest:

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
      annotations:
        fluxcd.io/image-digest: "" # Updated by automation
    spec:
      containers:
        - name: my-app
          image: docker.io/myorg/my-app:latest # {"$imagepolicy": "flux-system:my-app-latest"}
```

Alternatively, consider switching to unique tags (like SemVer or timestamps) rather than relying on fixed tags, as this provides a more reliable update mechanism.

## Tracking Multiple Fixed Tags

You can track several fixed tags with separate policies:

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
    pattern: '^stable$'
  policy:
    alphabetical:
      order: asc
---
apiVersion: image.toolkit.fluxcd.io/v1beta2
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
    alphabetical:
      order: asc
```

Use the stable policy for production and the edge policy for staging:

```yaml
# Production
image: docker.io/myorg/my-app:stable # {"$imagepolicy": "flux-system:my-app-stable"}

# Staging
image: docker.io/myorg/my-app:edge # {"$imagepolicy": "flux-system:my-app-edge"}
```

## Using Image Pull Policy

When working with fixed tags, ensure your Kubernetes deployment uses the correct image pull policy:

```yaml
containers:
  - name: my-app
    image: docker.io/myorg/my-app:latest
    imagePullPolicy: Always
```

The `Always` pull policy ensures Kubernetes checks the registry for the latest digest every time a pod starts, rather than using a cached image.

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
kubectl -n flux-system get imagepolicy my-app-latest -o jsonpath='{.status.latestImage}'
```

## Conclusion

Fixed tag digest tracking in Flux lets you monitor when mutable tags like `latest` or `stable` point to new images. While the configuration is straightforward using `filterTags` with an exact pattern, the deployment side requires additional handling because Kubernetes does not automatically roll out pods when the tag name stays the same. For production workloads, consider whether unique immutable tags would better serve your deployment pipeline and provide clearer auditability.
