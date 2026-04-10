# Validation Summary: How to Monitor Redis Sentinel Status with SENTINEL INFO

## Status
validated

## Post Type
Tutorial / Reference Guide

## Technologies Covered
- Redis Sentinel
- redis-cli
- Bash scripting
- Redis Pub/Sub

## Sources Consulted
- Redis Sentinel official documentation: https://redis.io/docs/latest/operate/oss_and_stack/management/sentinel/
- Redis Sentinel commands reference: https://redis.io/docs/latest/commands/?group=sentinel
- Redis source code (`sentinel.c`) — `addReplySentinelRedisInstance()`, `sentinelCommand()`, `sentinelEvent()` functions for authoritative field names, flag values, and Pub/Sub channel names

## Issues Found

1. **`SENTINEL masters` output included a nonexistent `"status"` field.** The `status` field (with values like `ok`, `sdown`, `odown`) only exists in the `INFO sentinel` output on the `master0:` line. The `SENTINEL masters` command does not return a `status` field. Removed it from the example output.

2. **Flag `odown,failover_in_progress` used incorrect format.** The correct flag name is `o_down` (with underscore), not `odown`. Additionally, the `master` flag is always present when the instance is a master. Fixed to `master,o_down,failover_in_progress`.

3. **`no-auth-warning` listed as a valid Sentinel flag.** This string does not exist as a Sentinel flag in the Redis source code. It is not among the valid flags (`master`, `slave`, `sentinel`, `s_down`, `o_down`, `disconnected`, `master_down`, `failover_in_progress`, `promoted`, etc.). Removed the row from the flags table.

4. **Pub/Sub channel `+failover-triggered` does not exist.** The correct Sentinel Pub/Sub channel for failover initiation is `+try-failover`. Fixed in the SUBSCRIBE command example, the event channels table, and the summary paragraph.

5. **NOQUORUM error message text was inaccurate.** The blog showed "Quorum and failover authorization cannot be reached" but the actual Redis response is "Not enough available Sentinels to reach the specified quorum for this master". Fixed to match the actual output.

## Review Notes
- The `SENTINEL replicas` command (used throughout the post) was introduced in Redis 5.0 as an alias for `SENTINEL slaves`. This is the modern and preferred form, which is good.
- The flags field in replica output correctly uses `slave` (not `replica`) even when queried via `SENTINEL replicas` — this is an intentional backward-compatibility choice in Redis.
- The TILT mode duration of 30 seconds is confirmed correct from source code (`SENTINEL_PING_PERIOD * 30 = 30000ms`).
- The `+promoted-slave` Pub/Sub channel name is correct but uses legacy "slave" terminology; Redis has not renamed this channel.
- The monitoring bash script is functional and uses correct command syntax.
