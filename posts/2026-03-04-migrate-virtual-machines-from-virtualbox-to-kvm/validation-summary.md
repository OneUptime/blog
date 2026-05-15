# Validation Summary: How to Migrate Virtual Machines from VirtualBox to KVM on RHEL

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Red Hat Enterprise Linux
- KVM
- QEMU qemu-img
- libvirt
- virt-install
- VirtualBox disk images
- firewalld
- SELinux

## Sources Consulted
- Red Hat Enterprise Linux 8 documentation, "Converting between virtual disk image formats": https://docs.redhat.com/en/documentation/red_hat_enterprise_linux/8/html/configuring_and_managing_virtualization/managing-storage-for-virtual-machines_configuring-and-managing-virtualization
- Red Hat Enterprise Linux 10 documentation, "Preparing RHEL to host virtual machines": https://docs.redhat.com/en/documentation/red_hat_enterprise_linux/10/html/configuring_and_managing_linux_virtual_machines/preparing-rhel-to-host-virtual-machines
- QEMU documentation, "QEMU disk image utility": https://www.qemu.org/docs/master/tools/qemu-img.html
- QEMU documentation, "Disk Images": https://www.qemu.org/docs/master/system/images.html
- Red Hat Enterprise Linux virtualization documentation references for virt-install import behavior: https://docs.redhat.com/en/documentation/red_hat_enterprise_linux/7/pdf/virtualization_deployment_and_administration_guide/Red_Hat_Enterprise_Linux-7-Virtualization_Deployment_and_Administration_Guide-en-US.pdf

## Issues Found
- The original post used placeholder commands such as `sudo dnf install -y <package-name>`, `sudo systemctl enable --now <service>`, and `sudo <service> --test`. These would not run and did not describe a VirtualBox-to-KVM migration. Replaced them with concrete RHEL virtualization, libvirt, qemu-img, and virt-install commands.
- The original dependency installation recommended `epel-release` and "Development Tools". These are not required for the documented KVM/libvirt migration path on RHEL. Replaced them with RHEL virtualization packages.
- The original configuration section referenced `/etc/<service>/config.conf`, which is not part of a KVM VM import workflow. Replaced it with a `qemu-img convert` command for VirtualBox VDI/VMDK disks and SELinux relabeling for libvirt image storage.
- The original firewall example opened a placeholder service. Replaced it with a conservative example for SSH management and clarified that only required host or guest services should be opened.
- The original monitoring and troubleshooting commands referenced a nonexistent service. Replaced them with `virsh`, `qemu-img`, and `journalctl -u libvirtd` commands that apply to libvirt/KVM.

## Review Notes
Red Hat notes that converting a non-KVM disk image to qcow2 or raw is not always sufficient for a guest to boot correctly on RHEL KVM, because guest drivers and firmware settings may also need adjustment. The post now mentions disk bus, firmware, and driver checks, but a future revision could expand this into separate Linux and Windows migration paths.
