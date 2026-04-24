# How to Deploy Portainer on Oracle Cloud Free Tier - Part 3

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Portainer, Oracle Cloud, OCI, Free Tier, Docker, Self-Hosted, Cloud

Description: Deploy Portainer completely free on Oracle Cloud's always-free tier using ARM-based Ampere A1 instances with 4 OCPUs and 24GB RAM.

## Introduction

Oracle Cloud Infrastructure (OCI) offers the most generous free tier of any major cloud provider, including up to 4 ARM-based Ampere A1 OCPUs and 24GB RAM always-free. This is more than enough to run Portainer alongside dozens of containerized services at zero cost. This guide covers setting up Portainer on OCI's free tier.

## Oracle Cloud Free Tier Limits

- **Ampere A1 Compute**: 4 OCPUs and 24GB RAM total (can be split across instances)
- **Block Volume**: 200GB total free
- **Virtual Cloud Network**: Free
- **Flexible Load Balancer**: 1 instance with 10Mbps minimum/maximum bandwidth free

## Step 1: Create an OCI Account

1. Sign up at cloud.oracle.com
2. Provide payment method (required, but won't be charged for free tier resources)
3. Select your home region (cannot be changed later)

## Step 2: Create a Virtual Cloud Network (VCN)

1. Navigate to **Networking > Virtual Cloud Networks**
2. Click **Create VCN with Internet Connectivity** (wizard)
3. Name: `portainer-vcn`
4. IPv4 CIDR: `10.0.0.0/16`
5. Complete the wizard (creates subnets, internet gateway, route tables)

## Step 3: Create the Compute Instance

1. Navigate to **Compute > Instances > Create Instance**
2. Configure:
   - **Name**: `portainer-vm`
   - **Availability Domain**: Any
   - **Shape**: Ampere > VM.Standard.A1.Flex
   - **OCPUs**: 2 (use free allocation wisely)
   - **Memory**: 12GB
   - **Image**: Ubuntu 22.04 LTS (arm64)
3. Under **Networking**: Select `portainer-vcn` and public subnet
4. Under **Add SSH keys**: Upload your public key
5. Under **Boot volume**: 50GB (free tier includes 200GB total)
6. Click **Create**

## Step 4: Configure Security List / Firewall

OCI uses Security Lists and Network Security Groups. Add ingress rules:

1. Navigate to your VCN > **Subnets > Public Subnet > Security List**
2. Click **Add Ingress Rules**
3. Add:
   - Source: Your IP/32, Protocol: TCP, Port: 22
   - Source: Your IP/32, Protocol: TCP, Port: 9443

**Also configure the OS-level firewall** (OCI Ubuntu images use iptables rules too):

```bash
# OCI instances often have additional iptables rules

# On OCI Ubuntu images, modify iptables directly instead of using UFW
sudo iptables -I INPUT 1 -p tcp --dport 9443 -j ACCEPT

# Save rules so they persist across reboots
sudo DEBIAN_FRONTEND=noninteractive apt install -y iptables-persistent
sudo sh -c 'iptables-save > /etc/iptables/rules.v4'
```

## Step 5: Install Docker on ARM64

```bash
# SSH to instance
ssh ubuntu@<oci-instance-ip>

# Update system
sudo apt update && sudo apt upgrade -y

# Install Docker from Docker's official apt repository
sudo apt install -y ca-certificates curl
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

sudo apt update
sudo apt install -y docker-ce docker-ce-cli containerd.io docker-buildx-plugin docker-compose-plugin

sudo usermod -aG docker ubuntu
newgrp docker

# Verify ARM64
docker info | grep Architecture
# Should show an ARM64 architecture such as: aarch64
```

## Step 6: Deploy Portainer

```bash
docker volume create portainer_data

docker run -d \
  --name portainer \
  --restart=unless-stopped \
  -p 9443:9443 \
  -v /var/run/docker.sock:/var/run/docker.sock \
  -v portainer_data:/data \
  portainer/portainer-ce:sts
```

## Step 7: Maximize Free Tier Usage

With 4 OCPUs and 24GB RAM free, you can run a comprehensive stack:

```yaml
version: "3.8"

services:
  # Reverse proxy for all services
  traefik:
    image: traefik:v3.0
    command:
      - "--api.insecure=true"
      - "--providers.docker=true"
    ports:
      - "80:80"
      - "443:443"
      - "8080:8080"
    volumes:
      - /var/run/docker.sock:/var/run/docker.sock:ro
    restart: unless-stopped

  # Multiple applications can run on 24GB RAM
  nextcloud:
    image: nextcloud:latest
    ports:
      - "8081:80"
    restart: unless-stopped

  gitlab:
    image: gitlab/gitlab-ce:latest
    ports:
      - "8929:80"
      - "2224:22"
    volumes:
      - gitlab_config:/etc/gitlab
      - gitlab_logs:/var/log/gitlab
      - gitlab_data:/var/opt/gitlab
    restart: unless-stopped
    # GitLab needs significant resources
    shm_size: '256m'

volumes:
  gitlab_config:
  gitlab_logs:
  gitlab_data:
```

## Step 8: Attach Block Storage Volume

```bash
# In OCI console, create a 100GB block volume (free tier includes 200GB)
# Attach it to the instance using a consistent device path such as /dev/oracleoci/oraclevdb
# On the instance:
sudo fdisk -l  # Verify the attached volume path
sudo mkfs.ext4 /dev/oracleoci/oraclevdb
sudo mkdir -p /data
echo '/dev/oracleoci/oraclevdb /data ext4 defaults,_netdev,nofail 0 2' | sudo tee -a /etc/fstab
sudo mount -a
```

## Conclusion

Oracle Cloud's free tier is unmatched for running Portainer and a full suite of self-hosted applications at zero cost. The ARM-based Ampere A1 instances deliver excellent performance, and the 24GB free RAM allocation is more than most home lab servers provide. Combined with 200GB of free block storage, you can run a comprehensive self-hosted infrastructure without any cloud costs.
