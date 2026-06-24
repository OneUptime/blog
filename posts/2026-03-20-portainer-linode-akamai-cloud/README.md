# How to Deploy Portainer on Linode/Akamai Cloud - Akamai Cloud

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Portainer, Linode, Akamai, Cloud, Docker, Self-Hosted, DevOps

Description: Deploy Portainer on a Linode (now Akamai Cloud) instance with firewall configuration, block storage, and optional NodeBalancer for production use.

## Introduction

Linode, now part of Akamai Cloud, offers competitive pricing with excellent network performance and straightforward Linux VMs. Its global network and developer-friendly tools make it popular for self-hosted applications. This guide covers deploying Portainer on a Linode instance with proper security configuration.

## Prerequisites

- Linode/Akamai account
- Linode CLI installed (optional)
- SSH key pair

## Step 1: Create a Linode Instance

### Via Linode Console

1. Click **Create Linode**
2. Choose:
   - **Image**: Ubuntu 24.04 LTS
   - **Region**: Closest datacenter
   - **Linode Plan**: Shared CPU > Linode 4GB (minimum recommended)
   - **Root Password**: Set a strong password
   - **SSH Keys**: Add your public key
   - **Label**: `portainer-linode`
3. Click **Create Linode**

### Via Linode CLI

```bash
# Install the Linode CLI using the official instructions for your local OS,
# then authenticate it.
linode-cli configure

# Create Linode
linode-cli linodes create \
  --type g6-standard-2 \
  --region us-east \
  --image linode/ubuntu24.04 \
  --label portainer-linode \
  --authorized_keys "$(cat ~/.ssh/id_rsa.pub)" \
  --root_pass YourSecureRootPassword
```

## Step 2: Configure Cloud Firewall

```bash
# Via Linode CLI
linode-cli firewalls create \
  --label portainer-fw \
  --rules.inbound '[
    {"action":"ACCEPT","protocol":"TCP","ports":"22","addresses":{"ipv4":["YOUR.IP.HERE/32"]}},
    {"action":"ACCEPT","protocol":"TCP","ports":"9443","addresses":{"ipv4":["YOUR.IP.HERE/32"]}}
  ]' \
  --rules.inbound_policy DROP \
  --rules.outbound_policy ACCEPT
```

After creating the firewall, attach it to your Linode or its public interface in Cloud Manager, depending on the network interface type you selected when you created the instance.

### Via Linode Console

1. Navigate to **Firewalls > Create Firewall**
2. Label: `portainer-fw`
3. Add inbound rules for ports 22 and 9443 from your IP
4. Set default inbound policy to **Drop**
5. Assign it to your Linode or its public interface

## Step 3: Install Docker

```bash
# SSH to Linode
ssh root@<linode-ip>

# Update system
apt update && apt upgrade -y

# Install Docker from the official apt repository
apt install ca-certificates curl -y
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
apt install docker-ce docker-ce-cli containerd.io docker-buildx-plugin docker-compose-plugin -y

# Create a non-root user for better security
adduser portaineradmin
usermod -aG docker portaineradmin
usermod -aG sudo portaineradmin

# Switch to the new user
su - portaineradmin
```

## Step 4: Attach Block Storage

```bash
# Via Linode console or CLI, create a 50GB block storage volume
# Attach to your Linode instance

# On the Linode, format and mount
sudo fdisk -l  # Find the attached volume path (usually /dev/disk/by-id/scsi-0Linode_Volume_<label>)
export VOLUME_PATH=/dev/disk/by-id/scsi-0Linode_Volume_<your-volume-label>

# Create filesystem
sudo mkfs.ext4 "$VOLUME_PATH"

# Mount
sudo mkdir -p /mnt/block-storage
echo "$VOLUME_PATH /mnt/block-storage ext4 defaults,noatime,_netdev 0 2" | sudo tee -a /etc/fstab
sudo mount -a

# Use for Docker data
sudo mkdir -p /mnt/block-storage/docker
sudo mkdir -p /etc/docker
sudo tee /etc/docker/daemon.json > /dev/null << 'EOF'
{
  "data-root": "/mnt/block-storage/docker"
}
EOF
sudo systemctl restart docker
```

## Step 5: Deploy Portainer

Portainer CE exposes HTTPS on port `9443` by default. Port `9000` is only needed for legacy HTTP access.

```bash
docker volume create portainer_data

docker run -d \
  --name portainer \
  --restart=unless-stopped \
  -p 9443:9443 \
  -v /var/run/docker.sock:/var/run/docker.sock \
  -v portainer_data:/data \
  portainer/portainer-ce:lts
```

## Step 6: Enable Linode Backups

1. Navigate to your Linode > **Backups**
2. Click **Enable Backups**
3. Choose your preferred backup time window

> Note: Linode Backups protect the Linode's local disks, but they do not back up attached Block Storage volumes. If you store Docker data on Block Storage, back up that volume separately as well.

## Step 7: Monitor with Linode's Built-in Metrics

Linode provides basic CPU, network, and disk metrics. For more detailed monitoring, you can deploy Prometheus and Grafana via Portainer:

```yaml
services:
  prometheus:
    image: prom/prometheus:latest
    ports:
      - "9090:9090"
    volumes:
      - prometheus_data:/prometheus
    restart: unless-stopped

  grafana:
    image: grafana/grafana:latest
    ports:
      - "3000:3000"
    environment:
      - GF_SECURITY_ADMIN_PASSWORD=secure_password
    volumes:
      - grafana_data:/var/lib/grafana
    restart: unless-stopped

  node-exporter:
    image: quay.io/prometheus/node-exporter:latest
    command:
      - '--path.rootfs=/host'
    network_mode: host
    pid: host
    volumes:
      - '/:/host:ro,rslave'
    restart: unless-stopped

volumes:
  prometheus_data:
  grafana_data:
```

Prometheus still needs a scrape configuration for `node-exporter` before host metrics from the Linode will appear in Grafana.

## Conclusion

Linode/Akamai Cloud provides excellent value for Portainer deployments with reliable infrastructure and straightforward pricing. The Cloud Firewall adds a layer of security without OS-level complexity, and Block Storage volumes support growing container workloads. Linode's Backups service can protect the instance's local disks, but if you store Docker data on Block Storage, back up that volume separately.
