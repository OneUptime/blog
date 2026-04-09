# Validation Summary: How to Migrate Proxmox VMs Between Ceph-Backed Nodes

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Proxmox VE (VM and container management)
- Ceph RBD (RADOS Block Device) shared storage
- QEMU/KVM virtual machines (`qm` CLI)
- LXC containers (`pct` CLI)
- Proxmox cluster management (`pvecm`, `pvesh`)

## Sources Consulted
- Proxmox VE `qm(1)` man page — https://pve.proxmox.com/pve-docs/qm.1.html
- Proxmox VE `pct(1)` man page — https://pve.proxmox.com/pve-docs/pct.1.html
- Proxmox VE Cluster Manager documentation — https://pve.proxmox.com/pve-docs/chapter-pvecm.html
- Proxmox VE API documentation (migration endpoint bandwidth parameter)
- Ceph mgr iostat module documentation — https://docs.ceph.com/en/quincy/mgr/iostat/
- Proxmox community forums on LXC live migration and task types

## Issues Found

1. **`--bwlimit` unit incorrect (line 29)**: The comment said "(in MB/s)" but Proxmox `qm migrate --bwlimit` uses KiB/s per the official man page. The value `500` would have meant ~0.5 MB/s (far too slow). Changed comment to "(in KiB/s)" and value to `512000` (~500 MiB/s).

2. **USB grep case sensitivity (line 46)**: `grep -E "local|USB|cdrom"` used uppercase `USB`, but Proxmox VM config keys use lowercase (`usb0: host=...`). Since grep is case-sensitive by default, this would never match USB passthrough entries. Changed to `usb` (lowercase).

3. **LXC `--online` flag misleading (line 101)**: `pct migrate 200 pve2 --online --restart` combined two contradictory flags. The `--online` flag attempts CRIU-based live migration which is not reliably supported for LXC in Proxmox VE. The practical and recommended approach is `--restart` alone (stops, migrates, restarts). Removed `--online` and updated the comment to accurately describe the behavior.

4. **`ceph iostat` syntax (line 116)**: `ceph iostat 2` used a bare positional argument for the interval, but the correct syntax requires the `-p` flag: `ceph iostat -p 2`. Fixed to use the documented flag.

5. **Task type filter bug (line 131)**: The Python filter `'migration' in t.get('type','').lower()` would never match any migration tasks because Proxmox uses task types `qmigrate` (VMs) and `vzmigrate` (containers) — neither contains the substring "migration". Changed to `'migrat'` which correctly matches both task types.

## Review Notes
- The bulk migration script works but doesn't handle migration failures gracefully — if one VM fails to migrate, the script continues silently. In a production maintenance scenario, error handling and retry logic would be advisable, but this is acceptable for a tutorial.
- The `watch -n 1 "qm status 100"` command for monitoring migration progress works but won't show which node the VM is on. `qm status 100 --verbose` or checking via `pvesh` would give more detail. This is a minor improvement opportunity, not an error.
- The network interface `eth0` in the `iftop` example may not match modern Proxmox installations which typically use bridge interfaces like `vmbr0` or predictable names like `ens18`. Noted as a minor caveat but left as-is since it's clearly an example.
