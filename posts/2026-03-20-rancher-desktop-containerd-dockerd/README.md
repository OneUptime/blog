# How to Switch Between containerd and dockerd in Rancher Desktop

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Rancher Desktop, Containerd, Docker, Container Runtime

Description: Configure Rancher Desktop to use either containerd or dockerd as the container runtime for different workflows.

## Introduction

Rancher Desktop is an open-source desktop application that provides Kubernetes and container management tools for local development. It bundles kubectl, Helm, nerdctl, and either containerd or Moby (dockerd) into a single, easy-to-use application. This guide covers How to Switch Between containerd and dockerd in Rancher Desktop in detail.

## Prerequisites

- A computer running macOS, Windows, or Linux
- Administrator/sudo privileges may be required for installation or optional privileged features
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
# Verify the rdctl CLI is installed

rdctl version

# Check Kubernetes cluster status if Kubernetes is enabled
kubectl cluster-info

# Verify the active container runtime
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
# Use rdctl for command-line configuration
rdctl set --kubernetes-version 1.34.3
rdctl set --container-engine containerd
# or switch to the Docker-compatible engine
rdctl set --container-engine docker
```

## Step 3: Working with Containers

```bash
# Pull an image
nerdctl pull nginx:latest
# or with the Docker-compatible engine
docker pull nginx:latest

# Run a container
nerdctl run -d -p 8080:80 --name my-nginx nginx:latest
# or
docker run -d -p 8080:80 --name my-nginx nginx:latest

# List running containers
nerdctl ps
# or
docker ps

# View container logs
nerdctl logs my-nginx
# or
docker logs my-nginx

# Stop and remove
nerdctl stop my-nginx
nerdctl rm my-nginx
# or
docker stop my-nginx
docker rm my-nginx
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

# Forward local port to the service in a separate terminal
kubectl port-forward svc/hello-world 8080:80

# In another terminal, test the application
curl http://localhost:8080

# Stop port-forward with Ctrl+C, then clean up
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

# Check Rancher Desktop info
rdctl info

# Show current Rancher Desktop settings
rdctl list-settings

# Update Kubernetes version via CLI
rdctl set --kubernetes-version 1.34.3
```

## Troubleshooting

```bash
# Open the Rancher Desktop logs folder from Troubleshooting > Show Logs
# macOS: ~/Library/Logs/rancher-desktop/
# Windows: %LOCALAPPDATA%\rancher-desktop\
# Linux: ~/.local/share/rancher-desktop/

# Reset to factory defaults
rdctl reset --factory

# Check Rancher Desktop info and VM IP
rdctl info
```

## Conclusion

How to Switch Between containerd and dockerd in Rancher Desktop with Rancher Desktop provides a powerful, integrated local development experience. Rancher Desktop eliminates the need for multiple separate tools by bundling everything needed for Kubernetes and container development into a single application. Whether you're building microservices, testing Helm charts, or learning Kubernetes, Rancher Desktop provides a production-like environment on your local machine.
