# Validation Summary: How to Create Multi-Valued Indexes on JSON Arrays in MySQL

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- MySQL 8.0 (8.0.17+)
- JSON data type and JSON array functions
- Multi-valued indexes (CAST ... AS ... ARRAY)
- MEMBER OF(), JSON_CONTAINS(), JSON_OVERLAPS() operators

## Sources Consulted
- MySQL 8.0 Reference Manual: CREATE INDEX Statement — https://dev.mysql.com/doc/refman/8.0/en/create-index.html
- MySQL 8.0 Reference Manual: JSON Search Functions — https://dev.mysql.com/doc/refman/8.0/en/json-search-functions.html
- MySQL 8.0.17 Release Notes — https://dev.mysql.com/doc/relnotes/mysql/8.0/en/news-8-0-17.html
- MySQL Worklog WL#8955 and WL#10604 (multi-valued index implementation details)

## Issues Found

1. **EXPLAIN output type claim (line 78)**: The post stated all three operators (MEMBER OF, JSON_CONTAINS, JSON_OVERLAPS) show `type: ref` in EXPLAIN output. This is incorrect — only MEMBER OF() shows `type: ref`. JSON_CONTAINS() and JSON_OVERLAPS() show `type: range` because they perform range scanning over the index. Fixed to correctly distinguish the access types.

2. **Composite unique index limitation (line 99)**: The post claimed multi-valued indexes "cannot be part of a composite unique index." This is incorrect — multi-valued indexes CAN be defined as UNIQUE and CAN be part of composite indexes. The actual restriction is that only one multi-valued key part is allowed per index. Fixed the limitation list to reflect the correct restriction.

3. **Nested path explanation (lines 104-109)**: The post implied that nested JSON paths inherently cannot use multi-valued indexes. This is misleading — nested paths work fine if the index is defined on the same path expression (e.g., `CAST(tags->'$.category' AS CHAR(50) ARRAY)`). The real issue is that the query path must match the indexed path. Fixed to clarify this with a corrected explanation and an example of how to index a nested path.

## Review Notes
- The supported types list is correct but incomplete — it omits SIGNED, DATETIME, TIME, and BINARY, which are also valid for multi-valued indexes. This is not an error (the post doesn't claim the list is exhaustive), but could be expanded in a future update.
- All SQL syntax examples are correct and use proper double-parentheses notation for functional index expressions.
- The version attribution (MySQL 8.0.17) is accurate.
