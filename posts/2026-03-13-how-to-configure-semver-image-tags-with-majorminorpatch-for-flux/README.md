# How to Configure SemVer Image Tags with Major.Minor.Patch for Flux

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Flux, SemVer, image-automation, ImagePolicy, GitOps, Kubernetes

Description: Learn how to configure Flux ImagePolicy to track container image tags following the Major.Minor.Patch semantic versioning pattern.

---

## Introduction

Flux image automation allows you to automatically update container image tags in your Git repository when new images are pushed to a registry. One of the most common tagging schemes is semantic versioning (SemVer), which follows the Major.Minor.Patch format like `1.2.3`. By configuring Flux ImagePolicy with a SemVer policy, you can control exactly which version ranges your deployments track.

This guide shows you how to set up an ImageRepository and ImagePolicy to track images tagged with the standard Major.Minor.Patch format, and how to constrain updates to specific version ranges.

## Prerequisites

- A Kubernetes cluster with Flux v2 installed
- The image-reflector-controller and image-automation-controller components deployed
- A container registry with images tagged using SemVer format
- A GitRepository source configured in Flux

## Setting Up the ImageRepository

The ImageRepository tells Flux which container registry and image to scan for tags:

```yaml
apiVersion: image.toolkit.fluxcd.io/v1beta2
kind: ImageRepository
metadata:
  name: my-app
  namespace: flux-system
spec:
  image: docker.io/myorg/my-app
  interval: 5m
  accessFrom:
    namespaceSelectors:
      - matchLabels:
          kubernetes.io/metadata.name: default
```

This resource scans the `docker.io/myorg/my-app` repository every five minutes and makes the tag list available to ImagePolicy resources.

## Configuring Basic SemVer ImagePolicy

The simplest SemVer policy selects the latest image whose tag matches a version range:

```yaml
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
      range: ">=1.0.0"
```

This policy selects the highest SemVer tag that is `1.0.0` or greater. If your registry contains tags `1.0.0`, `1.1.0`, `1.2.3`, and `2.0.0`, it will select `2.0.0`.

## Constraining to a Major Version

To track only a specific major version, use a range constraint:

```yaml
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
      range: ">=1.0.0 <2.0.0"
```

This selects the highest tag within the `1.x.x` range. If the registry has `1.0.0`, `1.5.2`, `1.9.1`, and `2.0.0`, it picks `1.9.1`. This is useful when you want to receive patch and minor updates but avoid breaking changes in a new major version.

You can also use the shorthand tilde and caret operators:

```yaml
apiVersion: image.toolkit.fluxcd.io/v1beta2
kind: ImagePolicy
metadata:
  name: my-app-minor
  namespace: flux-system
spec:
  imageRepositoryRef:
    name: my-app
  policy:
    semver:
      range: "^1.0.0"
```

The caret `^1.0.0` is equivalent to `>=1.0.0 <2.0.0`, allowing minor and patch updates within major version 1.

## Constraining to a Minor Version

To only receive patch updates for a specific minor version:

```yaml
apiVersion: image.toolkit.fluxcd.io/v1beta2
kind: ImagePolicy
metadata:
  name: my-app-patch-only
  namespace: flux-system
spec:
  imageRepositoryRef:
    name: my-app
  policy:
    semver:
      range: "~1.5.0"
```

The tilde `~1.5.0` is equivalent to `>=1.5.0 <1.6.0`. This is the most conservative approach, only accepting patch-level updates within the `1.5.x` line.

## Pinning an Exact Version

If you need to pin to an exact version and only update when you change the policy:

```yaml
apiVersion: image.toolkit.fluxcd.io/v1beta2
kind: ImagePolicy
metadata:
  name: my-app-pinned
  namespace: flux-system
spec:
  imageRepositoryRef:
    name: my-app
  policy:
    semver:
      range: "1.5.2"
```

This selects only the exact tag `1.5.2`.

## Marking Deployments for Image Updates

For the image automation controller to know which container images to update, you need to add a marker comment in your deployment manifest:

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: my-app
  namespace: default
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
          image: docker.io/myorg/my-app:1.0.0 # {"$imagepolicy": "flux-system:my-app"}
```

The comment `# {"$imagepolicy": "flux-system:my-app"}` tells the image automation controller to update this line with the tag selected by the `my-app` ImagePolicy in the `flux-system` namespace.

## Setting Up ImageUpdateAutomation

To complete the automation loop, configure the ImageUpdateAutomation resource:

```yaml
apiVersion: image.toolkit.fluxcd.io/v1beta2
kind: ImageUpdateAutomation
metadata:
  name: my-app-automation
  namespace: flux-system
spec:
  interval: 10m
  sourceRef:
    kind: GitRepository
    name: my-repo
  git:
    checkout:
      ref:
        branch: main
    commit:
      author:
        name: flux-bot
        email: flux@example.com
      messageTemplate: |
        Update images via {{ .AutomationObject }}

        {{ range .Changed.Changes -}}
        - {{ .OldValue }} -> {{ .NewValue }}
        {{ end -}}
    push:
      branch: main
  update:
    path: ./clusters/production
    strategy: Setters
```

This resource checks every ten minutes for ImagePolicy changes, updates the deployment manifests in the specified path, commits the changes, and pushes to the main branch.

## Verifying the Configuration

Check that your ImageRepository is scanning successfully:

```bash
flux get image repository my-app
```

Check the current selected tag from the ImagePolicy:

```bash
flux get image policy my-app
```

Check the automation status:

```bash
flux get image update my-app-automation
```

## Conclusion

Configuring SemVer image tags with Major.Minor.Patch format in Flux gives you precise control over which versions your deployments track. Using range constraints like caret and tilde operators, you can choose between receiving all updates, only minor and patch updates, or only patch updates. Combined with ImageUpdateAutomation, this creates a fully automated pipeline that keeps your deployments up to date while respecting the version boundaries you define.
