# Validation Summary: How to Migrate Redis with Zero Downtime Using Replication

## Status
validated

## Post Type
Tutorial / Step-by-step Guide

## Technologies Covered
- Redis (replication, CLI, configuration)
- redis-cli commands (REPLICAOF, CLIENT PAUSE, CONFIG SET, INFO, DBSIZE, RANDOMKEY)
- Python redis-py client library
- Ubuntu/systemd service management

## Sources Consulted
- Redis official documentation for REPLICAOF: https://redis.io/docs/latest/commands/replicaof/
- Redis official documentation for CLIENT PAUSE: https://redis.io/docs/latest/commands/client-pause/
- Redis official documentation for min-replicas-to-write: https://redis.io/docs/latest/develop/reference/info/#replication
- Redis replication guide: https://redis.io/docs/latest/operate/oss_and_stack/management/replication/
- Redis official documentation for DBSIZE: https://redis.io/docs/latest/commands/dbsize/
- redis-py documentation: https://redis-py.readthedocs.io/

## Issues Found

### 1. Incorrect write-pausing mechanism in Step 4
**What was wrong:** The post used `CONFIG SET min-replicas-to-write 1` and claimed "This causes writes to block until at least 1 replica is in sync." This is incorrect — `min-replicas-to-write 1` rejects writes with a `NOREPLICAS` error if no replica is connected within the lag threshold, but it does NOT pause or block writes. When the replica IS connected (which it would be during migration), writes continue normally, so this command is effectively a no-op for pausing writes.

**What was changed:** Replaced with `CLIENT PAUSE 60000 WRITE` which actually pauses write commands for 60 seconds while allowing reads to continue (Redis 6.2+). Added a note for older Redis versions to use `CLIENT PAUSE 60000` which pauses all commands.

### 2. Inconsistent password placeholders
**What was wrong:** Steps 3, 4, and 7 used `-a "pwd"` as the password argument while all other steps used `-a "your-strong-password"`. This inconsistency could confuse readers into thinking `pwd` is the actual password or refers to a different instance.

**What was changed:** Replaced all `-a "pwd"` occurrences with `-a "your-strong-password"` for consistency.

### 3. DBSIZE output format issue in Step 7
**What was wrong:** `redis-cli DBSIZE` outputs `(integer) 12345` including a type prefix. The script stored this full string in `NEW_COUNT` and compared it with `OLD_COUNT` (which was a plain number extracted via grep/cut). The comparison output would show mismatched formats.

**What was changed:** Added `--raw` flag to the `redis-cli DBSIZE` and `RANDOMKEY` calls so they output plain values without type prefixes.

## Review Notes
- The post uses `bind 0.0.0.0` which binds Redis to all network interfaces. While this is necessary for replication across hosts and is protected by `requirepass`, readers should be reminded to restrict binding in production (e.g., to specific IPs or use firewall rules).
- The `tee -a` approach in Step 1 appends config directives to the existing redis.conf. Redis uses the last occurrence of a directive, so this works, but duplicate directives in the config file can cause confusion during future maintenance.
- `CLIENT PAUSE WRITE` requires Redis 6.2+. The post now includes a fallback note for older versions. Since `REPLICAOF` requires Redis 5.0+, this version guidance is appropriate.
- The `INFO keyspace` extraction for `OLD_COUNT` uses `grep -o "keys=[0-9]*"` which would match multiple databases if more than db0 is in use. For most deployments this is fine, but could produce unexpected results in multi-database setups.
