# How to Build Container Images with Rancher Desktop

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Rancher Desktop, Container Image, Build, nerdctl, Docker

Description: Build container images locally using Rancher Desktop's integrated container runtime without needing Docker Desktop.

## Introduction

Rancher Desktop is an open-source desktop application that provides Kubernetes and container management tools for local development. It bundles kubectl, Helm, nerdctl, and either containerd or Moby (dockerd) into a single, easy-to-use application. This guide covers How to Build Container Images with Rancher Desktop in detail.

## Prerequisites

- A supported macOS, Windows, or Linux system
- Internet connectivity during installation and first-time setup
- Virtualization support; on Windows, WSL2 installed; on Linux, read-write access to `/dev/kvm`
- 8 GB of RAM recommended
- 4 CPU cores recommended

## Overview

Rancher Desktop simplifies local Kubernetes and container development by providing:

- A local Kubernetes cluster (k3s-based)
- Container runtime (containerd or dockerd)
- Integrated CLI tools (kubectl, helm, nerdctl, docker)
- Simple configuration through a GUI

## Step 1: Initial Setup

```bash
# Verify Rancher Desktop is installed and running

rdctl version

# Check Kubernetes cluster status
kubectl cluster-info

# Verify container runtime
nerdctl version
# or
docker version
```

## Step 2: Configuration

Open Rancher Desktop Preferences to configure:

- **Kubernetes**: Version and enabled/disabled state
- **Container Engine**: containerd or moby (dockerd)
- **Virtual Machine**: CPU, memory, and disk allocation
- **WSL** (Windows only): WSL2 integration settings

```bash
# Inspect the current Rancher Desktop settings
rdctl list-settings

# Example: switch Rancher Desktop to the containerd engine
rdctl set --container-engine.name=containerd

# Example: disable Kubernetes if you only need local image builds
rdctl set --kubernetes-enabled=false
```

## Step 3: Working with Containers

```bash
# Build an image from a local Dockerfile
nerdctl build -t my-image:latest .

# To make a nerdctl-built image available to Kubernetes, use the k8s.io namespace
nerdctl --namespace k8s.io build -t my-image:latest .
# or with docker compatibility
docker build -t my-image:latest .

# Pull an image
nerdctl pull nginx:latest
# or with docker compatibility
docker pull nginx:latest

# Run a container
nerdctl run -d -p 8080:80 --name my-nginx nginx:latest

# List running containers
nerdctl ps

# View container logs
nerdctl logs my-nginx

# Stop and remove
nerdctl stop my-nginx
nerdctl rm my-nginx
```

## Step 4: Working with Kubernetes

```bash
# Check cluster nodes
kubectl get nodes

# Deploy a test application
kubectl create deployment hello-world \
  --image=nginx:latest

# Expose the deployment
kubectl expose deployment hello-world \
  --port=80 \
  --type=NodePort

# Check the service
kubectl get svc hello-world

# Forward local port to the service
kubectl port-forward svc/hello-world 8080:80 &

# Test the application
curl http://localhost:8080

# Clean up
kubectl delete deployment hello-world
kubectl delete svc hello-world
```

## Step 5: Using Helm

```bash
# Rancher Desktop includes Helm
helm version

# Add a chart repository
helm repo add bitnami https://charts.bitnami.com/bitnami
helm repo update

# Install a chart
helm install my-release bitnami/nginx

# List installed releases
helm list

# Uninstall
helm uninstall my-release
```

## Common Configuration Tasks

```bash
# Show Rancher Desktop information
rdctl info

# List current Rancher Desktop settings
rdctl list-settings

# Disable Kubernetes if you only need local image builds
rdctl set --kubernetes-enabled=false

# Switch to the Moby engine for Docker CLI workflows
rdctl set --container-engine.name=moby
```

## Troubleshooting

```bash
# Open Rancher Desktop log files from the UI
# Troubleshooting > Show Logs

# Reset Kubernetes or perform a factory reset from the UI
# Troubleshooting > Reset Kubernetes
# Troubleshooting > Factory Reset

# Confirm Rancher Desktop is responding
rdctl info

# Inspect the current settings
rdctl list-settings
```

## Conclusion

How to Build Container Images with Rancher Desktop with Rancher Desktop provides a powerful, integrated local development experience. Rancher Desktop eliminates the need for multiple separate tools by bundling everything needed for Kubernetes and container development into a single application. Whether you're building microservices, testing Helm charts, or learning Kubernetes, Rancher Desktop provides a production-like environment on your local machine.
