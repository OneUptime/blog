# Validation Summary: How to Attach and Manage Virtual Disks (qcow2, raw) on Ubuntu

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Ubuntu
- KVM
- QEMU/qemu-img
- libvirt/virsh
- virt-install
- qcow2 and raw disk images
- Linux partitioning, ext4, LVM, fstrim
- libguestfs virt-sparsify

## Sources Consulted
- QEMU disk image utility documentation: https://www.qemu.org/docs/master/tools/qemu-img.html
- QEMU disk image format documentation: https://www.qemu.org/docs/master/system/images
- QEMU qcow2 image file format documentation: https://www.qemu.org/docs/master/interop/qcow2.html
- libvirt virsh manual: https://www.libvirt.org/manpages/virsh.html
- libvirt domain XML format documentation: https://www.libvirt.org/formatdomain
- virt-install man page: https://manpages.debian.org/virt-install
- libguestfs virt-sparsify manual: https://libguestfs.org/virt-sparsify.1.html
- Ubuntu growpart man page: https://manpages.ubuntu.com/manpages/trusty/man1/growpart.1.html
- resize2fs man page: https://man7.org/linux/man-pages/man8/resize2fs.8.html

## Issues Found
- The raw image section said raw has no thin provisioning and labeled the basic `qemu-img create -f raw` command as preallocated. QEMU documents raw images as sparse on filesystems that support holes, with explicit `preallocation=full` or `preallocation=falloc` options for preallocation. Updated the raw feature description and added an explicit preallocated raw command.
- The qcow2 metadata preallocation example said it uses the full space immediately. QEMU's qcow2 `preallocation=metadata` preallocates metadata, not all guest data. Updated the comment to say data still grows as written.
- The `virsh attach-disk` example combined `--live` and `--persistent`. The virsh manual documents `--persistent` as a compatibility shortcut equivalent to `--live --config` for running domains, while explicit live-plus-persistent is not the documented form. Changed the command to `--live --config`.
- The performance tuning XML snippet placed XML comments inside the `<driver>` start tag, which is not valid XML. Removed the inline comments from the tag while keeping the attributes.

## Review Notes
- The remaining commands and snippets are consistent with current QEMU, libvirt, virt-install, libguestfs, growpart, and resize2fs documentation.
- The post uses `/dev/vdb1` in `/etc/fstab`; using a filesystem UUID would be more robust in production, but the example is technically valid.
