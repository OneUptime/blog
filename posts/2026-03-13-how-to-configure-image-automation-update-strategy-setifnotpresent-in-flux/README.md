# How to Configure Image Automation Update Strategy SetIfNotPresent in Flux

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Flux, Image-automation, Update-Strategy, Setifnotpresent, GitOps, Kubernetes

Description: Learn how to configure Flux ImageUpdateAutomation with the SetIfNotPresent update strategy to only set image tags when they are not already defined.

---

## Introduction

Flux ImageUpdateAutomation supports different update strategies that control how image tags are written into your manifests. The default `Setters` strategy updates image tags whenever a new version is detected by an ImagePolicy. The `SetIfNotPresent` strategy takes a more conservative approach: it only writes an image tag if the field is currently empty or missing, leaving existing values untouched.

This strategy is useful for initializing manifests with image tags during first deployment while allowing manual control afterward, or for templates where you want automation to fill in defaults without overwriting intentional customizations.

## Prerequisites

- A Kubernetes cluster with Flux v2 installed
- The image-reflector-controller and image-automation-controller deployed
- ImagePolicies configured for your container images
- Deployment manifests with image policy markers

## Understanding Update Strategies

Flux supports two update strategies:

- **Setters** (default) - Replaces the image tag value every time the ImagePolicy selects a new version. This is the standard continuous deployment behavior.
- **SetIfNotPresent** - Only writes the image tag if the current value in the manifest is empty, a placeholder, or not yet set. Once a value exists, it is not overwritten.

## Configuring SetIfNotPresent

```yaml
apiVersion: image.toolkit.fluxcd.io/v1
kind: ImageUpdateAutomation
metadata:
  name: image-updates
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
        name: Flux Bot
        email: flux@example.com
      messageTemplate: "chore: initialize image tags"
    push:
      branch: main
  update:
    path: ./clusters/production
    strategy: SetIfNotPresent
```

The only change from the default configuration is `strategy: SetIfNotPresent` in the `update` section.

## How SetIfNotPresent Works

Consider a deployment manifest with an empty or placeholder image tag:

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
          image: docker.io/myorg/my-app # {"$imagepolicy": "flux-system:my-app"}
```

Notice the image reference has no tag. With `SetIfNotPresent`, Flux will add the tag selected by the ImagePolicy, producing:

```yaml
          image: docker.io/myorg/my-app:1.2.3 # {"$imagepolicy": "flux-system:my-app"}
```

On subsequent runs, even if the ImagePolicy selects `1.2.4`, the manifest will not be updated because a value (`1.2.3`) is already present.

## Use Cases for SetIfNotPresent

### Initializing New Deployments

When you add a new application to your cluster, you may want automation to set the initial image tag but then let the team control updates manually:

```yaml
# New deployment added without a specific tag
apiVersion: apps/v1
kind: Deployment
metadata:
  name: new-service
spec:
  template:
    spec:
      containers:
        - name: new-service
          image: docker.io/myorg/new-service # {"$imagepolicy": "flux-system:new-service"}
```

The automation fills in the latest tag on the first run, then the team manages subsequent updates through manual commits.

### Template Repositories

In a template repository that gets cloned for new projects, `SetIfNotPresent` fills in initial values without overwriting customizations in existing clones.

### Controlled Rollouts

Teams that want automated initial deployment but manual control over upgrades can use `SetIfNotPresent` to bootstrap deployments while retaining manual approval for version bumps.

## Comparing Setters and SetIfNotPresent

Here is a side-by-side comparison:

```yaml
# With strategy: Setters
# Run 1: image: myorg/app -> image: myorg/app:1.2.3
# Run 2 (new version): image: myorg/app:1.2.3 -> image: myorg/app:1.2.4
# Run 3 (new version): image: myorg/app:1.2.4 -> image: myorg/app:1.3.0

# With strategy: SetIfNotPresent
# Run 1: image: myorg/app -> image: myorg/app:1.2.3
# Run 2 (new version): image: myorg/app:1.2.3 (unchanged)
# Run 3 (new version): image: myorg/app:1.2.3 (unchanged)
```

## Switching Between Strategies

You can switch from `SetIfNotPresent` to `Setters` when you want to enable continuous updates:

```yaml
spec:
  update:
    path: ./clusters/production
    strategy: Setters
```

The next automation run will update all image tags to the latest versions selected by their ImagePolicies.

You can also switch from `Setters` to `SetIfNotPresent` to freeze current versions and prevent further automatic updates.

## Using SetIfNotPresent with Multiple Environments

A pattern where staging uses continuous updates and production uses controlled initialization:

```yaml
apiVersion: image.toolkit.fluxcd.io/v1
kind: ImageUpdateAutomation
metadata:
  name: staging-updates
  namespace: flux-system
spec:
  interval: 5m
  sourceRef:
    kind: GitRepository
    name: my-repo
  git:
    checkout:
      ref:
        branch: main
    commit:
      author:
        name: Flux Bot
        email: flux@example.com
      messageTemplate: "chore: update staging images"
    push:
      branch: main
  update:
    path: ./clusters/staging
    strategy: Setters
---
apiVersion: image.toolkit.fluxcd.io/v1
kind: ImageUpdateAutomation
metadata:
  name: production-init
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
        name: Flux Bot
        email: flux@example.com
      messageTemplate: "chore: initialize production image tags"
    push:
      branch: main
  update:
    path: ./clusters/production
    strategy: SetIfNotPresent
```

## Verifying the Strategy

Check the automation configuration:

```bash
kubectl -n flux-system get imageupdateautomation image-updates -o yaml | grep strategy
```

Monitor the automation for updates:

```bash
flux get image update image-updates
```

## Conclusion

The `SetIfNotPresent` update strategy in Flux ImageUpdateAutomation provides a conservative approach to image tag management. It initializes missing tags with the latest version from ImagePolicy but does not overwrite existing values. This is useful for bootstrapping new deployments, template repositories, and workflows where teams want automated initialization followed by manual control. You can switch between strategies at any time to adjust the level of automation based on your team's needs.
