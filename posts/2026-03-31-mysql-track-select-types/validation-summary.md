# Validation Summary: How to Track MySQL Select Types (Full Join, Full Range Join)

## Status
validated

## Post Type
Tutorial / Monitoring Guide

## Technologies Covered
- MySQL (performance_schema, global status variables)
- SQL (EXPLAIN, ALTER TABLE, SELECT queries)
- Bash scripting (monitoring shell script)

## Sources Consulted
- MySQL 8.4 Reference Manual: Server Status Variables — https://dev.mysql.com/doc/refman/8.4/en/server-status-variables.html
- MySQL 8.0 Reference Manual: EXPLAIN Output Format (Section 10.8.2) — https://dev.mysql.com/doc/refman/8.0/en/explain-output.html
- MySQL 9.6 Reference Manual: Server Status Variables — https://dev.mysql.com/doc/refman/9.6/en/server-status-variables.html

## Issues Found

1. **Description metadata referenced `Com_select` which is not covered in the post.** The description said "Monitor MySQL Com_select and select type counters" but the post never discusses `Com_select`. Removed the reference.

2. **EXPLAIN output was missing the `ref` column.** Standard MySQL EXPLAIN output (both 5.7 and 8.0) includes the `ref` column between `key_len` and `rows`. Added the missing column.

3. **EXPLAIN output showed the wrong table as the full join culprit.** The original showed `customers` with `type: ALL`, but `customers.id` is the primary key used in the join condition (`c.id = o.customer_id`), so it would never show `ALL` for that lookup. The actual `Select_full_join` scenario occurs when the joined `orders` table (missing index on `customer_id`) does a full scan. Fixed to show both rows with `orders` as the table with `type: ALL`.

4. **EXPLAIN output was incomplete.** Only showed one row from a two-table join. Added both rows so the reader can see which table causes the full join (the second/joined table).

5. **Misleading SQL comment.** The comment said "Delta over 60 seconds to detect rate of occurrence" but the query is a single-point-in-time snapshot, not a delta computation. Changed to "Snapshot query - run twice and compare to compute the delta."

6. **`Select_range_check` description missing key qualifier.** The blog said "Re-evaluates key usage for each row of a join" but the MySQL docs say "joins without keys that check for key usage after each row." Added the "without keys" qualifier which is important context for understanding why this variable is concerning.

## Review Notes
- The post uses a simplified EXPLAIN column format (omitting `partitions` and `filtered` columns present in MySQL 5.7+). This is acceptable for readability in a blog post, and the added `ref` column covers the most important omission.
- The claim "Any non-zero Select_full_join on production is a concern" is strong but reasonable guidance for a monitoring-focused article. In practice, occasional full joins on small tables may be acceptable.
- The `Select_scan` description includes "(acceptable if table is small)" which is editorial — the MySQL docs make no such judgment for this variable (unlike `Select_range` which does). This was left as-is since it is reasonable practical advice, even if not from the docs.
- All SQL syntax is correct and would execute properly on MySQL 5.7+.
- The shell monitoring script is syntactically correct and functional.
