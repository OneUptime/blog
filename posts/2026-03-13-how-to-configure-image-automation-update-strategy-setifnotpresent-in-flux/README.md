# How to Configure Image Automation Update Strategy SetIfNotPresent in Flux

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Flux, Image-automation, Update-Strategy, Setifnotpresent, GitOps, Kubernetes

Description: Learn how to configure Flux ImageUpdateAutomation with the SetIfNotPresent update strategy to only set image tags when they are not already defined.

---

## Introduction

Flux ImageUpdateAutomation supports an update strategy that controls how image tags are written into your manifests. The supported `Setters` strategy updates marked image fields whenever an ImagePolicy selects a new version.

If you want automation to stop changing image tags after initialization, Flux does not provide a `SetIfNotPresent` update strategy. Instead, initialize the image tag with the standard `Setters` strategy and then suspend the ImageUpdateAutomation or remove the image policy marker from the manifest.

## Prerequisites

- A Kubernetes cluster with Flux v2 installed
- The image-reflector-controller and image-automation-controller deployed
- ImagePolicies configured for your container images
- Deployment manifests with image policy markers

## Understanding Update Strategies

Flux supports one update strategy:

- **Setters** (default) - Replaces the marked image value when the ImagePolicy selects a new version. This is the standard continuous deployment behavior.

There is no `SetIfNotPresent` strategy in the current Flux ImageUpdateAutomation API. Setting `strategy: SetIfNotPresent` would be rejected by the ImageUpdateAutomation CRD validation.

## Configuring Setters

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
      messageTemplate: "chore: update image tags"
    push:
      branch: main
  update:
    path: ./clusters/production
    strategy: Setters
```

The `strategy: Setters` field can also be omitted because `Setters` is the default strategy.

## How Setters Works

Consider a deployment manifest with an image policy marker:

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
          image: docker.io/myorg/my-app:1.2.2 # {"$imagepolicy": "flux-system:my-app"}
```

With `Setters`, Flux will update the marked image value to the tag selected by the ImagePolicy, producing:

```yaml
          image: docker.io/myorg/my-app:1.2.3 # {"$imagepolicy": "flux-system:my-app"}
```

On subsequent runs, if the ImagePolicy selects `1.2.4`, the manifest will be updated again because the marker tells Flux to keep the field in sync with the policy.

## Use Cases for Setters

### Initializing New Deployments

When you add a new application to your cluster, you may want automation to set the current image tag:

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: new-service
spec:
  template:
    spec:
      containers:
        - name: new-service
          image: docker.io/myorg/new-service:0.1.0 # {"$imagepolicy": "flux-system:new-service"}
```

The automation updates the tag selected by the ImagePolicy. If the team wants to manage subsequent updates manually, suspend the ImageUpdateAutomation or remove the marker after the initial commit.

### Template Repositories

In a template repository that gets cloned for new projects, use the standard marker format and let `Setters` update image fields after ImagePolicies are configured.

### Controlled Rollouts

Teams that want manual control over upgrades can use ImagePolicy constraints, push updates to a separate branch for review, or suspend the ImageUpdateAutomation when automatic commits should stop.

## Comparing Setters and Manual Control

Here is a side-by-side comparison:

```yaml
# With strategy: Setters
# Run 1: image: myorg/app:1.2.2 -> image: myorg/app:1.2.3
# Run 2 (new version): image: myorg/app:1.2.3 -> image: myorg/app:1.2.4
# Run 3 (new version): image: myorg/app:1.2.4 -> image: myorg/app:1.3.0

# With manual control after initialization
# Run 1: image: myorg/app:1.2.2 -> image: myorg/app:1.2.3
# Then suspend ImageUpdateAutomation or remove the marker.
# Later versions are applied by manual Git commits or reviewed pull requests.
```

## Switching Between Strategies

Flux currently supports `Setters` as the ImageUpdateAutomation update strategy:

```yaml
spec:
  update:
    path: ./clusters/production
    strategy: Setters
```

To stop automatic updates, suspend the ImageUpdateAutomation:

```yaml
spec:
  suspend: true
```

You can also remove the image policy marker from a specific manifest field if only that field should stop being updated.

## Using Setters with Multiple Environments

A pattern where staging uses continuous updates and production uses controlled automation:

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
  name: production-updates
  namespace: flux-system
spec:
  interval: 10m
  suspend: true
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
      messageTemplate: "chore: update production image tags"
    push:
      branch: main
  update:
    path: ./clusters/production
    strategy: Setters
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

Flux ImageUpdateAutomation uses the `Setters` update strategy to keep marked image fields aligned with the latest version selected by ImagePolicy. A `SetIfNotPresent` strategy is not available in the current Flux API. For workflows that need automated initialization followed by manual control, use `Setters` for the initial update and then suspend the ImageUpdateAutomation, remove selected markers, or route updates through a review branch.
