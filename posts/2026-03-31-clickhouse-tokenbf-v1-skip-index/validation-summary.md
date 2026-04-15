# Validation Summary: How to Use tokenbf_v1 Skip Index for Text Search in ClickHouse

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- ClickHouse
- tokenbf_v1 skip index (Bloom filter-based data skipping index)
- MergeTree engine
- SQL (DDL and DML)

## Sources Consulted
- ClickHouse official documentation on Data Skipping Indexes (https://clickhouse.com/docs/en/engines/table-engines/mergetree-family/mergetree#table_engine-mergetree-data_skipping-indexes)
- ClickHouse official documentation on Skip Indexes (https://clickhouse.com/docs/en/optimize/skipping-indexes)
- ClickHouse official documentation on system.parts table (https://clickhouse.com/docs/en/operations/system-tables/parts)
- ClickHouse EXPLAIN statement documentation (https://clickhouse.com/docs/en/sql-reference/statements/explain)
- ClickHouse ALTER TABLE documentation for MATERIALIZE INDEX (https://clickhouse.com/docs/en/sql-reference/statements/alter/skipping-index)
- Bloom filter theory for sizing guidance verification

## Issues Found

1. **`multiSearchAny()` incorrectly listed as supported**: The blog listed `multiSearchAny()` as a function that benefits from `tokenbf_v1`. According to the official ClickHouse documentation's function support matrix, `multiSearchAny` is NOT supported by `tokenbf_v1`. Replaced with `match()`, which is supported.

2. **Token splitting description inaccurate**: The blog described tokenization as "whitespace-separated words or punctuation-delimited terms." The official documentation states tokens are "character sequences separated by non-alphanumeric characters." Updated to reflect the correct delimiter definition.

3. **LIKE pattern comment misleading**: The SQL comment stated tokenbf_v1 benefits "when the pattern starts with a full token." The position of tokens in the pattern is not the determining factor — what matters is that the pattern contains whole tokens bounded by non-alphanumeric characters. Corrected the comment to "when the pattern contains whole tokens."

4. **Seed parameter description unverified**: The blog described the seed parameter as "random seed (0 = use default)." The official documentation does not state that 0 has special "use default" semantics; it is simply a seed value. Changed to "seed for the hash functions."

## Review Notes
- The sizing guidance ("1-2 bytes per expected unique token per granule") is not from official ClickHouse documentation but is reasonable based on Bloom filter theory (10 bits per element yields ~1% false positive rate). It is presented as a rule of thumb, which is appropriate.
- The blog omits several other functions supported by `tokenbf_v1` (e.g., `startsWith`, `endsWith`, `has`, `hasAny`, `hasAll`, `notLike`, `match`). This is acceptable for a tutorial-style post that focuses on the most common use cases.
- The `EXPLAIN indexes=1` syntax (without the `PLAN` keyword) is correct — ClickHouse defaults to PLAN mode when no type keyword is specified. This is the idiomatic form used in official ClickHouse blog posts and documentation.
- All SQL syntax (CREATE TABLE, ALTER TABLE ADD INDEX, MATERIALIZE INDEX, system.parts query) is correct and current.
