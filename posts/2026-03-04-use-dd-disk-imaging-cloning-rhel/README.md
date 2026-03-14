# How to Use dd for Disk Imaging and Cloning on RHEL

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: RHEL, Dd, Disk Imaging, Cloning, Backup, Linux

Description: Use the dd command on RHEL to create exact disk images and clone drives for backup, migration, or replication purposes.

---

The dd command creates byte-for-byte copies of disks and partitions on RHEL. It is useful for disk cloning, creating forensic images, and migrating systems to new hardware.

## Creating a Full Disk Image

Clone an entire disk to an image file:

```bash
# Create a raw image of /dev/sda
# bs sets the block size (larger values improve speed)
# status=progress shows transfer progress
sudo dd if=/dev/sda of=/backup/sda-image.img bs=4M status=progress

# Create a compressed image to save space
sudo dd if=/dev/sda bs=4M status=progress | gzip -c > /backup/sda-image.img.gz
```

Important: the source disk should be unmounted or the system should be booted from rescue media to avoid inconsistencies.

## Cloning a Disk to Another Disk

Copy one disk directly to another:

```bash
# Clone /dev/sda to /dev/sdb (both disks should be the same size or sdb larger)
sudo dd if=/dev/sda of=/dev/sdb bs=4M status=progress conv=sync,noerror
```

Flags:
- `conv=sync` pads incomplete blocks with zeros
- `conv=noerror` continues on read errors instead of stopping

## Cloning a Single Partition

Clone just one partition:

```bash
# Clone a single partition
sudo dd if=/dev/sda1 of=/backup/sda1-backup.img bs=4M status=progress

# Restore the partition image
sudo dd if=/backup/sda1-backup.img of=/dev/sda1 bs=4M status=progress
```

## Restoring from a Disk Image

Write the image back to a disk:

```bash
# Restore from a raw image
sudo dd if=/backup/sda-image.img of=/dev/sda bs=4M status=progress

# Restore from a compressed image
gunzip -c /backup/sda-image.img.gz | sudo dd of=/dev/sda bs=4M status=progress
```

## Creating a Bootable USB from an ISO

dd is commonly used to write ISO images to USB drives:

```bash
# Write a RHEL ISO to a USB drive
# Make sure to identify the correct device (/dev/sdc in this example)
sudo dd if=rhel-9.4-x86_64-dvd.iso of=/dev/sdc bs=4M status=progress oflag=sync
```

## Wiping a Disk Securely

```bash
# Write zeros to a disk (single pass wipe)
sudo dd if=/dev/zero of=/dev/sdb bs=4M status=progress

# Write random data for more secure wiping
sudo dd if=/dev/urandom of=/dev/sdb bs=4M status=progress
```

Always double-check device names before running dd. Writing to the wrong device will destroy data permanently.
