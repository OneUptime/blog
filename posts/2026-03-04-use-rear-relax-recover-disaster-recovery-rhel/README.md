# How to Use ReaR (Relax-and-Recover) for Disaster Recovery on RHEL

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: RHEL, ReaR, Disaster Recovery, Backup, System Recovery, Linux

Description: Install and configure ReaR on RHEL to create bootable rescue images that can restore your entire system in a disaster recovery scenario.

---

ReaR (Relax-and-Recover) is a disaster recovery framework included in RHEL repositories. It creates a bootable rescue image and a backup of your system, allowing you to restore a RHEL server to bare metal or a new machine.

## Installing ReaR

```bash
# Install ReaR
sudo dnf install -y rear genisoimage syslinux-extlinux

# Verify installation
rear --version
```

## Configuring ReaR

Edit the main configuration file:

```bash
# /etc/rear/local.conf
# Output method - create a bootable ISO
OUTPUT=ISO
OUTPUT_URL=nfs://backup-server.example.com/backup/rear

# Backup method - use tar for the system backup
BACKUP=NETFS
BACKUP_URL=nfs://backup-server.example.com/backup/rear
BACKUP_OPTIONS="nfsvers=4"

# Keep multiple old backups
NETFS_KEEP_OLD_BACKUP_COPY=2

# Exclude temporary directories
EXCLUDE_MOUNTPOINTS=( /tmp /media )

# Include specific programs in the rescue image
PROGS+=( vim less )
```

For local ISO output without NFS:

```bash
# /etc/rear/local.conf - local backup
OUTPUT=ISO
OUTPUT_URL=file:///backup/rear
BACKUP=NETFS
BACKUP_URL=file:///backup/rear
```

## Creating a Rescue Image and Backup

Run ReaR to generate the rescue ISO and the system backup:

```bash
# Create the rescue image and full backup
sudo rear -v mkbackup

# This produces:
# - A bootable ISO image (rescue system)
# - A tar archive of the full system
```

You can also create just the rescue image without a backup:

```bash
# Create only the rescue ISO
sudo rear -v mkrescue
```

## Listing and Verifying Backups

```bash
# Check the output
ls -lh /backup/rear/

# View the ReaR log
cat /var/log/rear/rear-$(hostname).log | tail -20
```

## Restoring from ReaR

1. Boot the server from the ReaR rescue ISO (via USB, CD, or PXE).
2. At the rescue prompt, run:

```bash
# Start the recovery process
rear recover
```

ReaR will recreate the disk layout (partitions, LVM, filesystems) and restore all files from the backup. After recovery, reboot the system. The entire process is designed to be straightforward, restoring the server to its exact pre-failure state.
