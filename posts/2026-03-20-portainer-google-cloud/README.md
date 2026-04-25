# How to Deploy Portainer on Google Cloud Compute Engine - Part 2

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Portainer, Google Cloud, GCP, Compute Engine, Docker

Description: Learn how to deploy Portainer on a Google Cloud Compute Engine instance with firewall rules, a static IP, and optional Cloud DNS configuration.

## Prerequisites

- Google Cloud project created
- `gcloud` CLI installed and authenticated
- Basic knowledge of GCP networking

## Step 1: Create the VM Instance

```bash
# Set your project

gcloud config set project YOUR_PROJECT_ID

# Create a VM instance
# e2-medium provides 2 vCPU and 4GB RAM
gcloud compute instances create portainer-vm \
  --zone=us-central1-a \
  --machine-type=e2-medium \
  --image-family=ubuntu-2204-lts \
  --image-project=ubuntu-os-cloud \
  --boot-disk-size=30GB \
  --boot-disk-type=pd-ssd \
  --tags=portainer-server

# Get the external IP
gcloud compute instances describe portainer-vm \
  --zone=us-central1-a \
  --format='get(networkInterfaces[0].accessConfigs[0].natIP)'
```

## Step 2: Create Firewall Rules

```bash
# Allow HTTPS for Portainer (port 9443)
gcloud compute firewall-rules create allow-portainer-https \
  --direction=INGRESS \
  --priority=1000 \
  --network=default \
  --action=ALLOW \
  --rules=tcp:9443 \
  --source-ranges=0.0.0.0/0 \
  --target-tags=portainer-server \
  --description="Allow Portainer HTTPS"

# Optional: allow the Portainer Edge tunnel (port 8000)
gcloud compute firewall-rules create allow-portainer-edge \
  --direction=INGRESS \
  --priority=1000 \
  --network=default \
  --action=ALLOW \
  --rules=tcp:8000 \
  --source-ranges=0.0.0.0/0 \
  --target-tags=portainer-server

# If you need legacy HTTP access on port 9000, open tcp:9000 instead.

# Optional: restrict to your IP only
# --source-ranges=YOUR_IP/32
```

## Step 3: Set a Static IP Address

```bash
# Reserve a static external IP
gcloud compute addresses create portainer-static-ip \
  --region=us-central1

# Assign to the instance
gcloud compute instances delete-access-config portainer-vm \
  --zone=us-central1-a

gcloud compute instances add-access-config portainer-vm \
  --zone=us-central1-a \
  --address=$(gcloud compute addresses describe portainer-static-ip --region=us-central1 --format='get(address)')
```

## Step 4: Install Docker and Portainer

```bash
# SSH into the instance
gcloud compute ssh portainer-vm --zone=us-central1-a

# Install Docker
curl -fsSL https://get.docker.com -o get-docker.sh
sudo sh get-docker.sh
sudo usermod -aG docker $USER
newgrp docker

# Install Portainer
docker volume create portainer_data

docker run -d \
  -p 8000:8000 \
  -p 9443:9443 \
  --name portainer \
  --restart=always \
  -v /var/run/docker.sock:/var/run/docker.sock \
  -v portainer_data:/data \
  portainer/portainer-ce:sts
```

## Step 5: Configure Cloud DNS (Optional)

```bash
# Create a DNS zone for your domain
gcloud dns managed-zones create portainer-zone \
  --dns-name=yourdomain.com. \
  --description="Portainer DNS"

# Add an A record
gcloud dns record-sets create portainer.yourdomain.com. \
  --zone=portainer-zone \
  --type=A \
  --ttl=300 \
  --rrdatas=$(gcloud compute addresses describe portainer-static-ip --region=us-central1 --format='get(address)')
```

## Step 6: Startup Script for Automated Setup

For repeatable deployments, use a startup script:

```bash
# Create instance with startup script
gcloud compute instances create portainer-vm \
  --zone=us-central1-a \
  --machine-type=e2-medium \
  --image-family=ubuntu-2204-lts \
  --image-project=ubuntu-os-cloud \
  --tags=portainer-server \
  --metadata=startup-script='#!/bin/bash
curl -fsSL https://get.docker.com -o get-docker.sh
sh get-docker.sh
docker volume create portainer_data
docker run -d -p 8000:8000 -p 9443:9443 \
  --name portainer --restart=always \
  -v /var/run/docker.sock:/var/run/docker.sock \
  -v portainer_data:/data \
  portainer/portainer-ce:sts'
```

## Cost Estimation

| Machine Type | vCPU | RAM | Monthly (24/7, us-central1) |
|-------------|------|-----|----------------|
| e2-micro | 2 | 1GB | ~$6.11 |
| e2-small | 2 | 2GB | ~$12.23 |
| e2-medium | 2 | 4GB | ~$24.46 |

Approximate on-demand VM cost in `us-central1`, excluding disks and network egress. Use committed use discounts (1-year) for about 37% savings on eligible production instances.

## Conclusion

GCP Compute Engine is a solid platform for running Portainer. The combination of firewall tags (rather than IP-based rules) and static IPs makes the network configuration maintainable. The `gcloud` startup script approach allows fully automated, repeatable Portainer deployments across multiple regions.
