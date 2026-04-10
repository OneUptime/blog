# Validation Summary: How to Configure RBD with libvirt

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Rook-Ceph (Ceph storage orchestrator for Kubernetes)
- Ceph RBD (RADOS Block Device)
- libvirt / virsh (virtualization management)
- QEMU/KVM
- kubectl (Kubernetes CLI)

## Sources Consulted
- libvirt storage pool documentation: https://libvirt.org/storage.html#StorageBackendRBD
- libvirt domain XML format (disk devices): https://libvirt.org/formatdomain.html#hard-drives-floppy-disks-cdroms
- libvirt secret XML format: https://libvirt.org/formatsecret.html
- virsh man page (attach-device, attach-disk, secret-define, secret-set-value, pool-define, vol-create-as, migrate)
- Ceph documentation on libvirt integration: https://docs.ceph.com/en/latest/rbd/libvirt/
- Rook-Ceph documentation on extracting credentials

## Issues Found
1. **Step 5 — Incorrect `virsh attach-disk` command**: The original command `virsh attach-disk myvm --config --live` was wrong for two reasons:
   - `virsh attach-disk` requires positional arguments for source and target (e.g., `virsh attach-disk domain source target`), which were missing.
   - `virsh attach-disk` does not support complex RBD configurations with auth credentials and multiple monitor hosts. The `<disk>` XML shown above requires `virsh attach-device`, which accepts a full XML file describing the device.
   - **Fix**: Changed to `virsh attach-device myvm /tmp/rbd-disk.xml --config --live` with instructions to save the XML to a file first.

## Review Notes
- The post uses port 6789 (legacy v1 msgr protocol) for monitor connections in the pool and disk XML. This is still valid as Ceph supports both v1 (6789) and v2 (3300) messenger protocols, but newer deployments may prefer v2 (port 3300).
- The `cache='writeback'` setting in the disk driver element is a valid choice but users should be aware that `none` is often recommended for RBD to avoid double-caching (since Ceph has its own cache layer).
- The post uses `client.admin` credentials throughout. In production, a dedicated client with restricted capabilities (e.g., `client.libvirt`) scoped to the specific pool would be more secure.
