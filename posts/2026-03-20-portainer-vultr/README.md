# How to Deploy Portainer on Vultr Cloud - Part 2

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Portainer, Vultr, Docker, Cloud, VPS

Description: Learn how to deploy Portainer on a Vultr Cloud Compute instance with startup scripts, firewall rules, and Vultr's block storage for persistent data.

## Prerequisites

- Vultr account
- Vultr CLI or API access
- Go and `jq` installed locally for the Vultr CLI examples
- SSH key uploaded to Vultr

## Option 1: Deploy via Vultr Control Panel

1. **Products → Compute → Deploy Server**
2. Cloud Compute → Regular Performance
3. Location: choose nearest region
4. Image: Ubuntu 22.04 LTS
5. Size: 2 vCPU / 4GB RAM (~$20/mo) or 1 vCPU / 2GB RAM (~$10/mo)
6. Under **Server Settings → Startup Script**:

```bash
#!/bin/bash
apt-get update
apt-get install -y curl
curl -fsSL https://get.docker.com | sh
systemctl enable --now docker
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

## Option 2: Deploy via Vultr CLI

```bash
# Install vultr-cli

go install github.com/vultr/vultr-cli/v3@latest
export PATH="$(go env GOPATH)/bin:$PATH"

# Configure API key
export VULTR_API_KEY="your-api-key"

# Find the current Ubuntu 22.04 LTS OS ID
vultr-cli os list --output=json | jq '.os[] | {id, name}'

# Create a startup script
cat > portainer-startup.sh <<'EOF'
#!/bin/bash
apt-get update
apt-get install -y curl
curl -fsSL https://get.docker.com | sh
systemctl enable --now docker
docker volume create portainer_data
docker run -d \
  -p 8000:8000 \
  -p 9443:9443 \
  --name portainer \
  --restart=always \
  -v /var/run/docker.sock:/var/run/docker.sock \
  -v portainer_data:/data \
  portainer/portainer-ce:sts
EOF

SCRIPT_ID=$(vultr-cli script create \
  --name portainer-startup \
  --script-file ./portainer-startup.sh \
  --output=json | jq -r '.startup_script.id')

# Create instance
vultr-cli instance create \
  --region ewr \
  --plan vc2-2c-4gb \
  --os YOUR_UBUNTU_22_04_OS_ID \
  --label portainer-server \
  --ssh-keys "YOUR_KEY_ID" \
  --script-id "$SCRIPT_ID" \
  --notify=true

# List instances and get ID and IP
vultr-cli instance list --output=json | jq '.instances[] | {id, label, main_ip}'
```

## Configure Vultr Firewall

```bash
# Create firewall group
FIREWALL_ID=$(vultr-cli firewall group create \
  --description "Portainer Firewall" \
  --output=json | jq -r '.firewall_group.id')

# Add inbound rules
vultr-cli firewall rule create "$FIREWALL_ID" \
  --ip-type v4 \
  --protocol tcp \
  --port 22 \
  --size 0 \
  --subnet "0.0.0.0" \
  --notes "SSH"

vultr-cli firewall rule create "$FIREWALL_ID" \
  --ip-type v4 \
  --protocol tcp \
  --port 9443 \
  --size 0 \
  --subnet "0.0.0.0" \
  --notes "Portainer HTTPS"

# Attach firewall to instance
vultr-cli instance update-firewall-group INSTANCE_ID \
  --firewall-group-id "$FIREWALL_ID"
```

## Attach Block Storage

For persistent data that survives instance replacement:

```bash
# Create block storage volume
VOLUME_ID=$(vultr-cli block-storage create \
  --region ewr \
  --size 20 \
  --label portainer-storage \
  --output=json | jq -r '.block.id')

# Attach to instance
vultr-cli block-storage attach "$VOLUME_ID" \
  --instance INSTANCE_ID \
  --live

# On the server: format and mount
mkfs.ext4 /dev/vdb
mkdir -p /mnt/portainer-data
mount /dev/vdb /mnt/portainer-data
echo "/dev/vdb /mnt/portainer-data ext4 defaults 0 0" >> /etc/fstab

# Migrate Portainer data to block storage and recreate the container
docker stop portainer
docker run --rm \
  -v portainer_data:/from \
  -v /mnt/portainer-data:/to \
  alpine sh -c 'cp -a /from/. /to/'
docker rm portainer
docker run -d \
  -p 8000:8000 \
  -p 9443:9443 \
  --name portainer \
  --restart=always \
  -v /var/run/docker.sock:/var/run/docker.sock \
  -v /mnt/portainer-data:/data \
  portainer/portainer-ce:sts
```

## Set Up Vultr DNS

```bash
# Create DNS zone via API
curl -s "https://api.vultr.com/v2/domains" \
  -X POST \
  -H "Authorization: Bearer $VULTR_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{"domain": "yourdomain.com", "ip": "YOUR_SERVER_IP"}'

# Add A record for Portainer
curl -s "https://api.vultr.com/v2/domains/yourdomain.com/records" \
  -X POST \
  -H "Authorization: Bearer $VULTR_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{"type": "A", "name": "portainer", "data": "YOUR_SERVER_IP", "ttl": 300}'
```

## Conclusion

Vultr's compute instances are straightforward for Portainer deployments. The startup script feature automates Docker and Portainer installation, and Vultr's block storage provides persistent, detachable storage for Portainer data - useful when migrating between instance types or replacing instances in the same region.
