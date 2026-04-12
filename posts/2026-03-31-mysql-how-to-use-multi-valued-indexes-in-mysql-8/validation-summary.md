# Validation Summary: How to Use Multi-Valued Indexes in MySQL 8

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- MySQL 8.0.17+
- JSON columns and JSON array functions
- Multi-valued indexes (MVIs)
- SQL query optimization with EXPLAIN

## Sources Consulted
- MySQL 8.0 Reference Manual — CREATE INDEX: https://dev.mysql.com/doc/refman/8.0/en/create-index.html
- MySQL 8.0 Reference Manual — JSON Search Functions: https://dev.mysql.com/doc/refman/8.0/en/json-search-functions.html
- MySQL 8.0 Reference Manual — CAST Functions: https://dev.mysql.com/doc/refman/8.0/en/cast-functions.html

## Issues Found

### 1. Incorrect CAST type for string array column
- **What was wrong:** The first example under "Creating a Multi-Valued Index" used `CAST(tags -> '$' AS UNSIGNED ARRAY)` on the `tags` column, which contains string values (e.g., `["electronics", "portable", "wireless"]`). Casting JSON string elements to UNSIGNED would produce an error or incorrect results. The correct type for a string array is `CHAR(N) ARRAY`.
- **What was changed:** Changed `UNSIGNED ARRAY` to `CHAR(50) ARRAY` on the first index creation example. Removed the then-redundant "For string arrays:" block that followed, which showed the identical CHAR(50) ARRAY syntax.
- **Why:** The CAST type must match the actual data types stored in the JSON array. Using UNSIGNED on string values is a type mismatch.

### 2. Misleading limitation about multi-valued index count
- **What was wrong:** The limitations section stated "Only one multi-valued index per JSON expression (though you can have multiple on different paths)." This is misleading — the actual MySQL limitation is that a composite index can include at most one multi-valued key part. You can create multiple separate multi-valued indexes on the same table, even on the same JSON path.
- **What was changed:** Reworded to: "A composite index can include at most one multi-valued key part (though you can create multiple separate multi-valued indexes on the same table)."
- **Why:** The original phrasing could be misread as meaning you cannot have more than one MVI on a table, which is incorrect.

## Review Notes
- The supported types list (SIGNED, UNSIGNED, CHAR(n), DATE, TIME, DATETIME, DECIMAL) is correct but incomplete. MySQL also supports FLOAT, DOUBLE, REAL, and NCHAR for ARRAY casts. BINARY, JSON, and YEAR are explicitly unsupported. This is a minor omission, not an error.
- The limitations section covers only a few of the many documented restrictions. Notable omissions include: InnoDB-only support, cannot be a primary key, cannot be a covering index, character set restricted to binary or utf8mb4 (with utf8mb4_0900_as_cs collation), and online DDL uses ALGORITHM=COPY. These are not errors in the post but could be useful additions for a more comprehensive guide.
- All SQL syntax, function usage (JSON_CONTAINS, JSON_OVERLAPS, MEMBER OF), and EXPLAIN output descriptions are accurate.
- The version claim (MySQL 8.0.17) is confirmed correct per official documentation.
