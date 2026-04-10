# Validation Summary: How to Write a Ceph Cluster Inventory Script

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Ceph (storage cluster commands: `ceph status`, `ceph osd`, `ceph mon`, `ceph df`)
- Rook (Ceph operator for Kubernetes, toolbox deployment)
- Kubernetes (`kubectl exec` for running commands in pods)
- Bash scripting (`set -euo pipefail`, heredocs, process substitution)
- Python 3 (inline scripts for JSON parsing and report formatting)
- radosgw-admin (Ceph Object Gateway user management)

## Sources Consulted
- Ceph official documentation for CLI commands: https://docs.ceph.com/en/latest/rados/operations/
- Ceph mon commands: https://docs.ceph.com/en/latest/man/8/ceph/
- Ceph OSD commands (`osd dump`, `osd tree`, `osd df`, `osd df tree`): https://docs.ceph.com/en/latest/rados/operations/monitoring-osd-pg/
- radosgw-admin documentation: https://docs.ceph.com/en/latest/man/8/radosgw-admin/
- kubectl exec reference: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_exec/
- Rook Ceph toolbox documentation: https://rook.io/docs/rook/latest/Troubleshooting/ceph-toolbox/
- Bash heredoc quoting rules: https://www.gnu.org/software/bash/manual/bash.html#Here-Documents

## Issues Found

### 1. `-it` flags on `kubectl exec` in non-interactive script
**What was wrong:** Both `ceph_cmd()` and `radosgw_admin()` used `kubectl exec -it`, which allocates a pseudo-TTY (`-t`) and keeps stdin open (`-i`). In a script that redirects output to files, the `-t` flag injects carriage return characters (`\r`) and TTY control sequences into the output, corrupting JSON files and making them unparseable.
**What was changed:** Removed `-it` from both `kubectl exec` calls, leaving just `kubectl exec "$TOOLS" -- ...`.
**Why:** Non-interactive script commands should never allocate a TTY. The `-i` flag is also unnecessary since no input is being sent to the commands.

### 2. Quoted heredoc delimiter prevents bash variable expansion in `collect_monitors()`
**What was wrong:** The heredoc used `<< 'PYEOF'` (quoted delimiter), which tells bash to suppress all variable expansion inside the heredoc. The Python code references `$OUTPUT_DIR/mon-dump.json` as a file path, but with a quoted delimiter, `$OUTPUT_DIR` is passed literally to Python instead of being expanded to the actual directory path. This causes a `FileNotFoundError` at runtime.
**What was changed:** Changed `<< 'PYEOF'` to `<< PYEOF` (unquoted).
**Why:** An unquoted heredoc delimiter allows bash to expand `$OUTPUT_DIR` before passing the script to Python. The Python f-string curly braces (`{data['epoch']}`) are not affected because bash only expands `$`-prefixed tokens, not bare `{...}`.

### 3. Quoted heredoc delimiter prevents bash variable expansion in `collect_pools()`
**What was wrong:** Same issue as #2 -- `<< 'PYEOF'` prevents `$OUTPUT_DIR` expansion in the Python code that reads `$OUTPUT_DIR/pools.json`.
**What was changed:** Changed `<< 'PYEOF'` to `<< PYEOF` (unquoted).
**Why:** Same reason as #2.

## Review Notes
- The `FORMAT` variable is declared but never used in the script. It could be used to switch between text and JSON output modes, but this is a design choice rather than a bug.
- The `ceph osd pool ls detail --format json` output structure can vary between Ceph releases. The field `erasure_code_profile` is an empty string for replicated pools and a non-empty string for erasure-coded pools, so the truthiness check in the Python code is correct.
- The script assumes RGW is deployed; `collect_rgw_users()` will fail if the RADOS Gateway is not running. A production script might want to check for RGW availability first, but this is a design enhancement rather than a correctness issue.
- The `cat "$OUTPUT_DIR/health.txt" | head -5` in `generate_report()` is a minor "useless use of cat" but is not incorrect.
