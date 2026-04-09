# Validation Summary: How to Monitor Object Consistency Across Replicas

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Rook (Ceph operator for Kubernetes)
- Ceph (distributed storage system)
- RADOS (Reliable Autonomic Distributed Object Store)
- Prometheus (monitoring and alerting)
- ceph-objectstore-tool (OSD-level data inspection)
- jq (JSON processing)

## Sources Consulted
- Ceph official documentation on scrubbing and data integrity: https://docs.ceph.com/en/latest/rados/operations/pg-repair/
- Ceph RADOS CLI reference for `list-inconsistent-pg` and `list-inconsistent-obj`: https://docs.ceph.com/en/latest/man/8/rados/
- Ceph Prometheus module metrics reference: https://docs.ceph.com/en/latest/mgr/prometheus/
- ceph-objectstore-tool documentation: https://docs.ceph.com/en/latest/man/8/ceph-objectstore-tool/
- Prometheus alerting rules syntax: https://prometheus.io/docs/prometheus/latest/configuration/alerting_rules/

## Issues Found

### 1. Incorrect JSON structure for `rados list-inconsistent-obj` output
**What was wrong:** The example JSON showed `osd` and `primary` as top-level fields in each inconsistent entry, and used `"errors": ["size_mismatch"]`. In reality, per-OSD details are inside a `shards` array, and the error type is `size_mismatch_info`. The object also includes `nspace` and `locator` fields.
**What was changed:** Replaced the simplified example with a structurally accurate output showing the `shards` array, `union_shard_errors`, and correct field names.

### 2. Fundamentally incorrect "Comparing Object Data Manually" section
**What was wrong:** The section used `rados -p mypool-replica get` to retrieve a replica from a separate pool. This is incorrect — Ceph replicas are managed internally across OSDs within the same pool. There is no "mypool-replica" pool. `rados get` retrieves the object from the pool (Ceph handles which OSD serves it); you cannot select a specific replica this way.
**What was changed:** Replaced with the correct approach using `ceph-objectstore-tool --data-path` to read object bytes directly from individual OSD data stores, which is the valid method for comparing replica data across OSDs.

### 3. Incorrect JSON parsing in automation script
**What was wrong:** The script used `rados list-inconsistent-pg $POOL | wc -l` to count inconsistent PGs. However, `rados list-inconsistent-pg` outputs a JSON array (e.g., `["2.1a"]`), so `wc -l` counts JSON formatting lines, not PG count. An empty result `[]` would produce 1 line, causing a false positive.
**What was changed:** Replaced `wc -l` with `jq 'length'` to correctly parse the JSON array length. Also quoted the `$POOL` variable for robustness.

## Review Notes
- The Prometheus metric names (`ceph_pg_inconsistent`, `ceph_osd_stat_num_objects_inconsistent`, `ceph_osd_stat_num_objects_repair`) are plausible but may vary by Ceph version and exporter configuration. Readers should verify available metrics against their specific Ceph/Rook deployment.
- The automation script now depends on `jq` being installed, which is worth noting if deploying as a Kubernetes CronJob (the container image must include `jq`).
- The `ceph-objectstore-tool` approach for manual comparison requires the OSD to be stopped or the tool to be run with `--op list` on a running OSD with appropriate flags. The post could benefit from noting this prerequisite in a future update.
