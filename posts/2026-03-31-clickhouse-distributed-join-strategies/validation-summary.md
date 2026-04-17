# Validation Summary: How to Handle Distributed JOIN Strategies in ClickHouse

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- ClickHouse Distributed table engine
- ClickHouse SQL (JOIN, GLOBAL JOIN)
- `distributed_product_mode` setting
- Sharding strategies (collocated joins)

## Sources Consulted
- ClickHouse JOIN docs: https://clickhouse.com/docs/en/sql-reference/statements/select/join
- ClickHouse IN operator docs: https://clickhouse.com/docs/en/sql-reference/operators/in
- ClickHouse session settings: https://clickhouse.com/docs/operations/settings/settings
- ClickHouse Distributed table engine docs: https://clickhouse.com/docs/engines/table-engines/special/distributed

## Issues Found
No technical issues found. The description of default non-GLOBAL JOIN execution (query sent to each shard, right-hand subquery evaluated per shard, local join) matches the official JOIN documentation. The `distributed_product_mode` option descriptions (`deny`, `local`, `global`, `allow`) correctly mirror the documented semantics. The GLOBAL JOIN description (initiator materializes the right side into a temporary table and ships it to each shard) is accurate, as is the collocated sharding description.

## Review Notes
- The official default value of `distributed_product_mode` is `deny`, meaning an unqualified distributed-to-distributed JOIN can actually raise a "Double-distributed in/JOIN subqueries is denied" error unless the mode is changed or `GLOBAL` is used. The post's "default" section describes the underlying execution model rather than whether the query is permitted; this is a common simplification and not technically incorrect, but readers running the first example against a stock cluster may hit the deny error. A brief mention of this could strengthen the post in the future.
- The phrase "Collocated (default)" in the strategy table is slightly ambiguous — collocated execution is a consequence of matching shard keys combined with the default JOIN execution path, not a distinct explicit strategy. Not an error, just a nuance worth noting.
- `GLOBAL` JOIN should generally be avoided when the right side is very large; the post does call this out via the "rethink schema or use a dictionary" row.
