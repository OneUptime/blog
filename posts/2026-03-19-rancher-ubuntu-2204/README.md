# How to Install Rancher on Ubuntu 22.04

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Rancher, Ubuntu, Docker, Kubernetes, Installation

Description: A step-by-step guide to installing Rancher on Ubuntu 22.04 LTS using Docker, covering system preparation, Docker installation, and Rancher deployment.

Ubuntu 22.04 LTS (Jammy Jellyfish) is one of the most popular Linux distributions for server deployments. Its long-term support lifecycle and wide package availability make it an excellent choice for running Rancher. This guide walks you through installing Rancher on Ubuntu 22.04 from a fresh server setup to a fully functional Rancher deployment for testing or development.

## Prerequisites

Before you begin, ensure you have:

- A server running Ubuntu 22.04 LTS with at least 16 GB RAM and 4 vCPUs
- Root or sudo access
- A static IP address or DNS name for your server
- Ports 80 and 443 available on the host

## Step 1: Update the System

Start by updating all packages to their latest versions:

```bash
sudo apt update && sudo apt upgrade -y
```

## Step 2: Install Required Dependencies

Install the packages that Docker needs:

```bash
sudo apt install -y \
  ca-certificates \
  curl
```

## Step 3: Install Docker

Add the official Docker GPG key and repository:

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

Start and enable Docker:

```bash
sudo systemctl enable docker
sudo systemctl start docker
```

Add your user to the Docker group:

```bash
sudo usermod -aG docker $USER
newgrp docker
```

Verify Docker is running:

```bash
docker --version
docker run hello-world
```

## Step 4: Configure Firewall

If you are using UFW (Ubuntu's default firewall), allow the Rancher UI ports:

```bash
sudo ufw allow 80/tcp
sudo ufw allow 443/tcp
sudo ufw reload
```

For a Rancher server running in Docker, the published ports are 80 and 443. Be aware that Docker publishes container ports using its own firewall rules.

## Step 5: Configure System Settings

Ensure the required kernel modules are loaded:

```bash
sudo modprobe br_netfilter
sudo modprobe overlay

cat <<EOF | sudo tee /etc/modules-load.d/rancher.conf
br_netfilter
overlay
EOF
```

Set the required sysctl parameters:

```bash
cat <<EOF | sudo tee /etc/sysctl.d/99-rancher.conf
net.bridge.bridge-nf-call-iptables = 1
net.bridge.bridge-nf-call-ip6tables = 1
net.ipv4.ip_forward = 1
EOF

sudo sysctl --system
```

## Step 6: Create Persistent Storage

Create a directory to store Rancher data:

```bash
sudo mkdir -p /opt/rancher
```

## Step 7: Run Rancher

Deploy Rancher using Docker:

```bash
docker run -d \
  --name rancher \
  --restart=unless-stopped \
  -p 80:80 \
  -p 443:443 \
  -v /opt/rancher:/var/lib/rancher \
  --log-driver json-file \
  --log-opt max-size=10m \
  --log-opt max-file=3 \
  --privileged \
  rancher/rancher:latest
```

## Step 8: Retrieve the Bootstrap Password

Wait about 60 seconds for Rancher to initialize, then retrieve the bootstrap password:

```bash
docker logs rancher 2>&1 | grep "Bootstrap Password:"
```

## Step 9: Access the Rancher UI

Open your browser and navigate to `https://<your-server-ip>`. Accept the self-signed certificate warning and enter the bootstrap password.

Complete the initial setup by:

1. Setting a new admin password with at least 12 characters
2. Configuring the Rancher Server URL

## Step 10: Configure Default Log Rotation

If you want default log rotation for newly created containers, configure it in the Docker daemon:

```bash
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

These settings apply only to containers created after the change. The Rancher container above already enables log rotation with `--log-opt`.

## Setting Up Automatic Updates

Create a script to check for security updates automatically:

```bash
sudo apt install -y unattended-upgrades
sudo dpkg-reconfigure -plow unattended-upgrades
```

## Troubleshooting

If you encounter issues, check the following:

```bash
# Check Docker status

sudo systemctl status docker

# Check Rancher container logs
docker logs rancher --tail 100

# Check system resources
free -h
df -h

# Check if ports are in use
sudo ss -tlnp | grep -E ':(80|443)'
```

Common issues on Ubuntu 22.04:

- **DNS resolution**: Check `/etc/resolv.conf` has valid nameservers

## Conclusion

You have successfully installed Rancher on Ubuntu 22.04 LTS. Your Rancher instance is now ready for testing and development use to create and manage Kubernetes clusters. Ubuntu 22.04 receives standard security maintenance until May 2027, giving you a stable foundation for your container management platform.
