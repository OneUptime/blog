# Validation Summary: How to Troubleshoot BlueStore Slow Operations

## Status
validated

## Post Type
Troubleshooting Guide

## Technologies Covered
- Rook (Ceph operator for Kubernetes)
- Ceph (distributed storage)
- BlueStore (Ceph OSD storage backend)
- RocksDB (BlueStore metadata store)
- Kubernetes (kubectl log access)

## Sources Consulted
- Ceph official documentation: BlueStore configuration reference (https://docs.ceph.com/en/latest/rados/configuration/bluestore-config-ref/)
- Ceph official documentation: OSD troubleshooting (https://docs.ceph.com/en/latest/rados/troubleshooting/troubleshooting-osd/)
- Ceph official documentation: Performance counters (https://docs.ceph.com/en/latest/dev/perf_counters/)
- Rook documentation: Ceph toolbox and OSD management (https://rook.io/docs/rook/latest/)

## Issues Found
- **BlueStore perf counter names were incorrect**: The post listed abbreviated counter names (`state_kv_queued`, `state_io_done`, `state_finishing`) in Step 4. The actual keys in the `ceph daemon osd.X perf dump` output under the `bluestore` section include the `bluestore_` prefix and `_lat` suffix. Fixed to `bluestore_state_kv_queued_lat`, `bluestore_state_io_done_lat`, and `bluestore_state_finishing_lat` so readers can locate them in real output.

## Review Notes
- The `ceph daemon osd.0` commands require access to the OSD admin socket. In a Rook/Kubernetes context, these must be run from within the OSD pod (e.g., via `kubectl exec`) or from the Rook toolbox. The post doesn't explicitly mention this, but it's a contextual detail rather than a technical error.
- The `osd_max_scrubs` default is already 1 in recent Ceph versions, so Step 8's first command only helps if it was previously raised. The command is still valid.
- All `ceph config set` commands, `ceph tell` syntax, `iostat` usage, and scrub scheduling options are correct and current.
