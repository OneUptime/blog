# Validation Summary: How to Install KVM and QEMU on Ubuntu Server

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- KVM (Kernel-based Virtual Machine)
- QEMU
- libvirt / libvirtd / virsh
- virt-install / virtinst
- virt-manager
- libguestfs-tools
- bridge-utils / brctl
- Ubuntu Server (apt, systemctl)
- Netplan (networkd) bridge configuration
- Ubuntu Cloud Images (jammy / 22.04)

## Sources Consulted
- Ubuntu package archive (apt-cache) for `qemu-kvm`, `libvirt-daemon-system`, `libvirt-clients`, `bridge-utils`, `virtinst`, `virt-manager`, `libguestfs-tools`, `virt-top`
- Ubuntu Cloud Images: https://cloud-images.ubuntu.com/jammy/current/jammy-server-cloudimg-amd64.img (verified accessible)
- Ubuntu archive netboot installer: http://archive.ubuntu.com/ubuntu/dists/jammy/main/installer-amd64/current/legacy-images/ (verified accessible)
- libvirt documentation for `virsh` subcommands (`net-list`, `net-start`, `pool-define-as`, `pool-build`, `dominfo`, `dumpxml`, `capabilities`)
- `virt-host-validate` documentation
- Netplan reference for `bridges` / `parameters` (stp, forward-delay)
- KVM kernel module documentation (`kvm`, `kvm_intel`, `kvm_amd`)

## Issues Found
No technical issues found. All commands, package names, CLI flags, configuration snippets, and external URLs were verified and are correct for Ubuntu Server (22.04 LTS jammy and current releases).

## Review Notes
- The classification of KVM as a "Type 1 hypervisor" is a defensible position (used by Red Hat and other authoritative sources) since the KVM kernel module turns the Linux kernel itself into a hypervisor. It is sometimes debated and classified as a hybrid/Type 2 by other sources, but the post's framing is acceptable.
- `virt-top` is referenced in the "Checking KVM Performance" section but is not in the install command's package list. On Ubuntu it ships as a separate `virt-top` package and would need `sudo apt install virt-top` to be available. This is a very minor omission rather than a technical inaccuracy.
- `brctl` (from `bridge-utils`) still works but is considered legacy; the modern equivalent is `ip link show type bridge` / `bridge link`. Including both would be a future improvement, but `brctl` is correct as written.
- `--ram` in `virt-install` is accepted as an alias for `--memory` and continues to work; no action needed.
- The `--location` netboot install method depends on the legacy debian-installer being present at `http://archive.ubuntu.com/ubuntu/dists/jammy/main/installer-amd64/`. Verified the directory still exists and serves files. Future Ubuntu releases may drop this, but it is valid for jammy.
- Loading `kvm_intel` / `kvm_amd` automatically pulls in the `kvm` module as a dependency, so the explicit `modprobe kvm` step is redundant but not incorrect.
