# How to Configure Rancher Desktop with WSL2

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Rancher Desktop, WSL2, Window, Linux, Development

Description: Optimize Rancher Desktop integration with Windows Subsystem for Linux 2 for seamless Windows development.

## Introduction

Rancher Desktop is an open-source desktop application that provides Kubernetes and container management tools for local development. It bundles kubectl, Helm, nerdctl, and either containerd or Moby (dockerd) into a single, easy-to-use application. This guide covers How to Configure Rancher Desktop with WSL2 in detail.

## Prerequisites

- A Windows 11 machine with the latest updates and WSL installed
- Administrator privileges may be required during installation
- At least 8 GB of RAM (16 GB recommended)
- At least 4 CPU cores

## Overview

Rancher Desktop simplifies local Kubernetes and container development by providing:

- A local Kubernetes cluster (k3s-based)
- Container runtime (containerd or dockerd)
- Integrated CLI tools (kubectl, helm, and either nerdctl or docker depending on the selected engine)
- Simple configuration through a GUI

## Step 1: Initial Setup

```bash
# Verify Rancher Desktop is installed and running from WSL

rdctl.exe version

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
- **WSL** (Windows only): WSL2 integration settings; CPU and memory allocation are configured globally in WSL

```bash
# Use rdctl.exe from a WSL shell for command-line configuration
rdctl.exe set --kubernetes-version 1.34.3
rdctl.exe set --container-engine containerd
```

## Step 3: Working with Containers

```bash
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
# Delete deployed Kubernetes workloads
rdctl.exe reset --k8s

# Show current Rancher Desktop settings
rdctl.exe list-settings

# Update Kubernetes version via CLI
rdctl.exe set --kubernetes-version 1.34.3

# Switch container engine via CLI
rdctl.exe set --container-engine containerd
```

## Troubleshooting

```bash
# Open Rancher Desktop and use Troubleshooting > Show Logs

# Reset to factory defaults
rdctl.exe reset --factory

# Check WSL distribution status
wsl.exe -l -v
```

## Conclusion

How to Configure Rancher Desktop with WSL2 with Rancher Desktop provides a powerful, integrated local development experience. Rancher Desktop eliminates the need for multiple separate tools by bundling everything needed for Kubernetes and container development into a single application. Whether you're building microservices, testing Helm charts, or learning Kubernetes, Rancher Desktop provides a production-like environment on your local machine.
