# Validation Summary: How to Read and Interpret Ceph Log Files

## Status
validated

## Post Type
Guide

## Technologies Covered
- Ceph (log subsystem, debug levels, daemon admin socket)
- Rook (tagged but post covers traditional/systemd Ceph deployments)
- Linux systemd / journalctl
- Bash (grep, tail)

## Sources Consulted
- Ceph official documentation: Troubleshooting Log and Debug — https://docs.ceph.com/en/latest/rados/troubleshooting/log-and-debug/
- Ceph official documentation: Ceph Logging and Debugging — https://docs.ceph.com/en/latest/rados/configuration/ceph-conf/#logging-and-debugging
- Ceph official documentation: Monitoring a Cluster — https://docs.ceph.com/en/latest/rados/operations/monitoring/
- journalctl(1) man page for systemd journal query syntax

## Issues Found

1. **Incorrect section heading: "Reading the Cluster Audit Log"**
   - **What was wrong:** The section was titled "Reading the Cluster Audit Log" but the content discusses `ceph.log`, which is the cluster log. In Ceph, the audit log is a separate file (`ceph.audit.log`) that specifically records management commands (e.g., pool creation, config changes). Using "Audit Log" to refer to the cluster log is technically incorrect and could confuse readers.
   - **What was changed:** Renamed the heading to "Reading the Cluster Log".
   - **Why:** Avoids confusion between Ceph's cluster log and its audit log, which serve different purposes.

2. **Missing `debug_bluestore` reset command**
   - **What was wrong:** The "Adjusting Log Verbosity" section set both `debug_osd` and `debug_bluestore` to level 10, but the reset section only reset `debug_osd`. This would leave BlueStore debug logging at level 10 until the daemon is restarted, generating excessive log output and potentially filling disk.
   - **What was changed:** Added `ceph daemon osd.2 config set debug_bluestore 1` to the reset block.
   - **Why:** Both debug subsystems should be reset to avoid unintentionally high log verbosity.

## Review Notes
- The log message examples (slow requests, PG state changes) are simplified representations. Real Ceph log entries include additional fields (log level tags like `[WRN]`, operation details, thread IDs), but the simplified format is appropriate for a teaching-oriented blog post.
- The default debug level for most Ceph subsystems is `1/5` (log-to-file level 1, in-memory level 5). Resetting to `1` sets both to `1/1`, which is slightly below the default memory level. Since the post correctly notes these changes are temporary and reset on restart, this is acceptable.
- The post is tagged with "Rook" but covers traditional Ceph file-based logging and systemd journal access. In Rook-managed (containerized) Ceph deployments, logs are typically accessed via `kubectl logs` rather than `/var/log/ceph/` or `journalctl`. A future update could add a section on accessing logs in Rook/Kubernetes environments.
