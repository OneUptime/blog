# How to Implement a 3-2-1 Backup Strategy for RHEL Servers

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: RHEL, Backup Strategy, 3-2-1, Disaster Recovery, Best Practices, Linux

Description: Implement the 3-2-1 backup strategy on RHEL servers: three copies of data, on two different media types, with one copy offsite.

---

The 3-2-1 backup rule states: keep 3 copies of your data, on 2 different storage types, with 1 copy offsite. This strategy protects against hardware failure, site disasters, and data corruption.

## The Three Copies

### Copy 1: Production Data (Live System)

This is the data on your RHEL server in daily use.

### Copy 2: Local Backup (Different Media)

Create a daily backup to a local NAS or dedicated backup disk:

```bash
#!/bin/bash
# /usr/local/bin/local-backup.sh
# Copy 2: Local backup to NAS

BACKUP_DIR="/mnt/nas/backups/$(hostname)"
DATE=$(date +%Y-%m-%d)

# Mount the NAS if not already mounted
mountpoint -q /mnt/nas || mount -t nfs nas.local:/backup /mnt/nas

# Create incremental backup using rsync with hard links
rsync -az --delete \
  --link-dest="${BACKUP_DIR}/latest" \
  --exclude='/proc' --exclude='/sys' --exclude='/dev' \
  --exclude='/run' --exclude='/tmp' \
  / "${BACKUP_DIR}/${DATE}/"

# Update the latest symlink
ln -snf "${BACKUP_DIR}/${DATE}" "${BACKUP_DIR}/latest"

echo "Local backup completed: ${BACKUP_DIR}/${DATE}"
```

### Copy 3: Offsite Backup (Remote Location)

Send a copy to a remote server at a different physical location:

```bash
#!/bin/bash
# /usr/local/bin/offsite-backup.sh
# Copy 3: Offsite backup to remote datacenter

REMOTE="backupuser@offsite-dc.example.com"
REMOTE_DIR="/backup/$(hostname)"
SSH_KEY="/root/.ssh/offsite_backup_key"

# Send a compressed archive to the offsite location
tar czf - \
  --exclude=/proc --exclude=/sys --exclude=/dev \
  --exclude=/run --exclude=/tmp \
  / | \
  ssh -i "$SSH_KEY" "$REMOTE" \
  "cat > ${REMOTE_DIR}/full-backup-$(date +%Y%m%d).tar.gz"

echo "Offsite backup completed"
```

## Scheduling All Three Backups

```bash
# /etc/cron.d/3-2-1-backup
# Local backup runs nightly at 1 AM
0 1 * * * root /usr/local/bin/local-backup.sh >> /var/log/backup.log 2>&1

# Offsite backup runs nightly at 3 AM (after local completes)
0 3 * * * root /usr/local/bin/offsite-backup.sh >> /var/log/backup.log 2>&1

# Weekly ReaR disaster recovery image on Sundays
0 5 * * 0 root /usr/sbin/rear mkbackup >> /var/log/rear-backup.log 2>&1
```

## Retention Policy

Implement a retention policy that keeps recent backups longer:

```bash
# /usr/local/bin/cleanup-backups.sh
BACKUP_DIR="/mnt/nas/backups/$(hostname)"

# Keep daily backups for 7 days
find "$BACKUP_DIR" -maxdepth 1 -type d -mtime +7 -name "20*" -exec rm -rf {} \;

# On the offsite server, keep monthly backups for 1 year
ssh -i /root/.ssh/offsite_backup_key backupuser@offsite-dc.example.com \
  "find /backup/$(hostname) -mtime +30 -name '*.tar.gz' -delete"
```

## Verification

Test your 3-2-1 strategy monthly by restoring from each backup location to confirm all three copies are valid and restorable.
