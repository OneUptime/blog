# How to Migrate from Standalone VDO to LVM-VDO on RHEL

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: RHEL, VDO, LVM, Storage, Migration

Description: Migrate existing standalone VDO volumes to LVM-managed VDO on RHEL 9, which integrates deduplication and compression directly into the LVM stack.

---

RHEL 9 integrates VDO into LVM, replacing standalone VDO volumes. If you are upgrading from RHEL 8 with standalone VDO volumes, you need to migrate them to LVM-VDO.

## Check Current VDO Configuration

```bash
# List existing standalone VDO volumes
sudo vdo list

# Get details about a VDO volume
sudo vdo status --name=my-vdo-volume

# Check the underlying device
sudo vdo status --name=my-vdo-volume | grep "Storage device"
```

## Pre-Migration Steps

```bash
# Back up critical data before migrating
# Ensure the VDO volume is not in use

# Unmount the filesystem
sudo umount /mnt/vdo-data

# Stop the VDO volume
sudo vdo stop --name=my-vdo-volume

# Verify it is stopped
sudo vdo list
```

## Perform the Migration

RHEL 9 provides a conversion tool:

```bash
# Install the conversion tool if not present
sudo dnf install -y lvm2

# Convert the standalone VDO volume to LVM-VDO
# This converts in place without data loss
sudo lvm_import_vdo --name vg-vdo/lv-data /dev/sdb

# The command:
# 1. Creates a PV on the device
# 2. Creates a VG named vg-vdo
# 3. Creates an LV named lv-data with VDO pool
# 4. Preserves all existing data
```

## Verify the Migration

```bash
# Check the new LVM configuration
sudo lvs -a

# Output should show:
# lv-data     vg-vdo  ...
# lv-data_vpool vg-vdo ...  (the VDO pool)

# Check VDO statistics through LVM
sudo lvs -o+vdo_compression,vdo_deduplication

# Verify the data is intact
sudo mount /dev/vg-vdo/lv-data /mnt/vdo-data
ls -la /mnt/vdo-data
```

## Update fstab

```bash
# Replace the old VDO device path with the new LVM path
# Old: /dev/mapper/my-vdo-volume
# New: /dev/vg-vdo/lv-data

sudo vi /etc/fstab
# Change the entry from:
# /dev/mapper/my-vdo-volume /mnt/vdo-data xfs defaults 0 0
# To:
# /dev/vg-vdo/lv-data /mnt/vdo-data xfs defaults 0 0
```

## Managing LVM-VDO

After migration, use standard LVM commands:

```bash
# Check VDO pool usage
sudo lvs -o+vdo_saving_percent vg-vdo

# Extend the VDO logical volume
sudo lvextend -L +50G vg-vdo/lv-data
sudo xfs_growfs /mnt/vdo-data

# Check deduplication and compression stats
sudo lvs -o+vdo_compression_state,vdo_index_state vg-vdo
```

The migration preserves all data and deduplication indexes. After migration, standalone VDO commands (`vdo create`, `vdo status`) are no longer needed.
