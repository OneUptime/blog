# Validation Summary: What Is ReplacingMergeTree and When to Use It

## Status
validated

## Post Type
Tutorial / Explainer

## Technologies Covered
- ClickHouse
- ReplacingMergeTree table engine
- MergeTree engine family
- SQL (ClickHouse dialect)

## Sources Consulted
- ClickHouse official documentation: ReplacingMergeTree engine — https://clickhouse.com/docs/engines/table-engines/mergetree-family/replacingmergetree
- ClickHouse guide: Working with the ReplacingMergeTree engine — https://clickhouse.com/docs/guides/replacing-merge-tree
- ClickHouse blog: Handling Updates and Deletes in ClickHouse — https://clickhouse.com/blog/handling-updates-and-deletes-in-clickhouse

## Issues Found

### Issue 1: Deduplication key incorrectly described as "primary key"
- **What was wrong:** The post stated that ReplacingMergeTree deduplicates rows based on the "primary key." The official ClickHouse documentation explicitly states deduplication is based on the **sorting key** (`ORDER BY` columns, not `PRIMARY KEY`). While in many table definitions these are the same, they can differ, and the distinction is important.
- **What was changed:** Replaced "primary key" with "sorting key" / "sorting key (`ORDER BY` columns)" in the introduction, the "How ReplacingMergeTree Works" section, and the summary.
- **Why:** The ClickHouse docs state: "The engine differs from MergeTree in that it removes duplicate entries with the same sorting key value (ORDER BY table section, not PRIMARY KEY)."

### Issue 2: Imprecise description of behavior without a version column
- **What was wrong:** The post stated "the last row inserted in the same batch is kept (non-deterministic across different parts)." This is imprecise. The official docs state the last row from the most recently inserted part is kept — the behavior is not limited to within a single batch.
- **What was changed:** Replaced with "the last row from the most recently inserted part is kept."
- **Why:** The docs say "the very last row from the most recent insert will remain for each unique sorting key," which spans across inserts, not just within a single batch.

## Review Notes
- The post does not mention the `is_deleted` column parameter (second optional argument to `ReplacingMergeTree`), which enables soft-delete semantics. This is a newer feature and not essential for an introductory post, but could be a useful addition in the future.
- All SQL syntax (`CREATE TABLE`, `INSERT`, `OPTIMIZE TABLE ... FINAL`, `SELECT ... FINAL`) is correct and uses valid ClickHouse SQL.
- The advice about `FINAL` being slower than a regular scan is accurate. Recent ClickHouse versions have improved `FINAL` performance, but the general caveat remains valid.
- The recommendation to use `CollapsingMergeTree` for tracking full history of changes is a reasonable alternative, though `VersionedCollapsingMergeTree` is also worth mentioning in a future update.
