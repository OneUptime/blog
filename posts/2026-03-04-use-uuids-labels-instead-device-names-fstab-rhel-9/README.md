# How to Use UUIDs and Labels Instead of Device Names in fstab on RHEL

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: RHEL, fstab, UUID, Storage, File Systems, Linux

Description: Learn how to use UUIDs and file system labels in /etc/fstab on RHEL to ensure stable and predictable device identification across reboots.

---

Device names like `/dev/sda1` or `/dev/vdb2` are not guaranteed to remain the same between reboots. Adding or removing disks, changing BIOS settings, or updating kernel drivers can all cause device names to shift. This means an fstab entry pointing to `/dev/sdb1` might reference a completely different disk after your next reboot. UUIDs and labels solve this problem by providing stable identifiers tied to the file system itself.

## Why Device Names Are Unreliable

The Linux kernel assigns device names based on the order it discovers storage devices. This order can change due to:

- Adding or removing physical disks
- Changes in storage controller initialization order
- Kernel driver loading order changes after updates
- Hot-plugging storage devices
- Virtual machine configuration changes

A system that mounts `/dev/sdb1` as `/data` today might find that `/dev/sdb1` is a completely different partition tomorrow.

## Understanding UUIDs

A UUID (Universally Unique Identifier) is a 128-bit identifier assigned to a file system when it is created. It looks like this:

```text
a1b2c3d4-e5f6-7890-abcd-ef1234567890
```

Every file system has a unique UUID that does not change unless you reformat the partition.

## Finding UUIDs

Use `blkid` to display UUIDs for all block devices:

```bash
sudo blkid
```

Output example:

```text
/dev/sda1: UUID="a1b2c3d4-e5f6-7890-abcd-ef1234567890" TYPE="xfs" PARTUUID="..."
/dev/sda2: UUID="b2c3d4e5-f6a7-8901-bcde-f12345678901" TYPE="swap"
/dev/sdb1: UUID="c3d4e5f6-a7b8-9012-cdef-123456789012" TYPE="ext4"
```

For a cleaner view:

```bash
lsblk -f
```

To find the UUID of a specific device:

```bash
blkid /dev/sdb1
```

## Using UUIDs in fstab

Replace device names with UUID= syntax:

Before (unreliable):

```text
/dev/sdb1  /data  xfs  defaults  0 0
```

After (reliable):

```text
UUID=c3d4e5f6-a7b8-9012-cdef-123456789012  /data  xfs  defaults  0 0
```

## Understanding File System Labels

Labels are human-readable names you assign to file systems. They are easier to remember than UUIDs but must be unique across your system.

## Setting Labels on File Systems

For XFS file systems:

```bash
sudo xfs_admin -L "data" /dev/sdb1
```

For ext4 file systems:

```bash
sudo e2label /dev/sdb1 "data"
```

For swap partitions:

```bash
sudo swaplabel -L "myswap" /dev/sda2
```

## Verifying Labels

```bash
blkid /dev/sdb1
```

Or:

```bash
lsblk -f
```

## Using Labels in fstab

Use LABEL= syntax in your fstab entries:

```text
LABEL=data  /data  xfs  defaults  0 0
```

## Converting an Existing fstab to Use UUIDs

Here is a step-by-step process to migrate your fstab from device names to UUIDs:

1. Back up your current fstab:

```bash
sudo cp /etc/fstab /etc/fstab.bak
```

2. List all current mounts with their UUIDs:

```bash
blkid
```

3. Edit fstab and replace each device name with its UUID:

```bash
sudo vi /etc/fstab
```

4. Test the changes:

```bash
sudo mount -a
```

5. Verify with findmnt:

```bash
findmnt --verify
```

## PARTUUID as an Alternative

For GPT-partitioned disks, you can also use PARTUUID, which identifies the partition itself rather than the file system:

```bash
blkid -s PARTUUID /dev/sdb1
```

Use it in fstab:

```text
PARTUUID=12345678-01  /data  xfs  defaults  0 0
```

PARTUUID is useful when the file system has not been created yet or for identifying partitions independently of their content.

## Choosing Between UUIDs and Labels

| Feature | UUID | Label |
|---------|------|-------|
| Uniqueness | Guaranteed unique | Must be manually kept unique |
| Readability | Hard to read | Easy to read |
| Persistence | Survives everything except reformat | Survives everything except reformat |
| Default in RHEL | Yes | No |
| Risk of collision | None | Possible if labels are duplicated |

For most production systems, UUIDs are the recommended choice because they are automatically unique and require no manual management.

## Troubleshooting

If a mount fails after switching to UUIDs:

1. Boot into rescue mode or use a live image
2. Check that the UUID matches:

```bash
blkid
```

3. Compare with your fstab entries
4. Fix any mismatches and test with `mount -a`

## Summary

Using UUIDs or labels in `/etc/fstab` on RHEL prevents mount failures caused by device name changes. UUIDs are the default and recommended approach because they are automatically unique. Labels offer better readability but require manual uniqueness management. Always test fstab changes with `mount -a` and `findmnt --verify` before rebooting.
