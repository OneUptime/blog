# How to Set Up Automated Podman Backups

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Podman, Backup Automation, Cron, Systemd, DevOps

Description: A practical guide to automating Podman container and volume backups using cron jobs, systemd timers, and retention policies for hands-off disaster recovery.

---

> Manual backups are backups that do not happen. Automate your Podman backup process so containers, volumes, and images are protected without human intervention.

Every backup strategy that depends on someone remembering to run a script will eventually fail. The fix is automation. This guide covers how to set up fully automated Podman backups using cron, systemd timers, and wrapper scripts with built-in retention, notification, and verification.

---

## What to Automate

A complete automated backup strategy covers three components:

1. **Container filesystems and metadata** - the writable layer and configuration.
2. **Volumes** - persistent data including databases and uploads.
3. **Images** - the base images needed to recreate containers.

Each component has different backup frequency requirements. Volumes with database data might need hourly backups. Images rarely change and can be backed up weekly. Container metadata is small and should be included with every backup run.

## The Backup Script

Start with a comprehensive backup script that handles all components:

```bash
#!/bin/bash
# /usr/local/bin/podman-backup.sh

# Automated backup of all Podman containers, volumes, and images

set -euo pipefail

# Configuration
BACKUP_ROOT="/backups/podman"
TIMESTAMP=$(date +%Y%m%d-%H%M%S)
BACKUP_DIR="$BACKUP_ROOT/$TIMESTAMP"
LOG_FILE="$BACKUP_ROOT/backup-$TIMESTAMP.log"
RETENTION_DAYS=30
MIN_BACKUPS=7

# Create backup directory
mkdir -p "$BACKUP_DIR"/{containers,volumes,images}

log() {
    echo "[$(date '+%Y-%m-%d %H:%M:%S')] $1" | tee -a "$LOG_FILE"
}

log "Starting Podman backup"

notify_backup_result() {
    local status="$1"
    local message="$2"

    # Webhook notification (Slack, Discord, etc.)
    if [ -n "${WEBHOOK_URL:-}" ]; then
        curl -s -X POST "$WEBHOOK_URL" \
            -H "Content-Type: application/json" \
            -d "{
                \"text\": \"Podman Backup $status on $(hostname): $message\"
            }" || true
    fi

    # Email notification
    if command -v mail &> /dev/null && [ -n "${NOTIFY_EMAIL:-}" ]; then
        echo "$message" | mail -s "Podman Backup $status - $(hostname)" "$NOTIFY_EMAIL" || true
    fi
}

trap 'notify_backup_result "FAILURE" "Backup failed. Check $LOG_FILE for details."' ERR

# ---- Backup Containers ----
log "Backing up containers..."
for container in $(podman ps -a --format "{{.Names}}"); do
    log "  Container: $container"

    # Export filesystem
    podman export "$container" | gzip > "$BACKUP_DIR/containers/${container}.tar.gz" 2>> "$LOG_FILE"

    # Save metadata
    podman inspect "$container" > "$BACKUP_DIR/containers/${container}-inspect.json" 2>> "$LOG_FILE"

    # Save logs
    podman logs "$container" > "$BACKUP_DIR/containers/${container}.log" 2>&1 || true

    log "  Done: $container"
done

# ---- Backup Volumes ----
log "Backing up volumes..."
for volume in $(podman volume ls -q); do
    log "  Volume: $volume"

    podman volume export "$volume" | gzip > "$BACKUP_DIR/volumes/${volume}.tar.gz" 2>> "$LOG_FILE"

    # Save volume metadata
    podman volume inspect "$volume" > "$BACKUP_DIR/volumes/${volume}-inspect.json" 2>> "$LOG_FILE"

    log "  Done: $volume"
done

# ---- Backup Images ----
log "Backing up images..."
while read -r image; do
    SAFE_NAME=$(echo "$image" | tr '/:' '_')
    log "  Image: $image"

    podman save "$image" | gzip > "$BACKUP_DIR/images/${SAFE_NAME}.tar.gz" 2>> "$LOG_FILE"

    log "  Done: $image"
done < <(podman images --format "{{.Repository}}:{{.Tag}}" | grep -v "<none>" || true)

# ---- Generate Manifest ----
log "Generating manifest..."
cat > "$BACKUP_DIR/manifest.json" << EOF
{
    "timestamp": "$TIMESTAMP",
    "hostname": "$(hostname)",
    "podman_version": "$(podman --version)",
    "containers": $(podman ps -a --format json),
    "volumes": $(podman volume ls --format json),
    "images": $(podman images --format json)
}
EOF

# ---- Calculate Backup Size ----
TOTAL_SIZE=$(du -sh "$BACKUP_DIR" | cut -f1)
log "Backup complete: $BACKUP_DIR ($TOTAL_SIZE)"

# ---- Apply Retention Policy ----
log "Applying retention policy (keep $RETENTION_DAYS days, min $MIN_BACKUPS backups)..."
BACKUP_COUNT=$(find "$BACKUP_ROOT" -maxdepth 1 -type d -name "2*" | wc -l)

if [ "$BACKUP_COUNT" -gt "$MIN_BACKUPS" ]; then
    find "$BACKUP_ROOT" -maxdepth 1 -type d -name "2*" -printf '%T@ %p\n' | \
        sort -rn | tail -n +$((MIN_BACKUPS + 1)) | cut -d' ' -f2- | while read -r old_backup; do
        if [ -n "$(find "$old_backup" -maxdepth 0 -mtime +$RETENTION_DAYS -print)" ]; then
            log "  Removing old backup: $old_backup"
            rm -rf "$old_backup"
        fi
    done
fi

# ---- Cleanup old log files ----
find "$BACKUP_ROOT" -name "backup-*.log" -mtime +$RETENTION_DAYS -delete

log "Backup process complete"
notify_backup_result "SUCCESS" "Backup completed: $TOTAL_SIZE at $BACKUP_DIR"
```

Make it executable:

```bash
chmod +x /usr/local/bin/podman-backup.sh
```

## Setting Up Cron Jobs

### Basic cron schedule

```bash
# Edit crontab
crontab -e

# Add backup schedules
# Daily full backup at 2 AM
0 2 * * * /usr/local/bin/podman-backup.sh >> /var/log/podman-backup-cron.log 2>&1

# Hourly volume-only backup for databases
0 * * * * /usr/local/bin/podman-backup-volumes.sh >> /var/log/podman-backup-volumes-cron.log 2>&1
```

### Volume-only backup script for frequent runs

```bash
#!/bin/bash
# /usr/local/bin/podman-backup-volumes.sh
# Quick backup of volumes only (for hourly runs)

set -euo pipefail

BACKUP_DIR="/backups/podman-volumes/$(date +%Y%m%d-%H%M%S)"
mkdir -p "$BACKUP_DIR"

for volume in $(podman volume ls -q); do
    podman volume export "$volume" | gzip > "$BACKUP_DIR/${volume}.tar.gz"
done

# Keep only last 48 hourly backups
ls -dt /backups/podman-volumes/*/ 2>/dev/null | tail -n +49 | xargs rm -rf 2>/dev/null || true
```

## Setting Up Systemd Timers

Systemd timers offer advantages over cron: better logging, dependency management, and monitoring. Create two files:

### The service unit

```ini
# /etc/systemd/system/podman-backup.service
[Unit]
Description=Podman Container Backup
Wants=network-online.target
After=network-online.target

[Service]
Type=oneshot
ExecStart=/usr/local/bin/podman-backup.sh
StandardOutput=journal
StandardError=journal
TimeoutStartSec=3600
```

### The timer unit

```ini
# /etc/systemd/system/podman-backup.timer
[Unit]
Description=Run Podman Backup Daily

[Timer]
OnCalendar=*-*-* 02:00:00
Persistent=true
RandomizedDelaySec=300

[Install]
WantedBy=timers.target
```

Enable and start the timer:

```bash
sudo systemctl daemon-reload
sudo systemctl enable podman-backup.timer
sudo systemctl start podman-backup.timer

# Check the timer status
sudo systemctl list-timers podman-backup.timer
```

The `Persistent=true` option ensures that if the system was powered off during the scheduled backup time, the backup runs as soon as the system starts.

## Database-Aware Backups

For database containers, use application-level backup tools instead of raw volume copies:

```bash
#!/bin/bash
# /usr/local/bin/podman-backup-databases.sh

BACKUP_DIR="/backups/databases/$(date +%Y%m%d-%H%M%S)"
mkdir -p "$BACKUP_DIR"

# PostgreSQL
POSTGRES_CONTAINER=$(podman ps --format "{{.Names}}" | grep -m1 "postgres" || true)
if [ -n "$POSTGRES_CONTAINER" ]; then
    echo "Backing up PostgreSQL..."
    podman exec "$POSTGRES_CONTAINER" pg_dumpall -U postgres | \
        gzip > "$BACKUP_DIR/postgres-all.sql.gz"
fi

# MySQL/MariaDB
MYSQL_CONTAINER=$(podman ps --format "{{.Names}}" | grep -m1 "mysql\|mariadb" || true)
if [ -n "$MYSQL_CONTAINER" ]; then
    echo "Backing up MySQL..."
    podman exec "$MYSQL_CONTAINER" mysqldump -u root \
        -p"${MYSQL_ROOT_PASSWORD}" \
        --all-databases | gzip > "$BACKUP_DIR/mysql-all.sql.gz"
fi

# MongoDB
MONGO_CONTAINER=$(podman ps --format "{{.Names}}" | grep -m1 "mongo" || true)
if [ -n "$MONGO_CONTAINER" ]; then
    echo "Backing up MongoDB..."
    podman exec "$MONGO_CONTAINER" mongodump --archive | \
        gzip > "$BACKUP_DIR/mongo-all.archive.gz"
fi

# Redis
REDIS_CONTAINER=$(podman ps --format "{{.Names}}" | grep -m1 "redis" || true)
if [ -n "$REDIS_CONTAINER" ]; then
    echo "Backing up Redis..."
    podman exec "$REDIS_CONTAINER" redis-cli BGSAVE
    while [ "$(podman exec "$REDIS_CONTAINER" redis-cli INFO persistence | awk -F: '/rdb_bgsave_in_progress/ {gsub(/\r/, "", $2); print $2}')" = "1" ]; do
        sleep 1
    done
    podman cp "$REDIS_CONTAINER":/data/dump.rdb "$BACKUP_DIR/redis-dump.rdb"
fi

echo "Database backup complete: $BACKUP_DIR"
```

## Adding Notifications

Add email or webhook notifications to your backup script:

```bash
#!/bin/bash
# Add near the top of podman-backup.sh, after LOG_FILE is defined

notify_backup_result() {
    local status="$1"
    local message="$2"

    # Webhook notification (Slack, Discord, etc.)
    if [ -n "${WEBHOOK_URL:-}" ]; then
        curl -s -X POST "$WEBHOOK_URL" \
            -H "Content-Type: application/json" \
            -d "{
                \"text\": \"Podman Backup $status on $(hostname): $message\"
            }" || true
    fi

    # Email notification
    if command -v mail &> /dev/null && [ -n "${NOTIFY_EMAIL:-}" ]; then
        echo "$message" | mail -s "Podman Backup $status - $(hostname)" "$NOTIFY_EMAIL" || true
    fi
}

trap 'notify_backup_result "FAILURE" "Backup failed. Check $LOG_FILE for details."' ERR

# Call at the end of the backup script after TOTAL_SIZE is calculated
notify_backup_result "SUCCESS" "Backup completed: $TOTAL_SIZE at $BACKUP_DIR"
```

## Backup Verification

Periodically verify that backups can be restored:

```bash
#!/bin/bash
# /usr/local/bin/podman-backup-verify.sh
# Run weekly to test backup integrity

LATEST_BACKUP=$(ls -dt /backups/podman/2*/ | head -1)

if [ -z "$LATEST_BACKUP" ]; then
    echo "ERROR: No backups found"
    exit 1
fi

echo "Verifying backup: $LATEST_BACKUP"
ERRORS=0

# Check all tar archives
while read -r archive; do
    if ! gzip -t "$archive" 2>/dev/null; then
        echo "CORRUPTED: $archive"
        ERRORS=$((ERRORS + 1))
    fi
done < <(find "$LATEST_BACKUP" -name "*.tar.gz")

# Try loading a random image backup
IMAGE_BACKUP=$(find "$LATEST_BACKUP/images" -name "*.tar.gz" | shuf -n 1)
if [ -n "$IMAGE_BACKUP" ]; then
    gunzip -c "$IMAGE_BACKUP" | podman load > /dev/null 2>&1
    if [ $? -eq 0 ]; then
        echo "Image restore test: PASSED"
    else
        echo "Image restore test: FAILED"
        ERRORS=$((ERRORS + 1))
    fi
fi

# Check manifest exists
if [ -f "$LATEST_BACKUP/manifest.json" ]; then
    echo "Manifest: present"
else
    echo "Manifest: MISSING"
    ERRORS=$((ERRORS + 1))
fi

if [ $ERRORS -eq 0 ]; then
    echo "Verification: ALL PASSED"
else
    echo "Verification: $ERRORS ERRORS FOUND"
    exit 1
fi
```

Schedule verification weekly:

```bash
# Add to crontab
0 6 * * 0 /usr/local/bin/podman-backup-verify.sh >> /var/log/podman-backup-verify.log 2>&1
```

## Off-Site Backup Sync

Automate pushing backups to a remote location:

```bash
#!/bin/bash
# /usr/local/bin/podman-backup-sync.sh

BACKUP_ROOT="/backups/podman"
REMOTE="backup-server:/backups/podman/"

# Sync only the latest backup
LATEST=$(ls -dt "$BACKUP_ROOT"/2*/ | head -1)

if [ -n "$LATEST" ]; then
    rsync -avz --progress "$LATEST" "$REMOTE"
    echo "Synced: $LATEST -> $REMOTE"
fi
```

## Conclusion

Automated backups eliminate the human factor that causes backup strategies to fail. Use cron or systemd timers to schedule regular runs, implement retention policies to manage storage, verify backups weekly, and sync to off-site storage. The initial setup takes an hour, but it protects you permanently. Every day without automated backups is a day you are gambling that nothing will go wrong.
