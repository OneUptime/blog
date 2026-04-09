# Validation Summary: How to Use the Progress Module in Ceph Manager

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Ceph (Storage Cluster)
- Ceph Manager (mgr) Progress module
- Ceph CLI (`ceph progress`, `ceph mgr module`)
- Ceph Dashboard
- Python (subprocess, json)

## Sources Consulted
- Ceph official documentation: Progress module — https://docs.ceph.com/en/latest/mgr/progress/
- Ceph source code: `src/pybind/mgr/progress/module.py` — https://github.com/ceph/ceph/blob/main/src/pybind/mgr/progress/module.py

## Issues Found

### 1. Incorrect example output format for `ceph progress`
- **What was wrong:** The example output showed `(Progress: 0.97)` and `(Progress: 0.63)` next to progress bars. The actual `ceph progress` text output shows event duration (e.g., `(2m)`) and remaining time (e.g., `(remaining: 01m)`), not a decimal progress value. The progress bar uses `=` for completed and `.` for remaining, not spaces.
- **What was changed:** Updated the example output to match actual Ceph CLI formatting with duration, remaining time estimates, and correct progress bar characters.
- **Why:** The decimal progress value is only available in the JSON output, not the human-readable text output. Showing incorrect output format would confuse readers trying to match their terminal output.

### 2. Scrub operations incorrectly listed as triggering progress events
- **What was wrong:** "Scrub operations on large pools" was listed as an operation that creates progress events. The progress module does not track scrub operations — it only tracks PG recovery events (OSD in/out transitions), global recovery state, and remote events from other modules like pg_autoscaler.
- **What was changed:** Replaced "Scrub operations on large pools" with "PG autoscaler adjustments when matching target PG counts," which is an actual source of progress events via the remote event API.
- **Why:** The progress module source code has no scrub-related event tracking. Including scrub would mislead readers into expecting progress output that will never appear.

## Review Notes
- The JSON output example in the blog is a simplified subset of the actual fields. Real output also includes `duration`, `started_at`, and `time_remaining` fields. The fields shown are correct but incomplete — this is acceptable for a tutorial.
- Per-PG recovery events (as opposed to the global recovery event) are disabled by default in the progress module due to CPU overhead. They can be enabled with `ceph config set mgr mgr/progress/allow_pg_recovery_event true`. The post does not mention this distinction, which is fine for an introductory tutorial.
- The Ceph Dashboard navigation path (`Cluster > Manager Modules`) may vary slightly across Dashboard versions but is generally accurate.
