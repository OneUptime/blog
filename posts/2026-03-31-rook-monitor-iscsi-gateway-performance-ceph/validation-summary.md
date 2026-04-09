# Validation Summary: How to Monitor iSCSI Gateway Performance in Ceph

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Ceph (RBD, iSCSI gateway, MGR Prometheus module)
- Rook (Ceph operator for Kubernetes)
- LIO (Linux IO target framework)
- targetcli (LIO target administration)
- iSCSI protocol
- Prometheus (node_exporter textfile collector)
- Grafana (PromQL dashboards)
- Linux sysfs/configfs

## Sources Consulted
- Ceph source code: `src/tools/rbd/action/Perf.cc` — defines `rbd perf image iostat` arguments (https://github.com/ceph/ceph/blob/main/src/tools/rbd/action/Perf.cc)
- Ceph source code: `src/tools/rbd/ArgumentTypes.cc` — confirms `-p` is short for `--pool` (https://github.com/ceph/ceph/blob/main/src/tools/rbd/ArgumentTypes.cc)
- Ceph source code: `src/pybind/mgr/prometheus/module.py` — confirms `ceph_rbd_write_latency_sum` and `ceph_rbd_write_latency_count` metric names
- iscsiadm(8) man page — confirms `iscsiadm` is an initiator-side tool (open-iscsi package) (https://manpages.debian.org/unstable/open-iscsi/iscsiadm.8.en.html)
- targetcli-fb GitHub repository — confirms `targetcli sessions list` for viewing active sessions on the target side (https://github.com/open-iscsi/targetcli-fb)
- ceph-iscsi source code — confirms REST API on port 5000 (https://github.com/ceph/ceph-iscsi)
- Red Hat documentation on configuring iSCSI targets and initiators

## Issues Found

### Issue 1: `iscsiadm -m session` used on the gateway (target) side
- **What was wrong:** The command `iscsiadm -m session 2>/dev/null | wc -l` was presented as a way to count active sessions on the iSCSI gateway. However, `iscsiadm` is the open-iscsi *initiator* administration tool. On a gateway (target) node, this command would return 0 or show unrelated sessions — it does not show inbound client connections.
- **What was changed:** Replaced `iscsiadm -m session 2>/dev/null | wc -l` with `targetcli sessions list 2>/dev/null | wc -l`, which is the correct target-side command for listing active sessions. Also updated the description text from "Get a count of active sessions" to "Get a count of active sessions on the gateway" for clarity. The same fix was applied to the Prometheus metrics script later in the post.
- **Why:** `iscsiadm` is part of the open-iscsi initiator package and only shows sessions where the local host is acting as an initiator. The LIO target framework uses `targetcli` to manage and inspect target-side sessions.

### Issue 2: `rbd perf image iostat --pool iscsi -p 5` uses incorrect flag
- **What was wrong:** The command used `-p 5` intending to set a 5-second refresh period. However, `-p` is the short form of `--pool` in all `rbd` commands. This would override the pool name from `iscsi` to `5`, causing the command to fail or look up a nonexistent pool. Furthermore, there is no `--period` flag for `rbd perf image iostat` — the command runs continuously by default.
- **What was changed:** Replaced `rbd perf image iostat --pool iscsi -p 5` with `rbd perf image iostat --pool iscsi --sort-by write-latency`, which demonstrates a valid and useful variant (sorting by write latency). Updated the description from "Continuous monitoring:" to "Sort by write latency during continuous monitoring:" since the command already runs continuously by default.
- **Why:** Confirmed via Ceph source code (`src/tools/rbd/ArgumentTypes.cc`) that `-p` maps to `--pool`. The valid flags for `rbd perf image iostat` are `--pool`, `--namespace`, `--iterations`, `--sort-by`, `--format`, and `--pretty-format`. No period/interval flag exists.

## Review Notes
- The `pgrep -f "iscsi\|target"` command uses `\|` in what should be POSIX extended regex (ERE), where the correct OR syntax is `|` without the backslash. In practice, this works on Linux (GNU procps treats `\|` as `|`), but it is technically non-standard. Not changed since it works in practice on the target platform.
- The `ceph-iscsi` REST API endpoint `/api/clients` may require a target IQN parameter (e.g., `/api/clients/<target_iqn>`) to return useful data. The blog presents it as a general endpoint. This was not changed due to insufficient certainty about all API versions.
- The `ceph_rbd_write_latency_sum / ceph_rbd_write_latency_count` PromQL query is confirmed correct. Note that the latency values are in nanoseconds, which the blog does not mention — the resulting value is average latency in nanoseconds.
