# How to Install Rancher Desktop on Linux

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Rancher Desktop, Linux, Kubernetes, Docker, Local Development

Description: Install Rancher Desktop on Linux distributions for local Kubernetes cluster management and container development.

## Introduction

Rancher Desktop is an open-source desktop application that provides Kubernetes and container management tools for local development. It bundles kubectl, Helm, nerdctl, and either containerd or Moby (dockerd) into a single, easy-to-use application. This guide covers How to Install Rancher Desktop on Linux in detail.

## Prerequisites

- A Linux distribution that can install `.deb` or `.rpm` packages, or AppImages
- A persistent internet connection
- An x86_64 processor with either AMD-V or VT-x
- Read-write access on `/dev/kvm`
- Administrator/sudo privileges for installation
- At least 8 GB of RAM (16 GB recommended)
- At least 4 CPU cores

## Overview

Rancher Desktop simplifies local Kubernetes and container development by providing:

- A local Kubernetes cluster (k3s-based)
- Container runtime (containerd or moby (dockerd))
- Integrated CLI tools (kubectl, helm, nerdctl, and docker when using Moby)
- Simple configuration through a GUI

## Step 1: Install Rancher Desktop

Verify that your user can access `/dev/kvm`, then choose the installation method that matches your Linux distribution. If you plan to use the AppImage build, install `pass` and GPG first.

```bash
# Verify that your user can access /dev/kvm
[ -r /dev/kvm ] && [ -w /dev/kvm ] || echo 'insufficient privileges'

# If needed, add your user to the kvm group and sign in again
sudo usermod -a -G kvm "$USER"

# Ubuntu / Debian (.deb)
curl -s https://download.opensuse.org/repositories/isv:/Rancher:/stable/deb/Release.key | gpg --dearmor | sudo dd status=none of=/usr/share/keyrings/isv-rancher-stable-archive-keyring.gpg
echo 'deb [signed-by=/usr/share/keyrings/isv-rancher-stable-archive-keyring.gpg] https://download.opensuse.org/repositories/isv:/Rancher:/stable/deb/ ./' | sudo dd status=none of=/etc/apt/sources.list.d/isv-rancher-stable.list
sudo apt update
sudo apt install rancher-desktop

# Fedora (.rpm)
sudo dnf config-manager addrepo --from-repofile=https://download.opensuse.org/repositories/isv:/Rancher:/stable/fedora/isv:Rancher:stable.repo
sudo dnf install rancher-desktop

# openSUSE (.rpm)
sudo zypper addrepo https://download.opensuse.org/repositories/isv:/Rancher:/stable/rpm/isv:Rancher:stable.repo
sudo zypper install rancher-desktop

# After downloading the AppImage, make it executable and run it
chmod +x Rancher.Desktop-*.AppImage
./Rancher.Desktop-*.AppImage
```

## Step 2: Configuration

Launch Rancher Desktop. On first run, Rancher Desktop downloads Kubernetes images for the selected version, so startup may take a little longer. Open Rancher Desktop Preferences to configure:

- **Kubernetes**: Version and enabled/disabled state
- **Container Engine**: containerd or moby (dockerd)
- **Virtual Machine**: CPU, memory, and disk allocation

```bash
# Verify Rancher Desktop is installed
rdctl version

# Check current active settings
rdctl list-settings

# Check Kubernetes cluster status if Kubernetes is enabled
kubectl cluster-info

# Verify the selected container runtime
nerdctl version
# or, if you selected Moby (dockerd)
docker version

# Use rdctl for command-line configuration
rdctl set --container-engine.name=containerd
rdctl set --kubernetes-enabled=true
```

## Step 3: Working with Containers

```bash
# Pull an image with containerd
nerdctl pull nginx:latest
# or, if you selected Moby (dockerd)
docker pull nginx:latest

# Run a container with nerdctl
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

# Switch to the Moby container engine for Docker CLI compatibility
rdctl set --container-engine.name=moby

# Disable Kubernetes if you only want the container engine
rdctl set --kubernetes-enabled=false

# Re-enable Kubernetes
rdctl set --kubernetes-enabled=true
```

## Troubleshooting

Use the **Show Logs** option in Rancher Desktop's Troubleshooting page to open the log directory.

```bash
# Check whether your user can access /dev/kvm
[ -r /dev/kvm ] && [ -w /dev/kvm ] || echo 'insufficient privileges'

# Show the current Rancher Desktop settings
rdctl list-settings

# Allow Traefik to bind to privileged ports on Linux if needed
sudo sysctl -w net.ipv4.ip_unprivileged_port_start=80

# Reset to factory defaults
rdctl factory-reset
```

## Conclusion

How to Install Rancher Desktop on Linux with Rancher Desktop provides a powerful, integrated local development experience. Rancher Desktop eliminates the need for multiple separate tools by bundling everything needed for Kubernetes and container development into a single application. Whether you're building microservices, testing Helm charts, or learning Kubernetes, Rancher Desktop provides a production-like environment on your local machine.
