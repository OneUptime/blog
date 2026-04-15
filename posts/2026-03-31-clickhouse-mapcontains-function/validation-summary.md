# Validation Summary: How to Use mapContains() Function in ClickHouse

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- ClickHouse (SQL database)
- ClickHouse Map data type and Map functions (`mapContains`, `map()`)
- ClickHouse MergeTree engine

## Sources Consulted
- ClickHouse official documentation — Tuple Map Functions: https://clickhouse.com/docs/en/sql-reference/functions/tuple-map-functions
- ClickHouse official documentation — Map data type: https://clickhouse.com/docs/en/sql-reference/data-types/map

## Issues Found
No technical issues found.

## Review Notes
- `mapContains` is currently listed as an alias for `mapContainsKey` in the official ClickHouse documentation. Both names are fully supported and produce identical results. The blog post uses `mapContains` consistently, which is valid and widely recognized. No change is required, but authors should be aware that `mapContainsKey` is now the canonical name in the docs.
- All SQL examples were verified for syntactic correctness and semantic accuracy against the sample data provided.
- The coverage report query using `avg(mapContains(...))` is a clever and correct pattern since mapContains returns UInt8 (0 or 1), making the average equal to the proportion of rows containing the key.
- The distinction made between `mapContains()` and bracket access (`map['key']`) for detecting key presence is accurate and practically important.
