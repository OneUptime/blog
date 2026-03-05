# How to Back Up Docker Compose Stacks (Services + Volumes + Config)

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Docker, Docker Compose, Backup, Volumes, Disaster Recovery, DevOps

Description: Back up entire Docker Compose stacks including service definitions, named volumes, environment configs, and database states for reliable recovery.

---

Docker Compose makes it easy to define and run multi-container applications. But that ease of deployment means nothing if you cannot recover your stack after a failure. A proper Compose stack backup captures everything needed to rebuild the entire application: the Compose files, environment configuration, named volumes with their data, database dumps, and any custom configuration files mounted into containers.

This guide shows you how to back up every component of a Docker Compose stack and restore it on a fresh host.

## Anatomy of a Compose Stack

A typical Compose stack consists of several layers that all need backing up:

1. **docker-compose.yml** and override files - the service definitions
2. **.env files** - environment variables and secrets
3. **Named volumes** - persistent data for databases, uploads, caches
4. **Mounted directories** - configuration files, custom scripts
5. **Custom networks** - network configuration (usually recreated automatically)
6. **Images** - the container images used by services

## Identifying What to Back Up

Start by examining your running Compose stack to understand its components.

List all resources associated with a Compose project:

```bash
# See running services
docker compose ps

# See volumes created by this project
docker volume ls --filter label=com.docker.compose.project=$(basename $(pwd))

# See networks created by this project
docker network ls --filter label=com.docker.compose.project=$(basename $(pwd))

# See the resolved configuration
docker compose config
```

## The Backup Script

Here is a comprehensive script that backs up an entire Compose stack.

Complete backup script for a Docker Compose stack:

```bash
#!/bin/bash
# compose-backup.sh
# Backs up an entire Docker Compose stack including all volumes and configuration

set -euo pipefail

# Configuration
PROJECT_DIR="${1:-.}"
BACKUP_ROOT="${2:-/backups/compose}"
TIMESTAMP=$(date +%Y%m%d_%H%M%S)

# Resolve project name and directory
cd "$PROJECT_DIR"
PROJECT_NAME=$(basename "$(pwd)")
BACKUP_DIR="${BACKUP_ROOT}/${PROJECT_NAME}_${TIMESTAMP}"

mkdir -p "$BACKUP_DIR"

echo "=== Backing up Compose stack: $PROJECT_NAME ==="
echo "=== Source: $(pwd) ==="
echo "=== Destination: $BACKUP_DIR ==="

# Phase 1: Back up project files
echo ""
echo "--- Phase 1: Project files ---"
mkdir -p "${BACKUP_DIR}/project"

# Copy all compose files and config
for FILE in docker-compose*.yml docker-compose*.yaml .env .env.* Dockerfile* *.conf *.cfg; do
  if ls $FILE 1>/dev/null 2>&1; then
    cp $FILE "${BACKUP_DIR}/project/"
    echo "  Copied: $FILE"
  fi
done

# Copy any mounted config directories
if [ -d "./config" ]; then
  cp -r ./config "${BACKUP_DIR}/project/config"
  echo "  Copied: config/"
fi

if [ -d "./nginx" ]; then
  cp -r ./nginx "${BACKUP_DIR}/project/nginx"
  echo "  Copied: nginx/"
fi

# Phase 2: Database dumps
echo ""
echo "--- Phase 2: Database dumps ---"
mkdir -p "${BACKUP_DIR}/databases"

# Detect and back up PostgreSQL
PG_CONTAINERS=$(docker compose ps --format json | jq -r 'select(.Image | contains("postgres")) | .Name' 2>/dev/null || true)
for CONTAINER in $PG_CONTAINERS; do
  echo "  Dumping PostgreSQL from $CONTAINER"
  docker exec -t "$CONTAINER" pg_dumpall -U postgres 2>/dev/null | \
    gzip > "${BACKUP_DIR}/databases/${CONTAINER}_pgdump.sql.gz"
done

# Detect and back up MySQL/MariaDB
MYSQL_CONTAINERS=$(docker compose ps --format json | jq -r 'select(.Image | contains("mysql") or contains("mariadb")) | .Name' 2>/dev/null || true)
for CONTAINER in $MYSQL_CONTAINERS; do
  echo "  Dumping MySQL from $CONTAINER"
  docker exec -t "$CONTAINER" mysqldump -u root --all-databases --single-transaction 2>/dev/null | \
    gzip > "${BACKUP_DIR}/databases/${CONTAINER}_mysqldump.sql.gz"
done

# Detect and back up MongoDB
MONGO_CONTAINERS=$(docker compose ps --format json | jq -r 'select(.Image | contains("mongo")) | .Name' 2>/dev/null || true)
for CONTAINER in $MONGO_CONTAINERS; do
  echo "  Dumping MongoDB from $CONTAINER"
  docker exec -t "$CONTAINER" mongodump --archive --gzip 2>/dev/null > \
    "${BACKUP_DIR}/databases/${CONTAINER}_mongodump.archive.gz"
done

# Detect and back up Redis
REDIS_CONTAINERS=$(docker compose ps --format json | jq -r 'select(.Image | contains("redis")) | .Name' 2>/dev/null || true)
for CONTAINER in $REDIS_CONTAINERS; do
  echo "  Backing up Redis from $CONTAINER"
  docker exec -t "$CONTAINER" redis-cli BGSAVE 2>/dev/null
  sleep 3
  docker cp "${CONTAINER}:/data/dump.rdb" "${BACKUP_DIR}/databases/${CONTAINER}_redis.rdb" 2>/dev/null || true
done

# Phase 3: Volume backups
echo ""
echo "--- Phase 3: Volume backups ---"
mkdir -p "${BACKUP_DIR}/volumes"

VOLUMES=$(docker compose config --volumes 2>/dev/null || true)
COMPOSE_PROJECT=$(docker compose config --format json 2>/dev/null | jq -r '.name' || echo "$PROJECT_NAME")

for VOLUME_NAME in $VOLUMES; do
  FULL_VOLUME="${COMPOSE_PROJECT}_${VOLUME_NAME}"

  # Check if the volume exists
  if docker volume inspect "$FULL_VOLUME" > /dev/null 2>&1; then
    echo "  Backing up volume: $FULL_VOLUME"
    docker run --rm \
      -v "${FULL_VOLUME}":/source:ro \
      -v "${BACKUP_DIR}/volumes":/backup \
      alpine:latest \
      tar czf "/backup/${VOLUME_NAME}.tar.gz" -C /source .
  else
    echo "  Volume not found: $FULL_VOLUME (skipping)"
  fi
done

# Phase 4: Service state snapshot
echo ""
echo "--- Phase 4: Service state ---"
mkdir -p "${BACKUP_DIR}/state"

docker compose ps --format json > "${BACKUP_DIR}/state/services.json" 2>/dev/null || true

# Save image list for recovery
docker compose config --images > "${BACKUP_DIR}/state/images.txt" 2>/dev/null || true

# Save container inspection data
for CONTAINER in $(docker compose ps -q 2>/dev/null); do
  NAME=$(docker inspect --format '{{.Name}}' "$CONTAINER" | tr -d '/')
  docker inspect "$CONTAINER" > "${BACKUP_DIR}/state/${NAME}_inspect.json"
done

# Phase 5: Create final archive
echo ""
echo "--- Phase 5: Creating archive ---"
ARCHIVE_FILE="${BACKUP_ROOT}/${PROJECT_NAME}_${TIMESTAMP}.tar.gz"
tar czf "$ARCHIVE_FILE" -C "$BACKUP_ROOT" "${PROJECT_NAME}_${TIMESTAMP}"

# Clean up the uncompressed backup directory
rm -rf "$BACKUP_DIR"

ARCHIVE_SIZE=$(du -h "$ARCHIVE_FILE" | cut -f1)
echo ""
echo "=== Backup complete ==="
echo "Archive: $ARCHIVE_FILE ($ARCHIVE_SIZE)"
```

## Restoring a Compose Stack

The restoration script reverses the backup process, recreating the entire stack on a fresh host.

Complete restoration script for a Compose stack backup:

```bash
#!/bin/bash
# compose-restore.sh
# Restores an entire Docker Compose stack from a backup archive

set -euo pipefail

ARCHIVE="$1"
RESTORE_DIR="${2:-/opt/docker/restored}"

if [ -z "$ARCHIVE" ]; then
  echo "Usage: ./compose-restore.sh <backup_archive.tar.gz> [restore_dir]"
  exit 1
fi

echo "=== Restoring Compose stack from $ARCHIVE ==="

# Extract the archive
TEMP_DIR=$(mktemp -d)
tar xzf "$ARCHIVE" -C "$TEMP_DIR"
BACKUP_DIR=$(ls "$TEMP_DIR")
BACKUP_PATH="${TEMP_DIR}/${BACKUP_DIR}"

# Phase 1: Restore project files
echo ""
echo "--- Phase 1: Restoring project files ---"
mkdir -p "$RESTORE_DIR"
cp -r "${BACKUP_PATH}/project/"* "$RESTORE_DIR/"
echo "  Project files restored to $RESTORE_DIR"

cd "$RESTORE_DIR"

# Phase 2: Pull images
echo ""
echo "--- Phase 2: Pulling images ---"
if [ -f "${BACKUP_PATH}/state/images.txt" ]; then
  while IFS= read -r IMAGE; do
    echo "  Pulling: $IMAGE"
    docker pull "$IMAGE" || echo "  Warning: Could not pull $IMAGE"
  done < "${BACKUP_PATH}/state/images.txt"
fi

# Phase 3: Create volumes and restore data
echo ""
echo "--- Phase 3: Restoring volumes ---"
if [ -d "${BACKUP_PATH}/volumes" ]; then
  # Start the stack briefly to create volumes
  docker compose up --no-start 2>/dev/null || true

  COMPOSE_PROJECT=$(docker compose config --format json 2>/dev/null | jq -r '.name' || basename "$(pwd)")

  for VOLUME_BACKUP in "${BACKUP_PATH}/volumes/"*.tar.gz; do
    VOLUME_NAME=$(basename "$VOLUME_BACKUP" .tar.gz)
    FULL_VOLUME="${COMPOSE_PROJECT}_${VOLUME_NAME}"

    echo "  Restoring volume: $FULL_VOLUME"
    docker run --rm \
      -v "${FULL_VOLUME}":/target \
      -v "$(dirname "$VOLUME_BACKUP")":/backup:ro \
      alpine:latest \
      sh -c "rm -rf /target/* && tar xzf /backup/$(basename "$VOLUME_BACKUP") -C /target"
  done
fi

# Phase 4: Start services
echo ""
echo "--- Phase 4: Starting services ---"
docker compose up -d

# Phase 5: Restore databases
echo ""
echo "--- Phase 5: Restoring databases ---"
sleep 10  # Wait for databases to start

# Restore PostgreSQL
for DUMP in "${BACKUP_PATH}/databases/"*_pgdump.sql.gz; do
  if [ -f "$DUMP" ]; then
    CONTAINER=$(basename "$DUMP" _pgdump.sql.gz)
    echo "  Restoring PostgreSQL to $CONTAINER"
    gunzip -c "$DUMP" | docker exec -i "$CONTAINER" psql -U postgres 2>/dev/null || true
  fi
done

# Restore Redis
for RDB in "${BACKUP_PATH}/databases/"*_redis.rdb; do
  if [ -f "$RDB" ]; then
    CONTAINER=$(basename "$RDB" _redis.rdb)
    echo "  Restoring Redis to $CONTAINER"
    docker stop "$CONTAINER" 2>/dev/null || true
    docker cp "$RDB" "${CONTAINER}:/data/dump.rdb" 2>/dev/null || true
    docker start "$CONTAINER" 2>/dev/null || true
  fi
done

# Cleanup
rm -rf "$TEMP_DIR"

echo ""
echo "=== Restoration complete ==="
echo "Stack restored to: $RESTORE_DIR"
docker compose ps
```

## Scheduling Automated Backups

Use a dedicated backup container that runs on a schedule:

```yaml
# docker-compose.backup.yml
version: "3.8"

services:
  backup:
    image: alpine:latest
    volumes:
      - /var/run/docker.sock:/var/run/docker.sock:ro
      - ./compose-backup.sh:/scripts/backup.sh:ro
      - /backups:/backups
      - /opt/docker/myproject:/project:ro
    entrypoint: /bin/sh
    command: >
      -c "apk add --no-cache docker-cli bash jq &&
          while true; do
            /scripts/backup.sh /project /backups
            sleep 86400
          done"
```

Or use cron on the host:

```bash
# Crontab entry for daily backup at 3 AM
0 3 * * * /opt/scripts/compose-backup.sh /opt/docker/myproject /backups >> /var/log/compose-backup.log 2>&1
```

## Backup Verification

Verify your backups are valid by running a test restore periodically:

```bash
#!/bin/bash
# verify-backup.sh
# Tests that the latest backup can be restored successfully

LATEST_BACKUP=$(ls -t /backups/*.tar.gz | head -1)
VERIFY_DIR="/tmp/backup-verify"

echo "Verifying backup: $LATEST_BACKUP"

# Extract and check structure
mkdir -p "$VERIFY_DIR"
tar tzf "$LATEST_BACKUP" > "${VERIFY_DIR}/contents.txt"

# Check for required components
REQUIRED=("project/docker-compose" "volumes/" "databases/")
for ITEM in "${REQUIRED[@]}"; do
  if grep -q "$ITEM" "${VERIFY_DIR}/contents.txt"; then
    echo "  PASS: Found $ITEM"
  else
    echo "  FAIL: Missing $ITEM"
  fi
done

# Check archive integrity
if gzip -t "$LATEST_BACKUP" 2>/dev/null; then
  echo "  PASS: Archive integrity OK"
else
  echo "  FAIL: Archive is corrupted"
fi

rm -rf "$VERIFY_DIR"
echo "Verification complete"
```

## Backup Rotation

Keep backups organized with a rotation policy:

```bash
#!/bin/bash
# rotate-backups.sh
# Implements a backup rotation: 7 daily, 4 weekly, 3 monthly

BACKUP_DIR="/backups"

# Keep last 7 daily backups
find "$BACKUP_DIR" -name "*.tar.gz" -mtime +7 -not -name "*weekly*" -not -name "*monthly*" -delete

# Create weekly backup on Sundays
if [ "$(date +%u)" -eq 7 ]; then
  LATEST=$(ls -t "$BACKUP_DIR"/*.tar.gz 2>/dev/null | head -1)
  if [ -n "$LATEST" ]; then
    cp "$LATEST" "${LATEST%.tar.gz}_weekly.tar.gz"
  fi
fi

# Keep last 4 weekly backups
find "$BACKUP_DIR" -name "*weekly*" -mtime +28 -delete

# Create monthly backup on the 1st
if [ "$(date +%d)" -eq 01 ]; then
  LATEST=$(ls -t "$BACKUP_DIR"/*.tar.gz 2>/dev/null | head -1)
  if [ -n "$LATEST" ]; then
    cp "$LATEST" "${LATEST%.tar.gz}_monthly.tar.gz"
  fi
fi

# Keep last 3 monthly backups
find "$BACKUP_DIR" -name "*monthly*" -mtime +90 -delete
```

## Conclusion

Backing up Docker Compose stacks requires a layered approach. Project files capture your infrastructure definition. Database dumps provide logically consistent data snapshots. Volume backups capture everything else. The combination of all three gives you everything needed to restore a complete application stack on a fresh host. Automate your backups, test your restorations monthly, and keep off-site copies. The time you invest in backup automation pays for itself the first time you need to recover from a failure.
