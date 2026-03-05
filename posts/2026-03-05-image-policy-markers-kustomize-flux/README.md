# How to Use Image Policy Markers in Kustomize Files for Flux

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Flux CD, GitOps, Kubernetes, Image Policy, Kustomize, Image Automation

Description: Learn how to place image policy markers in Kustomize overlays and patches so Flux can automatically update container images across environments.

---

Kustomize is a widely adopted tool for managing Kubernetes manifest variations across environments. When combined with Flux image automation, you can use image policy markers within Kustomize files to automatically update container image references. However, placing markers in Kustomize files requires understanding how Kustomize processes overlays, patches, and image transformers. In this post, we will cover the correct way to use image policy markers in various Kustomize file types.

## How Flux Image Automation Works with Kustomize

Flux image automation uses the Setters strategy to find and replace image references in your Git repository. It scans YAML files for image policy markers (inline comments) and updates the image value on the same line. This process operates directly on the raw YAML files in your repository, not on the rendered Kustomize output. This distinction is important because Flux modifies the source files before Kustomize processes them.

## Markers in Base Manifests

The simplest approach is placing markers in your base Kustomize manifests. Given a directory structure like this:

```
my-repo/
  base/
    kustomization.yaml
    deployment.yaml
  overlays/
    staging/
      kustomization.yaml
    production/
      kustomization.yaml
```

You can place markers directly in `base/deployment.yaml`:

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: my-app
spec:
  replicas: 1
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
          image: ghcr.io/my-org/my-app:1.0.0 # {"$imagepolicy": "flux-system:my-app-policy"}
          ports:
            - containerPort: 8080
```

When Flux updates this file, the change propagates to all overlays that reference this base.

## Markers in Kustomize Patches

If you need different image versions per environment, place markers in overlay-specific patches instead of the base. Here is a strategic merge patch in `overlays/production/deployment-patch.yaml`:

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: my-app
spec:
  template:
    spec:
      containers:
        - name: app
          image: ghcr.io/my-org/my-app:1.0.0 # {"$imagepolicy": "flux-system:my-app-production-policy"}
```

And the corresponding `overlays/production/kustomization.yaml`:

```yaml
apiVersion: kustomize.config.k8s.io/v1beta1
kind: Kustomization
resources:
  - ../../base
patches:
  - path: deployment-patch.yaml
```

For staging, create a separate patch with a different image policy:

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: my-app
spec:
  template:
    spec:
      containers:
        - name: app
          image: ghcr.io/my-org/my-app:0.9.0 # {"$imagepolicy": "flux-system:my-app-staging-policy"}
```

This setup allows each environment to track a different image version independently.

## Markers in JSON Patches

Flux also detects markers in JSON 6902 patches. Here is an example using a JSON patch in `overlays/production/image-patch.yaml`:

```yaml
- op: replace
  path: /spec/template/spec/containers/0/image
  value: ghcr.io/my-org/my-app:1.0.0 # {"$imagepolicy": "flux-system:my-app-production-policy"}
```

Reference this patch in your kustomization:

```yaml
apiVersion: kustomize.config.k8s.io/v1beta1
kind: Kustomization
resources:
  - ../../base
patches:
  - target:
      kind: Deployment
      name: my-app
    path: image-patch.yaml
```

## Avoiding the images Transformer

Kustomize provides a built-in `images` transformer in the kustomization.yaml file:

```yaml
apiVersion: kustomize.config.k8s.io/v1beta1
kind: Kustomization
resources:
  - ../../base
images:
  - name: ghcr.io/my-org/my-app
    newTag: "1.0.0"
```

You can place markers on the `newTag` field:

```yaml
apiVersion: kustomize.config.k8s.io/v1beta1
kind: Kustomization
resources:
  - ../../base
images:
  - name: ghcr.io/my-org/my-app
    newTag: "1.0.0" # {"$imagepolicy": "flux-system:my-app-policy:tag"}
```

Note the `:tag` suffix on the marker. Since the `newTag` field only contains the tag portion, you must use the `:tag` variant to tell Flux to write only the tag value rather than the full image reference.

Similarly, if you want to update the image name:

```yaml
images:
  - name: ghcr.io/my-org/my-app
    newName: ghcr.io/my-org/my-app # {"$imagepolicy": "flux-system:my-app-policy:name"}
    newTag: "1.0.0" # {"$imagepolicy": "flux-system:my-app-policy:tag"}
```

## Setting Up Per-Environment Automation

To manage image updates per environment, create separate ImageUpdateAutomation resources with different update paths:

```yaml
apiVersion: image.toolkit.fluxcd.io/v1
kind: ImageUpdateAutomation
metadata:
  name: staging-automation
  namespace: flux-system
spec:
  interval: 15m
  sourceRef:
    kind: GitRepository
    name: my-repo
  git:
    checkout:
      ref:
        branch: main
    commit:
      author:
        name: fluxcdbot
        email: fluxcdbot@example.com
      messageTemplate: "chore: update staging images"
    push:
      branch: main
  update:
    path: ./overlays/staging
    strategy: Setters
---
apiVersion: image.toolkit.fluxcd.io/v1
kind: ImageUpdateAutomation
metadata:
  name: production-automation
  namespace: flux-system
spec:
  interval: 30m
  sourceRef:
    kind: GitRepository
    name: my-repo
  git:
    checkout:
      ref:
        branch: main
    commit:
      author:
        name: fluxcdbot
        email: fluxcdbot@example.com
      messageTemplate: "chore: update production images"
    push:
      branch: main
  update:
    path: ./overlays/production
    strategy: Setters
```

## Multi-Container Kustomize Patches

When your deployment has multiple containers, create patches with markers for each:

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: my-app
spec:
  template:
    spec:
      containers:
        - name: app
          image: ghcr.io/my-org/my-app:1.0.0 # {"$imagepolicy": "flux-system:my-app-policy"}
        - name: sidecar
          image: ghcr.io/my-org/proxy:2.0.0 # {"$imagepolicy": "flux-system:proxy-policy"}
```

## Verifying the Setup

After deploying your Kustomize files with markers, verify that Flux detects and processes them:

```bash
flux get image update --all-namespaces
```

Check the automation controller logs for any parsing errors:

```bash
kubectl logs -n flux-system deployment/image-automation-controller
```

Confirm that the correct files are being modified by checking your Git commit history after an automation run. Each commit made by Flux will show exactly which files were changed and which image tags were updated.

By combining Kustomize overlays with Flux image policy markers, you can maintain clean environment-specific image management while letting automation handle the version updates through Git.
