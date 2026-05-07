# How to Implement Container Backup Strategies with Podman

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Podman, Backup, Disaster Recovery, Container, Data Protection

Description: Learn how to implement comprehensive backup strategies for Podman containers, including volume backups, image exports, checkpoint/restore, and automated backup pipelines.

---

> A comprehensive backup strategy for Podman containers protects your data, configuration, and application state, enabling recovery from hardware failures, accidental deletions, and corrupted updates.

Containers themselves are ephemeral, but the data they manage is not. Database records, uploaded files, configuration state, and application secrets all need reliable backups. Podman provides several mechanisms for backing up container data, from simple volume copies to full container checkpointing.

This guide covers backup strategies for every layer of your container infrastructure.

---

## What Needs Backing Up

Container environments have four types of data that need backups:

1. **Volume data**: database files, uploads, application state
2. **Container images**: custom-built application images
3. **Configuration**: compose files, Quadlet units, environment files
4. **Container state**: running process state (for live migration)

## Volume Backup Strategies

### Offline Volume Backup

Stop the container before backing up to ensure data consistency:

```bash
#!/bin/bash
# backup-volume-offline.sh

VOLUME=$1
BACKUP_DIR=/srv/backups/volumes
DATE=$(date +%Y%m%d_%H%M%S)

# Find containers using this volume

CONTAINERS=$(podman ps -a --filter volume="$VOLUME" --format '{{.Names}}')

# Stop containers
for c in $CONTAINERS; do
  echo "Stopping $c..."
  podman stop "$c"
done

# Export the volume using podman volume export
mkdir -p "$BACKUP_DIR"
podman volume export "$VOLUME" | gzip > "${BACKUP_DIR}/${VOLUME}-${DATE}.tar.gz"

echo "Backup created: ${BACKUP_DIR}/${VOLUME}-${DATE}.tar.gz"

# Restart containers
for c in $CONTAINERS; do
  echo "Starting $c..."
  podman start "$c"
done
```

### Online Volume Backup

Back up volumes without stopping containers using `podman volume export`:

```bash
# Export the volume directly (container keeps running)
podman volume export myapp-data | gzip > /srv/backups/myapp-data-$(date +%Y%m%d).tar.gz
```

### Database-Specific Backups

For databases, use native dump tools for consistent backups:

```bash
# PostgreSQL backup
podman exec postgres pg_dumpall -U admin > /srv/backups/postgres-$(date +%Y%m%d).sql

# PostgreSQL with compression
podman exec postgres pg_dump -U admin -Fc mydb > /srv/backups/mydb-$(date +%Y%m%d).dump

# MySQL backup
podman exec mysql mysqldump -u root -prootpass --all-databases | \
  gzip > /srv/backups/mysql-$(date +%Y%m%d).sql.gz

# MongoDB backup
podman exec mongodb mongodump --archive=/tmp/backup.archive
podman cp mongodb:/tmp/backup.archive /srv/backups/mongo-$(date +%Y%m%d).archive

# Redis backup
LASTSAVE=$(podman exec redis redis-cli LASTSAVE)
podman exec redis redis-cli BGSAVE
while [ "$(podman exec redis redis-cli LASTSAVE)" = "$LASTSAVE" ]; do
  sleep 1
done
podman cp redis:/data/dump.rdb /srv/backups/redis-$(date +%Y%m%d).rdb
```

## Image Backup

Save custom images for offline recovery:

```bash
# Save a single image
podman save -o /srv/backups/images/my-api-1.2.3.tar my-api:1.2.3

# Save with compression
podman save my-api:1.2.3 | gzip > /srv/backups/images/my-api-1.2.3.tar.gz

# Save multiple images
podman save -o /srv/backups/images/all-apps.tar \
  my-api:1.2.3 my-web:2.0.0 my-worker:1.1.0

# Restore images
podman load -i /srv/backups/images/my-api-1.2.3.tar
```

## Configuration Backup

Back up all container configuration files:

```bash
#!/bin/bash
# backup-config.sh

BACKUP_DIR=/srv/backups/config
DATE=$(date +%Y%m%d)

mkdir -p "${BACKUP_DIR}/${DATE}"

# Backup Quadlet files
cp -r ~/.config/containers/systemd/ "${BACKUP_DIR}/${DATE}/quadlet/"

# Backup container configuration
cp ~/.config/containers/containers.conf "${BACKUP_DIR}/${DATE}/" 2>/dev/null
cp ~/.config/containers/storage.conf "${BACKUP_DIR}/${DATE}/" 2>/dev/null
cp ~/.config/containers/registries.conf "${BACKUP_DIR}/${DATE}/" 2>/dev/null

# Export running container configs
for c in $(podman ps --format '{{.Names}}'); do
  podman inspect "$c" > "${BACKUP_DIR}/${DATE}/${c}-inspect.json"
done

# Generate Kubernetes YAML for pods
for pod in $(podman pod ls --format '{{.Name}}'); do
  podman generate kube "$pod" > "${BACKUP_DIR}/${DATE}/${pod}-kube.yaml"
done

tar -czf "${BACKUP_DIR}/config-${DATE}.tar.gz" -C "${BACKUP_DIR}" "${DATE}"
rm -rf "${BACKUP_DIR}/${DATE}"

echo "Configuration backup: ${BACKUP_DIR}/config-${DATE}.tar.gz"
```

## Container Checkpoint and Restore

Podman supports CRIU-based checkpointing for saving and restoring container state:

```bash
# Checkpoint a running container (saves process state)
podman container checkpoint my-api --compress=gzip --export=/srv/backups/my-api-checkpoint.tar.gz

# Restore on the same or different machine
podman container restore --import=/srv/backups/my-api-checkpoint.tar.gz

# Checkpoint without stopping (keep running)
podman container checkpoint my-api --leave-running --compress=gzip --export=/srv/backups/my-api-live.tar.gz
```

## Comprehensive Backup Script

```bash
#!/bin/bash
# full-backup.sh

set -e

BACKUP_BASE="/srv/backups"
DATE=$(date +%Y%m%d_%H%M%S)
BACKUP_DIR="${BACKUP_BASE}/${DATE}"
LOG_FILE="${BACKUP_BASE}/backup-${DATE}.log"

mkdir -p "$BACKUP_DIR"/{volumes,images,config,databases}

log() {
  echo "[$(date +%H:%M:%S)] $1" | tee -a "$LOG_FILE"
}

log "Starting full backup..."

# 1. Database backups (consistent dumps)
log "Backing up databases..."
if podman container exists postgres; then
  podman exec postgres pg_dumpall -U admin 2>/dev/null | \
    gzip > "${BACKUP_DIR}/databases/postgres.sql.gz"
  log "PostgreSQL backup complete"
fi

if podman container exists redis; then
  LASTSAVE=$(podman exec redis redis-cli LASTSAVE)
  podman exec redis redis-cli BGSAVE 2>/dev/null
  while [ "$(podman exec redis redis-cli LASTSAVE)" = "$LASTSAVE" ]; do
    sleep 1
  done
  podman cp redis:/data/dump.rdb "${BACKUP_DIR}/databases/redis.rdb" 2>/dev/null
  log "Redis backup complete"
fi

# 2. Volume backups
log "Backing up volumes..."
for vol in $(podman volume ls -q); do
  podman volume export "$vol" | gzip > "${BACKUP_DIR}/volumes/${vol}.tar.gz" 2>/dev/null
  log "Volume $vol backed up"
done

# 3. Image backups
log "Backing up custom images..."
for img in $(podman images --filter reference='my-*' --format '{{.Repository}}:{{.Tag}}'); do
  SAFE_NAME=$(echo "$img" | tr '/:' '-')
  podman save "$img" | gzip > "${BACKUP_DIR}/images/${SAFE_NAME}.tar.gz"
  log "Image $img backed up"
done

# 4. Configuration backup
log "Backing up configuration..."
cp -r ~/.config/containers/systemd/ "${BACKUP_DIR}/config/quadlet/" 2>/dev/null
for c in $(podman ps --format '{{.Names}}'); do
  podman inspect "$c" > "${BACKUP_DIR}/config/${c}.json"
done

# 5. Create final archive
log "Creating final archive..."
tar -czf "${BACKUP_BASE}/full-backup-${DATE}.tar.gz" -C "$BACKUP_BASE" "$DATE"
rm -rf "$BACKUP_DIR"

# 6. Cleanup old backups
log "Cleaning up old backups..."
find "$BACKUP_BASE" -name "full-backup-*.tar.gz" -mtime +30 -delete

SIZE=$(du -sh "${BACKUP_BASE}/full-backup-${DATE}.tar.gz" | cut -f1)
log "Backup complete: ${SIZE}"
```

## Automated Backup Schedule

Use systemd timers for automated backups:

```ini
# ~/.config/systemd/user/container-backup.service
[Unit]
Description=Container Backup

[Service]
Type=oneshot
ExecStart=%h/bin/full-backup.sh
```

```ini
# ~/.config/systemd/user/container-backup.timer
[Unit]
Description=Daily Container Backup

[Timer]
OnCalendar=*-*-* 02:00:00
RandomizedDelaySec=30m
Persistent=true

[Install]
WantedBy=timers.target
```

```bash
systemctl --user enable --now container-backup.timer
```

## Off-Site Backup

Send backups to remote storage:

```bash
#!/bin/bash
# offsite-backup.sh

BACKUP_FILE=$1
REMOTE_HOST="backup-server.example.com"
REMOTE_DIR="/backups/containers/"

# rsync to remote server
rsync -avz --progress "$BACKUP_FILE" "${REMOTE_HOST}:${REMOTE_DIR}"

# Or upload to S3-compatible storage
podman run --rm \
  -v /srv/backups:/backups:ro \
  -e MC_HOST_remote=https://ACCESS_KEY:SECRET_KEY@s3.example.com \
  docker.io/minio/mc:latest \
  cp "/backups/$(basename "$BACKUP_FILE")" remote/container-backups/
```

## Restore Procedure

Document and test your restore process:

```bash
#!/bin/bash
# restore.sh

BACKUP_FILE=$1
RESTORE_DIR="/tmp/restore-$$"

echo "Extracting backup..."
mkdir -p "$RESTORE_DIR"
tar -xzf "$BACKUP_FILE" -C "$RESTORE_DIR"

BACKUP_DATE=$(ls "$RESTORE_DIR")

echo "Restoring volumes..."
for vol_backup in "${RESTORE_DIR}/${BACKUP_DATE}/volumes/"*.tar.gz; do
  VOL_NAME=$(basename "$vol_backup" .tar.gz)
  echo "Restoring volume: $VOL_NAME"
  podman volume create "$VOL_NAME" 2>/dev/null
  gunzip -c "$vol_backup" | podman volume import "$VOL_NAME" -
done

echo "Restoring images..."
for img_backup in "${RESTORE_DIR}/${BACKUP_DATE}/images/"*.tar.gz; do
  echo "Loading image: $(basename $img_backup)"
  gunzip -c "$img_backup" | podman load
done

echo "Restoring Quadlet configuration..."
cp -r "${RESTORE_DIR}/${BACKUP_DATE}/config/quadlet/"* \
  ~/.config/containers/systemd/

systemctl --user daemon-reload

rm -rf "$RESTORE_DIR"
echo "Restore complete. Start services with: systemctl --user start <service>"
```

## Backup Verification

Regularly verify that backups are valid:

```bash
#!/bin/bash
# verify-backup.sh

BACKUP=$1

echo "Verifying backup integrity..."
if ! tar -tzf "$BACKUP" > /dev/null 2>&1; then
  echo "FAILED: Archive is corrupt"
  exit 1
fi

echo "Checking backup contents..."
tar -tzf "$BACKUP" | head -20

SIZE=$(du -sh "$BACKUP" | cut -f1)
echo "Backup size: $SIZE"
echo "Verification: PASSED"
```

## Conclusion

A comprehensive Podman backup strategy covers four areas: volume data, container images, configuration files, and optionally container state through checkpointing. Use database-native dump tools for consistent database backups, tar archives for volume data, and podman save for custom images. Automate backups with systemd timers, send copies off-site for disaster recovery, and regularly test your restore procedure. The best backup is one you have verified you can restore from.
