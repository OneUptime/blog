# Validation Summary: How to Monitor Scrubbing Progress in Ceph

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Ceph (storage cluster, scrubbing subsystem)
- Rook (Ceph operator for Kubernetes)
- Kubernetes (kubectl exec into toolbox pods)
- Prometheus (metrics and alerting)
- PrometheusRule CRD (monitoring.coreos.com/v1)
- jq (JSON processing)

## Sources Consulted
- Ceph Prometheus Module Documentation: https://docs.ceph.com/en/latest/mgr/prometheus/
- Ceph PG_STATES definition in mgr_module.py (source of truth for PG state metric names): https://github.com/ceph/ceph/blob/main/src/pybind/mgr/mgr_module.py
- Ceph PR #18890 (added "deep" state to PG_STATES): https://github.com/ceph/ceph/pull/18890
- Ceph PR #21365 (clarified "deep" vs "deep_scrub" naming): https://github.com/ceph/ceph/pull/21365
- Ceph PR #3259 (pg dump plain format column definitions): https://github.com/ceph/ceph/pull/3259/files
- Ceph v17.2.0 Quincy release notes (new pg dump columns): https://ceph.io/en/news/blog/2022/v17-2-0-quincy-released/
- ceph-mixins alert rules (verified ceph_pg_inconsistent usage): https://github.com/ceph/ceph-mixins/blob/master/extras/manifests/prometheus-ceph-rules.yaml
- CERN ceph-scrub-summary.py (JSON-based pg dump parsing): https://github.com/cernceph/ceph-scripts/blob/master/tools/scrubbing/ceph-scrub-summary.py
- Ceph official docs - Monitoring OSDs and PGs: https://docs.ceph.com/en/latest/rados/operations/monitoring-osd-pg/

## Issues Found

### 1. Wrong `ceph pg dump` column numbers for scrub timestamps (critical)
**What was wrong:** The post used `awk '{print $1, $14, $15}'` claiming columns `$14` and `$15` are `last_scrub` and `last_deep_scrub`. In reality, `$14` is the UP OSD set and `$15` is UP_PRIMARY. The actual scrub timestamp columns are at different positions (around `$19`/`$21` in older versions), and the exact positions vary between Ceph versions (Quincy added new columns). Additionally, plain-text awk parsing of `ceph pg dump` is unreliable because the UP/ACTING columns contain bracketed arrays that can break field splitting.

**What was changed:** Replaced all `ceph pg dump` plain-text awk parsing with JSON-based approach using `ceph pg dump --format json | jq`. This is version-stable and avoids column-position ambiguity. The JSON fields `last_scrub_stamp` and `last_deep_scrub_stamp` are reliable across Ceph versions.

### 2. Non-existent Prometheus metric `ceph_pg_deep_scrubbing` (critical)
**What was wrong:** The metric `ceph_pg_deep_scrubbing` does not exist. The ceph-mgr prometheus module generates PG state metrics from the PG_STATES list, which uses `"deep"` as the state flag name (not `"deep_scrubbing"`). This was confirmed by Ceph PR #21365 which resolved the "deep" vs "deep_scrub" naming confusion.

**What was changed:** Renamed `ceph_pg_deep_scrubbing` to `ceph_pg_deep` in the metrics table and PromQL queries.

### 3. PromQL double-counting of scrubbing PGs (moderate)
**What was wrong:** The query `ceph_pg_scrubbing + ceph_pg_deep_scrubbing` would double-count PGs doing deep scrubs. In Ceph, a PG doing a deep scrub has both "scrubbing" and "deep" state flags, so `ceph_pg_scrubbing` already includes deep-scrubbing PGs. Adding `ceph_pg_deep` would count them twice.

**What was changed:** Replaced the addition query with separate queries: `ceph_pg_scrubbing` for all scrubbing PGs, and `ceph_pg_deep` for just deep scrubs. Updated the `ceph_pg_scrubbing` description to clarify it includes deep scrubs.

### 4. Non-existent Prometheus metric `ceph_osd_scrub_error` (moderate)
**What was wrong:** The metric `ceph_osd_scrub_error` does not appear to exist in the standard ceph-mgr prometheus module. No evidence of this metric was found in Ceph source code, official documentation, or community alert rule collections.

**What was changed:** Removed `ceph_osd_scrub_error` from the metrics table, removed the `rate(ceph_osd_scrub_error[1h])` PromQL query, and removed the `CephScrubErrors` alert rule that depended on it. The `CephPGInconsistent` alert (which uses the verified `ceph_pg_inconsistent` metric) is retained as the primary scrub health alert.

### 5. Dead code in scrub coverage report (minor)
**What was wrong:** The `TOTAL` variable was assigned via `ceph pg stat | grep -oP "[0-9]+ pgs"` but never used — the script instead echoed `$ACTIVE` (from a separate `ceph pg dump` line count) as "Total PGs". Additionally, the `grep -oP` pattern would capture the string "256 pgs" rather than just the number.

**What was changed:** Replaced the entire PG counting approach with a single JSON-based command: `ceph pg dump --format json | jq ".pg_stats | length"`, which reliably returns just the numeric PG count. Removed the dead `ACTIVE` variable.

## Review Notes
- The `ceph pg dump` plain-text format has changed across Ceph versions (Quincy added LAST_SCRUB_DURATION, SCRUB_SCHEDULING, and OBJECTS_SCRUBBED columns). The JSON format used in the corrected post is stable across versions.
- The `watch` command in the "Watching Active Scrubs" section works but `watch` may not be installed in all Ceph toolbox images. This is a minor portability concern, not a correctness issue.
- For production monitoring, users may want to consider additional alerts for PG_NOT_SCRUBBED and PG_NOT_DEEP_SCRUBBED health checks, which Ceph raises when PGs exceed their configured scrub intervals. These are available via `ceph health detail` but the exact Prometheus metric exposure depends on the Ceph version and exporter configuration.
- The `jq` tool is required for the corrected commands. It is typically available in the Rook Ceph toolbox image, but users should verify if using a custom toolbox.
