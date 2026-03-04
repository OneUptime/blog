# How to Create Full System Images with dd and Clonezilla on RHEL

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: RHEL, dd, Clonezilla, Disk Imaging, Backups, Linux

Description: Create full disk images and clones of RHEL systems using dd for raw imaging and Clonezilla for intelligent partition cloning.

---

Sometimes you need a complete disk image, not just file backups. dd creates byte-for-byte copies of entire disks, while Clonezilla adds intelligence by only copying used blocks. Both have their place in a backup strategy.

## dd vs Clonezilla

| Feature | dd | Clonezilla |
|---------|---|------------|
| Copies | Every byte | Only used blocks |
| Speed | Slower (copies free space) | Faster |
| Image size | Equal to disk | Only used space |
| Complexity | Simple | More options |
| Filesystem aware | No | Yes |

## Using dd for Disk Imaging

### Create a Full Disk Image

```bash
# Create an image of the entire disk
# WARNING: Run this from a live/rescue environment, not the running system
sudo dd if=/dev/sda of=/backup/sda-image-$(date +%Y%m%d).img bs=64K status=progress

# Create a compressed image
sudo dd if=/dev/sda bs=64K status=progress | gzip -c > /backup/sda-image-$(date +%Y%m%d).img.gz

# Create a compressed image with better compression
sudo dd if=/dev/sda bs=64K status=progress | zstd -T0 > /backup/sda-image-$(date +%Y%m%d).img.zst
```

### Clone a Disk to Another Disk

```bash
# Clone disk to disk (same size or larger destination)
sudo dd if=/dev/sda of=/dev/sdb bs=64K status=progress conv=noerror,sync
```

### Image a Single Partition

```bash
# Image just the root partition
sudo dd if=/dev/sda2 of=/backup/root-partition-$(date +%Y%m%d).img bs=64K status=progress

# Compressed partition image
sudo dd if=/dev/sda2 bs=64K status=progress | gzip > /backup/root-$(date +%Y%m%d).img.gz
```

### Restore from a dd Image

```bash
# Restore a raw image
sudo dd if=/backup/sda-image-20260304.img of=/dev/sda bs=64K status=progress

# Restore a compressed image
gunzip -c /backup/sda-image-20260304.img.gz | sudo dd of=/dev/sda bs=64K status=progress

# Restore with zstd
zstd -d /backup/sda-image-20260304.img.zst --stdout | sudo dd of=/dev/sda bs=64K status=progress
```

### Saving Only Used Blocks with dd

```bash
#!/bin/bash
# Use zerofree to zero unused blocks before imaging (ext4 only)
# This makes compression much more effective

# Unmount the filesystem first (or use from rescue/live environment)
sudo zerofree /dev/sda2

# Now create a compressed image - free space compresses to nearly nothing
sudo dd if=/dev/sda2 bs=64K status=progress | gzip > /backup/root-compact.img.gz
```

## Using Clonezilla

### Installing Clonezilla

Clonezilla runs from its own live environment:

```bash
# Download Clonezilla live ISO
curl -LO https://sourceforge.net/projects/clonezilla/files/clonezilla_live_stable/clonezilla-live-amd64.iso

# Write to USB
sudo dd if=clonezilla-live-amd64.iso of=/dev/sdc bs=4M status=progress
```

### Creating an Image with Clonezilla

1. Boot from the Clonezilla USB/ISO
2. Select "device-image" for disk to image
3. Choose where to save the image (local disk, SSH, NFS, Samba)
4. Select the source disk
5. Clonezilla creates the image, copying only used blocks

### Command-Line Clonezilla

From Clonezilla's live environment:

```bash
# Save a disk image to a local directory
sudo ocs-sr -q2 -c -j2 -z5p -i 4096 -sfsck -senc -p reboot \
    savedisk img-$(date +%Y%m%d) sda

# Save just a partition
sudo ocs-sr -q2 -c -j2 -z5p -i 4096 -sfsck -senc -p reboot \
    saveparts root-img-$(date +%Y%m%d) sda2

# Restore a disk image
sudo ocs-sr -g auto -e1 auto -e2 -r -j2 -c -p reboot \
    restoredisk img-20260304 sda

# Restore a partition image
sudo ocs-sr -g auto -e1 auto -e2 -r -j2 -c -p reboot \
    restoreparts root-img-20260304 sda2
```

### Network Cloning with Clonezilla Server

For cloning to multiple machines simultaneously:

```bash
# On the Clonezilla server, set up multicast cloning
sudo drbl-ocs -b -g auto -e1 auto -e2 -r -x -j2 -sc0 -p reboot \
    startdisk multicast_restoreparts root-img-20260304 sda2
```

## Verifying Images

```bash
# Verify a dd image by mounting it
sudo losetup /dev/loop0 /backup/sda-image-20260304.img
sudo partprobe /dev/loop0
sudo mount /dev/loop0p2 /mnt
ls /mnt
sudo umount /mnt
sudo losetup -d /dev/loop0

# Check a compressed image
gunzip -t /backup/sda-image-20260304.img.gz
```

## Wrapping Up

dd is the simplest imaging tool - it copies everything, byte by byte, with no dependencies or special formats. Clonezilla is smarter - it understands filesystems and only copies used blocks, resulting in smaller images and faster operations. Use dd when you need a guaranteed bit-perfect copy (forensics, disk replacement). Use Clonezilla when you need practical disk imaging for backup and deployment. Both should be run from outside the target system (live USB, rescue mode) for best results.
