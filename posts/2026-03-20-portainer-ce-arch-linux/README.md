# How to Install Portainer CE on Arch Linux with Docker

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Portainer, Arch-linux, Docker, Installation, Pacman

Description: A guide to installing Portainer Community Edition on Arch Linux with Docker using pacman and the Arch User Repository.

## Overview

Arch Linux's rolling release model provides access to the latest Docker and container tooling. This guide covers installing Docker from the official Arch repositories and deploying Portainer CE on Arch Linux.

## Prerequisites

- Arch Linux (up to date)
- Minimum: 2GB RAM, 20GB disk
- Sudo/root access

## Step 1: Update Arch Linux

```bash
# Full system update (always do this before installing packages on Arch)

sudo pacman -Syu --noconfirm
```

## Step 2: Install Docker

```bash
# Install Docker from official Arch repositories
sudo pacman -S --noconfirm docker docker-compose

# Enable and start Docker
sudo systemctl enable --now docker

# Add user to docker group
sudo usermod -aG docker $USER
newgrp docker
```

## Step 3: Verify Docker

```bash
docker --version
docker info
docker run hello-world
```

## Step 4: Install Portainer CE

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
  portainer/portainer-ce:sts
```

## Step 5: Firewall Configuration (if using a host firewall)

```bash
# Docker publishes container ports directly. If you use ufw,
# review Docker's firewall documentation before relying on ufw rules
# for published container ports.

# If using nftables, add a rule to your existing input chain
# Adjust the table/chain names if your ruleset uses different names
sudo nft add rule inet filter input tcp dport { 8000, 9443 } accept

# To make the change persistent, add the equivalent rule to your
# existing /etc/nftables.conf and reload nftables
sudo systemctl reload nftables
```

## Step 6: Optional - Install via AUR

Portainer is also available in the AUR (Arch User Repository):

```bash
# Install an AUR helper first (yay)
sudo pacman -S --noconfirm git base-devel
git clone https://aur.archlinux.org/yay.git
cd yay && makepkg -si --noconfirm
cd ..

# Install portainer-bin from AUR (provides systemd service)
yay -S portainer-bin --noconfirm

# Start Portainer via systemd
sudo systemctl enable --now portainer
```

## Access and Setup

```bash
# Get IP
ip -4 addr show scope global | awk '/inet / {print $2}' | cut -d/ -f1
# Navigate to https://<ip>:9443
```

## Keeping Portainer Updated on Arch

```bash
# Pull and update Portainer
docker pull portainer/portainer-ce:sts
docker stop portainer && docker rm portainer
docker run -d \
  -p 8000:8000 \
  -p 9443:9443 \
  --name portainer \
  --restart=always \
  -v /var/run/docker.sock:/var/run/docker.sock \
  -v portainer_data:/data \
  portainer/portainer-ce:sts
```

## Conclusion

Arch Linux provides bleeding-edge Docker packages via pacman, making it excellent for developers who want the latest features. The rolling release model means you should run `pacman -Syu` regularly to keep Docker and the system up to date. Portainer CE works seamlessly on Arch Linux and provides a helpful GUI for managing containers on your Arch system.
