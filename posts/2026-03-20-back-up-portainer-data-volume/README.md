# How to Back Up Portainer Data Volume

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Portainer, Backup, Docker Volumes, Data Protection, Administration

Description: Learn how to back up the Portainer data volume containing the database, certificates, and configuration to protect against data loss.

---

The Portainer data volume contains Portainer's own configuration data: the BoltDB database (users, stacks, registries, settings), TLS certificates, stack files, and agent keys. It does not include your managed containers or their application data. Backing it up regularly ensures you can recover from hardware failures, corruption, or accidental resets.

## What Is in the Portainer Data Volume

```bash
# Inspect the Portainer data volume contents

docker run --rm -v portainer_data:/data alpine ls -la /data

# Typical contents:
# portainer.db     - BoltDB database (all settings, users, stacks)
# certs/           - TLS certificates
# chisel/          - Edge agent tunnel keys
# compose/         - Stored compose files for stacks
```

## Method 1: Docker Volume Backup with tar

```bash
# Stop Portainer for a consistent backup
docker stop portainer

# Create a compressed backup archive
docker run --rm \
  -v portainer_data:/data \
  -v /backup:/backup \
  alpine \
  tar czpf /backup/portainer-backup-$(date +%Y%m%d-%H%M%S).tar.gz -C / data

# Restart Portainer
docker start portainer

# Verify the backup
ls -lh /backup/portainer-backup-*.tar.gz
```

## Method 2: Live Backup Using Portainer's Built-in Backup

Portainer provides a built-in backup endpoint that creates a consistent snapshot while running:

```bash
TOKEN="your_admin_api_key_here"

# Trigger backup via API (creates a downloadable tar.gz)
curl --insecure --fail --silent --show-error \
  -X POST \
  -H "X-API-Key: $TOKEN" \
  -H "Content-Type: application/json" \
  --data '{}' \
  https://localhost:9443/api/backup \
  --output portainer-backup-$(date +%Y%m%d).tar.gz

ls -lh portainer-backup-*.tar.gz
```

## Method 3: Using Portainer UI

1. Log in to Portainer as an admin user.
2. Go to **Settings** and scroll down to **Back up Portainer**.
3. Click **Download backup** to get a `.tar.gz` backup of Portainer's configuration.
4. Store the file in a safe location (external drive, S3, NFS share).

## Automating Backups

```bash
#!/bin/bash
set -euo pipefail

# /usr/local/bin/portainer-backup.sh
# Add to crontab: 0 2 * * * /usr/local/bin/portainer-backup.sh

BACKUP_DIR="/mnt/backups/portainer"
DATE=$(date +%Y%m%d-%H%M%S)
RETENTION_DAYS=30

mkdir -p "$BACKUP_DIR"

# Stop Portainer for a consistent backup and start it again when the script exits
docker stop portainer >/dev/null
trap 'docker start portainer >/dev/null' EXIT

# Backup the volume
docker run --rm \
  -v portainer_data:/data \
  -v "$BACKUP_DIR":/backup \
  alpine \
  tar czpf "/backup/portainer-$DATE.tar.gz" -C / data

# Remove backups older than retention period
find "$BACKUP_DIR" -name "portainer-*.tar.gz" -mtime +$RETENTION_DAYS -delete

echo "Backup completed: portainer-$DATE.tar.gz"
```

## Verifying Backup Integrity

```bash
# Test that the backup is a valid tar.gz
tar tzf /backup/portainer-20260320.tar.gz | head -10

# Check that the Portainer database is present
tar tzf /backup/portainer-20260320.tar.gz | grep -E '(^|/)portainer\.(e)?db$'
```
