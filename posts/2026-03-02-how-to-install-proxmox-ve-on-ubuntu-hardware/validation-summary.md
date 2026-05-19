# Validation Summary: How to Install Proxmox VE on Ubuntu Hardware

## Status
validated

## Post Type
Tutorial / Step-by-step installation guide

## Technologies Covered
- Proxmox VE 8.x (based on Debian 12 Bookworm)
- KVM (Kernel-based Virtual Machine)
- LXC containers
- ZFS filesystem
- Linux bridges / ifupdown2 networking
- NFS storage
- APT package management
- Debian / Ubuntu hardware compatibility
- `dd` for USB imaging
- fail2ban / SSH hardening

## Sources Consulted
- Proxmox VE official documentation: https://pve.proxmox.com/pve-docs/
- Proxmox VE installation guide: https://pve.proxmox.com/wiki/Installation
- Proxmox VE package repositories: https://pve.proxmox.com/wiki/Package_Repositories
- Proxmox storage manager (`pvesm`) reference: https://pve.proxmox.com/pve-docs/pvesm.1.html
- Proxmox network configuration: https://pve.proxmox.com/wiki/Network_Configuration
- Debian 12 Bookworm release notes
- ifupdown2 documentation (used by Proxmox by default)
- Ubuntu releases archive: https://releases.ubuntu.com/
- `man dd`, `man sshd_config`

## Issues Found
No technical issues found.

All commands, file paths, and configuration syntax were verified against the official Proxmox VE 8.x documentation:

- The ISO URL pattern `https://enterprise.proxmox.com/iso/proxmox-ve_8.X-Y.iso` is correct.
- `/etc/apt/sources.list.d/pve-enterprise.list` is the default enterprise repo file.
- The `pve-no-subscription` repo line `deb http://download.proxmox.com/debian/pve bookworm pve-no-subscription` is correct for Proxmox 8.x on Debian 12.
- `/etc/apt/sources.list.d/ceph.list` is the correct file for the enterprise Ceph repo on Proxmox 8.x.
- The `pvesm` storage commands (`add dir`, `add nfs`, `add zfspool`) and their options match the current CLI reference.
- The `ifreload -a` command works because Proxmox uses `ifupdown2` by default since version 6.
- `/var/lib/vz/template/iso/` is the correct default storage path for ISOs on the `local` storage.
- The web interface default port `8006` (HTTPS) is correct.
- Bridge configuration syntax (`bridge-ports`, `bridge-stp`, `bridge-fd`) matches Debian / ifupdown2 conventions.

## Review Notes
- **Version drift**: The post pins examples to Proxmox VE `8.2-1` and Ubuntu `22.04.4`. As of 2026, newer point releases exist (Proxmox 8.3/8.4, Ubuntu 22.04.5, plus the 24.04 LTS line). The commands and concepts are unchanged, but readers should download whichever current ISO the Proxmox download page lists rather than hardcoding `8.2-1`.
- **macOS `dd` caveat**: The note "On macOS, use `diskutil list` ... and use the same `dd` command" is roughly accurate but glosses over two macOS specifics: device paths are `/dev/diskN` / `/dev/rdiskN` (using the raw device is much faster), and macOS's BSD `dd` does not support `status=progress`. Not a correctness error since the command will still complete; just a UX nuance.
- **Subscription-nag `sed`**: The simple `s/Ext.Msg.show({/void({/` replacement is the well-known community workaround. It works for the nag dialog, but it does match every `Ext.Msg.show({` call in `proxmoxlib.js`, not just the subscription warning. A more surgical regex is sometimes recommended, but the post correctly warns it may need to be reapplied after updates.
- **Hardware minimums**: The post states a 2 GB RAM minimum which aligns with the official Proxmox installation requirements (with the recommendation of substantially more for actual workloads). ZFS is correctly flagged as requiring more RAM.
- No deprecation issues found; all commands shown are current for Proxmox VE 8.x.
