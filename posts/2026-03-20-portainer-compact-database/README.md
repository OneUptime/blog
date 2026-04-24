# How to Compact the Portainer Database

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Portainer, Database, Maintenance, BoltDB, Performance

Description: A guide to compacting the Portainer BoltDB database to reclaim disk space and improve performance.

## Overview

Portainer uses BoltDB as its embedded database to store configuration and metadata. Over time, as records are added and deleted, the database file can grow with unused space (fragmentation). Compacting the database reclaims this space. Current Portainer releases include a built-in database compaction feature accessible via the command line.

## Prerequisites

- Portainer CE or Business Edition with `--compact-db` support (for example, 2.35.0+ STS or 2.33.7+ LTS)
- Docker CLI access
- Admin access to the Docker host

## Why Compact the Database?

BoltDB uses a B-tree structure that does not automatically reclaim pages after deletions. Common causes of database bloat:

- Deleting many containers or stacks
- Portainer upgrades that migrate data
- Long-running Portainer instances

```bash
# Check current database size

docker run --rm \
  -v portainer_data:/data \
  alpine \
  du -sh /data/portainer.db
```

## Step 1: Back Up Before Compacting

```bash
# Always back up before maintenance
docker stop portainer
docker rm portainer

docker run --rm \
  -v portainer_data:/data \
  -v $(pwd):/backup \
  alpine \
  cp /data/portainer.db /backup/portainer.db.bak-$(date +%Y%m%d)

ls -lh portainer.db.bak-*
```

## Step 2: Run Database Compaction

```bash
# Start Portainer with the same image tag and options you normally use,
# adding the --compact-db startup flag.
docker run -d \
  -p 8000:8000 \
  -p 9443:9443 \
  --name portainer \
  --restart=always \
  -v /var/run/docker.sock:/var/run/docker.sock \
  -v portainer_data:/data \
  portainer/portainer-ce:<your-current-tag> \
  --compact-db

# For Business Edition
docker run -d \
  -p 8000:8000 \
  -p 9443:9443 \
  --name portainer \
  --restart=always \
  -v /var/run/docker.sock:/var/run/docker.sock \
  -v portainer_data:/data \
  portainer/portainer-ee:<your-current-tag> \
  --compact-db
```

If your Portainer database is encrypted, include the same secret mount you already use when starting Portainer.

## Step 3: Verify Compaction Results

```bash
# Compare database sizes
docker run --rm \
  -v portainer_data:/data \
  alpine \
  sh -c "du -sh /data/portainer.db && ls -lh /data/"
```

## Step 4: Verify Portainer Is Running

```bash
# Verify Portainer is running correctly
docker ps --filter name=portainer
docker logs portainer --tail 20
```

## Alternative: Manual Compaction with bbolt

For older Portainer versions without `--compact-db`:

```bash
# Install bbolt CLI tool
go install go.etcd.io/bbolt/cmd/bbolt@latest

# Compact the database manually (requires Portainer stopped)
docker stop portainer

docker run --rm \
  -v portainer_data:/data \
  -v $(which bbolt || echo "/usr/local/go/bin/bbolt"):/usr/local/bin/bbolt \
  alpine \
  bbolt compact -o /data/portainer-compact.db /data/portainer.db

# Replace original with compacted
docker run --rm \
  -v portainer_data:/data \
  alpine \
  sh -c "mv /data/portainer.db /data/portainer.db.old && mv /data/portainer-compact.db /data/portainer.db"

docker start portainer
```

## Scheduling Regular Compaction

```bash
# Add to crontab for monthly compaction
# Include the same image tag, mounts, and extra flags you normally use for Portainer.
# crontab -e
0 3 1 * * docker stop portainer && docker rm portainer && \
  docker run -d -p 8000:8000 -p 9443:9443 --name portainer --restart=always \
  -v /var/run/docker.sock:/var/run/docker.sock -v portainer_data:/data \
  portainer/portainer-ce:<your-current-tag> --compact-db
```

## Monitoring Database Size

```bash
# Script to alert if database exceeds threshold
#!/bin/bash
DB_SIZE=$(docker run --rm -v portainer_data:/data alpine du -sm /data/portainer.db | cut -f1)
THRESHOLD=100  # MB

if [ "${DB_SIZE}" -gt "${THRESHOLD}" ]; then
  echo "WARNING: Portainer database is ${DB_SIZE}MB (threshold: ${THRESHOLD}MB)"
  # Send alert notification here
fi
```

## Conclusion

Regular database compaction keeps Portainer running efficiently and prevents unnecessary disk consumption. Current Portainer releases make this straightforward with the `--compact-db` flag. Run compaction during maintenance windows, always back up first, and consider scheduling monthly compaction for long-running Portainer instances.
