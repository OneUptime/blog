# How to Install Portainer CE on RHEL with Docker

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Portainer, RHEL, Red-hat, Docker, Installation, Enterprise-linux

Description: A guide to installing Portainer Community Edition on Red Hat Enterprise Linux (RHEL) 8 and 9 with Docker CE.

## Overview

Red Hat Enterprise Linux (RHEL) is one of the most widely used enterprise Linux distributions. While RHEL ships with Podman as its default container engine, Docker CE can also be installed on RHEL after removing conflicting packages. This guide covers installing Docker CE and Portainer CE on RHEL 8 and RHEL 9, including SELinux and support considerations.

## Prerequisites

- RHEL 8.x or 9.x (with or without active subscription)
- Minimum: 2GB RAM, 20GB disk
- Root or sudo access
- Internet connectivity or access to Docker CE mirror

## Step 1: Update System

```bash
sudo dnf update -y
```

## Step 2: Remove Conflicting Packages

Docker's official RHEL installation instructions require removing conflicting packages first:

```bash
# Check for conflicting packages
rpm -qa | grep -E 'docker|podman|runc'

# Remove packages that conflict with Docker CE
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

# Verify removal
rpm -qa | grep -E 'docker|podman|runc'
```

## Step 3: Install Docker CE

Docker provides an official RHEL repository:

```bash
# Install prerequisites
sudo dnf install -y dnf-plugins-core

# Add Docker CE repository for RHEL
sudo dnf config-manager --add-repo \
  https://download.docker.com/linux/rhel/docker-ce.repo

# Install Docker CE
sudo dnf install -y \
  docker-ce \
  docker-ce-cli \
  containerd.io \
  docker-buildx-plugin \
  docker-compose-plugin

# Enable and start Docker
sudo systemctl enable --now docker

# Add current user to docker group
sudo usermod -aG docker $USER
newgrp docker
```

## Step 4: Configure SELinux

RHEL enforces SELinux by default:

```bash
# Check SELinux status
getenforce
# Output: Enforcing

# Portainer's official Docker installation instructions assume SELinux is disabled
# On SELinux-enforcing hosts, run Portainer with --privileged
```

## Step 5: Configure firewalld

```bash
# Add the Portainer UI port to firewalld
sudo firewall-cmd --permanent --add-port=9443/tcp

# Optional: open port 8000 if you plan to use Edge agents
sudo firewall-cmd --permanent --add-port=8000/tcp
sudo firewall-cmd --reload

# Verify
sudo firewall-cmd --list-ports
```

## Step 6: Deploy Portainer CE

```bash
# Create data volume
docker volume create portainer_data

# Deploy Portainer CE (use --privileged on SELinux-enforcing RHEL hosts)
docker run -d \
  -p 8000:8000 \
  -p 9443:9443 \
  --name portainer \
  --restart=always \
  --privileged \
  -v /var/run/docker.sock:/var/run/docker.sock \
  -v portainer_data:/data \
  portainer/portainer-ce:sts

# Verify
docker ps | grep portainer
docker logs portainer --tail 20
```

## Step 7: Access Portainer

```bash
# Get server IP
hostname -I | awk '{print $1}'
echo "Access Portainer at: https://$(hostname -I | awk '{print $1}'):9443"
```

Navigate to the URL, accept the self-signed certificate warning, and create your admin account.

## RHEL Subscription and Docker CE

Red Hat supports Podman as the native container engine on RHEL. Common options include:

| Option | Notes |
|---|---|
| Docker CE (Docker RHEL repo) | Uses Docker's upstream RHEL packages |
| Podman + podman-docker | RH-supported, Docker CLI and socket compatibility with some limitations |
| Portainer CE with Podman | Official Portainer alternative if you prefer the RHEL-native container engine |

For production RHEL environments requiring support contracts, consider Podman:

```bash
# Podman as Docker alternative (stays fully supported)
sudo dnf install -y podman podman-docker

# podman-docker provides a Docker-compatible CLI alias
docker ps  # Actually runs podman
```

## Verify Docker and Portainer

```bash
docker --version
docker info
curl -k https://localhost:9443
```

## Conclusion

Docker CE runs on RHEL 8 and 9 using Docker's official RHEL packages. On SELinux-enforcing RHEL hosts, Portainer's official Docker installation guidance requires running the container with `--privileged`. For organizations that want the Red Hat-supported container stack, consider using Podman with the `podman-docker` compatibility layer as an alternative to Docker CE.
