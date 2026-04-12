# Validation Summary: How to Create a Functional (Expression) Index in MySQL 8

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- MySQL 8.0 (8.0.13+)
- InnoDB storage engine
- Functional (expression) indexes
- JSON functions (JSON_UNQUOTE, JSON_EXTRACT)
- SQL DDL (CREATE INDEX, ALTER TABLE)
- EXPLAIN query analysis

## Sources Consulted
- MySQL 8.0 Reference Manual — CREATE INDEX Statement (functional key parts): https://dev.mysql.com/doc/refman/8.0/en/create-index.html
- MySQL 8.0 Reference Manual — JSON functions: https://dev.mysql.com/doc/refman/8.0/en/json-function-reference.html
- MySQL 8.0 Reference Manual — Generated Columns: https://dev.mysql.com/doc/refman/8.0/en/create-table-generated-columns.html
- MySQL 8.0 Release Notes (8.0.13 — functional key parts): https://dev.mysql.com/doc/relnotes/mysql/8.0/en/news-8-0-13.html
- Other blog posts in this repository for consistent JSON indexing patterns

## Issues Found

### 1. JSON functional index missing CAST — would fail at creation time
- **What was wrong:** The JSON attribute indexing example used `JSON_UNQUOTE(JSON_EXTRACT(attributes, '$.color'))` directly in a functional index. `JSON_UNQUOTE()` returns `LONGTEXT`, and MySQL functional indexes cannot index `BLOB` or `TEXT` data types. This would fail with an error such as `ERROR 3751: Expression of functional index contains a disallowed data type`.
- **What was changed:** Wrapped the expression in `CAST(... AS CHAR(100))` in both the `ALTER TABLE` index creation and the corresponding `SELECT` query. Added an explanatory note about why CAST is required.
- **Why:** Functional indexes require the expression to resolve to an indexable type. LONGTEXT is not indexable without a prefix, and functional key parts do not support prefix lengths. CAST converts the result to a fixed-length CHAR type that MySQL can index. This is consistent with patterns used in other blog posts in this repository and MySQL official documentation recommendations.

### 2. "Viewing the Hidden Generated Column" section was inaccurate
- **What was wrong:** The section title implied `SHOW CREATE TABLE` would reveal a hidden generated column prefixed with `!hidden!`. In reality, `SHOW CREATE TABLE` displays the functional index definition with the expression in the `KEY` clause (e.g., `KEY idx_email_lower ((lower(email)))`), but does not expose the hidden virtual generated column or a `!hidden!` prefix.
- **What was changed:** Updated the section title to "Viewing the Functional Index Definition" and corrected the description to explain what `SHOW CREATE TABLE` actually shows. Added a note that the hidden generated column can be inspected via `information_schema.columns` where `GENERATION_EXPRESSION` is not empty.
- **Why:** The original text would mislead readers into expecting to see a `!hidden!`-prefixed column in DDL output that does not appear there.

## Review Notes
- The motivating example using `LOWER(email)` for case-insensitive lookups is a common pedagogical example, but worth noting that MySQL 8's default collation (`utf8mb4_0900_ai_ci`) is already case-insensitive. A functional index on `LOWER(email)` would be most useful with a case-sensitive collation like `utf8mb4_bin`. This is not technically wrong — the example works as written — but readers may not need this approach with the default collation.
- The EXPLAIN output example is illustrative and assumes `id` is the primary key (which would make it a covering index in InnoDB). This is reasonable for a tutorial.
- MySQL 8.0.13 as the introduction version for functional indexes is correct.
- All other SQL syntax, limitations, and technical explanations are accurate.
