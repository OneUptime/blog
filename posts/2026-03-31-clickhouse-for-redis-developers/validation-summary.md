# Validation Summary: ClickHouse for Redis Developers - Key Differences

## Status
validated

## Post Type
Guide / Comparison article

## Technologies Covered
- ClickHouse (columnar OLAP database)
- Redis (in-memory key-value store)
- Redis Streams
- Python `redis` client (redis-py)
- `clickhouse_connect` Python client
- ClickHouse SQL (toDate, INTERVAL, parameterized queries)

## Sources Consulted
- ClickHouse documentation: https://clickhouse.com/docs
- ClickHouse SQL reference (date/time functions, INTERVAL syntax): https://clickhouse.com/docs/en/sql-reference/functions/date-time-functions
- ClickHouse MergeTree settings (fsync_after_insert): https://clickhouse.com/docs/en/operations/settings/merge-tree-settings
- clickhouse-connect Python driver docs: https://clickhouse.com/docs/en/integrations/python
- Redis command reference (INCR, EXPIRE, XREAD): https://redis.io/commands/
- redis-py documentation: https://redis-py.readthedocs.io/

## Issues Found
- **Persistence overstatement**: The original line stated "ClickHouse writes to disk durably on every insert." This is misleading — ClickHouse's `fsync_after_insert` defaults to `0`, so a power loss between an insert and the OS flushing buffers can still lose recent data. Reworded to "ClickHouse persists inserts to disk as MergeTree parts (with `fsync_after_insert` available for stricter durability)" which accurately reflects the architecture and points readers to the relevant tunable.

## Review Notes
- Redis commands `INCR` and `EXPIRE 86400` (24h TTL) are correct.
- ClickHouse SQL syntax (`toDate()`, `count()`, `now() - INTERVAL 30 DAY`, parameterized `{p:String}` placeholder for clickhouse-connect) is current and correct.
- `r.xread({'events': '0'}, count=10000, block=1000)` matches redis-py's API; iterating `for _, msgs in messages for _, m in msgs` correctly destructures the `[[stream_name, [(message_id, fields)]]]` shape, and `m[b'page']` correctly accesses bytes keys (default behavior without `decode_responses=True`).
- The Python examples use `datetime.now()` and a `today()` helper without explicit imports/definitions — these are illustrative snippets, not full runnable scripts, so left as-is to preserve author intent.
- Reading Redis Streams from `'0'` reads from the stream's beginning each call; in production a consumer group or last-seen ID would be used. Out of scope for a comparison guide.
