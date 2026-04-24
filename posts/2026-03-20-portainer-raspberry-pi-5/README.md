# How to Install Portainer on Raspberry Pi 5

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Portainer, Raspberry-pi-5, ARM64, Docker, Home-lab

Description: A guide to installing Portainer CE on the Raspberry Pi 5, taking advantage of its improved performance for running multiple containers.

## Overview

The Raspberry Pi 5 offers significantly better performance than its predecessors with a faster processor, more RAM options, and PCIe support for NVMe SSDs. This makes it an excellent platform for Portainer CE and a small home lab Docker environment. This guide covers installing Portainer CE on Raspberry Pi OS for the Pi 5.

## Prerequisites

- Raspberry Pi 5
- MicroSD card (32GB+) or NVMe SSD via PCIe HAT (recommended)
- Raspberry Pi OS 64-bit
- Active cooling solution (recommended for sustained heavy workloads)

## Step 1: Flash and Boot Raspberry Pi OS

Use Raspberry Pi Imager to flash Raspberry Pi OS (64-bit) to your storage device. Enable SSH and set a username/password in the customisation settings.

## Step 2: Update System

```bash
ssh <username>@raspberrypi.local
sudo apt-get update && sudo apt-get upgrade -y
sudo reboot
```

## Step 3: Install Docker

```bash
# Docker installation script

curl -fsSL https://get.docker.com | sudo sh

# Add user to docker group
sudo usermod -aG docker $USER
newgrp docker

# Enable Docker
sudo systemctl enable --now docker

# Verify
docker --version
docker info | grep Architecture
# Architecture: aarch64
```

## Step 4: Configure NVMe SSD Storage (Pi 5 Feature)

If using a PCIe NVMe HAT:

```bash
# Check if NVMe drive is detected
lsblk
# Should show nvme0n1

# Partition and format
sudo parted /dev/nvme0n1 mklabel gpt
sudo parted /dev/nvme0n1 mkpart primary ext4 0% 100%
sudo mkfs.ext4 /dev/nvme0n1p1

# Mount NVMe storage
sudo mkdir -p /nvme
sudo mount /dev/nvme0n1p1 /nvme

# Add to fstab for persistence
echo '/dev/nvme0n1p1 /nvme ext4 defaults 0 2' | sudo tee -a /etc/fstab

# Configure Docker data-root to use NVMe
sudo tee /etc/docker/daemon.json > /dev/null << 'EOF'
{
  "data-root": "/nvme/docker"
}
EOF
sudo systemctl restart docker
```

On Docker Engine 29.0 and later, `data-root` does not move the containerd image store on fresh installs; configure containerd separately if you also want image and container snapshot data on the NVMe SSD.

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
  portainer/portainer-ce:sts
```

## Step 6: Performance Comparison vs Pi 4

The Pi 5 offers significant hardware improvements for container workloads:

| Feature | Pi 4 (8GB) | Pi 5 (8GB) |
|---|---|---|
| CPU | Cortex-A72, 1.8GHz | Cortex-A76, 2.4GHz |
| CPU Performance | Baseline | ~2-3x faster |
| RAM Speed | LPDDR4-3200 | LPDDR4X-4267 |
| Storage | MicroSD/USB | PCIe NVMe support |
| USB bandwidth | Baseline | More than 2x aggregate bandwidth |
| SD card performance | Baseline | Up to 2x peak SD performance |

## Step 7: Thermal Management

For sustained heavy loads, active cooling helps avoid throttling:

```bash
# Monitor temperature
watch -n 1 vcgencmd measure_temp

# Check CPU frequency (should stay at max if cooling is adequate)
cat /sys/devices/system/cpu/cpu0/cpufreq/scaling_cur_freq

# Check throttling
vcgencmd get_throttled
# 0x0 = no throttling
```

## Accessing Portainer

```bash
echo "Portainer URL: https://$(hostname -I | awk '{print $1}'):9443"
```

## Conclusion

The Raspberry Pi 5 is a substantial upgrade for home lab Docker deployments. The improved CPU performance, faster memory, and PCIe NVMe support make it a stronger platform for running Portainer CE and multiple containers. The optional NVMe SSD can also reduce reliance on microSD storage for Portainer data and other Docker volumes. Portainer CE makes the Pi 5 an accessible and capable home lab management platform.
