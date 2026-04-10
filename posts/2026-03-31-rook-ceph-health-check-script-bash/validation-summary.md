# Validation Summary: How to Write a Ceph Health Check Script in Bash

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Ceph (cluster health monitoring commands: `ceph health`, `ceph osd stat`, `ceph pg stat`, `ceph pg dump_stuck`, `ceph df detail`)
- Rook (Rook-Ceph toolbox deployment on Kubernetes)
- Bash scripting (`set -euo pipefail`, functions, exit codes)
- kubectl (executing commands in Kubernetes pods)
- Python 3 (inline JSON parsing from shell)
- Slack Incoming Webhooks (alert delivery)
- mail/sendmail (email alerting)

## Sources Consulted
- Ceph official documentation for CLI JSON output formats (health, osd stat, pg dump_stuck, df detail)
- Ceph source code (`src/mon/PGMap.cc`) for `pg dump_stuck` JSON structure confirming `stuck_pg_stats` key
- Ceph GitHub PR #31399 confirming `ceph osd stat --format json` key names
- kubectl documentation for `exec` flags (`-i`, `-t` behavior in non-interactive contexts)
- Ceph Quincy/Reef/Squid release notes for JSON format stability

## Issues Found

### 1. `kubectl exec -it` in non-interactive script
- **What was wrong:** The `ceph_cmd()` function used `kubectl exec -it`, which allocates a pseudo-TTY (`-t`) and enables interactive mode (`-i`). In a scripted context (cron, CI pipelines), the `-t` flag causes the error "the input device is not a TTY" and can inject carriage return characters (`\r`) into JSON output, breaking the Python JSON parser.
- **What was changed:** Removed the `-it` flags from the `kubectl exec` call, changing it to `kubectl -n "$NAMESPACE" exec "$TOOLS_POD" -- ceph "$@"`.
- **Why:** The script is described as running "via cron or a CI pipeline," where no TTY is available. Non-interactive command execution should not allocate a TTY.

### 2. Pool usage percentage calculation mixed raw and logical metrics
- **What was wrong:** The pool capacity check used `bytes_used` (raw bytes consumed, including replication overhead) divided by `bytes_used + max_avail` (where `max_avail` is a logical/notional metric). This mixes raw and logical units, producing inaccurate percentage values — for example, a 3-replica pool would appear ~3x more full than it actually is.
- **What was changed:** Replaced the manual calculation with `pool["stats"]["percent_used"] * 100`, using the pre-calculated `percent_used` field that Ceph provides in the JSON output of `ceph df detail --format json`.
- **Why:** The `percent_used` field is computed by Ceph itself using internally consistent metrics, avoiding the raw-vs-logical unit mismatch.

## Review Notes
- The `set -euo pipefail` combined with separate `local` declaration and assignment (e.g., `local status; status=$(...)`) means `set -e` will trigger if a `ceph_cmd` call fails. This is acceptable behavior for a health check — if the toolbox pod is unreachable, the script should fail loudly — but users extending the script should be aware of this interaction.
- The `ceph pg dump_stuck` command and its `stuck_pg_stats` JSON key were confirmed as still active and valid in Ceph Reef and Squid. No deprecation was found.
- The JSON key names for `ceph health` (`status`), `ceph osd stat` (`num_osds`, `num_up_osds`, `num_in_osds`), and `ceph pg stat` (`num_pgs`) were all confirmed correct for modern Ceph versions (Quincy through Squid).
