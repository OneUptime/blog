# Validation Summary: How to Design ClickHouse Tables for Performance

## Status
validated

## Post Type
Technical guide

## Technologies Covered
- ClickHouse
- MergeTree table engine
- ClickHouse table partitioning
- ClickHouse data types
- ClickHouse compression codecs
- ClickHouse TTL
- ClickHouse data skipping indexes

## Sources Consulted
- ClickHouse docs: Creating tables and sparse primary indexes - https://clickhouse.com/docs/guides/creating-tables
- ClickHouse docs: Choose a low cardinality partitioning key - https://clickhouse.com/docs/optimize/partitioning-key
- ClickHouse docs: LowCardinality data type - https://clickhouse.com/docs/sql-reference/data-types/lowcardinality
- ClickHouse docs: CREATE TABLE, TTL expressions, and column compression codecs - https://clickhouse.com/docs/sql-reference/statements/create/table
- ClickHouse docs: Manage data with TTL - https://clickhouse.com/docs/guides/developer/ttl
- ClickHouse docs: Schema design and date/time type sizing - https://clickhouse.com/docs/data-modeling/schema-design
- ClickHouse docs: Data skipping index examples - https://clickhouse.com/docs/optimize/skipping-indexes/examples
- ClickHouse docs: Manipulating data skipping indexes - https://clickhouse.com/docs/sql-reference/statements/alter/skipping-index
- ClickHouse docs: Observability schema design and text-search index guidance - https://clickhouse.com/docs/use-cases/observability/schema-design

## Issues Found
- The post described granules as exactly 8,192 rows by default. ClickHouse uses sparse index granularity of up to 8,192 rows or 10 MB by default, so the wording was updated.
- The post said the sparse index records the minimum ORDER BY key in each granule. ClickHouse marks the first row of each granule with the primary key value; because data is sorted this is often effectively the lower bound, but the wording was corrected.
- The post recommended composite tenant/time partitioning without a cardinality caveat. ClickHouse recommends low-cardinality partition keys, so the tenant guidance was narrowed to small, bounded tenant counts.
- The post said missing a time component means TTL cannot be used. TTL can be based on Date/DateTime expressions without the partition key matching, but aligned partitions make retention deletes more efficient. The table was corrected.
- The post listed Date as 3 bytes. ClickHouse Date is 16-bit, so this was corrected to 2 bytes.
- The post described LZ4 as the universal default compression. ClickHouse uses LZ4 by default in self-managed deployments and ZSTD in ClickHouse Cloud, so the wording was corrected.
- The log search example used `tokenbf_v1` for text search. Current ClickHouse guidance recommends `text` indexes for full-text search, with token/ngram bloom filters treated as legacy/deprecated for full-text use in newer versions. The example was updated to a `text(tokenizer = splitByNonAlpha)` index.
- The skip-index examples added indexes to existing tables without materializing them. `ADD INDEX` changes metadata; existing parts need `MATERIALIZE INDEX`. Materialization commands were added.
- The skip-index table described `tokenbf_v1` as substring matching and `ngrambf_v1` as fuzzy matching. This was corrected: `text` is recommended for full-text search, `tokenbf_v1` is legacy word/token matching, and `ngrambf_v1` is legacy substring matching.
- Two query comments overstated ORDER BY prefix usage. They were corrected to describe the actual prefix used by the predicates.

## Review Notes
The SQL examples are broadly valid for current ClickHouse syntax. The `TO VOLUME 'cold'` TTL example assumes that a storage policy with a `cold` volume exists in the ClickHouse server configuration.
