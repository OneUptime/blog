# How to Deploy Portainer on DigitalOcean Droplets - Part 3

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Portainer, DigitalOcean, Droplet, Docker, Cloud, Self-Hosted, DevOps

Description: Deploy Portainer on a DigitalOcean Droplet with firewall rules, optional block storage, and DigitalOcean Container Registry integration.

## Introduction

DigitalOcean Droplets provide simple, affordable cloud VMs that are popular for self-hosted projects. DigitalOcean's straightforward pricing, built-in firewall, and developer-friendly tools make it an excellent choice for running Portainer. This guide covers creating a Droplet, configuring security, and deploying Portainer.

## Prerequisites

- DigitalOcean account
- `doctl` CLI installed (optional)
- SSH key added to your DigitalOcean account

## Step 1: Create a Droplet

### Via DigitalOcean Console

1. Click **Create > Droplets**
2. Choose:
   - **Region**: Closest to you
   - **Image**: Ubuntu 24.04 LTS
   - **Plan**: Basic > Regular CPU > $18/mo (2GB RAM, 2 vCPU) minimum
3. Under **Authentication**: Select **SSH Key** and choose your key
4. Under **Hostname**: Set `portainer-droplet`
5. Click **Create Droplet**

### Via doctl

```bash
# Authenticate

doctl auth init

# Get your SSH key fingerprint
doctl compute ssh-key list

# Create droplet
doctl compute droplet create portainer-droplet \
  --size s-2vcpu-2gb \
  --image ubuntu-24-04-x64 \
  --region nyc3 \
  --ssh-keys YOUR_KEY_FINGERPRINT \
  --wait
```

## Step 2: Configure Cloud Firewall

DigitalOcean's Cloud Firewall is separate from the OS firewall and provides an additional security layer:

### Via Console

1. Navigate to **Networking > Firewalls > Create Firewall**
2. Name: `portainer-fw`
3. Inbound rules:
   - SSH: Port 22, Source: Your IP
   - Custom TCP: Port 9443, Source: Your IP
4. Apply to the portainer-droplet

### Via doctl

```bash
MY_IP=$(curl -s https://checkip.amazonaws.com)
DROPLET_ID=$(doctl compute droplet get portainer-droplet --format ID --no-header)

doctl compute firewall create \
  --name portainer-fw \
  --inbound-rules "protocol:tcp,ports:22,address:${MY_IP}/32 protocol:tcp,ports:9443,address:${MY_IP}/32" \
  --outbound-rules "protocol:tcp,ports:all,address:0.0.0.0/0 protocol:tcp,ports:all,address:::/0 protocol:udp,ports:all,address:0.0.0.0/0 protocol:icmp,address:0.0.0.0/0" \
  --droplet-ids "${DROPLET_ID}"
```

## Step 3: Install Docker

```bash
# SSH to Droplet
ssh root@<droplet-ip>

# Update and install Docker
apt update && apt upgrade -y
apt install -y ca-certificates curl
curl -fsSL https://get.docker.com | sh
systemctl enable --now docker
```

## Step 4: Attach Block Storage (Optional)

```bash
# Via doctl, create and attach a 50GB block storage volume
doctl compute volume create portainer-vol \
  --size 50 \
  --region nyc3 \
  --desc "Portainer data storage"

VOLUME_ID=$(doctl compute volume list --region nyc3 --format ID,Name --no-header | awk '$2=="portainer-vol"{print $1}')
DROPLET_ID=$(doctl compute droplet get portainer-droplet --format ID --no-header)
doctl compute volume-action attach "${VOLUME_ID}" "${DROPLET_ID}" --wait

# On the Droplet
mkfs.ext4 -F /dev/disk/by-id/scsi-0DO_Volume_portainer-vol
mkdir -p /mnt/portainer-data
mount -o defaults,nofail,discard,noatime /dev/disk/by-id/scsi-0DO_Volume_portainer-vol /mnt/portainer-data
echo '/dev/disk/by-id/scsi-0DO_Volume_portainer-vol /mnt/portainer-data ext4 defaults,nofail,discard,noatime 0 2' >> /etc/fstab
findmnt --verify --verbose
```

## Step 5: Deploy Portainer

```bash
mkdir -p /mnt/portainer-data

docker run -d \
  --name portainer \
  --restart=unless-stopped \
  -p 9443:9443 \
  -v /var/run/docker.sock:/var/run/docker.sock \
  -v /mnt/portainer-data:/data \
  portainer/portainer-ce:lts
```

## Step 6: Integrate with DigitalOcean Container Registry (DOCR)

```bash
# Optional: log the Droplet's Docker client into DOCR
doctl registry login

# In Portainer, add DOCR:
# Registries > Add registry > Custom registry
# URL: registry.digitalocean.com
# Username: (your DigitalOcean API token)
# Password: (the same DigitalOcean API token)
```

## Step 7: Configure Automatic Backups

Enable Droplet backups in the DigitalOcean console:

1. Navigate to your Droplet > **Backups**
2. Click **Enable Backups** and choose a plan (weekly backups are 20% of Droplet cost; daily backups are 30%)

For more control, use DigitalOcean Spaces for application-level backups:

```bash
# Install s3cmd
apt install -y s3cmd

# Configure with Spaces credentials
s3cmd --configure

# Backup Portainer data
BACKUP_FILE="/tmp/portainer-backup-$(date +%Y%m%d).tar.gz"
tar czf "${BACKUP_FILE}" -C /mnt portainer-data

# Upload to Spaces
s3cmd put "${BACKUP_FILE}" s3://your-space/portainer-backups/
```

## Conclusion

Portainer on a DigitalOcean Droplet is one of the most straightforward cloud deployments. DigitalOcean's clean UI, predictable pricing, and built-in Cloud Firewall make it easy to secure and manage. The block storage and DOCR integrations round out a complete self-hosted container management platform.
