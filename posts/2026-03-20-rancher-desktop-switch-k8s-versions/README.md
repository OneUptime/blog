# How to Switch Between Kubernetes Versions in Rancher Desktop

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Rancher Desktop, Kubernetes, Version, Testing, Compatibility

Description: Change the active Kubernetes version in Rancher Desktop to test application compatibility across different cluster versions.

## Introduction

Rancher Desktop is an open-source desktop application that provides Kubernetes and container management tools for local development. It bundles kubectl, Helm, nerdctl, and either containerd or Moby (dockerd) into a single, easy-to-use application. This guide covers How to Switch Between Kubernetes Versions in Rancher Desktop in detail.

## Prerequisites

- A computer running a supported version of macOS, Windows, or Linux
- On Windows, Windows Subsystem for Linux (WSL) 2 installed before Rancher Desktop
- On Linux, read-write access to `/dev/kvm`
- Administrator/sudo privileges may be required during installation
- 8 GB of RAM recommended
- 4 CPU cores recommended

## Overview

Rancher Desktop simplifies local Kubernetes and container development by providing:

- A local Kubernetes cluster (k3s-based)
- Container runtime (containerd or dockerd)
- Integrated CLI tools (kubectl, helm, nerdctl, and docker when using Moby/dockerd)
- Simple configuration through a GUI

## Step 1: Initial Setup

```bash
# Verify Rancher Desktop is installed and running

rdctl version

# Check Kubernetes cluster status
kubectl cluster-info

# Verify the active container runtime
nerdctl version
# or, if Rancher Desktop is using Moby (dockerd)
docker version
```

## Step 2: Configuration

Open Rancher Desktop Preferences to configure:

- **Kubernetes**: Version and enabled/disabled state
- **Container Engine**: containerd or moby (dockerd)
- **Virtual Machine**: CPU, memory, and disk allocation
- **WSL** (Windows only): WSL2 integration settings

When upgrading Kubernetes versions, workloads and images are retained. When downgrading, workloads are removed, but images are retained.

```bash
# Use rdctl for command-line configuration
rdctl set --kubernetes-version 1.28.0
rdctl set --container-engine containerd
```

## Step 3: Working with Containers

```bash
# Substitute docker for nerdctl below if Rancher Desktop is using Moby (dockerd)

# Pull an image
nerdctl pull nginx:latest
# or
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
# Show the current Rancher Desktop settings
rdctl list-settings

# Reset Kubernetes from the Rancher Desktop UI
# Troubleshooting > Reset Kubernetes

# Choose from the available Kubernetes versions in the Rancher Desktop UI
# Preferences > Kubernetes > Kubernetes Version

# Update Kubernetes version via CLI
rdctl set --kubernetes-version 1.29.0
```

## Troubleshooting

```bash
# Open the folder containing Rancher Desktop log files
# Troubleshooting > Show Logs

# Reset to factory defaults from the Rancher Desktop UI
# Troubleshooting > Factory Reset

# Review the current virtual machine settings
rdctl list-settings
```

## Conclusion

How to Switch Between Kubernetes Versions in Rancher Desktop with Rancher Desktop provides a powerful, integrated local development experience. Rancher Desktop eliminates the need for multiple separate tools by bundling everything needed for Kubernetes and container development into a single application. Whether you're building microservices, testing Helm charts, or learning Kubernetes, Rancher Desktop provides a production-like environment on your local machine.
