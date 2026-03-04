# How to Set Up Cross-Site Backup Replication on Ubuntu

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Ubuntu, Backups, Replication, Disaster Recovery, rsync

Description: Configure cross-site backup replication on Ubuntu to maintain synchronized copies of your backups across geographically separated locations using rsync and automation.

---

Cross-site backup replication ensures that your backup data exists in at least two physically separate locations. If your primary datacenter suffers a catastrophic failure - power outage, fire, network outage, or ransomware - you can recover from the secondary site without data loss. This guide covers setting up automatic replication between two Ubuntu servers in different locations using rsync over SSH, with monitoring and alerting.

## Architecture

The typical cross-site replication setup has:

- **Primary site** - where backups are created and initially stored
- **Secondary site** - a replica that receives data from the primary
- **Replication job** - a scheduled process that syncs changes from primary to secondary

You can also implement bidirectional replication where each site backs up its own data locally, and both sites sync to each other. This guide covers one-directional replication first (simpler), then discusses bidirectional.

## Setting Up SSH Key Authentication

Replication runs unattended, so password-less SSH authentication is required:

```bash
# On the primary site server - generate a dedicated replication key
sudo -u backup ssh-keygen -t ed25519 -f /home/backup/.ssh/replication_key -N ""

# Copy the public key to the secondary site
ssh-copy-id -i /home/backup/.ssh/replication_key.pub backup@secondary-site.example.com

# Test that the connection works without a password
sudo -u backup ssh -i /home/backup/.ssh/replication_key backup@secondary-site.example.com echo "Connection OK"
```

Restrict the SSH key on the secondary site to only allow rsync:

```bash
# On secondary site - edit authorized_keys
sudo nano /home/backup/.ssh/authorized_keys

# Prepend this to the key line:
# command="rrsync /backups/",no-agent-forwarding,no-port-forwarding,no-pty,no-user-rc,no-X11-forwarding
```

This `command=` restriction means the key can only run rsync to the specified directory, limiting the blast radius if the key is ever compromised.

## Basic Replication with rsync

The core replication command:

```bash
#!/bin/bash
# /usr/local/bin/replicate-backups.sh

# Configuration
PRIMARY_BACKUP_DIR="/backups"
SECONDARY_HOST="backup@secondary-site.example.com"
SECONDARY_DIR="/backups/primary-site-replica"
SSH_KEY="/home/backup/.ssh/replication_key"
LOG_FILE="/var/log/backup-replication.log"
LOCK_FILE="/var/run/backup-replication.lock"

# Prevent concurrent runs
if [ -e "$LOCK_FILE" ]; then
    echo "$(date): Replication already running, skipping" | tee -a "$LOG_FILE"
    exit 1
fi
touch "$LOCK_FILE"
trap "rm -f $LOCK_FILE" EXIT

echo "$(date): Starting replication to $SECONDARY_HOST" | tee -a "$LOG_FILE"

rsync \
    --archive \
    --compress \
    --checksum \
    --delete \
    --delete-delay \
    --partial \
    --partial-dir=.rsync-partial \
    --progress \
    --stats \
    --log-file="$LOG_FILE" \
    --rsh="ssh -i $SSH_KEY -o StrictHostKeyChecking=yes" \
    "$PRIMARY_BACKUP_DIR/" \
    "$SECONDARY_HOST:$SECONDARY_DIR/"

STATUS=$?

if [ $STATUS -eq 0 ]; then
    echo "$(date): Replication completed successfully" | tee -a "$LOG_FILE"
else
    echo "$(date): Replication FAILED with exit code $STATUS" | tee -a "$LOG_FILE"
    echo "Backup replication failed on $(hostname)" | \
        mail -s "ALERT: Backup replication failure" admin@example.com
fi

exit $STATUS
```

```bash
sudo chmod +x /usr/local/bin/replicate-backups.sh
```

## Understanding rsync Flags

The flags above are chosen deliberately:

```text
--archive      Preserves permissions, timestamps, symlinks, owner/group
--compress     Compresses during transfer (saves bandwidth)
--checksum     Verifies files using checksums, not just timestamp/size
--delete       Remove files on secondary that were removed on primary
--delete-delay Collect deletions and apply them after transfer (safer)
--partial      Keep partially transferred files (resume interrupted transfers)
```

For large backup repositories, `--checksum` can be slow. Use it for initial sync, then switch to the default timestamp/size comparison for routine replication.

## Bandwidth Throttling

If replication runs during business hours or over a metered connection, limit bandwidth:

```bash
# Limit to 10 MB/s
rsync --bwlimit=10240 [other options...]

# Or use ionice and cpulimit to reduce system impact
ionice -c 3 nice -n 19 rsync [options...]
```

## Setting Up Systemd Timer

```bash
sudo nano /etc/systemd/system/backup-replication.service
```

```ini
[Unit]
Description=Cross-site backup replication
After=network.target

[Service]
Type=oneshot
User=backup
ExecStart=/usr/local/bin/replicate-backups.sh
TimeoutStartSec=4h
StandardOutput=journal
StandardError=journal
```

```bash
sudo nano /etc/systemd/system/backup-replication.timer
```

```ini
[Unit]
Description=Run backup replication every 4 hours

[Timer]
OnCalendar=0/4:00:00
RandomizedDelaySec=15min
Persistent=true

[Install]
WantedBy=timers.target
```

```bash
sudo systemctl enable backup-replication.timer
sudo systemctl start backup-replication.timer
```

## Incremental Replication with Hard Links

For very large backup sets, use rsync's `--link-dest` option to create incremental snapshots on the secondary site without duplicating unchanged files:

```bash
#!/bin/bash
# Incremental replication with historical snapshots

REMOTE="backup@secondary.example.com"
REMOTE_DIR="/backups/snapshots"
SSH_KEY="/home/backup/.ssh/replication_key"
SNAPSHOT_NAME="$(date +%Y-%m-%d-%H%M)"
LINK_DEST="$REMOTE_DIR/latest"

rsync \
    --archive \
    --compress \
    --link-dest="$LINK_DEST" \
    --rsh="ssh -i $SSH_KEY" \
    /backups/ \
    "$REMOTE:$REMOTE_DIR/$SNAPSHOT_NAME/"

# Update the "latest" symlink on the remote
ssh -i "$SSH_KEY" "$REMOTE" \
    "ln -sfn $REMOTE_DIR/$SNAPSHOT_NAME $REMOTE_DIR/latest"
```

This creates dated snapshots on the secondary site where unchanged files are hard-linked (no extra disk space), but you can browse any historical snapshot as if it were a complete backup.

## Bidirectional Replication

When both sites have their own local data:

```bash
#!/bin/bash
# /usr/local/bin/bidirectional-sync.sh
# Run at Site A to sync Site B's data to local

SITE_B_HOST="backup@site-b.example.com"
SITE_B_BACKUP_DIR="/backups"
LOCAL_REPLICA_DIR="/backups/site-b-replica"

rsync \
    --archive \
    --compress \
    --delete \
    --rsh="ssh -i /home/backup/.ssh/replication_key" \
    "$SITE_B_HOST:$SITE_B_BACKUP_DIR/" \
    "$LOCAL_REPLICA_DIR/"
```

Run the equivalent script at Site B for Site A's data.

## Monitoring Replication Lag

Check when the last successful replication ran:

```bash
# Check last successful rsync timestamp
stat /backups/.last-replication-success

# Script to alert if replication is overdue
#!/bin/bash
THRESHOLD=14400  # 4 hours in seconds
LAST_SUCCESS=$(stat -c %Y /backups/.last-replication-success 2>/dev/null || echo 0)
CURRENT_TIME=$(date +%s)
AGE=$((CURRENT_TIME - LAST_SUCCESS))

if [ $AGE -gt $THRESHOLD ]; then
    echo "Replication has not succeeded in $((AGE/3600)) hours" | \
        mail -s "ALERT: Backup replication overdue" admin@example.com
fi
```

Update the timestamp file at the end of each successful replication:

```bash
# Add to replicate-backups.sh after successful rsync
touch /backups/.last-replication-success
```

## Verifying Replica Integrity

Periodically verify the secondary site has the expected data:

```bash
# Compare file counts between sites
LOCAL_COUNT=$(find /backups -type f | wc -l)
REMOTE_COUNT=$(ssh backup@secondary.example.com "find /backups/primary-site-replica -type f | wc -l")

echo "Local files: $LOCAL_COUNT"
echo "Remote files: $REMOTE_COUNT"

if [ "$LOCAL_COUNT" != "$REMOTE_COUNT" ]; then
    echo "File count mismatch - replication may be incomplete"
fi

# Use rsync --dry-run to see what would be transferred (should be nothing)
rsync --dry-run --archive --checksum \
    --rsh="ssh -i /home/backup/.ssh/replication_key" \
    /backups/ \
    backup@secondary.example.com:/backups/primary-site-replica/
```

Cross-site replication is only useful if you have tested recovering from the secondary site. Schedule a quarterly recovery drill where you simulate the primary site being unavailable and walk through the recovery process using only the secondary site's data.
