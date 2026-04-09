# Validation Summary: How to Fix TELEMETRY_CHANGED Health Check in Ceph

## Status
validated

## Post Type
Tutorial / Troubleshooting Guide

## Technologies Covered
- Ceph (storage cluster health checks, telemetry module)
- Rook (Kubernetes Ceph operator, toolbox pod)
- Kubernetes (kubectl exec)

## Sources Consulted
- Ceph source code: `src/pybind/mgr/telemetry/module.py` on GitHub (ceph/ceph main branch) — verified command implementations, health check names, output formats, and license constants
- Ceph official documentation: health checks reference at docs.ceph.com/en/reef/rados/operations/health-checks/ — confirmed TELEMETRY_CHANGED health check name and description
- Ceph telemetry module MODULE_OPTIONS — verified `ceph telemetry status` output fields

## Issues Found

1. **Incorrect `ceph health detail` sample output**: The post showed `"HEALTH_WARN 1 telemetry channel has changed"` with detail `"new fields: perf_memory, osd_latency_histograms"`. The actual Ceph source code produces `"HEALTH_WARN Telemetry requires re-opt-in"` with detail `"telemetry module includes new collections; please re-opt-in to new collections with ceph telemetry on"`. Fixed to match the real output.

2. **Incorrect `ceph telemetry status` sample output**: The post showed a `license_name` field in the output. The `LICENSE` and `LICENSE_NAME` are module-level constants, not module options, so they do not appear in `ceph telemetry status` output. The actual output includes fields like `enabled`, `last_opt_revision`, `last_upload`, and channel flags (`channel_basic`, `channel_crash`, `channel_device`, `channel_perf`). Fixed the sample output to reflect real fields.

3. **Inaccurate `ceph telemetry diff` description**: The post said it "shows new or changed data fields compared to what you last consented to." It actually shows telemetry collections available in the module that the user has not yet opted into (at the collection level, not individual field level). Fixed the description.

4. **Slightly misleading consent reset explanation**: The post stated Ceph "resets the user's consent" on upgrades. More accurately, Ceph requires renewed consent when new collections are introduced (with `nag: True`) or on major version upgrades — it does not reset consent on every upgrade. Refined the wording to be more precise.

## Review Notes
- All CLI commands (`ceph telemetry on --license sharing-1-0`, `ceph telemetry off`, `ceph telemetry diff`, `ceph telemetry status`, `ceph health detail`) are confirmed valid against the Ceph source code.
- The `--license sharing-1-0` flag is confirmed correct — the license constant is `sharing-1-0` referring to the Community Data License Agreement - Sharing - Version 1.0.
- The Rook toolbox access command (`kubectl -n rook-ceph exec -it deploy/rook-ceph-tools -- bash`) is standard and correct.
- The post correctly notes that Rook does not expose a direct telemetry CRD field.
