# How to Configure Borg Backup over IPv6

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Borg Backup, IPv6, Backup, SSH, Deduplication, Linux, BorgBase

Description: Configure BorgBackup to create deduplicated, encrypted backups over IPv6 using SSH transport, covering remote repository setup and automation on IPv6 networks.

---

BorgBackup (borg) is a deduplicating, encrypting backup tool. It uses SSH for remote repository access, making IPv6 support straightforward - you just need to use the correct SSH syntax for IPv6 addresses.

## Installing BorgBackup

```bash
# Ubuntu/Debian

sudo apt install borgbackup -y

# RHEL/CentOS (with EPEL enabled)
sudo dnf install borgbackup -y

# Verify installation
borg --version
```

## SSH Configuration for IPv6 Borg

Borg uses SSH for remote connections. Configure SSH for easier IPv6 access:

```bash
# ~/.ssh/config
Host borg-server
    HostName 2001:db8::1
    User borguser
    IdentityFile ~/.ssh/borg_key
    AddressFamily inet6      # Force IPv6
    ServerAliveInterval 30
    ServerAliveCountMax 3
```

## Initializing a Borg Repository over IPv6

```bash
# Initialize repository using hostname alias (from SSH config)
borg init \
  --encryption=repokey \
  ssh://borguser@borg-server/backups/myhost

# Initialize using IPv6 address directly
# Note: brackets around the IPv6 address in the repository URL
borg init \
  --encryption=repokey \
  ssh://borguser@[2001:db8::1]:22/backups/myhost

# Or using the default SSH port
borg init \
  --encryption=repokey \
  ssh://borguser@[2001:db8::1]/backups/myhost
```

## Creating Backups over IPv6

```bash
# Create a backup archive using the SSH config alias
BORG_PASSPHRASE="YourPassphrase" borg create \
  --verbose \
  --filter AME \
  --list \
  --stats \
  --show-rc \
  --compression lz4 \
  --exclude-caches \
  --exclude '/home/*/.cache' \
  --exclude '/var/tmp' \
  ssh://borguser@borg-server/backups/myhost::'{hostname}-{now}' \
  /etc \
  /home \
  /var/www

# Create backup with IPv6 address in path
BORG_PASSPHRASE="YourPassphrase" borg create \
  --verbose \
  --compression lz4 \
  "ssh://borguser@[2001:db8::1]/backups/myhost::$(hostname)-$(date +%Y%m%d)" \
  /etc /home
```

## Listing and Verifying Backups

```bash
# List all backups in the repository
BORG_PASSPHRASE="YourPassphrase" borg list \
  ssh://borguser@borg-server/backups/myhost

# Show details of a specific archive
BORG_PASSPHRASE="YourPassphrase" borg info \
  ssh://borguser@borg-server/backups/myhost::myhost-20260320

# Verify archive integrity
BORG_PASSPHRASE="YourPassphrase" borg check \
  ssh://borguser@borg-server/backups/myhost
```

## Restoring Data over IPv6

```bash
# Extract all files from an archive
BORG_PASSPHRASE="YourPassphrase" borg extract \
  ssh://borguser@borg-server/backups/myhost::myhost-20260320

# Extract specific path
BORG_PASSPHRASE="YourPassphrase" borg extract \
  ssh://borguser@borg-server/backups/myhost::myhost-20260320 \
  etc/nginx

# Mount archive for file browsing
BORG_PASSPHRASE="YourPassphrase" borg mount \
  ssh://borguser@borg-server/backups/myhost::myhost-20260320 \
  /mnt/borg
```

## Automated Backup Script over IPv6

```bash
#!/bin/bash
# borg_backup_ipv6.sh

# Configuration
export BORG_PASSPHRASE="YourPassphrase"
BORG_REPO="ssh://borguser@borg-server/backups/myhost"
LOG="/var/log/borg-backup.log"

# Archive name with timestamp
ARCHIVE="${BORG_REPO}::$(hostname)-$(date +%Y%m%d-%H%M%S)"

echo "$(date): Starting Borg backup to $BORG_REPO" >> "$LOG"

# Create backup
borg create \
  --verbose \
  --stats \
  --compression lz4 \
  --exclude-caches \
  "$ARCHIVE" \
  /etc \
  /home \
  /var/www \
  >> "$LOG" 2>&1

BACKUP_EXIT=$?

# Prune old backups
borg prune \
  --list \
  --glob-archives "$(hostname)-*" \
  --keep-daily 7 \
  --keep-weekly 4 \
  --keep-monthly 12 \
  "$BORG_REPO" \
  >> "$LOG" 2>&1

if [ $BACKUP_EXIT -eq 0 ]; then
  echo "$(date): Backup completed successfully" >> "$LOG"
else
  echo "$(date): Backup FAILED with exit $BACKUP_EXIT" >> "$LOG"
fi
```

## Setting Up cron for Automated IPv6 Borg Backups

```bash
# Add to crontab
crontab -e

# Daily backup at 2am
0 2 * * * /usr/local/bin/borg_backup_ipv6.sh 2>&1
```

BorgBackup's reliance on SSH for remote connections makes IPv6 support seamless - correctly configured SSH keys and host aliases eliminate the need for special IPv6-specific borg syntax in most use cases.
