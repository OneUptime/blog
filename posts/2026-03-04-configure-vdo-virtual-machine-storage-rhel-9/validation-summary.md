# Validation Summary: How to Configure VDO for Virtual Machine Storage on RHEL

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Red Hat Enterprise Linux 9
- LVM-VDO
- XFS
- KVM/libvirt
- QEMU disk images
- virt-install and virt-clone
- Linux storage monitoring tools

## Sources Consulted
- Red Hat Enterprise Linux 9 documentation: Deduplicating and compressing logical volumes on RHEL: https://docs.redhat.com/en/documentation/red_hat_enterprise_linux/9/html-single/deduplicating_and_compressing_logical_volumes_on_rhel/
- Red Hat Enterprise Linux 9 documentation: Configuring and managing logical volumes: https://docs.redhat.com/en/documentation/red_hat_enterprise_linux/9/html/configuring_and_managing_logical_volumes/
- libvirt virsh manual: https://www.libvirt.org/manpages/virsh.html
- libvirt Storage Management documentation: https://libvirt.org/storage.html
- QEMU disk image documentation: https://www.qemu.org/docs/master/system/images
- QEMU qemu-img manual: https://www.qemu.org/docs/master/tools/qemu-img.html
- lvmvdo(7) manual page: https://www.man7.org/linux/man-pages/man7/lvmvdo.7.html

## Issues Found
- The prerequisite install command omitted the `vdo` userspace package. Red Hat's RHEL 9 VDO documentation installs `lvm2`, `kmod-kvdo`, and `vdo`, so the package list and `dnf install` command were updated.
- The post described the `lvcreate` command as creating a "200 GB physical volume." The command creates a 200 GB physical VDO pool on an existing LVM volume group, so the wording was corrected.
- The raw image explanation said VDO thin provisioning replaces qcow2 thin allocation. This was too broad because sparse raw files can also allocate only written sectors on file systems that support holes. The text was corrected to distinguish sparse raw file behavior from VDO's block-level thin provisioning.
- The manual clone comment said "copy and register" but only copied the disk image. The comment was corrected to say the copied disk image must be used when defining another VM.
- The block-map cache tuning example changed a VDO setting while the volume was active. Red Hat documentation and lvmvdo(7) indicate these settings require deactivating and reactivating the VDO volume, so the commands were updated to unmount, deactivate, change, reactivate, and remount.
- The write-policy guidance incorrectly recommended `sync` as a blanket production safety setting and framed `async` as a durability tradeoff for development. Red Hat's VDO write-mode documentation states that `sync` and `async` depend on the persistence behavior and cache semantics of the underlying storage, with `auto` as the default. The guidance and commands were corrected accordingly.

## Review Notes
- The core LVM-VDO creation, XFS formatting with `-K`, libvirt directory pool setup, `qemu-img create`, `virt-install`, `virt-clone`, and monitoring examples are technically valid for the RHEL 9/libvirt/QEMU context after the fixes above.
- The article's capacity estimates and 10:1 examples are plausible for homogeneous VM fleets, but actual savings depend heavily on image format, guest workload, discard behavior, and unique data growth.
