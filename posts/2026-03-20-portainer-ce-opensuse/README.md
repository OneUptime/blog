# How to Install Portainer CE on openSUSE with Docker

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Portainer, openSUSE, Docker, Installation, SUSE, Zypper

Description: A guide to installing Portainer Community Edition on openSUSE Leap and openSUSE Tumbleweed with Docker, covering zypper configuration and AppArmor considerations.

## Overview

openSUSE is a community Linux distribution sponsored by SUSE. It uses the `zypper` package manager, and openSUSE Leap has AppArmor enabled by default. This guide covers installing Portainer CE on openSUSE Leap 15.6 and openSUSE Tumbleweed.

## Prerequisites

- openSUSE Leap 15.6 or Tumbleweed
- Minimum: 2GB RAM, 20GB disk
- Root or sudo access

## Step 1: Update System

```bash
# Update packages

sudo zypper refresh
sudo zypper update -y
```

## Step 2: Install Docker

```bash
# Add the repository that matches your openSUSE release
# For openSUSE Tumbleweed:
sudo zypper addrepo https://download.opensuse.org/repositories/Virtualization:containers/openSUSE_Tumbleweed/Virtualization:containers.repo

# For openSUSE Leap 15.6:
sudo zypper addrepo https://download.opensuse.org/repositories/Virtualization:containers/15.6/Virtualization:containers.repo

sudo zypper refresh
sudo zypper install -y docker

# Enable and start Docker
sudo systemctl enable --now docker

# Add user to docker group
sudo usermod -aG docker $USER
newgrp docker
```

## Step 3: Verify AppArmor for Docker

openSUSE uses AppArmor. Docker loads the `docker-default` profile for containers automatically, so no manual AppArmor profile import is normally required:

```bash
# Check AppArmor status
sudo aa-status

# Verify Docker's default AppArmor profile is loaded
sudo aa-status | grep docker-default
```

## Step 4: Configure Firewall (firewalld)

```bash
# For openSUSE using firewalld
sudo firewall-cmd --permanent --add-port=9443/tcp
sudo firewall-cmd --permanent --add-port=8000/tcp
sudo firewall-cmd --reload

# Verify
sudo firewall-cmd --list-ports
```

## Step 5: Deploy Portainer CE

```bash
# Create data volume
docker volume create portainer_data

# Deploy Portainer CE
docker run -d \
  -p 8000:8000 \
  -p 9443:9443 \
  --name portainer \
  --restart=always \
  -v /var/run/docker.sock:/var/run/docker.sock \
  -v portainer_data:/data \
  portainer/portainer-ce:lts

# Verify
docker ps | grep portainer
```

## Step 6: Access Portainer

```bash
# Get server IP
hostname -I | awk '{print $1}'
# Navigate to https://<ip>:9443
```

## Troubleshooting on openSUSE

### Docker Socket Permission Issue

```bash
# Check socket permissions
ls -la /var/run/docker.sock

# Ensure docker group exists and user is in it
getent group docker
groups $USER
```

### AppArmor Blocking Docker

```bash
# Check for AppArmor denials
sudo journalctl -k | grep apparmor | grep DENIED

# Check that Docker's default AppArmor profile is present
sudo aa-status | grep docker-default
```

## Using Docker from the openSUSE Virtualization:containers Repository

The commands in Step 2 use the openSUSE `Virtualization:containers` repository. If you need to add it separately later, use the repository that matches your release:

```bash
# For openSUSE Tumbleweed
sudo zypper addrepo \
  https://download.opensuse.org/repositories/Virtualization:containers/openSUSE_Tumbleweed/Virtualization:containers.repo

# For openSUSE Leap 15.6
sudo zypper addrepo \
  https://download.opensuse.org/repositories/Virtualization:containers/15.6/Virtualization:containers.repo

sudo zypper refresh
sudo zypper install -y docker
```

## Conclusion

openSUSE's SUSE heritage makes it an excellent platform for enterprise-oriented Docker deployments. The AppArmor security framework provides additional container isolation. Once configured, Portainer CE runs seamlessly on openSUSE and provides the same management capabilities as on any other Linux distribution. openSUSE Leap's close alignment with SUSE Linux Enterprise makes it a solid choice for teams using Rancher in production.
