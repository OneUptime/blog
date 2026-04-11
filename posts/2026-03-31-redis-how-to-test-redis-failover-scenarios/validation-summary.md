# Validation Summary: How to Test Redis Failover Scenarios

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Redis 7 (redis:7-alpine Docker image)
- Redis Sentinel (failover management)
- Docker Compose (test environment orchestration)
- Python redis-py library (redis.sentinel.Sentinel API)
- pytest (automated test framework)
- Bash scripting (shell-based failover verification)

## Sources Consulted
- Redis Sentinel documentation: https://redis.io/docs/latest/operate/oss_and_stack/management/sentinel/
- Redis replication documentation: https://redis.io/docs/latest/operate/oss_and_stack/management/replication/
- redis-py Sentinel API documentation: https://redis-py.readthedocs.io/en/stable/connections.html#sentinel-client
- Docker Compose file reference: https://docs.docker.com/compose/compose-file/
- Redis CLI SENTINEL commands: https://redis.io/docs/latest/commands/sentinel-get-master-addr-by-name/

## Issues Found

### 1. Bash failover test script used host-side redis-cli with internal Docker ports
**What was wrong:** The "Testing Replica Promotion" bash script ran `redis-cli` directly on the host using ports returned by `SENTINEL get-master-addr-by-name`. After failover, Sentinel returns the internal Docker network IP and port (6379) of the promoted replica. From the host, the promoted replica is only reachable on its mapped port (6380), so `redis-cli -p $NEW_PORT` (where `$NEW_PORT` is 6379) would connect to the stopped original primary, not the new one. The script would fail after failover.

**What was changed:** Rewrote the script to use `docker exec sentinel-1 redis-cli` so all redis-cli commands run inside the Docker network where Sentinel-reported addresses are valid. Also added `tr -d '\r'` to strip potential carriage returns from command output, and used both `-h $NEW_IP -p $NEW_PORT` to connect to the new primary.

### 2. Summary incorrectly claimed Redis replication is synchronous
**What was wrong:** The summary stated "no data is lost (since replication is synchronous at confirmation time)." This is factually incorrect. Redis replication is **asynchronous** by default — the primary acknowledges a write to the client before the replica confirms receipt. During failover, writes that were acknowledged but not yet replicated to the promoted replica can be lost. This is a well-documented trade-off of Redis Sentinel HA.

**What was changed:** Corrected to: "data loss is minimized (note that Redis replication is asynchronous by default, so writes acknowledged just before a failure may not have been replicated to the promoted replica)."

## Review Notes
- **Shared sentinel.conf bind mount**: All three sentinel containers bind-mount the same `./sentinel.conf` file read-write. Redis Sentinel rewrites its config file at runtime to persist state. With a shared bind mount, all three sentinels write to the same host file, which can cause race conditions. For a quick test setup this often works, but for a more robust configuration each sentinel should have its own config file copy. This is a known Docker + Sentinel limitation commonly seen in tutorials.
- **ReadOnlyError not caught in ResilientRedisClient**: During failover, if `master_for()` briefly returns a not-yet-promoted replica, writes would raise `redis.exceptions.ReadOnlyError`. The `execute` method only catches `ConnectionError` and `TimeoutError`. Adding `ReadOnlyError` to the caught exceptions would improve resilience during the failover window.
- **Unused `_client` attribute**: The `ResilientRedisClient.__init__` sets `self._client = None` but it is never read or written elsewhere. This is a minor code quality issue, not a correctness bug.
- **Docker Compose `version` field**: The `version: '3.8'` key is deprecated in modern Docker Compose (v2+) but still accepted. Not an error, but could be removed for modern setups.
