# How to Create an ImageUpdateAutomation in Flux

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Flux CD, GitOps, Kubernetes, Image Automation, ImageUpdateAutomation, Container Registry

Description: Learn how to create an ImageUpdateAutomation resource in Flux to automatically update container image tags in your Git repository when new images are pushed.

---

Flux CD can automatically detect new container images and update your Git repository with the latest image tags. This is done through the image automation controllers, which scan container registries, evaluate policies, and commit changes back to Git. The ImageUpdateAutomation resource (from `image.toolkit.fluxcd.io/v1`) is the key component that ties everything together by defining how and where Flux writes image tag updates.

## How Image Automation Works

The image automation pipeline in Flux involves three custom resources:

1. **ImageRepository** - Scans a container registry for available image tags
2. **ImagePolicy** - Selects the latest image tag based on a policy (semver, alphabetical, numerical)
3. **ImageUpdateAutomation** - Commits the selected image tags back to the Git repository

When a new image is pushed to your registry, the ImageRepository detects it, the ImagePolicy selects it based on your criteria, and the ImageUpdateAutomation writes the updated tag to your manifests and pushes the change to Git.

## Prerequisites

- Flux CD bootstrapped with image automation controllers enabled
- A container registry with images to track
- Write access to the Git repository where manifests are stored

Install the image automation controllers if not already present:

```bash
flux install --components-extra=image-reflector-controller,image-automation-controller
```

## Step 1: Create an ImageRepository

The ImageRepository tells Flux which container registry and image to scan:

```yaml
apiVersion: image.toolkit.fluxcd.io/v1
kind: ImageRepository
metadata:
  name: my-app
  namespace: flux-system
spec:
  image: ghcr.io/my-org/my-app
  interval: 5m
  secretRef:
    name: ghcr-credentials
```

If your registry requires authentication, create the secret:

```bash
kubectl create secret docker-registry ghcr-credentials \
  --docker-server=ghcr.io \
  --docker-username=YOUR_USERNAME \
  --docker-password=YOUR_TOKEN \
  -n flux-system
```

Verify the ImageRepository is scanning:

```bash
flux get image repository my-app
```

## Step 2: Create an ImagePolicy

The ImagePolicy defines how Flux selects the "latest" tag. For semantic versioning:

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

For numerical timestamps (common in CI/CD pipelines that tag images with build numbers):

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
    numerical:
      order: asc
  filterTags:
    pattern: '^main-(?P<ts>[0-9]+)$'
    extract: '$ts'
```

Check the selected image:

```bash
flux get image policy my-app
```

## Step 3: Add Image Policy Markers to Your Manifests

Flux needs to know which fields in your YAML files should be updated. Add marker comments to your Kubernetes manifests:

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: my-app
  namespace: default
spec:
  template:
    spec:
      containers:
        - name: my-app
          image: ghcr.io/my-org/my-app:1.0.0 # {"$imagepolicy": "flux-system:my-app"}
```

The marker `{"$imagepolicy": "flux-system:my-app"}` tells the image automation controller to update this field with the image selected by the `my-app` ImagePolicy in the `flux-system` namespace.

You can also update just the tag portion:

```yaml
image: ghcr.io/my-org/my-app:1.0.0 # {"$imagepolicy": "flux-system:my-app:tag"}
```

## Step 4: Create the ImageUpdateAutomation

Now create the ImageUpdateAutomation resource that commits changes to Git:

```yaml
apiVersion: image.toolkit.fluxcd.io/v1
kind: ImageUpdateAutomation
metadata:
  name: my-app-automation
  namespace: flux-system
spec:
  interval: 30m
  sourceRef:
    kind: GitRepository
    name: flux-system
  git:
    checkout:
      ref:
        branch: main
    commit:
      author:
        name: fluxbot
        email: fluxbot@my-org.com
      messageTemplate: |
        Automated image update

        Automation name: {{ .AutomationObject }}

        Files:
        {{ range $filename, $_ := .Changed.FileChanges -}}
        - {{ $filename }}
        {{ end -}}

        Objects:
        {{ range $resource, $changes := .Changed.Objects -}}
        - {{ $resource.Kind }}/{{ $resource.Name }} ({{ $resource.Namespace }})
        {{ range $change := $changes -}}
          - {{ $change.OldValue }} -> {{ $change.NewValue }}
        {{ end -}}
        {{ end -}}
    push:
      branch: main
  update:
    path: ./clusters/my-cluster
    strategy: Setters
```

Key fields explained:

- **sourceRef** - Points to the GitRepository that contains your manifests
- **git.checkout.ref.branch** - The branch to read from
- **git.push.branch** - The branch to push updates to (can differ from checkout branch for PR-based workflows)
- **update.path** - The directory to scan for image policy markers
- **update.strategy** - Must be `Setters` (the only supported strategy in v1beta2)
- **git.commit.messageTemplate** - Go template for the commit message

## Step 5: Push to a Different Branch for PR Workflows

If you want image updates to go through a pull request instead of pushing directly to main:

```yaml
spec:
  git:
    checkout:
      ref:
        branch: main
    push:
      branch: flux-image-updates
```

Then configure your CI system or use a GitHub Action to automatically create a pull request from `flux-image-updates` to `main`.

## Step 6: Verify the Automation

Check the status of the ImageUpdateAutomation:

```bash
flux get image update my-app-automation
```

You should see output showing the last automation run and any images that were updated. Check the Git log:

```bash
git log --oneline -5
```

Look for commits from the fluxbot author with the automated image update message.

## Troubleshooting

If the automation is not working, check the controller logs:

```bash
kubectl logs -n flux-system deploy/image-automation-controller -f
```

Common issues include:

- Missing or incorrect image policy markers in YAML files
- Insufficient Git credentials for pushing commits
- The update path not matching the location of your manifests
- Image policy not selecting any tags due to filter patterns

Verify each component individually:

```bash
flux get image repository my-app
flux get image policy my-app
flux get image update my-app-automation
```

## Summary

The ImageUpdateAutomation resource in Flux (`image.toolkit.fluxcd.io/v1`) automates the process of updating container image tags in your Git repository. By combining ImageRepository scanning, ImagePolicy selection, and ImageUpdateAutomation commits, you create a fully automated pipeline where pushing a new container image triggers an automatic update to your Kubernetes manifests. Use PR-based workflows for production environments to maintain human oversight over automated changes.
