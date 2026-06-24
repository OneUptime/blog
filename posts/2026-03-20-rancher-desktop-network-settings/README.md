# How to Configure Rancher Desktop Network Settings

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Rancher Desktop, Networking, DNS, Configuration, Local Development

Description: Customize network configuration in Rancher Desktop including DNS, host networking, and service discovery.

## Introduction

Rancher Desktop is an open-source desktop application that provides Kubernetes and container management tools for local development. It bundles kubectl, Helm, nerdctl, and a choice of container runtime into a single, easy-to-use application. Networking is mostly handled through automatic port forwarding, with a few configurable settings such as the Kubernetes API port, Traefik, WSL integration, and Administrative Access on macOS. This guide covers How to Configure Rancher Desktop Network Settings in detail.

## Prerequisites

- A supported Rancher Desktop host: macOS 13 or later, Windows 11 or Windows Server 2025 with WSL installed, or a supported Linux distribution with `/dev/kvm` access
- A persistent internet connection
- Administrator/sudo privileges may be required during installation or when enabling privileged networking features
- At least 8 GB of RAM (16 GB recommended)
- At least 4 CPU cores

## Overview

Rancher Desktop simplifies local Kubernetes and container development by providing:

- A local Kubernetes cluster (k3s-based)
- Container runtime (containerd or Moby)
- Integrated CLI tools such as kubectl, helm, nerdctl, and docker
- Automatic port forwarding and a few platform-specific networking options
- Simple configuration through a GUI

## Step 1: Initial Setup

```bash
# Verify the rdctl CLI is installed

rdctl version

# Check Kubernetes cluster status
kubectl cluster-info

# Verify the container runtime that matches your selected engine
nerdctl version
# or, if Rancher Desktop is using the Moby runtime
docker version
```

## Step 2: Configuration

Open Rancher Desktop Preferences to configure the network-related settings Rancher Desktop exposes:

- **Kubernetes**: Version, API port, and Traefik
- **Container Engine**: containerd or Moby
- **Port Forwarding**: Whether Kubernetes system services appear on the Port Forwarding page
- **Application > General**: Administrative Access for bridged networking and default Docker socket behavior
- **WSL** (Windows only): WSL2 integration settings

On macOS, enabling Administrative Access allows Rancher Desktop to use a bridged IP address that is reachable from the host and other machines on the local network, but it also means a containerized DNS server cannot forward port `53` to the host.

```bash
# Start Rancher Desktop or update settings from the CLI
rdctl start --kubernetes.port=6443
rdctl start --port-forwarding.include-kubernetes-services=true

# Example: switch to the Moby runtime when you need the Docker API
rdctl start --container-engine.name=moby
```

## Step 3: Working with Containers

```bash
# Use nerdctl with the containerd runtime.
# If Rancher Desktop is using the Moby runtime, replace nerdctl with docker.
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
# Reset only the Kubernetes cluster
rdctl reset --k8s

# Check Rancher Desktop version and VM IP
rdctl info

# Inspect the current active settings
rdctl list-settings

# Update the Kubernetes API port via CLI
rdctl start --kubernetes.port=6443
```

## Troubleshooting

```bash
# Open Preferences > Troubleshooting > Show Logs

# Reset to factory defaults
rdctl reset --factory

# Check the current VM IP address
rdctl info --field ip-address
```

## Conclusion

Rancher Desktop provides a powerful, integrated local development experience, but most networking is automatic rather than deeply customizable. In current releases, the main settings to focus on are the Kubernetes API port, Traefik, port forwarding, WSL integration on Windows, and Administrative Access on macOS when you need a bridged IP address or the default Docker socket.
