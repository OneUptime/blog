# How to Clean Up Stale Data in the Portainer Database - Stale

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Portainer, Database Cleanup, BoltDB, Performance, Maintenance, Administration

Description: Learn how to clean up stale data in Portainer's BoltDB database by removing old snapshots, compacting the database, and pruning unused resources.

---

Over time, Portainer's BoltDB database can grow as it stores snapshot metadata, stack definitions, environment metadata, and other state. Regular cleanup and database compaction help reclaim disk space.

## Understanding What Grows in the Database

The main sources of database growth:

| Data Type | Growth Driver | Cleanup Method |
|-----------|---------------|----------------|
| Snapshot metadata | Environment snapshot updates | `--compact-db` |
| Stack definitions and related metadata | Stack deployments, schedules, and webhooks | Remove unused stacks |
| Environment metadata | Managed environments and groups | Remove unused environments |

Portainer Business Edition activity logs are stored separately in `useractivity.db`, not in `portainer.db`.

## Step 1: Check Database Size

```bash
# Size of the Portainer database file
# Unencrypted installs
docker exec portainer du -sh /data/portainer.db

# Encrypted installs
docker exec portainer du -sh /data/portainer.edb

# Or from outside the container
docker run --rm -v portainer_data:/data alpine sh -c 'for f in /data/portainer.db /data/portainer.edb; do [ -f "$f" ] && du -sh "$f"; done'
```

Use the result as a baseline before and after compaction.

## Step 2: Compact the Database

BoltDB does not return freed pages to the OS automatically. Portainer provides `--compact-db` to compact the database on startup:

```bash
# Capture the image currently in use so you compact with the same Portainer version
IMAGE=$(docker inspect -f '{{.Config.Image}}' portainer)

# Stop and remove the existing container
docker stop portainer
docker rm portainer

# Recreate Portainer with your usual options plus --compact-db
docker run -d \
  --name portainer \
  --restart=always \
  -p 9443:9443 \
  -p 8000:8000 \
  -v /var/run/docker.sock:/var/run/docker.sock \
  -v portainer_data:/data \
  "$IMAGE" \
  --compact-db

# Verify size reduction
docker run --rm -v portainer_data:/data alpine sh -c 'for f in /data/portainer.db /data/portainer.edb; do [ -f "$f" ] && du -sh "$f"; done'
```

If your deployment uses additional mounts, environment variables, or a database encryption secret, include the same options when recreating the container.

## Step 3: Prune Unused Docker Resources

Stale Docker resources (stopped containers, dangling images, unused volumes) increase snapshot size. Clean them up on each managed host:

```bash
# Remove stopped containers, unused networks, dangling images, build cache
docker system prune -f

# Also remove unused volumes (careful - ensure no data is needed)
docker volume prune -f

# Remove unused images (not just dangling)
docker image prune -a --filter "until=720h" -f   # Images unused for 30 days
```

## Step 4: Remove Unused Stacks from Portainer

Unused stacks still occupy metadata in Portainer:

```bash
# List all stacks via API
TOKEN=$(curl -s -X POST https://portainer.example.com/api/auth \
  -d '{"Username":"admin","Password":"pass"}' -H 'Content-Type: application/json' | jq -r .jwt)

curl -s -H "Authorization: Bearer $TOKEN" \
  https://portainer.example.com/api/stacks | jq '.[] | {Id, Name, EndpointId, Status}'

# Delete a specific stack (use the EndpointId from the output above)
curl -s -X DELETE -H "Authorization: Bearer $TOKEN" \
  "https://portainer.example.com/api/stacks/7?endpointId=1"
```

## Step 5: Handle Activity Logs Separately

In Portainer Business Edition, activity logs are stored in `useractivity.db`, not in `portainer.db`, so adjusting log handling does not shrink the main Portainer database.

If you need external retention or auditing, Portainer can stream authentication and activity logs to a Syslog-compatible provider.

## Step 6: Remove Disconnected Environments

Each disconnected environment still occupies snapshot storage. Remove environments you no longer use:

1. Go to **Environments**.
2. Select the unused/offline environment and click **Remove**.
3. Or open the environment and update **Environment URL / Address** if the host IP changed.

## Automation: Weekly Cleanup Script

Schedule regular maintenance:

```bash
#!/bin/bash
# weekly-portainer-cleanup.sh

log() { echo "[$(date '+%Y-%m-%d %H:%M:%S')] $*"; }

# Prune Docker resources on the local host
log "Pruning Docker resources..."
docker system prune -f
docker volume prune -f

# Record current Portainer database size
log "Current Portainer database size:"
docker run --rm -v portainer_data:/data alpine sh -c 'for f in /data/portainer.db /data/portainer.edb; do [ -f "$f" ] && du -sh "$f"; done'

log "Portainer database compaction is a startup-time operation."
log "Restart Portainer with your normal configuration plus --compact-db during a maintenance window."
```

Add to root's crontab: `0 3 * * 0 /usr/local/bin/weekly-portainer-cleanup.sh`
