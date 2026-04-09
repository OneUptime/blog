# Validation Summary: How to Migrate from OpenStack Cinder LVM to Ceph RBD

## Status
validated

## Post Type
Tutorial / Migration Guide

## Technologies Covered
- OpenStack Cinder (LVM backend and RBD driver)
- Ceph RBD (RADOS Block Device)
- Rook (Ceph operator for Kubernetes)
- LVM (Logical Volume Manager)
- `dd`, `lvcreate`, `rbd import`, `cinder-manage` CLI tools

## Sources Consulted
- Ceph RBD documentation: https://docs.ceph.com/en/latest/rbd/
- Ceph `rbd` man page: https://docs.ceph.com/en/latest/man/8/rbd/
- LVM `lvcreate` man page (for `-l` vs `-L` flag usage)
- OpenStack Cinder Ceph RBD driver configuration: https://docs.openstack.org/cinder/latest/configuration/block-storage/drivers/ceph-rbd-volume-driver.html
- `cinder-manage` CLI reference: https://docs.openstack.org/cinder/latest/cli/cinder-manage.html
- Ceph authentication capabilities documentation: https://docs.ceph.com/en/latest/rados/operations/user-management/

## Issues Found

1. **`lvcreate -L100%ORIGIN` incorrect flag (Step 2, line 49):** The `-L` (uppercase) flag is for absolute sizes (e.g., `-L 10G`). Percentage-based extent specifications like `100%ORIGIN` require the `-l` (lowercase) flag. Changed to `-l 100%ORIGIN`.

2. **`cinder-manage db migrate` is not a valid command (Step 5, line 100):** There is no `migrate` subcommand for `cinder-manage db`. The correct command for updating volume backend assignments after migration is `cinder-manage volume update_host --currenthost <old> --newhost <new>`. Replaced the entire Step 5 command block with the correct `cinder-manage volume update_host` invocation.

3. **`openstack volume update --property volume_backend_name=ceph` ineffective (Step 5, line 101-102):** The `--property` flag sets user-facing metadata on the volume; it does not change the internal `host` database field that determines which backend serves the volume. Removed and replaced with the correct `cinder-manage volume update_host` approach.

4. **Missing file transfer step to Rook toolbox pod (Step 3):** The raw image file created via `dd` on the OpenStack host is not accessible inside the Rook toolbox Kubernetes pod. Added a `kubectl cp` step to copy the file into the toolbox pod before running `rbd import`.

5. **Missing `mgr` capability in Ceph auth command (Handling Ceph Credentials section):** For Ceph Nautilus and later (which Rook deploys), the `mgr` daemon requires explicit capabilities. Added `mgr 'profile rbd pool=replicapool'` to the `ceph auth get-or-create` command for the Cinder client.

## Review Notes
- The post mentions Cinder LVM stores volumes "on compute nodes" in the Understanding section. In practice, LVM volumes are on the Cinder volume/storage node, which may or may not be the same as compute nodes. This is acceptable for a general guide but could be clarified.
- The `--export-format=1` flag on `rbd import` is valid but specifies format 1 (simple raw). Format 2 preserves snapshots and metadata. Since the source is a plain `dd` raw image with no RBD metadata, format 1 is appropriate here.
- The Cinder configuration shown is standard and correct for the RBD driver. Operators should ensure the `rbd_secret_uuid` matches their libvirt secret for Ceph authentication on compute nodes.
