# Validation Summary: How to Work with JSON Arrays in ClickHouse

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- ClickHouse
- SQL
- JSON processing functions (`JSONExtract`, `JSONExtractArrayRaw`, `JSONExtractString`, `JSONExtractFloat`, `JSONExtractInt`)
- ClickHouse array functions (`arrayJoin`, `ARRAY JOIN`, `has`, `arraySort`, `arrayDistinct`, `length`)

## Sources Consulted
- ClickHouse official JSON functions reference: https://clickhouse.com/docs/en/sql-reference/functions/json-functions
- ClickHouse array functions reference: https://clickhouse.com/docs/en/sql-reference/functions/array-functions
- ClickHouse ARRAY JOIN clause documentation: https://clickhouse.com/docs/en/sql-reference/statements/select/array-join

## Issues Found
No technical issues found.

All code examples are syntactically correct and use valid, current ClickHouse functions:
- `JSONExtract(json, keys..., 'Array(T)')` is the correct typed-extraction variant for homogeneous scalar arrays.
- `JSONExtractArrayRaw(json, keys...)` correctly returns `Array(String)` of raw JSON elements, which is the recommended approach for arrays of objects.
- `JSONExtractString`, `JSONExtractFloat`, `JSONExtractInt` are all valid field extractors for parsing each raw object element.
- `arrayJoin(expr)` and `ARRAY JOIN expr` are both valid and semantically equivalent for flattening arrays into rows.
- `has(arr, value)`, `arraySort(arr)`, `arrayDistinct(arr)`, and `length(arr)` are all valid ClickHouse array functions used correctly.

## Review Notes
- The post is clear, accurate, and practical. Examples demonstrate the typical extraction → flattening → aggregation workflow well.
- A future improvement could be to mention the newer `JSON` data type (GA since ClickHouse 25.x) as an alternative to string-stored JSON for cases where columns can be redefined — this avoids runtime parsing — but since the post explicitly focuses on JSON arrays stored inside string columns, the current scope is valid.
- `JSONExtractArrayRaw` with arrays of objects returns raw JSON strings; callers must remember that each element is still a JSON string to be further parsed — this is already shown correctly in the orders example.
