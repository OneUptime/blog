# How to Install Rancher Desktop on Windows

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Rancher Desktop, Window, Kubernetes, WSL2, Docker

Description: Set up Rancher Desktop on Windows with WSL2 integration for local Kubernetes and container development.

## Introduction

Rancher Desktop is an open-source desktop application that provides Kubernetes and container management tools for local development. It bundles kubectl, Helm, nerdctl, and either containerd or Moby (dockerd) into a single, easy-to-use application. This guide covers How to Install Rancher Desktop on Windows in detail.

## Prerequisites

- Windows 11 (including Home) or Windows Server 2025 with the latest updates
- Windows Subsystem for Linux (WSL) installed
- Virtualization enabled and a persistent internet connection
- Administrator privileges may be required during installation, especially for the Rancher Desktop Privileged Service
- At least 8 GB of RAM
- At least 4 CPU cores

## Overview

Rancher Desktop simplifies local Kubernetes and container development by providing:

- A local Kubernetes cluster (k3s-based)
- Container runtime (containerd or Moby/dockerd)
- Integrated CLI tools (kubectl, helm, nerdctl, and docker when using Moby/dockerd)
- Simple configuration through a GUI

## Step 1: Initial Setup

```bash
# Verify the Rancher Desktop CLI is installed

rdctl version

# Check Kubernetes cluster status
kubectl cluster-info

# Verify container runtime
nerdctl version
# or, if using Moby (dockerd)
docker version
```

## Step 2: Configuration

Open Rancher Desktop Preferences to configure:

- **Kubernetes**: Version and enabled/disabled state
- **Container Engine**: containerd or moby (dockerd)
- **WSL** (Windows only): WSL2 integration settings
- **Resources**: CPU and memory allocation are managed globally by WSL on Windows

```bash
# Use rdctl for command-line configuration
rdctl set --container-engine containerd
# Replace YOUR_SUPPORTED_VERSION with a version shown in Preferences > Kubernetes
rdctl set --kubernetes-version YOUR_SUPPORTED_VERSION
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
# Reset Kubernetes workloads
rdctl reset --k8s

# Check Rancher Desktop info
rdctl info

# Show current Rancher Desktop settings
rdctl list-settings

# Update Kubernetes version via CLI
rdctl set --kubernetes-version YOUR_SUPPORTED_VERSION
```

## Troubleshooting

```bash
# Open Troubleshooting > Show Logs to open the Rancher Desktop log directory

# Reset to factory defaults
rdctl reset --factory

# Show current Rancher Desktop settings
rdctl list-settings
```

## Conclusion

How to Install Rancher Desktop on Windows with Rancher Desktop provides a powerful, integrated local development experience. Rancher Desktop eliminates the need for multiple separate tools by bundling everything needed for Kubernetes and container development into a single application. Whether you're building microservices, testing Helm charts, or learning Kubernetes, Rancher Desktop provides a production-like environment on your local machine.
