# How to Back Up and Restore /etc Configuration Files on Ubuntu

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Ubuntu, Backup, Configuration Management, etckeeper

Description: Learn multiple strategies for backing up and restoring /etc configuration files on Ubuntu, including etckeeper, manual archives, and automated Git-based version control.

---

The `/etc` directory contains virtually every configuration file that makes your Ubuntu server work the way it does: network settings, service configurations, user account policies, firewall rules, SSH keys, and much more. Losing `/etc` without a backup means manually reconstructing all of that configuration from memory or documentation.

## Why /etc Deserves Special Attention

`/etc` is small - typically under 50 MB - but extraordinarily valuable. A few reasons to back it up separately from your full system backup:

- Changes happen frequently and should be tracked with history
- Knowing exactly what changed and when is crucial for debugging
- Recovery is much faster when you can restore just `/etc` rather than the entire system
- Version control gives you a changelog of every configuration change

## Using etckeeper for Version-Controlled /etc

etckeeper automatically commits changes to `/etc` to a Git repository. Every time you install a package, run an apt upgrade, or manually edit a config file, etckeeper can record the change.

### Installing and Initializing etckeeper

```bash
sudo apt update
sudo apt install etckeeper git

# Initialize the Git repository in /etc
sudo etckeeper init

# Review what will be committed
sudo git -C /etc status

# Make the first commit
sudo etckeeper commit "Initial commit of /etc contents"
```

etckeeper integrates with apt, so package installations and upgrades automatically trigger commits:

```bash
# Install a package - etckeeper automatically commits before and after
sudo apt install nginx

# Check the commit history
sudo git -C /etc log --oneline -10
```

### Configuring etckeeper

```bash
sudo nano /etc/etckeeper/etckeeper.conf
```

```bash
# VCS to use (git, hg, bzr, darcs)
VCS="git"

# Automatically commit before package manager actions
AVOID_COMMIT_BEFORE_INSTALL=0

# Automatically commit at midnight (via cron)
AVOID_DAILY_AUTOCOMMITS=0

# Push to remote after each commit
PUSH_REMOTE=""  # Set to "origin" to push automatically
```

### Setting Up Remote Backup for etckeeper

Push to a private Git repository for off-site backup:

```bash
# Configure a remote (use a private repo - /etc contains sensitive data)
sudo git -C /etc remote add origin git@github.com:username/server-etc-private.git

# Set up SSH key for automated pushing
sudo ssh-keygen -t ed25519 -f /root/.ssh/etckeeper_key -N ""
# Add the public key to your Git host

# Configure Git to use the specific key
sudo git -C /etc config core.sshCommand "ssh -i /root/.ssh/etckeeper_key"

# Push existing history
sudo git -C /etc push -u origin master

# Enable automatic push after each commit
sudo nano /etc/etckeeper/etckeeper.conf
# Set: PUSH_REMOTE="origin"
```

### Viewing /etc History with etckeeper

```bash
# Show full commit history
sudo git -C /etc log --oneline

# Show what changed in a specific commit
sudo git -C /etc show HEAD~3

# Show changes to a specific file
sudo git -C /etc log --oneline -- nginx/nginx.conf

# See differences between dates
sudo git -C /etc diff "@{2 weeks ago}" -- nginx/

# Find when a specific line was introduced
sudo git -C /etc log -S "listen 443" -- nginx/sites-enabled/
```

### Restoring Files with etckeeper

```bash
# Restore a file to its state from 3 commits ago
sudo git -C /etc checkout HEAD~3 -- nginx/nginx.conf

# Restore to a specific date
sudo git -C /etc checkout "@{2026-02-01}" -- ssh/sshd_config

# See what the file looked like before restoring
sudo git -C /etc show HEAD~3:nginx/nginx.conf

# Revert all /etc changes from the last commit
sudo git -C /etc revert HEAD
```

## Manual /etc Backup with tar

For servers without etckeeper, or as an additional backup layer:

```bash
# Create a timestamped archive of /etc
sudo tar -czf /mnt/backup/etc-$(date +%Y%m%d-%H%M%S).tar.gz /etc

# Verify the archive
tar --list --file=/mnt/backup/etc-20260302-020000.tar.gz | head -20

# Create with extended attributes preserved
sudo tar -czpAXf /mnt/backup/etc-$(date +%Y%m%d).tar.gz /etc
```

### Automating /etc Backups

```bash
sudo nano /usr/local/bin/backup-etc.sh
```

```bash
#!/bin/bash
# /etc configuration backup script
# Creates versioned archives and manages retention

set -euo pipefail

BACKUP_DIR="/mnt/backup/etc-archives"
KEEP_DAYS=90
LOG_FILE="/var/log/etc-backup.log"

log() { echo "[$(date '+%Y-%m-%d %H:%M:%S')] $*" | tee -a "$LOG_FILE"; }

mkdir -p "$BACKUP_DIR"

DATE=$(date +%Y%m%d-%H%M%S)
ARCHIVE="$BACKUP_DIR/etc-$(hostname)-$DATE.tar.gz"

log "Creating /etc archive: $ARCHIVE"

# Create archive with permissions preserved
sudo tar \
    --create \
    --gzip \
    --preserve-permissions \
    --file="$ARCHIVE" \
    /etc 2>&1 | tee -a "$LOG_FILE"

log "Archive size: $(du -sh "$ARCHIVE" | cut -f1)"

# Remove old archives
log "Removing archives older than $KEEP_DAYS days"
find "$BACKUP_DIR" -name "etc-*.tar.gz" -mtime +"$KEEP_DAYS" -delete

log "Done. Archives in $BACKUP_DIR:"
ls -lh "$BACKUP_DIR"/*.tar.gz | tail -5
```

```bash
sudo chmod +x /usr/local/bin/backup-etc.sh
```

Schedule daily backups:

```bash
sudo crontab -e
# Run /etc backup nightly at midnight
0 0 * * * /usr/local/bin/backup-etc.sh
```

## Restoring /etc from a tar Archive

```bash
# List contents to confirm what is in the archive
tar --list --file=/mnt/backup/etc-archives/etc-myserver-20260302.tar.gz | head -30

# Restore a specific file
sudo tar --extract \
  --file=/mnt/backup/etc-archives/etc-myserver-20260302.tar.gz \
  --directory=/ \
  etc/nginx/nginx.conf

# Restore an entire subdirectory
sudo tar --extract \
  --file=/mnt/backup/etc-archives/etc-myserver-20260302.tar.gz \
  --directory=/ \
  etc/nginx/

# Restore all of /etc to a temporary location for review
mkdir /tmp/etc-restore
sudo tar --extract \
  --file=/mnt/backup/etc-archives/etc-myserver-20260302.tar.gz \
  --directory=/tmp/etc-restore/

# Compare restored with current
diff -r /tmp/etc-restore/etc/nginx/ /etc/nginx/
```

## Protecting Sensitive Files in /etc

Some files in `/etc` contain secrets that need extra protection in backups:

```bash
# Files with sensitive content - check permissions
ls -la /etc/passwd /etc/shadow /etc/sudoers
ls -la /etc/ssl/private/
ls -la /etc/ssh/*key

# Encrypt your /etc backup archives
sudo tar -czf - /etc | \
  gpg --symmetric --cipher-algo AES256 \
  > /mnt/backup/etc-$(date +%Y%m%d).tar.gz.gpg

# Decrypt when needed
gpg --decrypt /mnt/backup/etc-20260302.tar.gz.gpg | tar -xzf -
```

For etckeeper with a remote Git repository, ensure the repository is private. The `/etc/shadow` file contains password hashes, `/etc/ssl` may contain private keys, and `/etc/wpa_supplicant` may contain WiFi passwords.

etckeeper automatically handles file permissions and marks sensitive files in `.gitignore` by default:

```bash
# View what etckeeper ignores
cat /etc/.gitignore

# See what is sensitive (marked in etckeeper config)
sudo git -C /etc ls-files --others --ignored --exclude-standard
```

## Tracking Changes Between Upgrades

A common use case is seeing what changed after a system upgrade:

```bash
# Commit before upgrade
sudo etckeeper commit "Pre-upgrade snapshot: $(lsb_release -sd)"

# Run the upgrade
sudo apt upgrade

# See what the upgrade changed in /etc
sudo git -C /etc diff HEAD
sudo git -C /etc log --oneline -5
```

This makes it easy to spot unexpected configuration changes introduced by package upgrades - a valuable debugging tool when services misbehave after updates.

## Creating a Restore Runbook

Document your /etc restore procedure:

```bash
# Create a simple restore reference document
sudo tee /root/etc-restore-procedure.txt << 'EOF'
/etc Restore Procedure

From etckeeper (for individual files):
  sudo git -C /etc checkout <commit-hash> -- <path/to/file>
  sudo systemctl restart <affected-service>

From tar archive (for individual files):
  sudo tar -xzf /mnt/backup/etc-archives/<archive>.tar.gz -C / etc/<file>

From tar archive (full restore after system reinstall):
  sudo tar -xzpf /mnt/backup/etc-archives/<archive>.tar.gz -C /
  sudo systemctl daemon-reload

Git repository for off-site backup:
  git@github.com:username/server-etc-private.git
  SSH key: /root/.ssh/etckeeper_key

Recent backup locations:
  Local tar: /mnt/backup/etc-archives/
  Git remote: Check 'git -C /etc remote -v'
EOF
```

Combining etckeeper for version control with scheduled tar archives for point-in-time snapshots gives you both the change history you need for debugging and the reliable restore points you need for disaster recovery. The storage cost is minimal given how small `/etc` is, and the operational value is immense.
