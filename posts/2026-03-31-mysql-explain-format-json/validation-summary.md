# Validation Summary: How to Use MySQL EXPLAIN FORMAT=JSON for Advanced Analysis

## Status
validated

## Post Type
Tutorial / Reference Guide

## Technologies Covered
- MySQL (8.0+)
- EXPLAIN FORMAT=JSON
- EXPLAIN ANALYZE (MySQL 8.0.18+)
- EXPLAIN FORMAT=TREE (MySQL 8.0.16+)
- MySQL Query Optimizer

## Sources Consulted
- MySQL 8.0 Reference Manual — EXPLAIN Output Format: https://dev.mysql.com/doc/refman/8.0/en/explain-output.html
- MySQL 8.0 Reference Manual — EXPLAIN Statement: https://dev.mysql.com/doc/refman/8.0/en/explain.html
- MySQL 8.0 Reference Manual — Condition Filtering: https://dev.mysql.com/doc/refman/8.0/en/condition-filtering.html
- MySQL 8.0 Reference Manual — Range Optimization: https://dev.mysql.com/doc/refman/8.0/en/range-optimization.html
- MySQL Engineering Blog — New JSON format for EXPLAIN: https://dev.mysql.com/blog-archive/new-json-format-for-explain/
- MySQL 8.0.18 Release Notes: https://dev.mysql.com/doc/relnotes/mysql/8.0/en/news-8-0-18.html
- MySQL 8.0.16 Release Notes: https://dev.mysql.com/doc/relnotes/mysql/8.0/en/news-8-0-16.html

## Issues Found

### 1. Incorrect `ref` field in annotated JSON example
**What was wrong:** The example showed `"ref": ["const", "const"]` for a query with `WHERE status = 'pending' AND created_at > '2026-01-01'`. Since `created_at` uses a range condition (not equality), only the `status` column contributes to the ref lookup. Two "const" entries would imply two equality comparisons on the index, which is incorrect.
**What was changed:** Changed `"ref": ["const", "const"]` to `"ref": ["const"]`.

### 2. Inconsistent index name in JSON example
**What was wrong:** The key was shown as `idx_status_created` (implying a composite index on status and created_at), but the `attached_condition` showed `created_at > '2026-01-01'` as a post-index filter. If the composite index existed, MySQL would use it for the range scan and the attached_condition explanation wouldn't apply. The later text explicitly says "A composite index (status, created_at) would eliminate this" — implying no such composite index exists yet.
**What was changed:** Renamed `idx_status_created` to `idx_status` in both `possible_keys` and `key` fields to make the example internally consistent with its educational narrative about attached conditions.

### 3. Incorrect explanation of the `filtered` field
**What was wrong:** The blog stated "Low values (e.g., `1.00`) indicate the index is doing most of the filtering work." This is backwards. Per MySQL docs, a low `filtered` value means only a small percentage of rows examined by the index actually match the table condition — most rows are discarded after index access. This indicates the index is NOT selective enough.
**What was changed:** Corrected to explain that low values mean most examined rows are discarded by the condition, indicating you need a more selective index.

### 4. Invalid SQL in "Saving EXPLAIN Output" section
**What was wrong:** The INSERT statement referenced `explain_output` as a variable that was never defined. There is no way in MySQL 8.0 to capture EXPLAIN output into a table via a single SQL statement. The code would fail with a syntax error.
**What was changed:** Replaced with the `EXPLAIN FORMAT=JSON INTO @variable` syntax (available in MySQL 8.1+) followed by a standard INSERT, which is the correct approach for programmatically capturing EXPLAIN output.

## Review Notes
- The annotated JSON example uses `/* comments */` inside JSON blocks. While JSON does not support comments, the blog explicitly labels it as "an annotated example," making this an acceptable pedagogical choice.
- The `query_cost` value (124.50) does not equal the final table's `prefix_cost` (54.60) in the example. In simple nested loop joins these typically match. The numbers are illustrative so this is not a blocking issue, but could confuse readers who try to reconcile the arithmetic.
- The access_type list omits several types (system, fulltext, ref_or_null, index_merge, unique_subquery, index_subquery). The blog presents a simplified subset of the most common types in the correct order, which is appropriate for a tutorial.
- The JSON field names used correspond to EXPLAIN JSON format version 1 (`explain_json_format_version=1`). MySQL 8.0.32+ introduced format version 2 with a different structure. The blog does not mention this distinction.
- The `EXPLAIN FORMAT=JSON INTO` syntax used in the fix requires MySQL 8.1+. A note was not added since the section is about a general approach rather than version-specific guidance.
