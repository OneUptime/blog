# Validation Summary: How to Write a Ceph OSD Monitoring Script in Python

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Python 3.9+
- Ceph (OSD subsystem)
- Rook Ceph (Kubernetes operator)
- kubectl (exec into toolbox pod)
- Slack Incoming Webhooks
- subprocess, json, urllib.request (Python stdlib)

## Sources Consulted
- Ceph official documentation for `ceph osd dump`, `ceph osd perf`, `ceph osd df` JSON output formats (https://docs.ceph.com/en/latest/rados/operations/monitoring-osd-pg/)
- Ceph CLI reference for `--format json` flag (https://docs.ceph.com/en/latest/rados/operations/monitoring/)
- Rook Ceph toolbox documentation (https://rook.io/docs/rook/latest/Troubleshooting/ceph-toolbox/)
- Python subprocess module documentation (https://docs.python.org/3/library/subprocess.html)
- Python urllib.request documentation (https://docs.python.org/3/library/urllib.request.html)
- Slack Incoming Webhooks API documentation (https://api.slack.com/messaging/webhooks)

## Issues Found
1. **Unused variables in `get_osd_status()`**: The function called `run_ceph(["osd", "tree"])` and `run_ceph(["osd", "stat"])`, assigning results to `osd_tree` and `osd_stat`, but neither variable was used anywhere in the function. These represented two unnecessary network round-trips (kubectl exec + ceph command) on every invocation. Removed both calls, keeping only the `ceph osd dump` call whose data is actually used.

## Review Notes
- The `import urllib.request` statement appears in the "Sending Alerts" code block rather than at the top with other imports. This is a common blog presentation pattern (each section introduces its own dependencies), but readers assembling the full script should move it to the top.
- The `check_osd_utilization` function filters on `node.get("type") != "osd"`. In `ceph osd df` output, all nodes are OSDs so this check is redundant but harmless as a defensive guard.
- The `check_osd_health` function only alerts on an OSD being "out" when it is also "down" (`in == 0 and up == 0`). An OSD that is out but still up (e.g., being drained) won't trigger an alert. This is a reasonable design choice for avoiding noise during intentional maintenance.
- The `list[str]` type hint syntax requires Python 3.9+. The post does not mention a minimum Python version; readers on Python 3.8 or earlier would need to use `from typing import List` and `List[str]` instead.
