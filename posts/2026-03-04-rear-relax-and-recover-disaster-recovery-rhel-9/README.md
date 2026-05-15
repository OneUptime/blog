# How to Use ReaR (Relax-and-Recover) for Disaster Recovery on RHEL 9

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: RHEL, ReaR, Disaster Recovery, Backup

Description: Use ReaR on RHEL 9 to create bootable rescue images for disaster recovery.

---

## Overview

Use ReaR on RHEL 9 to create bootable rescue images for disaster recovery. A solid backup strategy protects against data loss from hardware failures, human errors, and security incidents.

## Prerequisites

- A RHEL 9 system with root or sudo access
- Sufficient storage for backup files (local or remote)
- For remote backups: SSH access to the backup destination
- Enabled RHEL repositories to install the `rear` package

## Step 1 - Choose Your Backup Tool

RHEL 9 provides several backup tools:

- **tar** - full archive backups
- **rsync** - incremental file synchronization
- **ReaR** - bare-metal disaster recovery images and system backups
- **LVM snapshots** - point-in-time filesystem snapshots
- **dd** - byte-level disk cloning

For bare-metal recovery on RHEL 9, install and configure ReaR:

```bash
sudo dnf install rear
```

## Step 2 - Create the Backup

Configure ReaR in `/etc/rear/local.conf`. This example uses the built-in `NETFS` backup method and writes a bootable ISO rescue image to a mounted backup destination:

```bash
sudo tee /etc/rear/local.conf >/dev/null <<'EOF'
OUTPUT=ISO
BACKUP=NETFS
BACKUP_URL=file:///mnt/rear-backups/
OUTPUT_URL=file:///mnt/rear-backups/
EOF
```

Create the rescue image and data backup:

```bash
sudo rear mkbackup
```

## Step 3 - Automate with Cron

```bash
echo "0 2 * * * root /usr/sbin/rear mkbackup" | sudo tee /etc/cron.d/rear
```

## Step 4 - Verify the Backup

Always verify that backups are readable:

```bash
sudo ls -lh /mnt/rear-backups/
sudo ls -lh /var/log/rear/
```

## Step 5 - Test Restoration

Periodically restore backups to a test environment to confirm they work:

```bash
# Boot the ReaR rescue image in the test environment, then run:
rear recover
```

## Summary

You have learned how to use ReaR (Relax-and-Recover) for disaster recovery. Remember the 3-2-1 rule: keep three copies of your data, on two different media types, with one copy stored off-site.
