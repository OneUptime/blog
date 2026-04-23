# How to Configure Rancher Desktop Port Forwarding

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Rancher Desktop, Port Forwarding, Networking, Kubernetes

Description: Set up port forwarding in Rancher Desktop to access Kubernetes services and containers from your local machine.

## Introduction

Rancher Desktop is an open-source desktop application that provides Kubernetes and container management tools for local development. It bundles kubectl, Helm, nerdctl, and either containerd or Moby (dockerd) into a single, easy-to-use application. This guide covers How to Configure Rancher Desktop Port Forwarding in detail.

## Prerequisites

- A computer running macOS, Windows, or Linux
- Administrator/sudo privileges may be required during installation, depending on your OS
- Recommended: at least 8 GB of RAM
- Recommended: at least 4 CPU cores

## Overview

Rancher Desktop simplifies local Kubernetes and container development by providing:

- A local Kubernetes cluster (k3s-based)
- Container runtime (containerd or dockerd)
- Integrated CLI tools (kubectl, helm, nerdctl, docker)
- Simple configuration through a GUI

## Step 1: Initial Setup

```bash
# Verify Rancher Desktop is installed

rdctl version

# Check Kubernetes cluster status
kubectl cluster-info

# Verify container runtime
# If Rancher Desktop is using containerd
nerdctl version
# If Rancher Desktop is using Moby (dockerd)
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
rdctl set --kubernetes.version=<version>
rdctl set --container-engine.name=containerd
```

## Step 3: Working with Containers

```bash
# If Rancher Desktop is using containerd
nerdctl pull nginx:latest
nerdctl run -d -p 8080:80 --name my-nginx nginx:latest
nerdctl ps
nerdctl logs my-nginx
nerdctl stop my-nginx
nerdctl rm my-nginx

# If Rancher Desktop is using Moby (dockerd)
docker pull nginx:latest
docker run -d -p 8080:80 --name my-nginx nginx:latest
docker ps
docker logs my-nginx
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
rdctl factory-reset

# Check Rancher Desktop information
rdctl info

# Show the configured Kubernetes version
rdctl list-settings | jq -r '.kubernetes.version'

# Update Kubernetes version via CLI
rdctl set --kubernetes.version=<version>
```

## Troubleshooting

```bash
# Check Rancher Desktop logs
# In the Rancher Desktop UI, open Troubleshooting and click Show Logs.

# Reset to factory defaults
rdctl factory-reset

# Show current virtual machine settings
rdctl list-settings | jq '.virtualMachine'
```

## Conclusion

How to Configure Rancher Desktop Port Forwarding with Rancher Desktop provides a powerful, integrated local development experience. Rancher Desktop eliminates the need for multiple separate tools by bundling everything needed for Kubernetes and container development into a single application. Whether you're building microservices, testing Helm charts, or learning Kubernetes, Rancher Desktop provides a production-like environment on your local machine.
