# Validation Summary: How to Write a Ceph Capacity Alert Script

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Bash scripting
- Ceph (cluster storage — `ceph df`, `ceph osd df` commands)
- Rook-Ceph (Kubernetes operator for Ceph)
- kubectl (Kubernetes CLI)
- Python 3 (inline JSON parsing)
- Slack Incoming Webhooks
- curl
- mail (sendmail/postfix CLI)
- bc (arbitrary-precision calculator)

## Sources Consulted
- Ceph documentation for `ceph df` JSON output format (stats.total_bytes, stats.total_used_raw_bytes): https://docs.ceph.com/en/latest/rados/operations/monitoring/
- Ceph documentation for `ceph osd df` JSON output format (nodes[].utilization, nodes[].id): https://docs.ceph.com/en/latest/rados/operations/monitoring-osd-pg/
- Ceph source code for `ceph df detail` pool stats JSON fields (bytes_used, max_avail): https://github.com/ceph/ceph
- kubectl exec documentation (TTY allocation flags): https://kubernetes.io/docs/reference/kubectl/generated/kubectl_exec/
- Bash reference manual — redirections and pipelines (heredoc vs pipe stdin precedence): https://www.gnu.org/software/bash/manual/bash.html#Redirections
- POSIX Shell Command Language — pipeline and redirection interaction: https://pubs.opengroup.org/onlinepubs/9699919799/utilities/V3_chap02.html

## Issues Found

### 1. `-it` flag in `kubectl exec` inside `ceph_cmd` (script context)
- **What was wrong:** The `ceph_cmd` function used `kubectl exec -it`, which allocates a pseudo-TTY (`-t`) and enables interactive stdin (`-i`). In a non-interactive script or Kubernetes CronJob, no TTY is available, causing warnings or failures.
- **What was changed:** Removed `-it` flags: `kubectl -n "$NAMESPACE" exec "$TOOLS" -- ceph "$@"`.
- **Why:** The blog post's summary recommends deploying this as a CronJob, where `-t` will fail since there is no terminal to allocate.

### 2. Pipe/heredoc stdin conflict in `check_pool_capacity`
- **What was wrong:** `echo "$df_json" | python3 << 'PYEOF'` — the heredoc redirection (`<<`) overrides the pipe for stdin. Python reads the heredoc as its script source, and `json.load(sys.stdin)` then finds stdin exhausted, causing a `json.JSONDecodeError`. The pool capacity check was completely non-functional.
- **What was changed:** Replaced the heredoc with `python3 -c '...'`, keeping the pipe to deliver JSON data via stdin.
- **Why:** With `-c`, the script is passed as a command-line argument, leaving stdin free for the piped JSON data.

### 3. Configurable thresholds not passed to per-pool Python script
- **What was wrong:** The Python script referenced `sys.argv[1]` and `sys.argv[2]` for warn/crit thresholds, but no arguments were passed (heredoc invocation provides no argv). The thresholds always fell back to hardcoded defaults of 75/90, ignoring the shell variables `$WARN_THRESHOLD` and `$CRIT_THRESHOLD`.
- **What was changed:** Passed `"$WARN_THRESHOLD" "$CRIT_THRESHOLD"` as arguments after the `-c` script string, and used `float(sys.argv[1])` / `float(sys.argv[2])` directly (removing the conditional fallback).
- **Why:** The blog post advertises "configurable thresholds" but the per-pool check was ignoring the configuration.

### 4. Pipe/heredoc stdin conflict in `check_osd_utilization`
- **What was wrong:** Same issue as #2: `ceph_cmd osd df ... | python3 << 'PYEOF'` — the heredoc overrides the pipe, making `json.load(sys.stdin)` fail.
- **What was changed:** Stored JSON in a local variable first (`osd_json`), then piped it into `python3 -c '...'`.
- **Why:** Same fix as #2 — separating the script source (`-c`) from the data source (pipe).

### 5. OSD alerts not captured into ALERTS array
- **What was wrong:** `check_osd_utilization` printed alert lines to stdout but never collected them into the `ALERTS` array. This meant OSD-level alerts were not included in Slack or email notifications — they were just printed to the console and lost.
- **What was changed:** Added the same `while IFS= read -r line` pattern used in `check_pool_capacity` to capture Python output into the `ALERTS` array.
- **Why:** Without this, the notification system only reported cluster-level and pool-level alerts, silently dropping all OSD alerts.

## Review Notes
- The pool capacity calculation (`bytes_used / (bytes_used + max_avail)`) is an approximation. For replicated pools, `bytes_used` includes replication overhead while `max_avail` does not, so the reported percentage may overestimate usage. This is acceptable for alerting purposes.
- The OSD utilization thresholds (80% warn, 90% crit) are intentionally different from the cluster/pool thresholds (75%/90% configurable). This is reasonable since individual OSDs can be more utilized than the cluster average.
- The `send_notifications` function returns 1 when alerts exist, which (being the last command) makes the script exit with code 1. Combined with `set -e`, this is standard monitoring script behavior (exit 0 = OK, exit 1 = alerts). However, if additional logic were added after `send_notifications`, `set -e` would cause an early exit.
- The script depends on `python3`, `bc`, `curl`, and `mail` being available in the execution environment. For CronJob deployment, the container image must include these tools.
