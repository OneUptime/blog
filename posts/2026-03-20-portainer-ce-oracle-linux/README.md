# How to Install Portainer CE on Oracle Linux with Docker

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Portainer, Oracle-linux, Docker, Installation, Rhel-compatible

Description: A guide to installing Portainer Community Edition on Oracle Linux 8 and 9 with Docker, covering the Oracle-specific UEK kernel and Docker installation.

## Overview

Oracle Linux is Red Hat Enterprise Linux-compatible and commonly used in Oracle Cloud Infrastructure (OCI) and on-premises environments. It features the Unbreakable Enterprise Kernel (UEK). This guide covers installing Docker CE and Portainer CE on Oracle Linux 8 and 9.

## Prerequisites

- Oracle Linux 8 or 9
- Minimum: 2GB RAM, 20GB disk
- Root or sudo access

## Step 1: Update System

```bash
sudo dnf update -y
```

## Step 2: Remove Conflicting Packages

Oracle Linux commonly ships with Podman tooling, which can conflict with Docker CE packages:

```bash
# Check for conflicting packages
rpm -qa | grep -E 'docker|podman|containerd|runc'

# Remove conflicting packages if present
sudo dnf remove -y \
  docker \
  docker-client \
  docker-client-latest \
  docker-common \
  docker-latest \
  docker-latest-logrotate \
  docker-logrotate \
  docker-engine \
  podman \
  podman-docker \
  runc 2>/dev/null
```

## Step 3: Install Docker CE

```bash
# Install prerequisites
sudo dnf install -y dnf-plugins-core jq

# Add Docker repository (use Docker's RHEL repo on Oracle Linux)
sudo dnf config-manager --add-repo \
  https://download.docker.com/linux/rhel/docker-ce.repo

# Install Docker CE
sudo dnf install -y \
  docker-ce \
  docker-ce-cli \
  containerd.io \
  docker-buildx-plugin \
  docker-compose-plugin

# Start and enable Docker
sudo systemctl enable --now docker

# Add user to docker group
sudo usermod -aG docker $USER
newgrp docker
```

## Step 4: Configure SELinux

```bash
# Check SELinux status
getenforce
# Oracle Linux enables SELinux Enforcing by default

# Verify the SELinux container policy package is present
rpm -q container-selinux
# Docker on EL systems uses container-selinux, not docker-selinux
```

## Step 5: Configure Firewall

```bash
# Open ports with firewalld
sudo firewall-cmd --permanent --add-port=9443/tcp
sudo firewall-cmd --permanent --add-port=8000/tcp
sudo firewall-cmd --reload

# Port 8000 is only needed if you plan to use Edge agents
# For OCI instances, also configure the OCI VCN Security List or NSG:
# TCP port 9443 from your IP
# TCP port 8000 from your IP
```

## Step 6: Deploy Portainer CE

```bash
# Create data volume
docker volume create portainer_data

# Deploy Portainer CE (SELinux-enabled Oracle Linux requires --privileged)
docker run -d \
  -p 8000:8000 \
  -p 9443:9443 \
  --name portainer \
  --restart=always \
  --privileged \
  -v /var/run/docker.sock:/var/run/docker.sock \
  -v portainer_data:/data \
  portainer/portainer-ce:sts

# Verify
docker ps | grep portainer
docker logs portainer
```

## Step 7: Access Portainer

```bash
# For OCI instances, get the public IP
PUBLIC_IP=$(curl -s -H "Authorization: Bearer Oracle" \
  http://169.254.169.254/opc/v2/vnics/ | jq -r '.[0].publicIp')
echo "Portainer URL: https://${PUBLIC_IP}:9443"

# For on-premises
echo "Portainer URL: https://$(hostname -I | awk '{print $1}'):9443"
```

## Oracle Linux UEK Kernel Considerations

```bash
# Check current kernel
uname -r
# Output will show UEK (Unbreakable Enterprise Kernel) or RHCK

# Check which cgroup version is mounted
stat -fc %T /sys/fs/cgroup
# cgroup2fs indicates cgroup v2; tmpfs typically indicates cgroup v1
```

## Deploying on OCI (Oracle Cloud Infrastructure)

When running on OCI:

1. Configure OCI VCN Security List to allow ports 9443 and 8000
2. Configure the instance's iptables/firewalld as shown above
3. Use the public IP from OCI Console or the metadata service

```bash
# Get OCI instance public IP via metadata
curl -s -H "Authorization: Bearer Oracle" \
  http://169.254.169.254/opc/v2/vnics/ | jq -r '.[0].publicIp'
```

## Conclusion

Oracle Linux provides a stable, RHEL-compatible platform for Portainer CE. The SELinux enforcement and Oracle's Unbreakable Enterprise Kernel work well with Docker and Portainer. For Oracle Cloud Infrastructure deployments, remember to configure both the VCN Security List (at the network level) and the instance firewall (at the OS level) to allow Portainer ports.
