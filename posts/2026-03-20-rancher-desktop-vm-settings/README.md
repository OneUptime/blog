# How to Configure Rancher Desktop Virtual Machine Settings

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Rancher Desktop, VM, Virtual Machine, Configuration, Setting

Description: Customize the underlying virtual machine settings in Rancher Desktop including network, storage, and hardware configuration.

## Introduction

Rancher Desktop is an open-source desktop application that provides Kubernetes and container management tools for local development. It bundles kubectl, Helm, nerdctl, and either containerd or Moby (dockerd) into a single, easy-to-use application. This guide covers How to Configure Rancher Desktop Virtual Machine Settings in detail.

## Prerequisites

- A computer running macOS, Windows, or Linux
- Windows users need Windows Subsystem for Linux (WSL) installed
- Linux users need read-write access to `/dev/kvm`
- Administrator/sudo privileges may be required for installation, depending on platform and setup
- 8 GB of RAM recommended
- 4 CPU cores recommended

## Overview

Rancher Desktop simplifies local Kubernetes and container development by providing:

- A local Kubernetes cluster (k3s-based)
- Container runtime (containerd or dockerd)
- Integrated CLI tools (kubectl, helm, nerdctl, and docker when Moby is selected)
- Simple configuration through a GUI

## Step 1: Initial Setup

```bash
# Verify Rancher Desktop is installed

rdctl version

# Check Kubernetes cluster status, if Kubernetes is enabled
kubectl cluster-info

# Verify the selected container runtime
nerdctl version
# or
docker version
```

## Step 2: Configuration

Open Rancher Desktop Preferences to configure:

- **Kubernetes**: Version and enabled/disabled state
- **Container Engine**: containerd or Moby (dockerd)
- **Virtual Machine** (macOS and Linux): CPU and memory allocation, mount type, and emulation options on macOS
- **WSL** (Windows only): WSL2 integration settings; CPU and memory are configured globally by WSL

```bash
# Use rdctl for command-line configuration
rdctl start --virtual-machine.memory-in-gb 8 --virtual-machine.number-cpus 4
rdctl start --container-engine.name containerd
```

## Step 3: Working with Containers

```bash
# Example using the containerd / nerdctl workflow
nerdctl pull nginx:latest
nerdctl run -d -p 8080:80 --name my-nginx nginx:latest
nerdctl ps
nerdctl logs my-nginx
nerdctl stop my-nginx
nerdctl rm my-nginx

# Equivalent commands when using the Moby engine
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

# View the current rdctl CLI version
rdctl version

# Inspect the current Rancher Desktop settings in JSON
rdctl list-settings

# Update VM resources on macOS and Linux
rdctl start --virtual-machine.memory-in-gb 8 --virtual-machine.number-cpus 4
```

## Troubleshooting

```bash
# Open Troubleshooting > Show Logs in the Rancher Desktop UI

# Reset to factory defaults
rdctl factory-reset

# Inspect current virtual machine settings
rdctl list-settings
```

## Conclusion

How to Configure Rancher Desktop Virtual Machine Settings with Rancher Desktop provides a powerful, integrated local development experience. Rancher Desktop eliminates the need for multiple separate tools by bundling everything needed for Kubernetes and container development into a single application. Whether you're building microservices, testing Helm charts, or learning Kubernetes, Rancher Desktop provides a production-like environment on your local machine.
