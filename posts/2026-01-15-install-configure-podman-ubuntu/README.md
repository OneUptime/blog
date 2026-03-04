# How to Install and Configure Podman on Ubuntu

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Ubuntu, Podman, Containers, Docker Alternative, DevOps, Tutorial

Description: Learn how to install and use Podman as a daemonless Docker alternative for running containers on Ubuntu.

---

Podman is a daemonless container engine that provides a Docker-compatible CLI. It runs containers as regular user processes without requiring a daemon, making it more secure and resource-efficient than Docker. This guide covers installation and basic usage on Ubuntu.

## Why Podman?

- **Daemonless**: No background service required
- **Rootless**: Run containers as non-root user
- **Docker-compatible**: Same CLI commands
- **OCI-compliant**: Works with standard container images
- **Pod support**: Native Kubernetes pod concepts

## Installation

### Ubuntu 22.04/24.04

```bash
# Install Podman from Ubuntu repos
sudo apt update
sudo apt install podman -y

# Verify installation
podman --version
```

### Ubuntu 20.04 (via Kubic Repository)

```bash
# Add Kubic repository
echo "deb https://download.opensuse.org/repositories/devel:/kubic:/libcontainers:/stable/xUbuntu_20.04/ /" | sudo tee /etc/apt/sources.list.d/devel:kubic:libcontainers:stable.list

# Add GPG key
curl -L "https://download.opensuse.org/repositories/devel:/kubic:/libcontainers:/stable/xUbuntu_20.04/Release.key" | sudo apt-key add -

# Install
sudo apt update
sudo apt install podman -y
```

## Basic Configuration

### Configure Registries

```bash
# View current registries
cat /etc/containers/registries.conf

# Edit registries (add Docker Hub, etc.)
sudo nano /etc/containers/registries.conf
```

Add unqualified search registries:

```toml
[registries.search]
registries = ['docker.io', 'quay.io', 'ghcr.io']
```

### Configure Storage

```bash
# View storage configuration
cat /etc/containers/storage.conf

# For rootless containers, create user config
mkdir -p ~/.config/containers
nano ~/.config/containers/storage.conf
```

```toml
[storage]
driver = "overlay"

[storage.options]
mount_program = "/usr/bin/fuse-overlayfs"
```

## Running Containers

### Basic Commands

```bash
# Pull an image
podman pull nginx

# List images
podman images

# Run container
podman run -d --name web -p 8080:80 nginx

# List running containers
podman ps

# List all containers
podman ps -a

# View container logs
podman logs web

# Stop container
podman stop web

# Start container
podman start web

# Remove container
podman rm web

# Remove image
podman rmi nginx
```

### Interactive Containers

```bash
# Run interactive container
podman run -it ubuntu bash

# Execute command in running container
podman exec -it web bash

# Attach to container
podman attach web
```

## Rootless Containers

Podman's main advantage is running containers without root:

```bash
# Run container as regular user (no sudo!)
podman run -d --name myapp -p 8080:80 nginx

# Check it's running rootless
podman info | grep rootless
```

### Configure Rootless Networking

```bash
# Install slirp4netns for rootless networking
sudo apt install slirp4netns -y

# Configure user namespaces
echo "$USER:100000:65536" | sudo tee /etc/subuid
echo "$USER:100000:65536" | sudo tee /etc/subgid
```

## Docker Compatibility

### Alias Docker to Podman

```bash
# Create alias
echo "alias docker=podman" >> ~/.bashrc
source ~/.bashrc

# Now Docker commands work with Podman
docker run -d nginx
docker ps
```

### Install podman-docker Package

```bash
# Install docker compatibility layer
sudo apt install podman-docker -y

# This creates docker symlink to podman
which docker  # /usr/bin/docker -> /usr/bin/podman
```

### Docker Compose Compatibility

```bash
# Install podman-compose
sudo apt install podman-compose -y

# Or via pip
pip3 install podman-compose

# Use with docker-compose.yml files
podman-compose up -d
```

## Working with Pods

Pods group multiple containers together:

```bash
# Create a pod
podman pod create --name mypod -p 8080:80

# Add containers to pod
podman run -d --pod mypod --name web nginx
podman run -d --pod mypod --name app myapp

# List pods
podman pod ps

# Stop pod (stops all containers)
podman pod stop mypod

# Remove pod
podman pod rm mypod
```

## Building Images

### Using Dockerfile

```bash
# Build image
podman build -t myimage:latest .

# Build with specific Dockerfile
podman build -f Dockerfile.prod -t myimage:prod .

# Build with arguments
podman build --build-arg VERSION=1.0 -t myimage:v1 .
```

### Using Buildah

```bash
# Install Buildah
sudo apt install buildah -y

# Create container from base
container=$(buildah from ubuntu)

# Run commands
buildah run $container apt-get update
buildah run $container apt-get install -y nginx

# Set config
buildah config --cmd "/usr/sbin/nginx -g 'daemon off;'" $container

# Commit to image
buildah commit $container mynginx:latest
```

## Volume Management

```bash
# Create volume
podman volume create mydata

# List volumes
podman volume ls

# Inspect volume
podman volume inspect mydata

# Run container with volume
podman run -d -v mydata:/data nginx

# Mount host directory
podman run -d -v /host/path:/container/path:Z nginx

# The :Z label handles SELinux contexts
```

## Networking

### Network Management

```bash
# List networks
podman network ls

# Create network
podman network create mynet

# Run container on network
podman run -d --network mynet --name web nginx

# Inspect network
podman network inspect mynet

# Connect running container to network
podman network connect mynet container_name

# Remove network
podman network rm mynet
```

### Port Mapping

```bash
# Map single port
podman run -d -p 8080:80 nginx

# Map multiple ports
podman run -d -p 8080:80 -p 8443:443 nginx

# Map to specific interface
podman run -d -p 192.168.1.100:8080:80 nginx

# Random port mapping
podman run -d -P nginx
podman port container_name
```

## System Management

```bash
# View system info
podman info

# View disk usage
podman system df

# Prune unused resources
podman system prune -a

# Remove all stopped containers
podman container prune

# Remove unused images
podman image prune -a

# Remove unused volumes
podman volume prune
```

## Generate Systemd Services

Podman can generate systemd unit files:

```bash
# Generate service file for container
podman generate systemd --name web > web.service

# Generate with restart policy
podman generate systemd --name web --restart-policy=always > web.service

# Install user service
mkdir -p ~/.config/systemd/user
podman generate systemd --name web --files --new
mv container-web.service ~/.config/systemd/user/

# Enable and start
systemctl --user daemon-reload
systemctl --user enable --now container-web.service

# For system service (root)
sudo cp container-web.service /etc/systemd/system/
sudo systemctl daemon-reload
sudo systemctl enable --now container-web.service
```

## Kubernetes Integration

### Generate Kubernetes YAML

```bash
# Generate from pod
podman generate kube mypod > mypod.yaml

# Generate from container
podman generate kube web > web.yaml
```

### Run Kubernetes YAML

```bash
# Apply Kubernetes manifest
podman play kube mypod.yaml

# Stop and remove
podman play kube mypod.yaml --down
```

## Registry Operations

```bash
# Login to registry
podman login docker.io
podman login ghcr.io

# Push image
podman tag myimage:latest docker.io/username/myimage:latest
podman push docker.io/username/myimage:latest

# Pull from private registry
podman pull registry.example.com/myimage:latest
```

## Troubleshooting

### Permission Issues

```bash
# Check subuid/subgid
cat /etc/subuid
cat /etc/subgid

# Reset Podman storage
podman system reset
```

### Network Issues

```bash
# Check network configuration
podman network inspect podman

# Restart network
podman network reload --all
```

### Storage Issues

```bash
# Check storage driver
podman info | grep -i storage

# Reset storage
podman system reset
```

### Container Won't Start

```bash
# View container logs
podman logs container_name

# Inspect container
podman inspect container_name

# Run in foreground for debugging
podman run --rm -it nginx
```

## Migration from Docker

```bash
# Export Docker container
docker export mycontainer > container.tar

# Import to Podman
podman import container.tar myimage:imported

# Or save and load image
docker save myimage:latest > image.tar
podman load < image.tar
```

---

Podman provides a secure, rootless alternative to Docker with full CLI compatibility. Its daemonless architecture makes it ideal for development, CI/CD pipelines, and production environments where security and resource efficiency are priorities.
