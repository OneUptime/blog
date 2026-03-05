# How to Create an ImageRepository in Flux

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Flux CD, GitOps, Kubernetes, Image Automation, ImageRepository, Container Registry

Description: Learn how to create an ImageRepository resource in Flux to scan container registries for new image tags.

---

The ImageRepository resource in Flux tells the image reflector controller to scan a specific container image in a registry and track available tags. This is the first step in setting up automated image updates with Flux. In this guide, you will learn how to create and configure an ImageRepository resource.

## Prerequisites

Before proceeding, ensure you have:

- A running Kubernetes cluster with Flux installed
- The image reflector controller and image automation controller installed
- Access to a container registry with at least one image

## What Is an ImageRepository?

An ImageRepository is a Flux custom resource that instructs the image reflector controller to periodically scan a container image repository for available tags. The controller stores the discovered tags in the status of the ImageRepository object, which can then be used by ImagePolicy resources to select the appropriate tag.

## Step 1: Create a Basic ImageRepository

Here is a minimal ImageRepository manifest that scans a public Docker Hub image.

```yaml
# imagerepository.yaml
# Scan the nginx image on Docker Hub for available tags
apiVersion: image.toolkit.fluxcd.io/v1
kind: ImageRepository
metadata:
  name: nginx
  namespace: flux-system
spec:
  image: docker.io/library/nginx
  interval: 5m0s
```

Apply this manifest to your cluster.

```bash
# Apply the ImageRepository resource
kubectl apply -f imagerepository.yaml
```

## Step 2: Understand the Key Fields

The ImageRepository spec has several important fields:

- **image** -- The full container image reference without a tag (e.g., `docker.io/library/nginx`).
- **interval** -- How often the controller scans the registry for new tags. The format uses Go duration strings like `5m0s`, `1h0m0s`, etc.
- **secretRef** -- An optional reference to a Kubernetes Secret containing registry credentials for private images.
- **exclusionList** -- An optional list of regex patterns to exclude certain tags from being tracked.

## Step 3: Create an ImageRepository for a Private Image

If your image is in a private registry, you need to reference a Kubernetes Secret with the registry credentials.

First, create a docker-registry secret.

```bash
# Create a docker-registry secret for private registry authentication
kubectl create secret docker-registry regcred \
  --docker-server=registry.example.com \
  --docker-username=myuser \
  --docker-password=mypassword \
  -n flux-system
```

Then reference it in the ImageRepository.

```yaml
# imagerepository-private.yaml
# Scan a private image with registry credentials
apiVersion: image.toolkit.fluxcd.io/v1
kind: ImageRepository
metadata:
  name: my-app
  namespace: flux-system
spec:
  image: registry.example.com/my-org/my-app
  interval: 5m0s
  secretRef:
    name: regcred
```

Apply the manifest.

```bash
# Apply the ImageRepository for the private image
kubectl apply -f imagerepository-private.yaml
```

## Step 4: Verify the ImageRepository

Check whether the ImageRepository has been successfully scanned.

```bash
# Check the status of the ImageRepository
kubectl get imagerepository -n flux-system
```

You should see output showing the last scan time and the number of tags discovered.

For more details, describe the resource.

```bash
# Get detailed status of the ImageRepository
kubectl describe imagerepository nginx -n flux-system
```

You can also use the Flux CLI.

```bash
# List all image repositories managed by Flux
flux get image repository -n flux-system
```

## Step 5: Create an ImageRepository with Tag Exclusions

You may want to exclude certain tags from being scanned. Use the `exclusionList` field.

```yaml
# imagerepository-exclusions.yaml
# Scan the nginx image but exclude tags matching specific patterns
apiVersion: image.toolkit.fluxcd.io/v1
kind: ImageRepository
metadata:
  name: nginx
  namespace: flux-system
spec:
  image: docker.io/library/nginx
  interval: 10m0s
  exclusionList:
    # Exclude tags starting with 'sha-'
    - "^sha-"
    # Exclude the 'latest' tag
    - "^latest$"
```

## Step 6: Create an ImageRepository Using Flux CLI

You can also create an ImageRepository using the Flux CLI.

```bash
# Create an ImageRepository for the nginx image using the Flux CLI
flux create image repository nginx \
  --image=docker.io/library/nginx \
  --interval=5m \
  --namespace=flux-system \
  --export > imagerepository.yaml
```

This generates the YAML manifest which you can commit to your Git repository.

## Step 7: Store ImageRepository in Your Git Repository

For a proper GitOps workflow, store the ImageRepository manifest in your cluster configuration repository.

```yaml
# clusters/my-cluster/image-automation/imagerepository.yaml
# ImageRepository for the application image
apiVersion: image.toolkit.fluxcd.io/v1
kind: ImageRepository
metadata:
  name: my-app
  namespace: flux-system
spec:
  image: ghcr.io/my-org/my-app
  interval: 5m0s
  secretRef:
    name: ghcr-credentials
```

Commit and push this file to your repository. Flux will automatically reconcile and create the ImageRepository resource.

## Troubleshooting

If the ImageRepository shows errors, check the image reflector controller logs.

```bash
# Check logs for scanning errors
kubectl logs -n flux-system deployment/image-reflector-controller
```

Common issues include incorrect image paths, missing credentials, and network connectivity problems to the registry.

## Summary

You have learned how to create an ImageRepository in Flux. This resource is the foundation of Flux image automation, enabling the image reflector controller to discover available tags for your container images. The next step is to create an ImagePolicy that selects the desired tag from the scanned results.
