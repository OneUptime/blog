# Validation Summary: How to Check Ceph Client Connection Count

## Status
validated

## Post Type
Guide

## Technologies Covered
- Ceph (storage cluster — monitors, OSDs, MGR, RGW)
- Rook (Kubernetes Ceph operator, mentioned in tags)
- `ss` (Linux socket statistics utility)
- systemd (service management and file descriptor limits)
- Python 3 (inline JSON parsing of perf dump output)

## Sources Consulted
- Ceph official documentation on admin socket commands and `ceph tell` usage (https://docs.ceph.com/en/latest/rados/operations/monitoring/)
- Ceph perf counters documentation (https://docs.ceph.com/en/latest/dev/perf_counters/)
- Ceph source code for AsyncMessenger perf counter definitions (`msgr_active_connections`, `msgr_created_connections`)
- Ceph admin socket command reference for mon, osd, mgr, and rgw daemons
- `ss` man page for socket filter syntax

## Issues Found

### 1. OSD grep command used non-existent `sessions_add` counter
**What was wrong:** The command `ceph tell osd.* perf dump | grep -A2 "\"sessions_add\""` referenced a counter named `sessions_add` that does not exist in Ceph perf dump output.
**What was changed:** Replaced with `grep "msgr_active_connections"`, which is the actual counter tracking current active messenger connections in `AsyncMessenger::Worker-N` sections.

### 2. OSD Python script used wrong keys and fabricated value format
**What was wrong:** The script accessed `data.get('osd', {}).get('numpg', 0)` (which is PG count, not connections) and `data.get('ms', {}).get('sessions_add', {}).get('val', 0)`. There is no top-level `ms` key in perf dump, `sessions_add` does not exist as a counter, and the `{"val": N}` value format is not a valid Ceph perf dump counter format.
**What was changed:** Rewrote the script to iterate over `AsyncMessenger::Worker-*` sections and sum `msgr_active_connections`, which correctly counts active connections to the OSD.

### 3. MGR `sessions` command does not exist
**What was wrong:** The command `ceph daemon mgr.<name> sessions` was used, but `sessions` is not a valid admin socket command for the Ceph MGR daemon. This would produce an "unknown command" error.
**What was changed:** Replaced with `ceph daemon mgr.<name> perf dump` piped through a Python script that sums `msgr_active_connections` across AsyncMessenger workers, which is the correct way to count active connections to the MGR.

### 4. RGW Python script used wrong counter and wrong access pattern
**What was wrong:** The script accessed `data.get('rgw', {}).get('req', {}).get('val', 0)` and labeled it "Active requests". Two problems: (a) `rgw.req` is a plain integer (not `{"val": N}`), so `.get('val', 0)` would fail or return 0; (b) `rgw.req` is a cumulative total request counter, not a current active connection count.
**What was changed:** Rewrote the script to sum `msgr_active_connections` from AsyncMessenger workers for actual connection count, and also print `rgw.qactive` for current queued active requests.

## Review Notes
- The `ceph tell mon.* sessions` command and `ceph daemon mon.<name> sessions` command are correct — monitors do support the `sessions` admin socket command.
- The `ss` commands for OS-level connection counting are correct, including the port range 6800-7300 for OSDs and port 7480 for RGW Beast frontend.
- The systemd file descriptor limit section is correct.
- The `ceph daemon` commands require being run on the host where the target daemon is running (admin socket access is local only). This is not explicitly stated but is a standard Ceph operational assumption.
- In Rook-based deployments, admin socket commands must be run from within the daemon's pod (e.g., `kubectl exec` into the OSD or MON pod first). The post does not mention this Rook-specific detail despite being tagged with Rook.
