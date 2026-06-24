# How to Install Rancher on CentOS Stream

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Rancher, CentOS, Docker, Kubernetes, Installation

Description: A complete guide to installing Rancher on CentOS Stream 9 using Docker, including system configuration, Docker installation, and firewall setup.

CentOS Stream serves as the upstream development platform for Red Hat Enterprise Linux and is a popular choice for enterprise server deployments. Because Rancher's single-container Docker install is intended for testing and development rather than production, this guide covers the full installation process for getting Rancher running on CentOS Stream 9 in a non-production environment.

## Prerequisites

Before you begin, ensure you have:

- A server running CentOS Stream 9 with at least 4 GB RAM and 2 CPU cores
- Root or sudo access
- A static IP address or DNS name
- SELinux in permissive or enforcing mode (we will configure it properly)

## Step 1: Update the System

Update all packages to their latest versions:

```bash
sudo dnf update -y
```

## Step 2: Disable Swap

Disable swap for Kubernetes compatibility:

```bash
sudo swapoff -a
sudo sed -i '/ swap / s/^/#/' /etc/fstab
```

## Step 3: Configure SELinux

Rancher works with SELinux in permissive mode. To set it:

```bash
sudo setenforce 0
sudo sed -i 's/^SELINUX=enforcing/SELINUX=permissive/' /etc/selinux/config
```

Verify the change:

```bash
getenforce
```

## Step 4: Install Required Dependencies

Install the packages needed to configure the Docker repository and download tools:

```bash
sudo dnf install -y \
  dnf-plugins-core \
  curl \
  wget
```

## Step 5: Install Docker

Add the Docker repository:

```bash
sudo dnf config-manager --add-repo https://download.docker.com/linux/centos/docker-ce.repo
```

Install Docker Engine:

```bash
sudo dnf install -y docker-ce docker-ce-cli containerd.io docker-buildx-plugin docker-compose-plugin
```

If you encounter a conflict with `podman` or `buildah`, remove them first:

```bash
sudo dnf remove -y podman buildah
sudo dnf install -y docker-ce docker-ce-cli containerd.io docker-buildx-plugin docker-compose-plugin
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

Verify Docker is working:

```bash
docker --version
docker run hello-world
```

## Step 6: Configure the Firewall

CentOS Stream uses `firewalld`. Open the required inbound ports for a Docker-based Rancher server:

```bash
sudo firewall-cmd --permanent --add-port=80/tcp
sudo firewall-cmd --permanent --add-port=443/tcp
sudo firewall-cmd --reload
```

Verify the firewall rules:

```bash
sudo firewall-cmd --list-all
```

## Step 7: Configure Kernel Modules

Load the required kernel modules:

```bash
cat <<EOF | sudo tee /etc/modules-load.d/rancher.conf
br_netfilter
overlay
EOF

sudo modprobe br_netfilter
sudo modprobe overlay
```

Set sysctl parameters:

```bash
cat <<EOF | sudo tee /etc/sysctl.d/99-rancher.conf
net.bridge.bridge-nf-call-iptables = 1
net.bridge.bridge-nf-call-ip6tables = 1
net.ipv4.ip_forward = 1
EOF

sudo sysctl --system
```

## Step 8: Configure Docker Logging

Set up log rotation:

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

## Step 9: Create Persistent Storage

Create a directory for Rancher data:

```bash
sudo mkdir -p /opt/rancher
```

## Step 10: Run Rancher

Deploy Rancher using Docker:

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

## Step 11: Retrieve the Bootstrap Password

Wait for Rancher to initialize and retrieve the password:

```bash
docker logs rancher 2>&1 | grep "Bootstrap Password:"
```

## Step 12: Access the Rancher UI

Open your browser and go to `https://<your-server-ip>`. Accept the self-signed certificate warning and log in with the bootstrap password.

Complete the initial setup:

1. Set a new admin password
2. Configure the Rancher server URL

## CentOS Stream Specific Notes

**Cgroup configuration**: CentOS Stream 9 uses cgroup v2 by default. If you encounter issues with Docker, you can verify the cgroup version:

```bash
stat -fc %T /sys/fs/cgroup
```

If it returns `cgroup2fs`, you are using cgroup v2 which is supported by modern Docker versions.

**Firewalld and Docker**: Docker manages its own iptables rules. If you experience networking issues between containers, you may need to enable masquerading:

```bash
sudo firewall-cmd --permanent --zone=public --add-masquerade
sudo firewall-cmd --reload
```

## Troubleshooting

```bash
# Check Docker status

sudo systemctl status docker

# View Rancher logs
docker logs rancher --tail 100

# Check SELinux denials
sudo ausearch -m avc -ts recent

# Check firewall rules
sudo firewall-cmd --list-all

# Verify ports are open
sudo ss -tlnp | grep -E ':(80|443)'
```

## Conclusion

You have successfully installed Rancher on CentOS Stream 9. CentOS Stream provides a stable and up-to-date platform that closely tracks RHEL releases, making it a practical choice for testing Rancher with Docker. For production use, Rancher should be installed on a supported high-availability Kubernetes cluster rather than a single Docker container. From the Rancher dashboard, you can now create and manage Kubernetes clusters across your infrastructure.
