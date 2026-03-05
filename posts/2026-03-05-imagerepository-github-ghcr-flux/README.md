# How to Configure ImageRepository for GitHub Container Registry in Flux

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Flux CD, GitOps, Kubernetes, Image Automation, ImageRepository, GitHub Container Registry, GHCR

Description: Learn how to configure a Flux ImageRepository to scan GitHub Container Registry (GHCR) for container image tags.

---

GitHub Container Registry (GHCR) is a container image hosting service integrated with GitHub. It uses the `ghcr.io` hostname and supports both public and private images. This guide shows you how to configure Flux ImageRepository resources to scan GHCR for image tags.

## Prerequisites

- A Kubernetes cluster with Flux and image automation controllers installed
- A GitHub account with packages (container images) published to GHCR
- A GitHub Personal Access Token (PAT) with `read:packages` scope for private images
- kubectl access to your cluster

## Understanding GHCR Image References

GHCR images follow this format: `ghcr.io/<owner>/<image-name>`. The owner can be a GitHub user or organization. For example:

- `ghcr.io/myuser/my-app`
- `ghcr.io/my-org/my-service`

Public GHCR images can be scanned without authentication, but private images require a Personal Access Token.

## Step 1: Scan a Public GHCR Image

For public images, no authentication is needed.

```yaml
# imagerepository-ghcr-public.yaml
# Scan a public GHCR image
apiVersion: image.toolkit.fluxcd.io/v1
kind: ImageRepository
metadata:
  name: my-public-app
  namespace: flux-system
spec:
  image: ghcr.io/my-org/my-public-app
  interval: 5m0s
```

Apply the manifest.

```bash
# Apply the public GHCR ImageRepository
kubectl apply -f imagerepository-ghcr-public.yaml
```

## Step 2: Create a GitHub Personal Access Token

For private images, create a Personal Access Token (PAT) with the `read:packages` scope.

1. Go to GitHub Settings > Developer settings > Personal access tokens > Tokens (classic).
2. Generate a new token with `read:packages` scope.
3. Copy the token value.

Alternatively, use a fine-grained token with read access to the specific packages.

## Step 3: Create a Kubernetes Secret for GHCR

Store the GitHub PAT as a docker-registry Secret.

```bash
# Create a docker-registry secret for GHCR authentication
kubectl create secret docker-registry ghcr-credentials \
  --docker-server=ghcr.io \
  --docker-username=your-github-username \
  --docker-password=ghp_your-personal-access-token \
  -n flux-system
```

## Step 4: Scan a Private GHCR Image

Reference the credentials Secret in the ImageRepository.

```yaml
# imagerepository-ghcr-private.yaml
# Scan a private GHCR image with authentication
apiVersion: image.toolkit.fluxcd.io/v1
kind: ImageRepository
metadata:
  name: my-private-app
  namespace: flux-system
spec:
  image: ghcr.io/my-org/my-private-app
  interval: 5m0s
  secretRef:
    name: ghcr-credentials
```

Apply the manifest.

```bash
# Apply the private GHCR ImageRepository
kubectl apply -f imagerepository-ghcr-private.yaml
```

## Step 5: Scan Multiple GHCR Images

If you have multiple images in the same organization, create an ImageRepository for each. They can share the same credentials Secret.

```yaml
# imagerepository-ghcr-multi.yaml
# Multiple ImageRepository resources for different GHCR images
apiVersion: image.toolkit.fluxcd.io/v1
kind: ImageRepository
metadata:
  name: frontend
  namespace: flux-system
spec:
  image: ghcr.io/my-org/frontend
  interval: 5m0s
  secretRef:
    name: ghcr-credentials
---
apiVersion: image.toolkit.fluxcd.io/v1
kind: ImageRepository
metadata:
  name: backend
  namespace: flux-system
spec:
  image: ghcr.io/my-org/backend
  interval: 5m0s
  secretRef:
    name: ghcr-credentials
---
apiVersion: image.toolkit.fluxcd.io/v1
kind: ImageRepository
metadata:
  name: worker
  namespace: flux-system
spec:
  image: ghcr.io/my-org/worker
  interval: 5m0s
  secretRef:
    name: ghcr-credentials
```

## Step 6: Use a GitHub App Token (Alternative)

For organizations, a GitHub App token may be preferred over a personal access token. Install a GitHub App with read access to packages, then use the app's installation token.

```bash
# Create a secret with a GitHub App installation token
kubectl create secret docker-registry ghcr-app-credentials \
  --docker-server=ghcr.io \
  --docker-username=x-access-token \
  --docker-password=ghs_your-app-installation-token \
  -n flux-system
```

Note that GitHub App installation tokens expire and must be refreshed periodically.

## Step 7: Configure Tag Exclusions

Filter out unwanted tags from the scan results.

```yaml
# imagerepository-ghcr-filtered.yaml
# Scan GHCR with tag exclusions
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
  exclusionList:
    # Exclude SHA-based tags from GitHub Actions
    - "^sha-"
    # Exclude branch name tags
    - "^main$"
    - "^develop$"
    # Exclude PR tags
    - "^pr-"
```

## Step 8: Verify the GHCR ImageRepository

```bash
# Check the status of GHCR image repositories
flux get image repository -n flux-system

# Get detailed status
kubectl describe imagerepository my-private-app -n flux-system
```

## Step 9: Use Flux CLI to Generate the Manifest

```bash
# Generate an ImageRepository for a GHCR image
flux create image repository my-app \
  --image=ghcr.io/my-org/my-app \
  --interval=5m \
  --secret-ref=ghcr-credentials \
  --namespace=flux-system \
  --export > imagerepository-ghcr.yaml
```

## Troubleshooting

- **403 Forbidden**: The PAT may not have the `read:packages` scope. Generate a new token with the correct permissions.
- **Package not found**: Ensure the image path matches the GHCR package name exactly, including the organization or user prefix.
- **Token expired**: GitHub App installation tokens expire. Use a refresh mechanism or switch to a long-lived PAT.

```bash
# Check logs for GHCR-related errors
kubectl logs -n flux-system deployment/image-reflector-controller | grep -i "ghcr\|github\|forbidden"
```

## Summary

You have configured Flux to scan GitHub Container Registry for image tags. GHCR integrates well with GitHub-based workflows, and using a PAT with `read:packages` scope provides the necessary access for private images. With the ImageRepository in place, you can create ImagePolicy resources to select the right tag and automate your deployments.
