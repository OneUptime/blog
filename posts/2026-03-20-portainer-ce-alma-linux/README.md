# How to Install Portainer CE on AlmaLinux with Docker

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Portainer, AlmaLinux, Docker, Installation, Rhel-compatible

Description: A guide to installing Portainer Community Edition on AlmaLinux 8 and 9 with Docker, a RHEL-compatible distribution and popular CentOS replacement.

## Overview

AlmaLinux is a community-owned, RHEL-compatible Linux distribution created in response to CentOS's transition to CentOS Stream. It provides long-term stability and compatibility with RHEL. This guide covers installing Docker CE and Portainer CE on AlmaLinux 8 and AlmaLinux 9.

## Prerequisites

- AlmaLinux 8.x or 9.x
- Minimum: 2GB RAM, 20GB disk
- Root or sudo access

## Step 1: Update System

```bash
sudo dnf update -y
```

## Step 2: Remove Conflicting Packages

```bash
# Remove any existing Docker-related packages
sudo dnf remove -y \
  docker \
  docker-client \
  docker-client-latest \
  docker-common \
  docker-latest \
  docker-latest-logrotate \
  docker-logrotate \
  docker-engine \
  podman \
  runc

# Clean up
sudo dnf autoremove -y
```

## Step 3: Install Docker CE

Because AlmaLinux is RHEL-compatible, this guide uses Docker's RHEL repository:

```bash
# Install dnf plugins
sudo dnf install -y dnf-plugins-core

# Add Docker repository
sudo dnf config-manager --add-repo \
  https://download.docker.com/linux/rhel/docker-ce.repo

# Install Docker CE packages
sudo dnf install -y \
  docker-ce \
  docker-ce-cli \
  containerd.io \
  docker-buildx-plugin \
  docker-compose-plugin

# Start and enable Docker
sudo systemctl enable --now docker

# Add user to docker group
sudo usermod -aG docker $USER
newgrp docker
```

## Step 4: Verify Docker Installation

```bash
docker --version
docker run hello-world
sudo systemctl status docker
```

## Step 5: Configure SELinux

AlmaLinux uses SELinux Enforcing mode by default:

```bash
# Check SELinux mode
getenforce
# Output: Enforcing

# If SELinux is Enforcing, Portainer requires --privileged
# This is handled in the docker run command below
```

## Step 6: Configure Firewall

```bash
# Open the Portainer UI port and optional Edge tunnel port
# Port 8000 is only needed if you plan to use Edge agents
sudo firewall-cmd --permanent --add-port=9443/tcp
sudo firewall-cmd --permanent --add-port=8000/tcp
sudo firewall-cmd --reload

# Verify ports are open
sudo firewall-cmd --list-ports
```

## Step 7: Deploy Portainer CE

```bash
# Create Portainer data volume
docker volume create portainer_data

# Deploy Portainer CE with SELinux support
# Port 8000 is only needed if you plan to use Edge agents
docker run -d \
  --privileged \
  -p 8000:8000 \
  -p 9443:9443 \
  --name portainer \
  --restart=always \
  -v /var/run/docker.sock:/var/run/docker.sock \
  -v portainer_data:/data \
  portainer/portainer-ce:lts

# Check container status
docker ps | grep portainer
docker logs portainer --tail 20
```

## Step 8: Access and Initial Setup

```bash
# Get server IP
echo "Access Portainer at: https://$(hostname -I | awk '{print $1}'):9443"
```

1. Navigate to `https://<server-ip>:9443`
2. Accept the self-signed certificate warning
3. Create your admin username and password (minimum 12 characters)
4. Click **Create user** and begin managing containers

## AlmaLinux 8 vs AlmaLinux 9 Differences

| Feature | AlmaLinux 8 | AlmaLinux 9 |
|---|---|---|
| Default cgroups | cgroups v1 | cgroups v2 |
| SELinux | Enforcing | Enforcing |
| Python version | 3.6 | 3.9 |
| Docker compatibility | Full | Full |
| Support lifecycle | Until 2029 | Until 2032 |

```bash
# Check cgroup version on your system
stat -fc %T /sys/fs/cgroup/
# tmpfs = cgroups v1
# cgroup2fs = cgroups v2
```

## Optional: Enable Automatic Security Updates

```bash
sudo dnf install -y dnf-automatic

# Configure for security updates only
sudo sed -i 's/^upgrade_type = .*/upgrade_type = security/' \
  /etc/dnf/automatic.conf

# Install updates automatically
sudo systemctl enable --now dnf-automatic-install.timer
```

## Conclusion

AlmaLinux is an excellent enterprise-grade platform for Portainer CE deployments. Its RHEL compatibility means the standard Docker installation workflow maps closely to AlmaLinux. When SELinux is Enforcing, Portainer should be started with `--privileged`, and firewalld should allow the ports you plan to use. AlmaLinux's 10-year support lifecycle makes it a stable foundation for production Portainer deployments.
