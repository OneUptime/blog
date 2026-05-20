# Validation Summary: How to Debootstrap a Minimal Ubuntu System from Scratch

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Ubuntu 24.04 Noble
- debootstrap
- chroot
- Linux pseudo-filesystems
- GPT, EFI System Partitions, ext4, VFAT
- GRUB EFI
- systemd and systemd-networkd
- Netplan
- QEMU and OVMF
- Docker image import

## Sources Consulted
- Debian debootstrap manpage/source: https://sources.debian.org/src/debootstrap/1.0.141/debootstrap.8
- Debian debootstrap source usage output: https://sources.debian.org/src/debootstrap/1.0.141/debootstrap
- Ubuntu debootstrap installation guide: https://help.ubuntu.com/community/Installation/FromLinux
- Ubuntu Noble debootstrap package metadata: https://packages.ubuntu.com/noble/debootstrap
- GNU GRUB `grub-install` local manpage
- GNU coreutils `chroot` local manpage
- systemd `systemctl` local manpage
- systemd-networkd local manpage
- Netplan YAML documentation: https://netplan.readthedocs.io/en/latest/netplan-yaml/
- Ubuntu Noble `ovmf` file list: https://packages.ubuntu.com/noble/all/ovmf/filelist
- Docker image import documentation: https://docs.docker.com/reference/cli/docker/image/import/

## Issues Found
- The introduction overstated debootstrap as directly creating a bootable system and as the current Ubuntu installer's internal process. Changed it to describe debootstrap as a low-level base-system/root-filesystem construction tool.
- The ARM64 example implied the same command would create an ARM64 chroot on x86_64 with QEMU. Changed the wording to limit that command to ARM64 hosts, because cross-architecture bootstraps need additional foreign/second-stage setup.
- The `minbase` and default variant descriptions were imprecise. Updated them to match the debootstrap manpage: `minbase` includes required packages and `apt`; the default installs required and important packages including `apt`.
- The package-count command used `grep '.list'`, where `.` matched any character. Changed it to `grep -c '\.list$'`.
- The bootable disk walkthrough tried to use `${LOOP}` inside the chroot when generating `/etc/fstab`; that shell variable is not available there. Changed the flow to capture partition UUIDs before entering the chroot and pass them through the chroot environment.
- The GRUB section mounted host EFI variables and used a normal NVRAM install path, which can fail on non-UEFI hosts or when building a portable disk image. Changed the install command to use `--removable --no-nvram` and removed the efivars mount/unmount steps.
- The bootable install configured Netplan but did not explicitly install `netplan.io`. Added it to the package list.
- The Netplan example targeted `enp0s3`, which is VirtualBox-specific and unlikely for the QEMU virtio NIC used later. Changed it to a name match for `en*`, with `renderer: networkd` and `optional: true`.
- The QEMU test command used `/usr/share/OVMF/OVMF_CODE.fd`, which is not the Noble package path. Updated it to `OVMF_CODE_4M.fd` and added a writable copy of `OVMF_VARS_4M.fd`.
- The Docker chroot package-install example ran `apt install` without refreshing package indexes. Added `apt update` first.

## Review Notes
The tutorial is technically relevant and now validates against the referenced documentation. Some operational details remain environment-dependent, such as exact network device names outside QEMU, Secure Boot behavior, and package availability on non-Ubuntu hosts.
