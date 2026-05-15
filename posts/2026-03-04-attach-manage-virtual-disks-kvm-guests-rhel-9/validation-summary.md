# Validation Summary: How to Attach and Manage Virtual Disks for KVM Guests on RHEL 9

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Red Hat Enterprise Linux 9
- KVM/QEMU virtualization
- libvirt and virsh
- qemu-img
- qcow2 and raw disk images
- XFS and ext4 file systems

## Sources Consulted
- Red Hat Enterprise Linux 9: Configuring and managing virtualization - Managing storage for virtual machines: https://docs.redhat.com/en/documentation/red_hat_enterprise_linux/9/html/configuring_and_managing_virtualization/managing-storage-for-virtual-machines_configuring-and-managing-virtualization
- libvirt virsh command reference: https://www.libvirt.org/manpages/virsh.html
- libvirt domain XML format, disk driver and cache attributes: https://libvirt.org/formatdomain.html#elementsDisks
- QEMU qemu-img documentation: https://www.qemu.org/docs/master/tools/qemu-img.html
- Red Hat Enterprise Linux 9: Managing file systems, XFS and ext4 resizing: https://docs.redhat.com/en/documentation/red_hat_enterprise_linux/9/html-single/managing_file_systems/managing_file_systems

## Issues Found
- The `qemu-img create` and stopped-VM `qemu-img resize` examples wrote to `/var/lib/libvirt/images` without elevated privileges. Updated those commands to use `sudo`, which matches typical RHEL libvirt image-directory permissions.
- The running-VM resize example used the image path. libvirt accepts a unique target or source, but the post already identifies `vdb` as the attached target; updated the example to `sudo virsh blockresize vmname vdb 70G` for consistency with `domblklist` target names.
- The guest resize instructions implied that growing the file system alone is always sufficient. Added that the partition or LVM layer must be expanded first when present, which is required before XFS or ext4 can use the extra space.
- The cache-mode table described `writethrough` as the default safe option and `directsync` as maximum data safety. libvirt leaves the default to the hypervisor and documents `directsync` as write-through-like I/O that bypasses the host page cache, so the wording was corrected.

## Review Notes
The reviewed command forms are current and valid for the covered tooling. The article remains a concise guide; a future improvement could add explicit `growpart`, `parted`, or LVM examples for guests that use partitions or logical volumes.
