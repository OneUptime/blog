# How to Deploy Portainer on Hetzner Cloud - Part 3

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Portainer, Hetzner, Cloud, Docker, Self-Hosted, DevOps, Europe

Description: Deploy Portainer on Hetzner Cloud for the best price-to-performance ratio in European cloud hosting, with Hetzner's firewall and volume storage.

## Introduction

Hetzner Cloud offers some of the best price-to-performance ratios in the cloud hosting market, with European data centers and excellent network performance. Their CX22 instance (2 vCPU, 4GB RAM) at ~€4/month is one of the most cost-effective options for running Portainer. This guide covers complete Portainer deployment on Hetzner Cloud.

## Prerequisites

- Hetzner Cloud account
- Hetzner Cloud CLI (`hcloud`) installed (optional)
- SSH key pair

## Step 1: Create a Hetzner Cloud Server

### Via Cloud Console

1. Log in to console.hetzner.com
2. Click **Create Server**
3. Configure:
   - **Location**: Choose a location such as Falkenstein (`fsn1`), Nuremberg (`nbg1`), or Helsinki (`hel1`)
   - **Image**: Ubuntu 24.04
   - **Type**: CX22 (2 vCPU, 4GB RAM, 40GB SSD) - excellent value
   - **SSH Keys**: Add your SSH key
   - **Name**: `portainer-server`
4. Click **Create & Buy now**

### Via hcloud CLI

```bash
# Install hcloud

brew install hcloud  # macOS
# or: https://github.com/hetznercloud/cli

# Configure
hcloud context create portainer-project

# Upload your SSH public key
hcloud ssh-key create \
  --name portainer-key \
  --public-key-from-file ~/.ssh/id_rsa.pub

# Create server
hcloud server create \
  --name portainer-server \
  --type cx22 \
  --image ubuntu-24.04 \
  --location fsn1 \
  --ssh-key portainer-key
```

## Step 2: Configure Hetzner Firewall

```bash
# Create firewall
hcloud firewall create --name portainer-fw

# Get your public IP
MY_IP=$(curl -s https://checkip.amazonaws.com)

# Add rules
hcloud firewall add-rule portainer-fw \
  --direction in \
  --protocol tcp \
  --port 22 \
  --source-ips ${MY_IP}/32

hcloud firewall add-rule portainer-fw \
  --direction in \
  --protocol tcp \
  --port 9443 \
  --source-ips ${MY_IP}/32

# Optional: allow legacy HTTP access on port 9000
hcloud firewall add-rule portainer-fw \
  --direction in \
  --protocol tcp \
  --port 9000 \
  --source-ips ${MY_IP}/32

# Apply to server
hcloud firewall apply-to-resource portainer-fw \
  --type server \
  --server portainer-server
```

## Step 3: Install Docker

```bash
ssh root@<hetzner-server-ip>

# Update system
apt update && apt upgrade -y

# Install Docker from Docker's official apt repository
apt install -y ca-certificates curl
install -m 0755 -d /etc/apt/keyrings
curl -fsSL https://download.docker.com/linux/ubuntu/gpg -o /etc/apt/keyrings/docker.asc
chmod a+r /etc/apt/keyrings/docker.asc

tee /etc/apt/sources.list.d/docker.sources > /dev/null <<EOF
Types: deb
URIs: https://download.docker.com/linux/ubuntu
Suites: $(. /etc/os-release && echo "${UBUNTU_CODENAME:-$VERSION_CODENAME}")
Components: stable
Architectures: $(dpkg --print-architecture)
Signed-By: /etc/apt/keyrings/docker.asc
EOF

apt update
apt install -y docker-ce docker-ce-cli containerd.io docker-buildx-plugin docker-compose-plugin
systemctl enable --now docker
```

## Step 4: Attach Hetzner Volume

```bash
# From your local machine, create and automount the volume
hcloud volume create \
  --name portainer-data \
  --size 50 \
  --server portainer-server \
  --format ext4 \
  --automount

# Then on the server, replace <volume-id> with the actual Volume ID and create a directory for Portainer data
mkdir -p /mnt/HC_Volume_<volume-id>/portainer
```

## Step 5: Deploy Portainer

```bash
docker run -d \
  --name portainer \
  --restart=always \
  -p 9443:9443 \
  -v /var/run/docker.sock:/var/run/docker.sock \
  -v /mnt/HC_Volume_<volume-id>/portainer:/data \
  portainer/portainer-ce:lts

# Optional: add -p 9000:9000 for legacy HTTP access
```

## Step 6: Configure Floating IP (Optional)

For stable IP across server replacements:

```bash
# From your local machine, create the Floating IP
hcloud floating-ip create --type ipv4 --home-location fsn1

# Assign to server
hcloud floating-ip assign FLOATING_IP_ID portainer-server

# Then on the server, persist the Floating IP on Ubuntu with netplan
tee /etc/netplan/60-floating-ip.yaml > /dev/null << 'EOF'
network:
  version: 2
  renderer: networkd
  ethernets:
    eth0:
      addresses:
        - <floating-ip>/32
EOF

netplan apply
```

## Step 7: Enable Backups

Hetzner keeps up to 7 backup slots per server. Manual snapshots are separate, and neither backups nor snapshots include attached Volumes.

```bash
# Enable backups
hcloud server enable-backup portainer-server

# Or create a manual snapshot
hcloud server create-image \
  --type snapshot \
  --description "portainer-snapshot-$(date +%Y%m%d)" \
  portainer-server
```

## Conclusion

Hetzner Cloud provides exceptional value for Portainer deployments. The CX22 instance offers more RAM and better network performance than equivalently priced VMs at major cloud providers. Hetzner's European data centers are ideal for GDPR compliance, and the straightforward pricing with no surprise charges makes cost management predictable.
