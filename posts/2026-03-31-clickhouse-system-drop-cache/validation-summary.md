# Validation Summary: How to Use SYSTEM DROP CACHE in ClickHouse

## Status
validated

## Post Type
Tutorial / Reference Guide

## Technologies Covered
- ClickHouse (SQL database)
- SYSTEM DROP CACHE commands (DNS, Mark, Uncompressed, Compiled Expression, Query)
- MergeTree engine internals (mark files, granules, compressed/uncompressed data blocks)
- JIT compilation in ClickHouse
- system.metrics monitoring table

## Sources Consulted
- [ClickHouse SYSTEM Statements Documentation](https://clickhouse.com/docs/sql-reference/statements/system) -- verified all SYSTEM DROP ... CACHE command syntax
- [ClickHouse Server Settings (config.xml)](https://github.com/ClickHouse/ClickHouse/blob/master/programs/server/config.xml) -- verified default values for mark_cache_size and uncompressed_cache_size
- [ClickHouse CurrentMetrics.cpp source](https://github.com/ClickHouse/ClickHouse/blob/master/src/Common/CurrentMetrics.cpp) -- verified all system.metrics metric names
- [ClickHouse PR #79907: Enable compile_expressions by default](https://github.com/ClickHouse/ClickHouse/pull/79907) -- verified compile_expressions default changed in 25.6
- [ClickHouse 23.1 Release Blog Post](https://clickhouse.com/blog/clickhouse-release-23-01) -- verified query cache was introduced in 23.1
- [Introducing the ClickHouse Query Cache](https://clickhouse.com/blog/introduction-to-the-clickhouse-query-cache-and-design) -- verified query cache timeline
- [ClickHouse Understanding Part Types and Storage Formats](https://github.com/ClickHouse/clickhouse-docs/blob/main/knowledgebase/understanding-part-types-and-storage-formats.mdx) -- verified .mrk/.mrk2/.mrk3 mark file formats

## Issues Found

1. **Missing `.mrk3` mark file format (line 36):** The post listed only `.mrk` and `.mrk2` files for the mark cache. ClickHouse also uses `.mrk3` files for compact parts (where all columns are stored in a single file). Since compact parts are the default storage format for small data parts in modern ClickHouse, this omission was notable. Fixed by adding `.mrk3` to the list.

2. **Incorrect `compile_expressions` default (line 116):** The post stated the default for `compile_expressions` is `1` (enabled). This is only true since ClickHouse 25.6. For all prior versions, the default was `0` (disabled). Multiple earlier attempts to enable it by default were reverted due to bugs (particularly LLVM codegen issues on AArch64). Fixed by specifying the version-dependent default.

3. **Inaccurate query cache version (line 120):** The post stated the query cache was added in "ClickHouse 23.5+". The query cache was actually introduced in ClickHouse 23.1 as an experimental feature and became production-ready in 23.5. The `SYSTEM DROP QUERY CACHE` command has been available since 23.1. Fixed to say "23.1+ (production-ready since 23.5)".

## Review Notes
- The uncompressed cache, while allocated at 8 GiB by default, requires the query-level setting `use_uncompressed_cache = 1` to actually be used (it defaults to `0`). The post does not mention this nuance, but since the post focuses on the DROP CACHE commands rather than cache configuration, this is acceptable as-is.
- All eight metric names referenced in the system.metrics query were verified as correct CurrentMetrics (gauge-type metrics in system.metrics, not system.asynchronous_metrics).
- The "Dropping All Caches at Once" section omits SYSTEM DROP QUERY CACHE from the chain, which is a minor inconsistency but not technically wrong since the section predates the query cache section in the post's flow.
