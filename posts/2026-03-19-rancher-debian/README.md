# How to Install Rancher on Debian

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Rancher, Debian, Docker, Kubernetes, Installation

Description: A step-by-step guide to installing Rancher on Debian 12 (Bookworm) using Docker, covering system preparation, Docker installation, and Rancher configuration.

Debian is known for its stability, security, and commitment to free software. Debian 12 (Bookworm) remains a solid foundation for running Rancher, although Debian 13 is now the current stable release. Rancher's single-node Docker installation is intended for testing and development only. This guide covers the entire process from preparing a fresh Debian 12 server to deploying a fully functional Rancher instance.

## Prerequisites

Before you begin, ensure you have:

- A 64-bit x86 server running Debian 12 (Bookworm) sized according to Rancher's current installation requirements
- Root or sudo access
- A static IP address or DNS name
- Internet access for downloading packages

## Step 1: Update the System

Update all packages to their latest versions:

```bash
sudo apt update && sudo apt upgrade -y
```

## Step 2: Install Required Dependencies

Install the packages needed for Docker and general system management:

```bash
sudo apt install -y \
  apt-transport-https \
  ca-certificates \
  curl \
  gnupg \
  lsb-release \
  software-properties-common \
  iptables
```

## Step 3: Disable Swap

```bash
sudo swapoff -a
sudo sed -i '/ swap / s/^/#/' /etc/fstab
```

## Step 4: Install Docker

Add the Docker GPG key and repository:

```bash
sudo install -m 0755 -d /etc/apt/keyrings
curl -fsSL https://download.docker.com/linux/debian/gpg | sudo gpg --dearmor -o /etc/apt/keyrings/docker.gpg
sudo chmod a+r /etc/apt/keyrings/docker.gpg

echo "deb [arch=$(dpkg --print-architecture) signed-by=/etc/apt/keyrings/docker.gpg] https://download.docker.com/linux/debian $(lsb_release -cs) stable" | sudo tee /etc/apt/sources.list.d/docker.list > /dev/null
```

Install Docker Engine:

```bash
sudo apt update
sudo apt install -y docker-ce docker-ce-cli containerd.io docker-buildx-plugin docker-compose-plugin
```

Enable and start Docker:

```bash
sudo systemctl enable docker
sudo systemctl start docker
```

Add your user to the Docker group:

```bash
sudo usermod -aG docker $USER
newgrp docker
```

Verify Docker:

```bash
docker --version
docker run hello-world
```

## Step 5: Configure the Firewall

Debian does not enable a firewall by default. Rancher on Docker requires inbound TCP `80` and `443` on the Rancher node. Outbound TCP `6443` may also be needed later when Rancher connects to hosted or imported cluster APIs. Be aware that Docker-published ports bypass `ufw`, so if you need to restrict access, use `iptables`/`ip6tables` rules in the `DOCKER-USER` chain or an upstream firewall/security group.

## Step 6: Configure Kernel Modules

Load the required modules:

```bash
cat <<EOF | sudo tee /etc/modules-load.d/rancher.conf
br_netfilter
overlay
EOF

sudo modprobe br_netfilter
sudo modprobe overlay
```

Configure sysctl parameters:

```bash
cat <<EOF | sudo tee /etc/sysctl.d/99-rancher.conf
net.bridge.bridge-nf-call-iptables = 1
net.bridge.bridge-nf-call-ip6tables = 1
net.ipv4.ip_forward = 1
EOF

sudo sysctl --system
```

## Step 7: Configure Docker Logging

```bash
sudo mkdir -p /etc/docker
sudo tee /etc/docker/daemon.json <<EOF
{
  "log-driver": "json-file",
  "log-opts": {
    "max-size": "10m",
    "max-file": "3"
  },
  "storage-driver": "overlay2"
}
EOF

sudo systemctl restart docker
```

## Step 8: Create Persistent Storage

```bash
sudo mkdir -p /opt/rancher
```

## Step 9: Run Rancher

Deploy Rancher using Docker for a single-node testing or development environment:

```bash
docker run -d \
  --name rancher \
  --restart=unless-stopped \
  -p 80:80 \
  -p 443:443 \
  -v /opt/rancher:/var/lib/rancher \
  --privileged \
  rancher/rancher:latest
```

## Step 10: Get the Bootstrap Password

Wait about a minute for Rancher to initialize:

```bash
docker logs rancher 2>&1 | grep "Bootstrap Password:"
```

## Step 11: Access the Rancher UI

Navigate to `https://<your-server-ip>` in your browser. Accept the self-signed certificate warning and enter the bootstrap password.

Complete the initial setup:

1. Set a new admin password
2. Configure the Rancher server URL
3. Accept the terms and conditions

## Debian Specific Considerations

**Nftables vs iptables**: Debian 12 uses `iptables-nft` by default. Docker is compatible with `iptables-nft` and `iptables-legacy`, but firewall rules created with native `nft` commands are not supported on a host running Docker. If you need to filter Docker-published traffic, use `iptables`/`ip6tables` and the `DOCKER-USER` chain.

**Minimal installation**: If you installed Debian with a minimal profile, you may need to install additional packages:

```bash
sudo apt install -y sudo vim procps
```

**Time synchronization**: Ensure NTP is configured for accurate time keeping, which is important for certificate validation:

```bash
sudo apt install -y systemd-timesyncd
sudo timedatectl set-ntp true
timedatectl status
```

## Securing the Installation

Debian is known for security. Enhance your Rancher installation with these additional steps:

```bash
# Install fail2ban to protect against brute force attacks

sudo apt install -y fail2ban
sudo systemctl enable fail2ban
sudo systemctl start fail2ban

# Enable automatic security updates
sudo apt install -y unattended-upgrades
sudo dpkg-reconfigure -plow unattended-upgrades
```

## Troubleshooting

```bash
# Check Docker status
sudo systemctl status docker
sudo journalctl -u docker --tail 50

# View Rancher logs
docker logs rancher --tail 100

# Check firewall rules
sudo iptables -L DOCKER-USER -n
sudo ip6tables -L DOCKER-USER -n

# Check system resources
free -h
df -h
```

## Conclusion

You have successfully installed Rancher on Debian 12. Debian's focus on stability and security makes it a solid platform for testing Rancher. For production deployments, Rancher should be installed on a supported Kubernetes cluster rather than as a single Docker container. With its predictable release cadence and long support window, Debian remains a reliable foundation for lab and evaluation environments.
