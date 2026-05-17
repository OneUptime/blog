# Validation Summary: How to Install Ubuntu Server on VMware Workstation

## Status
validated

## Post Type
Tutorial / Step-by-step Guide

## Technologies Covered
- VMware Workstation Pro 17
- Ubuntu Server 24.04 LTS
- open-vm-tools
- Netplan (network configuration)
- systemd (service management)
- VMware NAT / Bridged / Host-only networking
- VMware Shared Folders (HGFS)
- LVM (storage)

## Sources Consulted
- Ubuntu package metadata for `open-vm-tools` (`apt-cache show open-vm-tools`) - version 2:13.0.0 on Ubuntu 24.04
- open-vm-tools project documentation: https://github.com/vmware/open-vm-tools
- VMware Workstation Pro documentation (Broadcom): https://techdocs.broadcom.com/us/en/vmware-cis/desktop-hypervisors/workstation-pro/17-0.html
- Broadcom announcement (May 2024): VMware Workstation Pro and Fusion Pro free for personal use; Workstation Player discontinued
- Ubuntu Server installation documentation: https://ubuntu.com/server/docs
- Netplan reference: https://netplan.readthedocs.io/
- VMware HGFS shared folders documentation (standard mount path is `/mnt/hgfs/`)

## Issues Found

1. **Outdated prerequisite — VMware Workstation Player**: The post mentioned "or Workstation Player for non-commercial use". Workstation Player was discontinued in May 2024 when Broadcom made Workstation Pro 17 free for personal use. Updated the prerequisite to "(free for personal use)".

2. **Incorrect feature claim — VM Teams**: The intro listed "VM teams" as a Workstation feature. VM Teams was removed from VMware Workstation back in version 7 (2010) and replaced by folders. Removed this from the feature list while keeping snapshots, cloning, and linked clones (which are accurate).

3. **Typo in shared folder mount path**: `/mnt/hflys/<sharename>` was a typo. The correct VMware HGFS mount path is `/mnt/hgfs/<sharename>` (which the post itself uses correctly two lines later in the `ls /mnt/hgfs/` command). Fixed the typo.

4. **Incorrect systemd service name**: The Performance Tips section used `systemctl status vmtoolsd`. The Ubuntu `open-vm-tools` package registers its service as `open-vm-tools.service` (not `vmtoolsd.service` — that name comes from upstream but Debian/Ubuntu packaging renames it). The earlier install section in the same post correctly uses `systemctl status open-vm-tools`. Updated for consistency and correctness on Ubuntu.

## Review Notes

- The Netplan filename `/etc/netplan/00-installer-config.yaml` is the standard name the Ubuntu Server installer creates, but in some cloud-init driven installs the file may instead be `50-cloud-init.yaml`. The post's instruction to verify with `ip link show` first is reasonable guidance.
- The post says NVMe is the "most performant" disk type, and later recommends the Paravirtual SCSI adapter in the Performance Tips section. Both can be valid depending on the host hardware and workload; for very high I/O workloads pvSCSI is typically the recommended choice in VMware documentation, while NVMe virtual disks offer good performance on modern hosts. The minor inconsistency is not a hard error and was left as-is.
- The example VMware NAT subnet `192.168.62.x` is presented as an example; the actual subnet varies per host (default vmnet8 subnet is randomized at install). The post correctly tells the reader to look it up via the Virtual Network Editor or `nat.conf`.
- Network interface name `ens33` is the typical predictable interface name for VMware-based Linux VMs and is correct as the default assumption.
