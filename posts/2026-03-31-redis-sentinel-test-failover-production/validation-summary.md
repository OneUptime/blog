# Validation Summary: How to Test Redis Sentinel Failover Before Production

## Status
validated

## Post Type
Tutorial / Practical Guide

## Technologies Covered
- Redis Sentinel (failover, monitoring, Pub/Sub events)
- Redis CLI (`redis-cli`)
- Redis commands: SENTINEL failover, SENTINEL get-master-addr-by-name, SENTINEL replicas, DEBUG SLEEP, ROLE, INFO server
- Python `redis-py` library (Sentinel client)
- Linux networking tools (iptables)
- Bash scripting

## Sources Consulted
- Redis Sentinel official documentation: https://redis.io/docs/latest/operate/oss_and_stack/management/sentinel/
- Redis ROLE command documentation: https://redis.io/docs/latest/commands/role/
- Redis INFO command documentation: https://redis.io/docs/latest/commands/info/
- Redis DEBUG command documentation: https://redis.io/docs/latest/commands/debug/
- redis-py Sentinel API: https://redis-py.readthedocs.io/en/stable/connections.html#sentinel-client

## Issues Found

### 1. Measuring Failover Time script checked the wrong instance (Fixed)

**What was wrong:** The script hardcoded `redis-cli -p 6379 ROLE` to detect when the new primary was ready. After `SENTINEL failover` triggers, the old master on port 6379 is demoted to a replica, so its ROLE returns "slave" — the loop would never terminate.

**What was changed:** Replaced the hardcoded port 6379 check with a loop that:
1. Records the old master address before triggering failover.
2. Queries Sentinel (`SENTINEL get-master-addr-by-name`) on each iteration for the current master address.
3. Waits until Sentinel reports a *different* address from the old master.
4. Verifies the new master responds with ROLE "master" before breaking.

**Why:** After failover, the new primary runs on a different host/port. The script must ask Sentinel where the new primary is rather than assuming a fixed address.

## Review Notes
- `DEBUG SLEEP` is an internal/undocumented Redis command. It works in practice and is commonly used for testing, but it is not part of the official public command documentation. The blog post's use in a testing context is appropriate.
- `SENTINEL replicas` requires Redis >= 5.0 (older versions used `SENTINEL slaves`). The post uses modern terminology throughout, which is correct for current Redis versions.
- The `date +%s%N` nanosecond format used in the bash script works on Linux but not on macOS (where `%N` is unsupported). This is unlikely to be an issue since Redis Sentinel is typically deployed on Linux servers.
- The Python example manually re-creates the master connection in the except block. While `redis-py`'s Sentinel-managed connections can auto-discover the new master, the explicit reconnection pattern shown is a valid and clear approach for demonstration purposes.
