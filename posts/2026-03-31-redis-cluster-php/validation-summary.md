# Validation Summary: How to Use Redis Cluster with PHP

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Redis Cluster
- PHP
- phpredis (PHP extension)
- Predis (PHP library)

## Sources Consulted
- phpredis official documentation — `redis_cluster.stub.php` and `cluster.md` from https://github.com/phpredis/phpredis
- phpredis RedisCluster constructor signature: `__construct(string|null $name, ?array $seeds, int|float $timeout = 0, int|float $read_timeout = 0, bool $persistent = false, mixed $auth = null, ?array $context = null)`
- phpredis RedisCluster::scan() signature: `scan(null|int|string &$iterator, string|array $key_or_address, ?string $pattern = null, int $count = 0): bool|array`
- Predis documentation from https://github.com/predis/predis

## Issues Found

### 1. Incorrect constructor parameter comment (line 20)
- **What was wrong:** The comment on the `RedisCluster` constructor said `// read timeout, write timeout, persistent`. The 3rd parameter is `timeout` (connection timeout), the 4th is `read_timeout`, and the 5th is `persistent`. There is no "write timeout" parameter in the RedisCluster constructor.
- **What was changed:** Updated the comment to `// timeout, read timeout, persistent`.
- **Why:** The original comment would mislead developers about what the parameters control. The 3rd parameter sets the connection timeout, not the read timeout.

### 2. Incorrect `scan()` return value handling (lines 102-107)
- **What was wrong:** The code used `[$cursor, $keys] = $redis->scan($cursor, $node, 'user:*', 100);` which treats `scan()` as if it returns a `[$cursor, $keys]` tuple. In phpredis, `scan()` returns `array|false` (the matched keys or false) and modifies the cursor by reference via the first parameter.
- **What was changed:** Changed to `$keys = $redis->scan($cursor, $node, 'user:*', 100);` with a `$keys !== false` guard before iterating, and changed the loop condition from `$cursor != 0` to `$cursor > 0` to match the recommended phpredis pattern.
- **Why:** The original code would fail at runtime because `scan()` does not return a two-element array. The cursor is updated in-place via pass-by-reference. Additionally, `scan()` can return `false` when no keys are found in a given iteration, so the false check prevents errors.

## Review Notes
- The "Pipelining in Cluster Mode" section uses a Predis example and notes that pipelines are split by slot. This is accurate for Predis. Note that phpredis does NOT support pipelining in cluster mode — the section correctly limits its example to Predis, but the introductory text could be clearer that this is a Predis-specific feature.
- The `OPT_SLAVE_FAILOVER` and `FAILOVER_DISTRIBUTE_SLAVES` constants are valid but use legacy "slave" naming. phpredis may introduce updated constant names in future versions, though the current names remain functional.
- All other code examples (Predis connection, basic operations, hash tags, MOVED handling, cluster info) are technically correct.
