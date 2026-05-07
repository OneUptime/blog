# How to Copy Images Between Registries with Skopeo and Podman

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Podman, Container, DevOps, Skopeo, Registry, Image Management

Description: Learn how to use Skopeo alongside Podman to copy container images between different registries without pulling them locally first.

---

> Skopeo lets you copy images between registries without storing them in local container storage first, saving disk space and workflow time compared to the traditional pull-tag-push workflow.

Moving container images between registries is a common task in production environments. Whether you are migrating from Docker Hub to a private registry or syncing images across environments, Skopeo provides a streamlined approach. Unlike traditional methods that require pulling an image into local container storage before pushing it elsewhere, Skopeo copies images between registries without that local storage step. This guide shows you how to combine Skopeo with Podman for efficient image management.

---

## Installing Skopeo

Before copying images, you need Skopeo installed on your system. It is typically available through your distribution's package manager.

```bash
# Install Skopeo on Fedora/RHEL/CentOS

sudo dnf install -y skopeo

# Install Skopeo on Ubuntu/Debian
sudo apt-get update && sudo apt-get install -y skopeo

# Install Skopeo on macOS via Homebrew
brew install skopeo

# Verify the installation
skopeo --version
```

## Understanding Skopeo Copy Syntax

The `skopeo copy` command uses transport prefixes to identify the source and destination of images.

```bash
# Basic syntax for copying between registries
# docker:// prefix refers to a remote registry (Docker, Quay, etc.)
skopeo copy \
  docker://source-registry.example.com/myimage:latest \
  docker://dest-registry.example.com/myimage:latest
```

Common transport types include:

- `docker://` for remote Docker-compatible registries
- `containers-storage:` for local Podman/CRI-O storage
- `dir:` for a local directory layout
- `oci:` for OCI layout directories

## Copying Images Between Public Registries

You can copy images from one registry to another without authentication only if the source allows anonymous pulls and the destination allows anonymous pushes.

```bash
# Copy an nginx image from Docker Hub to Quay.io
skopeo copy \
  docker://docker.io/library/nginx:1.25 \
  docker://quay.io/myorg/nginx:1.25

# Copy a specific architecture image using the --override-arch flag
skopeo copy \
  --override-arch arm64 \
  docker://docker.io/library/alpine:3.19 \
  docker://quay.io/myorg/alpine:3.19-arm64
```

## Copying with Authentication via Podman

When working with private registries, you can leverage Podman's authentication. Skopeo uses the same containers auth configuration that Podman uses.

```bash
# Log in to the source registry using Podman
podman login source-registry.example.com

# Log in to the destination registry using Podman
podman login dest-registry.example.com

# Now copy the image - Skopeo uses the same auth file
skopeo copy \
  docker://source-registry.example.com/myapp:v2.1 \
  docker://dest-registry.example.com/myapp:v2.1

# You can also specify the auth file explicitly
skopeo copy \
  --authfile "${XDG_RUNTIME_DIR}/containers/auth.json" \
  docker://source-registry.example.com/myapp:v2.1 \
  docker://dest-registry.example.com/myapp:v2.1
```

## Copying Multi-Architecture Images

Skopeo supports copying multi-architecture manifest lists, which is essential for cross-platform deployments.

```bash
# Copy an entire multi-arch manifest list
skopeo copy \
  --all \
  docker://docker.io/library/python:3.12-slim \
  docker://registry.internal.com/python:3.12-slim

# Verify the copied manifest list
skopeo inspect \
  --raw \
  docker://registry.internal.com/python:3.12-slim | jq .
```

## Copying with TLS and Insecure Registries

In development environments, you may work with registries that use self-signed certificates or no TLS at all.

```bash
# Copy to an insecure (HTTP) registry
skopeo copy \
  --dest-tls-verify=false \
  docker://docker.io/library/redis:7 \
  docker://localhost:5000/redis:7

# Copy from an insecure source to a secure destination
skopeo copy \
  --src-tls-verify=false \
  docker://dev-registry:5000/myapp:dev \
  docker://prod-registry.example.com/myapp:dev

# Use custom certificates for registries with self-signed certs
skopeo copy \
  --dest-cert-dir=/etc/containers/certs.d/registry.example.com \
  docker://docker.io/library/node:20 \
  docker://registry.example.com/node:20
```

## Scripting Bulk Image Copies

For large-scale migrations, you can script the copy process to handle many images at once.

```bash
#!/bin/bash
# bulk-copy.sh - Copy a list of images from one registry to another

SOURCE_REGISTRY="docker.io/library"
DEST_REGISTRY="registry.internal.com"

# Define the images to copy
IMAGES=(
  "nginx:1.25"
  "redis:7"
  "postgres:16"
  "python:3.12-slim"
  "node:20-alpine"
)

# Loop through each image and copy it
for IMAGE in "${IMAGES[@]}"; do
  echo "Copying ${IMAGE}..."
  skopeo copy \
    --all \
    "docker://${SOURCE_REGISTRY}/${IMAGE}" \
    "docker://${DEST_REGISTRY}/${IMAGE}"

  # Check if the copy succeeded
  if [ $? -eq 0 ]; then
    echo "Successfully copied ${IMAGE}"
  else
    echo "Failed to copy ${IMAGE}" >&2
  fi
done

echo "Bulk copy complete."
```

```bash
# Make the script executable and run it
chmod +x bulk-copy.sh
./bulk-copy.sh
```

## Summary

Skopeo is an indispensable companion to Podman for managing container images across registries. It copies images directly between registries without requiring local storage, supports multi-architecture manifests, handles authentication seamlessly through shared auth files with Podman, and works with both secure and insecure registries. For teams managing images across multiple environments, scripting Skopeo copy operations can automate and simplify large-scale migrations.
