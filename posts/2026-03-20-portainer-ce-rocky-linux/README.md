# How to Install Portainer CE on Rocky Linux with Docker

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Portainer, Rocky-linux, Docker, Installation, Rhel-compatible

Description: A step-by-step guide to installing Portainer Community Edition on Rocky Linux 8 and 9 with Docker, the recommended CentOS replacement for enterprise environments.

## Overview

Rocky Linux is a RHEL-compatible distribution created after CentOS's transition to CentOS Stream. It provides long-term stability and is widely used as a CentOS replacement in enterprise environments. This guide covers installing Docker CE and Portainer on Rocky Linux 8 and Rocky Linux 9.

## Prerequisites

- Rocky Linux 8.x or 9.x
- Root or sudo access

## Step 1: Update System

```bash
sudo dnf update -y
```

## Step 2: Install Docker CE

```bash
# Remove any conflicting packages

sudo dnf remove -y \
  docker \
  docker-client \
  docker-client-latest \
  docker-common \
  docker-latest \
  docker-latest-logrotate \
  docker-logrotate \
  docker-engine

# Install dnf plugins
sudo dnf install -y dnf-plugins-core

# Add Docker repository for Rocky Linux
sudo dnf config-manager --add-repo \
  https://download.docker.com/linux/rhel/docker-ce.repo

# Install Docker CE
sudo dnf install -y \
  docker-ce \
  docker-ce-cli \
  containerd.io \
  docker-buildx-plugin \
  docker-compose-plugin

# Start and enable Docker
sudo systemctl enable --now docker

# Add user to docker group (optional)
sudo usermod -a -G docker $(whoami)
# Log out and back in before running Docker without sudo
```

## Step 3: Verify Docker

```bash
docker --version
sudo docker run hello-world
sudo systemctl status docker
```

## Step 4: Configure SELinux

Rocky Linux uses SELinux in Enforcing mode by default. Portainer's official Docker installation guide assumes SELinux is disabled; if you keep SELinux enabled, use `--privileged` when starting Portainer:

```bash
# Check SELinux status
getenforce

# Portainer's Docker install docs require --privileged on SELinux-enabled hosts
```

## Step 5: Configure firewalld

```bash
# Open Portainer UI/API port and optional Edge tunnel port
sudo firewall-cmd --permanent --add-port=9443/tcp
sudo firewall-cmd --permanent --add-port=8000/tcp
sudo firewall-cmd --reload

# Verify open ports
sudo firewall-cmd --list-ports
```

## Step 6: Deploy Portainer CE

```bash
# Create data volume
sudo docker volume create portainer_data

# Deploy Portainer CE on Rocky Linux with SELinux enabled
sudo docker run -d \
  --privileged \
  -p 8000:8000 \
  -p 9443:9443 \
  --name portainer \
  --restart=always \
  -v /var/run/docker.sock:/var/run/docker.sock \
  -v portainer_data:/data \
  portainer/portainer-ce:lts
```

## Step 7: First Access

```bash
# Get server IP
hostname -I | awk '{print $1}'

echo "Access Portainer at: https://$(hostname -I | awk '{print $1}'):9443"
```

Navigate to the URL, accept the self-signed certificate, and create your admin account.

## Step 8: Enable Automatic Updates (dnf-automatic)

```bash
# Install dnf-automatic for automatic security updates
sudo dnf install -y dnf-automatic

# Configure for security updates only
sudo sed -i 's/^upgrade_type = .*/upgrade_type = security/' \
  /etc/dnf/automatic.conf

sudo systemctl enable --now dnf-automatic-install.timer
```

## Rocky Linux 8 vs Rocky Linux 9 Differences

| Feature | Rocky Linux 8 | Rocky Linux 9 |
|---|---|---|
| Default cgroups | cgroups v1 | cgroups v2 |
| SELinux | Enforcing | Enforcing |
| Python | 3.6 | 3.9 |
| Docker compatibility | Supported | Supported |

```bash
# Check cgroup version
if [ -f /sys/fs/cgroup/cgroup.controllers ]; then
  echo "cgroups v2"
else
  echo "cgroups v1"
fi
```

## Troubleshooting

### Verify Docker cgroup Settings

Docker 20.10 and later support cgroups v2, and Docker uses the `systemd` cgroup driver by default on cgroups v2 hosts.

```bash
# Verify Docker's cgroup version and driver
sudo docker info | grep -E 'Cgroup Version|Cgroup Driver'
```

## Conclusion

Rocky Linux is an excellent CentOS replacement for enterprise Portainer deployments. Its binary compatibility with RHEL ensures that enterprise software designed for RHEL works without modification. With SELinux enabled, Portainer should be started with `--privileged`, and firewalld needs explicit port rules - both are standard enterprise Linux practices. Rocky Linux's 10-year support lifecycle makes it a stable foundation for production Portainer deployments.
