# Validation Summary: How to Create Redis Keyspace Notifications

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Redis (Pub/Sub, keyspace notifications, configuration)
- redis-py (Python client)
- ioredis (Node.js client)
- go-redis v9 (Go client)
- Redis Cluster (sharded mode)
- Redis Streams (mentioned as alternative for reliable delivery)

## Sources Consulted
- Redis official documentation: https://redis.io/docs/latest/develop/use/keyspace-notifications/
- Redis CONFIG SET docs: https://redis.io/docs/latest/commands/config-set/
- Redis source code (t_string.c, t_set.c, t_list.c, t_hash.c, t_zset.c, notify.c) for the exact event names emitted by each command (e.g., `setGenericCommand`, `incrDecrCommand`, `incrbyfloatCommand`, `smoveCommand`, `lmoveCommand`, `zmpopGenericCommand`, `hincrbyfloatCommand`)
- redis-py documentation: https://redis-py.readthedocs.io/ (Pub/Sub patterns, `RedisCluster.get_primaries()` returning `ClusterNode` objects with `.host`/`.port` attributes)
- ioredis documentation: https://github.com/redis/ioredis (PSUBSCRIBE / pmessage event)
- go-redis v9 documentation: https://pkg.go.dev/github.com/redis/go-redis/v9 (`PSubscribe`, `SetNX`, `ConfigSet`, `Channel()`)

## Issues Found

1. **Event Types Reference table — incorrect event names for several commands.** The post listed several commands under the wrong event names. Verified against the Redis source code, where each command's `notifyKeyspaceEvent` call shows the actual event string emitted.

   - **`INCRBYFLOAT`** was listed under `incrby`. The dedicated `incrbyfloatCommand` emits `incrbyfloat`, not `incrby`. Added a separate `incrbyfloat` row and removed it from the `incrby` row.
   - **`HINCRBYFLOAT`** was listed under `hincrby`. `hincrbyfloatCommand` emits `hincrbyfloat`. Added a separate `hincrbyfloat` row and removed it from the `hincrby` row.
   - **`SMOVE`** had its own `smove` row, but `smoveCommand` does not emit a `smove` event. It emits `srem` on the source set and `sadd` on the destination set. Removed the row and updated the `sadd` / `srem` rows to mention `SMOVE`.
   - **`LMOVE` / `BLMOVE`** had their own `lmove` row, but `lmoveCommand` emits `lpop`/`rpop` on the source and `lpush`/`rpush` on the destination depending on direction — there is no `lmove` event. Removed the row and updated the `lpush`/`rpush`/`lpop`/`rpop` rows to mention `LMOVE`/`BLMOVE`.
   - **`ZMPOP` / `BZMPOP`** had their own `zmpop` row, but `zmpopGenericCommand` emits `zpopmin` or `zpopmax` depending on the MIN/MAX argument — there is no `zmpop` event. Removed the row and updated the `zpopmin`/`zpopmax` rows to mention `ZMPOP`/`BZMPOP`.
   - **`SETEX` / `SETNX`** had their own `setex` and `setnx` rows. Both commands go through `setGenericCommand` which emits a `set` event (and an `expire` event when a TTL is set). The post already listed SETEX and SETNX in the `set` row, so these contradictory standalone rows were removed. Also added `PSETEX` to the `set` row for completeness.

2. **Redis Cluster Python example — wrong attribute access on ClusterNode.** The code used `node['host']` / `node['port']`. `RedisCluster.get_primaries()` returns a list of `ClusterNode` objects, which expose `host` and `port` as attributes, not dict keys. Subscript access raises `TypeError`. Updated to `node.host` / `node.port`.

## Review Notes

- The `notify-keyspace-events` flag table is accurate for current Redis (the `A` alias of `g$lshzxetd` correctly excludes `m` and `n`). Note that `m` (key-miss) was added in Redis 6.0 and `n` (new key) in Redis 7.2 — the post's "Redis 2.8.0 or later" prerequisite is correct for keyspace notifications in general, but readers using the `m` or `n` flags need newer versions.
- `GETSET` is deprecated since Redis 6.2 in favor of `SET ... GET`; it still emits a `set` event but readers should prefer the new form in new code.
- The Python `SessionExpirationHandler._listen` method calls `self.handle_expiration(message)` after `pubsub.get_message()` returns. Because the handler is also registered via `psubscribe(**{...})`, redis-py dispatches the handler automatically inside `get_message()` and returns `None` for handled messages, so the explicit call is effectively dead code (not incorrect — just redundant). Left as-is since it does not produce wrong behavior.
- The Go example's `lockName` variable retains the `lock:` prefix from `strings.SplitN(msg.Channel, ":", 2)` (which splits only on the first `:` after the `__keyspace@0__` prefix). That is what the code actually does and the downstream `log.Printf` lines reflect it; not a defect, just worth noting for readers.
- The post does not mention sharded Pub/Sub (`SSUBSCRIBE` / `__keyspace@<shard>__`) introduced in Redis 7.0, which is the cluster-aware alternative to subscribing on every primary. Out of scope for this fix but a candidate future improvement.
- Expiration-event semantics (active vs. lazy expiration causing variable latency) are described accurately.
