# How to Configure Redis aof-use-rdb-preamble for Hybrid Persistence

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Redis, Persistence, AOF, RDB

Description: Enable aof-use-rdb-preamble to combine the fast startup of RDB with the durability of AOF in a single hybrid persistence file.

---

Redis 4.0 introduced a hybrid persistence mode that combines RDB and AOF into a single file. When enabled, AOF rewrites produce a file with an RDB snapshot as the preamble followed by AOF commands representing changes since the snapshot. This gives you fast startup times (from RDB) and strong durability (from AOF).

## Enabling Hybrid Persistence

The directive `aof-use-rdb-preamble` defaults to `yes` in Redis 5.0 and later:

```text
# redis.conf
appendonly yes
aof-use-rdb-preamble yes
```

If you are on an older installation, explicitly enable it:

```bash
redis-cli CONFIG SET aof-use-rdb-preamble yes
redis-cli CONFIG GET aof-use-rdb-preamble
```

## How It Works

When `BGREWRITEAOF` runs (manually or automatically), Redis:

1. Forks a child process
2. Child writes a full RDB snapshot to the beginning of the new AOF file
3. Parent buffers incoming write commands in the AOF rewrite buffer
4. After the RDB section is written, the buffer (AOF commands) is appended
5. The new hybrid file atomically replaces the old AOF file

The resulting file looks like:

```text
REDIS0009...  (RDB binary preamble)
*3\r\n$3\r\nSET\r\n$5\r\nmykey\r\n$5\r\nvalue\r\n  (AOF commands)
```

On restart, Redis detects the RDB preamble and uses it for fast bulk loading, then replays only the AOF commands that follow.

## Benefits Over Pure AOF

Startup time comparison for a 10 GB dataset:

| Mode | Startup Time |
| --- | --- |
| Pure AOF | ~120 seconds |
| RDB only | ~8 seconds |
| Hybrid (AOF + RDB preamble) | ~9 seconds |

Pure AOF must replay every command in the file to reconstruct the dataset, which is slower than loading binary data. Hybrid loads the bulk of the data via the fast RDB format and only replays AOF commands appended since the last rewrite, dramatically reducing restart time.

## Verifying the Hybrid File

Check that rewrites produce the hybrid format:

```bash
# Trigger a rewrite
redis-cli BGREWRITEAOF

# Wait for completion
redis-cli INFO persistence | grep aof_rewrite_in_progress

# Inspect the first bytes of the AOF file
head -c 9 /var/lib/redis/appendonly.aof
# Should output: REDIS0009
```

## Disabling Hybrid Persistence

If you need a pure AOF file for compatibility or analysis:

```bash
redis-cli CONFIG SET aof-use-rdb-preamble no

# The next BGREWRITEAOF will produce a pure AOF file
redis-cli BGREWRITEAOF
```

## Compatibility Considerations

Hybrid AOF files cannot be parsed by older Redis versions (before 4.0). If you need to restore data on an older instance, disable `aof-use-rdb-preamble` before the rewrite or convert the file:

```bash
# On a running Redis, generate a pure AOF
redis-cli CONFIG SET aof-use-rdb-preamble no
redis-cli BGREWRITEAOF

# Copy the resulting pure AOF file to the old instance
```

Also ensure `redis-check-aof` can validate hybrid files:

```bash
redis-check-aof /var/lib/redis/appendonly.aof
```

## Summary

`aof-use-rdb-preamble yes` enables Redis hybrid persistence, where AOF rewrite files start with a compact RDB snapshot followed by incremental AOF commands. This eliminates the slow startup penalty of pure AOF while retaining per-second durability. It is enabled by default in Redis 5.0+ and is the recommended mode for most production deployments that use AOF.
