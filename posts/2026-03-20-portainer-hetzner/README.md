# How to Deploy Portainer on Hetzner Cloud - Part 2

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Portainer, Hetzner, Docker, Cloud, VPS

Description: Learn how to deploy Portainer on Hetzner Cloud servers, one of the most cost-effective cloud providers, with firewall rules, cloud-init setup, and volume attachment.

## Why Hetzner for Portainer?

Hetzner Cloud offers some of the best price-to-performance ratios in cloud hosting. A CX23 server (2 vCPU, 4GB RAM) currently starts at about €4/month.

## Step 1: Create a Server via hcloud CLI

```bash
# Install hcloud CLI

brew install hcloud    # macOS
# or download from https://github.com/hetznercloud/cli

# Authenticate
hcloud context create portainer

# Create server
hcloud server create \
  --name portainer-server \
  --type cx23 \
  --image ubuntu-22.04 \
  --location nbg1 \
  --ssh-key my-ssh-key \
  --user-data-from-file /tmp/cloud-init.yaml

# Get IP
hcloud server ip portainer-server
```

Cloud-init file (`/tmp/cloud-init.yaml`):

```yaml
#cloud-config
runcmd:
  - curl -fsSL https://get.docker.com | sh
```

## Step 2: Create a Firewall

```bash
# Create firewall
hcloud firewall create --name portainer-fw

# Add inbound rules
hcloud firewall add-rule portainer-fw \
  --direction in --protocol tcp --port 22 --source-ips 0.0.0.0/0

hcloud firewall add-rule portainer-fw \
  --direction in --protocol tcp --port 9443 --source-ips 0.0.0.0/0

# Apply to server
hcloud firewall apply-to-resource portainer-fw \
  --type server --server portainer-server
```

## Step 3: Attach a Volume for Data Persistence

```bash
# Create a volume (separate from server's root disk)
hcloud volume create \
  --name portainer-data-vol \
  --size 20 \
  --server portainer-server \
  --automount \
  --format ext4

# The volume will be mounted at /mnt/HC_Volume_<ID>
# After you SSH into the server, check:
df -h | grep HC_Volume
```

Use the volume for Portainer data:

```bash
# SSH into server
ssh root@<SERVER_IP>

# Store Portainer data on the attached volume
mkdir -p /mnt/HC_Volume_<ID>/portainer

docker run -d -p 8000:8000 -p 9443:9443 \
  --name portainer --restart=always \
  -v /var/run/docker.sock:/var/run/docker.sock \
  -v /mnt/HC_Volume_<ID>/portainer:/data \
  portainer/portainer-ce:lts
```

## Step 4: Configure Hetzner DNS

```bash
# Create the zone in Hetzner Console if it does not exist yet
hcloud zone create --name yourdomain.com

# Create or replace the A record
hcloud zone set-records yourdomain.com portainer A \
  --record "$(hcloud server ip portainer-server)"
```

## MTU Configuration for Docker Swarm on Hetzner

Hetzner Cloud private network interfaces use MTU 1450. If you run Docker Swarm over a Hetzner private network, set the overlay network MTU accordingly to avoid fragmentation:

```bash
docker network create \
  --driver overlay \
  --opt com.docker.network.driver.mtu=1450 \
  my-overlay
```

See also: fix-swarm-mtu-issues-portainer-hetzner guide.

## Recommended Server Types

| Type | vCPU | RAM | Price | Use Case |
|------|------|-----|-------|----------|
| CX23 | 2 | 4GB | ~€4/mo | Personal |
| CX33 | 4 | 8GB | ~€6.50/mo | Team |
| CX43 | 8 | 16GB | ~€12/mo | Production |

## Conclusion

Hetzner Cloud delivers exceptional value for Portainer deployments. The combination of cloud-init automated setup, hcloud CLI management, and Hetzner's firewall and volume features makes it easy to build a production-ready Portainer environment at a fraction of the cost of AWS or Azure.
