# Validation Summary: How to Monitor Rebalancing Progress in Ceph

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Ceph (distributed storage system)
- Rook (Ceph orchestrator for Kubernetes)
- Prometheus (monitoring/alerting)
- Grafana (dashboards/alerting)
- Bash scripting
- Python (inline JSON parsing)

## Sources Consulted
- Ceph source code: `src/mon/PGMap.cc` for pgmap JSON field names — https://github.com/ceph/ceph/blob/main/src/mon/PGMap.cc
- Ceph MGR Prometheus module source — https://github.com/ceph/ceph/blob/main/src/pybind/mgr/prometheus/module.py
- Ceph Prometheus module documentation — https://docs.ceph.com/en/latest/mgr/prometheus/
- Ceph progress module documentation — https://github.com/ceph/ceph/blob/main/doc/mgr/progress.rst
- Ceph Mon Command API — https://docs.ceph.com/en/reef/api/mon_command_api/
- Ceph manpage for `ceph pg ls` — https://manpages.ubuntu.com/manpages/questing/man8/ceph.8.html
- Ceph OSD types source (PG state strings) — https://github.com/ceph/ceph/blob/main/src/osd/osd_types.cc

## Issues Found

### 1. Typo in JSON field name: `misplace_objects` (line 75)
- **What was wrong:** The Python snippet used `pgmap.get('misplace_objects', 0)` but the correct Ceph pgmap JSON field name is `misplaced_objects` (with the 'd'). The misspelled key would silently return 0 via Python's `.get()` default.
- **Fix:** Changed `misplace_objects` to `misplaced_objects`.

### 2. Non-existent JSON fields in ETA script: `misplace_bytes` and `degraded_bytes` (lines 93-94)
- **What was wrong:** The ETA estimation script referenced `pgmap.get('misplace_bytes', 0)` and `pgmap.get('degraded_bytes', 0)`. Neither `misplaced_bytes` nor `degraded_bytes` exist in the Ceph pgmap JSON output. The actual fields are object-count-based: `misplaced_objects`, `degraded_objects`, `misplaced_ratio`, `degraded_ratio`. The script would always compute 0 remaining bytes, making the ETA useless.
- **Fix:** Replaced with a calculation that estimates remaining bytes from object counts: `(misplaced_objects + degraded_objects) / num_objects * data_bytes`. Also wrapped `recovering_bytes_per_sec` with `int()` since the JSON value can be a float, which would break bash arithmetic.

### 3. Invalid Prometheus metric name: `ceph_osd_utilization` (line 157)
- **What was wrong:** `ceph_osd_utilization` is not a metric exposed by the built-in Ceph MGR Prometheus module (port 9283). It exists only in the third-party DigitalOcean ceph_exporter. The built-in module exposes `ceph_osd_stat_bytes` and `ceph_osd_stat_bytes_used`.
- **Fix:** Changed to `ceph_osd_stat_bytes_used / ceph_osd_stat_bytes` which calculates OSD utilization from the actual built-in metrics.

## Review Notes
- The `date -d "+N seconds"` syntax in the ETA script (line 110) is GNU coreutils-specific (Linux). On macOS/BSD, the equivalent is `date -v +Ns`. Since Ceph clusters typically run on Linux, this is acceptable, but readers on macOS should be aware.
- The `ceph progress json` command, `ceph pg ls remapped`, and `ceph pg ls backfilling` were all verified as correct syntax.
- PG state names (`active+clean`, `active+remapped`, `active+backfilling`, `active+backfill_wait`, `active+recovering`) are all valid Ceph PG states.
- The Grafana alert rule logic is sound: detecting remapped PGs with zero recovery throughput over 30 minutes is a valid heuristic for stuck rebalancing.
- The Prometheus metric `ceph_pg_remapped`, `ceph_osd_recovery_bytes`, and `ceph_pg_degraded` are valid metrics from the built-in Ceph MGR Prometheus module.
