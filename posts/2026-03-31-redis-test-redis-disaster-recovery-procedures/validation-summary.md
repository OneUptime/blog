# Validation Summary: How to Test Redis Disaster Recovery Procedures

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Redis (Sentinel, RDB backups, DEBUG commands)
- redis-cli (command-line interface)
- redis-py (Python Redis client, including Sentinel support)
- AWS CLI (S3 backup retrieval)
- Bash scripting
- systemd (service management)

## Sources Consulted
- Redis Sentinel documentation: https://redis.io/docs/management/sentinel/
- Redis SENTINEL commands reference: https://redis.io/commands/sentinel-failover/, https://redis.io/commands/sentinel-get-master-addr-by-name/
- Redis DBSIZE command reference: https://redis.io/commands/dbsize/
- Redis DEBUG SLEEP command reference: https://redis.io/commands/debug/
- redis-py Sentinel documentation: https://redis-py.readthedocs.io/en/stable/sentinel.html
- redis-cli output formatting behavior (--raw flag vs default RESP rendering)

## Issues Found

### Issue 1: DBSIZE output not parsed for numeric comparison (Test 2)
- **What was wrong:** `redis-cli DBSIZE` returns output in the format `(integer) N` (e.g., `(integer) 42`). The script assigned this full string to `KEYCOUNT` and then used `[ "$KEYCOUNT" -gt 0 ]`, which would fail because bash cannot perform numeric comparison on the string `(integer) 42`.
- **What was changed:** Added `| awk '{print $2}'` to the `redis-cli DBSIZE` call to extract only the numeric value.
- **Why:** Without this fix, the restore verification step would always fail with a bash arithmetic error, regardless of whether the restore actually succeeded.

### Issue 2: Python reconnection test not using Sentinel client (Test 3)
- **What was wrong:** The test used `redis.Redis(host="redis-primary.internal", port=6379)` which creates a direct connection to a specific host. After a Sentinel failover promotes a replica, this direct connection would either fail or reconnect to the old (now-demoted) node. It would NOT discover the new primary via Sentinel, despite the comment claiming "Application should auto-reconnect via Sentinel."
- **What was changed:** Replaced with `redis.sentinel.Sentinel` to create a Sentinel-aware connection using `sentinel.master_for('mymaster')`. Also broadened the exception handler from `redis.exceptions.ConnectionError` to `Exception` since Sentinel-aware connections can raise `redis.sentinel.MasterNotFoundError` during failover transitions.
- **Why:** The entire purpose of this test is to verify Sentinel-based auto-reconnection. Without a Sentinel-aware client, the test cannot validate what it claims to test.

## Review Notes
- The `DEBUG SLEEP` command used in Test 4 requires `enable-debug-command yes` in redis.conf starting from Redis 7.0. This is not mentioned in the post, but is acceptable since this is a DR testing procedure typically run in controlled environments.
- The Test 4 script title says "Measure RTO and RPO" but only measures RTO (Recovery Time Objective). RPO (Recovery Point Objective) measurement would require comparing the last write acknowledged before failure against what's available after recovery. The explanation is not wrong per se, but the RPO measurement is left as an exercise for the reader.
- The `redis-py` `get()` method returns bytes by default (e.g., `b'initial_value'`), so the print output in Test 3 will display the `b'...'` prefix. This is cosmetically imperfect but not technically wrong, and using `decode_responses=True` would be a stylistic preference.
