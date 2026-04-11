# Validation Summary: How to Monitor Redis Replication with INFO replication

## Status
validated

## Post Type
Tutorial / Reference Guide

## Technologies Covered
- Redis (INFO replication command)
- Redis replication (primary-replica architecture)
- Bash scripting (redis-cli automation)
- Mermaid diagrams (sequence and flowchart)

## Sources Consulted
- Redis INFO command official documentation: https://redis.io/docs/latest/commands/info/
- Redis replication official documentation: https://redis.io/docs/latest/operate/oss_and_stack/management/replication/
- Redis REPLCONF command behavior and ACK mechanism

## Issues Found
1. **Bug in bash script grep pattern**: The `grep "slave_repl_offset"` command in the replication lag calculation script would also match `slave_read_repl_offset` (a separate field present in replica INFO output), returning two lines and breaking the `awk` extraction and arithmetic. Fixed by anchoring the pattern to `grep "^slave_repl_offset:"`. Applied the same anchoring fix to `grep "^master_repl_offset:"` for consistency.

## Review Notes
- The replica output example shows `repl_backlog_active:0`. In Redis 7.0+, replicas maintain their own replication backlog and this value is typically `1`. The shown value is valid for pre-7.0 configurations or replicas without sub-replicas, but readers on Redis 7+ may see different values.
- The replica output omits `master_replid2` and `second_repl_offset` fields that would appear in real output. This is acceptable as a simplified example but readers should be aware the actual output contains additional fields.
- The `lag` field description ("Seconds since the replica last sent a REPLCONF ACK") is accurate. More precisely, it is measured on the primary side as seconds since the last REPLCONF ACK was *received* from that replica.
- All Mermaid diagrams are syntactically correct and accurately represent the described workflows.
- The post uses the older `slave` terminology which matches the actual Redis field names in INFO output (Redis still uses `slave` in field names even though documentation prefers `replica`).
