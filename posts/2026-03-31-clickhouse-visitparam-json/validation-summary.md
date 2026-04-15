# Validation Summary: How to Use visitParam* Functions for JSON Parsing in ClickHouse

## Status
validated

## Post Type
Tutorial / Reference

## Technologies Covered
- ClickHouse (SQL database)
- SQL
- JSON parsing with visitParam* / simpleJSON* functions
- MergeTree table engine

## Sources Consulted
- ClickHouse official documentation: JSON functions reference (https://clickhouse.com/docs/sql-reference/functions/json-functions)
- ClickHouse source code: `src/Functions/FunctionsVisitParam.h` and individual `visitParam*.cpp` files (https://github.com/ClickHouse/ClickHouse/blob/master/src/Functions/FunctionsVisitParam.h)
- GitHub Issue #21383 documenting the visitParam to simpleJSON renaming (https://github.com/ClickHouse/ClickHouse/issues/21383)

## Issues Found
1. **Inaccurate claim about "flat JSON only"**: The post stated "All limitations of `simpleJSON*` apply: flat JSON only, single field lookup, no nested path support." According to the official ClickHouse documentation, these functions search for the field name at any nesting level and return the first occurrence. They do not require flat JSON. The correct limitation is that they lack path-based navigation (e.g., `a.b.c`), not that they only work on flat JSON. Fixed to: "no nested path navigation, single field lookup by first occurrence at any depth."

## Review Notes
- All 7 visitParam/simpleJSON alias pairs are correctly listed and verified against ClickHouse source code.
- The `simpleJSON*` names were introduced in ClickHouse version 21.4; the `visitParam*` names are the original legacy names from the Yandex Metrica era.
- All SQL examples are syntactically correct and produce the expected output.
- The expected output for the filtering example (2 conversions, avg duration 10.4) is mathematically correct: avg(12.7, 8.1) = 10.4.
- Return types described in the mermaid diagram (Float64, UInt8 boolean, etc.) are accurate per the source code.
- The recommendation to prefer `simpleJSON*` naming for new code is sound advice.
