# How to Automate Container Cleanup Scripts with Portainer API

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Portainer, API, Automation, Docker, DevOps, Cleanup, Scripting

Description: Learn how to use the Portainer API to automate cleanup of stopped containers, dangling images, and unused volumes across your environments.

---

Over time, Docker hosts accumulate stopped containers, dangling images, and orphaned volumes that waste disk space. The Portainer API lets you automate cleanup across all your managed environments without logging into each host manually. This guide shows how to build a cleanup script using the Portainer REST API.

---

## Step 1: Generate a Portainer API Key

In Portainer UI:
1. Click your username in the top right
2. Go to **My Account > Access tokens**
3. Click **Add access token**
4. Name it `cleanup-script` and copy the token

---

## Step 2: Discover Your Environment IDs

```bash
# List all Portainer environments and their IDs

PORTAINER_URL="https://portainer.example.com"
API_KEY="ptr_your_api_key_here"

curl -s \
  -H "X-API-Key: $API_KEY" \
  "$PORTAINER_URL/api/endpoints" | \
  python3 -c "
import sys, json
envs = json.load(sys.stdin)
for e in envs:
    print(f'ID: {e[\"Id\"]:3}  Name: {e[\"Name\"]:20}  Type: {e[\"Type\"]}')
"
```

---

## Step 3: Write the Cleanup Script

This script removes stopped containers, dangling images, and unused volumes via the Portainer API.

```bash
#!/bin/sh
# portainer-cleanup.sh - automated cleanup via Portainer API

PORTAINER_URL="${PORTAINER_URL:-https://portainer.example.com}"
API_KEY="${API_KEY:-ptr_your_api_key_here}"
LOG_FILE="${LOG_FILE:-/var/log/portainer-cleanup.log}"

log() {
  echo "[$(date '+%Y-%m-%d %H:%M:%S')] $1" | tee -a "$LOG_FILE"
}

# Get all environment IDs
ENDPOINTS=$(curl -s -H "X-API-Key: $API_KEY" \
  "$PORTAINER_URL/api/endpoints" | python3 -c "
import sys, json
print(' '.join(str(e['Id']) for e in json.load(sys.stdin)))
")

for ENV_ID in $ENDPOINTS; do
  log "Processing environment $ENV_ID..."

  # Remove stopped containers
  STOPPED=$(curl -s --globoff -H "X-API-Key: $API_KEY" \
    "$PORTAINER_URL/api/endpoints/$ENV_ID/docker/containers/json?all=true&filters={\"status\":[\"exited\"]}" | \
    python3 -c "import sys,json; [print(c['Id']) for c in json.load(sys.stdin)]")

  for CONTAINER_ID in $STOPPED; do
    log "  Removing stopped container: $CONTAINER_ID"
    curl -s -X DELETE \
      -H "X-API-Key: $API_KEY" \
      "$PORTAINER_URL/api/endpoints/$ENV_ID/docker/containers/$CONTAINER_ID?v=true" > /dev/null
  done

  # Prune dangling images
  log "  Pruning dangling images..."
  curl -s --globoff -X POST \
    -H "X-API-Key: $API_KEY" \
    "$PORTAINER_URL/api/endpoints/$ENV_ID/docker/images/prune?filters={\"dangling\":[\"true\"]}" | \
    python3 -c "
import sys, json
result = json.load(sys.stdin)
reclaimed = result.get('SpaceReclaimed', 0)
print(f'  Reclaimed: {reclaimed / 1024 / 1024:.1f} MB')
" | tee -a "$LOG_FILE"

  # Prune unused volumes
  log "  Pruning unused volumes..."
  curl -s --globoff -X POST \
    -H "X-API-Key: $API_KEY" \
    "$PORTAINER_URL/api/endpoints/$ENV_ID/docker/volumes/prune?filters={\"all\":[\"true\"]}" | \
    python3 -c "
import sys, json
result = json.load(sys.stdin)
print(f'  Removed volumes: {result.get(\"VolumesDeleted\", [])}')
" | tee -a "$LOG_FILE"

  log "Environment $ENV_ID cleanup complete."
done

log "All environments cleaned up."
```

---

## Step 4: Schedule the Cleanup with Cron

```bash
# Make the script executable
chmod +x /usr/local/bin/portainer-cleanup.sh

# Schedule daily cleanup at 2 AM
crontab -e
# Add:
0 2 * * * /usr/local/bin/portainer-cleanup.sh >/dev/null 2>> /var/log/portainer-cleanup.log
```

---

## Step 5: Run Cleanup as a Portainer Stack (Scheduled Container)

Alternatively, run the cleanup script inside a container managed by Portainer itself using Ofelia or a cron-capable image.

```yaml
# cleanup-scheduler-stack.yml
version: "3.8"

services:
  cleanup:
    image: alpine:3.20
    restart: unless-stopped
    environment:
      PORTAINER_URL: https://portainer.example.com
      API_KEY: ptr_your_api_key_here
    volumes:
      - ./portainer-cleanup.sh:/cleanup.sh:ro
    command: >
      sh -c "apk add --no-cache curl python3 &&
             echo '0 2 * * * sh /cleanup.sh >/dev/null 2>> /var/log/portainer-cleanup.log' > /etc/crontabs/root &&
             crond -f"
```

---

## Summary

The Portainer API exposes Docker operations across all your environments through a single authenticated endpoint. A cleanup script that iterates over environment IDs and calls Docker Engine API endpoints to remove stopped containers and prune images and volumes can be scheduled via cron or as a Portainer-managed container to keep your hosts clean automatically.
