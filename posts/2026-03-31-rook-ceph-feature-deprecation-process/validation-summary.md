# Validation Summary: How to Understand Ceph Feature Deprecation Process

## Status
validated

## Post Type
Guide

## Technologies Covered
- Ceph (storage cluster)
- Rook (Kubernetes operator for Ceph)
- BlueStore / FileStore (Ceph OSD backends)
- Prometheus (alerting rules for Ceph health)
- CephFS (Ceph filesystem)

## Sources Consulted
- Ceph BlueStore Migration Documentation: https://docs.ceph.com/en/reef/rados/operations/bluestore-migration/
- Ceph Reef (v18.2.0) Release Notes: https://ceph.io/en/news/blog/2023/v18-2-0-reef-released/
- Ceph Quincy (v17.2.0) Release Notes: https://ceph.io/en/news/blog/2022/v17-2-0-quincy-released/
- ceph-bluestore-tool man page: https://docs.ceph.com/en/latest/man/8/ceph-bluestore-tool/
- Ceph MGR Prometheus module metrics documentation
- PromQL language specification

## Issues Found

### 1. Incorrect FileStore to BlueStore migration procedure (critical)
**What was wrong:** The post used `ceph-bluestore-tool bluefs-bdev-migrate` for migrating FileStore OSDs to BlueStore. This tool is for moving BlueFS metadata between devices within an already-existing BlueStore OSD — it has nothing to do with FileStore-to-BlueStore conversion. There is no in-place conversion from FileStore to BlueStore; the OSD must be destroyed and recreated.

**What was changed:** Replaced the migration procedure with the correct documented approach: mark OSD out, wait for safe-to-destroy, stop the OSD, destroy it with `ceph osd destroy`, zap the device with `ceph-volume lvm zap`, and recreate as BlueStore with `ceph-volume lvm create --bluestore`.

**Why:** Following the original procedure would fail and could potentially cause data issues. The correct procedure is documented in the official Ceph BlueStore Migration documentation.

### 2. Invalid Prometheus alerting rule PromQL expression
**What was wrong:** The expression `ceph_health_status == 1 and on() ceph_health_detail{type="HEALTH_WARN"} =~ "deprecated"` had three errors:
- `=~` is a PromQL label matcher operator, not a value comparison operator — it cannot be used to regex-match a metric's numeric value against a string.
- `ceph_health_detail` uses a `name` label (containing the health check code), not a `type` label.
- The `and on()` join construct was architecturally wrong for this use case.

**What was changed:** Replaced with `ceph_health_detail{name=~".*DEPRECATED.*"} == 1`, which correctly uses label regex matching on the `name` label to find deprecation-related health checks.

**Why:** The original expression would cause a Prometheus syntax error at rule load time. The corrected expression uses valid PromQL and targets the correct metric labels.

## Review Notes
- The three-phase deprecation lifecycle described is a reasonable general characterization of Ceph's approach, though it is not an officially documented formal process with those exact phase names.
- The FileStore deprecation timeline (deprecated in Nautilus, removed in Reef) is correct. The deprecation process started in Nautilus (14.x), a formal health warning was added in Quincy (17.x), and FileStore support was removed in Reef (18.x).
- The `ceph tell mds.* client ls` command for checking legacy CephFS layouts shows connected clients rather than layout information directly, but is tangentially useful for identifying clients that may be using deprecated features.
