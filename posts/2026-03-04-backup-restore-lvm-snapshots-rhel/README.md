# How to Backup and Restore LVM Snapshots on RHEL

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: RHEL, LVM, Snapshot, Backup, Storage, Linux

Description: Use LVM snapshots on RHEL to create point-in-time copies of logical volumes for consistent backups and quick rollback capabilities.

---

LVM snapshots create a point-in-time copy of a logical volume. This is useful for taking filesystem-consistent backups of mounted filesystems without downtime, or for testing changes with the ability to roll back. For application-consistent backups, quiesce or back up applications such as databases with their own backup tools before creating the snapshot.

## Prerequisites

Verify your LVM setup has free space in the volume group:

```bash
# Check available space in the volume group

sudo vgs

# List existing logical volumes
sudo lvs
```

You need unallocated space in your volume group for the snapshot.

## Creating an LVM Snapshot

Create a snapshot of an existing logical volume:

```bash
# Create a 5 GB snapshot of /dev/rhel/root
sudo lvcreate --size 5G --snapshot \
  --name root-snap \
  /dev/rhel/root

# Verify the snapshot was created
sudo lvs
```

The snapshot only uses space as data changes on the original volume, so size it for the expected write activity while the snapshot exists and monitor its usage. If the snapshot fills up, it becomes invalid.

## Mounting and Backing Up from a Snapshot

Mount the snapshot read-only and create a backup:

```bash
# Create a mount point for the snapshot
sudo mkdir -p /mnt/snap

# Mount the snapshot read-only
# Add nouuid for XFS snapshots while the origin filesystem is mounted
sudo mount -o ro,nouuid /dev/rhel/root-snap /mnt/snap

# Create a tar backup from the snapshot (consistent point-in-time)
sudo tar czf /backup/root-snapshot-$(date +%Y%m%d).tar.gz -C /mnt/snap .

# Unmount when done
sudo umount /mnt/snap
```

## Restoring (Merging) a Snapshot

If you need to roll back the original volume to the snapshot state:

```bash
# Merge the snapshot back into the original volume
# This reverts the original to the snapshot's point-in-time state
sudo lvconvert --merge /dev/rhel/root-snap

# For the root volume, a reboot is required to complete the merge
sudo reboot
```

After reboot, the merge completes and the original volume is restored to the state captured when the snapshot was created.

## Removing a Snapshot

If you no longer need the snapshot:

```bash
# Remove the snapshot to free up space
sudo lvremove /dev/rhel/root-snap
```

## Automating Snapshot Backups

```bash
#!/bin/bash
# /usr/local/bin/snapshot-backup.sh
LV="/dev/rhel/data"
SNAP_NAME="data-snap"
SNAP_SIZE="10G"

# Create snapshot
lvcreate --size "$SNAP_SIZE" --snapshot --name "$SNAP_NAME" "$LV"

# Mount and backup
mkdir -p /mnt/snap
mount -o ro,nouuid "/dev/rhel/${SNAP_NAME}" /mnt/snap
tar czf "/backup/data-$(date +%Y%m%d).tar.gz" -C /mnt/snap .

# Cleanup
umount /mnt/snap
lvremove -f "/dev/rhel/${SNAP_NAME}"
```
