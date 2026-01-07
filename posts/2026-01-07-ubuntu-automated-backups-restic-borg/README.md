# How to Set Up Automated Backups on Ubuntu with restic/borg

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Ubuntu, Linux, Backup, restic, borg, Disaster Recovery

Description: Set up automated backups on Ubuntu using restic or borg with encryption, deduplication, and remote storage targets.

---

Data loss can happen at any moment due to hardware failures, ransomware attacks, accidental deletions, or natural disasters. Having a robust, automated backup strategy is not optional for production systems. This guide covers two of the most powerful open-source backup tools available for Ubuntu: **restic** and **borg**.

Both tools offer encryption, deduplication, and support for multiple storage backends. By the end of this guide, you will have a fully automated backup system with scheduled backups, retention policies, and monitoring.

## Table of Contents

1. [Restic vs Borg: Choosing the Right Tool](#restic-vs-borg-choosing-the-right-tool)
2. [Installing Restic and Borg on Ubuntu](#installing-restic-and-borg-on-ubuntu)
3. [Repository Initialization](#repository-initialization)
4. [Creating Your First Backup](#creating-your-first-backup)
5. [Working with Excludes and Patterns](#working-with-excludes-and-patterns)
6. [Encryption and Password Management](#encryption-and-password-management)
7. [Remote Backends Configuration](#remote-backends-configuration)
8. [Automated Scheduling with Systemd Timers](#automated-scheduling-with-systemd-timers)
9. [Retention Policies and Pruning](#retention-policies-and-pruning)
10. [Verification and Restoration](#verification-and-restoration)
11. [Monitoring and Alerting](#monitoring-and-alerting)
12. [Best Practices and Recommendations](#best-practices-and-recommendations)

---

## Restic vs Borg: Choosing the Right Tool

Before diving into implementation, let's understand the key differences between restic and borg to help you make an informed decision.

### Feature Comparison

| Feature | Restic | Borg |
|---------|--------|------|
| **Language** | Go | Python/C |
| **Deduplication** | Content-defined chunking | Content-defined chunking |
| **Encryption** | AES-256-CTR + Poly1305-AES | AES-256-CTR + HMAC-SHA256 |
| **Compression** | Zstd (since v0.14) | LZ4, Zstd, Zlib, LZMA |
| **Remote Backends** | S3, SFTP, REST, B2, Azure, GCS | SSH/SFTP (native), rclone mount |
| **Repository Lock** | Exclusive and shared locks | Exclusive locks |
| **Append-Only Mode** | Supported | Supported |
| **Performance** | Fast, parallel operations | Very fast deduplication |
| **Memory Usage** | Higher for large repos | Lower, more efficient |

### When to Choose Restic

- You need native support for cloud storage (S3, B2, Azure, GCS)
- You prefer a single static binary with no dependencies
- You want simpler remote repository setup
- Cross-platform backups (Windows, macOS, Linux) are important

### When to Choose Borg

- Maximum backup speed is critical
- You need advanced compression options
- Lower memory usage is important for constrained systems
- You primarily use SSH/SFTP for remote storage
- You want mature, battle-tested software

---

## Installing Restic and Borg on Ubuntu

### Installing Restic

The package in Ubuntu repositories may be outdated. Here's how to install the latest version:

```bash
# Install restic from Ubuntu repositories (may not be latest)
sudo apt update
sudo apt install restic

# Verify installation
restic version
```

For the latest version, download directly from GitHub:

```bash
# Download the latest restic binary from GitHub releases
RESTIC_VERSION=$(curl -s https://api.github.com/repos/restic/restic/releases/latest | grep tag_name | cut -d '"' -f 4 | tr -d 'v')
wget https://github.com/restic/restic/releases/download/v${RESTIC_VERSION}/restic_${RESTIC_VERSION}_linux_amd64.bz2

# Extract and install the binary
bunzip2 restic_${RESTIC_VERSION}_linux_amd64.bz2
sudo mv restic_${RESTIC_VERSION}_linux_amd64 /usr/local/bin/restic
sudo chmod +x /usr/local/bin/restic

# Verify the installed version
restic version
```

Enable bash completion for easier command-line usage:

```bash
# Generate and install bash completion for restic
sudo restic generate --bash-completion /etc/bash_completion.d/restic
source /etc/bash_completion.d/restic
```

### Installing Borg

```bash
# Install borg from Ubuntu repositories
sudo apt update
sudo apt install borgbackup

# Verify installation
borg --version
```

For the latest version using pipx (recommended for latest features):

```bash
# Install pipx if not already installed
sudo apt install pipx
pipx ensurepath

# Install borgbackup via pipx
pipx install borgbackup

# Verify the installed version
borg --version
```

---

## Repository Initialization

Both tools require initializing a repository before creating backups. The repository stores all backup data, metadata, and encryption keys.

### Initializing a Restic Repository

Local repository initialization:

```bash
# Initialize a local restic repository with password prompt
restic init --repo /backup/restic-repo

# You will be prompted to enter and confirm a password
# This password encrypts all backup data - DO NOT LOSE IT
```

Using an environment variable for the password (useful for scripting):

```bash
# Set the repository password as an environment variable
export RESTIC_PASSWORD="your-secure-password-here"

# Initialize the repository using the environment variable
restic init --repo /backup/restic-repo
```

### Initializing a Borg Repository

Local repository initialization with encryption:

```bash
# Initialize a borg repository with repokey encryption
# The encryption key is stored in the repository, protected by your passphrase
borg init --encryption=repokey /backup/borg-repo
```

Different encryption modes for various security requirements:

```bash
# Repokey-blake2: Faster encryption using BLAKE2b
borg init --encryption=repokey-blake2 /backup/borg-repo

# Keyfile: Key stored locally in ~/.config/borg/keys (more secure)
borg init --encryption=keyfile /backup/borg-repo

# Authenticated mode: No encryption, only authentication
borg init --encryption=authenticated /backup/borg-repo

# None: No encryption (not recommended for sensitive data)
borg init --encryption=none /backup/borg-repo
```

---

## Creating Your First Backup

### Restic Backup Commands

Create a basic backup of a directory:

```bash
# Backup the /home directory to the restic repository
export RESTIC_REPOSITORY="/backup/restic-repo"
export RESTIC_PASSWORD="your-secure-password"

restic backup /home

# Backup with a custom tag for easier identification
restic backup --tag daily --tag home /home

# Backup with verbose output to see progress
restic backup --verbose /home
```

Backup multiple directories in a single snapshot:

```bash
# Backup multiple directories at once
restic backup /home /etc /var/www /opt/myapp

# Backup with hostname tag (useful for multi-server environments)
restic backup --tag "$(hostname)" /home /etc
```

### Borg Backup Commands

Create a basic backup archive:

```bash
# Set environment variables for borg
export BORG_REPO="/backup/borg-repo"
export BORG_PASSPHRASE="your-secure-passphrase"

# Create an archive with timestamp in the name
borg create ::home-{now:%Y-%m-%d_%H:%M} /home

# Create archive with progress and statistics
borg create --progress --stats ::backup-{now} /home /etc
```

Advanced borg backup with compression:

```bash
# Use zstd compression for optimal speed/ratio balance
borg create --compression zstd,3 ::archive-{now} /home

# Use lz4 for fastest compression (good for already compressed data)
borg create --compression lz4 ::archive-{now} /home

# Use lzma for maximum compression (slower but smallest size)
borg create --compression lzma,6 ::archive-{now} /home
```

---

## Working with Excludes and Patterns

Excluding unnecessary files reduces backup size and time significantly.

### Restic Exclude Patterns

Create an exclude file for consistent exclusions:

```bash
# Create an exclude file at /etc/restic/excludes.txt
sudo mkdir -p /etc/restic
sudo tee /etc/restic/excludes.txt << 'EOF'
# Cache directories
.cache
**/cache/**
**/.cache/**
**/Cache/**

# Temporary files
*.tmp
*.temp
*.swp
*~

# Node.js dependencies (can be reinstalled)
**/node_modules/**

# Python virtual environments
**/.venv/**
**/venv/**
**/__pycache__/**

# IDE and editor files
**/.idea/**
**/.vscode/**

# Build artifacts
**/build/**
**/dist/**
**/target/**

# Logs (usually rotated separately)
*.log
**/logs/**

# Trash and downloads
**/.Trash/**
**/Downloads/**

# Large media files (backup separately if needed)
*.iso
*.vmdk
*.vdi
EOF
```

Run backup with exclude file:

```bash
# Use the exclude file when running backups
restic backup --exclude-file=/etc/restic/excludes.txt /home

# Combine with additional command-line excludes
restic backup --exclude-file=/etc/restic/excludes.txt \
  --exclude="*.mp4" \
  --exclude="/home/*/.steam" \
  /home
```

### Borg Exclude Patterns

Create a borg patterns file with advanced matching:

```bash
# Create a patterns file at /etc/borg/patterns.txt
sudo mkdir -p /etc/borg
sudo tee /etc/borg/patterns.txt << 'EOF'
# Borg pattern syntax:
# P = Path prefix match
# R = Regular expression
# sh = Shell-style pattern (fnmatch)
# fm = fnmatch pattern (same as sh)

# Exclude caches using shell patterns
sh:**/.cache
sh:**/cache
sh:**/Cache

# Exclude temporary files
sh:**/*.tmp
sh:**/*.temp
sh:**/*~

# Exclude development dependencies
sh:**/node_modules
sh:**/.venv
sh:**/__pycache__

# Exclude IDE directories
sh:**/.idea
sh:**/.vscode

# Exclude build directories
sh:**/build
sh:**/dist
sh:**/target

# Exclude specific large files using regex
R:.*\.(iso|vmdk|vdi)$

# Exclude log files
sh:**/*.log
sh:**/logs

# Include everything in /etc (override previous excludes)
+ /etc

# Exclude everything in specific directories
- /home/*/.steam
- /home/*/.local/share/Trash
EOF
```

Run borg backup with patterns:

```bash
# Use patterns file for backup
borg create --patterns-from=/etc/borg/patterns.txt \
  ::backup-{now:%Y-%m-%d} /home /etc /var

# Combine with inline excludes
borg create --patterns-from=/etc/borg/patterns.txt \
  --exclude="*.mp4" \
  --exclude="*.avi" \
  ::backup-{now:%Y-%m-%d} /home
```

---

## Encryption and Password Management

Secure password management is critical for backup automation.

### Using Environment Variables

Basic approach for both tools:

```bash
# For restic - set these in your backup script
export RESTIC_REPOSITORY="/backup/restic-repo"
export RESTIC_PASSWORD="your-secure-password"

# For borg - set these in your backup script
export BORG_REPO="/backup/borg-repo"
export BORG_PASSPHRASE="your-secure-passphrase"
```

### Using Password Files (More Secure)

Create a password file with restricted permissions:

```bash
# Create a secure directory for credentials
sudo mkdir -p /etc/backup-credentials
sudo chmod 700 /etc/backup-credentials

# Create password file for restic
echo "your-secure-password" | sudo tee /etc/backup-credentials/restic-password > /dev/null
sudo chmod 600 /etc/backup-credentials/restic-password

# Create passphrase file for borg
echo "your-secure-passphrase" | sudo tee /etc/backup-credentials/borg-passphrase > /dev/null
sudo chmod 600 /etc/backup-credentials/borg-passphrase
```

Use password files in scripts:

```bash
# Restic with password file
restic --password-file=/etc/backup-credentials/restic-password \
  --repo=/backup/restic-repo backup /home

# Borg with passphrase command
export BORG_PASSCOMMAND="cat /etc/backup-credentials/borg-passphrase"
borg create ::backup-{now} /home
```

### Using System Keyring or Secret Manager

For even better security, use a secret manager:

```bash
# Install secret-tool for GNOME keyring integration
sudo apt install libsecret-tools

# Store the password in the keyring
secret-tool store --label="Restic Backup Password" service restic account backup

# Retrieve in scripts using RESTIC_PASSWORD_COMMAND
export RESTIC_PASSWORD_COMMAND="secret-tool lookup service restic account backup"
restic backup /home
```

### Backing Up Encryption Keys

Always backup your encryption keys separately:

```bash
# Export borg key to a file (store this securely offline)
borg key export /backup/borg-repo /secure/backup-keys/borg-key-$(hostname).txt

# For restic, the key is derived from your password
# Document your password securely (password manager, safe deposit box)

# Test key export by importing to a new location
borg key import /tmp/test-repo /secure/backup-keys/borg-key-$(hostname).txt
```

---

## Remote Backends Configuration

### Restic with Amazon S3

Configure S3 backend for restic:

```bash
# Set AWS credentials as environment variables
export AWS_ACCESS_KEY_ID="your-access-key"
export AWS_SECRET_ACCESS_KEY="your-secret-key"
export RESTIC_PASSWORD="your-backup-password"

# Initialize repository on S3
restic init --repo s3:s3.amazonaws.com/your-bucket-name/restic-backups

# Alternative: Use a specific region
restic init --repo s3:s3.eu-west-1.amazonaws.com/your-bucket-name/restic-backups

# Run backup to S3
restic --repo s3:s3.amazonaws.com/your-bucket-name/restic-backups backup /home
```

Using S3-compatible storage (MinIO, Wasabi, etc.):

```bash
# Configure for MinIO or other S3-compatible storage
export AWS_ACCESS_KEY_ID="minio-access-key"
export AWS_SECRET_ACCESS_KEY="minio-secret-key"

# Initialize with custom endpoint
restic init --repo s3:https://minio.example.com/backups/restic

# For self-signed certificates, you may need to skip verification (not recommended for production)
# Instead, add your CA certificate to the system trust store
```

### Restic with Backblaze B2

Configure Backblaze B2 backend:

```bash
# Set B2 credentials
export B2_ACCOUNT_ID="your-account-id"
export B2_ACCOUNT_KEY="your-account-key"
export RESTIC_PASSWORD="your-backup-password"

# Initialize B2 repository
restic init --repo b2:your-bucket-name:restic-backups

# Run backup to B2
restic --repo b2:your-bucket-name:restic-backups backup /home
```

### Restic with SFTP

Configure SFTP backend:

```bash
# Ensure SSH key authentication is set up for the remote server
ssh-copy-id user@backup-server.example.com

# Initialize SFTP repository
export RESTIC_PASSWORD="your-backup-password"
restic init --repo sftp:user@backup-server.example.com:/backups/restic-repo

# Run backup over SFTP
restic --repo sftp:user@backup-server.example.com:/backups/restic-repo backup /home
```

### Borg with SSH/SFTP

Configure borg with remote repository over SSH:

```bash
# Ensure SSH key authentication is set up
ssh-copy-id user@backup-server.example.com

# Initialize remote borg repository
export BORG_PASSPHRASE="your-backup-passphrase"
borg init --encryption=repokey user@backup-server.example.com:/backups/borg-repo

# Run backup to remote repository
borg create user@backup-server.example.com:/backups/borg-repo::backup-{now} /home
```

Optimize borg SSH connection for better performance:

```bash
# Create SSH config for backup server with optimized settings
cat >> ~/.ssh/config << 'EOF'
Host backup-server
    HostName backup-server.example.com
    User backupuser
    IdentityFile ~/.ssh/backup_key
    Compression no
    ServerAliveInterval 60
    ServerAliveCountMax 3
EOF

# Use the configured host alias
borg create backup-server:/backups/borg-repo::backup-{now} /home
```

### Borg with rclone Mount (Access S3, B2, etc.)

Use rclone to mount cloud storage for borg:

```bash
# Install rclone
sudo apt install rclone

# Configure rclone for your cloud provider
rclone config
# Follow interactive prompts to set up S3, B2, Google Drive, etc.

# Mount the remote storage
mkdir -p /mnt/cloud-backup
rclone mount remote:backup-bucket /mnt/cloud-backup --daemon

# Initialize borg repository on mounted storage
borg init --encryption=repokey /mnt/cloud-backup/borg-repo

# Run backup
borg create /mnt/cloud-backup/borg-repo::backup-{now} /home
```

---

## Automated Scheduling with Systemd Timers

Systemd timers are more reliable than cron for backup scheduling.

### Restic Systemd Service and Timer

Create the backup script:

```bash
# Create the restic backup script
sudo tee /usr/local/bin/restic-backup.sh << 'EOF'
#!/bin/bash
set -euo pipefail

# Configuration
export RESTIC_REPOSITORY="s3:s3.amazonaws.com/your-bucket/restic-backups"
export RESTIC_PASSWORD_FILE="/etc/backup-credentials/restic-password"
export AWS_ACCESS_KEY_ID="your-access-key"
export AWS_SECRET_ACCESS_KEY="your-secret-key"

# Logging
LOG_FILE="/var/log/restic-backup.log"
exec &>> "$LOG_FILE"

echo "=========================================="
echo "Backup started at $(date)"
echo "=========================================="

# Run the backup with excludes
restic backup \
  --exclude-file=/etc/restic/excludes.txt \
  --tag "$(hostname)" \
  --tag "automated" \
  /home /etc /var/www

# Check repository health
echo "Checking repository integrity..."
restic check --read-data-subset=5%

# Apply retention policy
echo "Applying retention policy..."
restic forget \
  --keep-hourly 24 \
  --keep-daily 7 \
  --keep-weekly 4 \
  --keep-monthly 12 \
  --keep-yearly 5 \
  --prune

echo "Backup completed at $(date)"
echo "=========================================="
EOF

sudo chmod +x /usr/local/bin/restic-backup.sh
```

Create the systemd service unit:

```bash
# Create the systemd service file
sudo tee /etc/systemd/system/restic-backup.service << 'EOF'
[Unit]
Description=Restic Backup Service
Wants=network-online.target
After=network-online.target

[Service]
Type=oneshot
ExecStart=/usr/local/bin/restic-backup.sh
User=root
Nice=19
IOSchedulingClass=idle
StandardOutput=journal
StandardError=journal

# Security hardening
PrivateTmp=true
NoNewPrivileges=true
ProtectSystem=strict
ReadWritePaths=/var/log /backup

[Install]
WantedBy=multi-user.target
EOF
```

Create the systemd timer unit:

```bash
# Create the systemd timer file
sudo tee /etc/systemd/system/restic-backup.timer << 'EOF'
[Unit]
Description=Run Restic Backup Daily

[Timer]
# Run at 2 AM every day
OnCalendar=*-*-* 02:00:00
# Add random delay up to 30 minutes to avoid thundering herd
RandomizedDelaySec=1800
# Persist timer across reboots
Persistent=true

[Install]
WantedBy=timers.target
EOF
```

Enable and start the timer:

```bash
# Reload systemd to recognize new units
sudo systemctl daemon-reload

# Enable the timer to start on boot
sudo systemctl enable restic-backup.timer

# Start the timer now
sudo systemctl start restic-backup.timer

# Verify timer is active
sudo systemctl list-timers restic-backup.timer

# Run a manual backup to test
sudo systemctl start restic-backup.service

# Check the service status
sudo systemctl status restic-backup.service
```

### Borg Systemd Service and Timer

Create the borg backup script:

```bash
# Create the borg backup script
sudo tee /usr/local/bin/borg-backup.sh << 'EOF'
#!/bin/bash
set -euo pipefail

# Configuration
export BORG_REPO="user@backup-server:/backups/borg-repo"
export BORG_PASSCOMMAND="cat /etc/backup-credentials/borg-passphrase"
export BORG_RSH="ssh -i /root/.ssh/backup_key -o BatchMode=yes"

# Logging
LOG_FILE="/var/log/borg-backup.log"
exec &>> "$LOG_FILE"

echo "=========================================="
echo "Backup started at $(date)"
echo "=========================================="

# Create archive with hostname and timestamp
ARCHIVE_NAME="$(hostname)-{now:%Y-%m-%d_%H:%M}"

borg create \
  --verbose \
  --filter AME \
  --list \
  --stats \
  --show-rc \
  --compression zstd,3 \
  --exclude-caches \
  --patterns-from /etc/borg/patterns.txt \
  "::$ARCHIVE_NAME" \
  /home \
  /etc \
  /var/www \
  /opt

backup_exit=$?

echo "Backup exited with code: $backup_exit"

# Prune old archives
echo "Pruning old archives..."
borg prune \
  --list \
  --show-rc \
  --keep-hourly 24 \
  --keep-daily 7 \
  --keep-weekly 4 \
  --keep-monthly 12 \
  --keep-yearly 5

prune_exit=$?

# Compact repository to free space
echo "Compacting repository..."
borg compact

compact_exit=$?

# Verify repository integrity periodically
DAY_OF_WEEK=$(date +%u)
if [ "$DAY_OF_WEEK" = "7" ]; then
  echo "Weekly integrity check..."
  borg check --verify-data
  check_exit=$?
else
  check_exit=0
fi

# Determine overall exit code
global_exit=$(( backup_exit > prune_exit ? backup_exit : prune_exit ))
global_exit=$(( global_exit > compact_exit ? global_exit : compact_exit ))
global_exit=$(( global_exit > check_exit ? global_exit : check_exit ))

echo "Backup completed at $(date) with exit code: $global_exit"
echo "=========================================="

exit $global_exit
EOF

sudo chmod +x /usr/local/bin/borg-backup.sh
```

Create borg systemd service and timer:

```bash
# Create the systemd service file
sudo tee /etc/systemd/system/borg-backup.service << 'EOF'
[Unit]
Description=Borg Backup Service
Wants=network-online.target
After=network-online.target

[Service]
Type=oneshot
ExecStart=/usr/local/bin/borg-backup.sh
User=root
Nice=19
IOSchedulingClass=idle
StandardOutput=journal
StandardError=journal

# Security hardening
PrivateTmp=true
NoNewPrivileges=true

[Install]
WantedBy=multi-user.target
EOF

# Create the systemd timer file
sudo tee /etc/systemd/system/borg-backup.timer << 'EOF'
[Unit]
Description=Run Borg Backup Daily

[Timer]
OnCalendar=*-*-* 03:00:00
RandomizedDelaySec=1800
Persistent=true

[Install]
WantedBy=timers.target
EOF

# Enable and start the timer
sudo systemctl daemon-reload
sudo systemctl enable borg-backup.timer
sudo systemctl start borg-backup.timer
```

---

## Retention Policies and Pruning

Proper retention policies balance storage costs with recovery needs.

### Restic Retention and Pruning

```bash
# View all snapshots before pruning
restic snapshots

# Forget old snapshots with retention policy
# This only marks snapshots for deletion, doesn't free space yet
restic forget \
  --keep-last 5 \          # Keep 5 most recent snapshots
  --keep-hourly 24 \       # Keep hourly for last 24 hours
  --keep-daily 7 \         # Keep daily for last 7 days
  --keep-weekly 4 \        # Keep weekly for last 4 weeks
  --keep-monthly 12 \      # Keep monthly for last 12 months
  --keep-yearly 5          # Keep yearly for last 5 years

# Combine forget with prune to also free space
restic forget \
  --keep-daily 7 \
  --keep-weekly 4 \
  --keep-monthly 12 \
  --prune

# Dry run to see what would be removed
restic forget \
  --keep-daily 7 \
  --keep-weekly 4 \
  --dry-run

# Prune by tags (useful for multi-host setups)
restic forget \
  --tag "$(hostname)" \
  --keep-daily 7 \
  --prune
```

### Borg Retention and Pruning

```bash
# List all archives
borg list

# Prune with retention policy
borg prune \
  --list \
  --keep-hourly 24 \
  --keep-daily 7 \
  --keep-weekly 4 \
  --keep-monthly 12 \
  --keep-yearly 5

# Dry run to preview what would be deleted
borg prune --list --dry-run \
  --keep-daily 7 \
  --keep-weekly 4

# Prune by prefix (useful for multi-host repos)
borg prune \
  --list \
  --prefix "$(hostname)-" \
  --keep-daily 7 \
  --keep-weekly 4

# Compact repository after pruning to free space
borg compact

# Compact with threshold (only if more than 10% space can be freed)
borg compact --threshold 10
```

---

## Verification and Restoration

Regular verification and restoration testing are critical.

### Restic Verification and Restore

```bash
# Check repository integrity (metadata only)
restic check

# Check with data verification (slower but thorough)
restic check --read-data

# Check a random subset of data (good for large repos)
restic check --read-data-subset=10%

# List all snapshots
restic snapshots

# Browse snapshot contents
restic ls latest

# List files in a specific snapshot
restic ls abc123def

# Restore entire snapshot to a directory
restic restore latest --target /restore/location

# Restore specific files or directories
restic restore latest --target /restore/location --include "/home/user/documents"

# Restore with path rewriting
restic restore latest --target /restore/location --path "/home/user" --include "/home/user/important"

# Mount repository for browsing (FUSE required)
sudo apt install fuse
mkdir /mnt/restic
restic mount /mnt/restic
# Browse snapshots at /mnt/restic/snapshots/
# Unmount when done
fusermount -u /mnt/restic
```

### Borg Verification and Restore

```bash
# Check repository integrity
borg check

# Check with archive verification
borg check --archives-only

# Check with data verification (slow but thorough)
borg check --verify-data

# List all archives
borg list

# List contents of an archive
borg list ::archive-name

# Extract entire archive
cd /restore/location
borg extract ::archive-name

# Extract specific paths
borg extract ::archive-name home/user/documents

# Extract with progress
borg extract --progress ::archive-name

# Restore to a different location (dry run first)
borg extract --dry-run ::archive-name home/user/documents

# Mount archive for browsing (FUSE required)
sudo apt install fuse
mkdir /mnt/borg
borg mount ::archive-name /mnt/borg
# Browse files at /mnt/borg/
# Unmount when done
borg umount /mnt/borg

# Mount entire repository (all archives)
borg mount /backup/borg-repo /mnt/borg
```

---

## Monitoring and Alerting

Set up monitoring to ensure backups complete successfully.

### Email Notifications

Create a notification script:

```bash
# Create notification script that works with both tools
sudo tee /usr/local/bin/backup-notify.sh << 'EOF'
#!/bin/bash

BACKUP_NAME="$1"
STATUS="$2"
LOG_FILE="$3"
ADMIN_EMAIL="admin@example.com"
HOSTNAME=$(hostname)

if [ "$STATUS" = "success" ]; then
  SUBJECT="[OK] Backup completed on $HOSTNAME"
  BODY="Backup '$BACKUP_NAME' completed successfully at $(date)."
else
  SUBJECT="[FAILED] Backup failed on $HOSTNAME"
  BODY="Backup '$BACKUP_NAME' failed at $(date). Please check logs."
fi

# Include last 50 lines of log
if [ -f "$LOG_FILE" ]; then
  BODY="$BODY\n\n=== Last 50 lines of log ===\n$(tail -50 $LOG_FILE)"
fi

echo -e "$BODY" | mail -s "$SUBJECT" "$ADMIN_EMAIL"
EOF

sudo chmod +x /usr/local/bin/backup-notify.sh
```

### Integrating with Monitoring Systems

Create a metrics endpoint for Prometheus:

```bash
# Create script to generate Prometheus metrics
sudo tee /usr/local/bin/backup-metrics.sh << 'EOF'
#!/bin/bash

METRICS_FILE="/var/lib/node_exporter/textfile_collector/backup_metrics.prom"
RESTIC_REPO="/backup/restic-repo"

# Get last snapshot timestamp for restic
if command -v restic &> /dev/null; then
  LAST_SNAPSHOT=$(restic snapshots --json --latest 1 2>/dev/null | jq -r '.[0].time // empty')
  if [ -n "$LAST_SNAPSHOT" ]; then
    LAST_EPOCH=$(date -d "$LAST_SNAPSHOT" +%s 2>/dev/null || echo 0)
    echo "backup_last_success_timestamp{tool=\"restic\"} $LAST_EPOCH" >> "$METRICS_FILE.tmp"
  fi
fi

# Get repository size
if [ -d "$RESTIC_REPO" ]; then
  REPO_SIZE=$(du -sb "$RESTIC_REPO" 2>/dev/null | cut -f1 || echo 0)
  echo "backup_repository_size_bytes{tool=\"restic\"} $REPO_SIZE" >> "$METRICS_FILE.tmp"
fi

# Atomically update metrics file
mv "$METRICS_FILE.tmp" "$METRICS_FILE"
EOF

sudo chmod +x /usr/local/bin/backup-metrics.sh
```

### Healthcheck Integration

Create a healthcheck callback for external monitoring:

```bash
# Add to the end of your backup script
HEALTHCHECK_URL="https://hc-ping.com/your-uuid-here"

# Signal start
curl -fsS --retry 3 "$HEALTHCHECK_URL/start" > /dev/null

# Run backup
# ... your backup commands ...
backup_exit=$?

# Signal completion or failure
if [ $backup_exit -eq 0 ]; then
  curl -fsS --retry 3 "$HEALTHCHECK_URL" > /dev/null
else
  curl -fsS --retry 3 "$HEALTHCHECK_URL/fail" > /dev/null
fi
```

---

## Best Practices and Recommendations

### Security Best Practices

1. **Use strong, unique passwords** for each backup repository
2. **Store encryption keys separately** from the backup data
3. **Use append-only mode** for remote repositories when possible
4. **Restrict network access** to backup servers
5. **Enable MFA** on cloud storage accounts

```bash
# Enable append-only mode for restic (on the REST server)
# This prevents attackers from deleting backups even with credentials

# For borg, use append-only mode in authorized_keys
# On backup server, in ~/.ssh/authorized_keys:
# command="borg serve --append-only --restrict-to-path /backups",restrict ssh-rsa AAAA...
```

### Performance Optimization

```bash
# Restic: Use cache for faster operations
restic backup --cache-dir /var/cache/restic /home

# Restic: Limit bandwidth for backup over slow connections
restic backup --limit-upload 5000 /home  # 5 MB/s limit

# Borg: Use checkpoints for very large backups
borg create --checkpoint-interval 600 ::archive /large-dataset

# Borg: Limit upload bandwidth
export BORG_RSH="ssh -o 'ProxyCommand=pv -qL 5m | nc %h %p'"
```

### Disaster Recovery Checklist

1. **Document your backup strategy** including repository locations and credentials
2. **Test restoration regularly** (at least quarterly)
3. **Keep offline copies** of encryption keys
4. **Maintain 3-2-1 backup rule**: 3 copies, 2 different media, 1 offsite
5. **Monitor backup completion** and set up alerts for failures

```bash
# Create a restoration test script
sudo tee /usr/local/bin/test-restore.sh << 'EOF'
#!/bin/bash
set -e

RESTORE_DIR=$(mktemp -d)
echo "Testing restoration to $RESTORE_DIR"

# Test restic restore
export RESTIC_REPOSITORY="/backup/restic-repo"
export RESTIC_PASSWORD_FILE="/etc/backup-credentials/restic-password"
restic restore latest --target "$RESTORE_DIR/restic" --include "/etc/hostname"

# Verify restored file
if [ -f "$RESTORE_DIR/restic/etc/hostname" ]; then
  echo "Restic restore: SUCCESS"
else
  echo "Restic restore: FAILED"
  exit 1
fi

# Cleanup
rm -rf "$RESTORE_DIR"
echo "Restoration test completed successfully"
EOF

sudo chmod +x /usr/local/bin/test-restore.sh
```

---

## Conclusion

Both restic and borg are excellent choices for automated backups on Ubuntu. Restic shines with its native cloud storage support and simple single-binary deployment, while borg excels in raw performance and compression options.

Key takeaways:

- **Always encrypt your backups** - both tools provide strong encryption by default
- **Use systemd timers** for reliable scheduling instead of cron
- **Implement retention policies** to manage storage costs
- **Test your restores regularly** - a backup you cannot restore is worthless
- **Monitor backup completion** and set up alerts for failures
- **Follow the 3-2-1 rule** for critical data

With the configurations provided in this guide, you now have a production-ready automated backup system that will protect your data against various failure scenarios.

## Related Resources

- [Restic Documentation](https://restic.readthedocs.io/)
- [Borg Documentation](https://borgbackup.readthedocs.io/)
- [Ubuntu Server Backup Best Practices](https://ubuntu.com/server/docs/backups-introduction)
- [Systemd Timer Documentation](https://www.freedesktop.org/software/systemd/man/systemd.timer.html)
