# How to Back Up Portainer Data Volume - Backup

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Portainer, Docker, Backup, Data Management, Self-Hosted

Description: Create reliable backups of the Portainer data volume to protect your configuration, stacks, environments, and user settings from data loss.

## Introduction

Portainer stores everything - user accounts, environments, stacks, registry credentials, access control settings, and all configuration - in its data volume (`portainer_data`). Backing this up regularly ensures you can recover from hardware failures, accidental resets, or corruption without losing your setup.

## What the Data Volume Contains

The `portainer_data` volume contains:
- `portainer.db` - BoltDB database with all Portainer configuration
- TLS certificates (if configured)
- Portainer-managed Docker compose files
- Cache files

Your actual Docker containers, images, and volumes are NOT in this volume - they live in Docker's storage and are unaffected by Portainer backups.

## Step 1: Manual Backup (Tar Archive)

```bash
# Best practice: stop Portainer during backup to ensure consistency

docker stop portainer

# Create a backup using an Alpine container
BACKUP_FILE="/opt/backups/portainer/portainer-$(date +%Y%m%d-%H%M%S).tar.gz"
mkdir -p /opt/backups/portainer

docker run --rm \
  -v portainer_data:/data \
  -v /opt/backups/portainer:/backup \
  alpine tar czf "/backup/$(basename "$BACKUP_FILE")" -C /data .

# Start Portainer again
docker start portainer

# Verify backup
ls -lh /opt/backups/portainer/
```

## Step 2: Online Backup (Without Stopping)

For minimal downtime, you can copy the volume with Portainer running, but treat this as a best-effort filesystem copy rather than a guaranteed application-consistent backup. For a consistent live backup, prefer Step 4:

```bash
# Best-effort online copy - Portainer stays running
mkdir -p /opt/backups/portainer

docker run --rm \
  -v portainer_data:/data:ro \
  -v /opt/backups/portainer:/backup \
  alpine tar czf "/backup/portainer-online-$(date +%Y%m%d-%H%M%S).tar.gz" -C /data .

# Verify
ls -lh /opt/backups/portainer/
```

## Step 3: Export Stack Definitions via API

Also export stack definitions separately as individual compose files:

```bash
PORTAINER_URL="https://localhost:9443"

TOKEN=$(curl -k -s -X POST "$PORTAINER_URL/api/auth" \
  -H "Content-Type: application/json" \
  -d '{"Username":"admin","Password":"yourpassword"}' | jq -r .jwt)

mkdir -p /opt/backups/portainer-stacks
mkdir -p /opt/backups/portainer-stacks/$(date +%Y%m%d)

# Get all stacks
STACKS=$(curl -k -s -H "Authorization: Bearer $TOKEN" \
  "$PORTAINER_URL/api/stacks")

# Export each stack
echo "$STACKS" | jq -c '.[]' | while read -r stack; do
  STACK_ID=$(echo "$stack" | jq -r '.Id')
  STACK_NAME=$(echo "$stack" | jq -r '.Name')

  # Get compose file content
  CONTENT=$(curl -k -s -H "Authorization: Bearer $TOKEN" \
    "$PORTAINER_URL/api/stacks/$STACK_ID/file" | jq -r '.StackFileContent')

  if [ "$CONTENT" != "null" ] && [ -n "$CONTENT" ]; then
    printf '%s\n' "$CONTENT" > "/opt/backups/portainer-stacks/$(date +%Y%m%d)/$STACK_NAME.yml"
    echo "Exported: $STACK_NAME"
  fi
done

echo "Stack exports complete"
ls -la /opt/backups/portainer-stacks/$(date +%Y%m%d)/
```

## Step 4: Use Portainer's Built-in Backup API

```bash
# Portainer exposes a built-in backup endpoint in both CE and BE
mkdir -p /opt/backups/portainer
PORTAINER_URL="https://localhost:9443"

TOKEN=$(curl -k -s -X POST "$PORTAINER_URL/api/auth" \
  -H "Content-Type: application/json" \
  -d '{"Username":"admin","Password":"yourpassword"}' | jq -r .jwt)

# Download backup file via API
curl -k -sS -X POST \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  "$PORTAINER_URL/api/backup" \
  -d '{"Password": "backup-encryption-password"}' \
  --output "/opt/backups/portainer/portainer-api-backup-$(date +%Y%m%d).tar.gz"

ls -lh /opt/backups/portainer/
```

## Step 5: Automated Daily Backup Script

```bash
#!/bin/bash
# /opt/scripts/backup-portainer.sh

set -e

BACKUP_DIR="/opt/backups/portainer"
KEEP_DAYS=7
LOG_FILE="/var/log/portainer-backup.log"

log() {
  echo "[$(date '+%Y-%m-%d %H:%M:%S')] $1" | tee -a "$LOG_FILE"
}

cleanup() {
  if docker inspect -f '{{.State.Running}}' portainer 2>/dev/null | grep -qx 'false'; then
    log "Starting Portainer..."
    docker start portainer >/dev/null
  fi
}

trap cleanup EXIT

BACKUP_FILE="$BACKUP_DIR/portainer-$(date +%Y%m%d-%H%M%S).tar.gz"

# Create backup directory
mkdir -p "$BACKUP_DIR"

log "Starting Portainer backup..."

# Stop Portainer
log "Stopping Portainer..."
docker stop portainer

# Create backup
log "Creating backup: $BACKUP_FILE"
docker run --rm \
  -v portainer_data:/data \
  -v "$BACKUP_DIR:/backup" \
  alpine tar czf "/backup/$(basename "$BACKUP_FILE")" -C /data .

# Start Portainer
log "Starting Portainer..."
docker start portainer

# Verify backup
BACKUP_SIZE=$(du -sh "$BACKUP_FILE" | cut -f1)
log "Backup complete: $BACKUP_FILE ($BACKUP_SIZE)"

# Remove old backups
log "Removing backups older than $KEEP_DAYS days..."
find "$BACKUP_DIR" -name "*.tar.gz" -mtime +$KEEP_DAYS -delete

log "Backup finished successfully"
```

Add to crontab:

```bash
crontab -e
# Add: 0 2 * * * /opt/scripts/backup-portainer.sh
```

## Step 6: Verify Backup Integrity

```bash
# Test that the backup can be extracted
BACKUP_FILE="/opt/backups/portainer/portainer-20260320-020000.tar.gz"

# List contents
tar -tzf "$BACKUP_FILE" | head -10

# Expected output:
# ./portainer.db
# ./certs/ (if configured)
# ./compose/ (if any)

# Test extraction to a temp directory
mkdir -p /tmp/portainer-backup-test
tar -xzf "$BACKUP_FILE" -C /tmp/portainer-backup-test

ls -la /tmp/portainer-backup-test/
# portainer.db should be there

# Check file size
du -sh /tmp/portainer-backup-test/portainer.db

# Cleanup
rm -rf /tmp/portainer-backup-test
```

## Step 7: Off-site Backup

Copy backups to a remote location:

```bash
# Copy to another server via SSH
rsync -avz /opt/backups/portainer/ backup-server:/opt/backups/portainer/

# Copy to S3
aws s3 sync /opt/backups/portainer/ s3://my-backups/portainer/ \
  --sse AES256

# Copy to SFTP
sftp -i /path/to/key backup-user@remote-server << 'EOF'
put /opt/backups/portainer/*.tar.gz /backups/portainer/
EOF
```

## Conclusion

Backing up the Portainer data volume is a five-minute setup that prevents hours of manual reconfiguration after a failure. The simplest approach is stopping Portainer, running `tar` via an Alpine container to compress the volume contents, and restarting - this gives you a clean, consistent backup. Supplement volume backups with exported stack compose files, which give you a human-readable record of all your stack configurations.
