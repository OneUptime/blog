# How to Use GitHub Container Registry (ghcr.io) with Podman

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Podman, Container, DevOps, Registry, GitHub, GHCR, CI/CD

Description: A practical guide to using GitHub Container Registry with Podman for pulling, pushing, and managing container images in GitHub workflows.

---

> GitHub Container Registry integrates container image hosting directly into your GitHub workflow, and Podman supports it fully.

GitHub Container Registry (ghcr.io) allows you to host container images alongside your source code on GitHub. It supports public and private images, fine-grained permissions, and integrates with GitHub Actions. This guide shows you how to use ghcr.io with Podman.

---

## Using Fully Qualified ghcr.io Image Names

You usually do not need to add ghcr.io to Podman's search registries. Podman recommends fully qualified image references, which all examples in this guide use.

```bash
# Check current search registries

podman info -f '{{index .Registries "search"}}'

# Fully qualified ghcr.io references work without changing registries.conf
podman pull ghcr.io/github/super-linter:latest
```

## Authenticating to ghcr.io

GitHub Container Registry uses personal access tokens (classic) for command-line authentication.

```bash
# Create a PAT (classic) at https://github.com/settings/tokens
# Scopes depend on the task:
# read:packages to pull images
# write:packages to push images
# delete:packages to delete images

# Login with your PAT
echo "$GITHUB_PAT" | podman login ghcr.io \
  --username YOUR_GITHUB_USERNAME \
  --password-stdin

# Verify login
podman login ghcr.io --get-login
```

## Pulling Images from ghcr.io

Pull public and private images from GitHub Container Registry.

```bash
# Pull a public image
podman pull ghcr.io/github/super-linter:latest

# Pull from a specific user or organization
podman pull ghcr.io/myorg/myapp:latest

# Pull a specific version
podman pull ghcr.io/myorg/myapp:v2.1.0

# Pull by digest
podman pull ghcr.io/myorg/myapp@sha256:abc123...

# List pulled ghcr.io images
podman images | grep ghcr.io
```

## Pushing Images to ghcr.io

Build and push images to your GitHub Container Registry.

```bash
# Build a local image
podman build -t myapp:latest .

# Tag the image for ghcr.io
# Format: ghcr.io/OWNER/IMAGE_NAME:TAG
podman tag myapp:latest ghcr.io/myusername/myapp:latest
podman tag myapp:latest ghcr.io/myusername/myapp:v1.0.0

# Push the image
podman push ghcr.io/myusername/myapp:latest
podman push ghcr.io/myusername/myapp:v1.0.0

# Push to an organization
podman tag myapp:latest ghcr.io/myorg/myapp:latest
podman push ghcr.io/myorg/myapp:latest
```

## Using with GitHub Actions

Podman works in GitHub Actions for building and pushing to ghcr.io.

```yaml
# .github/workflows/build-push.yml
name: Build and Push Container Image
on:
  push:
    branches: [main]

jobs:
  build:
    runs-on: ubuntu-latest
    permissions:
      contents: read
      packages: write
    steps:
      - uses: actions/checkout@v4
      - name: Login and push with Podman
        run: |
          echo "${{ secrets.GITHUB_TOKEN }}" | \
            podman login ghcr.io \
              --username ${{ github.actor }} \
              --password-stdin
          podman build -t ghcr.io/${{ github.repository }}:${{ github.sha }} .
          podman push ghcr.io/${{ github.repository }}:${{ github.sha }}
```

```bash
# The GITHUB_TOKEN is automatically available in GitHub Actions
# Grant the job packages: write so Podman can push to ghcr.io
# If the package already exists, link it to the repository so
# GITHUB_TOKEN can push to it
```

## Managing Image Visibility

Control whether your ghcr.io images are public or private.

```bash
# When you first publish a package from the command line,
# the default visibility is private
# Packages created by a workflow with GITHUB_TOKEN inherit
# the repository visibility and permissions model
# To make an image public, use the GitHub web interface:
# 1. Go to your profile > Packages
# 2. Select the package
# 3. Go to Package Settings > Danger Zone
# 4. Change visibility to Public

# Verify public access by pulling without authentication
podman logout ghcr.io
podman pull ghcr.io/myusername/public-image:latest
```

## Inspecting Images on ghcr.io

Use skopeo to inspect images without pulling them.

```bash
# Inspect a public image
skopeo inspect docker://ghcr.io/github/super-linter:latest

# Inspect a private image (requires authentication)
skopeo inspect --creds "myuser:${GITHUB_PAT}" \
  docker://ghcr.io/myorg/private-app:latest

# List available tags
skopeo list-tags docker://ghcr.io/myorg/myapp
```

## Deleting Images from ghcr.io

Remove old or unused images from the registry.

```bash
# Use the GitHub API to delete image versions
# List versions of a package
curl -s -H "Authorization: Bearer ${GITHUB_PAT}" \
  -H "Accept: application/vnd.github+json" \
  -H "X-GitHub-Api-Version: 2026-03-10" \
  "https://api.github.com/user/packages/container/myapp/versions" | \
  python3 -m json.tool | head -30

# Delete a specific version by ID
curl -X DELETE -H "Authorization: Bearer ${GITHUB_PAT}" \
  -H "Accept: application/vnd.github+json" \
  -H "X-GitHub-Api-Version: 2026-03-10" \
  "https://api.github.com/user/packages/container/myapp/versions/VERSION_ID"
```

## Multi-Platform Builds for ghcr.io

Build and push multi-architecture images.

```bash
# Building for a non-native architecture requires emulation software on the host

# Create a multi-platform manifest
podman manifest create ghcr.io/myusername/myapp:latest

# Build for amd64
podman build --platform linux/amd64 \
  -t ghcr.io/myusername/myapp:latest-amd64 .
podman manifest add ghcr.io/myusername/myapp:latest \
  containers-storage:ghcr.io/myusername/myapp:latest-amd64

# Build for arm64
podman build --platform linux/arm64 \
  -t ghcr.io/myusername/myapp:latest-arm64 .
podman manifest add ghcr.io/myusername/myapp:latest \
  containers-storage:ghcr.io/myusername/myapp:latest-arm64

# Push the multi-platform manifest
podman manifest push --all ghcr.io/myusername/myapp:latest \
  docker://ghcr.io/myusername/myapp:latest
```

## Linking Packages to Repositories

Add a label to your Dockerfile to link the image to a GitHub repository.

```dockerfile
# Add this label to your Dockerfile
LABEL org.opencontainers.image.source="https://github.com/myusername/myapp"
```

```bash
# Build with the label
podman build -t ghcr.io/myusername/myapp:latest .

# Push - the image will be linked to the repository on GitHub
podman push ghcr.io/myusername/myapp:latest
```

## Summary

GitHub Container Registry (ghcr.io) integrates container image hosting with your GitHub repositories. Podman supports ghcr.io fully through standard registry authentication using personal access tokens (classic) or the automatic GITHUB_TOKEN in GitHub Actions. You can push public and private images, build multi-platform manifests, and manage image lifecycle through the GitHub API. Link images to repositories using OCI labels in your Dockerfile for better discoverability.
