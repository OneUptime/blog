# How to Backup a Podman Volume

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Podman, Container, DevOps, Volumes, Backup, Storage

Description: Learn how to back up Podman volumes using tar archives, export commands, and automated backup strategies.

---

> Regular volume backups protect your containerized application data from loss. Podman provides multiple approaches to safely back up volume contents.

Podman volumes store persistent container data that survives container restarts and removals. Backing up this data is essential for disaster recovery, migration, and rollback scenarios. This guide covers practical backup methods.

---

## Backup Using a Temporary Container

The most common approach uses a temporary container to create a tar archive of the volume contents:

```bash
# Create a backup of the named volume "appdata"

podman run --rm \
  -v appdata:/source:ro \
  -v /home/user/backups:/backup \
  docker.io/library/alpine:latest \
  tar czf /backup/appdata-$(date +%Y%m%d).tar.gz -C /source .

# Verify the backup
ls -lh /home/user/backups/appdata-*.tar.gz
```

## Backup Using podman volume export

Podman has a built-in export command for volumes:

```bash
# Export a volume to a tar archive
podman volume export appdata --output /home/user/backups/appdata-backup.tar

# Export with gzip compression
podman volume export appdata | gzip > /home/user/backups/appdata-backup.tar.gz

# Verify the archive contents
tar tzf /home/user/backups/appdata-backup.tar.gz | head -20
```

## Backup While Container Is Running

For databases and applications that need consistent backups, stop the container or use application-level tools first:

```bash
# Option 1: Stop the container, back up, restart
podman stop mydb
podman volume export dbdata --output /home/user/backups/dbdata-backup.tar
podman start mydb

# Option 2: Use application-level backup (e.g., pg_dump for PostgreSQL)
podman exec mydb pg_dump -U postgres myapp > /home/user/backups/myapp-db.sql
```

## Backup All Volumes

```bash
# List all volumes
podman volume ls --format '{{ .Name }}'

# Backup all volumes in a loop
BACKUP_DIR="/home/user/backups/$(date +%Y%m%d)"
mkdir -p "$BACKUP_DIR"

for vol in $(podman volume ls --format '{{ .Name }}'); do
  echo "Backing up volume: $vol"
  podman volume export "$vol" | gzip > "$BACKUP_DIR/${vol}.tar.gz"
done

echo "All volumes backed up to $BACKUP_DIR"
```

## Automated Backup with Cron

```bash
# Create a backup script
mkdir -p /home/user/scripts

cat > /home/user/scripts/backup-volumes.sh << 'EOF'
#!/bin/bash
BACKUP_DIR="/home/user/backups/$(date +%Y%m%d)"
RETENTION_DAYS=30
mkdir -p "$BACKUP_DIR"

for vol in $(podman volume ls --format '{{ .Name }}'); do
  podman volume export "$vol" | gzip > "$BACKUP_DIR/${vol}.tar.gz"
done

# Remove backups older than retention period
find /home/user/backups -mindepth 1 -maxdepth 1 -type d -mtime +$RETENTION_DAYS -exec rm -rf {} +
EOF

chmod +x /home/user/scripts/backup-volumes.sh

# Add to crontab for daily backups at 2 AM
# 0 2 * * * /home/user/scripts/backup-volumes.sh
```

## Verifying Backup Integrity

```bash
# Test that the archive is valid
tar tzf /home/user/backups/appdata-backup.tar.gz > /dev/null && echo "Archive is valid"

# Check archive size
du -sh /home/user/backups/appdata-backup.tar.gz

# Preview contents without extracting
tar tzf /home/user/backups/appdata-backup.tar.gz | head -20
```

## Summary

Back up Podman volumes using `podman volume export` for simplicity or temporary containers with `tar` for more control. Stop containers or use application-level dump tools for consistent database backups. Automate backups with cron scripts and implement a retention policy to manage storage. Always verify backup integrity after creation.
