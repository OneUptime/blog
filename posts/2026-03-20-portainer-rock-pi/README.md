# How to Run Portainer on a Rock Pi

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Portainer, Rock Pi, Rockchip, ARM64, Docker, Self-Hosted, Home Lab

Description: Install Docker and Portainer on Rock Pi single-board computers powered by Rockchip processors for a capable and affordable home lab platform.

## Introduction

The Rockchip-based Rock Pi and ROCK boards from Radxa are capable ARM64 single-board computers built around processors such as the RK3399 and RK3588 series. The RK3588 in particular rivals desktop CPUs for single-board performance. This guide covers installing Docker and Portainer on Rockchip-based Radxa boards running Ubuntu or Debian.

## Supported Models

- Rock Pi 4 (RK3399) - up to 4GB LPDDR4
- Rock 4 SE (RK3399-T)
- Rock 5B (RK3588) - 6 TOPS NPU, up to 16GB RAM
- Rock 5A (RK3588S)

## Prerequisites

- Radxa Rock Pi or ROCK board with Ubuntu 22.04 or Debian 11
- eMMC module or MicroSD (eMMC strongly recommended)
- SSH access

## Step 1: Flash and Configure the OS

Download the official Debian-based image for your board from Radxa's documentation. Flash using BalenaEtcher.

```bash
# SSH in with the default Radxa OS credentials

ssh radxa@<rock-pi-ip>

# Update system
sudo apt update && sudo apt full-upgrade -y

# If you want to move the system to eMMC or NVMe,
# follow Radxa's model-specific boot media instructions
```

## Step 2: Install Docker

```bash
# Install prerequisites
sudo apt update
sudo apt install -y \
    ca-certificates \
    curl

# Add Docker GPG key and repository for Ubuntu or Debian
sudo install -m 0755 -d /etc/apt/keyrings

. /etc/os-release
if [ "$ID" = "ubuntu" ]; then
  DISTRO=ubuntu
  CODENAME="${UBUNTU_CODENAME:-$VERSION_CODENAME}"
elif [ "$ID" = "debian" ]; then
  DISTRO=debian
  CODENAME="$VERSION_CODENAME"
else
  echo "This guide expects Ubuntu or Debian." >&2
  exit 1
fi

sudo curl -fsSL https://download.docker.com/linux/$DISTRO/gpg \
  -o /etc/apt/keyrings/docker.asc
sudo chmod a+r /etc/apt/keyrings/docker.asc

sudo tee /etc/apt/sources.list.d/docker.sources > /dev/null <<EOF
Types: deb
URIs: https://download.docker.com/linux/$DISTRO
Suites: $CODENAME
Components: stable
Architectures: $(dpkg --print-architecture)
Signed-By: /etc/apt/keyrings/docker.asc
EOF

# Install Docker
sudo apt update
sudo apt install -y docker-ce docker-ce-cli containerd.io docker-buildx-plugin docker-compose-plugin

# Add user to docker group
sudo usermod -aG docker $USER

sudo systemctl enable --now docker

# Log out and back in before using Docker without sudo,
# or run: newgrp docker
```

## Step 3: Fix Rockchip cgroup Issues

Older Rockchip kernels may have incomplete cgroup support, especially for the memory controller:

```bash
# On cgroup v2 systems, list available controllers
cat /sys/fs/cgroup/cgroup.controllers 2>/dev/null

# If memory is missing on an older kernel, add kernel parameters.
# On Radxa OS, edit:
sudo nano /etc/kernel/cmdline
# Add: cgroup_enable=memory cgroup_memory=1

sudo u-boot-update
# Verify the generated boot entry:
cat /boot/extlinux/extlinux.conf

sudo reboot
```

## Step 4: Configure Docker for Rockchip

```bash
sudo mkdir -p /etc/docker
sudo tee /etc/docker/daemon.json > /dev/null << 'EOF'
{
  "storage-driver": "overlay2",
  "log-driver": "json-file",
  "log-opts": {
    "max-size": "10m",
    "max-file": "3"
  }
}
EOF

sudo systemctl restart docker
```

## Step 5: Install Portainer

```bash
docker volume create portainer_data

docker run -d \
  --name portainer \
  --restart=always \
  -p 9443:9443 \
  -v /var/run/docker.sock:/var/run/docker.sock \
  -v portainer_data:/data \
  portainer/portainer-ce:sts
```

## Step 6: Configure Firewall

Docker-published ports bypass normal UFW rules on Debian and Ubuntu. Keep SSH open, then restrict access to Portainer with upstream firewalling or Docker's `DOCKER-USER` chain if you need tighter network controls.

```bash
sudo apt install -y ufw
sudo ufw allow ssh
sudo ufw enable
```

## Rock Pi 5 with RK3588 - Performance Stack

The Rock 5B with RK3588 supports running much heavier workloads. Example high-performance stack:

```yaml
services:
  # Database server - takes advantage of RK3588's performance
  postgresql:
    image: postgres:16-alpine
    environment:
      POSTGRES_PASSWORD: securepassword
      POSTGRES_DB: production
    volumes:
      - postgres_data:/var/lib/postgresql/data
    # Example tuning for an 8GB+ RK3588 board
    command: >
      postgres
      -c max_connections=200
      -c shared_buffers=1GB
      -c effective_cache_size=3GB
      -c maintenance_work_mem=256MB
    ports:
      - "5432:5432"
    restart: unless-stopped

  # Redis cache
  redis:
    image: redis:7-alpine
    command: redis-server --maxmemory 512mb --maxmemory-policy allkeys-lru
    ports:
      - "6379:6379"
    restart: unless-stopped

volumes:
  postgres_data:
```

## NPU Acceleration (Rock Pi 5 / RK3588)

NPU-accelerated workloads on the RK3588 require the Rockchip RKNPU2 userspace stack on the host:

```bash
# Check the installed RKNPU driver
sudo cat /sys/kernel/debug/rknpu/version

# If needed on Radxa OS
sudo apt update
sudo apt install -y rknpu2-rk3588
sudo reboot
```

## Conclusion

Rock Pi boards with Portainer offer excellent home lab capabilities, especially the Rock 5B with RK3588 which provides near-desktop performance at low power consumption. Many major Docker images publish ARM64 variants, making these boards practical for self-hosting. For demanding workloads, the RK3588's combination of A76 performance cores and a capable NPU makes it stand out among SBCs.
