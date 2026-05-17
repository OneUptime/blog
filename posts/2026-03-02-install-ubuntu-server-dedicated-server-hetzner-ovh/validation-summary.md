# Validation Summary: How to Install Ubuntu Server on a Dedicated Server from Hetzner/OVH

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Ubuntu Server 24.04 LTS (Noble Numbat)
- Hetzner Robot (dedicated server panel)
- Hetzner `installimage` tool
- Hetzner Cloud (hcloud) CLI
- OVH / OVHcloud Manager
- OVH rescue mode (rescue-customer-linux)
- `debootstrap` for bootstrap installation
- `parted` for partitioning
- LVM (`pvcreate`, `vgcreate`, `lvcreate`)
- `mdadm` for software RAID
- GRUB EFI bootloader (`grub-efi-amd64`)
- Netplan network configuration
- `ufw` firewall, `fail2ban`, `unattended-upgrades`
- OVH vRack / RTM, OVH monitoring IPs

## Sources Consulted
- Hetzner Docs — installimage: https://docs.hetzner.com/robot/dedicated-server/operating-systems/installimage/
- Hetzner Docs — rescue system: https://docs.hetzner.com/robot/dedicated-server/troubleshooting/hetzner-rescue-system/
- Hetzner Cloud — server types / generation: https://docs.hetzner.com/cloud/servers/overview/ and Hetzner's CX22 launch announcement (Intel CX line refresh, late 2024)
- hcloud CLI reference: https://github.com/hetznercloud/cli and https://docs.hetzner.cloud/
- OVHcloud Docs — installing OS on dedicated server: https://help.ovhcloud.com/csm/en-dedicated-servers-installation
- OVHcloud Docs — rescue mode (netboot): https://help.ovhcloud.com/csm/en-dedicated-servers-rescue-mode
- OVHcloud — monitoring / vRack documentation
- Ubuntu Server install guide & debootstrap manpage
- parted, mdadm, grub-install, lvm2 manpages
- Ubuntu netplan reference: https://netplan.readthedocs.io/

## Issues Found
- **Deprecated Hetzner Cloud server types**: The post used `--type cx21` (twice) and `--type cx31` (once) in the `hcloud server create` examples. Hetzner retired the original Intel CX line (CX11/CX21/CX31/CX41/CX51) and replaced it with the new CX22/CX32/CX42/CX52 generation in late 2024. Updated the examples to use `cx22` and `cx32` so the commands work for new orders.

## Review Notes
- The `installimage` config sample is consistent with Hetzner's documented format (`DRIVE`, `SWRAID`, `BOOTLOADER`, `HOSTNAME`, `PART`, `LV`, `IMAGE`). The image path under `/root/.oldroot/nfs/install/../images/` matches the layout exposed in the current Hetzner rescue NFS share.
- The OVH Manager UI labels ("Install", "Install from an OVH template", profile names like basic/personal/customer, rescue option name `rescue-customer-linux`) match OVHcloud's current documentation, but OVH does periodically restyle the manager — readers should expect minor wording shifts.
- The OVH monitoring CIDR `167.114.37.0/24` is one of OVH's documented probe ranges; OVH has published other monitoring sources over time, so production users should consult OVH's current "infrastructure probes" list rather than allow-listing only this range.
- The dual-NVMe RAID 1 example correctly mirrors `/boot` via `/dev/md0` and the LVM PV via `/dev/md1`, with the ESP intentionally left unmirrored (the comment notes it must be replicated manually after install — this is the standard approach since UEFI firmware cannot read mdadm metadata).
- `parted ... mkpart lvm 1.5GiB 100%` relies on parted's GPT behaviour of treating the first token as the partition name when no recognized fs-type follows; this works but is slightly less explicit than passing `ext2` or similar as a placeholder fs-type.
- `mdadm --create` is non-interactive here; in some rescue environments it may prompt to confirm overwriting an existing array — adding `--yes` is sometimes useful but not strictly required.
- Ubuntu 24.04 (Noble) ships with netplan and systemd-networkd by default, so installing `netplan.io` inside the chroot is harmless but technically redundant on a base image; it is necessary when bootstrapping from `debootstrap` since the minimal bootstrap does not include it.
