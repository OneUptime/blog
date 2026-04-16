# Validation Summary: How to Write a ClickHouse Health Check Script

## Status
validated

## Post Type
Tutorial / Operations guide

## Technologies Covered
- ClickHouse (HTTP interface on port 8123, `/ping` endpoint)
- ClickHouse system tables: `system.replicas`, `system.parts`, `system.disks`, `system.processes`
- Bash scripting
- curl (HTTP Basic auth, `--data-binary`, `--max-time`)
- Kubernetes liveness probes
- Nagios/Icinga-style exit codes (0 OK, 1 WARNING, 2 CRITICAL)

## Sources Consulted
- ClickHouse `system.replicas` docs: https://clickhouse.com/docs/en/operations/system-tables/replicas (confirmed `is_readonly`, `is_session_expired`)
- ClickHouse `system.disks` docs: https://clickhouse.com/docs/en/operations/system-tables/disks (confirmed `free_space`, `total_space`)
- ClickHouse `system.parts` docs: https://clickhouse.com/docs/en/operations/system-tables/parts (confirmed `active`, `table`)
- ClickHouse `system.processes` docs: https://clickhouse.com/docs/en/operations/system-tables/processes (confirmed `elapsed` Float64 = seconds since query start)
- ClickHouse HTTP interface (port 8123, `/ping`, Basic auth via `-u`) — standard documented behavior

## Issues Found
No technical issues found. All SQL queries reference valid system table columns with correct semantics; the HTTP interface usage (port 8123, `/ping`, Basic auth) is correct; exit-code conventions match the Nagios plugin spec cited.

## Review Notes
- The `check_liveness` check relies on `$RESULT` being exactly `"1"`. Command substitution strips trailing newlines, so `TabSeparated` output of `1\n` correctly becomes `1` — the comparison works as written.
- The numeric comparisons (`-gt 0`) will emit a bash error if a query fails and returns empty/non-numeric output (e.g., auth failure). The liveness check running first mitigates this in normal operation, but a more defensive script could validate that each result is numeric before comparing. Not incorrect, just a robustness consideration.
- The >300 parts per table threshold is a reasonable operational heuristic (ClickHouse historically warned around 300 active parts per partition); users should tune it for their workload.
- The 15% free-space threshold and 5-minute long-query threshold are sensible defaults but are workload-specific and worth calling out as tunable.
