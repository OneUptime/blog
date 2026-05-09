# How to Migrate Portainer Data to a New Server - A Practical Guide

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Portainer, Migration, Backup, Docker, DevOps

Description: Step-by-step guide to migrating your Portainer installation and all its data to a new server with minimal downtime.

## Introduction

Migrating Portainer to a new server requires backing up the Portainer data volume (which contains all configurations, users, environments, and stacks) and restoring it on the new host. This guide covers the complete migration process including pre-migration checklist, data transfer, and verification.

## Pre-Migration Checklist

Before starting:
- [ ] Note the Portainer version (must match on new server)
- [ ] Document all registered environments and their connection details
- [ ] Back up any SSL/TLS certificates
- [ ] Ensure SSH access to both servers
- [ ] Plan the maintenance window

## Step 1: Document the Current Setup

```bash
# On the old server: check Portainer version

docker inspect portainer --format '{{.Config.Image}}'

# Note all environment connection details
# These are stored in the Portainer data volume

# Check the data volume location
docker inspect portainer --format '{{json .Mounts}}' | python3 -m json.tool
```

## Step 2: Stop Portainer and Backup Data

```bash
# Stop Portainer to ensure data consistency
docker stop portainer

# Backup the data volume
docker run --rm \
  -v portainer_data:/data \
  -v /tmp/portainer-backup:/backup \
  alpine tar czf /backup/portainer-backup-$(date +%Y%m%d-%H%M%S).tar.gz -C /data .

# Verify the backup
ls -lh /tmp/portainer-backup/

# Transfer backup to new server
rsync -av /tmp/portainer-backup/ user@new-server:/tmp/portainer-restore/

echo "Backup complete"
```

## Step 3: Install Docker on New Server

```bash
# On the new server
curl -fsSL https://get.docker.com | sh
sudo systemctl enable --now docker

# Verify Docker is running
docker --version
docker ps
```

## Step 4: Restore Portainer Data

```bash
# On the new server: Create the Portainer data volume
docker volume create portainer_data

# Restore data from backup
docker run --rm \
  -v portainer_data:/data \
  -v /tmp/portainer-restore:/backup \
  alpine sh -c "tar xzf /backup/portainer-backup-*.tar.gz -C /data && echo 'Restore complete'"

# Verify restored data
docker run --rm \
  -v portainer_data:/data \
  alpine ls -la /data
```

## Step 5: Deploy Portainer on New Server

```bash
# Deploy the same version as the old server
# Example: using portainer-ce:2.19.4
docker run -d \
  --name portainer \
  --restart=always \
  -p 8000:8000 \
  -p 9443:9443 \
  -v /var/run/docker.sock:/var/run/docker.sock \
  -v portainer_data:/data \
  portainer/portainer-ce:2.19.4

# Check Portainer is running
docker ps
docker logs portainer
```

## Step 6: Verify Migration

```bash
# Test Portainer is accessible
curl -k https://localhost:9443/api/system/status

# Verify all environments are registered
curl -k -H "X-API-Key: your-api-key" \
  https://localhost:9443/api/endpoints | python3 -m json.tool

# Check users and teams
curl -k -H "X-API-Key: your-api-key" \
  https://localhost:9443/api/users | python3 -m json.tool
```

## Step 7: Update DNS/Firewall

```bash
# Update DNS to point to new server
# Or update reverse proxy configuration

# Example: Update Nginx upstream
sudo tee /etc/nginx/sites-available/portainer << 'EOF'
server {
    listen 443 ssl;
    server_name portainer.example.com;
    
    location / {
        proxy_pass https://NEW-SERVER-IP:9443;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
        proxy_set_header Host $host;
    }
}
EOF

sudo nginx -t && sudo nginx -s reload
```

## Step 8: Clean Up Old Server

```bash
# After verifying migration is successful
# On the old server:

# Stop and remove Portainer
docker stop portainer
docker rm portainer

# Remove old data volume (only after backup is verified!)
docker volume rm portainer_data

echo "Old server cleaned up"
```

## Handling Edge Environments

If you have Portainer Edge agents, you need to consider how they reach the new Portainer server. The Portainer server URL is encoded inside the base64 `EDGE_KEY` (in the format `portainer_instance_url|tunnel_server_addr|tunnel_server_fingerprint|endpoint_ID`), so the agent will keep dialing whatever URL was baked into that key when the agent was first deployed.

The simplest approach is to keep the same DNS hostname for Portainer and just point it at the new server - agents will reconnect automatically with no changes:

```bash
# On each edge host, inspect the current Edge configuration
docker inspect portainer_edge_agent \
  --format '{{range .Config.Env}}{{println .}}{{end}}' | grep EDGE_

# If you keep the same hostname, no change is needed on the agents.
```

If you cannot reuse the hostname, you must generate a new Edge key for each environment from the new Portainer instance and redeploy the agent with the updated `EDGE_KEY`:

```bash
# Stop and remove the existing agent, then redeploy with the new EDGE_KEY
docker rm -f portainer_edge_agent

docker run -d \
  --name portainer_edge_agent \
  --restart=always \
  -v /var/run/docker.sock:/var/run/docker.sock \
  -v /var/lib/docker/volumes:/var/lib/docker/volumes \
  -v portainer_agent_data:/data \
  -e EDGE=1 \
  -e EDGE_ID=<existing-or-new-edge-id> \
  -e EDGE_KEY=<new-base64-edge-key-from-new-server> \
  -e EDGE_INSECURE_POLL=1 \
  portainer/agent:2.19.4
```

## Conclusion

Migrating Portainer to a new server is a safe, well-defined process when you follow the backup-restore pattern. The data volume contains everything needed to restore Portainer to its exact previous state including users, environments, stacks, and settings. Plan for a brief maintenance window and verify the migration thoroughly before decommissioning the old server.
