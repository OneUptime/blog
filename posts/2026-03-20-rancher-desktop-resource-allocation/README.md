# How to Configure Rancher Desktop Resource Allocation

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Rancher Desktop, Resource, Performance, VM, Configuration

Description: Tune CPU, memory, and disk allocation for the Rancher Desktop virtual machine to optimize local development performance.

## Introduction

Rancher Desktop is an open-source desktop application that provides Kubernetes and container management tools for local development. It bundles kubectl, Helm, nerdctl, and either containerd or Moby (dockerd) into a single, easy-to-use application. This guide covers How to Configure Rancher Desktop Resource Allocation in detail.

## Prerequisites

- A supported macOS, Windows, or Linux system
- Administrative privileges may be required during installation, depending on platform and setup
- At least 8 GB of RAM (16 GB recommended)
- At least 4 CPU cores

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
- **Container Engine**: containerd or Moby (dockerd)
- **Virtual Machine > Hardware** (macOS/Linux): CPU and memory allocation
- **WSL > Integrations** (Windows only): WSL2 integration settings; CPU and memory allocation is managed globally by WSL

```bash
# Review the current Rancher Desktop settings
rdctl list-settings

# macOS/Linux: configure CPU, memory, and disk allocation
rdctl start \
  --virtual-machine.memory-in-gb 8 \
  --virtual-machine.number-cpus 4 \
  --experimental.virtual-machine.disk-size 100GiB
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
# Show the current active settings
rdctl list-settings

# Disable Kubernetes for reduced resource consumption
rdctl set --kubernetes-enabled=false
```

## Troubleshooting

```bash
# Open the Rancher Desktop log folder
# Troubleshooting > Show Logs

# Reset Kubernetes and optionally remove container images
# Troubleshooting > Reset Kubernetes

# Reset Rancher Desktop to factory defaults
# Troubleshooting > Factory Reset
```

## Conclusion

How to Configure Rancher Desktop Resource Allocation with Rancher Desktop provides a powerful, integrated local development experience. Rancher Desktop eliminates the need for multiple separate tools by bundling everything needed for Kubernetes and container development into a single application. Whether you're building microservices, testing Helm charts, or learning Kubernetes, Rancher Desktop provides a production-like environment on your local machine.
