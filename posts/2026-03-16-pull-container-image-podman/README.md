# How to Pull a Container Image with Podman

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Podman, Container, DevOps, Container Image

Description: Learn how to pull container images using Podman, including basic pull commands, specifying tags, and verifying downloaded images on your local system.

---

> Pulling container images with Podman is straightforward and follows a familiar syntax that Docker users will recognize immediately.

Podman is a daemonless container engine that provides a Docker-compatible command-line interface for managing containers and images. One of the most fundamental operations you will perform is pulling container images from registries. This guide walks you through pulling images with Podman, from the simplest commands to more specific use cases.

---

## Prerequisites

Before you begin, make sure Podman is installed on your system.

```bash
# Check if Podman is installed

podman --version

# On Fedora/RHEL/CentOS
sudo dnf install -y podman

# On Ubuntu/Debian
sudo apt-get install -y podman

# On macOS with Homebrew
brew install podman
podman machine init --now
```

## Pulling an Image with the Default Tag

The simplest way to pull an image is to specify just the image name. Podman will pull the `latest` tag by default.

```bash
# Pull the latest nginx image
podman pull nginx

# Podman may prompt you to select a registry if multiple are configured
# Choose docker.io/library/nginx for the official Docker Hub image
```

When you run this command, Podman resolves the image name against your configured registries, downloads each layer, and stores the image locally.

## Pulling an Image with a Specific Tag

Most production workflows require pulling a specific version of an image rather than relying on `latest`.

```bash
# Pull a specific version of nginx
podman pull nginx:1.25

# Pull a specific version of Python
podman pull python:3.12-slim

# Pull an Alpine-based Node.js image
podman pull node:20-alpine
```

## Pulling with a Fully Qualified Image Name

To avoid ambiguity about which registry an image comes from, use the fully qualified image name.

```bash
# Pull from Docker Hub explicitly
podman pull docker.io/library/nginx:1.25

# Pull from Red Hat registry
podman pull registry.access.redhat.com/ubi9/ubi:latest

# Pull from Quay.io
podman pull quay.io/prometheus/prometheus:latest
```

Using fully qualified names is considered a best practice because it removes any guesswork about the image source.

## Verifying a Pulled Image

After pulling an image, confirm it is available locally.

```bash
# List all local images
podman images

# Check for a specific image
podman images nginx

# Get detailed information about the pulled image
podman inspect nginx:1.25
```

The output of `podman images` shows the repository, tag, image ID, creation date, and size of each local image.

## Understanding the Pull Process

When Podman pulls an image, it downloads individual layers that make up the image filesystem. Each layer is cached locally, so subsequent pulls that share layers will be faster.

```bash
# Pull with verbose output to see layer downloads
podman --log-level=debug pull nginx:1.25

# Check the storage location of pulled images
podman info | grep -A 5 "graphRoot"
```

## Pulling Images as a Non-Root User

One of Podman's key advantages is rootless operation. Images pulled as a non-root user are stored in a user-specific location.

```bash
# Pull an image without sudo (rootless mode)
podman pull alpine:3.19

# Check where rootless images are stored
podman info --format '{{.Store.GraphRoot}}'
# Typically outputs: /home/<user>/.local/share/containers/storage
```

Rootless images are isolated per user, meaning images pulled by one user are not visible to another.

## Configuring Default Registries

You can configure which registries Podman searches when you pull an image without a fully qualified name.

```bash
# View current registry configuration
cat /etc/containers/registries.conf

# For rootless users, create a user-specific config
mkdir -p ~/.config/containers/
cat > ~/.config/containers/registries.conf << 'EOF'
unqualified-search-registries = ["docker.io", "quay.io"]
EOF
```

This configuration tells Podman to search Docker Hub and Quay.io when you use short image names.

## Handling Pull Errors

Common issues and how to resolve them.

```bash
# If you get a "manifest unknown" error, check available tags
podman search --list-tags docker.io/library/nginx | head -20

# If you get a TLS error with a private registry
podman pull --tls-verify=false myregistry.local:5000/myimage:latest

# If you need to authenticate first
podman login docker.io
# Enter your username and password when prompted

# Then pull the image
podman pull docker.io/myuser/private-image:latest
```

## Summary

Pulling container images with Podman is a simple and essential skill for container workflows. Always use specific tags and fully qualified image names in production environments to ensure reproducibility. Podman's rootless capabilities make it a secure choice for pulling and managing container images without requiring elevated privileges.
