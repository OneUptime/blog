# Validation Summary: How to Implement Path Enumeration for Hierarchical Data in MySQL

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- MySQL (DDL, DML, user variables, string functions)
- Path Enumeration / Materialized Path pattern for hierarchical data

## Sources Consulted
- MySQL 8.0 Reference Manual: String Functions and Operators (CONCAT, SUBSTRING, LENGTH, REPLACE, TRIM, FIND_IN_SET, LIKE) — https://dev.mysql.com/doc/refman/8.0/en/string-functions.html
- MySQL 8.0 Reference Manual: CREATE INDEX (prefix indexes) — https://dev.mysql.com/doc/refman/8.0/en/create-index.html
- MySQL 8.0 Reference Manual: User-Defined Variables — https://dev.mysql.com/doc/refman/8.0/en/user-variables.html
- MySQL 8.0 Reference Manual: SELECT ... INTO syntax — https://dev.mysql.com/doc/refman/8.0/en/select-into.html
- Joe Celko's "Trees and Hierarchies in SQL for Smarties" — path enumeration / materialized path pattern reference

## Issues Found

### 1. Incorrect path description (What Is Path Enumeration section)
- **What was wrong:** The text said "a node might store `/1/4/9/` indicating it is the child of node 9, which is the child of node 4, which is the child of node 1." Since the path includes the node's own ID (as demonstrated in the root insertion example where root node id=1 stores path `/1/`), the node storing `/1/4/9/` IS node 9, not a child of node 9.
- **What was changed:** Reworded to "indicating it is node 9, a child of node 4, which is a child of node 1."
- **Why:** The original wording contradicted the schema convention used throughout the rest of the article.

### 2. Direct children query returned the parent node (Querying Direct Children section)
- **What was wrong:** The query `WHERE path LIKE CONCAT(@parent_path, '%') AND path NOT LIKE CONCAT(@parent_path, '%/%/%')` also matched the parent node itself, since `LIKE '/1/4/%'` matches `/1/4/` (the `%` wildcard matches zero characters). A "direct children" query should not include the parent.
- **What was changed:** Added `AND path != @parent_path` condition to exclude the parent row.
- **Why:** Without this condition, the query returns the parent alongside its direct children, which is incorrect for its stated purpose.

### 3. Ambiguous variable naming in move subtree query (Moving a Subtree section)
- **What was wrong:** The query used `@old_path` and `@new_parent_path`. The asymmetric naming (`@old_path` without "parent" vs `@new_parent_path` with "parent") made it unclear whether `@old_path` referred to the moved node's full path or the old parent's path prefix. The code only produces correct results when `@old_path` is the old parent's path prefix, not the moved node's own path.
- **What was changed:** Renamed `@old_path` to `@old_parent_path` to make both variables symmetric and unambiguous.
- **Why:** With the original naming, a reader could reasonably set `@old_path` to the moved node's path (e.g., `/1/4/9/`), which would produce incorrect results — the node's own ID segment would be stripped from the new path.

## Review Notes
- The `LENGTH()` function is used in the move subtree query. For these paths (ASCII-only digits and `/`), `LENGTH()` and `CHAR_LENGTH()` return identical results, so this is correct. If paths ever contained multi-byte characters, `CHAR_LENGTH()` would be needed instead.
- The prefix index `path(255)` on a `VARCHAR(1000)` column is a valid MySQL optimization for `LIKE 'prefix%'` queries. The trade-off (noted in the post) that only left-anchored `LIKE` patterns benefit from B-Tree indexes is accurately described.
- The `FIND_IN_SET` approach for ancestor queries works correctly but does not scale well for very large tables since it requires a full table scan. This is acceptable for the scope of this tutorial.
- All SQL syntax is valid MySQL and uses current, non-deprecated functions as of MySQL 8.0+.
