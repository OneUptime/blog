# How to Use BorgBackup for Deduplicated Backups on Ubuntu

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Ubuntu, Backups, BorgBackup, Deduplication

Description: A practical guide to setting up BorgBackup on Ubuntu for space-efficient deduplicated and encrypted backups with automated scheduling.

---

BorgBackup (Borg) is a deduplicating backup program with optional compression and encryption. The deduplication is what sets it apart - Borg splits data into variable-length chunks and only stores unique chunks, so if you back up the same 10 GB database every night, Borg only stores the changed portions rather than 10 GB each time. This results in dramatically smaller backup archives compared to traditional tools.

## Installing BorgBackup

Borg is available in the Ubuntu repositories, though the version there may be older. Installing from the official PPA gives you the latest stable release:

```bash
# Install from Ubuntu repositories (simpler, slightly older)
sudo apt update
sudo apt install borgbackup

# Verify installation
borg --version
```

For the latest version, use pip in a virtual environment:

```bash
sudo apt install python3-pip python3-venv
python3 -m venv /opt/borg-env
/opt/borg-env/bin/pip install borgbackup
ln -s /opt/borg-env/bin/borg /usr/local/bin/borg
```

## Initializing a Borg Repository

Before you can create backups, you need to initialize a repository. This is the directory where all backup data is stored.

```bash
# Initialize a local repository with repokey encryption
# The passphrase protects your encryption key
borg init --encryption=repokey /mnt/backup/borg-repo

# Initialize a remote repository over SSH
borg init --encryption=repokey user@backup-server:/backups/borg-repo
```

Borg offers several encryption modes:
- `repokey` - encryption key stored in the repository (easiest, but export and save the key separately)
- `keyfile` - encryption key stored on the client machine
- `none` - no encryption (not recommended for sensitive data)

**Always export and store your key in a safe location separate from the backup:**

```bash
# Export the repository key - store this somewhere safe!
borg key export /mnt/backup/borg-repo /root/borg-key-backup.txt
```

## Creating Your First Backup Archive

Each backup in Borg is called an "archive" within the repository. Archives are named, typically with a timestamp:

```bash
# Create a backup archive of /home and /etc
borg create \
  --verbose \
  --filter AME \
  --list \
  --stats \
  --show-rc \
  --compression lz4 \
  --exclude-caches \
  --exclude '/home/*/.cache/*' \
  --exclude '/home/*/.local/share/Trash/*' \
  /mnt/backup/borg-repo::'{hostname}-{now:%Y-%m-%dT%H:%M:%S}' \
  /home \
  /etc

# This creates an archive named like: myserver-2026-03-02T14:30:00
```

Flag explanations:
- `--filter AME` - show Added, Modified, and Error files in the listing
- `--compression lz4` - fast compression (alternatives: `zstd`, `lzma` for better ratios)
- `--exclude-caches` - skip directories containing a CACHEDIR.TAG file
- `::'{hostname}-{now:%Y-%m-%dT%H:%M:%S}'` - archive naming pattern

## Listing and Inspecting Archives

```bash
# List all archives in the repository
borg list /mnt/backup/borg-repo

# List contents of a specific archive
borg list /mnt/backup/borg-repo::myserver-2026-03-02T14:30:00

# Show repository information including deduplication statistics
borg info /mnt/backup/borg-repo

# Show info for a specific archive
borg info /mnt/backup/borg-repo::myserver-2026-03-02T14:30:00
```

The `borg info` output shows you the real power of deduplication:

```text
Original size      Compressed size    Deduplicated size
This archive:   15.23 GB             8.12 GB            512.34 MB
All archives:   152.3 GB             81.2 GB             9.87 GB
```

152 GB of data across 10 archives stored in under 10 GB on disk - that is deduplication working correctly.

## Restoring Files from a Borg Archive

Borg can restore individual files or entire archives:

```bash
# Mount an archive as a filesystem to browse and restore selectively
mkdir /tmp/borg-mount
borg mount /mnt/backup/borg-repo::myserver-2026-03-02T14:30:00 /tmp/borg-mount

# Now browse and copy files normally
ls /tmp/borg-mount/
cp /tmp/borg-mount/etc/nginx/nginx.conf /etc/nginx/nginx.conf

# Unmount when done
borg umount /tmp/borg-mount

# Extract an entire archive to current directory
cd /tmp/restore
borg extract /mnt/backup/borg-repo::myserver-2026-03-02T14:30:00

# Extract specific paths only
borg extract /mnt/backup/borg-repo::myserver-2026-03-02T14:30:00 home/username/documents
```

## Pruning Old Archives

Without pruning, archives accumulate forever. Borg's `prune` command removes old archives based on a retention policy:

```bash
# Keep: 7 daily, 4 weekly, 6 monthly backups
# --dry-run shows what would be deleted without actually deleting
borg prune \
  --list \
  --prefix '{hostname}-' \
  --show-rc \
  --keep-daily 7 \
  --keep-weekly 4 \
  --keep-monthly 6 \
  /mnt/backup/borg-repo

# Run without --dry-run to actually prune
borg prune \
  --list \
  --prefix '{hostname}-' \
  --keep-daily 7 \
  --keep-weekly 4 \
  --keep-monthly 6 \
  /mnt/backup/borg-repo

# After pruning, run compact to free disk space
borg compact /mnt/backup/borg-repo
```

## Writing an Automated Backup Script

```bash
sudo nano /usr/local/bin/borg-backup.sh
```

```bash
#!/bin/bash
# BorgBackup automated backup script
# Run daily via cron or systemd timer

# Exit on any error
set -euo pipefail

# Configuration
BORG_REPO="/mnt/backup/borg-repo"
export BORG_PASSPHRASE="your-secure-passphrase-here"

# Log function
log() { echo "[$(date '+%Y-%m-%d %H:%M:%S')] $*"; }

log "Starting Borg backup to $BORG_REPO"

# Create new archive
borg create \
    --verbose \
    --filter AME \
    --list \
    --stats \
    --show-rc \
    --compression lz4 \
    --exclude-caches \
    --exclude '/home/*/.cache/*' \
    --exclude '/home/*/.local/share/Trash/*' \
    --exclude '/home/*/.mozilla/firefox/*/Cache/*' \
    --exclude '/var/cache/*' \
    --exclude '/tmp/*' \
    "$BORG_REPO::$(hostname)-{now:%Y-%m-%dT%H:%M:%S}" \
    /home \
    /etc \
    /var/www \
    /opt

log "Archive creation finished, starting prune"

# Prune old archives
borg prune \
    --list \
    --prefix "$(hostname)-" \
    --show-rc \
    --keep-daily 7 \
    --keep-weekly 4 \
    --keep-monthly 6 \
    "$BORG_REPO"

log "Pruning complete, starting compaction"

# Free up space from pruned archives
borg compact "$BORG_REPO"

log "Backup complete"
```

Make it executable:

```bash
sudo chmod +x /usr/local/bin/borg-backup.sh
```

## Scheduling with systemd Timer

systemd timers are more reliable than cron for backup tasks because they can catch up on missed runs:

```bash
sudo nano /etc/systemd/system/borg-backup.service
```

```ini
[Unit]
Description=BorgBackup System Backup
After=network-online.target
Wants=network-online.target

[Service]
Type=oneshot
ExecStart=/usr/local/bin/borg-backup.sh
StandardOutput=journal
StandardError=journal
```

```bash
sudo nano /etc/systemd/system/borg-backup.timer
```

```ini
[Unit]
Description=Run BorgBackup daily at 2 AM

[Timer]
OnCalendar=*-*-* 02:00:00
RandomizedDelaySec=30m
Persistent=true

[Install]
WantedBy=timers.target
```

Enable and start the timer:

```bash
sudo systemctl daemon-reload
sudo systemctl enable borg-backup.timer
sudo systemctl start borg-backup.timer

# Check timer status
sudo systemctl list-timers borg-backup.timer
```

## Checking Repository Health

Run `borg check` periodically to verify repository integrity:

```bash
# Quick consistency check
borg check /mnt/backup/borg-repo

# Full data verification (reads all chunks - slow but thorough)
borg check --verify-data /mnt/backup/borg-repo
```

Schedule the check monthly:

```bash
# Add to root's crontab
0 3 1 * * borg check /mnt/backup/borg-repo >> /var/log/borg-check.log 2>&1
```

## Setting Up BORG_PASSPHRASE Securely

Storing the passphrase in the script is convenient but not ideal for security. A better approach is to use a passphrase file with restricted permissions:

```bash
# Create passphrase file readable only by root
echo "your-secure-passphrase-here" | sudo tee /etc/borg-passphrase > /dev/null
sudo chmod 600 /etc/borg-passphrase
sudo chown root:root /etc/borg-passphrase
```

Then in your script, replace the passphrase export with:

```bash
export BORG_PASSPHRASE=$(cat /etc/borg-passphrase)
```

BorgBackup combines deduplication, encryption, and compression into a tool that dramatically reduces backup storage requirements while keeping your data secure. Once the initial setup is done, it runs reliably in the background with minimal maintenance.
