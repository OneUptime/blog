# Validation Summary: How to Configure Ceph with libvirt for Virtual Machine Storage

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Rook-Ceph (Kubernetes-managed Ceph)
- Ceph RBD (RADOS Block Device)
- libvirt / virsh
- virt-manager
- QEMU/KVM virtualization

## Sources Consulted
- libvirt virsh man page — https://libvirt.org/manpages/virsh.html
- libvirt Storage Management — https://libvirt.org/storage.html
- libvirt Secret XML format — https://libvirt.org/formatsecret.html
- libvirt Snapshot XML format — https://libvirt.org/formatsnapshot.html
- libvirt External Snapshot wiki — https://wiki.libvirt.org/I_created_an_external_snapshot_but_libvirt_will_not_let_me_delete_or_revert_to_it.html
- libvirt NEWS.rst release notes — https://github.com/libvirt/libvirt/blob/master/NEWS.rst
- Ceph RBD libvirt integration docs — https://docs.ceph.com/en/latest/rbd/libvirt/
- virt-manager source (storagepool.py) — https://github.com/virt-manager/virt-manager
- GitLab issue on attach-disk network disk support — https://gitlab.com/libvirt/libvirt/-/work_items/16

## Issues Found

1. **Step 4 — `virsh attach-disk` incorrect for RBD disks**: The original command `virsh attach-disk myvm --source ceph-vms/myvm-disk --target vdb --driver qemu --subdriver raw --type disk --persistent` does not work for RBD network disks. The `--source` flag expects a file path or block device; for RBD, it requires additional flags (`--source-protocol rbd`, `--source-host-name`) that still cannot specify cephx authentication. Replaced with `virsh attach-device` using a proper XML disk definition that includes the RBD protocol, monitor addresses, and auth credentials — this is the reliable and documented approach for attaching RBD disks to VMs.

2. **Step 5 — Incorrect virt-manager pool type label**: The post listed the pool type as "rados" (RBD). The actual label in virt-manager's Add Storage Pool dialog is "RADOS Block Device/Ceph" with type identifier `rbd`. Changed to match the actual UI label.

3. **Step 6 — Broken snapshot workflow for raw RBD disks**: The original commands used `virsh snapshot-create-as --disk-only --atomic` followed by `virsh snapshot-revert`. This has multiple problems: (a) external disk-only snapshots on raw RBD disks require an explicit `--diskspec` to specify the overlay location, since libvirt cannot auto-generate file names for network-backed disks; (b) `virsh snapshot-revert` for external snapshots was only added in libvirt 9.9.0 (November 2023) and may not be available on many systems; (c) the qcow2-overlay approach is awkward for RBD where native snapshots are superior. Replaced with RBD native snapshot commands (`rbd snap create/ls/rollback`) which are the standard approach for Ceph-backed VM disks.

## Review Notes
- The `virsh secret-set-value UUID $KEYVAL` syntax (positional argument) is deprecated in favor of `virsh secret-set-value --secret UUID --file keyfile --plain` or `--interactive`. It still works but may emit deprecation warnings. Not changed to keep the post simple, but worth noting for a future update.
- The Ceph auth user creation via `kubectl exec` with output redirection works correctly — the redirect happens on the local shell, capturing the keyring output from the pod.
- The libvirt RBD pool XML structure (Step 2) is correct per libvirt documentation.
- Monitor addresses use Kubernetes service DNS names (`rook-ceph-mon-a.rook-ceph.svc`), which is correct for Rook-Ceph but requires the hypervisor to resolve cluster DNS. This is a valid setup assumption given the prerequisites.
