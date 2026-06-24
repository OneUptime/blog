# How to Compact the Portainer Database for Better Performance

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Portainer, Performance, Database, Maintenance, BoltDB

Description: Learn how to compact and optimize the Portainer BoltDB database to reclaim disk space and improve performance on busy instances.

---

Portainer uses BoltDB as its embedded database. Over time, especially on active instances with many containers and stacks, the database can grow and accumulate unused space. Compacting it reclaims disk space and can reduce database file bloat.

## Understanding Portainer's Database

By default, the Portainer database is stored at `/data/portainer.db` inside the data volume. BoltDB uses copy-on-write pages: deleted records leave free pages in the file that can be reused internally, but the space is not returned to the filesystem automatically. The compaction process rewrites the database, removing this unused space.

## Check Current Database Size

```bash
# Check the size of the portainer.db file

docker run --rm \
  -v portainer_data:/data \
  alpine \
  ls -lh /data/portainer.db
```

## Method 1: Use Portainer's Built-in `--compact-db` Flag

Portainer exposes a startup flag that compacts the database when the server starts:

```bash
# Stop and remove the existing Portainer container
docker stop portainer
docker rm portainer

# Recreate Portainer with the same options you currently use, adding --compact-db
# Replace portainer/portainer-ce:lts with portainer/portainer-ee:lts if you use BE
docker run -d \
  -p 8000:8000 \
  -p 9443:9443 \
  --name portainer \
  --restart=always \
  -v /var/run/docker.sock:/var/run/docker.sock \
  -v portainer_data:/data \
  portainer/portainer-ce:lts \
  --compact-db

echo "Portainer will compact the database on startup"
```

## Method 2: Manual BoltDB Compaction (CE and BE)

For Community Edition or when you want to compact the file directly, use the `bbolt` tool:

```bash
# Step 1: Stop Portainer to ensure the database is not open
docker stop portainer

# Step 2: Record size before compaction
echo "Before compaction:"
docker run --rm -v portainer_data:/data alpine ls -lh /data/portainer.db

# Step 3: Back up and compact the database using the bbolt CLI
docker run --rm \
  -v portainer_data:/data \
  golang:alpine \
  sh -c 'cp /data/portainer.db /data/portainer.db.bak && go run go.etcd.io/bbolt/cmd/bbolt@latest compact -o /data/portainer_compacted.db /data/portainer.db && mv /data/portainer_compacted.db /data/portainer.db'

# Step 4: Check size after compaction
echo "After compaction:"
docker run --rm -v portainer_data:/data alpine ls -lh /data/portainer.db

# Step 5: Start Portainer
docker start portainer
```

## Method 3: Use Portainer's Backup and Restore Flow (Nuclear Option)

For a fully supported rebuild path, take a Portainer backup and restore it into a fresh instance with an empty data volume:

```bash
# Authenticate
TOKEN=$(curl -s -X POST \
  https://localhost:9443/api/auth \
  -H "Content-Type: application/json" \
  -d '{"username":"admin","password":"yourpassword"}' \
  --insecure | python3 -c "import sys,json; print(json.load(sys.stdin)['jwt'])")

# Download a full Portainer backup archive
curl -sS -X POST \
  https://localhost:9443/api/backup \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{}' \
  --insecure \
  -o portainer-backup.tar.gz

echo "Backup saved to portainer-backup.tar.gz"
```

Restore this archive only into a fresh Portainer instance during initial setup.

## Compaction Schedule Recommendation

For production Portainer instances, schedule compaction during a maintenance window. If Portainer is started with `--compact-db`, a restart is enough to compact the database on startup.

```bash
#!/bin/sh
# Requires the Portainer container to be configured with --compact-db
# Add to monthly cron: 0 3 1 * * /usr/local/bin/portainer-compact.sh
docker restart portainer
```

---

*Monitor Portainer's performance and disk usage with [OneUptime](https://oneuptime.com) infrastructure monitoring.*
