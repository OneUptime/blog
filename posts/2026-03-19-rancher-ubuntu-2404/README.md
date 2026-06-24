# How to Install Rancher on Ubuntu 24.04

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Rancher, Ubuntu, Docker, Kubernetes, Installation

Description: A step-by-step guide to installing Rancher on Ubuntu 24.04 LTS, covering system preparation, Docker setup, and Rancher deployment.

Ubuntu 24.04 LTS (Noble Numbat) is the latest long-term support release from Canonical, bringing updated kernel versions, improved security features, and better container support. This guide walks you through installing Rancher on a fresh Ubuntu 24.04 server using Docker for testing or development. Rancher does not support single-node Docker installs for production environments.

## Prerequisites

Before you begin, ensure you have:

- A server running Ubuntu 24.04 LTS with at least 4 GB RAM and 2 CPU cores
- Root or sudo access
- A static IP address or DNS name
- Ports 80 and 443 open in your firewall

## Step 1: Update the System

Update all system packages:

```bash
sudo apt update && sudo apt upgrade -y
```

If a kernel update was applied, reboot the server:

```bash
sudo reboot
```

## Step 2: Install Required Dependencies

Install prerequisite packages:

```bash
sudo apt install -y \
  ca-certificates \
  curl
```

## Step 3: Install Docker

Ubuntu 24.04 ships with a newer version of the Linux kernel that works well with Docker. Add the official Docker repository:

```bash
sudo install -m 0755 -d /etc/apt/keyrings
sudo curl -fsSL https://download.docker.com/linux/ubuntu/gpg -o /etc/apt/keyrings/docker.asc
sudo chmod a+r /etc/apt/keyrings/docker.asc

sudo tee /etc/apt/sources.list.d/docker.sources <<EOF
Types: deb
URIs: https://download.docker.com/linux/ubuntu
Suites: $(. /etc/os-release && echo "${UBUNTU_CODENAME:-$VERSION_CODENAME}")
Components: stable
Architectures: $(dpkg --print-architecture)
Signed-By: /etc/apt/keyrings/docker.asc
EOF
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

## Step 4: Disable Swap

Kubernetes components used by Rancher work best with swap disabled:

```bash
sudo swapoff -a
sudo sed -i '/ swap / s/^/#/' /etc/fstab
```

## Step 5: Configure Kernel Modules and Sysctl

Load required kernel modules:

```bash
cat <<EOF | sudo tee /etc/modules-load.d/rancher.conf
br_netfilter
overlay
EOF

sudo modprobe br_netfilter
sudo modprobe overlay
```

Configure networking parameters:

```bash
cat <<EOF | sudo tee /etc/sysctl.d/99-rancher.conf
net.bridge.bridge-nf-call-iptables = 1
net.bridge.bridge-nf-call-ip6tables = 1
net.ipv4.ip_forward = 1
EOF

sudo sysctl --system
```

## Step 6: Configure the Firewall

If UFW is enabled on your server, allow SSH before enabling the firewall and open Rancher's published ports:

```bash
sudo ufw allow OpenSSH
sudo ufw allow 80/tcp
sudo ufw allow 443/tcp
sudo ufw enable
```

Docker publishes container ports using its own firewall rules, so review Docker's firewall behavior if you rely on UFW for access control.

## Step 7: Configure Docker Logging

Set up log rotation to prevent disk space issues:

```bash
sudo mkdir -p /etc/docker

sudo tee /etc/docker/daemon.json <<EOF
{
  "log-driver": "json-file",
  "log-opts": {
    "max-size": "10m",
    "max-file": "3"
  }
}
EOF

sudo systemctl restart docker
```

## Step 8: Create Persistent Storage

Create a directory for Rancher data:

```bash
sudo mkdir -p /opt/rancher
```

## Step 9: Run Rancher

Deploy Rancher:

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

Wait a few minutes for Rancher to start, then retrieve the bootstrap password:

```bash
docker logs rancher 2>&1 | grep "Bootstrap Password:"
```

## Step 11: Access the Rancher UI

Navigate to `https://<your-server-ip>` in your browser. Accept the self-signed certificate warning and log in with the bootstrap password.

Complete the setup wizard:

1. Set a new admin password
2. Configure the Rancher server URL to match your DNS name or IP

## Step 12: Verify the Installation

Confirm Rancher is running properly:

```bash
docker ps --filter name=rancher
docker logs rancher 2>&1 | tail -5
```

## Ubuntu 24.04 Specific Considerations

Ubuntu 24.04 introduces several changes that may affect your Rancher deployment:

**AppArmor profiles**: Ubuntu 24.04 has stricter AppArmor policies. If you encounter permission issues with Rancher, check AppArmor:

```bash
sudo aa-status
```

**Systemd-resolved**: Ubuntu 24.04 uses systemd-resolved for DNS. If you experience DNS resolution issues inside containers, configure Docker to use an external DNS server:

```bash
sudo tee /etc/docker/daemon.json <<EOF
{
  "log-driver": "json-file",
  "log-opts": {
    "max-size": "10m",
    "max-file": "3"
  },
  "dns": ["8.8.8.8", "8.8.4.4"]
}
EOF

sudo systemctl restart docker
```

**Cgroup v2**: Ubuntu 24.04 uses cgroup v2 by default, which is fully supported by modern versions of Rancher and Docker.

## Backing Up Rancher

Create regular backups of your Rancher data:

```bash
docker stop rancher
sudo tar czf /backup/rancher-$(date +%Y%m%d).tar.gz /opt/rancher
docker start rancher
```

## Troubleshooting

```bash
# Check system resources

free -h
df -h

# View container logs
docker logs rancher --tail 200

# Check Docker status
sudo systemctl status docker

# Check for port conflicts
sudo ss -tlnp | grep -E ':(80|443)'
```

## Conclusion

You have successfully installed Rancher on Ubuntu 24.04 LTS for testing or development. This latest Ubuntu release provides a modern kernel with excellent container support, making it a solid platform for evaluating Rancher on a single node. With Ubuntu 24.04 receiving security updates until April 2029, you have a long-term stable foundation for lab and non-production Kubernetes management work.
