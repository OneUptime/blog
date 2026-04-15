# Validation Summary: How to Model Stateful Entities with ReplacingMergeTree in ClickHouse

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- ClickHouse (ReplacingMergeTree engine)
- ClickHouse (CollapsingMergeTree engine)
- ClickHouse SQL (DDL, DML, FINAL modifier, OPTIMIZE TABLE, argMax aggregate function)

## Sources Consulted
- ClickHouse ReplacingMergeTree documentation: https://clickhouse.com/docs/en/engines/table-engines/mergetree-family/replacingmergetree
- ClickHouse CollapsingMergeTree documentation: https://clickhouse.com/docs/en/engines/table-engines/mergetree-family/collapsingmergetree
- ClickHouse argMax function documentation: https://clickhouse.com/docs/en/sql-reference/aggregate-functions/reference/argmax
- ClickHouse OPTIMIZE TABLE documentation: https://clickhouse.com/docs/en/sql-reference/statements/optimize
- ClickHouse data types documentation (Bool, LowCardinality, Decimal64): https://clickhouse.com/docs/en/sql-reference/data-types

## Issues Found
1. **Incorrect use of "primary key" instead of "sorting key"**: The post stated that ReplacingMergeTree "deduplicates rows with the same primary key." The ClickHouse documentation explicitly states that deduplication is based on the **sorting key** (`ORDER BY` columns), not the `PRIMARY KEY`. While these default to the same value when `PRIMARY KEY` is not explicitly specified, the distinction matters because `PRIMARY KEY` can be a prefix of `ORDER BY` in ClickHouse. This error appeared in two places:
   - Line 15 (description of how ReplacingMergeTree works): Changed "primary key" to "sorting key (`ORDER BY` columns)".
   - Summary section: Changed "each primary key" to "each sorting key".

## Review Notes
- All SQL syntax (CREATE TABLE, INSERT, SELECT with FINAL, OPTIMIZE TABLE FINAL) is correct and current.
- Data types used (UInt64, String, LowCardinality(String), Bool, DateTime, Decimal64(2), Int8, UInt32) are all valid ClickHouse types.
- The argMax pattern shown is a well-known and correct alternative to using FINAL for deduplication at query time.
- The CollapsingMergeTree section title says "Combining with CollapsingMergeTree" but the example shows it as a separate table/engine, not a combination with ReplacingMergeTree on the same table (which is not possible). The content itself is accurate, but the framing could be clearer in a future revision.
- The note that "After OPTIMIZE TABLE FINAL, FINAL is not needed for correctness" is only true until new duplicate rows are inserted; the post's caveat that FINAL "is still good practice" is appropriate.
