# Validation Summary: How to Monitor Bucket Size and Object Count in Ceph RGW

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Ceph RGW (RADOS Gateway)
- radosgw-admin CLI
- Ceph MGR Prometheus module
- Rook (tagged but not Rook-specific)
- Grafana (mentioned for dashboards)
- Python 3 (scripting example)

## Sources Consulted
- Official Ceph radosgw-admin manpage: https://docs.ceph.com/en/latest/man/8/radosgw-admin/
- Ceph RGW Admin Guide: https://docs.ceph.com/en/latest/radosgw/admin/
- Ceph RGW Metrics Documentation: https://docs.ceph.com/en/latest/radosgw/metrics/
- Ceph MGR Prometheus Module: https://docs.ceph.com/en/latest/mgr/prometheus/
- Ceph RGW Config Reference: https://docs.ceph.com/en/reef/radosgw/config-ref/

## Issues Found

### 1. Incorrect sample output structure for `radosgw-admin bucket stats`
- **What was wrong:** The sample JSON output showed `num_objects`, `size`, `size_actual`, `size_kb`, and `size_kb_actual` as top-level fields. In reality, these fields are nested under `usage.rgw.main` in the actual command output.
- **What was changed:** Replaced the flat sample output with a correctly nested structure showing the `usage.rgw.main` hierarchy, plus `owner` and `bucket_quota` fields for a more accurate representation. Updated the text reference from "The `size` field" to "The `usage.rgw.main.size` field".
- **Why:** Someone trying to parse this output programmatically would look for fields at the wrong JSON path. The Python script later in the post already correctly accessed `usage.rgw.main`, which was inconsistent with the sample output.

### 2. Misleading claim about `rgw_enable_usage_log` requirement
- **What was wrong:** The text stated `rgw_enable_usage_log` is "required for per-user stats", implying it was needed for the `radosgw-admin user stats` command shown just above. In fact, `user stats` works independently via the quota subsystem and does not require usage logging.
- **What was changed:** Changed "(required for per-user stats)" to "(required for `usage show` logs)" to correctly indicate that usage logging is only needed for the `radosgw-admin usage show` command that follows.
- **Why:** `user stats` reads from quota tracking infrastructure (always active). `usage show` reads from usage logs (requires `rgw_enable_usage_log`). These are different subsystems.

### 3. Prometheus section: grep pattern mismatch and incomplete metrics
- **What was wrong:** The command `grep rgw_bucket` would not match any of the listed metrics (`ceph_rgw_req`, `ceph_rgw_get_b`). The metrics were labeled as general but not identified as per-daemon. Per-bucket metrics require additional configuration not mentioned.
- **What was changed:** Changed grep pattern from `rgw_bucket` to `ceph_rgw` to match the actual metric names. Expanded the metrics list with additional commonly used RGW metrics (`ceph_rgw_get`, `ceph_rgw_put`, `ceph_rgw_put_b`, `ceph_rgw_failed_req`). Clarified these are "per-daemon" metrics. Added a note about enabling per-bucket counters via `rgw_bucket_counters_cache`. Changed "per-bucket dashboards" to "RGW dashboards" since the MGR module does not provide per-bucket metrics by default.
- **Why:** The original grep pattern would return no results, which would confuse readers following the tutorial.

## Review Notes
- The post tags "Rook" but all commands use bare `radosgw-admin` and `systemctl`, which applies to non-containerized Ceph deployments. In a Rook/Kubernetes deployment, these commands would be run inside a toolbox pod and the `systemctl restart` would be replaced by restarting RGW pods. This is not technically wrong but could be noted in a future revision.
- The Python scripting example is correct and properly accesses the nested `usage.rgw.main` path.
- The `bucket check --fix` command is technically for fixing index inconsistencies, not just resyncing stats. The description is slightly simplified but not wrong for a monitoring-focused post.
