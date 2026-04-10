# Validation Summary: How to Set Up Ceph RBD Pools in Proxmox

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Ceph (RBD block storage, CRUSH rules, PG autoscaling, pool quotas)
- Proxmox VE (pvesm storage management)
- RBD (RADOS Block Device)

## Sources Consulted
- Ceph official documentation: pool operations (`ceph osd pool create`, `set`, `set-quota`) — https://docs.ceph.com/en/latest/rados/operations/pools/
- Ceph CRUSH rules documentation — https://docs.ceph.com/en/latest/rados/operations/crush-map/
- Ceph RBD documentation (`rbd pool init`, application tags) — https://docs.ceph.com/en/latest/rbd/
- Proxmox VE storage documentation (RBD plugin, `pvesm` CLI) — https://pve.proxmox.com/wiki/Storage:_RBD
- Ceph monitoring commands (`ceph df`, `ceph osd pool stats`, `ceph iostat`) — https://docs.ceph.com/en/latest/rados/operations/monitoring/

## Issues Found
No technical issues found.

All commands use correct syntax and valid parameters:
- `ceph osd pool create`, `rbd pool init`, pool parameter settings are all correct.
- CRUSH rule creation with `create-replicated` and device class targeting is accurate.
- `pvesm add rbd` parameters (`--monhost`, `--pool`, `--username`, `--keyring`, `--content`) are valid for Proxmox RBD storage.
- Content types `images` (VM disks) and `rootdir` (containers) are the correct types for RBD storage in Proxmox.
- Pool quota arithmetic `$((10 * 1024**4))` correctly computes 10 TiB.
- Monitor port 6789 (v1 messenger) is correct and widely supported.

## Review Notes
- The tags include "Rook" but the post covers standalone Ceph with Proxmox, not Rook (the Kubernetes Ceph operator). This appears to be a blog-wide tagging convention rather than a content error.
- The quota comment says "10 TB" while the calculation yields 10 TiB (tebibytes). This is a common and widely accepted conflation in system administration contexts.
- The `ceph iostat` command (available since Nautilus) shows cluster-wide I/O, not per-pool I/O. The preceding `ceph osd pool stats` commands already cover per-pool statistics, so the section is complete.
- Newer Ceph deployments may prefer the v2 messenger port (3300) over the v1 port (6789) used in the `--monhost` examples. Both work with Proxmox; 6789 is more universally compatible.
