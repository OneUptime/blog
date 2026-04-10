# Validation Summary: How to Use SENTINEL FAILOVER for Manual Failover

## Status
validated

## Post Type
Tutorial / Operational Guide

## Technologies Covered
- Redis Sentinel
- Redis CLI (`redis-cli`)
- Redis replication (REPLICAOF)
- Sentinel Pub/Sub event channels

## Sources Consulted
- Redis Sentinel official documentation: https://redis.io/docs/latest/operate/oss_and_stack/management/sentinel/
- Redis SENTINEL FAILOVER command reference: https://redis.io/docs/latest/commands/sentinel-failover/
- Redis source code (`sentinel.c`) for Pub/Sub event channel names

## Issues Found
1. **Incorrect Sentinel Pub/Sub channel name `+failover-triggered`** (lines 73 and 79): The channel `+failover-triggered` does not exist in Redis Sentinel. The correct event channel name is `+try-failover`, which is emitted when a Sentinel begins the failover process. Fixed both the SUBSCRIBE command and the example output to use `+try-failover`.

## Review Notes
- The `flags` field example shows `"failover_in_progress"` alone, whereas in practice it would typically appear as a comma-separated combination like `"master,failover_in_progress"`. This is a minor simplification that doesn't affect correctness for the reader's understanding.
- The automated test script at the end parses `SENTINEL get-master-addr-by-name` output with `cut -d' '`, which works with redis-cli default output but may need adjustment if using `--raw` or `--csv` flags. This is acceptable as-is for a demonstration script.
- All other technical claims (syntax, return values, quorum behavior, failover-timeout default of 180000ms, failover sequence, REPLICAOF mechanics) verified correct against official documentation.
