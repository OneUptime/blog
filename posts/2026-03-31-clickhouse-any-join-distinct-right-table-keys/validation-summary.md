# Validation Summary: How to Use any_join_distinct_right_table_keys in ClickHouse

## Status
validated

## Post Type
Tutorial / Reference Guide

## Technologies Covered
- ClickHouse (database server)
- ClickHouse SQL (ANY JOIN strictness, settings, profiles)
- Join table engine and `joinGet` function
- ClickHouse `system.settings` table

## Sources Consulted
- ClickHouse settings docs: https://clickhouse.com/docs/en/operations/settings/settings#any_join_distinct_right_table_keys
- ClickHouse JOIN clause docs: https://clickhouse.com/docs/sql-reference/statements/select/join
- ClickHouse JOIN deep-dive blog: https://clickhouse.com/blog/clickhouse-fully-supports-joins-part1
- GitHub issue on ANY JOIN semantics: https://github.com/ClickHouse/ClickHouse/issues/68923

## Issues Found

The post fundamentally mischaracterized what `any_join_distinct_right_table_keys` does. The official docs describe it as a switch that "enables legacy ClickHouse server behaviour in `ANY INNER|LEFT JOIN` operations," not as a deduplication-strategy toggle. The following corrections were applied:

1. **Intro paragraph** — Reframed the setting as a legacy/backward-compatibility toggle rather than a duplicate-handling control.

2. **"What any_join_distinct_right_table_keys Controls"** — Replaced the incorrect table that claimed `0` returns "the first row encountered" and `1` "deduplicates the right table." Replaced with the correct semantics from the official docs:
   - `0` (default, modern): `t1 ANY LEFT JOIN t2` and `t2 ANY RIGHT JOIN t1` produce equal results; `ANY INNER JOIN` returns one row per key from both tables.
   - `1` (legacy): The two queries are not equal (many-to-one left-to-right mapping); `ANY INNER JOIN` returns all rows from the left table (similar to `SEMI LEFT JOIN`).
   Added the official recommendation that the setting be used only for backward compatibility.

3. **Practical Examples (Basic ANY LEFT JOIN, ANY INNER JOIN)** — Removed the `SETTINGS any_join_distinct_right_table_keys = 1` clauses, since the original justification ("more predictable results") was based on the incorrect description of the setting. The examples still demonstrate `ANY JOIN` correctly using the modern default behavior.

4. **Comparing ANY JOIN to INNER JOIN example** — Removed the `SETTINGS = 1` clause for the same reason; the example demonstrates `ANY INNER JOIN` semantics, not the legacy switch.

5. **Performance Implications** — Rewrote the section, which had claimed the setting causes ClickHouse to "deduplicate the right table before building the hash map." That description was not accurate; the difference is between the symmetric modern code path and the legacy many-to-one mapping.

6. **When to Use This Setting** — Rewrote both bullet lists. The original recommended enabling the setting for SCD patterns, consistency, and migrations from systems with distinct right-table keys, none of which is what the setting actually does. Replaced with the correct guidance: enable only to preserve legacy semantics during migration; otherwise leave at the default.

7. **Conclusion** — Rewrote to accurately describe the setting as a backward-compatibility switch and to summarize the modern vs. legacy behavior.

## Review Notes

- The `ANY` modifier syntax used throughout the post (`ANY LEFT JOIN`, `ANY INNER JOIN`) is valid in ClickHouse. The newer documentation tends to prefer `LEFT ANY JOIN` / `INNER ANY JOIN` ordering, but both forms are accepted by the parser and remain in widespread use, so they were left as-is.
- The `Join` table engine syntax `Join(ANY, LEFT, user_id)` and the `joinGet('user_lookup', 'user_name', e.user_id)` function call are both correct.
- The `system.settings` query and the XML profile snippet are both syntactically and semantically correct.
- The `argMax` subquery deduplication example is correct.
- The author's writing style and section structure were preserved; only the technically incorrect descriptions and the misleading `SETTINGS = 1` annotations were modified.
