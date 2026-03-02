# How to Convert an ext4 File System to Btrfs on Ubuntu

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Ubuntu, Btrfs, ext4, File System, Storage

Description: Step-by-step guide to converting an existing ext4 file system to Btrfs on Ubuntu using btrfs-convert, including backup strategies and post-conversion cleanup.

---

Btrfs offers features that ext4 cannot match: snapshots, transparent compression, built-in RAID, and checksumming. If you have an existing ext4 filesystem you want to migrate, the `btrfs-convert` tool can do the conversion in place without needing to copy all data to a new volume.

That said, this is not a trivial operation. A backup beforehand is non-negotiable.

## How btrfs-convert Works

`btrfs-convert` converts an unmounted ext4 filesystem to Btrfs without moving any file data. Instead, it creates the Btrfs metadata structures around the existing ext2/ext3/ext4 data. The original ext4 filesystem image is preserved inside the Btrfs volume as a subvolume called `ext2_saved`, which gives you a rollback path if something goes wrong.

After conversion, you can fully transition to Btrfs by removing the saved ext4 image, which frees up space.

## Prerequisites

Install the required tools:

```bash
sudo apt update
sudo apt install btrfs-progs e2fsprogs
```

Verify `btrfs-convert` is available:

```bash
btrfs-convert --help
```

Also verify your filesystem's block device. For this guide, assume `/dev/sdb1` is the ext4 partition to convert.

## Step 1: Back Up Your Data

Back up before doing anything else. There are no exceptions to this rule.

```bash
# Create a full disk image backup
sudo dd if=/dev/sdb1 of=/backup/sdb1.img bs=4M status=progress

# Or use rsync to back up file contents
sudo rsync -aAXv /mnt/source/ /backup/source/
```

Verify the backup before proceeding.

## Step 2: Check and Repair the ext4 Filesystem

The conversion requires a clean, unmounted filesystem. Run `fsck` to find and fix any errors:

```bash
# Unmount the filesystem first
sudo umount /mnt/source

# Run a full filesystem check
sudo fsck.ext4 -f /dev/sdb1
```

The `-f` flag forces a check even if the filesystem appears clean. Fix any errors that are reported before continuing. Do not proceed with errors present.

## Step 3: Convert to Btrfs

With the filesystem unmounted and verified clean, run the conversion:

```bash
# Convert ext4 to Btrfs
# This preserves the original ext4 image as ext2_saved subvolume
sudo btrfs-convert /dev/sdb1
```

The conversion takes time proportional to the amount of data. For a 100GB filesystem with 50GB of data, expect several minutes. You will see output like:

```
create btrfs filesystem:
        blocksize: 4096
        nodesize:  16384
        features:  extref, skinny-metadata (default)
creating btrfs metadata.
copy inodes [o] [         0/    12345]
creating ext2 image file.
cleaning up system chunk.
conversion complete.
```

If the conversion fails partway through, the filesystem is left in an indeterminate state. This is why the backup is mandatory.

## Step 4: Mount and Verify

Mount the newly converted Btrfs filesystem and verify it looks correct:

```bash
# Mount the Btrfs filesystem
sudo mount /dev/sdb1 /mnt/target

# Check the filesystem
sudo btrfs filesystem show /mnt/target
sudo btrfs filesystem df /mnt/target
```

List subvolumes to see the preserved ext4 image:

```bash
sudo btrfs subvolume list /mnt/target
```

You should see:
```
ID 256 gen 8 top level 5 path ext2_saved
```

Verify your data is intact:

```bash
ls /mnt/target
# Check that all files are present and accessible
```

## Step 5: Update /etc/fstab

The filesystem type has changed from `ext4` to `btrfs`. Update the fstab entry:

```bash
# Find the UUID of the converted filesystem
sudo blkid /dev/sdb1
```

Edit `/etc/fstab`:

```bash
# Old ext4 entry (comment out or remove)
# UUID=old-uuid /mnt/target ext4 defaults 0 2

# New Btrfs entry
UUID=new-uuid /mnt/target btrfs defaults 0 0
```

Note that Btrfs does not use fsck for mount-time checks, so the last field should be `0`, not `1` or `2`.

## Step 6: Verify the Rollback Path

The `ext2_saved` subvolume contains the original ext4 image. You can mount it to verify your data is still accessible via the original ext4 layout:

```bash
# Mount the ext2_saved subvolume
sudo mount -o subvol=ext2_saved /dev/sdb1 /mnt/ext4-backup

# Verify files
ls /mnt/ext4-backup
```

To roll back to ext4 entirely:

```bash
sudo umount /mnt/target
sudo btrfs-convert -r /dev/sdb1
```

The `-r` flag restores the original ext4 filesystem from the saved image.

## Step 7: Remove the ext2_saved Subvolume

Once you have verified everything is working correctly and you no longer need the rollback option, remove the saved ext4 image to reclaim its space:

```bash
# Delete the ext2_saved subvolume to free space
sudo btrfs subvolume delete /mnt/target/ext2_saved
```

Then run a balance to recover and consolidate the freed space:

```bash
# Consolidate space after removing ext2_saved
sudo btrfs balance start -dusage=50 /mnt/target
```

Check the freed space:

```bash
sudo btrfs filesystem usage /mnt/target
```

## Enabling Btrfs Features Post-Conversion

After conversion, you can start taking advantage of Btrfs-specific features.

### Enable Transparent Compression

Compress existing files and enable compression for future writes:

```bash
# Compress existing data by defragmenting with compression
sudo btrfs filesystem defragment -r -czstd /mnt/target/

# Set a mount option for ongoing compression
# Edit /etc/fstab and add compress=zstd
UUID=your-uuid /mnt/target btrfs defaults,compress=zstd 0 0
```

### Create Your First Snapshot

```bash
# Create a subvolume for snapshots
sudo mkdir /mnt/target/.snapshots

# Take a snapshot of the root subvolume
sudo btrfs subvolume snapshot /mnt/target /mnt/target/.snapshots/initial
```

### Run a Scrub to Verify Integrity

```bash
# Verify all data checksums
sudo btrfs scrub start /mnt/target
sudo btrfs scrub status /mnt/target
```

## Known Limitations

**Filesystem size.** The conversion does not change the size of the volume. You can still resize a Btrfs volume after conversion.

**No RAID after single-device conversion.** To use Btrfs RAID, add additional devices and rebalance with a RAID profile.

**Snapshot deduplication.** Files that were hardlinks in ext4 are not automatically converted to shared extents in Btrfs. They become separate copies.

**Kernel version matters.** Older kernels may have bugs with Btrfs features. Ubuntu LTS releases ship with kernels that have solid Btrfs support, but running a current kernel is always safer for Btrfs workloads.

Converting from ext4 to Btrfs is a one-time operation with a meaningful payoff: you get all of Btrfs's advanced features on your existing data without a full reinstall or data migration.
