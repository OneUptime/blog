# Validation Summary: How to Attach and Manage Virtual Disks for KVM Guests on RHEL

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Red Hat Enterprise Linux
- KVM
- libvirt and virsh
- QEMU disk images and qemu-img
- qcow2 and raw disk formats
- Virtio virtual disks
- Linux guest partition and filesystem growth

## Sources Consulted
- Red Hat Enterprise Linux documentation, "Configuring and managing Linux virtual machines": https://docs.redhat.com/en/documentation/red_hat_enterprise_linux/10/html-single/configuring_and_managing_linux_virtual_machines/configuring_and_managing_linux_virtual_machines
- libvirt Domain XML format documentation: https://www.libvirt.org/formatdomain
- QEMU disk image utility documentation: https://www.qemu.org/docs/master/tools/qemu-img.html
- QEMU disk image formats documentation: https://www.qemu.org/docs/master/system/images
- virsh manual page for blockresize, domblklist, domblkinfo, attach and detach device behavior: https://manpages.ubuntu.com/manpages/noble/man1/virsh.1.html

## Issues Found
- The raw image example described raw disks as "fixed size." QEMU documents that raw files can be sparse on filesystems that support holes, so the comment was changed to explain that raw is a simple format and may be sparse unless preallocated.
- The XML example used `cache='writeback' io='native'`. Red Hat's performance examples pair native I/O with `cache='none'`, and libvirt documents both attributes as driver controls. The example was updated to `cache='none' io='native'`.
- The resize section showed `qemu-img resize` without noting that QEMU warns against modifying images used by a running VM. The comment was updated to say to use it only when the VM is shut off or the disk is detached, while keeping `virsh blockresize` for running VMs.
- The conversion section did not warn against converting an image actively used by a VM. A short comment was added to shut down the VM or detach the disk before conversion.

## Review Notes
The remaining commands and claims are consistent with the consulted documentation. The `growpart` and `xfs_growfs` commands are correct for a common RHEL guest layout with an XFS filesystem, but actual guest commands can vary when the disk uses LVM, a different filesystem, or a different partition number.
