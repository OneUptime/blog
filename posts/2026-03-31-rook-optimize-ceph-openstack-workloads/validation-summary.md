# Validation Summary: How to Optimize Ceph Performance for OpenStack Workloads

## Status
validated

## Post Type
Technical tuning guide

## Technologies Covered
- Ceph (BlueStore, CRUSH, RBD, OSD configuration)
- OpenStack Nova (libvirt disk cache, discard settings)
- RBD client cache configuration
- Ceph messenger v2 protocol
- rbd bench benchmarking tool

## Sources Consulted
- [Ceph RBD Configuration Reference](https://docs.ceph.com/en/reef/rbd/rbd-config-ref/) — RBD cache settings
- [Ceph OSD Configuration Reference](https://docs.ceph.com/en/reef/rados/configuration/osd-config-ref/) — osd_recovery_max_active, osd_max_backfills defaults
- [Ceph rbd man page (Reef)](https://docs.ceph.com/en/reef/man/8/rbd/) — rbd bench CLI options
- [Ceph rbd bench source (Bench.cc)](https://github.com/ceph/ceph/blob/main/src/tools/rbd/action/Bench.cc) — valid --io-type values
- [Nova libvirt configuration (nova/conf/libvirt.py)](https://github.com/openstack/nova/blob/master/nova/conf/libvirt.py) — hw_disk_discard option
- [Nova Spec: Libvirt disk discard option (Juno)](https://specs.openstack.org/openstack/nova-specs/specs/juno/implemented/libvirt-disk-discard-option.html)
- [Ceph CRUSH map documentation](https://docs.ceph.com/en/reef/rados/operations/crush-map/) — CRUSH rule creation

## Issues Found
- **Misleading comment about OSD recovery/backfill settings**: The comment read "Increase recovery/backfill limits to prevent impacting client I/O" but the values `osd_recovery_max_active = 3` and `osd_max_backfills = 1` are the Ceph defaults (3 is the HDD default; SSD default is 10). Setting `osd_recovery_max_active = 3` on SSD-backed OSDs actually *decreases* it from the default of 10. Changed the comment to "Keep recovery/backfill conservative to minimize impact on client I/O" to accurately reflect the intent.

## Review Notes
- The `osd_recovery_max_active` default is 0, which auto-selects 3 for HDD and 10 for SSD. Explicitly setting it to 3 is only meaningful for SSD OSDs where it reduces recovery parallelism. The post could note this HDD/SSD distinction for clarity, but this is an enhancement rather than an error.
- The "2-4x improvement" claim in the summary is reasonable for write-heavy workloads with RBD writeback cache enabled, though actual results vary significantly by workload characteristics.
- All byte values in the RBD cache section are correctly calculated (128 MB, 96 MB, 64 MB).
- The `rbd bench` command correctly uses `--io-type readwrite` (both `readwrite` and `rw` are valid aliases).
- `hw_disk_discard = unmap` is correctly placed as a nova.conf `[libvirt]` option (not a Glance image property).
