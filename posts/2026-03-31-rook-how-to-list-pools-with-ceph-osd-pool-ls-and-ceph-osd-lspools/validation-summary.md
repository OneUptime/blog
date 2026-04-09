# Validation Summary: How to List Pools with ceph osd pool ls and ceph osd lspools

## Status
validated

## Post Type
Reference / CLI Guide

## Technologies Covered
- Ceph (storage cluster CLI)
- Rook (Ceph operator for Kubernetes, mentioned in tags)
- jq (JSON processing)
- Python 3 (scripting examples)
- Bash scripting

## Sources Consulted
- Ceph official documentation: Pool operations and CLI reference (https://docs.ceph.com/en/latest/rados/operations/pools/)
- Ceph CLI reference for `ceph osd pool` subcommands (https://docs.ceph.com/en/latest/man/8/ceph/)
- Ceph JSON output format documentation for `ceph df`, `ceph osd dump`, and `ceph osd pool ls detail`

## Issues Found
No technical issues found.

All commands are syntactically correct and use valid flags:
- `ceph osd pool ls` and `ceph osd pool ls detail` are correct.
- `ceph osd lspools` is a valid older command.
- `ceph df` and `ceph df detail` are correct.
- `ceph osd pool stats [pool]` is correct.
- `ceph osd pool get <pool> <property>` uses valid properties (size, min_size, pg_num, crush_rule, all).
- `ceph osd pool application get [pool]` is correct.
- JSON output flags (`--format json`, `--format json-pretty`) are correct.
- The `jq` queries use accurate field paths for both `ceph df` and `ceph osd dump` JSON output.
- The audit script correctly escapes f-string quotes for bash embedding and uses valid JSON field names from `ceph osd pool ls detail --format json`.

## Review Notes
- The example output for `ceph osd lspools` is shown as newline-separated without commas. The actual output in most Ceph versions (Nautilus through Reef) is comma-separated (e.g., `1 poolname,2 poolname,...`). This is a minor cosmetic difference in the example output and does not affect the technical accuracy of the command itself.
- The `ceph osd pool application get` example output shows `cephfs`, `rbd`, and `rgw` tags, which is illustrative but unusual for a single pool to have all three. This is fine as a demonstration of the output format.
- The `type` field from `ceph osd pool ls detail --format json` returns an integer (1 for replicated, 3 for erasure coded), not a human-readable string. The audit script would print this integer value, which is technically correct but users may want to add a mapping for readability.
- `ceph osd lspools` is deprecated in favor of `ceph osd pool ls` in newer Ceph releases. The post correctly describes it as "older but still functional."
