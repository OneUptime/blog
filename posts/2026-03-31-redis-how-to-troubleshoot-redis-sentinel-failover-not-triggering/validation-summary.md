# Validation Summary: How to Troubleshoot Redis Sentinel Failover Not Triggering

## Status
validated

## Post Type
Troubleshooting Guide

## Technologies Covered
- Redis Sentinel
- Redis (primary/replica replication)
- Redis ACL (6.0+)

## Sources Consulted
- Redis Sentinel official documentation: https://redis.io/docs/latest/operate/oss_and_stack/management/sentinel/
- Redis SENTINEL commands reference: https://redis.io/docs/latest/commands/?group=sentinel
- Redis replication and replica-priority documentation: https://redis.io/docs/latest/operate/oss_and_stack/management/replication/

## Issues Found

### 1. Incorrect description of `failover-timeout` in Step 6
- **What was wrong:** The post stated that `sentinel failover-timeout mymaster 30000` configures "the maximum allowed replica lag for promotion." This is incorrect. `failover-timeout` controls the overall timeout for the failover operation (e.g., how long to wait for the failover to complete, cooldown between failover attempts), not replica lag eligibility.
- **What was changed:** Replaced the incorrect `failover-timeout` guidance with accurate information about how Sentinel selects replicas for promotion: based on `replica-priority` (lowest non-zero value), then replication offset, then run ID. Added the correct `replica-priority 0` configuration for preventing a replica from being promoted, which is set on the replica's own `redis.conf`, not in `sentinel.conf`.
- **Why:** The original text could lead users to misconfigure `failover-timeout` thinking it controls replica selection behavior, when it actually controls failover timing and retry logic.

### 2. Minor clarification on replica offset comparison in Step 6
- **What was wrong:** The text said to compare `slave-repl-offset` with `master-repl-offset`, but `master-repl-offset` is not a field in the `SENTINEL replicas` output.
- **What was changed:** Clarified to compare `slave-repl-offset` values between replicas and to check `master-link-status` for connectivity, which are the fields actually present in the SENTINEL replicas output.
- **Why:** The original guidance referenced a field that doesn't exist in the command output shown, which could confuse readers.

## Review Notes
- The explanation in Step 3 that "Sentinels communicate via the monitored Redis primary" is a simplification. Sentinels *discover* each other via Pub/Sub on the primary's `__sentinel__:hello` channel, but thereafter communicate directly via TCP on port 26379 for voting and failover coordination. The troubleshooting advice (check port 26379 firewall rules) is correct regardless.
- All Sentinel commands (`SENTINEL masters`, `SENTINEL ckquorum`, `SENTINEL sentinels`, `SENTINEL replicas`, `SENTINEL SET`, `SENTINEL FAILOVER`) are correct and current.
- The log message formats shown in Step 8 are accurate representations of Sentinel log events.
- The `SENTINEL replicas` command was introduced in Redis 5.0 as a rename of `SENTINEL slaves`. The post does not mention version compatibility, which is fine for a modern audience but worth noting.
