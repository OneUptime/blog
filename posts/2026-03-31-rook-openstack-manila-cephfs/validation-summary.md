# Validation Summary: How to Set Up OpenStack Manila with CephFS

## Status
validated

## Post Type
Tutorial / Step-by-step guide

## Technologies Covered
- OpenStack Manila (shared filesystem service)
- CephFS (Ceph distributed filesystem)
- Ceph MDS (Metadata Server)
- Ceph authentication (cephx)
- NFS-Ganesha (mentioned as alternative)
- Rook (tagged but not directly used in the guide)

## Sources Consulted
- python-manilaclient source code (`manilaclient/osc/v2/share.py`, `share_types.py`, `share_access_rules.py`) for CLI argument syntax verification
- OpenStack Manila CephFS driver documentation (https://docs.openstack.org/manila/latest/admin/cephfs_driver.html)
- Ceph documentation for `ceph fs volume create`, `ceph auth get-or-create` cap syntax
- OpenStack Manila CLI reference (https://docs.openstack.org/python-manilaclient/latest/cli/osc/v2/share.html)

## Issues Found
1. **Incorrect `openstack share create` syntax in Step 5**: The command used `--size 100` as a named flag, but `size` is a positional argument in the Manila CLI. Changed from `openstack share create --name my-cephfs-share --share-type cephfs --size 100 CEPHFS` to `openstack share create --name my-cephfs-share --share-type cephfs CEPHFS 100`. The original command would have failed with an unrecognized argument error.

## Review Notes
- The Ceph monitor port 6789 used in the mount example (Step 6) is the legacy msgr v1 port. Newer Ceph clusters (Pacific+) default to msgr v2 on port 3300, though v1 typically remains available. The example is still correct but could note the v2 alternative.
- The `systemctl` service names (`openstack-manila-share`, `openstack-manila-api`) follow RHEL/CentOS naming. On Debian/Ubuntu, these are typically `manila-share` and `manila-api`.
- The post is tagged with "Rook" but the guide covers bare-metal Ceph/Manila setup, not a Rook-managed deployment. This is a tagging inconsistency rather than a technical error.
- The `cephfs_volume_mode = 0755` config option is valid but may be more permissive than desired in multi-tenant environments; 0700 is a common hardened alternative.
