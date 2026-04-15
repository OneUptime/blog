# Validation Summary: How to Track Pharmaceutical Supply Chain Metrics in ClickHouse

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- ClickHouse (SQL dialect, MergeTree engine, aggregate functions)
- Pharmaceutical serialization concepts (DSCSA, FMD, GTIN-14)

## Sources Consulted
- ClickHouse documentation: CREATE TABLE, MergeTree engine — https://clickhouse.com/docs/en/engines/table-engines/mergetree-family/mergetree
- ClickHouse documentation: FixedString type — https://clickhouse.com/docs/en/sql-reference/data-types/fixedstring
- ClickHouse documentation: LowCardinality — https://clickhouse.com/docs/en/sql-reference/data-types/lowcardinality
- ClickHouse documentation: argMax aggregate function — https://clickhouse.com/docs/en/sql-reference/aggregate-functions/reference/argmax
- ClickHouse documentation: countIf aggregate function — https://clickhouse.com/docs/en/sql-reference/aggregate-functions/combinators#-if
- ClickHouse documentation: Date arithmetic and today() function — https://clickhouse.com/docs/en/sql-reference/functions/date-time-functions
- GS1 GTIN-14 standard (14-digit identifier for trade items)

## Issues Found
- **Recall Impact Analysis — incorrect `recoverable_units` formula**: The original formula `countIf(event_type IN ('ship', 'receive', 'commission')) - countIf(event_type IN ('dispense', 'destroy'))` included ship and receive events alongside commission events. In a serialization system, a single unit generates multiple ship/receive events as it moves through intermediaries (manufacturer → distributor → pharmacy), which inflates the count. For example, one unit that is commissioned, shipped twice, and received twice would contribute 5 to the numerator instead of 1. Fixed to `countIf(event_type = 'commission') - countIf(event_type IN ('dispense', 'destroy'))`, which correctly counts units entering the supply chain minus units leaving it — consistent with the "Units in Distribution" query earlier in the post.

## Review Notes
- The `FixedString(14)` type for GTIN is appropriate since GTIN-14 is always exactly 14 digits (zero-padded). However, inserting shorter strings would cause null-byte padding, which could surprise users unfamiliar with ClickHouse's FixedString behavior.
- The "Units in Distribution" query is a simplification — it does not account for `return` events, which could add units back into the supply chain. This is acceptable for a blog post but worth noting for production use.
- All ClickHouse SQL syntax is correct and uses current, non-deprecated functions and types.
