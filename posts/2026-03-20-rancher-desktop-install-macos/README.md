# How to Install Rancher Desktop on macOS

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Rancher Desktop, macOS, Kubernetes, Docker, Local Development

Description: Install and configure Rancher Desktop on macOS for local Kubernetes development with container runtime support.

## Introduction

Rancher Desktop is an open-source desktop application that provides Kubernetes and container management tools for local development. It bundles kubectl, Helm, nerdctl, and either containerd or Moby (dockerd) into a single, easy-to-use application. This guide covers How to Install Rancher Desktop on macOS in detail.

## Prerequisites

- A Mac running macOS 13 (Ventura) or higher
- Apple Silicon (aarch64) or Intel (x86_64) CPU with VT-x
- A persistent internet connection
- 8 GB of RAM recommended
- 4 CPU cores recommended

## Overview

Rancher Desktop simplifies local Kubernetes and container development by providing:

- A local Kubernetes cluster (k3s-based)
- Container runtime (containerd or dockerd)
- Integrated CLI tools (kubectl, helm, nerdctl, and Docker CLI when Moby is selected)
- Simple configuration through a GUI

## Step 1: Install Rancher Desktop

1. Download `Rancher.Desktop-X.Y.Z.dmg` from the Rancher Desktop GitHub releases page.
2. Open the DMG and drag Rancher Desktop to the `Applications` folder.
3. Launch Rancher Desktop from `Applications` and wait for the initial startup to finish.

```bash
# Verify Rancher Desktop is installed and running

rdctl version

# Check Kubernetes cluster status
kubectl cluster-info

# Verify the selected container runtime
nerdctl version
# or, if using the Moby container engine
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
rdctl set --kubernetes.version <supported-version>
rdctl set --container-engine.name containerd
```

## Step 3: Working with Containers

```bash
# Pull an image
nerdctl pull nginx:latest
# or, when using the Moby container engine
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

# Check Rancher Desktop information
rdctl info

# Show current Rancher Desktop settings
rdctl list-settings

# Update Kubernetes version via CLI
rdctl set --kubernetes.version <supported-version>
```

## Troubleshooting

```bash
# Check Rancher Desktop logs
# In the Rancher Desktop UI, open Troubleshooting > Show Logs

# Reset to factory defaults
rdctl reset --factory

# Show current Rancher Desktop settings, including virtualMachine
rdctl list-settings
```

## Conclusion

How to Install Rancher Desktop on macOS with Rancher Desktop provides a powerful, integrated local development experience. Rancher Desktop eliminates the need for multiple separate tools by bundling everything needed for Kubernetes and container development into a single application. Whether you're building microservices, testing Helm charts, or learning Kubernetes, Rancher Desktop provides a production-like environment on your local machine.
