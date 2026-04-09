# Validation Summary: How to Use the Insights Module in Ceph Manager

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Ceph (distributed storage system)
- Ceph Manager (mgr) Insights module
- Ceph Manager Crash module
- Rook (Ceph orchestrator for Kubernetes)

## Sources Consulted
- Ceph Insights module documentation: https://github.com/ceph/ceph/blob/main/doc/mgr/insights.rst
- Ceph Insights module source code: https://github.com/ceph/ceph/blob/main/src/pybind/mgr/insights/module.py
- Ceph Insights health tracking source: https://github.com/ceph/ceph/blob/main/src/pybind/mgr/insights/health.py
- Ceph Crash module documentation: https://github.com/ceph/ceph/blob/main/doc/mgr/crash.rst

## Issues Found

### 1. Fabricated `--since` flag on `ceph insights`
**What was wrong:** The post claimed `ceph insights --since "2026-03-31 06:00:00"` could filter reports by time range. The `--since` flag does not exist. The `ceph insights` command takes no arguments; the report always covers the last 24 hours (hardcoded as `HEALTH_HISTORY_HOURS = 24`).
**What was changed:** Replaced the "Filtering by Time Range" section with a "Report Time Window" section explaining the fixed 24-hour window. Removed all `--since` usage from the post-incident review and crash module examples.

### 2. Incorrect JSON output structure
**What was wrong:** The example output showed health entries keyed by individual timestamps (e.g., `"2026-03-31 09:00:00"`) each with `"status"` and `"checks"` fields. The actual output structure has `"current"` (with `"status"` and `"checks"`) and `"history"` (with only `"checks"`, no per-entry `"status"`). History entries are accumulated/deduplicated health checks across hourly slots, not per-timestamp snapshots.
**What was changed:** Replaced the example JSON with the correct structure showing `"current"` and `"history"` sub-keys.

### 3. `ceph insights prune-health` missing required argument
**What was wrong:** The post showed `ceph insights prune-health` without arguments. The command requires a mandatory `<hours>` integer argument specifying how many hours of history to retain.
**What was changed:** Updated to `ceph insights prune-health 0` and added explanation that `0` clears all data.

### 4. Fabricated `mgr/insights/max_health_period` configuration option
**What was wrong:** The post claimed `ceph config set mgr mgr/insights/max_health_period 604800` could configure retention to 7 days. This configuration option does not exist. The insights module defines no `MODULE_OPTIONS`. Retention is hardcoded at 30 hours (`HEALTH_RETENTION_HOURS = 30`).
**What was changed:** Replaced the "Configuring the Collection Interval" section with "Data Collection and Retention" explaining the hourly bucket structure and hardcoded 30-hour retention.

### 5. Summary text referenced non-existent time-range feature
**What was wrong:** The summary stated `ceph insights` "retrieves a time-ranged view" implying user-configurable filtering.
**What was changed:** Updated to state "retrieves a report covering the last 24 hours of cluster health changes."

## Review Notes
- The insights module also includes crash history, OSD metadata, and cluster configuration in its report output, not just health data. The post focuses only on the health aspect, which is a reasonable scope for a tutorial but readers should know the full report is more comprehensive.
- The reporting window (24 hours via `HEALTH_HISTORY_HOURS`) and retention period (30 hours via `HEALTH_RETENTION_HOURS`) are separate hardcoded constants in the source. The post now accurately reflects both.
- The `ceph crash ls` command referenced in the post is valid and comes from the separate crash module, which the insights module does integrate with internally.
