# How to Deploy Portainer on Vultr Cloud - Part 3

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Portainer, Vultr, Cloud, Docker, Self-Hosted, DevOps

Description: Deploy Portainer on Vultr cloud with firewall groups, block storage, and optional server snapshots for a reliable self-hosted container management platform.

## Introduction

Vultr offers 32 global locations, competitive pricing, and simple deployment options including their pre-configured Docker Marketplace application. This guide covers deploying Portainer on a Vultr Cloud Compute instance with proper security configuration.

## Prerequisites

- Vultr account
- Vultr CLI installed (optional)
- SSH key added to Vultr account

## Step 1: Create a Cloud Compute Instance

### Via Vultr Console

1. Click **Deploy New Server**
2. Choose **Cloud Compute - Optimized Cloud** or **Cloud Compute - Regular**
3. Select location closest to you
4. Under **Server Image**: Choose **Ubuntu 24.04 LTS**
5. Select plan: at least 2GB RAM (VC2-1C-2GB or larger)
6. Under **Additional Features**: Add your SSH key
7. Set **Server Hostname**: `portainer-server`
8. Click **Deploy Now**

### Via Vultr CLI

```bash
# Create instance
# Ubuntu 24.04 LTS x64 OS ID was 2284 at the time of writing
vultr-cli instance create \
  --region ewr \
  --plan vc2-1c-2gb \
  --os 2284 \
  --label portainer-server \
  --host portainer-server \
  --ssh-keys YOUR_KEY_ID
```

## Step 2: Configure Firewall Group

1. Navigate to **Network > Firewall**
2. Click **Add Firewall Group**
3. Name: `portainer-fw`
4. Add inbound rules:

```text
Protocol  Port   Source
TCP       22     Your IP/32
TCP       9443   Your IP/32
```

5. Assign the firewall group to your instance

## Step 3: Install Docker

```bash
ssh root@<vultr-ip>

apt update && apt upgrade -y
apt install -y curl
curl -fsSL https://get.docker.com | sh
systemctl enable --now docker
```

## Step 4: Attach Block Storage

```bash
# Create block storage via Vultr console
# Attach to your instance
# On the server:

# Find block storage device
lsblk | grep -v loop

# Format (assuming /dev/vdb)
mkfs.ext4 /dev/vdb
mkdir -p /mnt/portainer-data

# Mount persistently
echo '/dev/vdb /mnt/portainer-data ext4 defaults,nofail 0 2' >> /etc/fstab
mount -a

# Configure Docker storage
mkdir -p /mnt/portainer-data/docker
tee /etc/docker/daemon.json > /dev/null << 'EOF'
{
  "data-root": "/mnt/portainer-data/docker",
  "log-driver": "json-file",
  "log-opts": {
    "max-size": "10m",
    "max-file": "3"
  }
}
EOF
systemctl restart docker
```

## Step 5: Deploy Portainer

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

## Step 6: Configure Automatic Backups

Vultr supports automatic backups for Cloud Compute instances:

1. Navigate to your instance > **Backups**
2. Enable automatic backups
3. Choose a backup schedule that fits your recovery needs

If you store Portainer data on attached block storage, create block storage snapshots separately because Vultr automatic backups do not include attached block storage volumes.

For application-level backup via cron:

```bash
# Create backup script
cat > /usr/local/bin/backup-portainer.sh << 'EOF'
#!/bin/bash
BACKUP_DIR="/mnt/portainer-data/backups"
mkdir -p "$BACKUP_DIR"

# Backup Portainer data volume
docker run --rm \
  -v portainer_data:/source \
  -v "${BACKUP_DIR}:/backup" \
  alpine tar czf "/backup/portainer-$(date +%Y%m%d).tar.gz" /source

# Retain only 7 days of backups
find "$BACKUP_DIR" -name "portainer-*.tar.gz" -mtime +7 -delete
EOF

chmod +x /usr/local/bin/backup-portainer.sh
echo '0 3 * * * root /usr/local/bin/backup-portainer.sh' > /etc/cron.d/portainer-backup
```

## Conclusion

Vultr's 32 global locations and straightforward pricing make it a versatile choice for Portainer deployments. Firewall groups provide network-level protection, and automatic backups plus block storage snapshots give you point-in-time recovery options. Block storage volumes that persist independently of the instance are particularly valuable for maintaining data across server replacements or migrations.
