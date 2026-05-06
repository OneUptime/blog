# How to Back Up Portainer Data Before an Upgrade

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Portainer, Backup, Docker, Maintenance, DevOps

Description: Learn multiple methods to back up Portainer data before performing an upgrade to protect against data loss or failed migrations.

---

Portainer stores its BoltDB database and related files inside the data volume. Before any upgrade, creating a reliable backup ensures you can quickly restore if something goes wrong.

## What Gets Backed Up

The Portainer data volume (`portainer_data`) contains items such as:
- Database (`portainer.db`, or `portainer.edb` when encrypted) - all settings, users, environments, stacks
- TLS certificates
- Compose files for managed stacks
- Custom templates
- Edge agent configurations

## Method 1: Volume Tar Archive (Recommended)

The simplest and most reliable backup method:

```bash
# Stop Portainer for a consistent backup (recommended)
docker stop portainer

mkdir -p backups
TIMESTAMP=$(date +%Y%m%d_%H%M%S)

# Create a timestamped tar archive of the entire data volume
docker run --rm \
  -v portainer_data:/data \
  -v "$(pwd)/backups":/backup \
  alpine \
  tar czf /backup/portainer_backup_${TIMESTAMP}.tar.gz -C /data .

# Restart Portainer after backup
docker start portainer

echo "Backup saved to: backups/portainer_backup_${TIMESTAMP}.tar.gz"
```

## Method 2: Copy Only the Database File

If you only need to back up the database file itself:

```bash
mkdir -p backups

# Stop Portainer for consistent file copy
docker stop portainer

# Copy just the BoltDB database file
docker run --rm \
  -v portainer_data:/data \
  -v "$(pwd)/backups":/backup \
  alpine sh -c '
    ts=$(date +%Y%m%d_%H%M%S)
    if [ -f /data/portainer.db ]; then
      cp /data/portainer.db "/backup/portainer_${ts}.db"
    elif [ -f /data/portainer.edb ]; then
      cp /data/portainer.edb "/backup/portainer_${ts}.edb"
    else
      echo "No Portainer database file found" >&2
      exit 1
    fi
  '

docker start portainer
```

## Method 3: Portainer API Backup

Portainer exposes a dedicated backup API endpoint for admin users:

```bash
# Trigger a backup via the Portainer API
# Replace <TOKEN> with an admin access token from My account -> Access tokens
if curl --fail --silent --show-error \
  -X POST \
  https://localhost:9443/api/backup \
  -H "X-API-Key: <TOKEN>" \
  -H "Content-Type: application/json" \
  -d '{"password": "optionalEncryptionPassword"}' \
  --output "portainer_backup_$(date +%Y%m%d).tar.gz" \
  --insecure; then
  echo "API backup downloaded"
fi
```

## Method 4: Automated Backup Script

Set up a cron job for regular automated backups:

```bash
#!/bin/bash
# /usr/local/bin/portainer-backup.sh
# Run daily via: crontab -e -> 0 2 * * * /usr/local/bin/portainer-backup.sh

BACKUP_DIR="/opt/backups/portainer"
RETENTION_DAYS=7

mkdir -p "$BACKUP_DIR"

# Stop for consistent backup
docker stop portainer

# Create backup
docker run --rm \
  -v portainer_data:/data \
  -v "$BACKUP_DIR":/backup \
  alpine \
  tar czf "/backup/portainer_$(date +%Y%m%d_%H%M%S).tar.gz" -C /data .

# Restart immediately
docker start portainer

# Remove backups older than retention period
find "$BACKUP_DIR" -name "portainer_*.tar.gz" -mtime +"$RETENTION_DAYS" -delete

echo "Backup complete. Current backups:"
ls -lh "$BACKUP_DIR"
```

## Verify Your Backup

Always verify the backup is valid before proceeding with the upgrade:

```bash
# Pick the most recent backup file
BACKUP_FILE="$(ls -1t backups/portainer_backup_*.tar.gz | head -1)"

# List contents of the backup archive to verify integrity
tar tzf "$BACKUP_FILE" | head -20

# Check the archive is not corrupted
tar tzf "$BACKUP_FILE" > /dev/null && echo "Backup OK" || echo "Backup CORRUPTED"
```

---

*Set up automated backup monitoring and alerts with [OneUptime](https://oneuptime.com) to ensure your backup jobs succeed.*
