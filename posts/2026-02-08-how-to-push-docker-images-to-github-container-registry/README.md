# How to Push Docker Images to GitHub Container Registry

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Docker, GitHub, GHCR, GitHub Container Registry, CI/CD, DevOps, GitHub Actions

Description: Learn how to push Docker images to GitHub Container Registry with personal access tokens, GitHub Actions, and repository-level access control.

---

GitHub Container Registry (GHCR) stores Docker images alongside your source code on GitHub. Images are linked to your user account or organization and can be connected to specific repositories. The biggest advantage over Docker Hub is the generous free tier for public images and seamless integration with GitHub Actions. If your code lives on GitHub, GHCR is a natural fit.

## How GHCR Works

GHCR is part of GitHub Packages. It hosts OCI-compliant container images at `ghcr.io`. Images can be public (free, unlimited) or private (included in your GitHub plan's Packages allowance). Each image can be linked to a repository for better discoverability and access control.

The image naming convention:

```
ghcr.io/OWNER/IMAGE_NAME:TAG
```

Where OWNER is your GitHub username or organization name.

## Authentication

GHCR requires authentication for pushes and for pulling private images. You have two options: personal access tokens (PAT) and GitHub Actions tokens.

### Personal Access Token (for local development)

Create a PAT with the `write:packages` scope:

1. Go to GitHub Settings > Developer settings > Personal access tokens > Tokens (classic)
2. Create a new token with `write:packages` and `read:packages` scopes
3. Copy the token

```bash
# Login to GHCR using your PAT
echo YOUR_GITHUB_PAT | docker login ghcr.io -u YOUR_GITHUB_USERNAME --password-stdin

# Verify the login
docker pull ghcr.io/library/hello-world 2>/dev/null && echo "Login successful"
```

### GitHub Actions Token (for CI/CD)

In GitHub Actions, use the built-in `GITHUB_TOKEN`:

```yaml
- name: Login to GHCR
  uses: docker/login-action@v3
  with:
    registry: ghcr.io
    username: ${{ github.actor }}
    password: ${{ secrets.GITHUB_TOKEN }}
```

The `GITHUB_TOKEN` has write:packages permission by default in workflows.

## Building and Pushing an Image

```bash
# Build with the GHCR tag
docker build -t ghcr.io/myusername/myapp:v1.0.0 .

# Push to GHCR
docker push ghcr.io/myusername/myapp:v1.0.0

# Tag and push latest
docker tag ghcr.io/myusername/myapp:v1.0.0 ghcr.io/myusername/myapp:latest
docker push ghcr.io/myusername/myapp:latest
```

For organizations:

```bash
# Organization image
docker build -t ghcr.io/my-org/myapp:v1.0.0 .
docker push ghcr.io/my-org/myapp:v1.0.0
```

## Complete GitHub Actions Workflow

Here is a production-ready workflow that builds, pushes, and links the image to the repository:

```yaml
# .github/workflows/build-push-ghcr.yml
name: Build and Push to GHCR
on:
  push:
    branches: [main]
  release:
    types: [published]

env:
  REGISTRY: ghcr.io
  IMAGE_NAME: ${{ github.repository }}  # e.g., myusername/myapp

jobs:
  build-push:
    runs-on: ubuntu-latest

    # Required permissions for pushing to GHCR
    permissions:
      contents: read
      packages: write

    steps:
      - uses: actions/checkout@v4

      # Login to GHCR
      - name: Login to GHCR
        uses: docker/login-action@v3
        with:
          registry: ${{ env.REGISTRY }}
          username: ${{ github.actor }}
          password: ${{ secrets.GITHUB_TOKEN }}

      # Extract metadata for image tags and labels
      - name: Extract metadata
        id: meta
        uses: docker/metadata-action@v5
        with:
          images: ${{ env.REGISTRY }}/${{ env.IMAGE_NAME }}
          tags: |
            type=sha
            type=ref,event=branch
            type=semver,pattern={{version}}
            type=semver,pattern={{major}}.{{minor}}
            type=raw,value=latest,enable={{is_default_branch}}

      # Set up Docker Buildx for advanced features
      - name: Set up Buildx
        uses: docker/setup-buildx-action@v3

      # Build and push with caching
      - name: Build and Push
        uses: docker/build-push-action@v5
        with:
          context: .
          push: true
          tags: ${{ steps.meta.outputs.tags }}
          labels: ${{ steps.meta.outputs.labels }}
          cache-from: type=gha
          cache-to: type=gha,mode=max
```

This workflow uses the metadata-action to generate smart tags. On a push to main, it tags as `latest` and with the commit SHA. On a release, it creates semantic version tags like `v1.2.3` and `v1.2`.

## Linking Images to Repositories

Add a label in your Dockerfile to link the image to a repository:

```dockerfile
# Add this label to your Dockerfile
LABEL org.opencontainers.image.source=https://github.com/myusername/myapp
```

This label tells GHCR which repository the image belongs to. The image then appears in the repository's Packages tab, and repository collaborators automatically get pull access.

## Visibility and Access Control

By default, new images are private. Change visibility from the GitHub UI or CLI:

```bash
# Using the GitHub CLI to manage package visibility
gh api -X PATCH /user/packages/container/myapp/versions \
  --field visibility=public

# Or from the Packages settings page on GitHub:
# https://github.com/users/USERNAME/packages/container/myapp/settings
```

For private images, grant access to specific users or teams:

```bash
# Add a collaborator to a private image
gh api -X PUT /user/packages/container/myapp/collaborators/USERNAME \
  --field permission=read
```

## Pulling from GHCR

Public images can be pulled without authentication:

```bash
# Pull a public image (no login needed)
docker pull ghcr.io/myusername/myapp:latest

# Private images require authentication
echo YOUR_PAT | docker login ghcr.io -u USERNAME --password-stdin
docker pull ghcr.io/myusername/myapp:latest
```

For Kubernetes, create an image pull secret:

```bash
# Create a secret for pulling from GHCR
kubectl create secret docker-registry ghcr-secret \
    --docker-server=ghcr.io \
    --docker-username=YOUR_USERNAME \
    --docker-password=YOUR_PAT

# Reference the secret in your deployment
```

```yaml
# k8s/deployment.yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: myapp
spec:
  replicas: 2
  selector:
    matchLabels:
      app: myapp
  template:
    metadata:
      labels:
        app: myapp
    spec:
      imagePullSecrets:
        - name: ghcr-secret
      containers:
        - name: myapp
          image: ghcr.io/myusername/myapp:v1.0.0
          ports:
            - containerPort: 8080
```

## Multi-Architecture Builds

Build and push images for multiple platforms:

```yaml
# In your GitHub Actions workflow
- name: Set up QEMU
  uses: docker/setup-qemu-action@v3

- name: Set up Buildx
  uses: docker/setup-buildx-action@v3

- name: Build and Push Multi-Arch
  uses: docker/build-push-action@v5
  with:
    context: .
    platforms: linux/amd64,linux/arm64
    push: true
    tags: ghcr.io/myusername/myapp:latest
```

## Cleanup and Retention

Old image versions consume storage. Clean them up:

```bash
# List all versions of a package
gh api /user/packages/container/myapp/versions | jq '.[].id'

# Delete a specific version
gh api -X DELETE /user/packages/container/myapp/versions/VERSION_ID

# Delete untagged versions (cleanup script)
UNTAGGED=$(gh api /user/packages/container/myapp/versions \
  --jq '.[] | select(.metadata.container.tags | length == 0) | .id')

for ID in $UNTAGGED; do
  echo "Deleting untagged version $ID"
  gh api -X DELETE "/user/packages/container/myapp/versions/$ID"
done
```

Automate cleanup with a scheduled workflow:

```yaml
# .github/workflows/cleanup-ghcr.yml
name: Cleanup Old Images
on:
  schedule:
    - cron: '0 3 * * 0'  # Weekly on Sunday at 3 AM

jobs:
  cleanup:
    runs-on: ubuntu-latest
    permissions:
      packages: write
    steps:
      - name: Delete old untagged images
        uses: actions/delete-package-versions@v5
        with:
          package-name: myapp
          package-type: container
          min-versions-to-keep: 10
          delete-only-untagged-versions: true
```

## Comparing GHCR with Docker Hub

GHCR wins on cost for public images (entirely free with no pull rate limits) and on integration with GitHub Actions. Docker Hub wins on discoverability and community. Many teams use both: GHCR for their private application images and Docker Hub for base images and open-source projects.

GitHub Container Registry is the simplest way to store Docker images when your code is on GitHub. The `GITHUB_TOKEN` authentication eliminates credential management, the metadata-action generates smart tags automatically, and the build cache through GitHub Actions speeds up builds significantly. For most GitHub-based projects, GHCR is the default choice.
