# How to Install Portainer CE on Ubuntu with Docker

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Portainer, Ubuntu, Docker, Installation, Container-management

Description: A step-by-step guide to installing Portainer Community Edition on Ubuntu Linux with Docker, including Docker installation and first-time setup.

## Overview

Portainer CE is a lightweight, open-source container management UI that makes it easy to manage Docker environments without needing to master the Docker CLI. This guide covers installing Portainer CE on Ubuntu (22.04 and 24.04 LTS) from scratch, including Docker installation, Portainer deployment, and initial configuration.

## Prerequisites

- Ubuntu 22.04 or 24.04 LTS (fresh install recommended)
- Sufficient disk space for Docker images, containers, and the Portainer data volume
- Root or sudo access
- Internet connectivity

## Step 1: Update System Packages

```bash
# Update package index and upgrade existing packages

sudo apt-get update && sudo apt-get upgrade -y
```

## Step 2: Install Docker

```bash
# Remove any conflicting Docker packages
sudo apt remove $(dpkg --get-selections docker.io docker-compose docker-compose-v2 docker-doc podman-docker containerd runc | cut -f1)

# Install prerequisites
sudo apt-get install -y \
  ca-certificates \
  curl \
  gnupg \
  lsb-release

# Add Docker's official GPG key
sudo install -m 0755 -d /etc/apt/keyrings
curl -fsSL https://download.docker.com/linux/ubuntu/gpg | \
  sudo gpg --dearmor -o /etc/apt/keyrings/docker.gpg
sudo chmod a+r /etc/apt/keyrings/docker.gpg

# Set up the Docker repository
echo \
  "deb [arch=$(dpkg --print-architecture) signed-by=/etc/apt/keyrings/docker.gpg] \
  https://download.docker.com/linux/ubuntu \
  $(lsb_release -cs) stable" | \
  sudo tee /etc/apt/sources.list.d/docker.list > /dev/null

# Install Docker Engine
sudo apt-get update
sudo apt-get install -y docker-ce docker-ce-cli containerd.io docker-buildx-plugin docker-compose-plugin

# Start and enable Docker
sudo systemctl enable --now docker

# Add current user to docker group
sudo usermod -aG docker $USER

# Apply the new group membership to the current shell
newgrp docker
```

## Step 3: Verify Docker Installation

```bash
# Verify Docker is running
sudo systemctl status docker

# Test Docker with hello-world
sudo docker run hello-world

# Check Docker version
docker --version
# Output: Docker version xx.x.x, build xxxxxxx
```

## Step 4: Install Portainer CE

```bash
# Create a Docker volume for Portainer data persistence
docker volume create portainer_data

# Install Portainer CE
docker run -d \
  -p 8000:8000 \
  -p 9443:9443 \
  --name portainer \
  --restart=always \
  -v /var/run/docker.sock:/var/run/docker.sock \
  -v portainer_data:/data \
  portainer/portainer-ce:latest

# Verify Portainer is running
docker ps | grep portainer
```

## Step 5: Review Firewall Settings (if ufw is enabled)

```bash
# Check if ufw is active
sudo ufw status

# Docker-published ports bypass ufw rules on Ubuntu.
# If you need to restrict access to Portainer, add rules to Docker's DOCKER-USER chain instead of relying on ufw allow/deny.
```

## Step 6: Access Portainer Web UI

Open your browser and navigate to:

```text
https://<your-server-ip>:9443
```

You will see a certificate warning for the self-signed certificate - proceed to the page.

**First-time setup:**
1. Create an admin account with a strong password (minimum 12 characters)
2. Click "Get Started" to manage the automatically detected local Docker environment

## Step 7: Verify Installation

```bash
# Check Portainer container status
docker inspect portainer --format='{{.State.Status}}'
# Output: running

# Check Portainer logs
docker logs portainer
```

## Optional: Enable Legacy HTTP Access on Port 9000

```bash
# Stop and remove existing Portainer container
docker stop portainer && docker rm portainer

# Restart with port 9000 exposed for HTTP access
docker run -d \
  -p 8000:8000 \
  -p 9000:9000 \
  -p 9443:9443 \
  --name portainer \
  --restart=always \
  -v /var/run/docker.sock:/var/run/docker.sock \
  -v portainer_data:/data \
  portainer/portainer-ce:latest
```

## Updating Portainer

```bash
# Pull the latest Portainer image
docker pull portainer/portainer-ce:latest

# Stop and remove the old container
docker stop portainer
docker rm portainer

# Start a new container with the same configuration
docker run -d \
  -p 8000:8000 \
  -p 9443:9443 \
  --name portainer \
  --restart=always \
  -v /var/run/docker.sock:/var/run/docker.sock \
  -v portainer_data:/data \
  portainer/portainer-ce:latest
```

## Troubleshooting

### Port Already in Use

```bash
# Check what is using port 9443
sudo ss -tlnp | grep 9443

# Kill the process or change Portainer's port
docker run -d -p 9444:9443 ... portainer/portainer-ce:latest
```

### Cannot Access Docker Socket

```bash
# Ensure the docker group has socket access
ls -la /var/run/docker.sock
# Should show: srw-rw---- root docker

# Verify the Portainer container has the Docker socket mounted
docker inspect portainer --format='{{range .Mounts}}{{println .Source "->" .Destination}}{{end}}' | grep docker.sock
# If no socket mount is shown, recreate Portainer using the install command above.
```

## Conclusion

Installing Portainer CE on Ubuntu is straightforward and takes less than 10 minutes. Once running, Portainer provides a comprehensive web UI for managing containers, images, volumes, networks, and stacks. The `--restart=always` flag ensures Portainer automatically restarts when the server reboots. For production use, consider setting up a reverse proxy (Nginx, Traefik) in front of Portainer with a valid TLS certificate from Let's Encrypt.
