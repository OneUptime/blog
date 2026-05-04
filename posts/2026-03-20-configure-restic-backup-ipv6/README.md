# How to Configure Restic Backup over IPv6

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Restic, IPv6, Backup, S3, SSH, REST Backend, Encryption

Description: Configure Restic backup tool to store encrypted, deduplicated backups over IPv6 using SFTP, REST backend, S3-compatible storage, and automated backup scripts.

---

Restic is a modern, fast, and secure backup tool. It supports multiple backends including SFTP (over SSH), REST, S3, and others. All of these can operate over IPv6 with the correct address format.

## Installing Restic

```bash
# Ubuntu/Debian

sudo apt install restic -y

# RHEL/CentOS
sudo dnf install restic -y

# Or download binary directly (replace VERSION with the latest from
# https://github.com/restic/restic/releases)
VERSION=0.18.1
wget "https://github.com/restic/restic/releases/download/v${VERSION}/restic_${VERSION}_linux_amd64.bz2"
bunzip2 "restic_${VERSION}_linux_amd64.bz2"
sudo mv "restic_${VERSION}_linux_amd64" /usr/local/bin/restic
sudo chmod +x /usr/local/bin/restic

restic version
```

## SFTP Backend over IPv6

For SFTP-based remote backup repositories:

```bash
# Initialize repository using SFTP over IPv6
# Bracketed IPv6 requires URL syntax; double slash before an absolute path.
# To force IPv6 at the SSH level, use SSH config (AddressFamily inet6) or
# pass extra args via: -o sftp.args="-6"
restic -r \
  "sftp://backupuser@[2001:db8::1]:22//data/backups/myhost" \
  --password-file /etc/restic/password \
  init

# Alternative with SSH config alias
# ~/.ssh/config entry:
# Host backup-server
#     HostName 2001:db8::1
#     User backupuser
#     AddressFamily inet6

restic -r "sftp:backup-server:/data/backups/myhost" \
  --password-file /etc/restic/password \
  init
```

## REST Backend over IPv6

Run the restic REST server on an IPv6 host:

```bash
# Install rest-server (replace VERSION with the latest from
# https://github.com/restic/rest-server/releases)
VERSION=0.14.0
wget "https://github.com/restic/rest-server/releases/download/v${VERSION}/rest-server_${VERSION}_linux_amd64.tar.gz"
tar xvf "rest-server_${VERSION}_linux_amd64.tar.gz"
sudo mv "rest-server_${VERSION}_linux_amd64/rest-server" /usr/local/bin/

# Run REST server listening on IPv6
rest-server \
  --path /data/restic-repo \
  --listen "[::]:8000" \
  --tls \
  --tls-cert /etc/ssl/certs/rest-server.crt \
  --tls-key /etc/ssl/private/rest-server.key
```

Initialize and use the REST backend:

```bash
# Initialize with REST backend over IPv6
restic -r \
  "rest:https://[2001:db8::1]:8000/" \
  --password-file /etc/restic/password \
  init

# Backup to REST backend
restic -r \
  "rest:https://[2001:db8::1]:8000/" \
  --password-file /etc/restic/password \
  backup /etc /home /var/www
```

## S3-Compatible Backend over IPv6

For MinIO or other S3-compatible storage on IPv6:

```bash
# Set environment variables for IPv6 S3 endpoint
export AWS_ACCESS_KEY_ID="minio_access_key"
export AWS_SECRET_ACCESS_KEY="minio_secret_key"
export RESTIC_REPOSITORY="s3:http://[2001:db8::2]:9000/restic-bucket"
export RESTIC_PASSWORD="backuppassword"

# Initialize the repository
restic init

# Backup to S3-compatible IPv6 storage
restic backup /etc /home /var/www
```

## Backup Script for IPv6 Environments

```bash
#!/bin/bash
# restic_backup_ipv6.sh

# Configuration
export RESTIC_REPOSITORY="sftp:backup-server:/data/backups/$(hostname)"
export RESTIC_PASSWORD_FILE="/etc/restic/password"
LOG="/var/log/restic-backup.log"

timestamp() { date -u +"%Y-%m-%dT%H:%M:%SZ"; }

echo "$(timestamp) Starting restic backup" >> "$LOG"

# Run backup
restic backup \
  --verbose \
  --tag "$(hostname)" \
  --exclude-caches \
  --exclude '/home/*/.cache' \
  --exclude '/var/tmp' \
  /etc /home /var/www \
  >> "$LOG" 2>&1

BACKUP_RC=$?

if [ $BACKUP_RC -ne 0 ]; then
  echo "$(timestamp) ERROR: Backup failed with code $BACKUP_RC" >> "$LOG"
  exit $BACKUP_RC
fi

# Apply retention policy
restic forget \
  --prune \
  --keep-last 5 \
  --keep-daily 7 \
  --keep-weekly 5 \
  --keep-monthly 12 \
  >> "$LOG" 2>&1

# Verify repository integrity
restic check >> "$LOG" 2>&1

echo "$(timestamp) Backup completed successfully" >> "$LOG"
```

## Verifying and Restoring Backups

```bash
# List snapshots
restic -r "sftp:backup-server:/data/backups/myhost" \
  --password-file /etc/restic/password \
  snapshots

# Check repository integrity
restic -r "sftp:backup-server:/data/backups/myhost" \
  --password-file /etc/restic/password \
  check

# Restore a snapshot
restic -r "sftp:backup-server:/data/backups/myhost" \
  --password-file /etc/restic/password \
  restore latest \
  --target /restore \
  --include /etc/nginx

# Mount backup for browsing
restic -r "sftp:backup-server:/data/backups/myhost" \
  --password-file /etc/restic/password \
  mount /mnt/restic
```

## Systemd Timer for Automated Restic Backups

```ini
# /etc/systemd/system/restic-backup.service
[Unit]
Description=Restic Backup over IPv6
After=network-online.target
Wants=network-online.target

[Service]
Type=oneshot
EnvironmentFile=/etc/restic/environment
ExecStart=/usr/local/bin/restic_backup_ipv6.sh
```

```ini
# /etc/systemd/system/restic-backup.timer
[Unit]
Description=Run Restic backup daily

[Timer]
OnCalendar=02:00
Persistent=true

[Install]
WantedBy=timers.target
```

```bash
sudo systemctl enable --now restic-backup.timer
```

Restic's support for multiple backends - SFTP, REST, and S3 - all of which can communicate over IPv6, makes it a versatile backup tool for modern IPv6 network infrastructure.
