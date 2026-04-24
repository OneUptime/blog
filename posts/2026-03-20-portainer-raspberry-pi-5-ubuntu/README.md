# How to Install Portainer on Raspberry Pi 5 with Ubuntu Server

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Portainer, Raspberry Pi 5, Ubuntu, ARM64, Docker, Self-Hosted, Home Lab

Description: Set up Portainer on a Raspberry Pi 5 running Ubuntu Server 24.04 LTS to leverage the Pi 5's improved performance for a capable home lab server.

## Introduction

The Raspberry Pi 5 offers significantly improved performance over previous models with its Arm Cortex-A76 CPU and faster I/O. Pairing it with Ubuntu Server 24.04 LTS and Portainer creates a capable, energy-efficient home lab platform that can handle more demanding containerized workloads.

## Prerequisites

- Raspberry Pi 5 (4GB or 8GB recommended)
- MicroSD card (64GB+) or NVMe SSD via M.2 HAT (highly recommended)
- Ubuntu Server 24.04 LTS ARM64
- SSH access
- Active cooling (official Pi 5 case with fan recommended)

## Step 1: Install Ubuntu Server on Raspberry Pi 5

Use Raspberry Pi Imager to flash Ubuntu Server 24.04 LTS (64-bit) to your storage device. In the imager's OS customization:

- Set hostname
- Enable SSH
- Set username and password
- Configure Wi-Fi (if needed)

## Step 2: First Boot Setup

```bash
# SSH into the Pi

ssh <your-username>@<pi-ip>

# Update all packages
sudo apt update && sudo apt full-upgrade -y

# Install useful tools
sudo apt install -y curl wget git htop iotop net-tools

# Reboot to apply updates
sudo reboot
```

## Step 3: Configure NVMe SSD (Optional but Recommended)

If using the Pi 5 with M.2 HAT:

On fresh Docker Engine 29 installs, image and container snapshot data lives under `/var/lib/containerd`, so move both Docker's data root and containerd's root if you want Docker storage on NVMe.

```bash
# Check NVMe is detected
lsblk | grep nvme

# Format and mount NVMe (adjust /dev/nvme0n1 as needed)
sudo mkfs.ext4 /dev/nvme0n1
sudo mkdir -p /data
echo '/dev/nvme0n1 /data ext4 defaults,noatime 0 2' | sudo tee -a /etc/fstab
sudo mount -a

# Prepare Docker and containerd data directories on NVMe
sudo mkdir -p /data/docker /data/containerd
```

## Step 4: Install Docker

```bash
# Install Docker from Docker's official apt repository
sudo apt update
sudo apt install -y ca-certificates curl
sudo install -m 0755 -d /etc/apt/keyrings
sudo curl -fsSL https://download.docker.com/linux/ubuntu/gpg -o /etc/apt/keyrings/docker.asc
sudo chmod a+r /etc/apt/keyrings/docker.asc

sudo tee /etc/apt/sources.list.d/docker.sources > /dev/null <<EOF
Types: deb
URIs: https://download.docker.com/linux/ubuntu
Suites: $(. /etc/os-release && echo "${UBUNTU_CODENAME:-$VERSION_CODENAME}")
Components: stable
Architectures: $(dpkg --print-architecture)
Signed-By: /etc/apt/keyrings/docker.asc
EOF

sudo apt update
sudo apt install -y docker-ce docker-ce-cli containerd.io docker-buildx-plugin docker-compose-plugin

# Add current user to docker group
sudo usermod -aG docker $USER
newgrp docker

# Configure Docker to use NVMe storage (if applicable)
if [ -d /data/docker ] && [ -d /data/containerd ]; then
  sudo mkdir -p /etc/docker
  sudo tee /etc/docker/daemon.json > /dev/null << 'EOF'
  {
    "data-root": "/data/docker",
    "log-driver": "json-file",
    "log-opts": {
      "max-size": "10m",
      "max-file": "3"
    }
  }
EOF

  sudo mkdir -p /etc/containerd
  containerd config default | sudo tee /etc/containerd/config.toml > /dev/null
  sudo sed -i 's#^root = "/var/lib/containerd"#root = "/data/containerd"#' /etc/containerd/config.toml

  sudo systemctl restart containerd
fi

sudo systemctl restart docker
sudo systemctl enable docker
```

## Step 5: Install Portainer

```bash
# Create data volume
docker volume create portainer_data

# Deploy Portainer
docker run -d \
  --name portainer \
  --restart=unless-stopped \
  -p 9443:9443 \
  -v /var/run/docker.sock:/var/run/docker.sock \
  -v portainer_data:/data \
  portainer/portainer-ce:lts
```

## Step 6: Configure Ubuntu Firewall (UFW)

```bash
# Allow SSH before enabling UFW
sudo ufw allow OpenSSH

# Note: Docker-published ports such as 9443 bypass UFW rules by default.
# Portainer access is controlled by the ports you publish with docker run.

# Enable UFW
sudo ufw enable

# Verify rules
sudo ufw status verbose
```

## Step 7: Configure Static IP

```bash
# Check current network interface
ip link show

# Configure netplan for static IP (Ubuntu 24.04)
sudo tee /etc/netplan/01-static.yaml > /dev/null << 'EOF'
network:
  version: 2
  ethernets:
    eth0:
      dhcp4: false
      addresses:
        - 192.168.1.100/24
      nameservers:
        addresses: [8.8.8.8, 1.1.1.1]
      routes:
        - to: default
          via: 192.168.1.1
EOF

sudo netplan apply
```

## Pi 5 Performance Tuning

### Install Raspberry Pi Utilities

```bash
# Install Raspberry Pi utilities
sudo apt install -y libraspberrypi-bin

# Check CPU temperature
vcgencmd measure_temp

# Boost CPU governor for better container performance
echo 'performance' | sudo tee /sys/devices/system/cpu/cpu*/cpufreq/scaling_governor
```

### Persistent CPU Governor

```bash
sudo apt install -y cpufrequtils
echo 'GOVERNOR="performance"' | sudo tee /etc/default/cpufrequtils
```

## Monitoring Pi 5 Resources

```bash
# Check real-time stats
watch -n 1 'vcgencmd measure_temp && cat /sys/class/thermal/thermal_zone0/temp'

# Or deploy a monitoring container via Portainer
# Use the Netdata or Prometheus Node Exporter stack
```

## Conclusion

The Raspberry Pi 5 with Ubuntu Server and Portainer is one of the best value home lab platforms available. The improved CPU performance handles multiple concurrent containers smoothly, and Ubuntu Server's long-term support ensures security updates. An NVMe SSD dramatically improves I/O performance compared to MicroSD, making it suitable for database containers and other I/O-intensive workloads.
