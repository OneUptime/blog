# Validation Summary: How to Use Redis Pipelining in Ruby

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Redis (pipelining, transactions)
- Ruby
- redis-rb gem (v5+)
- connection_pool gem

## Sources Consulted
- redis-rb gem source code and README (https://github.com/redis/redis-rb)
- redis-rb v5.0 CHANGELOG (removal of deprecated `pipelined`/`multi` signatures, `exists` always returns Integer)
- redis-rb `lib/redis/commands/strings.rb` — `set` method return value and `BoolifySet` coercion logic
- redis-rb `lib/redis/commands/keys.rb` — `exists` and `expire` return types
- redis-rb `lib/redis/commands/hashes.rb` — `hset` hash-flattening behavior
- redis-rb `test/redis/pipelining_commands_test.rb` — confirms pipeline return values
- Redis official documentation on PIPELINING (https://redis.io/docs/latest/develop/use/pipelining/)

## Issues Found

1. **`set` return value in pipeline was listed as `true` instead of `"OK"`**
   - **Line 35**: Comment showed `[true, true, "1", "2"]` as the pipeline result. In redis-rb v5+, `set` (without `nx:`/`xx:` options) returns the raw Redis `"OK"` string, not a boolean. Fixed to `["OK", "OK", "1", "2"]`.
   - **Line 64**: Comment for `pipe.set('x', 10)` said `# index 0: true`. Fixed to `# index 0: "OK"` for the same reason.
   - **Why**: The `BoolifySet` coercion in redis-rb only applies when the `nx` or `xx` options are passed to `set`. A plain `set(key, value)` returns the literal `"OK"` string from Redis.

## Review Notes
- The `exists` check on line 125 (`keys_exist[i] == 1`) is correct for redis-rb v5+, where `exists` always returns an Integer (0 or 1 for a single key). The separate `exists?` method returns a Boolean.
- The `hset` call with a Hash argument (line 47) is valid — redis-rb flattens the hash into field-value pairs.
- The benchmark numbers (~120ms individual vs ~4ms pipelined for 1000 commands) are reasonable order-of-magnitude estimates for local Redis, though actual results vary by environment.
- The connection_pool example uses the correct pattern for redis-rb v5+ with `ConnectionPool`.
- The explanation of pipelining vs transactions is accurate: pipelining is not atomic, `multi`/`exec` provides atomicity.
