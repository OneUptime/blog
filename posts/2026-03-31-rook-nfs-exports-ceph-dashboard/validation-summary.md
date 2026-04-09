# Validation Summary: How to Create NFS Exports via Ceph Dashboard in Rook

## Status
validated

## Post Type
Tutorial / Step-by-step Guide

## Technologies Covered
- Rook (Kubernetes Ceph operator)
- Ceph Dashboard (Manager Dashboard module)
- NFS-Ganesha (NFS gateway for Ceph)
- CephFS (Ceph Filesystem)
- Kubernetes (kubectl, services, secrets)

## Sources Consulted
- Rook Ceph Dashboard Documentation — https://rook.io/docs/rook/latest/Storage-Configuration/Monitoring/ceph-dashboard/
- Ceph NFS Manager Module Documentation — https://docs.ceph.com/en/reef/mgr/nfs/
- Ceph Dashboard NFS Form Component Source — https://github.com/ceph/ceph/blob/main/src/pybind/mgr/dashboard/frontend/src/app/ceph/nfs/nfs-form/nfs-form.component.html
- Ceph Dashboard NFS Form TypeScript — https://github.com/ceph/ceph/blob/main/src/pybind/mgr/dashboard/frontend/src/app/ceph/nfs/nfs-form/nfs-form.component.ts
- Ceph Dashboard Documentation — https://github.com/ceph/ceph/blob/main/doc/mgr/dashboard.rst
- Red Hat Ceph Storage 5 Dashboard Guide — NFS Ganesha Management

## Issues Found

1. **Fabricated "Ganesha section" in navigation (line 41-43)**: The post described a 3-step navigation: click NFS, then select NFS under a "Ganesha section." There is no "Ganesha section" in the Ceph Dashboard UI. NFS is a top-level menu item. **Fixed** by simplifying to a 2-step navigation: click NFS in the left nav, and the export list is displayed.

2. **Incorrect form field names in export creation (lines 50-59)**: Multiple field names did not match the actual Ceph Dashboard UI:
   - "Storage Backend: CephFS" — removed; this is not a visible field label in the current dashboard. The backend type (CephFS vs RGW) is determined by internal form logic.
   - "Filesystem" — changed to **"Volume"** to match the actual UI label.
   - "Pseudo Path" — changed to **"Pseudo"** to match the actual UI label.
   - "Protocols" — changed to **"NFS Protocol"** to match the actual UI label.
   - "Transports" — changed to **"Transport Protocol"** to match the actual UI label.

3. **Incorrect squash values (lines 56, 75)**: The post used "Squash: None" and "Squash: Root" which do not match the Ceph Dashboard dropdown options. **Fixed** to `no_root_squash` and `root_squash` respectively, which are the canonical values shown in the dashboard UI.

4. **Incorrect NFS daemon monitoring navigation (lines 87-93)**: The post described an "NFS > Daemons" sub-navigation that does not exist. NFS daemon status is available under **Cluster > Services** in the Ceph Dashboard, not under a dedicated NFS daemons view. **Fixed** the navigation path and removed the fabricated sub-navigation structure.

5. **Misleading "Storage Backend" reference for RGW exports (line 62)**: The instruction to "change Storage Backend to RGW" referenced a non-existent field label. **Fixed** to a more accurate description of RGW backend support.

## Review Notes
- The `base64 -d` flag in the password retrieval command works on Linux but not on all macOS versions (which may require `base64 -D` or `base64 --decode`). This is a minor portability concern but was not changed since it works on the most common platforms.
- The Ceph Dashboard NFS form also includes fields for Security Label, Subvolume Group, Subvolume, and a Clients section that the post does not mention. These omissions are acceptable for a getting-started tutorial.
- RGW-backed NFS exports via NFS-Ganesha have historically been unstable. The post mentions RGW support briefly, which is technically accurate, but users should be aware of potential stability issues.
- The post correctly describes the RADOS-based configuration storage mechanism and the live-reload behavior of NFS-Ganesha daemons.
