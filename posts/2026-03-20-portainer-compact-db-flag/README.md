# How to Use the --compact-db Flag to Compress Portainer Database

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Portainer, Docker, CLI, Database, Performance, Maintenance

Description: Use the --compact-db flag to compact Portainer's BoltDB database, reclaiming disk space and improving performance after heavy usage or large event accumulation.

## Introduction

Portainer uses BoltDB, an embedded key-value database. Like many databases, BoltDB doesn't automatically reclaim freed space when data is deleted. Over time, as stacks are removed, containers are deleted, and notifications accumulate and are cleared, the database file grows with unused (free) pages. The `--compact-db` flag rebuilds the database to reclaim this space.

## When to Use --compact-db

Use database compaction when:
- Portainer's database is unexpectedly large (check the active database file in `/data`)
- Portainer UI feels sluggish and the database is on HDD
- After removing a large number of environments, stacks, or users
- As part of regular maintenance (monthly)
- After clearing many notifications or activity logs

## Step 1: Check Current Database Size

```bash
# Detect whether Portainer is using portainer.db or portainer.edb
DB_FILE=$(docker run --rm \
  -v portainer_data:/data \
  alpine sh -c 'for f in /data/portainer.edb /data/portainer.db; do [ -f "$f" ] && { echo "$f"; break; }; done')

# Check the current size of the active database file
docker run --rm \
  -v portainer_data:/data \
  alpine ls -lh "$DB_FILE"

# Example output:
# -rw------- 1 root root 245M /data/portainer.db
# A 245MB database is a candidate for compaction

# Check total volume size
docker volume inspect portainer_data --format '{{.Mountpoint}}' | xargs du -sh
```

## Step 2: Stop Portainer

The `--compact-db` flag runs during Portainer startup, so stop the existing container first and keep the same image tag to avoid an accidental upgrade during maintenance:

```bash
# Capture the exact image tag currently in use
PORTAINER_IMAGE=$(docker inspect -f '{{.Config.Image}}' portainer)

# Stop and remove the container (preserving the data volume)
docker stop portainer
docker rm portainer

# Verify Portainer is stopped
docker ps | grep portainer  # Should return nothing
```

## Step 3: Run --compact-db

```bash
# Start Portainer again with --compact-db
# Reuse the PORTAINER_IMAGE value captured in Step 2.
# Use the same startup options you normally use for this container.
# If you intentionally use legacy HTTP, add -p 9000:9000.
# If database encryption is enabled, also mount the same secret file you already use for Portainer.
docker run -d \
  -p 8000:8000 \
  -p 9443:9443 \
  --name portainer \
  --restart=unless-stopped \
  -v /var/run/docker.sock:/var/run/docker.sock \
  -v portainer_data:/data \
  $PORTAINER_IMAGE \
  --compact-db

# This will:
# 1. Open the existing Portainer database
# 2. Create a new database with only live data (no free pages)
# 3. Replace the old database with the compacted version
# 4. Continue starting Portainer normally

# Note: Depending on database size, this can take 30 seconds to several minutes
```

## Step 4: Verify Space Reclaimed

```bash
# Verify compaction completed
docker logs portainer --tail 20

# Check the new database size
DB_FILE=$(docker run --rm \
  -v portainer_data:/data \
  alpine sh -c 'for f in /data/portainer.edb /data/portainer.db; do [ -f "$f" ] && { echo "$f"; break; }; done')

docker run --rm \
  -v portainer_data:/data \
  alpine ls -lh "$DB_FILE"

# Compare with the size from Step 1
# You should see a significant reduction
```

## Step 5: Verify Portainer Started Successfully

```bash
# Test login over Portainer's default HTTPS endpoint
curl -k -X POST https://localhost:9443/api/auth \
  -H "Content-Type: application/json" \
  -d '{"Username":"admin","Password":"yourpassword"}'
```

## Step 6: Automate Monthly Compaction

```bash
#!/bin/bash
# compact-portainer-db.sh
# Schedule: 0 3 1 * * /opt/scripts/compact-portainer-db.sh

LOG_FILE="/var/log/portainer-compact.log"
DATE=$(date '+%Y-%m-%d %H:%M:%S')
PORTAINER_IMAGE=$(docker inspect -f '{{.Config.Image}}' portainer)
DB_FILE=$(docker run --rm \
  -v portainer_data:/data \
  alpine sh -c 'for f in /data/portainer.edb /data/portainer.db; do [ -f "$f" ] && { echo "$f"; break; }; done')
# If database encryption is enabled, set SECRET_MOUNT to the same secret mount your Portainer container uses.
SECRET_MOUNT=""

echo "[$DATE] Starting Portainer database compaction" >> $LOG_FILE

# Get DB size before
SIZE_BEFORE=$(docker run --rm \
  -v portainer_data:/data \
  alpine stat -c %s "$DB_FILE")

echo "[$DATE] Database size before: $SIZE_BEFORE bytes" >> $LOG_FILE

# Stop Portainer
echo "[$DATE] Stopping Portainer..." >> $LOG_FILE
docker stop portainer
docker rm portainer

# Backup before compaction
docker run --rm \
  -v portainer_data:/data \
  -v /opt/backups:/backup \
  alpine cp "$DB_FILE" "/backup/portainer-precompact-$(date +%Y%m%d).bak"

# Start Portainer with compact-db enabled
echo "[$DATE] Starting Portainer with --compact-db..." >> $LOG_FILE
docker run -d \
  -p 8000:8000 \
  -p 9443:9443 \
  --name portainer \
  --restart=unless-stopped \
  -v /var/run/docker.sock:/var/run/docker.sock \
  -v portainer_data:/data \
  $SECRET_MOUNT \
  $PORTAINER_IMAGE \
  --compact-db

# Wait for compaction to complete
for _ in $(seq 1 150); do
  if docker logs portainer 2>&1 | grep -q "database compaction completed"; then
    break
  fi
  sleep 2
done

# Get DB size after
SIZE_AFTER=$(docker run --rm \
  -v portainer_data:/data \
  alpine stat -c %s "$DB_FILE")

echo "[$DATE] Database size after: $SIZE_AFTER bytes" >> $LOG_FILE
SAVINGS=$((SIZE_BEFORE - SIZE_AFTER))
echo "[$DATE] Space reclaimed: $SAVINGS bytes" >> $LOG_FILE

docker logs portainer --tail 20 >> $LOG_FILE 2>&1

# Verify Portainer is running
if docker ps | grep -q portainer; then
  echo "[$DATE] Portainer started successfully" >> $LOG_FILE
else
  echo "[$DATE] ERROR: Portainer failed to start!" >> $LOG_FILE
fi
```

## Step 7: Use with Docker Compose

```yaml
# maintenance-compact.yml - temporary override used with your main compose file
services:
  portainer:
    command: --compact-db
```

Run with:

```bash
# Stop Portainer first
docker compose -f docker-compose.yml stop portainer
docker compose -f docker-compose.yml rm -f portainer

# Start Portainer once with the compact-db flag added
docker compose -f docker-compose.yml -f maintenance-compact.yml up -d portainer

# Recreate the service without the temporary override for future restarts
docker compose -f docker-compose.yml up -d --force-recreate portainer
```

## Important Caveats

```bash
# 1. ALWAYS backup before compaction
docker run --rm \
  -v portainer_data:/data \
  -v /tmp:/backup \
  alpine sh -c 'cp /data/portainer.db /backup/portainer.db.backup 2>/dev/null || cp /data/portainer.edb /backup/portainer.edb.backup'

# 2. Compaction is NOT the same as clearing data
# It only reclaims free space - it doesn't delete any active data

# 3. Start Portainer with the SAME image tag you were already running
# Using :latest for compaction can unintentionally upgrade Portainer and migrate the database schema

# 4. If database encryption is enabled, the active file is /data/portainer.edb
# You must mount the same secret file when starting Portainer with --compact-db

# 5. The --compact-db flag runs on startup
# It compacts the database, then Portainer continues starting normally

# 6. Stop the existing Portainer container first so only one Portainer instance is using the data volume
```

## Conclusion

The `--compact-db` flag is a simple maintenance operation that reclaims wasted space in Portainer's BoltDB database without affecting any active data. Run it monthly or whenever the database file grows unexpectedly large. Always stop Portainer, create a backup, start it once with `--compact-db`, then verify the results - the whole process usually takes a few minutes and can recover significant disk space in active Portainer installations.
