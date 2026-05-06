# How to Clean Up Stale Data in the Portainer Database

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Portainer, Docker, Maintenance, Database, Cleanup, Performance

Description: Remove stale containers, images, volumes, and endpoint data from Portainer's embedded database to improve performance and reclaim disk space.

## Introduction

Over time, Portainer's embedded BoltDB database accumulates stale data: deleted endpoints that still have cached snapshots, old container records, removed images that are still referenced, and unused network configurations. This stale data increases database file size, slows queries, and consumes memory. This guide covers systematic cleanup at both the Docker layer and Portainer database layer.

## Step 1: Clean Up Docker Resources (Foundation)

Before cleaning Portainer's database, clean up the actual Docker resources:

```bash
# See what's consuming space

docker system df
# Shows:
# TYPE                TOTAL     ACTIVE    SIZE      RECLAIMABLE
# Images              45        12        15.6GB    12.1GB (77%)
# Containers          23        8         2.3GB     1.8GB (78%)
# Local Volumes       31        14        45.2GB    12.3GB (27%)
# Build Cache         156       0         8.2GB     8.2GB (100%)

# Remove stopped containers
docker container prune -f

# Remove unused images (not referenced by any container)
docker image prune -a -f

# Remove unused local volumes (named and anonymous, not mounted by any container)
docker volume prune -a -f

# Remove unused networks
docker network prune -f

# Remove build cache (safe to remove - rebuilds from scratch next time)
docker builder prune -a -f

# Single-command cleanup for stopped containers, unused images, networks,
# build cache, and anonymous volumes
docker system prune -a -f --volumes

# Check reclaimed space
docker system df
```

## Step 2: Remove Stale Endpoints from Portainer

```bash
PORTAINER_URL="https://portainer.example.com"
API_KEY="your_api_key"

# List all endpoints
curl -s \
  -H "X-API-Key: $API_KEY" \
  "$PORTAINER_URL/api/endpoints" | \
  jq '.[] | {id: .Id, name: .Name, status: .Status, type: .Type}'

# Status codes:
# 1 = Up
# 2 = Down
# Review down endpoints before deleting them

# Find down endpoints
DOWN_ENDPOINTS=$(curl -s \
  -H "X-API-Key: $API_KEY" \
  "$PORTAINER_URL/api/endpoints" | \
  jq -r '.[] | select(.Status == 2) | .Id')

# Remove each endpoint you have confirmed is stale
for endpoint_id in $DOWN_ENDPOINTS; do
  echo "Removing stale endpoint: $endpoint_id"
  curl -s -X DELETE \
    -H "X-API-Key: $API_KEY" \
    "$PORTAINER_URL/api/endpoints/$endpoint_id"
done
```

## Step 3: Clean Up Old Stack Records

```bash
# List stacks and their current state
curl -s \
  -H "X-API-Key: $API_KEY" \
  "$PORTAINER_URL/api/stacks" | \
  jq '.[] | {id: .Id, endpointId: .EndpointId, name: .Name, status: .Status}'
# Status: 1=Active, 2=Inactive, 3=Deploying, 4=Error

# Remove inactive stacks you no longer need
INACTIVE_STACKS=$(curl -s \
  -H "X-API-Key: $API_KEY" \
  "$PORTAINER_URL/api/stacks" | \
  jq -r '.[] | select(.Status == 2) | "\(.Id) \(.EndpointId)"')

while read -r stack_id endpoint_id; do
  [ -n "$stack_id" ] || continue
  echo "Removing inactive stack: $stack_id"
  curl -s -X DELETE \
    -H "X-API-Key: $API_KEY" \
    "$PORTAINER_URL/api/stacks/$stack_id?endpointId=$endpoint_id"
done <<< "$INACTIVE_STACKS"
```

## Step 4: Compact the BoltDB Database

After removing data, the database file doesn't shrink automatically - it needs compaction:

```bash
#!/bin/bash
# compact-portainer-db.sh

set -euo pipefail

echo "=== Portainer Database Compaction ==="

# Get current database size
DB_PATH=$(docker inspect portainer \
  --format '{{range .Mounts}}{{if eq .Destination "/data"}}{{.Source}}{{end}}{{end}}')

BEFORE_SIZE=$(du -sh "$DB_PATH/portainer.db" | cut -f1)
echo "Before: $BEFORE_SIZE"

# Stop Portainer (required for safe compaction)
echo "Stopping Portainer..."
docker stop portainer

# Compact using the official bbolt CLI
docker run --rm \
  -v "$DB_PATH:/data" \
  golang:1.24-alpine \
  sh -ec "
    GOBIN=/tmp go install go.etcd.io/bbolt/cmd/bbolt@latest && \
    /tmp/bbolt compact -o /data/portainer.db.compact /data/portainer.db && \
    mv /data/portainer.db /data/portainer.db.bak && \
    mv /data/portainer.db.compact /data/portainer.db
  "

AFTER_SIZE=$(du -sh "$DB_PATH/portainer.db" | cut -f1)
echo "After: $AFTER_SIZE"

# Restart Portainer
echo "Starting Portainer..."
docker start portainer

echo "Compaction complete. Backup at: portainer.db.bak"
```

## Step 5: Automate Weekly Cleanup

```bash
# Save as /etc/cron.weekly/portainer-cleanup

#!/bin/bash
LOG="/var/log/portainer-cleanup.log"
exec >> "$LOG" 2>&1

echo "=== Weekly Portainer Cleanup: $(date) ==="

# Step 1: Docker resource cleanup
echo "Cleaning Docker resources..."
docker container prune -f
docker image prune -f
docker volume prune -f
docker network prune -f

# Avoid truncating files under /var/lib/docker/containers directly.
# Configure Docker log rotation instead.
echo "Docker cleanup complete. Current logging driver: $(docker info --format '{{.LoggingDriver}}')"

# Step 2: Report
echo "Cleanup complete: $(date)"
docker system df

# Then run outside the script:
# chmod +x /etc/cron.weekly/portainer-cleanup
```

## Step 6: Monitor Database Growth

```bash
#!/bin/bash
# monitor-db-growth.sh - Track database size over time

LOG_FILE="/var/log/portainer-db-size.log"
DB_PATH=$(docker inspect portainer \
  --format '{{range .Mounts}}{{if eq .Destination "/data"}}{{.Source}}{{end}}{{end}}')

while true; do
  SIZE=$(stat -c%s "$DB_PATH/portainer.db" 2>/dev/null || echo 0)
  CONTAINERS=$(docker ps -q | wc -l)
  echo "$(date -u +%Y-%m-%dT%H:%M:%SZ) db_size_bytes=$SIZE running_containers=$CONTAINERS" \
    >> "$LOG_FILE"

  # Alert if database exceeds 500MB
  DB_SIZE_MB=$((SIZE / 1048576))
  if [ "$DB_SIZE_MB" -gt 500 ]; then
    echo "WARNING: Portainer database is ${DB_SIZE_MB}MB - consider compaction"
  fi

  sleep 3600  # Log every hour
done
```

## Conclusion

Portainer database maintenance is a routine task, not a one-time fix. Docker resource cleanup (container prune, image prune, volume prune) is the first step - it removes the actual resources so Portainer's next snapshot reflects a clean state. Removing stale endpoints and inactive stack records via the Portainer API eliminates stale snapshot data. Weekly automated cleanup jobs prevent gradual accumulation. Schedule database compaction monthly or whenever the database growth trend becomes significant for your environment to keep Portainer responsive.
