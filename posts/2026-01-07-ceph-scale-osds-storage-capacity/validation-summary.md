# Validation Summary: How to Scale Ceph OSDs for Increased Storage Capacity

## Status
validated

## Post Type
Technical guide/tutorial

## Technologies Covered
- Ceph OSDs
- Ceph BlueStore
- ceph-volume
- cephadm and Ceph Orchestrator
- CRUSH maps and OSD weights
- Ceph recovery, backfill, and placement groups
- Ceph Dashboard
- Linux block device preparation and APT repositories

## Sources Consulted
- Ceph Reef Get Packages documentation: https://docs.ceph.com/en/reef/install/get-packages/
- Ceph ceph-volume manual: https://docs.ceph.com/en/latest/man/8/ceph-volume/
- Ceph ceph-volume lvm create documentation: https://docs.ceph.com/en/latest/ceph-volume/lvm/create/
- Ceph Reef ceph-volume lvm prepare documentation: https://docs.ceph.com/en/reef/ceph-volume/lvm/prepare/
- Ceph ceph-volume lvm batch documentation: https://docs.ceph.com/en/latest/ceph-volume/lvm/batch/
- Ceph Reef OSD Service documentation: https://docs.ceph.com/en/reef/cephadm/services/osd/
- Ceph latest OSD Service documentation: https://docs.ceph.com/en/latest/cephadm/services/osd/
- Ceph CLI manual: https://docs.ceph.com/en/latest/man/8/ceph/
- Ceph Reef OSD Configuration Reference: https://docs.ceph.com/en/reef/rados/configuration/osd-config-ref/
- Ceph Dashboard documentation: https://docs.ceph.com/en/latest/mgr/dashboard/
- Ceph Placement Groups documentation: https://docs.ceph.com/en/reef/rados/operations/placement-groups/
- Ceph Health Checks documentation: https://docs.ceph.com/en/latest/rados/operations/health-checks/
- APT apt-key deprecation guidance: https://opensource.com/article/22/9/deprecated-linux-apt-key

## Issues Found
- Replaced the deprecated `apt-key add` repository setup with a per-repository keyring and `signed-by` APT source entry.
- Added a cephadm caveat that target hosts for cephadm-managed OSDs should not manually install `ceph-osd`, because cephadm manages OSD containers.
- Corrected the cephadm OSD spec `rotational` filters from YAML booleans to the documented `1` and `0` values.
- Removed `osd_memory_target` from the OSD service spec example because it is not a valid top-level DriveGroupSpec field in the referenced Ceph OSD service spec.
- Corrected `ceph osd reweight` usage to use the numeric OSD id and the documented 0.0 to 1.0 override range.
- Removed an unsupported fixed range claim for `osd_recovery_priority`; the official reference documents it as an unsigned integer with default 5.
- Corrected the gradual `noin` rollout example: `noin` leaves new OSDs up/out rather than up with CRUSH weight 0, and staged introduction should mark OSDs in one at a time.
- Replaced invalid `ceph pg dump_stuck recovering` with documented stuck states by using `ceph pg dump_stuck unclean`.
- Replaced the obsolete dashboard `set-login-credentials` command with the current `ac-user-create ... -i <password-file> administrator` flow.
- Changed the PG count wording from "must be power of 2" to "use a nearby power of 2" because Ceph treats non-power-of-two PG counts as a health/balance warning, not a hard syntax requirement.

## Review Notes
The guide is technically relevant and broadly accurate after the fixes. Future improvements could mention PG autoscaler behavior more prominently and note that several recovery/backfill tunables can be reset or ignored when the mClock scheduler is active.
