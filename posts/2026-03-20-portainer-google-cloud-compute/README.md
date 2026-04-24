# How to Deploy Portainer on Google Cloud Compute Engine - Part 3

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Portainer, Google Cloud, GCP, Compute Engine, Docker, Cloud, DevOps

Description: Deploy Portainer on Google Cloud Compute Engine with firewall rules, persistent disks, and optional Google Artifact Registry integration for cloud container management.

## Introduction

Google Cloud Compute Engine offers competitive pricing and excellent network performance for running Portainer. Google Cloud's always-free `e2-micro` instance can run a basic Portainer setup at no cost when you stay within the monthly free tier limits in `us-west1`, `us-central1`, or `us-east1` and use free-tier-eligible resources. This guide covers deploying Portainer on GCP with proper firewall configuration and optional persistent disk setup.

## Prerequisites

- Google Cloud account with Compute Engine API enabled
- `gcloud` CLI installed (optional)
- SSH key pair

## Step 1: Create a Compute Engine Instance

### Via Google Cloud Console

1. Navigate to **Compute Engine > VM Instances > Create Instance**
2. Configure:
   - **Name**: `portainer-vm`
   - **Region/Zone**: Choose closest, or use `us-central1`, `us-east1`, or `us-west1` for always-free-eligible `e2-micro` usage
   - **Machine type**: `e2-medium` (2 vCPU, 4GB RAM) for production, or `e2-micro` (always-free eligible in supported US regions) for testing
   - **Boot disk**: Ubuntu 24.04 LTS, 20GB standard persistent disk for always-free-eligible testing, or SSD for production
3. Under **Firewall**: Check both **Allow HTTP** and **Allow HTTPS** if needed
4. Under **Networking**, note the External IP
5. Click **Create**

### Via gcloud CLI

```bash
# Set project

gcloud config set project YOUR_PROJECT_ID

# Create instance
# Use pd-standard instead of pd-ssd for always-free-eligible testing
gcloud compute instances create portainer-vm \
  --zone=us-central1-a \
  --machine-type=e2-medium \
  --image-family=ubuntu-2404-lts-amd64 \
  --image-project=ubuntu-os-cloud \
  --boot-disk-size=20GB \
  --boot-disk-type=pd-ssd \
  --tags=portainer-server
```

## Step 2: Configure Firewall Rules

### Via gcloud CLI

```bash
# Get your public IP
MY_IP=$(curl -s https://checkip.amazonaws.com)

# Create firewall rule for Portainer (restricted to your IP)
gcloud compute firewall-rules create allow-portainer \
  --direction=INGRESS \
  --priority=1000 \
  --network=default \
  --action=ALLOW \
  --rules=tcp:9000,tcp:9443 \
  --source-ranges=${MY_IP}/32 \
  --target-tags=portainer-server \
  --description="Allow Portainer access from admin IP"
```

### Via Cloud Console

1. Navigate to **VPC Network > Firewall**
2. Click **Create Firewall Rule**
3. Set:
   - Name: `allow-portainer`
   - Network: `default`
   - Direction: `Ingress`
   - Action: `Allow`
   - Targets: **Specified target tags**, tag: `portainer-server`
   - Source IP ranges: Your IP/32
   - Protocols and ports: TCP 9000, 9443

## Step 3: SSH and Install Docker

```bash
# SSH via gcloud (no key management needed)
gcloud compute ssh portainer-vm --zone=us-central1-a

# Or with an OpenSSH client after adding your SSH key to the VM
ssh -i ~/.ssh/id_rsa username@<external-ip>

# Update system
sudo apt update && sudo apt upgrade -y

# Install Docker
sudo apt install -y ca-certificates curl
sudo install -m 0755 -d /etc/apt/keyrings
sudo curl -fsSL https://download.docker.com/linux/ubuntu/gpg -o /etc/apt/keyrings/docker.asc
sudo chmod a+r /etc/apt/keyrings/docker.asc

sudo tee /etc/apt/sources.list.d/docker.sources > /dev/null <<EOF
Types: deb
URIs: https://download.docker.com/linux/ubuntu
Suites: $(. /etc/os-release && echo "${UBUNTU_CODENAME:-$VERSION_CODENAME}")
Components: stable
Architectures: $(dpkg --print-architecture)
Signed-By: /etc/apt/keyrings/docker.asc
EOF

sudo apt update
sudo apt install -y docker-ce docker-ce-cli containerd.io docker-buildx-plugin docker-compose-plugin
sudo usermod -aG docker $USER
newgrp docker
sudo systemctl enable docker
```

## Step 4: Add and Mount a Persistent Disk

```bash
# Create a persistent disk
gcloud compute disks create portainer-data \
  --zone=us-central1-a \
  --size=50GB \
  --type=pd-ssd

# Attach to instance
gcloud compute instances attach-disk portainer-vm \
  --disk=portainer-data \
  --zone=us-central1-a

# On the VM, format and mount
sudo lsblk  # Find new disk, usually /dev/sdb

sudo mkfs.ext4 -m 0 -E lazy_itable_init=0,lazy_journal_init=0,discard /dev/sdb

sudo mkdir -p /mnt/data

echo UUID=`sudo blkid -s UUID -o value /dev/sdb` /mnt/data ext4 \
    discard,defaults,nofail 0 2 | sudo tee -a /etc/fstab

sudo mount -a
```

## Step 5: Deploy Portainer

```bash
# Create volume on persistent disk
sudo mkdir -p /mnt/data/portainer
docker volume create \
  --driver local \
  --opt type=none \
  --opt device=/mnt/data/portainer \
  --opt o=bind \
  portainer_data

docker run -d \
  --name portainer \
  --restart=unless-stopped \
  -p 9000:9000 \
  -p 9443:9443 \
  -v /var/run/docker.sock:/var/run/docker.sock \
  -v portainer_data:/data \
  portainer/portainer-ce:lts
```

## Step 6: Integrate with Google Artifact Registry

```bash
# Optional: configure the VM's Docker CLI to authenticate with Artifact Registry
gcloud auth configure-docker us-central1-docker.pkg.dev

# Create service account credentials that Portainer can use
gcloud iam service-accounts create portainer-sa \
  --display-name="Portainer Service Account"

gcloud projects add-iam-policy-binding YOUR_PROJECT_ID \
  --member="serviceAccount:portainer-sa@YOUR_PROJECT_ID.iam.gserviceaccount.com" \
  --role="roles/artifactregistry.reader"

# Create and download key
gcloud iam service-accounts keys create /tmp/portainer-sa.json \
  --iam-account=portainer-sa@YOUR_PROJECT_ID.iam.gserviceaccount.com
```

In Portainer, add Artifact Registry:
1. **Registries > Add registry > Custom registry**
2. URL: `us-central1-docker.pkg.dev`
3. Username: `_json_key`
4. Password: (contents of portainer-sa.json)

## Step 7: Enable Cloud Monitoring

```bash
# Install Ops Agent for GCP monitoring
curl -sSO https://dl.google.com/cloudagents/add-google-cloud-ops-agent-repo.sh
sudo bash add-google-cloud-ops-agent-repo.sh --also-install
```

## Conclusion

Portainer on Google Cloud Compute Engine benefits from GCP's reliable infrastructure, competitive pricing, and easy integration with Google Artifact Registry. The persistent disk approach ensures data survives VM restarts and enables snapshots for backup. For cost-conscious deployments, the always-free `e2-micro` instance can run a basic Portainer setup when you stay within the monthly free tier limits in supported US regions and use free-tier-eligible resources.
