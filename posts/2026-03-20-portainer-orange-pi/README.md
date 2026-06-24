# How to Install Portainer on Orange Pi - A Practical Guide

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Portainer, Orange Pi, ARM, Docker, Self-Hosted, Home Lab

Description: Install Docker and Portainer on an Orange Pi single-board computer running Ubuntu or Debian to create an affordable home lab container platform.

## Introduction

Orange Pi single-board computers offer an affordable alternative to Raspberry Pi, with models featuring Allwinner or Rockchip processors and up to 32GB RAM. Many models support Docker natively, making them suitable home lab platforms. This guide covers installing Portainer on Orange Pi 5 or similar models running Ubuntu Server.

## Prerequisites

- Orange Pi model with ARM64 processor (Orange Pi 5, 5B, or 5 Plus recommended)
- Ubuntu 22.04 (official Orange Pi Ubuntu image)
- SSH access
- MicroSD card or eMMC storage

## Step 1: Flash and Boot Ubuntu

Download the official Ubuntu image for your Orange Pi model from the Orange Pi website. Flash using balenaEtcher or dd.

On first boot:

```bash
# Default credentials for most Orange Pi Ubuntu images

# Username: orangepi  Password: orangepi
ssh orangepi@<orangepi-ip>

# Update system
sudo apt update && sudo apt upgrade -y

# Change default password
passwd
```

## Step 2: Install Docker

```bash
# Install Docker dependencies
sudo apt install -y \
    ca-certificates \
    curl \
    gnupg \
    lsb-release

# Add Docker's official GPG key
sudo install -m 0755 -d /etc/apt/keyrings
curl -fsSL https://download.docker.com/linux/ubuntu/gpg | \
    sudo gpg --dearmor -o /etc/apt/keyrings/docker.gpg
sudo chmod a+r /etc/apt/keyrings/docker.gpg

# Add Docker repository
echo \
  "deb [arch=$(dpkg --print-architecture) signed-by=/etc/apt/keyrings/docker.gpg] \
  https://download.docker.com/linux/ubuntu \
  $(. /etc/os-release && echo "${UBUNTU_CODENAME:-$VERSION_CODENAME}") stable" | \
  sudo tee /etc/apt/sources.list.d/docker.list > /dev/null

# Install Docker Engine
sudo apt update
sudo apt install -y docker-ce docker-ce-cli containerd.io docker-buildx-plugin docker-compose-plugin

# Add user to docker group
sudo usermod -aG docker $USER
newgrp docker

# Enable and start Docker
sudo systemctl enable --now docker

# Test Docker
docker run hello-world
```

## Step 3: Configure cgroup v2 (if needed)

Ubuntu 22.04 normally uses cgroup v2 already, so only change this if Docker still reports v1 on your image:

```bash
# Check cgroup version
docker info | grep "Cgroup Version"

# If v1, enable v2 via kernel parameter on Orange Pi Linux images
if ! grep -q 'systemd.unified_cgroup_hierarchy=1' /boot/orangepiEnv.txt; then
  if grep -q '^extraargs=' /boot/orangepiEnv.txt; then
    sudo sed -i '/^extraargs=/ s/$/ systemd.unified_cgroup_hierarchy=1/' /boot/orangepiEnv.txt
  else
    echo 'extraargs=systemd.unified_cgroup_hierarchy=1' | sudo tee -a /boot/orangepiEnv.txt
  fi
fi
sudo reboot
```

## Step 4: Install Portainer

```bash
# Create data volume
docker volume create portainer_data

# Deploy Portainer (ARM64 compatible)
docker run -d \
  --name portainer \
  --restart=always \
  -p 9443:9443 \
  -v /var/run/docker.sock:/var/run/docker.sock \
  -v portainer_data:/data \
  portainer/portainer-ce:sts

# Verify
docker ps
```

## Step 5: Configure Firewall

Docker publishes container ports directly, so UFW does not block `-p 9443:9443` on its own. Use UFW for host services like SSH, and bind Portainer to `127.0.0.1` or a specific host IP in the `docker run` command if you do not want it exposed on all interfaces.

```bash
# Allow SSH on the host
sudo ufw allow ssh
sudo ufw enable

# Example for local-only access when starting Portainer:
# -p 127.0.0.1:9443:9443
```

## Handling Allwinner/Rockchip Quirks

### Missing Kernel Modules

Some Docker features require kernel modules that may not be loaded by default:

```bash
# Load overlay module (required for overlay2 storage driver)
sudo modprobe overlay
echo 'overlay' | sudo tee /etc/modules-load.d/overlay.conf

# Load br_netfilter (required for Docker networking)
sudo modprobe br_netfilter
echo 'br_netfilter' | sudo tee /etc/modules-load.d/br_netfilter.conf

# Apply sysctl settings for Docker networking
sudo tee /etc/sysctl.d/99-docker.conf > /dev/null << 'EOF'
net.bridge.bridge-nf-call-iptables = 1
net.bridge.bridge-nf-call-ip6tables = 1
net.ipv4.ip_forward = 1
EOF
sudo sysctl --system
```

### Orange Pi 5 NPU Support

The Orange Pi 5 includes an NPU (Neural Processing Unit). To use it in containers:

```bash
# Check NPU device
ls /dev/rknpu*

# Add NPU device to containers (example)
docker run -d \
  --device /dev/rknpu0:/dev/rknpu0 \
  --name my-ai-app \
  my-ai-image:latest
```

## Performance Considerations

Orange Pi 5 benchmarks well due to its Cortex-A76 cores, but keep in mind:

- eMMC storage is faster than MicroSD - use it for Docker data directory
- The Mali G610 GPU cannot be easily used for general GPU compute in Docker
- Thermal throttling occurs without active cooling - add a heatsink and small fan

## Conclusion

Orange Pi SBCs with Portainer provide an affordable path to home lab container management. While they require slightly more setup than Raspberry Pi (especially for kernel modules), the lower cost and higher RAM options make them attractive for users running many containers. The ARM64 architecture means most modern Docker images work without any modifications.
