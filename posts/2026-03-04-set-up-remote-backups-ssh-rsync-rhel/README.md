# How to Set Up Remote Backups Over SSH with rsync on RHEL

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: RHEL, rsync, SSH, Remote Backup, Networking, Linux

Description: Configure rsync over SSH on RHEL to securely transfer backups to a remote server, including key-based authentication and bandwidth limiting.

---

rsync over SSH provides encrypted remote backups without needing a dedicated backup daemon. It is the most common method for sending backups from a RHEL server to a remote backup host.

## Setting Up SSH Key Authentication

Create a dedicated SSH key for automated backups:

```bash
# Generate an SSH key pair for backups (no passphrase for automation)
ssh-keygen -t ed25519 -f ~/.ssh/backup_key -N "" -C "backup@$(hostname)"

# Copy the public key to the remote backup server
ssh-copy-id -i ~/.ssh/backup_key.pub backupuser@backup-server.example.com
```

Test the connection:

```bash
# Verify passwordless SSH works
ssh -i ~/.ssh/backup_key backupuser@backup-server.example.com "echo 'Connection OK'"
```

## Basic Remote Backup with rsync

Sync a local directory to the remote server:

```bash
# Backup /etc to the remote server over SSH
rsync -avz -e "ssh -i ~/.ssh/backup_key" \
  /etc/ \
  backupuser@backup-server.example.com:/backup/$(hostname)/etc/
```

## Remote Backup Script with Bandwidth Limiting

```bash
#!/bin/bash
# /usr/local/bin/remote-backup.sh
# Remote rsync backup over SSH with bandwidth control

REMOTE_USER="backupuser"
REMOTE_HOST="backup-server.example.com"
REMOTE_DIR="/backup/$(hostname)"
SSH_KEY="$HOME/.ssh/backup_key"
LOG="/var/log/remote-backup.log"

# Directories to back up
SOURCES="/etc /home /var/www /var/lib/pgsql"

echo "=== Remote backup started: $(date) ===" >> "$LOG"

for SRC in $SOURCES; do
  DIR_NAME=$(echo "$SRC" | tr '/' '_')
  rsync -az --delete \
    --bwlimit=10000 \
    -e "ssh -i ${SSH_KEY} -o StrictHostKeyChecking=no" \
    "${SRC}/" \
    "${REMOTE_USER}@${REMOTE_HOST}:${REMOTE_DIR}/${DIR_NAME}/" \
    2>> "$LOG"
done

echo "=== Remote backup completed: $(date) ===" >> "$LOG"
```

The `--bwlimit=10000` flag limits bandwidth to 10,000 KB/s (about 10 MB/s), preventing the backup from saturating your network link.

## Restricting the Backup SSH Key

On the remote server, restrict what the backup key can do:

```bash
# On backup-server.example.com, edit the authorized_keys file
# Prefix the key with a command restriction:
cat >> /home/backupuser/.ssh/authorized_keys << 'AUTH'
command="rrsync /backup/",no-agent-forwarding,no-port-forwarding,no-pty ssh-ed25519 AAAAC3... backup@source-server
AUTH
```

Install rrsync (restricted rsync):

```bash
# rrsync is included with rsync
sudo cp /usr/share/doc/rsync/support/rrsync /usr/local/bin/
sudo chmod 755 /usr/local/bin/rrsync
```

## Scheduling the Remote Backup

```bash
# Add to root crontab
echo '30 2 * * * /usr/local/bin/remote-backup.sh' | sudo tee -a /var/spool/cron/root
```
