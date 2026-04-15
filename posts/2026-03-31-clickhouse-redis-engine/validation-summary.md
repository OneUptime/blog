# Validation Summary: How to Use Redis Table Engine in ClickHouse

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- ClickHouse (Redis table engine)
- Redis (key-value store)
- SQL (ClickHouse dialect)
- Named Collections (ClickHouse configuration)

## Sources Consulted
- ClickHouse official documentation for the Redis table engine: https://clickhouse.com/docs/en/engines/table-engines/integrations/redis
- ClickHouse source code (StorageRedis.cpp) for implementation details on MSET/MGET usage and storage format
- ClickHouse named collections documentation: https://clickhouse.com/docs/en/operations/named-collections

## Issues Found

1. **PRIMARY KEY syntax missing parentheses (all CREATE TABLE examples)**: The post used `PRIMARY KEY user_id` throughout. The correct ClickHouse Redis engine syntax requires parentheses: `PRIMARY KEY(user_id)`. Fixed in all six CREATE TABLE statements.

2. **Fabricated "Simple mode" and "Hash mode" storage concepts**: The post claimed the Redis engine supports two storage modes — "Simple mode" (key→string) and "Hash mode" (key→Redis hash with multiple fields). This is entirely incorrect. The Redis engine stores all non-primary-key columns as a single binary-serialized blob in a Redis string value using MSET/MGET. There are no Redis hashes involved. Rewrote the storage explanation and removed all "Redis hash" references throughout the post.

3. **Incorrect DELETE syntax**: The post used `DELETE FROM redis_sessions WHERE expires_at < now();` which is standard SQL delete syntax. The ClickHouse Redis engine requires `ALTER TABLE ... DELETE WHERE` syntax. Additionally, the original example deleted by a non-key column (expires_at), but the documented behavior only shows deletion by primary key. Fixed to use `ALTER TABLE redis_sessions DELETE WHERE session_id = 'abc123';`.

4. **Incorrect Redis ACL permissions in Prerequisites**: The post stated Redis users need `GET` and `HGETALL` permissions. Since the engine uses MGET/MSET (not HGETALL), corrected to `MGET`, `MSET`, `SCAN`, and `DEL`.

5. **Undocumented Redis Cluster support section removed**: The post claimed "ClickHouse follows redirects automatically" for Redis Cluster. This feature is not mentioned in the official documentation and no cluster redirect handling (MOVED/ASK) exists in the source code. Removed the entire section.

6. **Primary key type changed from UInt64 to String**: The official documentation examples use String for the primary key column. Changed `user_id UInt64` to `user_id String` in the main example and updated all related queries to use string literals (e.g., `'1001'` instead of `1001`). Updated the JOIN example to use `toString()` for type compatibility.

7. **Named collections XML root element updated**: Changed `<yandex>` (legacy) to `<clickhouse>` (current). Added missing `pool_size` parameter to match the documented configuration options.

8. **INSERT description corrected**: Changed "writes to Redis as hash keys" to "writes to Redis via MSET" to accurately describe the underlying mechanism.

## Review Notes
- The Rate-Limit Counter Lookup example uses `WHERE key LIKE 'ratelimit:user:1001:%'` which will trigger a full SCAN since LIKE is not an equality/IN check on the primary key. This is technically functional but could be misleading since the section doesn't explicitly note this will be a full scan. Left as-is since it's a valid query pattern.
- The Session Store query filters by `user_id` (not the primary key `session_id`), which will also trigger a full scan. This is a realistic query but readers should be aware it won't benefit from key-based lookup optimization.
- The `pool_size` engine parameter (4th positional arg, default 16) is not mentioned in the positional syntax examples. This is a minor omission but not an error since the default is reasonable.
- Scanning may produce duplicate keys during rehashing, per the official docs. This edge case is not mentioned in the post but is a rare scenario.
