# How to Use Rancher Desktop for Microservices Development

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Rancher Desktop, Microservice, Kubernetes, Local Development, Service Mesh

Description: Build and test microservices architectures locally using Rancher Desktop with service meshes and API gateways.

## Introduction

Rancher Desktop is an open-source desktop application that provides Kubernetes and container management tools for local development. It bundles kubectl, Helm, nerdctl, and either containerd or Moby (dockerd) into a single, easy-to-use application. This guide covers How to Use Rancher Desktop for Microservices Development in detail.

## Prerequisites

- A supported version of macOS, Windows, or Linux
- Virtualization support and a persistent internet connection
- Administrator/sudo privileges may be required for installation
- Windows Subsystem for Linux 2 (Windows only)
- 8 GB of RAM recommended
- 4 CPU cores recommended

## Overview

Rancher Desktop simplifies local Kubernetes and container development by providing:

- A local Kubernetes cluster (k3s)
- Container runtime (containerd or dockerd)
- Integrated CLI tools (kubectl, helm, nerdctl, and the Docker CLI depending on the selected container engine)
- Simple configuration through a GUI

## Step 1: Initial Setup

```bash
# Verify the Rancher Desktop CLI is installed

rdctl version

# Check Kubernetes cluster status
kubectl cluster-info

# Verify the container runtime CLI
# when using containerd
nerdctl version
# or
# when using Moby
docker version
```

## Step 2: Configuration

Open Rancher Desktop Preferences to configure:

- **Kubernetes**: Version and enabled/disabled state
- **Container Engine**: containerd or Moby (dockerd)
- **Virtual Machine** (macOS and Linux): CPU and memory allocation
- **WSL** (Windows only): WSL2 integration settings

```bash
# Use rdctl for command-line configuration
# Use a Kubernetes version available in your Rancher Desktop release
rdctl set --kubernetes.version=1.34.3
rdctl set --container-engine.name=containerd
```

## Step 3: Working with Containers

```bash
# The following examples use nerdctl with the containerd engine

# Pull an image
nerdctl pull nginx:latest

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

# Show Rancher Desktop version and VM IP
rdctl info

# Show current Rancher Desktop settings
rdctl list-settings

# Update Kubernetes version via CLI
# Use a Kubernetes version available in your Rancher Desktop release
rdctl set --kubernetes.version=1.34.3
```

## Troubleshooting

```bash
# Check Rancher Desktop logs
# Rancher Desktop UI: Troubleshooting > Show Logs
# macOS: ~/Library/Logs/rancher-desktop/
# Windows: %LOCALAPPDATA%\rancher-desktop\logs\
# Linux: ~/.local/share/rancher-desktop/logs/

# Reset to factory defaults
rdctl reset --factory

# Show Rancher Desktop version and VM IP
rdctl info
```

## Conclusion

How to Use Rancher Desktop for Microservices Development with Rancher Desktop provides a powerful, integrated local development experience. Rancher Desktop eliminates the need for multiple separate tools by bundling everything needed for Kubernetes and container development into a single application. Whether you're building microservices, testing Helm charts, or learning Kubernetes, Rancher Desktop provides a production-like environment on your local machine.
