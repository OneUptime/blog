# How to Use kubectl with Rancher Desktop

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Rancher Desktop, kubectl, Kubernetes, CLI, Local Development

Description: Configure kubectl to work with Rancher Desktop's local Kubernetes cluster for development and testing.

## Introduction

Rancher Desktop is an open-source desktop application that provides Kubernetes and container management tools for local development. It bundles kubectl, Helm, nerdctl, and either containerd or Moby (dockerd) into a single, easy-to-use application. This guide covers How to Use kubectl with Rancher Desktop in detail.

## Prerequisites

- A supported Rancher Desktop host OS: macOS 13 or later, Windows 11/Windows Server 2025 with WSL2, or a supported Linux distribution with `/dev/kvm` access
- Administrator/sudo privileges may be required for installation
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

# If these commands are not found on macOS/Linux, ensure ~/.rd/bin is on your PATH

# Verify kubectl is using Rancher Desktop's local cluster
kubectl config use-context rancher-desktop

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
- **Virtual Machine** (macOS/Linux): CPU, memory, and disk allocation
- **WSL** (Windows only): WSL2 integration settings

```bash
# Use rdctl for command-line configuration
# Example: switch to a supported Kubernetes version shown in Preferences > Kubernetes
rdctl set --kubernetes-version 1.34.3
rdctl set --container-engine containerd
```

## Step 3: Working with Containers

```bash
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
# Reset Rancher Desktop to factory defaults
rdctl reset --factory

# Check Rancher Desktop information
rdctl info

# Show current Rancher Desktop settings
rdctl list-settings

# Example: update Kubernetes to a supported version shown in Preferences > Kubernetes
rdctl set --kubernetes-version 1.34.3
```

## Troubleshooting

```bash
# Check Rancher Desktop logs
# macOS: ~/Library/Logs/rancher-desktop/
# Windows: %LOCALAPPDATA%\rancher-desktop\logs\
# Linux: ~/.local/share/rancher-desktop/logs/

# Reset to factory defaults
rdctl reset --factory

# Inspect current Rancher Desktop settings
rdctl list-settings
```

## Conclusion

How to Use kubectl with Rancher Desktop with Rancher Desktop provides a powerful, integrated local development experience. Rancher Desktop eliminates the need for multiple separate tools by bundling everything needed for Kubernetes and container development into a single application. Whether you're building microservices, testing Helm charts, or learning Kubernetes, Rancher Desktop provides a production-like environment on your local machine.
