# How to Expand a Photon OS Root Partition and Filesystem After Growing the VMDK

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Photon OS, Storage, VMware

Description: Grow a Photon OS root filesystem after VMDK expansion by verifying each storage layer and using the correct partition and filesystem tools.

---

Increasing a VMDK changes the virtual disk's capacity. It does not necessarily expand the partition or filesystem inside Photon OS. A safe procedure identifies each layer first, then grows only the layers that still report the old size.

The concrete example below covers a plain ext4 root filesystem on the final partition of a disk. LVM, encryption, XFS, and Photon A/B layouts require different intermediate steps; do not apply the example blindly to them.

## Record the current layout

Before changing the VMDK, take a recoverable backup and verify console access. Run the guest commands below in a root shell. Record the current root mount and block devices:

```bash
findmnt /
lsblk -o NAME,SIZE,TYPE,FSTYPE,MOUNTPOINTS
blkid
df -hT /
```

If the minimal image's `lsblk` lacks `MOUNTPOINTS`, use its supported `MOUNTPOINT` column instead. Identify the VMDK by its size and virtual controller position in vSphere, not merely by assuming the first disk contains root.

For a partitioned disk, save its partition layout with an available tool such as `sfdisk --dump /dev/sda` and store the output outside that disk. This is useful recovery evidence, but it does not replace a backup of filesystem content.

Photon's [disk-expansion guide](https://vmware.github.io/photon/docs-v5/troubleshooting-guide/file-system-troubleshooting/expanding-disk-partition/) demonstrates partition growth followed by ext4 filesystem growth. Its example device name is illustrative, not a universal Photon layout.

## Make the guest see the larger disk

Expand the correct VMDK using the supported vSphere procedure for its disk type and snapshot state. Verify datastore capacity before allocating more space. Never attempt to shrink the disk as part of this process.

Back in the guest, inspect `lsblk` again. If it still reports the old whole-disk size, use the device's supported rescan mechanism or perform a controlled reboot. For an ordinary SCSI disk named `sda`, a commonly available rescan interface is:

```bash
echo 1 > /sys/class/block/sda/device/rescan
lsblk
```

Use this only when the path exists and corresponds to the intended disk. NVMe and other device types have different interfaces. A scheduled reboot is preferable to experimenting with unrelated storage paths on a production host.

Do not continue until the whole disk reports the new capacity. Filesystem tools cannot grow beyond the block device size visible to the kernel.

## Grow the correct partition

Suppose inspection confirms root is ext4 on `/dev/sda2`, and partition 2 is the final partition with free space immediately after it. Install the matching Photon tools if absent:

```bash
tdnf install cloud-utils e2fsprogs
```

Photon's [cloud-utils package specification](https://github.com/vmware/photon/blob/5.0/SPECS/cloud-utils/cloud-utils.spec) supplies `growpart`. First review its installed help and perform a dry run:

```bash
growpart -N /dev/sda 2
```

Inspect the proposed start and end sectors. The start must remain unchanged; the end should extend into the intended contiguous free space. Then grow it:

```bash
growpart /dev/sda 2
lsblk
```

If another partition follows root, stop. Moving or deleting that partition is a separate storage migration with different risks. Similarly, do not resize an A/B system's active root partition without understanding its update layout.

If the kernel cannot reread the changed partition table because it is busy, reboot in the maintenance window and verify the new partition size before growing the filesystem. Do not interpret an on-disk table change alone as proof that the kernel sees the new boundary.

## Grow the filesystem

Only after confirming the partition is larger, grow the ext4 filesystem:

```bash
resize2fs /dev/sda2
df -hT /
findmnt /
```

An ext4 filesystem can normally be grown online when the kernel and filesystem support it, but follow any error with investigation rather than a forced repair. Never run a destructive filesystem recreation command to obtain the extra space.

For XFS, the growth operation targets the mounted filesystem with `xfs_growfs`, not `resize2fs`. For LVM, partition growth is followed by physical-volume and logical-volume expansion before the filesystem grows. Use the toolchain and backup plan appropriate to the actual layout.

## Verify the application and next boot

Check kernel logs for storage or filesystem errors and confirm the application can read and write normally. Compare the new filesystem capacity with the intended size, allowing for partition boundaries and filesystem metadata.

Reboot when the change plan requires it and verify root mounts correctly. Keep the before-and-after layout in the maintenance record. The task is complete when the disk, partition, filesystem, and application all recognize usable capacity-not when vSphere alone displays a larger number.
