# Validation Summary: How to Integrate Ceph with OpenStack for Cloud Storage

## Status
validated

## Post Type
Technical tutorial / integration guide

## Technologies Covered
- Ceph RADOS Block Device (RBD)
- OpenStack Glance
- OpenStack Cinder and Cinder Backup
- OpenStack Nova with libvirt/QEMU
- CephX authentication
- Prometheus monitoring for Ceph

## Sources Consulted
- Ceph Documentation: Block Devices and OpenStack - https://docs.ceph.com/en/latest/rbd/rbd-openstack/
- Ceph Documentation: RBD configuration reference - https://docs.ceph.com/en/pacific/rbd/rbd-config-ref/
- Ceph Documentation: Prometheus Manager module - https://docs.ceph.com/en/latest/mgr/prometheus/
- OpenStack Cinder Documentation: Ceph RBD volume driver - https://docs.openstack.org/cinder/2026.1/configuration/block-storage/drivers/ceph-rbd-volume-driver.html
- OpenStack Cinder Documentation: Ceph backup driver - https://docs.openstack.org/cinder/2026.1/configuration/block-storage/backup/ceph-backup-driver.html
- OpenStack Cinder Documentation: configuration options for image direct URL schemes - https://docs.openstack.org/cinder/latest/configuration/block-storage/config-options.html
- OpenStack Glance Documentation: RBD storage backend configuration - https://docs.openstack.org/glance/latest/configuration/glance_api.html
- OpenStack Nova Documentation: libvirt RBD options - https://docs.openstack.org/nova/latest/configuration/config.html
- Ceph Documentation: Using libvirt with Ceph RBD - https://docs.ceph.com/en/pacific/rbd/libvirt/

## Issues Found
- Removed invalid/stale Glance location options from the RBD copy-on-write snippet. Current Glance/Ceph guidance uses `show_image_direct_url`; `show_multiple_locations` and `allowed_direct_url_schemes = rbd` were not valid for the shown Glance configuration.
- Changed the test image upload from qcow2 to raw by adding a `qemu-img convert` step and using `--disk-format raw`, matching Ceph guidance for Ceph-backed VM disks.
- Removed `allowed_direct_url_schemes = cinder,rbd` from `cinder.conf`; current Cinder documentation lists supported direct URL schemes as `file` and `cinder`, not `rbd`.
- Corrected the Nova/Ceph authentication flow to use `client.cinder` consistently for libvirt RBD access instead of creating `client.nova` while configuring the Cinder secret UUID.
- Added missing distribution of the Cinder Backup keyring and `ceph.conf` to the backup node.
- Corrected the meaning of `rbd_exclusive_cinder_pool`; it is a capacity reporting optimization for a dedicated Cinder pool, not an exclusive-lock live migration setting.
- Removed deprecated or unsupported Nova tuning options from the current Nova examples, including `live_migration_flag`, `io_emulator_threads`, and `disk_mode`.
- Fixed `inject_partition` to use the documented disabled value `-1`.
- Removed invalid pool-level `rbd_cache` commands and kept RBD cache tuning in the Ceph client configuration.
- Corrected `rbd_default_features = 3`, which did not enable exclusive-lock as claimed, to use named RBD features.
- Added `rbd create volumes/test-bench --size 1G` before the `rbd bench` command so the benchmark target exists.
- Updated troubleshooting and diagnostic commands to use the Cinder Ceph user consistently.
- Corrected Prometheus alert examples to use plausible Ceph metrics: `ceph_pool_percent_used` for pool capacity and `ceph_health_detail{name="SLOW_OPS"}` for slow operations.

## Review Notes
- The guide remains version-sensitive. Operators should still compare package-specific service names, user/group ownership, and generated sample configuration against their OpenStack distribution.
- The Ceph/OpenStack integration pattern is technically valid, but production deployments should also validate Glance endpoint exposure before enabling `show_image_direct_url`.
