# Validation Summary: How to Integrate Ceph with Proxmox VE for VM Storage

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Ceph (RBD block storage)
- Proxmox VE (virtualization platform)
- ceph-common (Ceph client utilities)
- pvesm (Proxmox storage management CLI)
- qm (Proxmox VM management CLI)
- RBD (RADOS Block Device)

## Sources Consulted
- Proxmox VE Wiki — Storage: RBD (https://pve.proxmox.com/wiki/Storage:_RBD)
- Proxmox VE Wiki — Storage Overview (https://pve.proxmox.com/wiki/Storage)
- pvesm(1) Man Page (https://pve.proxmox.com/pve-docs/pvesm.1.html)
- qm(1) Man Page (https://pve.proxmox.com/pve-docs/qm.1.html)
- Ceph User Management Documentation (https://docs.ceph.com/en/latest/rados/operations/user-management/)
- Ceph Basic Block Device Commands (https://docs.ceph.com/en/reef/rbd/rados-rbd-cmds/)

## Issues Found

1. **Incorrect RBD content type in GUI instructions (Step 4):** The post listed "Content: Disk image, ISO image" for the RBD storage. RBD is a block-level storage backend and cannot store ISO images — ISO images require a file-level storage backend (Directory, NFS, CephFS). Changed to "Content: Disk image, Container" to match the valid RBD content types (`images`, `rootdir`). This also aligns with the CLI command in Step 5 which correctly uses `--content images,rootdir`.

2. **Incomplete mgr capabilities for Ceph auth user (Step 3):** The `mgr` capability only granted `profile rbd pool=proxmox-vms`, but the `osd` capability granted access to both `proxmox-vms` and `proxmox-ct` pools. This asymmetry could cause permission errors when Proxmox tries to manage container volumes in the `proxmox-ct` pool. Added `profile rbd pool=proxmox-ct` to the `mgr` capability line.

## Review Notes
- The post uses Ceph monitor port 6789 (v1 messenger protocol). In modern Ceph deployments (Nautilus and later), the v2 messenger on port 3300 is preferred, though 6789 remains supported. This is not an error but readers with newer Ceph clusters may want to use port 3300.
- The `pvesm add rbd` command uses `--keyring` which specifies the keyring file path. For external Ceph clusters, the keyring contents may alternatively be placed at `/etc/pve/priv/ceph/<STORAGE_ID>.keyring` for automatic replication across the Proxmox cluster via pmxcfs.
- The PG counts (128 and 64) in pool creation are reasonable defaults but should be tuned based on the actual number of OSDs in the cluster. Proxmox documentation recommends using the Ceph PG calculator for production deployments.
