# Validation Summary: How to Create a Software RAID 0 (Stripe) Array with mdadm on RHEL

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Red Hat Enterprise Linux 9
- Linux software RAID / mdraid
- mdadm
- XFS
- dracut
- /etc/fstab

## Sources Consulted
- Red Hat Enterprise Linux 9 documentation, "Managing RAID": https://docs.redhat.com/en/documentation/red_hat_enterprise_linux/9/html/managing_storage_devices/managing-raid_managing-storage-devices
- Red Hat Enterprise Linux 9 documentation, "Managing file systems": https://docs.redhat.com/en/documentation/red_hat_enterprise_linux/9/html-single/managing_file_systems/managing_file_systems
- mdadm(8) Linux manual page: https://www.man7.org/linux/man-pages/man8/mdadm.8.html
- Local util-linux `wipefs --help` output for `wipefs -a` behavior.

## Issues Found
- The opening explanation said every read and write gets spread across all drives. That was too absolute because RAID 0 stripes data in chunks, and a specific I/O may touch one or more disks depending on offset, size, and chunk size. I changed it to describe chunk-based striping and workload-dependent throughput.
- The chunk-size section said smaller chunks spread small I/O across more disks and can help random reads. That overstated the behavior: smaller chunks distribute data more frequently, but random I/O benefit depends on request size and access pattern, and touching more disks can be a tradeoff. I rewrote the sentence to make the tradeoff accurate.

## Review Notes
The mdadm create, detail, scan, stop, zero-superblock, `wipefs -a`, `mkfs.xfs`, mount, `blkid`, fstab, and dracut commands are syntactically valid for the described workflow. Red Hat's RHEL 9 documentation examples use partitions such as `/dev/sda1` and `/dev/sdc1`, while this post uses whole unused block devices such as `/dev/sdb` and `/dev/sdc`; that is valid with mdadm, but partitions remain the more common documented pattern.
