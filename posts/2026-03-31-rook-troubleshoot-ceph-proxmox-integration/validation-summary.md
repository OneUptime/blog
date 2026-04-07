# Validation Summary: How to Troubleshoot Ceph-Proxmox Integration Issues

## Status
validated

## Post Type
Troubleshooting Guide

## Technologies Covered
- Ceph (cluster health, OSD, PG, RBD, RADOS)
- Proxmox VE (pvesm, pvesh, qm, pvedaemon)
- RBD (RADOS Block Device) image management and locking
- QEMU/KVM (via Proxmox)

## Sources Consulted
- Ceph official documentation: https://docs.ceph.com/en/latest/rados/operations/health-checks/
- Ceph RBD documentation: https://docs.ceph.com/en/latest/rbd/
- Ceph `tell` command documentation: https://docs.ceph.com/en/latest/rados/operations/monitoring/
- Proxmox VE documentation: https://pve.proxmox.com/wiki/Storage:_RBD
- Proxmox pvesm documentation: https://pve.proxmox.com/pve-docs/pvesm.1.html
- Proxmox pvesh documentation: https://pve.proxmox.com/pve-docs/pvesh.1.html
- Proxmox qm documentation: https://pve.proxmox.com/pve-docs/qm.1.html

## Issues Found
1. **Missing VMID variable in "Diagnosing VM That Won't Start" section**: The code block used `${VMID}` (in the pvesh/python snippet and subsequent commands) without defining it. The variable was only defined in the earlier "Diagnosing VM Disk I/O Errors" code block, which is a separate shell context. Added `VMID=100` at the top of the code block to make it self-contained.

## Review Notes
- The monitor connectivity check uses port 6789 (msgr v1). Since Ceph Nautilus, msgr v2 on port 3300 is the default protocol. Both ports are typically enabled, so checking 6789 is still valid, but readers with v2-only configurations may need to also check port 3300.
- All Ceph CLI commands (`ceph health detail`, `ceph osd stat`, `ceph osd tree`, `ceph pg stat`, `rbd info/status/lock list/lock remove/map`, `rados ls`, `ceph tell osd.*`, `ceph osd pool stats`) use correct syntax and flags.
- All Proxmox CLI commands (`pvesm status`, `pvesh get`, `qm config`, `journalctl -u pvedaemon`) use correct syntax and flags.
- File paths (`/etc/ceph/ceph.client.proxmox.keyring`, `/var/log/pve/qemu-server/`, `/etc/pve/storage.cfg`) are all correct for standard Proxmox-Ceph deployments.
- The `rbd lock remove` command uses the correct argument order: `<image-spec> <id> <locker>`.
