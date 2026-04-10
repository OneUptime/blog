# Validation Summary: How to Configure CephFS for Proxmox Container Storage

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Ceph (CephFS, CephX authentication, MDS)
- Proxmox VE (pvesm, pct, LXC containers)
- Linux (kernel CephFS client, apt package management)

## Sources Consulted
- [Proxmox VE Wiki: Storage: CephFS](https://pve.proxmox.com/wiki/Storage:_CephFS) — verified supported content types (vztmpl, iso, backup, snippets only; rootdir is NOT supported)
- [Proxmox VE pvesm(1) man page](https://pve.proxmox.com/pve-docs/pvesm.1.html) — verified `pvesm add cephfs` options
- [Proxmox VE pct(1) man page](https://pve.proxmox.com/pve-docs/pct.1.html) — verified `pct create` and `pct set` syntax
- [Proxmox VE Container Toolkit](https://pve.proxmox.com/pve-docs/chapter-pct.html) — verified bind mount syntax
- [Ceph Documentation: FS Volumes and Subvolumes](https://docs.ceph.com/en/latest/cephfs/fs-volumes/) — verified `ceph fs volume create` command
- [Ceph Documentation: CephFS Client Capabilities](https://docs.ceph.com/en/latest/cephfs/client-auth/) — verified auth capability syntax
- [Ceph Documentation: Messenger v2](https://docs.ceph.com/en/latest/rados/configuration/msgr2/) — verified monitor port information

## Issues Found

### Critical: CephFS does not support `rootdir` content type in Proxmox (multiple sections affected)

**What was wrong:** The post claimed CephFS could be used for LXC container rootfs storage. Proxmox CephFS storage only supports content types `vztmpl`, `iso`, `backup`, and `snippets`. The `rootdir` content type requires block-level storage like Ceph RBD.

**Changes made:**
1. **Intro paragraph:** Changed "LXC container rootfs and shared data volumes" to accurately describe CephFS capabilities (templates, ISOs, backups, snippets, shared data). Added note that rootfs requires RBD.
2. **Use Cases section:** Removed "Container rootfs that can be live-migrated between nodes" (incorrect). Replaced with "Container templates and ISO images available on all Proxmox nodes" (correct). Clarified that shared directories use bind mounts.
3. **Step 4 (`pvesm add`):** Changed `--content vztmpl,iso,backup,rootdir` to `--content vztmpl,iso,backup,snippets`. The `rootdir` content type is not supported by CephFS storage.
4. **Step 5 (container creation):** Removed `--storage pve-cephfs` and `--rootfs pve-cephfs:8` (would fail since CephFS doesn't support rootdir). Changed to `--rootfs local-lvm:8` so rootfs is on local/RBD storage, while the template is still sourced from CephFS. Updated section title and added clarifying comment.
5. **Verification section:** Removed commands that assumed rootfs on CephFS (`ls /mnt/pve/cephfs/subvol-200-disk-0/`). Replaced with commands to verify CephFS mount and bind mount configuration.
6. **Summary:** Corrected claims about rootfs on CephFS. Clarified that CephFS is for templates, backups, snippets, and shared bind mounts.

**Why:** Per the Proxmox VE Wiki (Storage: CephFS), CephFS is a file-level storage backend that supports only vztmpl, iso, backup, and snippets. Container rootfs requires block-level storage (Ceph RBD or local LVM).

## Review Notes
- The `--path /mnt/pve/cephfs` option in the `pvesm add cephfs` command is not explicitly documented in the pvesm(1) man page for CephFS storage. It likely works (the path property exists in storage config), but official docs only show it being auto-derived from the storage ID. Users following this guide should be aware the default path would be `/mnt/pve/pve-cephfs/` if `--path` is omitted.
- The OSD capability `allow rw tag cephfs metadata=cephfs` is valid syntax but grants unnecessary access. Regular CephFS clients typically only need `allow rw tag cephfs data=cephfs`. Metadata pool access is handled by MDS daemons. This is not a breaking issue but is overly permissive from a security standpoint.
- Monitor port 6789 (v1 msgr) is valid but modern Ceph clusters (Nautilus+) default to port 3300 (v2 msgr2). Both ports are typically available, so the examples work, but readers with newer clusters may want to use port 3300.
- The `ceph auth get-or-create` command creates a keyring file but the `pvesm add cephfs` command does not specify `--keyring`. For external Ceph clusters, the `--keyring` path may also need to be provided.
