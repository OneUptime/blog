# How to Migrate Portainer Data Between Servers - A Practical Guide

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Portainer, Docker, Migration, Backup, Infrastructure

Description: Migrate Portainer configuration and data between servers with minimal downtime, including environment re-registration and agent reconnection procedures.

## Introduction

Migrating Portainer to a new server involves transferring the data volume (containing all configuration), verifying environment connectivity from the new server, and redeploying Edge Agents if the Portainer URL changes. This guide provides a complete migration procedure.

## Migration Checklist

Before starting:
- [ ] New server has Docker installed
- [ ] New server has sufficient resources
- [ ] You have SSH access to both servers
- [ ] Backup of current Portainer data
- [ ] DNS or IP update plan ready

## Step 1: Create a Full Backup on Source Server

```bash
# On source server - stop Portainer for consistent backup

docker stop portainer

# Create backup
docker run --rm \
  -v portainer_data:/data \
  -v /tmp:/backup \
  alpine tar czf /backup/portainer-migration.tar.gz -C /data .

# Start Portainer again (minimize downtime)
docker start portainer

echo "Backup created: /tmp/portainer-migration.tar.gz"
ls -lh /tmp/portainer-migration.tar.gz
```

## Step 2: Export Stack Definitions

```bash
# Export all stack compose files as a safety net
PORTAINER_URL="https://localhost:9443"
TOKEN=$(curl -k -s -X POST "$PORTAINER_URL/api/auth" \
  -H "Content-Type: application/json" \
  -d '{"Username":"admin","Password":"yourpassword"}' | jq -r .jwt)

mkdir -p /tmp/portainer-stacks-export

for STACK_ID in $(curl -k -s -H "Authorization: Bearer $TOKEN" \
  "$PORTAINER_URL/api/stacks" | jq -r '.[].Id'); do

  STACK_NAME=$(curl -k -s -H "Authorization: Bearer $TOKEN" \
    "$PORTAINER_URL/api/stacks/$STACK_ID" | jq -r '.Name')

  curl -k -s -H "Authorization: Bearer $TOKEN" \
    "$PORTAINER_URL/api/stacks/$STACK_ID/file" | \
    jq -r '.StackFileContent' > "/tmp/portainer-stacks-export/$STACK_NAME.yml"

  echo "Exported: $STACK_NAME"
done
```

## Step 3: Transfer Data to New Server

```bash
# Transfer backup and stack exports to new server
scp /tmp/portainer-migration.tar.gz user@new-server:/tmp/
scp -r /tmp/portainer-stacks-export/ user@new-server:/tmp/

# Verify transfer
ssh user@new-server "ls -lh /tmp/portainer-migration.tar.gz"
```

## Step 4: Restore on New Server

```bash
# On the NEW server:

# Create the data volume
docker volume create portainer_data

# Extract backup into the volume
docker run --rm \
  -v portainer_data:/data \
  -v /tmp:/backup \
  alpine tar xzf /backup/portainer-migration.tar.gz -C /data

# Verify restoration
docker run --rm \
  -v portainer_data:/data \
  alpine ls -la /data/

# Start Portainer
# Use the same Portainer image tag/version as the source server
docker run -d \
  -p 8000:8000 \
  -p 9443:9443 \
  -p 9000:9000 \
  --name portainer \
  --restart=unless-stopped \
  -v /var/run/docker.sock:/var/run/docker.sock \
  -v portainer_data:/data \
  portainer/portainer-ce:lts

# Test access
sleep 10
curl -k https://localhost:9443/api/status | jq .
```

## Step 5: Update DNS or IP

```bash
# If using a domain for Portainer:
# Update DNS A record to point to new server IP

# Verify DNS propagation
nslookup portainer.yourdomain.com
# or
dig portainer.yourdomain.com

# If using direct IP access, update bookmarks/links
```

## Step 6: Update Environment URLs

After migration, environment URLs may need updating if:
- The managed environment itself has a new IP or hostname
- The new Portainer server must reach the environment through a different address or DNS name

```bash
# Log in to the new Portainer instance
# Go to: Environments → Edit each environment
# Update the URL only if the environment itself moved or
# the new Portainer server must reach it at a different address

# Via API
NEW_SERVER_URL="https://192.168.1.200:9443"
TOKEN=$(curl -k -s -X POST "$NEW_SERVER_URL/api/auth" \
  -H "Content-Type: application/json" \
  -d '{"Username":"admin","Password":"yourpassword"}' | jq -r .jwt)

# List all endpoints
curl -k -s -H "Authorization: Bearer $TOKEN" \
  "$NEW_SERVER_URL/api/endpoints" | \
  jq '.[] | {id: .Id, name: .Name, url: .URL}'
```

## Step 7: Reconnect Agents

Standard Portainer agents do not store the Portainer server URL. After restoring the same Portainer data, they usually come back online as long as the new server can still reach them on port 9001 and any `AGENT_SECRET` setting matches.

```bash
# SSH to each agent host:
ssh agent-host

# Verify the agent container is still running
docker ps --filter "name=portainer_agent" --filter "name=portainer-agent"

# Redeploy only if you need to change the agent version/configuration
docker stop portainer_agent && docker rm portainer_agent
docker pull portainer/agent:lts
docker run -d \
  -p 9001:9001 \
  --name portainer_agent \
  --restart=always \
  -v /var/run/docker.sock:/var/run/docker.sock \
  -v /var/lib/docker/volumes:/var/lib/docker/volumes \
  portainer/agent:lts
# Add -e AGENT_SECRET=yoursecret if your Portainer server uses AGENT_SECRET

# In Portainer, the environment will show online
# once the agent is reachable from the new server
```

## Step 8: Update Edge Agent Keys

Edge agents have the server URL encoded in their key. After migration:

```bash
# If the Portainer URL changed, edge environments will show as offline
# You need to:
# 1. Remove the existing Edge environment in Portainer
# 2. Recreate it to generate a new deployment command
# 3. Stop and remove the old portainer_edge_agent container on each edge device
# 4. Run the new deployment command on each edge device

# Alternatively, if the server URL hasn't changed, just wait
# Edge agents will reconnect when they next check in
```

## Step 9: Decommission Old Server

```bash
# Once migration is verified:

# 1. Wait 24-48 hours to ensure everything works on new server

# 2. On old server, stop Portainer
docker stop portainer
docker rm portainer

# 3. Keep backup files on old server for 30 days
# then decommission

# 4. Update any DNS records pointing to old server

# 5. Notify users of the new server address if direct IP
```

## Step 10: Post-Migration Verification

```bash
# Comprehensive post-migration check
NEW_SERVER="https://new-server-ip:9443"

TOKEN=$(curl -k -s -X POST "$NEW_SERVER/api/auth" \
  -H "Content-Type: application/json" \
  -d '{"Username":"admin","Password":"yourpassword"}' | jq -r .jwt)

echo "=== Post-Migration Check ==="

echo "Version:"
curl -k -s "$NEW_SERVER/api/status" | jq '.Version'

echo "Environments:"
curl -k -s -H "Authorization: Bearer $TOKEN" \
  "$NEW_SERVER/api/endpoints" | jq '.[].Name'

echo "Stacks:"
curl -k -s -H "Authorization: Bearer $TOKEN" \
  "$NEW_SERVER/api/stacks" | jq '.[].Name'

echo "Users:"
curl -k -s -H "Authorization: Bearer $TOKEN" \
  "$NEW_SERVER/api/users" | jq '.[].Username'

echo "Migration check complete"
```

## Conclusion

Portainer migration between servers follows a simple pattern: backup the data volume on the source, transfer it to the destination, restore it, and start Portainer with the same image version/channel. The main post-migration tasks are verifying connectivity to existing environments from the new server and redeploying Edge Agents if the Portainer URL changed. Standard Portainer agents normally continue working as long as the new server can still reach them.
