# How to Deploy Portainer on DigitalOcean Droplets - Part 2

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Portainer, DigitalOcean, Droplet, Docker, Cloud

Description: Learn how to quickly deploy Portainer on a DigitalOcean Droplet using cloud-init user data for automated setup, with firewall configuration and optional managed DNS.

## Why DigitalOcean for Portainer?

DigitalOcean Droplets are simple, affordable Linux VMs with a clean API and good Docker support. A basic Droplet is sufficient for a personal Portainer instance.

## Option 1: Automated Deployment with User Data

When creating a Droplet in the DigitalOcean console or via API, add this cloud-init user data:

```yaml
#cloud-config
packages:
  - apt-transport-https
  - ca-certificates
  - curl

runcmd:
  # Install Docker
  - curl -fsSL https://get.docker.com | sh
  # Install Portainer
  - docker volume create portainer_data
  - docker run -d -p 8000:8000 -p 9443:9443
    --name portainer --restart=always
    -v /var/run/docker.sock:/var/run/docker.sock
    -v portainer_data:/data
    portainer/portainer-ce:latest
```

## Option 2: Deploy via doctl CLI

```bash
# Install doctl and authenticate

sudo snap install doctl
doctl auth init

# Create a Droplet using the cloud-init file
doctl compute droplet create portainer-droplet \
  --image ubuntu-22-04-x64 \
  --size s-2vcpu-4gb \
  --region nyc3 \
  --ssh-keys $(doctl compute ssh-key list --format ID --no-header | head -1) \
  --user-data-file /tmp/cloud-init.yaml \
  --tag-names portainer

# Get the IP address
doctl compute droplet get portainer-droplet --format PublicIPv4
```

## Option 3: Use the Docker Marketplace Image

DigitalOcean has a Docker 1-click image:

1. **Create Droplet → Marketplace → Docker**
2. Select size
3. After creation, SSH and run:

```bash
docker volume create portainer_data

docker run -d \
  -p 8000:8000 \
  -p 9443:9443 \
  --name portainer \
  --restart=always \
  -v /var/run/docker.sock:/var/run/docker.sock \
  -v portainer_data:/data \
  portainer/portainer-ce:latest
```

## Configure the Firewall

```bash
# Create a firewall
doctl compute firewall create \
  --name portainer-fw \
  --inbound-rules "protocol:tcp,ports:22,address:0.0.0.0/0 protocol:tcp,ports:9443,address:0.0.0.0/0" \
  --outbound-rules "protocol:tcp,ports:all,address:0.0.0.0/0 protocol:udp,ports:all,address:0.0.0.0/0"

# Apply to the Droplet
doctl compute firewall add-droplets <FIREWALL_ID> \
  --droplet-ids $(doctl compute droplet get portainer-droplet --format ID --no-header)
```

## Add a DigitalOcean Domain

```bash
# Create the domain
doctl compute domain create yourdomain.com

doctl compute domain records create yourdomain.com \
  --record-type A \
  --record-name portainer \
  --record-data $(doctl compute droplet get portainer-droplet --format PublicIPv4 --no-header) \
  --record-ttl 300
```

## Enable Automatic Backups

```bash
# Enable weekly backups (20% of Droplet cost)
doctl compute droplet-action enable-backups \
  $(doctl compute droplet get portainer-droplet --format ID --no-header) \
  --backup-policy-plan weekly \
  --backup-policy-weekday SUN \
  --backup-policy-hour 4
```

## Recommended Droplet Sizes

| Size | RAM | vCPU | Price | Use Case |
|------|-----|------|-------|----------|
| s-1vcpu-1gb | 1GB | 1 | $6/mo | Testing only |
| s-1vcpu-2gb | 2GB | 1 | $12/mo | Personal use |
| s-2vcpu-4gb | 4GB | 2 | $24/mo | Team use |

## Conclusion

DigitalOcean Droplets provide a simple, affordable platform for Portainer. The cloud-init user data approach makes deployment fully automated - create a Droplet with the user data script and Portainer is running before you've finished your first coffee. DigitalOcean's Marketplace Docker image provides the fastest manual path.
