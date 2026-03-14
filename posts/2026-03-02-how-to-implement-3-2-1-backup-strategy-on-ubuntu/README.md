# How to Implement 3-2-1 Backup Strategy on Ubuntu

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Ubuntu, Backup, Disaster Recovery, Rsync, Data Protection

Description: Learn how to implement the 3-2-1 backup strategy on Ubuntu using rsync, borgbackup, and cloud storage to protect your data against loss and corruption.

---

The 3-2-1 backup strategy is a widely recognized data protection model: keep at least **3** copies of data, on at least **2** different storage media types, with at least **1** copy offsite. This simple rule protects against the most common failure scenarios - disk failure, fire or theft at a physical location, and accidental deletion. On Ubuntu, you can implement this strategy using a combination of rsync, BorgBackup, and cloud storage tools without spending money on commercial backup software.

## Understanding the 3-2-1 Model

Here is how 3-2-1 maps to a practical Ubuntu setup:

- **Copy 1** - The live data on your primary server
- **Copy 2** - A local backup on a separate drive or NAS (different physical media)
- **Copy 3** - An offsite backup in cloud storage or a remote server

The two local copies handle disk failures and provide fast recovery. The offsite copy handles catastrophic events - fire, flood, ransomware, or theft.

## Copy 2: Local Backup with BorgBackup

BorgBackup is excellent for local backups because it deduplicates, compresses, and optionally encrypts data. Install it:

```bash
sudo apt update
sudo apt install borgbackup
```

### Initializing the Backup Repository

```bash
# Create backup directory on a separate drive or NAS
# Replace /mnt/backup-drive with your backup mount point
BACKUP_DIR="/mnt/backup-drive/borg-repo"

# Initialize a new encrypted repository
borg init --encryption=repokey-blake2 "$BACKUP_DIR"

# Export and save the repository key somewhere safe
borg key export "$BACKUP_DIR" ~/borg-key-backup.txt
```

### Creating Backup Archives

```bash
#!/bin/bash
# /usr/local/bin/local-backup.sh

BACKUP_DIR="/mnt/backup-drive/borg-repo"
HOSTNAME=$(hostname)

# Create a timestamped archive
borg create \
    --verbose \
    --filter AME \
    --list \
    --stats \
    --show-rc \
    --compression lz4 \
    --exclude-caches \
    --exclude '/home/*/.cache/*' \
    --exclude '/var/tmp/*' \
    --exclude '/proc/*' \
    --exclude '/sys/*' \
    --exclude '/dev/*' \
    --exclude '/run/*' \
    "$BACKUP_DIR::${HOSTNAME}-{now}" \
    /etc \
    /home \
    /var/www \
    /var/lib/mysql \
    /opt

# Prune old archives - keep 7 daily, 4 weekly, 6 monthly
borg prune \
    --list \
    --keep-daily 7 \
    --keep-weekly 4 \
    --keep-monthly 6 \
    "$BACKUP_DIR"

# Free space from deleted archives
borg compact "$BACKUP_DIR"
```

```bash
sudo chmod +x /usr/local/bin/local-backup.sh
```

## Copy 3: Offsite Backup with BorgBackup over SSH

For the offsite copy, run BorgBackup against a remote server over SSH. This could be a VPS, a friend's server, or a Hetzner Storage Box:

```bash
# Set up SSH key authentication to the remote backup server
ssh-keygen -t ed25519 -f ~/.ssh/backup_key -N ""
ssh-copy-id -i ~/.ssh/backup_key backup-user@remote-backup-server.com

# Initialize remote Borg repository
REMOTE_REPO="backup-user@remote-backup-server.com:/backups/$(hostname)"
borg init --encryption=repokey-blake2 "$REMOTE_REPO"
```

Create the offsite backup script:

```bash
#!/bin/bash
# /usr/local/bin/offsite-backup.sh

REMOTE_REPO="backup-user@remote-backup-server.com:/backups/$(hostname)"
export BORG_RSH="ssh -i /root/.ssh/backup_key"
export BORG_PASSPHRASE="your-strong-passphrase-here"

borg create \
    --verbose \
    --compression lz4 \
    --exclude-caches \
    --exclude '/home/*/.cache/*' \
    --exclude '/proc/*' \
    --exclude '/sys/*' \
    "$REMOTE_REPO::$(hostname)-{now}" \
    /etc \
    /home \
    /var/www

borg prune \
    --keep-daily 7 \
    --keep-weekly 4 \
    --keep-monthly 12 \
    "$REMOTE_REPO"
```

## Cloud Offsite with rclone

For cloud storage (S3, Backblaze B2, Google Drive), use rclone as an alternative or addition to SSH-based offsite backup:

```bash
# Install rclone
curl https://rclone.org/install.sh | sudo bash

# Configure rclone for Backblaze B2 (as an example)
rclone config
# Follow the interactive prompts to add a new remote
# Select: b2 (Backblaze B2)
# Enter your account ID and application key
```

Sync Borg archives to cloud:

```bash
#!/bin/bash
# /usr/local/bin/cloud-backup.sh

# First run the local Borg backup
/usr/local/bin/local-backup.sh

# Then sync the entire Borg repository to cloud storage
rclone sync /mnt/backup-drive/borg-repo \
    b2:my-backup-bucket/borg-repo \
    --progress \
    --transfers 4 \
    --checkers 8 \
    --fast-list \
    --log-file /var/log/cloud-backup.log
```

## Automating All Backups

Set up systemd timers for scheduled execution:

```bash
# Local backup service
sudo nano /etc/systemd/system/local-backup.service
```

```ini
[Unit]
Description=Local Borg Backup
After=local-fs.target network.target

[Service]
Type=oneshot
ExecStart=/usr/local/bin/local-backup.sh
StandardOutput=journal
StandardError=journal
```

```bash
sudo nano /etc/systemd/system/local-backup.timer
```

```ini
[Unit]
Description=Run local backup hourly

[Timer]
OnCalendar=hourly
RandomizedDelaySec=10min
Persistent=true

[Install]
WantedBy=timers.target
```

```bash
# Offsite backup timer (daily)
sudo nano /etc/systemd/system/offsite-backup.timer
```

```ini
[Unit]
Description=Run offsite backup daily

[Timer]
OnCalendar=02:00
RandomizedDelaySec=30min
Persistent=true

[Install]
WantedBy=timers.target
```

```bash
sudo systemctl enable local-backup.timer offsite-backup.timer
sudo systemctl start local-backup.timer offsite-backup.timer
```

## Verifying Backup Integrity

Regular verification is critical. A backup you have never tested is not a backup - it's an untested assumption.

```bash
#!/bin/bash
# /usr/local/bin/verify-backup.sh

BACKUP_DIR="/mnt/backup-drive/borg-repo"
REMOTE_REPO="backup-user@remote-backup-server.com:/backups/$(hostname)"

echo "=== Verifying local backup ==="
borg check --verbose "$BACKUP_DIR"
LOCAL_STATUS=$?

echo "=== Verifying remote backup ==="
borg check --verbose "$REMOTE_REPO"
REMOTE_STATUS=$?

# Report results
if [ $LOCAL_STATUS -eq 0 ] && [ $REMOTE_STATUS -eq 0 ]; then
    echo "All backups verified successfully on $(date)"
else
    echo "BACKUP VERIFICATION FAILED on $(date)" | mail -s "Backup Alert" admin@example.com
fi

# Also list the 5 most recent archives
echo "=== Recent local archives ==="
borg list "$BACKUP_DIR" | tail -5

echo "=== Recent remote archives ==="
borg list "$REMOTE_REPO" | tail -5
```

Run verification weekly:

```bash
echo '0 3 * * 0 root /usr/local/bin/verify-backup.sh >> /var/log/backup-verify.log 2>&1' | \
    sudo tee /etc/cron.d/backup-verify
```

## Testing Restores

Periodically perform actual test restores to a staging environment:

```bash
# List archives
borg list /mnt/backup-drive/borg-repo

# Extract a specific archive to a test directory
mkdir -p /tmp/restore-test
borg extract --verbose \
    /mnt/backup-drive/borg-repo::server-2026-03-02T02:00:00 \
    etc/nginx/ \
    --destination /tmp/restore-test

# Verify the restored files look correct
ls -la /tmp/restore-test/etc/nginx/
diff -r /etc/nginx/ /tmp/restore-test/etc/nginx/
```

The 3-2-1 strategy only works if all three copies are actually maintained and tested. The automation above keeps the backups running, but periodic hands-on testing of the restore process is what separates a real disaster recovery plan from one that fails when you need it most.
