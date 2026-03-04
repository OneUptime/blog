# How to Back Up and Restore LVM Metadata on RHEL

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: RHEL, LVM, Backups, Metadata, Storage, Linux

Description: Learn how to back up, inspect, and restore LVM metadata on RHEL to protect your volume group configurations against accidental changes or disk failures.

---

LVM metadata describes the structure of your volume groups, logical volumes, and physical volumes. Losing this metadata can make your data inaccessible even when the underlying disks are perfectly healthy. RHEL includes automatic metadata backup features, but understanding how to manually back up and restore LVM metadata is essential for disaster recovery. This guide covers everything you need to know.

## Prerequisites

- A RHEL system with root or sudo access
- Existing LVM volume groups configured on the system
- The `lvm2` package installed

## How LVM Metadata Works

LVM stores metadata in a dedicated area at the beginning of each physical volume. This metadata contains the complete description of the volume group, including all physical volumes, logical volumes, their sizes, and how extents are allocated.

LVM automatically maintains two types of metadata copies:

1. **Backups**: Stored in `/etc/lvm/backup/`, one file per volume group, containing the current metadata.
2. **Archives**: Stored in `/etc/lvm/archive/`, containing historical versions of metadata before each change.

## Step 1: Examine Automatic Backups

View the current metadata backup for a volume group:

```bash
ls -la /etc/lvm/backup/
```

Each file is named after the volume group. Examine the contents:

```bash
sudo cat /etc/lvm/backup/vg_data
```

This shows the complete metadata including physical volumes, logical volumes, extents, and their mapping.

## Step 2: Examine the Archive

View archived metadata versions:

```bash
ls -la /etc/lvm/archive/
```

Files are named with the volume group name and a sequence number, such as `vg_data_00001-12345678.vg`. Each file represents the metadata state before a specific change.

## Step 3: Configure Metadata Backup Settings

The backup and archive behavior is controlled in `/etc/lvm/lvm.conf`. Review the relevant settings:

```bash
sudo grep -A 5 "backup {" /etc/lvm/lvm.conf
sudo grep -A 5 "archive {" /etc/lvm/lvm.conf
```

Key settings include:

```bash
backup {
    backup = 1
    backup_dir = "/etc/lvm/backup"
}

archive {
    archive = 1
    archive_dir = "/etc/lvm/archive"
    retain_min = 10
    retain_days = 30
}
```

The `retain_min` setting keeps at least 10 archive copies, and `retain_days` keeps archives for 30 days.

## Step 4: Create a Manual Backup

Force a manual metadata backup:

```bash
sudo vgcfgbackup vg_data
```

This writes the current metadata to `/etc/lvm/backup/vg_data`. You can also specify a custom output file:

```bash
sudo vgcfgbackup -f /root/lvm-backups/vg_data_$(date +%Y%m%d).vg vg_data
```

Back up all volume groups at once:

```bash
sudo vgcfgbackup
```

## Step 5: Copy Backups Off-System

For true disaster recovery, copy metadata backups to a remote location:

```bash
sudo mkdir -p /root/lvm-backups
sudo cp /etc/lvm/backup/* /root/lvm-backups/
sudo cp /etc/lvm/archive/* /root/lvm-backups/
```

You can also include these in your regular system backup routine or copy them to a remote server:

```bash
sudo scp /etc/lvm/backup/* user@backup-server:/backups/lvm/
```

## Step 6: Inspect Metadata Contents

Use `vgcfgrestore` with the `--list` flag to see available archives:

```bash
sudo vgcfgrestore --list vg_data
```

This shows all available metadata versions with timestamps and descriptions.

To examine what a specific archive contains:

```bash
sudo cat /etc/lvm/archive/vg_data_00005-12345678.vg
```

Look at the logical volume sections to understand what was configured at that point in time.

## Step 7: Restore LVM Metadata

If metadata is corrupted or accidentally modified, restore from backup:

```bash
sudo vgcfgrestore vg_data
```

This restores from the most recent backup in `/etc/lvm/backup/`. To restore from a specific archive:

```bash
sudo vgcfgrestore -f /etc/lvm/archive/vg_data_00005-12345678.vg vg_data
```

After restoring, reactivate the volume group:

```bash
sudo vgchange -ay vg_data
```

Verify the restoration:

```bash
sudo vgdisplay vg_data
sudo lvs vg_data
```

## Step 8: Restore Metadata to a Replaced Disk

When you replace a physical volume, you may need to restore metadata to the new disk:

```bash
# Initialize the new disk
sudo pvcreate --uuid <old-pv-uuid> --restorefile /etc/lvm/backup/vg_data /dev/sdd1

# Restore the volume group metadata
sudo vgcfgrestore -f /etc/lvm/backup/vg_data vg_data

# Activate the volume group
sudo vgchange -ay vg_data
```

The `--uuid` flag on `pvcreate` assigns the same UUID as the original physical volume, and `--restorefile` tells LVM to set up the metadata area to match the backup.

## Step 9: Recover from Complete Metadata Loss

In extreme cases where all metadata is lost but disks are intact:

```bash
# Scan for physical volumes
sudo pvscan

# If PVs are found but VG metadata is gone, restore from backup
sudo vgcfgrestore -f /root/lvm-backups/vg_data_20260304.vg vg_data

# Activate
sudo vgchange -ay vg_data
```

If no backup file exists, you can try to reconstruct metadata from the on-disk copies:

```bash
sudo vgcfgrestore --force vg_data
```

## Step 10: Automate Metadata Backups

Create a cron job or systemd timer to regularly back up metadata to an external location:

```bash
sudo tee /etc/cron.daily/lvm-backup << 'SCRIPT'
#!/bin/bash
BACKUP_DIR="/root/lvm-backups/$(date +%Y%m%d)"
mkdir -p "$BACKUP_DIR"
vgcfgbackup
cp /etc/lvm/backup/* "$BACKUP_DIR/"
find /root/lvm-backups -mtime +90 -type d -exec rm -rf {} + 2>/dev/null
SCRIPT
sudo chmod +x /etc/cron.daily/lvm-backup
```

## Best Practices

- **Always back up metadata before making changes**: Run `vgcfgbackup` before any LVM modification.
- **Store backups off-system**: Metadata backups on the same disks that failed provide no protection.
- **Document your LVM layout**: Keep a text record of volume group and logical volume configurations alongside metadata backups.
- **Test restoration procedures**: Practice restoring metadata in a test environment before you need to do it in an emergency.
- **Include LVM metadata in system backups**: Ensure `/etc/lvm/backup/` and `/etc/lvm/archive/` are included in your backup strategy.

## Conclusion

LVM metadata backups are your safety net against configuration loss. While RHEL automatically maintains backups and archives, understanding how to manually back up, inspect, and restore this metadata is critical for effective disaster recovery. By combining automatic backups with off-system copies and tested restoration procedures, you can confidently recover from metadata loss scenarios.
