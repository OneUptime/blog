# How to Install Portainer CE on CentOS with Docker

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Portainer, CentOS, Docker, Installation, RHEL

Description: A step-by-step guide to installing Portainer Community Edition on CentOS 7 and CentOS Stream 8/9 with Docker, including SELinux considerations.

## Overview

CentOS is widely used in enterprise environments. This guide covers installing Portainer CE on CentOS Stream 9, including Docker installation via the official Docker repository and handling CentOS-specific configurations like firewalld and SELinux. CentOS 7 and CentOS Stream 8 are end-of-life and are no longer covered by Docker's current CentOS installation documentation.

## Prerequisites

- CentOS Stream 9
- Persistent storage for the Portainer data volume
- Root or sudo access

## Step 1: Update System

```bash
# Update all packages

sudo dnf update -y   # CentOS Stream 9
```

## Step 2: Install Docker on CentOS

### CentOS Stream 9

```bash
# Remove old versions
sudo dnf remove docker \
  docker-client \
  docker-client-latest \
  docker-common \
  docker-latest \
  docker-latest-logrotate \
  docker-logrotate \
  docker-engine

# Install dnf-plugins-core
sudo dnf -y install dnf-plugins-core

# Add Docker repository
sudo dnf config-manager --add-repo \
  https://download.docker.com/linux/centos/docker-ce.repo

# Install Docker
sudo dnf install -y docker-ce docker-ce-cli containerd.io \
  docker-buildx-plugin docker-compose-plugin

# Start and enable Docker
sudo systemctl enable --now docker

# Add user to docker group
sudo usermod -aG docker $USER
newgrp docker
```

## Step 3: Configure SELinux

CentOS commonly runs SELinux. Portainer's Docker installation instructions assume SELinux is disabled. If SELinux must remain enabled, add `--privileged` to the `docker run` command in Step 5.

```bash
# Check SELinux status
getenforce
# Options: Enforcing, Permissive, Disabled
```

## Step 4: Configure Firewall

```bash
# Open Portainer ports in firewalld (8000 is only needed for Edge Agents)
sudo firewall-cmd --permanent --add-port=9443/tcp
sudo firewall-cmd --permanent --add-port=8000/tcp
sudo firewall-cmd --reload

# Verify
sudo firewall-cmd --list-all
```

## Step 5: Deploy Portainer CE

```bash
# Create data volume
docker volume create portainer_data

# Deploy Portainer CE (remove -p 8000:8000 if you do not use Edge Agents)
docker run -d \
  -p 8000:8000 \
  -p 9443:9443 \
  --name portainer \
  --restart=always \
  -v /var/run/docker.sock:/var/run/docker.sock \
  -v portainer_data:/data \
  portainer/portainer-ce:lts

# If SELinux must remain enabled, add:
#   --privileged
```

## Step 6: Verify and Access

```bash
# Check Portainer is running
docker ps | grep portainer

# Check logs
docker logs portainer

# Access Portainer UI
echo "Access Portainer at: https://$(hostname -I | awk '{print $1}'):9443"
```

## SELinux Troubleshooting

If Portainer fails to start with SELinux enabled:

```bash
# Recreate the container with --privileged
docker stop portainer && docker rm portainer
docker run -d \
  --privileged \
  -p 8000:8000 \
  -p 9443:9443 \
  --name portainer \
  --restart=always \
  -v /var/run/docker.sock:/var/run/docker.sock \
  -v portainer_data:/data \
  portainer/portainer-ce:lts

# Check logs
docker logs portainer
```

## Keeping Docker and Portainer Updated

```bash
# Update Docker
sudo dnf update docker-ce docker-ce-cli containerd.io \
  docker-buildx-plugin docker-compose-plugin     # CentOS Stream 9

# Update Portainer
docker pull portainer/portainer-ce:lts
docker stop portainer && docker rm portainer
docker run -d \
  -p 8000:8000 \
  -p 9443:9443 \
  --name portainer \
  --restart=always \
  -v /var/run/docker.sock:/var/run/docker.sock \
  -v portainer_data:/data \
  portainer/portainer-ce:lts

# If SELinux must remain enabled, add --privileged to the docker run command above.
```

## Conclusion

Installing Portainer CE on CentOS Stream 9 requires attention to firewalld and SELinux. Portainer's Docker-based Linux installation instructions assume SELinux is disabled; if it must remain enabled, deploy the container with `--privileged`. After installation, access the Portainer UI over HTTPS on port `9443`. For production CentOS-based deployments, consider Rocky Linux or AlmaLinux if you prefer a fixed-release alternative.
