# How to Configure Rancher Desktop with Lima

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Rancher Desktop, Lima, macOS, VM, Configuration

Description: Configure the Lima virtual machine backend in Rancher Desktop on macOS for optimal performance and compatibility.

## Introduction

Rancher Desktop is an open-source desktop application that provides Kubernetes and container management tools for local development. It bundles kubectl, Helm, nerdctl, and either containerd or Moby (dockerd) into a single, easy-to-use application. On macOS, Rancher Desktop runs workloads inside a Lima-managed virtual machine. This guide covers How to Configure Rancher Desktop with Lima in detail.

## Prerequisites

- macOS 13 (Ventura) or higher
- Apple Silicon or Intel CPU with virtualization support
- Persistent internet connection
- Rancher Desktop command-line tools available on your `PATH` (typically via `~/.rd/bin` on macOS)
- At least 8 GB of RAM (16 GB recommended)
- At least 4 CPU cores

## Overview

Rancher Desktop simplifies local Kubernetes and container development by providing:

- A local Kubernetes cluster (k3s-based)
- Container runtime (containerd or dockerd)
- Integrated CLI tools (kubectl, helm, nerdctl, docker)
- A Lima-managed virtual machine on macOS
- Simple configuration through a GUI

## Step 1: Initial Setup

```bash
# Verify Rancher Desktop is installed and running
rdctl version

# Review the current Rancher Desktop settings
rdctl list-settings

# Check Kubernetes cluster status (if Kubernetes is enabled)
kubectl cluster-info

# Verify container runtime
nerdctl version   # containerd
# or
docker version    # Moby
```

## Step 2: Configuration

Open Rancher Desktop Preferences to configure:

- **Kubernetes**: Version and enabled/disabled state
- **Container Engine**: containerd or moby (dockerd)
- **Virtual Machine**: CPU, memory, and disk allocation
- **Emulation (macOS)**: `VZ` or `QEMU` for the Lima-managed VM

```bash
# Use rdctl for command-line configuration
rdctl start --container-engine.name=containerd \
  --virtual-machine.type=vz \
  --virtual-machine.number-cpus=4 \
  --virtual-machine.memory-in-gb=8
```

## Step 3: Working with Containers

```bash
# The commands below use containerd via nerdctl.
# If you selected Moby instead, use the equivalent docker commands.

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
# Show the current Rancher Desktop settings
rdctl list-settings

# Switch the macOS VM type used by the Lima-managed VM
rdctl start --virtual-machine.type=vz
# or
rdctl start --virtual-machine.type=qemu

# Adjust VM CPU and memory allocation
rdctl start --virtual-machine.number-cpus=4 \
  --virtual-machine.memory-in-gb=8
```

## Troubleshooting

```bash
# Review the current Rancher Desktop settings
rdctl list-settings

# Check the VM IP address
rdctl info --field ip-address

# Run a command inside the Rancher Desktop VM
rdctl shell -- uname -a

# Use Troubleshooting > Show Logs or Troubleshooting > Factory Reset
# in the Rancher Desktop UI when you need logs or a full reset.
```

## Conclusion

Configuring Rancher Desktop on macOS, where Rancher Desktop uses a Lima-managed virtual machine, provides a powerful, integrated local development experience. Rancher Desktop eliminates the need for multiple separate tools by bundling everything needed for Kubernetes and container development into a single application. Whether you're building microservices, testing Helm charts, or learning Kubernetes, Rancher Desktop provides a production-like environment on your local machine.
