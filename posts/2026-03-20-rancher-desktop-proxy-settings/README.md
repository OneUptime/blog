# How to Configure Rancher Desktop Proxy Settings

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Rancher Desktop, Proxy, Networking, Corporate, Configuration

Description: Configure HTTP/HTTPS proxy settings in Rancher Desktop for corporate networks and restricted environments.

## Introduction

Rancher Desktop is an open-source desktop application that provides Kubernetes and container management tools for local development. It bundles kubectl, Helm, nerdctl, and either containerd or Moby (dockerd) into a single, easy-to-use application. On Windows, Rancher Desktop provides an experimental WSL proxy setting for local, corporate, or VPN proxy servers. In locked-down environments, you may also need to allow Rancher Desktop dependency URLs through your proxy.

## Prerequisites

- A computer running macOS, Windows, or Linux with Rancher Desktop installed
- Windows with WSL installed if you want to use the built-in Proxy tab
- 8 GB of RAM recommended
- 4 CPU cores recommended

## Overview

Rancher Desktop simplifies local Kubernetes and container development by providing:

- A local Kubernetes cluster (k3s-based)
- Container runtime (containerd or Moby)
- Integrated CLI tools (kubectl, helm, nerdctl, docker)
- WSL proxy settings on Windows (experimental)
- Simple configuration through a GUI

## Step 1: Initial Setup

```bash
# Verify Rancher Desktop is installed
rdctl version

# Rancher Desktop must be running for this command
rdctl list-settings
```

## Step 2: Configuration

Open Rancher Desktop Preferences to configure:

- **WSL > Proxy** (Windows only): Enable experimental proxy support
- **Proxy address**: Enter the proxy host or IP address and port
- **Authentication information**: Enter a username and password if your proxy requires it
- **No proxy hostname list**: Define hosts and CIDR ranges that should bypass the proxy
- **Apply**: Changes take effect immediately

```bash
# Inspect the current Rancher Desktop settings
rdctl list-settings
```

## Step 3: Working with Containers

```bash
# Pull an image through containerd
nerdctl pull nginx:latest

# Or, if Rancher Desktop is configured to use Moby (dockerd)
docker pull nginx:latest
```

## Step 4: Working with Kubernetes

```bash
# Check cluster nodes
kubectl get nodes

# Show cluster information
kubectl cluster-info

# Deploy a test application; this causes Rancher Desktop to pull the image
kubectl create deployment hello-world \
  --image=nginx:latest

# Wait for the rollout to complete
kubectl rollout status deployment/hello-world

# Clean up
kubectl delete deployment hello-world
```

## Step 5: Using Helm

```bash
# Rancher Desktop includes Helm
helm version

# Add a chart repository and refresh local metadata
helm repo add bitnami https://charts.bitnami.com/bitnami
helm repo update
```

## Common Configuration Tasks

In secured environments, allow these Rancher Desktop URL patterns through your proxy:

- `https://api.github.com/repos/k3s-io/k3s/releases`
- `https://github.com/k3s-io/k3s/releases/download`
- `https://storage.googleapis.com/kubernetes-release/release`
- `https://desktop.version.rancher.io/v1/checkupgrade`
- `https://docs.rancherdesktop.io`

## Troubleshooting

Use **Troubleshooting > Show Logs** in Rancher Desktop to open the log directory. If proxy-related pulls still fail, re-check the proxy address, credentials, no-proxy list, and the required URL patterns above.

```bash
# Review the active Rancher Desktop settings
rdctl list-settings
```

## Conclusion

Rancher Desktop provides a powerful, integrated local development experience. For proxy configuration, the documented built-in proxy workflow is currently the experimental WSL Proxy setting on Windows. After applying proxy settings, verify connectivity by pulling an image with `nerdctl` or `docker`, and make sure the documented Rancher Desktop dependency URLs are allowed through your corporate proxy or firewall.
