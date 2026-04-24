# How to Restore Portainer from a Local Backup

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Portainer, Docker, Backup, Restore, Recovery, Self-Hosted

Description: Restore Portainer configuration from a local backup file, recovering your environments, stacks, users, and settings after a failure or migration.

## Introduction

Whether recovering from a hardware failure, migrating to a new server, or undoing a misconfiguration, restoring Portainer from a local backup brings back all your settings - environments, stacks, users, registries, and access control - in minutes. This guide covers both the built-in restore UI and manual volume restoration.

## Prerequisites

- A backup file (`portainer-YYYYMMDD.tar.gz`)
- Portainer installed on the target server
- Docker available on the target server

## Method 1: Restore via Portainer UI (Recommended)

This method works when you have a `tar.gz` backup created by Portainer's built-in backup feature and are restoring to a fresh Portainer instance with an empty data volume:

1. Open Portainer at `https://your-host:9443`
2. During initial setup, expand **Restore Portainer from backup**
3. Upload your backup file
4. Enter the backup password (if encrypted)
5. Click **Restore**
6. When the restore completes, Portainer redirects you to the login page with the restored configuration

## Method 2: Manual Volume Restoration

For backups created by archiving the contents of the Portainer data volume:

```bash
# Step 1: Stop Portainer

docker stop portainer
docker rm portainer

# Step 2: Remove existing data volume (DESTRUCTIVE)
docker volume rm portainer_data

# Step 3: Create a new empty volume
docker volume create portainer_data

# Step 4: Extract backup into the new volume
BACKUP_FILE="/opt/backups/portainer/portainer-20260320-020000.tar.gz"

docker run --rm \
  -v portainer_data:/data \
  -v "$(dirname "$BACKUP_FILE"):/backup" \
  alpine tar xzf "/backup/$(basename "$BACKUP_FILE")" -C /data

# Step 5: Verify restoration
docker run --rm \
  -v portainer_data:/data \
  alpine ls -la /data/

# Step 6: Start Portainer
docker run -d \
  -p 9000:9000 \
  -p 9443:9443 \
  --name portainer \
  --restart=unless-stopped \
  -v /var/run/docker.sock:/var/run/docker.sock \
  -v portainer_data:/data \
  portainer/portainer-ce:latest

# Step 7: Wait for startup and test login
sleep 10
curl -X POST http://localhost:9000/api/auth \
  -H "Content-Type: application/json" \
  -d '{"Username":"admin","Password":"yourpassword"}'
```

## Method 3: Restore to New Server (Migration)

When restoring to a completely new server:

```bash
# On the NEW server:

# 1. Transfer the backup file
scp backup-server:/opt/backups/portainer/portainer-20260320.tar.gz /tmp/

# 2. Pull the same Portainer image tag as the source
# (Check source: docker inspect --format '{{.Config.Image}}' portainer)
PORTAINER_IMAGE="<exact-image-tag-from-source>"
docker pull "$PORTAINER_IMAGE"

# 3. Create volume and restore
docker volume create portainer_data

docker run --rm \
  -v portainer_data:/data \
  -v /tmp:/backup \
  alpine tar xzf /backup/portainer-20260320.tar.gz -C /data

# 4. Start Portainer (same version as backup)
docker run -d \
  -p 9000:9000 \
  -p 9443:9443 \
  --name portainer \
  --restart=unless-stopped \
  -v /var/run/docker.sock:/var/run/docker.sock \
  -v portainer_data:/data \
  "$PORTAINER_IMAGE"

# 5. Verify everything loaded
# - Check environments are listed
# - Verify stacks appear
# - Test user login
```

## Step 4: Verify Restored Configuration

```bash
# Test login with your admin credentials
TOKEN=$(curl -s -X POST http://localhost:9000/api/auth \
  -H "Content-Type: application/json" \
  -d '{"Username":"admin","Password":"yourpassword"}' | jq -r .jwt)

# Verify environments are restored
curl -s -H "Authorization: Bearer $TOKEN" \
  http://localhost:9000/api/endpoints | jq '.[].Name'

# Verify stacks are restored
curl -s -H "Authorization: Bearer $TOKEN" \
  http://localhost:9000/api/stacks | jq '.[].Name'

# Verify users are restored
curl -s -H "Authorization: Bearer $TOKEN" \
  http://localhost:9000/api/users | jq '.[].Username'
```

## Step 5: Reconnect Environments

After restoration on a new server, remote environments may show as offline:

```bash
# The environments are listed in Portainer, but their saved connection details
# may need attention after the move
# Option A: Restart the remote Portainer Agent or Edge Agent container if needed
ssh remote-host "docker restart your-agent-container-name"

# Option B: Update environment URL if the new server reaches the environment
# at a different address
# Portainer UI: Environments → Edit → update URL
```

## Step 6: Re-deploy Running Stacks

After restoration, verify which stacks should be running:

```bash
# List all stacks and their status
TOKEN=$(curl -s -X POST http://localhost:9000/api/auth \
  -H "Content-Type: application/json" \
  -d '{"Username":"admin","Password":"yourpassword"}' | jq -r .jwt)

curl -s -H "Authorization: Bearer $TOKEN" \
  http://localhost:9000/api/stacks | \
  jq '.[] | {name: .Name, status: .Status}'

# Status 1 = active, 2 = inactive, 3 = deploying, 4 = error

# Re-deploy any stacks that were active but show as inactive
# In Portainer UI: Stacks → select stack → Start
```

## Step 7: Test All Critical Functions

After restoration:

1. **Login** with each user account
2. **View containers** in each environment
3. **Deploy a test stack** to verify stack deployment works
4. **Check logs** of a running container
5. **Open terminal** in a container (tests WebSocket)

## Conclusion

Portainer restoration is straightforward once you have a backup: stop Portainer, restore the data volume contents, and restart. The manual `tar` extraction method works for backups created by archiving the contents of the Portainer data volume. For Portainer-generated `tar.gz` backups, use the built-in restore UI on a fresh Portainer instance with an empty data volume. Always verify the restoration by testing login and checking that environments, stacks, and users are all present.
