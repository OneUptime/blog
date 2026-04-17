# Validation Summary: Common ClickHouse Schema Design Mistakes and How to Fix Them

## Status
validated

## Post Type
Guide / Best Practices

## Technologies Covered
- ClickHouse (MergeTree engine)
- SQL (ClickHouse dialect)
- Data types: LowCardinality, Decimal, UUID, DateTime, Nullable
- Compression codecs (Delta, LZ4)
- Partitioning strategies

## Sources Consulted
- ClickHouse official docs — MergeTree engine and ORDER BY/primary key guidance: https://clickhouse.com/docs/en/engines/table-engines/mergetree-family/mergetree
- ClickHouse docs — LowCardinality data type: https://clickhouse.com/docs/en/sql-reference/data-types/lowcardinality
- ClickHouse docs — UUID data type (16 bytes): https://clickhouse.com/docs/en/sql-reference/data-types/uuid
- ClickHouse docs — Decimal data type: https://clickhouse.com/docs/en/sql-reference/data-types/decimal
- ClickHouse docs — Nullable data type (separate null mask file): https://clickhouse.com/docs/en/sql-reference/data-types/nullable
- ClickHouse docs — Column compression codecs (Delta, DoubleDelta, LZ4): https://clickhouse.com/docs/en/sql-reference/statements/create/table#codecs
- ClickHouse docs — Custom partitioning key and recommendations: https://clickhouse.com/docs/en/engines/table-engines/mergetree-family/custom-partitioning-key

## Issues Found
No technical issues found.

- Mistake 1 (ORDER BY): Matches ClickHouse's well-known guidance that primary key / sort key columns should be ordered by cardinality (lower first) with timestamp typically later, and only helps pruning for prefix columns.
- Mistake 2 (LowCardinality): Accurate — LowCardinality uses dictionary encoding and is recommended for columns with few distinct values (commonly cited as under ~10k).
- Mistake 3 (Over-partitioning): Monthly partitioning (`toYYYYMM`) is the documented default recommendation; daily is reasonable for very large ingestion volumes.
- Mistake 4 (Decimal vs Float64): Correct — Decimal provides exact fixed-point arithmetic suitable for money.
- Mistake 5 (UUID storage): Correct — UUID type uses 16 bytes; canonical string form is 36 characters (plus string length overhead when stored as String).
- Mistake 6 (Delta + LZ4 on sorted timestamps): Correct and a widely recommended codec combination for monotonic/sorted timestamp columns.
- Mistake 7 (Nullable overhead): Correct — ClickHouse stores an additional null mask per Nullable column, adding I/O and preventing some optimizations.

## Review Notes
- For Mistake 6, `DoubleDelta` can outperform `Delta` for strictly monotonic timestamps with small intervals; both are valid choices and Delta is the more broadly applicable default the post uses.
- For Mistake 1, the improvement depends on query patterns — the general principle (lower-cardinality filter columns first, time last) is sound but readers should still align ORDER BY with their actual WHERE predicates.
- The "5 possible values" comment for status in Mistake 2 is illustrative; LowCardinality is typically beneficial up to roughly 10,000 distinct values.
