# How to Set Up Automated Backups with Cron and rsync on RHEL 9

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: RHEL, Cron, Rsync, Backup

Description: Combine cron and rsync on RHEL 9 for automated backup schedules.

---

## Overview

Combine cron and rsync on RHEL 9 for automated backup schedules. A solid backup strategy protects against data loss from hardware failures, human errors, and security incidents.

## Prerequisites

- A RHEL 9 system with root or sudo access
- Sufficient storage for backup files (local or remote)
- For remote backups: SSH access to the backup destination

## Step 1 - Choose Your Backup Tool

RHEL 9 provides several backup tools:

- **tar** - full archive backups
- **rsync** - incremental file synchronization
- **ReaR** - bare-metal disaster recovery images
- **LVM snapshots** - point-in-time filesystem snapshots
- **dd** - byte-level disk cloning

Select the tool that best matches your recovery requirements.

## Step 2 - Create the Backup

Create the backup directory:

```bash
sudo mkdir -p /backups/latest
```

Using tar for a full backup:

```bash
sudo tar czf /backups/full-backup-$(date +%Y%m%d).tar.gz --exclude=/proc --exclude=/sys --exclude=/dev --exclude=/run --exclude=/tmp --exclude=/backups /
```

Using rsync for incremental backup:

```bash
sudo rsync -aAXv --delete / /backups/latest/ --exclude={/proc,/sys,/dev,/run,/tmp,/backups}
```

## Step 3 - Automate with Cron

```bash
sudo tee /usr/local/bin/backup.sh > /dev/null <<'EOF'
#!/bin/bash
set -euo pipefail

mkdir -p /backups/latest
rsync -aAXv --delete / /backups/latest/ --exclude={/proc,/sys,/dev,/run,/tmp,/backups}
EOF
sudo chmod 0750 /usr/local/bin/backup.sh
echo "0 2 * * * root /usr/local/bin/backup.sh" | sudo tee /etc/cron.d/daily-backup
```

## Step 4 - Verify the Backup

Always verify that backups are readable:

```bash
# For tar
latest_tar=$(ls -t /backups/full-backup-*.tar.gz | head -n 1)
tar tzf "$latest_tar" | head -20

# For rsync
ls -la /backups/latest/
```

## Step 5 - Test Restoration

Periodically restore backups to a test environment to confirm they work:

```bash
# Restore a single file from tar
mkdir -p /tmp/restore-test
latest_tar=$(ls -t /backups/full-backup-*.tar.gz | head -n 1)
tar xzf "$latest_tar" -C /tmp/restore-test etc/hostname
```

## Summary

You have learned how to set up automated backups with cron and rsync. Remember the 3-2-1 rule: keep three copies of your data, on two different media types, with one copy stored off-site.
