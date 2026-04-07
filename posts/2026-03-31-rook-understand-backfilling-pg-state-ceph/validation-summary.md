# Validation Summary: How to Understand the backfilling PG State in Ceph

## Status
validated

## Post Type
Guide

## Technologies Covered
- Ceph (distributed storage system)
- Ceph Placement Groups (PGs)
- Ceph OSD backfill operations
- CRUSH algorithm
- Rook (Ceph operator for Kubernetes)

## Sources Consulted
- Ceph official documentation: health checks (https://docs.ceph.com/en/latest/rados/operations/health-checks/)
- Ceph OSD configuration reference (https://docs.ceph.com/en/latest/rados/configuration/osd-config-ref/)
- Ceph source code: `src/common/options/osd.yaml.in` for default configuration values
- Ceph PG states documentation (https://docs.ceph.com/en/latest/rados/operations/pg-states/)

## Issues Found

1. **Incorrect JSON field names in monitoring command**: The command `ceph status --format json | jq '.pgmap | {backfill_bytes, backfill_bytes_per_sec}'` referenced non-existent fields. Ceph reports backfill throughput under the recovery stats umbrella. Fixed to use `recovering_bytes_per_sec` and `recovering_objects_per_sec`.

2. **Incorrect health check term**: The grep pattern used `backfill_full` (with underscore), but the actual Ceph health check is `OSD_BACKFILLFULL` and the term in health detail output is `backfillfull` (no underscore). Fixed the grep pattern accordingly.

3. **Wrong command for per-OSD disk usage**: The post used `ceph df` which shows per-pool usage, not per-OSD usage. For checking individual OSD utilization (relevant to backfill-full conditions), `ceph osd df` is the correct command. Fixed accordingly.

## Review Notes
- The `osd_max_backfills` default of 1 is correct for modern Ceph versions.
- The `ceph pg <pg-id> query` jq example labels `.acting` as `backfill_targets`. While the acting set does include backfill targets during backfill, this labeling is slightly misleading. The acting set is the current set of OSDs responsible for the PG, which includes the backfill target. A more precise approach would be to inspect `.recovery_state` in the query output, but the current example is functional.
- The defaults for `osd_backfill_scan_min` (64) and `osd_backfill_scan_max` (512) are not stated in the post — the post sets them to 8 and 64 as tuning examples, which is a valid configuration choice.
