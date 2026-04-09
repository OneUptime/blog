# Validation Summary: How to View Connection Status via Admin Socket

## Status
validated

## Post Type
Guide

## Technologies Covered
- Ceph (admin socket, AsyncMessenger, perf counters)
- Rook (Ceph operator for Kubernetes)
- Bash scripting
- Python (JSON parsing of perf dump output)

## Sources Consulted
- Ceph Perf Counters Documentation (Reef): https://docs.ceph.com/en/reef/dev/perf_counters/
- Ceph Admin Tool Man Page: https://docs.ceph.com/en/latest/man/8/ceph/
- Ceph Watch/Notify Internals: https://docs.ceph.com/en/mimic/dev/osd_internals/watch_notify/
- Ceph Monitoring Documentation: https://docs.ceph.com/en/latest/rados/operations/monitoring/
- Ceph Messenger v2 Documentation: https://docs.ceph.com/en/latest/rados/configuration/msgr2/
- Ceph OSD Troubleshooting: https://docs.ceph.com/en/latest/rados/troubleshooting/troubleshooting-osd/
- Ceph Monitor Source (Monitor.cc): https://github.com/ceph/ceph/blob/main/src/mon/Monitor.cc
- Real perf dump output samples from ceph-users mailing list

## Issues Found

1. **Invalid `connections` admin socket command (line 19):** `ceph daemon osd.0 connections` is not a valid Ceph admin socket command. Replaced with `ceph daemon osd.0 status`, which is a valid command that shows OSD status including network address information. Updated the comment accordingly.

2. **Wrong perf counter names in Dumping Messenger Statistics (lines 34-37):** The counter names `send_bytes`, `recv_bytes`, `send_messages`, `recv_messages` are incorrect. Modern Ceph (Reef/Squid) uses the `msgr_` prefix: `msgr_send_bytes`, `msgr_recv_bytes`, `msgr_send_messages`, `msgr_recv_messages`. Fixed all four counter names.

3. **Wrong perf counter value access pattern (lines 34-37):** The code used `.get('send_bytes', {}).get('val', 0)` which assumes counter values are objects with a `val` field. In modern Ceph, simple counters (like message/byte counts) are plain integers, not objects. Changed to `.get('msgr_send_bytes', 0)` etc.

4. **Invalid `dump_watchers` command on MON (line 48):** `dump_watchers` is not a valid MON admin socket command -- it is an OSD-specific command for RADOS watch/notify subscriptions. Replaced with `ceph daemon mon.$(hostname) mon_status`, which is a valid MON command showing monitor status and quorum information.

5. **Misleading `dump_watchers` comment on OSD (line 54):** The comment said "List connected peers for an OSD" but `dump_watchers` actually shows RADOS watch/notify subscriptions (used by features like RBD), not peer OSD connections. Fixed the comment to accurately describe the command.

6. **Debugging script used `ceph daemon` for remote OSDs (lines 80-94):** `ceph daemon` only works for daemons running on the local host via Unix domain sockets. The script iterated all OSDs with `ceph osd ls` but could only reach local ones. Changed to use `ceph tell` which routes commands through the MON and can reach any OSD in the cluster. Added a comment explaining the difference.

7. **Debugging script parsed JSON output as plain text (lines 82-85):** `ceph tell osd.X version` returns JSON like `{"version":"18.2.0"}`. The original script used `grep -q "version"` and `awk '{print $3}'` which don't correctly parse JSON. Fixed to use `python3` with the `json` module for proper JSON parsing.

8. **Wrong perf counter names in Messenger Connection Counters (lines 105-108):** `connection_ready` and `connection_rejected` are not real AsyncMessenger perf counter names. The actual counters are `msgr_created_connections` and `msgr_active_connections`. Also fixed `send_messages`/`recv_messages` to `msgr_send_messages`/`msgr_recv_messages`, and fixed the value access pattern (plain integers, not `val` objects).

9. **Summary section referenced invalid command (line 125):** The summary text mentioned `connections` as an admin socket command. Updated to `status` to match the corrected command.

## Review Notes
- The post is tagged "Rook" but all commands assume direct host-level access to Ceph daemons. In a Rook deployment, daemons run inside Kubernetes pods, so users would need to `kubectl exec` into the specific OSD/MON pod before running `ceph daemon` commands, or use `ceph tell` from the Rook toolbox pod. A future update could add a brief note about Rook-specific access patterns.
- The `journalctl -u ceph-osd@0` command in "Detecting Connection Flapping" is valid for systemd-managed Ceph but would not work in a Rook/containerized deployment where `kubectl logs` would be needed instead.
- The `config get` commands in "Network Health via Admin Socket" are valid but the comment "Check if OSD can see its peers" is somewhat misleading -- these commands show configured addresses, not actual peer reachability. This is a minor wording concern rather than a technical error.
