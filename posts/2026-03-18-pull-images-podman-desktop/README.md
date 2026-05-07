# How to Pull Images with Podman Desktop

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Podman, Container, DevOps, Podman Desktop, Image Pull, Registry

Description: Learn how to pull container images from registries using Podman Desktop's graphical interface and the CLI.

---

> Pulling container images with Podman Desktop gives you a visual way to search, download, and manage images from any OCI-compliant registry.

Before you can run a container, you need to pull its image from a registry. Podman Desktop provides a graphical interface for pulling images that shows download progress and image details. This post covers pulling images from various registries using both Podman Desktop and the CLI.

---

## Prerequisites

Ensure Podman Desktop is installed and running.

```bash
# Verify Podman is available

podman info

# Check machine status (macOS/Windows)
podman machine list
```

## Pulling an Image with the CLI

The most direct way to pull an image is from the command line.

```bash
# Pull the latest Nginx image from Docker Hub
podman pull docker.io/library/nginx:latest

# Pull a specific version of PostgreSQL
podman pull docker.io/library/postgres:16-alpine

# Pull from Red Hat's registry
podman pull registry.access.redhat.com/ubi9/ubi:latest

# Pull from GitHub Container Registry
podman pull ghcr.io/actions/actions-runner:latest

# Pull from Quay.io
podman pull quay.io/podman/hello:latest
```

## Pulling an Image with Podman Desktop

To pull images through the graphical interface:

1. Click on "Images" in the left sidebar
2. Click the "Pull" button at the top of the Images page
3. Enter the full image reference (e.g., `docker.io/library/nginx:latest`)
4. Click "Pull" to start the download
5. Watch the progress bar as layers are downloaded

The image appears in your Images list once the pull completes.

## Pulling from Private Registries

Private registries require authentication before pulling.

```bash
# Log in to a private registry from the CLI
podman login registry.example.com
# Enter username and password when prompted

# Pull from the private registry
podman pull registry.example.com/myorg/my-app:v1.0
```

In Podman Desktop, go to Settings > Registries to add your private registry credentials. Once configured, you can pull from that registry through the GUI.

```bash
# Log in to Docker Hub (for private repositories)
podman login docker.io

# Log in to GitHub Container Registry
echo "$GITHUB_TOKEN" | podman login ghcr.io -u "$GITHUB_USER" --password-stdin

# Log in to AWS ECR
aws ecr get-login-password --region us-east-1 | \
    podman login --username AWS --password-stdin 123456789.dkr.ecr.us-east-1.amazonaws.com
```

## Pulling by Digest

For reproducible deployments, pull images by their content digest.

```bash
# Pull a specific image by digest
podman pull docker.io/library/nginx@sha256:6e23479198b998e5e25921dff8455837c7636a67111a04a635cf1bb363d199dc

# Find the digest of an image you have pulled
podman inspect docker.io/library/nginx:latest --format '{{.Digest}}'

# Use the digest in your Containerfile for reproducibility
# FROM docker.io/library/nginx@sha256:6e23479198b998e5e25921dff8455837c7636a67111a04a635cf1bb363d199dc
```

## Pulling Multiple Images

Download several images at once for a project.

```bash
#!/bin/bash
# Pull all images needed for a development environment

IMAGES=(
    "docker.io/library/nginx:alpine"
    "docker.io/library/postgres:16-alpine"
    "docker.io/library/redis:7-alpine"
    "docker.io/library/node:20-alpine"
    "docker.io/library/python:3.12-slim"
)

for image in "${IMAGES[@]}"; do
    echo "Pulling ${image}..."
    podman pull "$image"
done

echo "All images pulled successfully"
podman images
```

## Checking Pull Progress

Monitor the download progress of large images.

```bash
# Pull with visible progress output
podman pull docker.io/library/ubuntu:latest

# The output shows each layer being downloaded with progress bars
# Getting image source signatures
# Copying blob sha256:abc123... [==>     ] 15.2MiB / 78.1MiB
# Copying blob sha256:def456... done
```

In Podman Desktop, the pull dialog shows a progress indicator for the overall download.

## Managing Pulled Images

After pulling, manage your local images.

```bash
# List all pulled images
podman images

# List images with specific format
podman images --format "table {{.Repository}}\t{{.Tag}}\t{{.Size}}\t{{.Created}}"

# Check how much disk space images use
podman system df

# Remove unused images to free space
podman image prune -f

# Remove a specific image
podman rmi docker.io/library/nginx:latest
```

In Podman Desktop, the Images tab shows all local images with their size, tag, and age. You can delete images by clicking the delete icon.

## Searching for Images

Find available images before pulling them.

```bash
# Search Docker Hub for Nginx images
podman search nginx

# Search with a limit on results
podman search --limit 5 redis

# Search a specific registry
podman search registry.example.com/myapp

# Filter by official images
podman search --filter is-official=true nginx
```

## Configuring Pull Behavior

Customize how Podman handles image pulls.

```bash
# Always pull the latest version (useful in CI/CD)
podman pull --policy=always docker.io/library/nginx:latest

# Pull only if not present locally
podman pull --policy=missing docker.io/library/nginx:latest

# Pull for a specific platform
podman pull --platform linux/arm64 docker.io/library/nginx:latest
podman pull --platform linux/amd64 docker.io/library/nginx:latest
```

## Summary

Pulling images with Podman Desktop is straightforward through either the graphical Pull dialog or the `podman pull` CLI command. You can pull from public registries like Docker Hub, Quay.io, and GitHub Container Registry, or from private registries after configuring credentials. Pull by tag for convenience or by digest for reproducibility. The Images tab in Podman Desktop provides a visual overview of all your local images with options to run, inspect, tag, and delete them. Combining the GUI for exploration with the CLI for automation gives you a flexible image management workflow.
