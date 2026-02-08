# How to Create a Full Docker Backup Strategy

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Docker, Backup, Disaster Recovery, Data Persistence, Volumes, DevOps

Description: Build a comprehensive Docker backup strategy covering volumes, images, container configs, Compose files, and automated restoration testing.

---

Running production workloads on Docker without a backup strategy is like driving without insurance. Everything works fine until it does not. Docker makes it easy to deploy applications, but the data inside your volumes, the configuration of your services, and the state of your databases all need systematic backups.

This guide builds a complete backup strategy covering every layer of a Docker deployment: volumes, images, container configurations, Compose files, and database-specific backups.

## What Needs Backing Up

A Docker environment has several components that require backup.

**Named volumes** hold your persistent data - database files, uploaded content, configuration state. This is the most critical data to back up.

**Docker images** can be rebuilt from Dockerfiles but backing them up saves time during recovery.

**Docker Compose files and environment configs** define your infrastructure. Lose these and you lose the knowledge of how everything fits together.

**Database-specific exports** are more reliable than raw volume backups for databases because they produce logically consistent snapshots.

## Backing Up Named Volumes

The standard approach uses a temporary Alpine container to create tar archives of volume contents.

Back up a single named volume to a compressed tar archive:

```bash
#!/bin/bash
# backup-volume.sh
# Backs up a single Docker volume to a compressed tar file

VOLUME="$1"
BACKUP_DIR="${2:-/backups}"
TIMESTAMP=$(date +%Y%m%d_%H%M%S)

if [ -z "$VOLUME" ]; then
  echo "Usage: ./backup-volume.sh <volume_name> [backup_dir]"
  exit 1
fi

mkdir -p "$BACKUP_DIR"
BACKUP_FILE="${BACKUP_DIR}/${VOLUME}_${TIMESTAMP}.tar.gz"

docker run --rm \
  -v "${VOLUME}":/source:ro \
  -v "${BACKUP_DIR}":/backup \
  alpine:latest \
  tar czf "/backup/${VOLUME}_${TIMESTAMP}.tar.gz" -C /source .

SIZE=$(du -h "$BACKUP_FILE" | cut -f1)
echo "Backed up $VOLUME to $BACKUP_FILE ($SIZE)"
```

Back up all named volumes at once:

```bash
#!/bin/bash
# backup-all-volumes.sh
# Backs up every named Docker volume

BACKUP_DIR="/backups/volumes/$(date +%Y%m%d)"
mkdir -p "$BACKUP_DIR"

echo "Starting volume backup to $BACKUP_DIR"

for VOLUME in $(docker volume ls --format '{{.Name}}'); do
  # Skip anonymous volumes (long hex strings)
  if [[ ${#VOLUME} -gt 40 ]]; then
    echo "Skipping anonymous volume: $VOLUME"
    continue
  fi

  echo "Backing up: $VOLUME"

  docker run --rm \
    -v "${VOLUME}":/source:ro \
    -v "${BACKUP_DIR}":/backup \
    alpine:latest \
    tar czf "/backup/${VOLUME}.tar.gz" -C /source .
done

echo "All volumes backed up to $BACKUP_DIR"
ls -lh "$BACKUP_DIR"
```

## Database-Specific Backups

Raw volume backups of database files can be inconsistent if the database is actively writing. Use database-native dump tools instead.

Back up PostgreSQL using pg_dump for a consistent snapshot:

```bash
#!/bin/bash
# backup-postgres.sh
# Creates a logical backup of PostgreSQL using pg_dump

CONTAINER="$1"
DB_NAME="${2:-postgres}"
BACKUP_DIR="/backups/postgres"
TIMESTAMP=$(date +%Y%m%d_%H%M%S)

mkdir -p "$BACKUP_DIR"

echo "Backing up PostgreSQL database: $DB_NAME"

docker exec -t "$CONTAINER" \
  pg_dump -U postgres -Fc "$DB_NAME" | \
  gzip > "${BACKUP_DIR}/${DB_NAME}_${TIMESTAMP}.dump.gz"

echo "Backup saved to ${BACKUP_DIR}/${DB_NAME}_${TIMESTAMP}.dump.gz"
```

Back up MySQL/MariaDB:

```bash
#!/bin/bash
# backup-mysql.sh
# Creates a logical backup of MySQL using mysqldump

CONTAINER="$1"
DB_NAME="${2:-mydb}"
BACKUP_DIR="/backups/mysql"
TIMESTAMP=$(date +%Y%m%d_%H%M%S)

mkdir -p "$BACKUP_DIR"

docker exec -t "$CONTAINER" \
  mysqldump -u root -p"$MYSQL_ROOT_PASSWORD" \
  --single-transaction \
  --routines \
  --triggers \
  "$DB_NAME" | \
  gzip > "${BACKUP_DIR}/${DB_NAME}_${TIMESTAMP}.sql.gz"

echo "Backup saved to ${BACKUP_DIR}/${DB_NAME}_${TIMESTAMP}.sql.gz"
```

Back up MongoDB:

```bash
#!/bin/bash
# backup-mongo.sh
# Creates a backup of MongoDB using mongodump

CONTAINER="$1"
BACKUP_DIR="/backups/mongo"
TIMESTAMP=$(date +%Y%m%d_%H%M%S)

mkdir -p "$BACKUP_DIR"

docker exec -t "$CONTAINER" \
  mongodump --archive --gzip | \
  cat > "${BACKUP_DIR}/mongodump_${TIMESTAMP}.archive.gz"

echo "Backup saved to ${BACKUP_DIR}/mongodump_${TIMESTAMP}.archive.gz"
```

Back up Redis:

```bash
#!/bin/bash
# backup-redis.sh
# Triggers a Redis snapshot and copies it out

CONTAINER="$1"
BACKUP_DIR="/backups/redis"
TIMESTAMP=$(date +%Y%m%d_%H%M%S)

mkdir -p "$BACKUP_DIR"

# Trigger a background save
docker exec -t "$CONTAINER" redis-cli BGSAVE

# Wait for save to complete
sleep 5

# Copy the dump file out of the container
docker cp "${CONTAINER}:/data/dump.rdb" "${BACKUP_DIR}/dump_${TIMESTAMP}.rdb"

echo "Backup saved to ${BACKUP_DIR}/dump_${TIMESTAMP}.rdb"
```

## Backing Up Docker Images

Save important images as tar archives for disaster recovery:

```bash
#!/bin/bash
# backup-images.sh
# Saves Docker images used by running containers

BACKUP_DIR="/backups/images/$(date +%Y%m%d)"
mkdir -p "$BACKUP_DIR"

# Get unique images from running containers
IMAGES=$(docker ps --format '{{.Image}}' | sort -u)

for IMAGE in $IMAGES; do
  # Replace slashes and colons with underscores for filename safety
  SAFE_NAME=$(echo "$IMAGE" | tr '/:' '__')
  echo "Saving image: $IMAGE"
  docker save "$IMAGE" | gzip > "${BACKUP_DIR}/${SAFE_NAME}.tar.gz"
done

echo "All images saved to $BACKUP_DIR"
```

## Backing Up Configuration

Back up Compose files, environment variables, and custom configurations:

```bash
#!/bin/bash
# backup-config.sh
# Backs up Docker Compose files and configuration

BACKUP_DIR="/backups/config/$(date +%Y%m%d)"
mkdir -p "$BACKUP_DIR"

# Back up Compose project directories
for PROJECT_DIR in /opt/docker/*; do
  if [ -f "${PROJECT_DIR}/docker-compose.yml" ]; then
    PROJECT_NAME=$(basename "$PROJECT_DIR")
    echo "Backing up config for: $PROJECT_NAME"

    tar czf "${BACKUP_DIR}/${PROJECT_NAME}_config.tar.gz" \
      -C "$(dirname "$PROJECT_DIR")" \
      --exclude='*.log' \
      --exclude='node_modules' \
      "$PROJECT_NAME"
  fi
done

# Back up container inspection data
echo "Saving container configurations"
for CONTAINER in $(docker ps --format '{{.Names}}'); do
  docker inspect "$CONTAINER" > "${BACKUP_DIR}/${CONTAINER}_inspect.json"
done

echo "Configuration backed up to $BACKUP_DIR"
```

## The Complete Backup Script

Combine everything into a single comprehensive backup script:

```bash
#!/bin/bash
# full-backup.sh
# Complete Docker environment backup

set -e

BACKUP_ROOT="/backups"
DATE=$(date +%Y%m%d_%H%M%S)
BACKUP_DIR="${BACKUP_ROOT}/${DATE}"
LOG_FILE="${BACKUP_DIR}/backup.log"

mkdir -p "$BACKUP_DIR"

log() {
  echo "[$(date '+%H:%M:%S')] $1" | tee -a "$LOG_FILE"
}

log "Starting full Docker backup"

# 1. Database backups (logical dumps)
log "Phase 1: Database backups"
mkdir -p "${BACKUP_DIR}/databases"

if docker ps --format '{{.Names}}' | grep -q postgres; then
  log "  Backing up PostgreSQL"
  docker exec -t postgres pg_dumpall -U postgres | \
    gzip > "${BACKUP_DIR}/databases/postgres_all.sql.gz"
fi

if docker ps --format '{{.Names}}' | grep -q redis; then
  log "  Backing up Redis"
  docker exec -t redis redis-cli BGSAVE
  sleep 3
  docker cp redis:/data/dump.rdb "${BACKUP_DIR}/databases/redis.rdb"
fi

# 2. Volume backups
log "Phase 2: Volume backups"
mkdir -p "${BACKUP_DIR}/volumes"

for VOLUME in $(docker volume ls --format '{{.Name}}'); do
  if [[ ${#VOLUME} -gt 40 ]]; then
    continue
  fi
  log "  Backing up volume: $VOLUME"
  docker run --rm \
    -v "${VOLUME}":/source:ro \
    -v "${BACKUP_DIR}/volumes":/backup \
    alpine:latest \
    tar czf "/backup/${VOLUME}.tar.gz" -C /source .
done

# 3. Configuration backup
log "Phase 3: Configuration backup"
mkdir -p "${BACKUP_DIR}/config"

for CONTAINER in $(docker ps --format '{{.Names}}'); do
  docker inspect "$CONTAINER" > "${BACKUP_DIR}/config/${CONTAINER}.json"
done

# 4. Compose file backup
log "Phase 4: Compose files"
if [ -d "/opt/docker" ]; then
  tar czf "${BACKUP_DIR}/compose-projects.tar.gz" -C /opt docker/
fi

# 5. Calculate total backup size
TOTAL_SIZE=$(du -sh "$BACKUP_DIR" | cut -f1)
log "Backup complete: $BACKUP_DIR ($TOTAL_SIZE)"

# 6. Clean up old backups (keep 7 days)
find "$BACKUP_ROOT" -maxdepth 1 -type d -mtime +7 -exec rm -rf {} \;
log "Old backups cleaned up (keeping 7 days)"
```

## Restoration Procedures

A backup is useless if you cannot restore from it. Test these procedures regularly.

Restore a volume from backup:

```bash
#!/bin/bash
# restore-volume.sh
# Restores a Docker volume from a tar backup

BACKUP_FILE="$1"
VOLUME_NAME="$2"

if [ -z "$BACKUP_FILE" ] || [ -z "$VOLUME_NAME" ]; then
  echo "Usage: ./restore-volume.sh <backup_file.tar.gz> <volume_name>"
  exit 1
fi

# Create the volume if it does not exist
docker volume create "$VOLUME_NAME"

# Restore from backup
docker run --rm \
  -v "${VOLUME_NAME}":/target \
  -v "$(dirname "$BACKUP_FILE")":/backup:ro \
  alpine:latest \
  tar xzf "/backup/$(basename "$BACKUP_FILE")" -C /target

echo "Restored $BACKUP_FILE to volume $VOLUME_NAME"
```

Restore a PostgreSQL database:

```bash
# Restore a PostgreSQL dump
gunzip -c /backups/databases/mydb_20260208.dump.gz | \
  docker exec -i postgres pg_restore -U postgres -d mydb --clean --if-exists
```

Restore a Redis snapshot:

```bash
# Stop Redis, replace the dump file, and restart
docker stop redis
docker cp /backups/databases/redis.rdb redis:/data/dump.rdb
docker start redis
```

## Automating with Cron

Schedule backups using cron on the Docker host:

```bash
# Add to crontab with: crontab -e

# Full backup at 2 AM daily
0 2 * * * /opt/scripts/full-backup.sh >> /var/log/docker-backup.log 2>&1

# Database backup every 6 hours
0 */6 * * * /opt/scripts/backup-postgres.sh postgres mydb >> /var/log/docker-backup.log 2>&1
```

## Off-Site Backup

After creating local backups, sync them to off-site storage:

```bash
#!/bin/bash
# sync-offsite.sh
# Syncs local backups to S3-compatible storage

BACKUP_DIR="/backups"
S3_BUCKET="s3://my-backup-bucket/docker"

# Upload using aws cli from a container
docker run --rm \
  -v "${BACKUP_DIR}":/backups:ro \
  -e AWS_ACCESS_KEY_ID="${AWS_ACCESS_KEY_ID}" \
  -e AWS_SECRET_ACCESS_KEY="${AWS_SECRET_ACCESS_KEY}" \
  amazon/aws-cli \
  s3 sync /backups "$S3_BUCKET" --delete
```

## Conclusion

A complete Docker backup strategy covers databases with native dump tools, volumes with tar archives, images for rapid redeployment, and configuration files for infrastructure as code. Automate everything with scripts and cron. Test your restoration procedures regularly, not just when disaster strikes. Store copies off-site. The best backup is one you have verified you can restore from.
