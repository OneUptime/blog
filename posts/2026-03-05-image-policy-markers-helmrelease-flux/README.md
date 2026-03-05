# How to Use Image Policy Markers in HelmRelease Values for Flux

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Flux CD, GitOps, Kubernetes, Image Automation, HelmRelease, Image Policy

Description: Learn how to use image policy markers in HelmRelease values so Flux image automation can update container image tags automatically.

---

## Introduction

Flux image automation can automatically update image tags in your Git repository when new container images are pushed to a registry. While many tutorials focus on plain Kubernetes manifests, production environments often rely on HelmRelease resources to deploy applications. This post explains how to place image policy markers inside HelmRelease values so that the ImageUpdateAutomation controller can find and update them.

## Prerequisites

Before you begin, ensure you have:

- A Kubernetes cluster with Flux installed
- The image-reflector-controller and image-automation-controller components deployed
- An existing ImageRepository and ImagePolicy resource configured
- A HelmRelease resource managed in a Git repository

## How Image Policy Markers Work

Image policy markers are inline comments that tell the image automation controller which field to update and which ImagePolicy to use for the new tag value. The marker format is:

```yaml
# {"$imagepolicy": "NAMESPACE:POLICY_NAME"}
```

There are also variants that extract only part of the image reference:

```yaml
# {"$imagepolicy": "NAMESPACE:POLICY_NAME:tag"}   # outputs only the tag
# {"$imagepolicy": "NAMESPACE:POLICY_NAME:name"}   # outputs only the image name
```

## Setting Up the ImageRepository and ImagePolicy

First, create an ImageRepository to scan your container registry for available tags.

```yaml
# image-repository.yaml
# Tells Flux to scan this registry for new image tags every 5 minutes
apiVersion: image.toolkit.fluxcd.io/v1
kind: ImageRepository
metadata:
  name: my-app
  namespace: flux-system
spec:
  image: ghcr.io/my-org/my-app
  interval: 5m
```

Next, create an ImagePolicy that selects which tag should be considered the latest.

```yaml
# image-policy.yaml
# Selects the latest semver tag matching 1.x.x
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
      range: "1.x.x"
```

## Placing Markers in HelmRelease Values

The key step is adding the marker comment on the same line as the value you want updated. Here is a HelmRelease with image policy markers in its inline values.

```yaml
# helmrelease.yaml
# HelmRelease with image policy markers for automatic tag updates
apiVersion: helm.toolkit.fluxcd.io/v2
kind: HelmRelease
metadata:
  name: my-app
  namespace: default
spec:
  interval: 10m
  chart:
    spec:
      chart: my-app
      version: "1.0.0"
      sourceRef:
        kind: HelmRepository
        name: my-charts
        namespace: flux-system
  values:
    image:
      repository: ghcr.io/my-org/my-app # {"$imagepolicy": "flux-system:my-app:name"}
      tag: 1.2.3 # {"$imagepolicy": "flux-system:my-app:tag"}
```

In this example, the `:name` variant updates only the repository portion and the `:tag` variant updates only the tag. When Flux detects a new image matching the policy, it will modify only the tag line, changing `1.2.3` to whatever the latest tag is.

## Using the Full Image Reference

Some Helm charts use a single `image` field instead of separate `repository` and `tag` fields. In that case, use the marker without a suffix to replace the entire image reference.

```yaml
# helmrelease-full-image.yaml
# Single image field with full image reference marker
apiVersion: helm.toolkit.fluxcd.io/v2
kind: HelmRelease
metadata:
  name: my-app
  namespace: default
spec:
  interval: 10m
  chart:
    spec:
      chart: my-app
      version: "1.0.0"
      sourceRef:
        kind: HelmRepository
        name: my-charts
        namespace: flux-system
  values:
    image: ghcr.io/my-org/my-app:1.2.3 # {"$imagepolicy": "flux-system:my-app"}
```

Here Flux will replace the entire value `ghcr.io/my-org/my-app:1.2.3` with the full image reference from the policy.

## Configuring ImageUpdateAutomation

You need an ImageUpdateAutomation resource to tell Flux where to push the updated manifests.

```yaml
# image-update-automation.yaml
# Configures Flux to commit image tag updates to the main branch
apiVersion: image.toolkit.fluxcd.io/v1
kind: ImageUpdateAutomation
metadata:
  name: flux-system
  namespace: flux-system
spec:
  interval: 10m
  sourceRef:
    kind: GitRepository
    name: flux-system
  git:
    checkout:
      ref:
        branch: main
    commit:
      author:
        email: flux@my-org.com
        name: Flux
      messageTemplate: "Update image tags: {{range .Changed.Changes}}{{.OldValue}} -> {{.NewValue}} {{end}}"
    push:
      branch: main
  update:
    path: ./clusters/my-cluster
    strategy: Setters
```

The `update.path` field tells Flux which directory to scan for marker comments. The `strategy: Setters` instructs it to use the inline marker approach.

## Working with Multiple Images in One HelmRelease

If your HelmRelease references several container images, you can place separate markers for each one.

```yaml
# helmrelease-multiple.yaml
# Multiple image markers in a single HelmRelease
apiVersion: helm.toolkit.fluxcd.io/v2
kind: HelmRelease
metadata:
  name: my-stack
  namespace: default
spec:
  interval: 10m
  chart:
    spec:
      chart: my-stack
      version: "2.0.0"
      sourceRef:
        kind: HelmRepository
        name: my-charts
        namespace: flux-system
  values:
    frontend:
      image:
        repository: ghcr.io/my-org/frontend # {"$imagepolicy": "flux-system:frontend:name"}
        tag: 1.5.0 # {"$imagepolicy": "flux-system:frontend:tag"}
    backend:
      image:
        repository: ghcr.io/my-org/backend # {"$imagepolicy": "flux-system:backend:name"}
        tag: 2.3.1 # {"$imagepolicy": "flux-system:backend:tag"}
```

Each marker references a different ImagePolicy, so Flux can update them independently.

## Verifying the Setup

After applying all resources, check that the image automation controller detects the markers.

```bash
# Check the status of the ImageUpdateAutomation
flux get image update flux-system

# Check the latest image selected by the policy
flux get image policy my-app

# View recent commits made by automation
git log --oneline -5
```

If the ImageUpdateAutomation shows a "Last run" timestamp and no errors, the markers are being processed correctly.

## Common Pitfalls

1. **Marker must be on the same line as the value.** If the comment is on a different line, Flux will not detect it.
2. **Namespace must match.** The namespace in the marker (`flux-system:my-app`) must match the namespace of the ImagePolicy resource.
3. **YAML quoting matters.** If your tag is numeric (e.g., `1234`), YAML may interpret it as an integer. Use quotes around the tag value to ensure consistent behavior.
4. **The update path must include your file.** Make sure `spec.update.path` in ImageUpdateAutomation covers the directory containing your HelmRelease YAML.

## Conclusion

Image policy markers provide a straightforward mechanism for Flux to update image tags inside HelmRelease values. By placing the correct inline comment on each image-related field, you enable fully automated image promotion through GitOps. This eliminates manual tag bumps and ensures your deployments always run the intended image version.
