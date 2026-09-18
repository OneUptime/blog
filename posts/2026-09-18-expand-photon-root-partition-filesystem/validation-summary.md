# Validation Summary: How to Expand a Photon OS Root Partition and Filesystem After Growing the VMDK

## Status
validated

## Post Type
Technical guide with shell commands for expanding a Photon OS root partition and ext4 filesystem.

## Technologies Covered
- Photon OS and tdnf package management
- VMware vSphere, VMDK expansion, and SCSI disk rescanning
- Linux block devices, partition tables, and util-linux inspection tools
- cloud-utils and growpart
- ext4 and e2fsprogs/resize2fs
- XFS, LVM, and Photon A/B partition layouts as alternative layouts

## Sources Consulted
- [Photon OS 5 disk-expansion guide](https://vmware.github.io/photon/docs-v5/troubleshooting-guide/file-system-troubleshooting/expanding-disk-partition/) — SCSI rescan path, final-partition expansion, and subsequent ext4 growth.
- [Photon OS root account documentation](https://vmware.github.io/photon/docs-v5/administration-guide/photon-os-packages/root-account-and-sudo-commands/) — administrative commands assume root; sudo may be absent on minimal images.
- [Photon tdnf commands](https://vmware.github.io/photon/docs-v5/administration-guide/managing-packages-with-tdnf/standard-syntax-for-tndf/commands/) — package installation syntax.
- [Photon 5.0 cloud-utils package specification](https://raw.githubusercontent.com/vmware/photon/5.0/SPECS/cloud-utils/cloud-utils.spec) — packages growpart 0.32 and declares its partition-tool dependencies.
- [Photon 5.0 e2fsprogs package specification](https://raw.githubusercontent.com/vmware/photon/5.0/SPECS/e2fsprogs/e2fsprogs.spec) — filesystem utility package and installed administrative binaries.
- [Canonical growpart 0.32 source and embedded help](https://raw.githubusercontent.com/canonical/cloud-utils/0.32/bin/growpart) — disk/partition arguments, `-N` dry run, unchanged starting sector, kernel partition updates, and LVM handling.
- [util-linux findmnt manual](https://raw.githubusercontent.com/util-linux/util-linux/master/misc-utils/findmnt.8.adoc), [lsblk manual](https://man7.org/linux/man-pages/man8/lsblk.8.html), [blkid manual](https://raw.githubusercontent.com/util-linux/util-linux/master/misc-utils/blkid.8.adoc), and [sfdisk manual](https://raw.githubusercontent.com/util-linux/util-linux/master/disk-utils/sfdisk.8.adoc) — mount/device inspection, output columns, filesystem identification, and partition-table dumps.
- [GNU Coreutils df source and embedded help](https://raw.githubusercontent.com/coreutils/coreutils/master/src/df.c) — `-h`, `-T`, and filesystem selection by path.
- [Upstream resize2fs manual](https://raw.githubusercontent.com/tytso/e2fsprogs/master/resize/resize2fs.8.in) — online ext4 growth, default target size, partition-size limits, and preservation of the partition start.
- [Broadcom: Increasing the size of a virtual disk](https://knowledge.broadcom.com/external/article?legacyId=1004047) and [Extending a virtual disk](https://knowledge.broadcom.com/external/article?legacyId=1004071) — virtual disk expansion and separate guest filesystem work.
- [Red Hat: Increasing the Size of an XFS File System](https://docs.redhat.com/de/documentation/red_hat_enterprise_linux/7/html/storage_administration_guide/xfsgrow) — growing a mounted XFS filesystem with xfs_growfs.
- [LVM pvresize manual](https://raw.githubusercontent.com/lvmteam/lvm2/main/man/pvresize.8_pregen) and [lvextend manual](https://raw.githubusercontent.com/lvmteam/lvm2/main/man/lvextend.8_pregen) — physical-volume and logical-volume expansion.
- [Photon A/B partition configuration](https://vmware.github.io/photon/docs-v5/user-guide/a_b_partition_overview/configuring-ab-partition/) — paired root partitions and separate update-layout requirements.

## Issues Found
- **Missing privilege prerequisite:** The instructions did not state that the guest commands require a root shell. Package installation, raw-device changes, and writing the SCSI rescan attribute require administrative privileges. Added “Run the guest commands below in a root shell.” before the first command block. This also ensures the shell performs the sysfs redirection with sufficient privileges and matches Photon's documented administrative environment.

## Review Notes
- Checked every command block and the inline sfdisk example against upstream documentation or source. The command syntax is valid; no deprecated options were identified in the examples.
- The core procedure correctly separates virtual-disk capacity, kernel-visible disk size, partition boundaries, and filesystem size. It preserves the partition start and requires verification of the kernel-visible partition size before filesystem growth.
- The example deliberately requires a final partition with adjacent free space. Its instructions to stop for other partition layouts and handle A/B, encryption, LVM, and XFS separately are appropriate.
- Photon 5.0 packages growpart 0.32. That version can also invoke pvresize automatically for a detected LVM physical volume; an LVM-specific procedure should inspect the resulting PV size before deciding whether a separate pvresize is needed. This does not affect the plain ext4 example or invalidate the stated layer ordering.
- Verified the Photon guide and author-profile links. The GitHub package page could not be retrieved through the web reader, but its exact branch/path was verified through GitHub's raw-content endpoint; no link correction was necessary.
- This was a documentation and source review, not an execution test on a Photon VM. No disk-resizing commands were executed. Actual package availability, kernel support, controller behavior, snapshot constraints, and partition layout must be checked on the target system as the post directs.
