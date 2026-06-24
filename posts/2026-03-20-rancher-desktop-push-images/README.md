# How to Push Images to Registries from Rancher Desktop

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Rancher Desktop, Container Registry, Image, Docker Hub, Push

Description: Configure authentication and push locally built container images to Docker Hub, GCR, or private registries.

## Introduction

Rancher Desktop is an open-source desktop application that provides Kubernetes and container management tools for local development. It bundles `rdctl`, `nerdctl`, and the Docker CLI, and supports either containerd or Moby (dockerd) as the active container engine. This guide covers how to authenticate to a registry and push locally built images from Rancher Desktop.

## Prerequisites

- Rancher Desktop installed on macOS, Windows, or Linux
- A registry account such as Docker Hub, Google Artifact Registry, or a private registry
- Administrator/sudo privileges if required for installation
- At least 8 GB of RAM (16 GB recommended)
- At least 4 CPU cores
- Google Cloud CLI installed if you plan to push to Google Artifact Registry

## Overview

Rancher Desktop can push images using the CLI that matches the active container engine:

- `nerdctl` when Rancher Desktop is using `containerd`
- `docker` when Rancher Desktop is using `moby`
- `rdctl` for checking and changing Rancher Desktop settings
- `containerd` namespaces when using `nerdctl`; if you build an image in `k8s.io`, use the same namespace when you tag or push it

## Step 1: Initial Setup

```bash
# Verify Rancher Desktop is installed
rdctl version

# Inspect the current Rancher Desktop settings
rdctl list-settings

# Verify the image CLI you plan to use
nerdctl version
# or
docker version
```

## Step 2: Configuration

Open Rancher Desktop Preferences to configure:

- **Container Engine**: `containerd` for `nerdctl`, or `moby` for `docker`
- **Virtual Machine**: CPU, memory, and disk allocation
- **Kubernetes**: Optional for image pushes, but relevant if you want locally built images available to the cluster
- **WSL** (Windows only): WSL2 integration settings

```bash
# Switch to the containerd runtime for nerdctl
rdctl set --container-engine.name containerd

# Switch to the Moby runtime for docker
rdctl set --container-engine.name moby
```

## Step 3: Build and Tag Images

```bash
# Build a local image
nerdctl build -t my-app:latest .
# or
docker build -t my-app:latest .

# Tag for Docker Hub
nerdctl tag my-app:latest DOCKERHUB_USERNAME/my-app:latest
# or
docker tag my-app:latest DOCKERHUB_USERNAME/my-app:latest

# Tag for a private registry
nerdctl tag my-app:latest registry.example.com/team/my-app:latest
# or
docker tag my-app:latest registry.example.com/team/my-app:latest
```

## Step 4: Authenticate to the Registry

```bash
# Docker Hub
echo "$DOCKERHUB_TOKEN" | nerdctl login -u DOCKERHUB_USERNAME --password-stdin
# or
echo "$DOCKERHUB_TOKEN" | docker login -u DOCKERHUB_USERNAME --password-stdin

# Google Artifact Registry
gcloud auth configure-docker us-west1-docker.pkg.dev

# Private registry
echo "$REGISTRY_PASSWORD" | nerdctl login registry.example.com -u USERNAME --password-stdin
# or
echo "$REGISTRY_PASSWORD" | docker login registry.example.com -u USERNAME --password-stdin
```

## Step 5: Push the Image

```bash
# Push to Docker Hub
nerdctl push DOCKERHUB_USERNAME/my-app:latest
# or
docker push DOCKERHUB_USERNAME/my-app:latest

# Push to Google Artifact Registry
docker tag my-app:latest \
  us-west1-docker.pkg.dev/PROJECT-ID/REPOSITORY/my-app:latest
docker push \
  us-west1-docker.pkg.dev/PROJECT-ID/REPOSITORY/my-app:latest

# Push to a private registry
nerdctl push registry.example.com/team/my-app:latest
# or
docker push registry.example.com/team/my-app:latest
```

## Common Configuration Tasks

```bash
# Show the current Rancher Desktop settings
rdctl list-settings

# Gracefully stop Rancher Desktop
rdctl shutdown

# Start Rancher Desktop with the current settings
rdctl start
```

## Troubleshooting

```bash
# Linux only: initialize pass before using docker login or nerdctl login
gpg --generate-key
pass init YOUR_GPG_KEY_ID

# If the image was built in the Kubernetes namespace, use the same namespace when pushing
nerdctl --namespace k8s.io images
nerdctl --namespace k8s.io push DOCKERHUB_USERNAME/my-app:latest

# Reset Rancher Desktop completely
rdctl reset --factory
```

## Conclusion

Rancher Desktop makes it straightforward to build, tag, authenticate, and push container images from a local machine. By choosing the correct container engine and using either `nerdctl` or `docker`, you can push images to Docker Hub, Google Artifact Registry, or private registries without leaving the Rancher Desktop workflow.
