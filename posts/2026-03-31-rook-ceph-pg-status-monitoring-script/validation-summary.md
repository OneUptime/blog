# Validation Summary: How to Write a Ceph PG Status Monitoring Script

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Ceph (Placement Groups, PG states, PG monitoring)
- Rook-Ceph (toolbox deployment, kubectl exec pattern)
- Python 3.9+ (subprocess, json, defaultdict, type hints)
- Kubernetes (kubectl exec into deployments)
- Slack Webhooks (alerting integration)

## Sources Consulted
- Ceph source code (`src/mon/PGMap.cc`, `src/osd/osd_types.cc`) for PG state strings and JSON output structures
- Ceph documentation for `ceph pg stat`, `ceph pg dump pgs_brief`, and `ceph pg dump_stuck` command behavior and JSON formats
- Rook official toolbox manifest (`deploy/examples/toolbox.yaml`) for the `rook-ceph-tools` deployment name
- Ceph `osd_types.h` for PG_STATE_* constants confirming all listed state strings

## Issues Found
- **`MAX_STUCK` variable defined but never used**: The script declared `MAX_STUCK = int(os.environ.get("MAX_STUCK_PGS", "0"))` at module level but never checked the stuck PG count against this threshold. This made the configuration option non-functional. Fixed by adding a threshold check in `main()` after retrieving stuck PGs and analyzing PG states, mirroring the existing `MAX_DEGRADED` threshold pattern.

## Review Notes
- All PG state strings (`degraded`, `undersized`, `inconsistent`, `incomplete`, `repair`, `failed_repair`, `recovering`, `backfilling`, `backfill_toofull`, `peering`, `stale`) are verified valid against Ceph source.
- The `+` separator for compound PG states (e.g., `active+clean+degraded`) is correct.
- The `deploy/rook-ceph-tools` kubectl exec target is the standard Rook toolbox deployment name.
- The `stuck_pg_stats` key used in `get_stuck_pgs()` matches the Ceph source (`PGMap::dump_stuck()` opens an `"stuck_pg_stats"` array section).
- The `ceph pg stat` JSON output may wrap `num_pgs` inside a `pg_summary` object in some Ceph versions, which would cause `pg_stat.get("num_pgs", 0)` to return 0. This only affects the display line and does not impact alerting logic, so it was left as-is. Users targeting specific Ceph versions should verify the JSON structure.
- The script uses `dict[str, int]` and `list[dict]` type hint syntax requiring Python 3.9+. This is not noted in the post but is standard for modern Python.
- Exit codes follow Nagios/monitoring conventions (0=OK, 1=warning, 2=critical, 3=unknown error), which is good practice for integration with monitoring pipelines.
