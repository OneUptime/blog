# How to Install Portainer CE on Fedora with Docker

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Portainer, Fedora, Docker, Installation, Container-management

Description: A guide to installing Portainer Community Edition on Fedora Linux with Docker, including podman conflicts resolution and SELinux configuration.

## Overview

Fedora uses DNF and includes Podman tooling by default. Installing Docker CE on Fedora may require removing `podman-docker` to avoid Docker CLI conflicts. This guide covers installing Docker and Portainer CE on Fedora 42, 43, and 44.

## Prerequisites

- Fedora 42, 43, or 44
- Minimum: 2GB RAM, 20GB disk
- Sudo access

## Step 1: Update System

```bash
sudo dnf update -y
```

## Step 2: Remove podman-docker Conflicts (Optional)

`podman-docker` can conflict with Docker CE because it provides a `docker` command backed by Podman:

```bash
# Remove podman-docker if installed
sudo dnf remove -y podman-docker

# Podman itself can remain installed alongside Docker
```

## Step 3: Install Docker CE

```bash
# Install dnf-plugins-core
sudo dnf install -y dnf-plugins-core

# Add Docker repository
sudo dnf config-manager addrepo --from-repofile \
  https://download.docker.com/linux/fedora/docker-ce.repo

# Install Docker
sudo dnf install -y \
  docker-ce \
  docker-ce-cli \
  containerd.io \
  docker-buildx-plugin \
  docker-compose-plugin

# Enable and start Docker
sudo systemctl enable --now docker

# Add user to docker group
sudo usermod -aG docker $USER
newgrp docker
```

## Step 4: Configure Firewall

```bash
# Open Portainer ports
sudo firewall-cmd --permanent --add-port=9443/tcp
sudo firewall-cmd --permanent --add-port=8000/tcp
sudo firewall-cmd --reload
```

## Step 5: Handle SELinux

```bash
# Check SELinux status
getenforce

# If SELinux is enabled, Portainer requires --privileged on Docker
```

## Step 6: Deploy Portainer CE

```bash
# Create data volume
docker volume create portainer_data

# Deploy Portainer CE
docker run -d \
  --privileged \
  -p 8000:8000 \
  -p 9443:9443 \
  --name portainer \
  --restart=always \
  -v /var/run/docker.sock:/var/run/docker.sock \
  -v portainer_data:/data \
  portainer/portainer-ce:latest
```

## Step 7: Verify Installation

```bash
# Check container is running
docker ps | grep portainer

# Access UI
echo "Portainer UI: https://$(hostname -I | awk '{print $1}'):9443"
```

## Troubleshooting on Fedora

### cgroups v2 Compatibility

Fedora 31+ uses cgroups v2 by default. If you encounter issues:

```bash
# Check cgroup version
mount | grep cgroup

# If using cgroups v2 and having issues, Docker 20.10+ handles this automatically
# Check Docker version
docker --version
```

### podman-docker CLI Conflict

```bash
# Check whether podman-docker is installed
rpm -q podman-docker

# Remove podman-docker if present
sudo dnf remove -y podman-docker

# Restart Docker
sudo systemctl restart docker
```

## Conclusion

Fedora's Podman tooling may require extra steps when installing Docker, especially if `podman-docker` is installed, but once set up, Portainer CE runs seamlessly. Fedora's rapid release cycle means you should verify Docker CE compatibility when upgrading Fedora versions. For server workloads where stability is paramount, consider using CentOS Stream or Rocky Linux instead of Fedora.
