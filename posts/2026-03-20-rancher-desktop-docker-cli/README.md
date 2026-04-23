# How to Use docker CLI with Rancher Desktop

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Rancher Desktop, Docker CLI, Container, Local Development

Description: Configure and use the Docker CLI with Rancher Desktop's container runtime for familiar Docker workflows.

## Introduction

Rancher Desktop is an open-source desktop application that provides Kubernetes and container management tools for local development. It bundles kubectl, Helm, nerdctl, and either containerd or Moby (dockerd) into a single, easy-to-use application. To use the Docker CLI with Rancher Desktop, you need to select the Moby (dockerd) container engine. This guide covers How to Use docker CLI with Rancher Desktop in detail.

## Prerequisites

- A computer running macOS, Windows, or Linux
- Administrator/sudo privileges may be required for installation or privileged features
- 8 GB of RAM recommended (more may be needed for heavier workloads)
- 4 CPU cores recommended

## Overview

Rancher Desktop simplifies local Kubernetes and container development by providing:

- A local Kubernetes cluster (k3s-based)
- Container runtime (containerd or dockerd)
- Integrated CLI tools (kubectl, helm, nerdctl, and docker when using Moby)
- Simple configuration through a GUI

## Step 1: Initial Setup

```bash
# Verify the Rancher Desktop CLI is installed

rdctl version

# Check Kubernetes cluster status (if Kubernetes is enabled)
kubectl cluster-info

# Verify container runtime
# Use nerdctl with the containerd runtime
nerdctl version
# or
# Use docker with the Moby (dockerd) runtime
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
# To use the Docker CLI, switch Rancher Desktop to Moby (dockerd)
rdctl set --container-engine.name=moby

# Show the current active settings
rdctl list-settings
```

## Step 3: Working with Containers

```bash
# Pull an image
docker pull nginx:latest
# or, if Rancher Desktop is using containerd
nerdctl pull nginx:latest

# Run a container
docker run -d -p 8080:80 --name my-nginx nginx:latest
# or, if Rancher Desktop is using containerd
nerdctl run -d -p 8080:80 --name my-nginx nginx:latest

# List running containers
docker ps
# or
nerdctl ps

# View container logs
docker logs my-nginx
# or
nerdctl logs my-nginx

# Stop and remove
docker stop my-nginx
docker rm my-nginx
# or
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

# In a separate terminal, forward a local port to the service
kubectl port-forward svc/hello-world 8080:80

# Then test the application from another terminal
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
# Show current Rancher Desktop settings
rdctl list-settings

# Switch to the Moby engine to use the Docker CLI
rdctl set --container-engine.name=moby

# Disable or enable Kubernetes
rdctl set --kubernetes-enabled=false
rdctl set --kubernetes-enabled=true
```

## Troubleshooting

```bash
# If docker commands fail, verify the container engine is set to Moby:
# Preferences > Container Engine > Moby (dockerd)

# Open Rancher Desktop logs from the UI:
# Troubleshooting > Show Logs

# Show the current active settings in JSON
rdctl list-settings

# Gracefully shut down Rancher Desktop
rdctl shutdown
```

## Conclusion

How to Use docker CLI with Rancher Desktop with Rancher Desktop provides a powerful, integrated local development experience. Rancher Desktop eliminates the need for multiple separate tools by bundling everything needed for Kubernetes and container development into a single application. Whether you're building microservices, testing Helm charts, or learning Kubernetes, Rancher Desktop provides a production-like environment on your local machine.
