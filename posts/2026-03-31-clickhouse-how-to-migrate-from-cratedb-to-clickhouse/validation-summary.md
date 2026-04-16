# Validation Summary: How to Migrate from CrateDB to ClickHouse

## Status
validated

## Post Type
Tutorial / Migration Guide

## Technologies Covered
- CrateDB (distributed SQL database built on Lucene)
- ClickHouse (columnar analytical database)
- `crash` CLI (CrateDB command-line client)
- `clickhouse-client` CLI
- MergeTree table engine
- SQL (date functions, full-text search, geo queries)
- JSON / JSONEachRow format

## Sources Consulted
- [CrateDB COPY TO reference](https://cratedb.com/docs/crate/reference/en/latest/sql/statements/copy-to.html)
- [CrateDB Crash CLI documentation](https://cratedb.com/docs/crate/crash/en/latest/)
- [CrateDB fulltext search (MATCH predicate)](https://cratedb.com/docs/crate/reference/en/latest/general/dql/fulltext.html)
- [CrateDB geo search (`within`)](https://cratedb.com/docs/crate/reference/en/latest/general/builtins/scalar-functions.html)
- [ClickHouse MergeTree engine docs](https://clickhouse.com/docs/en/engines/table-engines/mergetree-family/mergetree)
- [ClickHouse `toStartOfHour` function](https://clickhouse.com/docs/en/sql-reference/functions/date-time-functions#tostartofhour)
- [ClickHouse `pointInPolygon` function](https://clickhouse.com/docs/en/sql-reference/functions/geo/coordinates#pointinpolygon)
- [ClickHouse JSONEachRow input format](https://clickhouse.com/docs/en/interfaces/formats#jsoneachrow)

## Issues Found
- **CrateDB COPY TO `format='json'` is not a valid value.** The official CrateDB COPY TO documentation lists only `json_object` (default) and `json_array` as valid values for the `format` parameter. Using `format='json'` would fail at parse time. Changed both occurrences (the `crash --command` example and the standalone `COPY TO` statement) to `format='json_object'`, which matches the expected one-JSON-object-per-line layout consumed downstream by ClickHouse's `JSONEachRow` format.

## Review Notes
- The CrateDB DDL example (`TEXT PRIMARY KEY`, `INDEX USING FULLTEXT`, `CLUSTERED INTO n SHARDS`, `WITH (number_of_replicas = '1')`) is valid CrateDB syntax.
- The ClickHouse target DDL uses appropriate type mappings (`String`, `LowCardinality(String)`, `UInt32`, `DateTime`) and a reasonable `MergeTree` layout (monthly partitioning, ordered by `(created_at, user_id, event_id)`).
- CrateDB's `json_object` export writes one JSON object per line, which is directly compatible with ClickHouse's `JSONEachRow` input format. The `gunzip -c … | clickhouse-client` pipe is correct.
- The `match(column, 'term')` full-text predicate and the `within(shape, 'POLYGON(...)')` geo predicate are correct CrateDB syntax.
- `pointInPolygon((x, y), [(x1, y1), (x2, y2), ...])` matches the documented ClickHouse signature.
- Minor stylistic note (no change required): the post omits `LIMIT`/safeguards in example queries and doesn't mention `allow_experimental_*` settings for full-text indexes in recent ClickHouse versions, but those are beyond the scope of a migration walkthrough.
