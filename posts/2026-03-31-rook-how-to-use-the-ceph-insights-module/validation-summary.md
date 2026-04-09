# Validation Summary: How to Use the Ceph Insights Module

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Ceph (manager modules, insights module)
- Rook (Kubernetes operator for Ceph)
- Kubernetes (kubectl exec into toolbox pods)
- Python (JSON processing scripts)

## Sources Consulted
- Ceph source code: `src/pybind/mgr/insights/module.py`, `health.py`, `cli.py` — confirms module behavior, CLI commands, data structures, and storage mechanism
- Ceph official documentation: `doc/mgr/insights.rst` — confirms `ceph insights` and `ceph insights prune-health <hours>` commands
- Ceph MgrModule API — confirms `set_store`/`get_store` override for in-memory storage

## Issues Found

1. **Incorrect storage claim (RADOS object)**: The post stated the insights module "stores periodic cluster health reports in a RADOS object." In reality, the module overrides the persistent store methods to use an in-memory dictionary. Data is lost on manager restart or failover. Fixed to say "stores them in memory" with a note about data loss on restart.

2. **Wrong JSON output structure**: The example JSON showed `"version": 1` (an integer) and a top-level `"osd_stats_history"` key. The actual report has `version` as a dict (`{"full": "...", "release": N, "major": N, "minor": N}`), no `osd_stats_history` key, and `health` is structured with `current` and `history` sub-keys rather than timestamp-keyed entries. Fixed the entire example JSON block to match the real structure.

3. **Fabricated `retention_period` config option**: The post claimed you could set `mgr/insights/retention_period` via `ceph config set`. This configuration option does not exist. Retention is hardcoded at 30 hours (`HEALTH_RETENTION_HOURS = 30`) in the source. Replaced the section with an explanation of the hardcoded retention and a pointer to `prune-health`.

4. **`prune-health` argument unit wrong (seconds vs hours)**: The post used `ceph insights prune-health 86400` claiming 86400 seconds = 1 day. The actual command takes hours, not seconds. 86400 hours would be ~9.8 years. Fixed to `prune-health 24` for 1 day, and noted that `0` clears all history.

5. **Fabricated OSD stats history tracking**: The post claimed the insights module "tracks OSD statistics over time" with an `osd_stats_history` key in the report. The module only tracks health check history over time. OSD data (`osd_dump`) is a point-in-time snapshot. Replaced the section with a correct example using the `df` snapshot data from the report.

6. **Filtering script incompatible with actual data structure**: The Python script iterated over `data.get('health', {}).items()` expecting timestamp keys. The actual health structure has `current` and `history` sub-keys. Rewrote the script to correctly traverse `health.history.checks`.

## Review Notes
- The insights module's 30-hour in-memory-only retention makes it of limited use for long-term monitoring. The post now accurately reflects this limitation.
- For long-term health tracking, users should consider external monitoring solutions (Prometheus + Ceph exporter) rather than relying solely on the insights module.
- The `ceph mgr module ls` output format shown in the post uses `enabled_modules` as a list, which is correct for older Ceph versions. In newer versions, the output format may differ slightly (showing `always_on_modules` and `enabled_modules` separately).
