# Validation Summary: ClickHouse for Cassandra Developers - Key Differences

## Status
validated

## Post Type
Guide / Comparison

## Technologies Covered
- ClickHouse (MergeTree engine, skip indexes, TTL, aggregation functions, `generateRandom` table function)
- Apache Cassandra (CQL, partition keys, clustering columns, tunable consistency, secondary indexes, SSTables)
- SQL / CQL

## Sources Consulted
- ClickHouse official documentation — MergeTree engine and table creation: https://clickhouse.com/docs/en/engines/table-engines/mergetree-family/mergetree
- ClickHouse data types — LowCardinality: https://clickhouse.com/docs/en/sql-reference/data-types/lowcardinality
- ClickHouse `generateRandom` table function: https://clickhouse.com/docs/en/sql-reference/table-functions/generate
- ClickHouse skip indexes / data skipping indexes: https://clickhouse.com/docs/en/engines/table-engines/mergetree-family/mergetree#table_engine-mergetree-data_skipping-indexes
- ClickHouse TTL for columns and tables: https://clickhouse.com/docs/en/engines/table-engines/mergetree-family/mergetree#table_engine-mergetree-ttl
- ClickHouse aggregate functions (`uniq`, `count`, `toDate`): https://clickhouse.com/docs/en/sql-reference/aggregate-functions/reference/uniq
- ClickHouse replication and `insert_quorum` setting: https://clickhouse.com/docs/en/engines/table-engines/mergetree-family/replication
- Apache Cassandra CQL CREATE TABLE reference: https://cassandra.apache.org/doc/latest/cassandra/cql/ddl.html
- Cassandra tunable consistency levels: https://cassandra.apache.org/doc/latest/cassandra/architecture/dynamo.html#tunable-consistency
- DataStax guidance on Cassandra secondary indexes: https://docs.datastax.com/en/cql-oss/3.x/cql/cql_using/useWhenIndex.html

## Issues Found
No technical issues found.

- Cassandra `CREATE TABLE` syntax with `PRIMARY KEY (partition_key, clustering_col)` and `WITH CLUSTERING ORDER BY (... DESC)` is valid CQL.
- ClickHouse `CREATE TABLE ... ENGINE = MergeTree() ORDER BY (...)` with `LowCardinality(String)` is valid.
- `generateRandom(structure, random_seed, max_string_length, max_array_length)` parameters and ordering are correct.
- Aggregation query uses valid ClickHouse functions (`toDate`, `count()`, `uniq`) and `INTERVAL` syntax.
- Skip index DDL `ALTER TABLE ... ADD INDEX name col TYPE bloom_filter GRANULARITY 4` matches the documented data-skipping-index syntax.
- TTL clause `TTL event_time + INTERVAL 90 DAY DELETE` matches the documented TTL expression syntax.
- Consistency claims about Cassandra tunable consistency and ClickHouse asynchronous replication are accurate.
- Claim that Cassandra secondary indexes are discouraged for high-cardinality fields is consistent with DataStax guidance.

## Review Notes
- The description of the ClickHouse write path as going through "in-memory buffers" before being flushed to data parts is a pedagogical simplification. By default, each INSERT into a MergeTree table creates a new immutable data part on disk directly (data is only briefly in memory during sort/compression); there is no durable commit log + memtable pattern as in Cassandra. The text is acceptable as a high-level analogy but readers looking for precise mechanics should consult the MergeTree docs.
- After adding a skip index, `ALTER TABLE ... MATERIALIZE INDEX idx_event_type` is the more targeted way to apply it to existing data. `OPTIMIZE TABLE events FINAL` used in the post also rebuilds indexes via full merge but is heavier; both are technically valid.
- For "strong consistency" on ClickHouse writes, the relevant mechanism is the `insert_quorum` (and related `select_sequential_consistency`) settings rather than true synchronous replication — worth clarifying in a future revision, but not incorrect as stated.
- `uniq()` in ClickHouse is an approximate (HyperLogLog-based) distinct count. If exactness is required, `uniqExact()` should be used. The current query is fine for analytics dashboards.
