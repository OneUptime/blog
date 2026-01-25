# How to Configure Restic for Application Backup

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Restic, Backup, DevOps, Data Protection, Linux

Description: Learn how to set up Restic for efficient, encrypted application backups with deduplication, including configuration for local storage, S3 backends, automated scheduling, and restore procedures.

---

Restic is a backup program that does one thing exceptionally well: it creates encrypted, deduplicated backups fast. Unlike traditional tools that copy entire files on each run, Restic splits data into content-defined chunks and only stores unique chunks. This makes incremental backups nearly instantaneous, even for large datasets.

This guide covers installing Restic, initializing repositories, backing up applications, automating schedules, and restoring data when things go wrong.

## Why Restic?

Several features make Restic stand out:

1. **Encryption by default:** All backups are encrypted with AES-256 before leaving your machine.
2. **Deduplication:** Identical data is stored once, regardless of which file or backup it belongs to.
3. **Multiple backends:** Supports local directories, SFTP, S3, Azure Blob, GCS, and REST servers.
4. **Cross-platform:** Runs on Linux, macOS, Windows, and BSD.

The tradeoff is that Restic requires a running process to manage backups. It does not integrate directly with databases or application APIs. You handle pre-backup scripts yourself.

## Installing Restic

Restic ships as a single binary with no dependencies:

```bash
# Install on Ubuntu/Debian
sudo apt update && sudo apt install restic

# Install on macOS
brew install restic

# Install on RHEL/CentOS/Fedora
sudo dnf install restic

# Or download the latest binary directly
wget https://github.com/restic/restic/releases/download/v0.16.4/restic_0.16.4_linux_amd64.bz2
bunzip2 restic_0.16.4_linux_amd64.bz2
chmod +x restic_0.16.4_linux_amd64
sudo mv restic_0.16.4_linux_amd64 /usr/local/bin/restic
```

Verify installation:

```bash
restic version
# restic 0.16.4 compiled with go1.21.5 on linux/amd64
```

## Initializing a Backup Repository

Before storing backups, you must initialize a repository. This creates the necessary structure and encryption keys.

```bash
# Initialize a local repository
export RESTIC_REPOSITORY=/mnt/backups/app-data
export RESTIC_PASSWORD="your-secure-password"

restic init

# Output:
# created restic repository a1b2c3d4e5 at /mnt/backups/app-data
# Please note that knowledge of your password is required to access the repository.
```

For remote storage backends:

```bash
# Initialize repository on S3
export RESTIC_REPOSITORY=s3:s3.amazonaws.com/my-backup-bucket/app-backups
export AWS_ACCESS_KEY_ID=AKIAIOSFODNN7EXAMPLE
export AWS_SECRET_ACCESS_KEY=wJalrXUtnFEMI/K7MDENG/bPxRfiCYEXAMPLEKEY
export RESTIC_PASSWORD="your-secure-password"

restic init

# Initialize on MinIO (S3-compatible)
export RESTIC_REPOSITORY=s3:http://minio.local:9000/backups/restic
restic init

# Initialize on SFTP server
export RESTIC_REPOSITORY=sftp:user@backup-server:/backups/restic
restic init
```

## Your First Backup

With the repository initialized, create your first backup:

```bash
# Back up a single directory
restic backup /var/www/app

# Back up multiple directories
restic backup /var/www/app /etc/nginx /home/deploy/.ssh

# Back up with exclusions
restic backup /var/www/app \
  --exclude="*.log" \
  --exclude="node_modules" \
  --exclude=".git"

# Back up with verbose output
restic backup /var/www/app --verbose
```

The output shows what Restic is doing:

```
repository a1b2c3d4e5 opened successfully
created new cache in /home/user/.cache/restic

Files:        1284 new,     0 changed,     0 unmodified
Dirs:          156 new,     0 changed,     0 unmodified
Added to the repo: 234.567 MiB

processed 1284 files, 891.234 MiB in 0:12
snapshot 5f6g7h8i saved
```

## Backup Flow

```mermaid
flowchart TD
    A[Source Files] --> B[Chunking Engine]
    B --> C{Chunk Exists?}
    C -->|No| D[Encrypt Chunk]
    C -->|Yes| E[Reference Existing]
    D --> F[Upload to Repository]
    E --> G[Update Snapshot Index]
    F --> G
    G --> H[Snapshot Complete]
```

## Backing Up Application Data

Real applications need preparation before backup. Here is how to handle common scenarios:

### PostgreSQL Database

```bash
#!/bin/bash
# backup-postgres.sh

set -euo pipefail

export RESTIC_REPOSITORY=s3:s3.amazonaws.com/backups/postgres
export RESTIC_PASSWORD_FILE=/etc/restic/password
export AWS_ACCESS_KEY_ID=$(cat /etc/restic/aws-key)
export AWS_SECRET_ACCESS_KEY=$(cat /etc/restic/aws-secret)

BACKUP_DIR=/tmp/postgres-backup
mkdir -p "$BACKUP_DIR"

# Dump the database
pg_dump -h localhost -U appuser -d appdb -F c -f "$BACKUP_DIR/appdb.dump"

# Back up the dump file
restic backup "$BACKUP_DIR" --tag postgres --tag production

# Clean up
rm -rf "$BACKUP_DIR"

# Prune old snapshots (keep last 7 daily, 4 weekly, 12 monthly)
restic forget --keep-daily 7 --keep-weekly 4 --keep-monthly 12 --prune
```

### MongoDB Database

```bash
#!/bin/bash
# backup-mongodb.sh

set -euo pipefail

export RESTIC_REPOSITORY=/mnt/nfs/backups/mongodb
export RESTIC_PASSWORD_FILE=/etc/restic/password

BACKUP_DIR=/tmp/mongo-backup
mkdir -p "$BACKUP_DIR"

# Create a consistent dump
mongodump --uri="mongodb://localhost:27017" --out="$BACKUP_DIR"

# Back up with tags for easy filtering
restic backup "$BACKUP_DIR" \
  --tag mongodb \
  --tag "$(date +%Y-%m-%d)"

rm -rf "$BACKUP_DIR"
```

### Application Files with Pre-backup Hook

```bash
#!/bin/bash
# backup-app.sh

set -euo pipefail

export RESTIC_REPOSITORY=sftp:backup@storage:/backups/webapp
export RESTIC_PASSWORD_FILE=/etc/restic/password

APP_DIR=/var/www/myapp

# Stop the application to ensure consistency
systemctl stop myapp

# Run the backup
restic backup "$APP_DIR" \
  --exclude="$APP_DIR/tmp/*" \
  --exclude="$APP_DIR/logs/*" \
  --exclude="$APP_DIR/cache/*" \
  --tag webapp

# Restart the application
systemctl start myapp

echo "Backup completed at $(date)"
```

## Managing Snapshots

Restic creates a snapshot for each backup run. You can list, inspect, and compare them:

```bash
# List all snapshots
restic snapshots

# Filter by tag
restic snapshots --tag postgres

# Show detailed snapshot info
restic snapshots --json | jq '.[0]'

# Compare two snapshots
restic diff abc123 def456

# Show files in a snapshot
restic ls abc123

# Show specific path in a snapshot
restic ls abc123 /var/www/app/config
```

## Restoring Data

When disaster strikes, restoration should be fast and straightforward:

```bash
# Restore entire snapshot to original location
restic restore abc123 --target /

# Restore to a different location
restic restore abc123 --target /tmp/restore

# Restore specific files or directories
restic restore abc123 --target /tmp/restore --include "/var/www/app/config"

# Restore excluding certain patterns
restic restore abc123 --target /tmp/restore --exclude "*.log"

# Mount a snapshot as a filesystem (read-only)
mkdir /mnt/restic-mount
restic mount /mnt/restic-mount &
# Now browse /mnt/restic-mount/snapshots/
```

The mount feature is particularly useful for recovering individual files without restoring everything.

## Automating Backups with Systemd

Create a systemd service and timer for automated backups:

```ini
# /etc/systemd/system/restic-backup.service
[Unit]
Description=Restic Backup Service
After=network-online.target
Wants=network-online.target

[Service]
Type=oneshot
User=root
Environment="RESTIC_REPOSITORY=s3:s3.amazonaws.com/backups/server"
Environment="RESTIC_PASSWORD_FILE=/etc/restic/password"
Environment="AWS_ACCESS_KEY_ID=AKIAIOSFODNN7EXAMPLE"
Environment="AWS_SECRET_ACCESS_KEY=wJalrXUtnFEMI/K7MDENG/bPxRfiCYEXAMPLEKEY"
ExecStart=/usr/local/bin/restic backup /var/www /etc --exclude="*.log" --tag automated
ExecStartPost=/usr/local/bin/restic forget --keep-daily 7 --keep-weekly 4 --keep-monthly 12 --prune

[Install]
WantedBy=multi-user.target
```

```ini
# /etc/systemd/system/restic-backup.timer
[Unit]
Description=Run Restic Backup Daily

[Timer]
OnCalendar=*-*-* 03:00:00
Persistent=true

[Install]
WantedBy=timers.target
```

Enable and start:

```bash
sudo systemctl daemon-reload
sudo systemctl enable restic-backup.timer
sudo systemctl start restic-backup.timer

# Check timer status
systemctl list-timers | grep restic
```

## Retention Policies

Over time, snapshots accumulate. Use `restic forget` to prune old backups while keeping a sensible history:

```bash
# Keep last 7 daily, 4 weekly, 6 monthly, 2 yearly snapshots
restic forget \
  --keep-daily 7 \
  --keep-weekly 4 \
  --keep-monthly 6 \
  --keep-yearly 2 \
  --prune

# Dry run to see what would be deleted
restic forget --keep-daily 7 --dry-run

# Remove specific snapshot
restic forget abc123

# Remove snapshots by tag
restic forget --tag testing --keep-last 1
```

The `--prune` flag reclaims disk space by removing unreferenced data chunks.

## Checking Repository Integrity

Periodically verify that your backups are not corrupted:

```bash
# Quick check (metadata only)
restic check

# Full check (verify all data)
restic check --read-data

# Check a percentage of data (faster for large repos)
restic check --read-data-subset=10%
```

Schedule weekly integrity checks to catch problems early.

## Security Best Practices

1. **Store passwords securely.** Use a password file with restricted permissions (600) or a secrets manager.

2. **Rotate repository passwords.** Restic supports key management:
   ```bash
   # Add a new key
   restic key add

   # List all keys
   restic key list

   # Remove old key
   restic key remove abc123
   ```

3. **Use separate repositories per environment.** Do not mix production and development backups.

4. **Encrypt credentials at rest.** On servers, consider using HashiCorp Vault or AWS Secrets Manager for credentials.

## Monitoring Backups

Wrap your backup scripts to send metrics:

```bash
#!/bin/bash
# backup-with-monitoring.sh

START_TIME=$(date +%s)

if restic backup /var/www/app --tag automated; then
  STATUS="success"
  EXIT_CODE=0
else
  STATUS="failure"
  EXIT_CODE=1
fi

END_TIME=$(date +%s)
DURATION=$((END_TIME - START_TIME))

# Send to your monitoring system
curl -X POST https://monitoring.example.com/api/backup-status \
  -H "Content-Type: application/json" \
  -d "{\"service\": \"app-backup\", \"status\": \"$STATUS\", \"duration\": $DURATION}"

exit $EXIT_CODE
```

## Wrapping Up

Restic brings enterprise-grade backup features to any infrastructure without complexity. Its deduplication means incremental backups run in seconds, and encryption ensures your data stays private even on shared storage. Start with local backups to learn the workflow, then move to S3 or SFTP backends for production. The key is automating everything and testing restores regularly. A backup you have never restored is just a guess.
