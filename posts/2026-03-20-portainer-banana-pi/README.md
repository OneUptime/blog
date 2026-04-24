# How to Install Portainer on Banana Pi - A Practical Guide

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Portainer, Banana Pi, ARM, Docker, Self-Hosted, Home Lab

Description: Install Docker and Portainer on Banana Pi single-board computers to create an affordable home lab or network appliance running containerized services.

## Introduction

Banana Pi boards offer competitive ARM hardware, with models like the Banana Pi M5 (Amlogic S905X3) and Banana Pi M7 (Rockchip RK3588) providing good performance for home lab use. This guide covers installing Docker and Portainer on Banana Pi boards running Ubuntu or Armbian.

## Recommended Models

- **BPi-M5**: Amlogic S905X3, 4GB RAM - good for light home lab use
- **BPi-M7**: Rockchip RK3588, up to 32GB RAM - capable of heavy workloads
- **BPi-R3**: MediaTek MT7986, designed for networking - great for router/firewall
- **BPi-W3**: RK3588, PCIe support - best for server use cases

## Prerequisites

- Banana Pi board with Armbian or Ubuntu image
- SD card or eMMC
- SSH access

## Step 1: Flash and Boot

Download the official Armbian image for your Banana Pi model from armbian.com or the official Banana Pi wiki. Armbian generally provides strong kernel support for Banana Pi boards.

```bash
# SSH in (Armbian default: user=root, pass=1234)

ssh root@<banana-pi-ip>

# On first login, Armbian prompts to create a new user
# Create a non-root user and set password

# Update system
apt update && apt full-upgrade -y
reboot
```

## Step 2: Configure Armbian for Docker

```bash
# Load common kernel modules used by Docker networking
modprobe overlay
modprobe br_netfilter

# Make modules persistent
cat >> /etc/modules-load.d/docker.conf << 'EOF'
overlay
br_netfilter
EOF

# Configure sysctl for Docker networking
tee /etc/sysctl.d/99-docker.conf << 'EOF'
net.bridge.bridge-nf-call-iptables = 1
net.bridge.bridge-nf-call-ip6tables = 1
net.ipv4.ip_forward = 1
EOF

sysctl --system
```

## Step 3: Install Docker

```bash
# Use Docker's convenience script (works on Armbian)
curl -fsSL https://get.docker.com | sh

# Add your regular user to the docker group
usermod -aG docker <your-user>

# Start and enable Docker
systemctl enable --now docker

# Verify
docker info
```

Log out and back in as your regular user after this step if you want to run Docker without `sudo`.

## Step 4: Install Portainer

```bash
# Create data volume
docker volume create portainer_data

# Deploy Portainer (9443 is the default HTTPS UI; add -p 9000:9000 only if you need legacy HTTP access)
docker run -d \
  --name portainer \
  --restart=always \
  -p 8000:8000 \
  -p 9443:9443 \
  -v /var/run/docker.sock:/var/run/docker.sock \
  -v portainer_data:/data \
  portainer/portainer-ce:lts

# Verify
docker ps
```

## Step 5: Optimize for Banana Pi

### Use eMMC for Better I/O

```bash
# List MMC storage devices
lsblk | grep mmcblk

# Set Docker's data directory to a path on your mounted eMMC
# In /etc/docker/daemon.json:
{
  "data-root": "/mnt/emmc/docker"
}
```

On fresh Docker Engine 29+ installs, image and snapshot data may also be stored under `/var/lib/containerd`, so changing only `data-root` does not move all Docker-managed data.

### Configure Armbian CPU Governor

```bash
# Launch armbian-config
armbian-config

# Or set manually
echo 'performance' | tee /sys/devices/system/cpu/cpu*/cpufreq/scaling_governor
```

## Example Stack for Banana Pi R3 (Router)

The BPi-R3 is excellent for network services:

```yaml
services:
  # AdGuard Home for DNS filtering
  adguard:
    image: adguard/adguardhome:latest
    ports:
      - "53:53/udp"
      - "53:53/tcp"
      - "3000:3000"    # Initial setup
      - "80:80"        # Admin UI
    volumes:
      - adguard_conf:/opt/adguardhome/conf
      - adguard_work:/opt/adguardhome/work
    restart: unless-stopped

  # Wireguard VPN
  wireguard:
    image: lscr.io/linuxserver/wireguard:latest
    cap_add:
      - NET_ADMIN
      - SYS_MODULE
    environment:
      - PUID=1000
      - PGID=1000
      - TZ=America/New_York
      - SERVERURL=<your-public-ip>
      - PEERS=3
    volumes:
      - wireguard_config:/config
      - /lib/modules:/lib/modules
    ports:
      - "51820:51820/udp"
    sysctls:
      - net.ipv4.conf.all.src_valid_mark=1
    restart: unless-stopped

volumes:
  adguard_conf:
  adguard_work:
  wireguard_config:
```

## Conclusion

Banana Pi boards with Portainer provide flexible home lab platforms at competitive price points. Armbian's excellent kernel support makes Docker compatibility straightforward. The BPi-R3 in particular shines as a networking appliance, while the BPi-M7 with RK3588 can handle heavier containerized workloads comparable to small server hardware.
