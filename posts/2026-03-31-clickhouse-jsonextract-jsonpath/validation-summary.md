# Validation Summary: How to Use JSONExtract with JSONPath Syntax in ClickHouse

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- ClickHouse
- ClickHouse JSON functions (`JSONExtractString`, `JSONExtractInt`, `JSONExtractFloat`, `JSONExtractRaw`, `JSONExtractArrayRaw`, `JSONLength`)
- ClickHouse `ARRAY JOIN` and `arrayEnumerate`
- SQL

## Sources Consulted
- ClickHouse JSON Functions reference: https://clickhouse.com/docs/en/sql-reference/functions/json-functions
- ClickHouse `ARRAY JOIN` clause docs: https://clickhouse.com/docs/en/sql-reference/statements/select/array-join
- ClickHouse `arrayEnumerate` docs: https://clickhouse.com/docs/en/sql-reference/functions/array-functions#arrayenumeratearr

## Issues Found
- The introduction stated that "Array indices are zero-based integers" and the first section said "select an element by its zero-based position." Both claims contradicted the rest of the post (which correctly noted 1-based indexing) and contradicted the official ClickHouse docs: positive integers index from 1 (the first element), and negative integers count from the end. Updated both sentences to use "1-based" and added a note that negative integers count from the end. The code examples themselves were already correct (using `1` to fetch the first element matched the shown output `alpha`).

## Review Notes
- The contradictory output table for the first example (`alpha` returned for index `1`) confirms the 1-based convention; only the prose needed correction.
- All other code samples — nested key/index navigation, `JSONExtractFloat`/`JSONExtractInt`/`JSONExtractRaw` with path arguments, the `JSONLength` guard, and the `arrayEnumerate` + parallel `ARRAY JOIN` pattern — match the documented behavior of ClickHouse and are syntactically valid.
- Negative-integer indexing is mentioned only briefly in the intro update; an example could be added in the future for completeness, but it's not required for accuracy.
