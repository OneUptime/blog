# Validation Summary: How to Use system.zookeeper_log in ClickHouse

## Status
validated

## Post Type
Tutorial / Reference guide

## Technologies Covered
- ClickHouse `system.zookeeper_log` system table
- Apache ZooKeeper / ClickHouse Keeper coordination
- ClickHouse SQL (window functions, `multiIf`, aggregations)
- ClickHouse server XML configuration (`config.xml`)

## Sources Consulted
- [ClickHouse docs: system.zookeeper_log](https://clickhouse.com/docs/en/operations/system-tables/zookeeper_log)
- [ClickHouse source: src/Interpreters/ZooKeeperLog.cpp](https://github.com/ClickHouse/ClickHouse/blob/master/src/Interpreters/ZooKeeperLog.cpp) — `getColumnsDescription()` for authoritative column names/types
- [ClickHouse docs: server configuration parameters (system log tables)](https://clickhouse.com/docs/en/operations/server-configuration-parameters/settings) — XML structure for `<zookeeper_log>`
- [ZooKeeper error code constants](https://zookeeper.apache.org/doc/current/apidocs/zookeeper-server/org/apache/zookeeper/KeeperException.Code.html) — to verify the error name/code mapping

## Issues Found

1. **`event_time` column type was wrong.** The post listed it as `DateTime`. The actual type in `ZooKeeperLog.cpp` is `DateTime64(6)` (microsecond precision). Updated the table.

2. **`op_num` column type was wrong.** The post listed it as `Int32`. The column is actually an `Enum` whose values are the symbolic ZooKeeper operation names (Get, Create, Set, Remove, etc.). Updated type and description.

3. **`error` column type was wrong.** The post listed it as `Nullable(Int32)`. The column is actually `Nullable(Enum)` returning the symbolic error name (e.g., `ZNONODE`, `ZNODEEXISTS`). Updated type.

4. **`stat` column was misrepresented.** The post listed a single `stat` row with type "various". In reality the stat fields are exposed as separate columns: `stat_czxid`, `stat_mzxid`, `stat_pzxid` (Int64) and `stat_version`, `stat_cversion`, `stat_dataLength`, `stat_numChildren` (Int32). Replaced the single misleading row with two accurate rows.

5. **`type` Enum description was incomplete.** The post said "Request or Response". The Enum actually has three values: `Request`, `Response`, and `Finalize` (used when a connection is lost before a response is received). Updated the description.

6. **Error codes table was misleading given the Enum column.** Because `error` is an Enum, `SELECT error` returns the symbolic name (e.g., `ZNONODE`), not the numeric code. The table previously implied numeric values would be returned. Reworked the table to show both the Enum name and the underlying numeric code, and added a clarifying lead-in sentence. Also added two commonly-seen entries (`ZSESSIONEXPIRED`, `ZOPERATIONTIMEOUT`) that are useful when diagnosing replication issues. The original numeric codes (0, -4, -101, -110, -111) were correct and were preserved.

## Review Notes

- The XML `<zookeeper_log>` snippet is valid. `<database>`, `<table>`, `<flush_interval_milliseconds>`, and `<ttl>` are all supported sub-elements. Other useful sub-elements (not added because the post is intentionally minimal) include `<partition_by>`, `<order_by>`, `<engine>`, `<storage_policy>`, `<max_size_rows>`, `<reserved_size_rows>`, `<buffer_size_rows_flush_threshold>`, and `<flush_on_crash>`.
- The Mermaid sequence diagram correctly reflects the request/response logging behavior (one row at request emit, one row at response receive, with `xid` as the correlation key).
- All SQL queries are syntactically valid ClickHouse SQL. The `multiIf` + window-function `sum(count()) OVER ()` pattern in the latency-distribution query works correctly.
- `xid` type: the docs page lists `Int32` while the source code uses `Int64`. The post follows the docs (`Int32`), which is acceptable; left unchanged.
- The post does not mention that `system.zookeeper_log` is **disabled by default** and only writes rows once the `<zookeeper_log>` section is added to `config.xml`. The "Enabling" section implicitly conveys this but a one-line callout would help future readers — flagged for the author rather than inserted, since the task scope is limited to fixing technical errors.
