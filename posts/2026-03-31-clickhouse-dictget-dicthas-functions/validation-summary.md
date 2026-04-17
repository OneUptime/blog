# Validation Summary: How to Use dictGet() and dictHas() Functions in ClickHouse

## Status
validated

## Post Type
Tutorial / Reference guide

## Technologies Covered
- ClickHouse
- ClickHouse Dictionaries
- SQL (dictGet, dictGetOrDefault, dictGetOrNull, dictHas, dictGetHierarchy, dictIsIn)

## Sources Consulted
- [ClickHouse External Dictionary Functions documentation](https://clickhouse.com/docs/en/sql-reference/functions/ext-dict-functions)

## Issues Found
- **dictGetOrNull version claim**: The post stated `dictGetOrNull` was available in ClickHouse 21.1+. According to the official ClickHouse documentation, `dictGetOrNull` was introduced in ClickHouse 21.4.0. Updated the text from "21.1+" to "21.4+".

## Review Notes
- All function signatures (`dictGet`, `dictGetOrDefault`, `dictGetOrNull`, `dictHas`, `dictGetHierarchy`, `dictIsIn`) match the official ClickHouse reference.
- The tuple-key example for complex key dictionaries is valid syntax.
- The "Multiple Attributes in One Pass" section shows separate `dictGet` calls for each attribute, which is technically valid and efficient (ClickHouse optimizes repeated lookups for the same key). For future improvement, this section could additionally mention the tuple-attribute form `dictGet('dict', ('col1','col2'), key)` which retrieves multiple attributes in a single call and returns a tuple — this would more literally match the "one pass" heading. Not a correctness issue.
- The performance table's claim of "~1 us per lookup" is a reasonable order-of-magnitude estimate for in-memory hashed dictionaries and is consistent with the sub-microsecond claim above it.
