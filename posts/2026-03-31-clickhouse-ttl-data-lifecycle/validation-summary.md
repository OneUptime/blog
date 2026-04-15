# Validation Summary: How to Configure TTL for Data Lifecycle in ClickHouse MergeTree

## Status
validated

## Post Type
Tutorial / Reference Guide

## Technologies Covered
- ClickHouse (MergeTree engine family)
- SQL (ClickHouse dialect)
- TTL (Time To Live) for row deletion, column expiry, storage tiering, and aggregation
- ClickHouse storage configuration (XML config for disk/volume policies, S3 integration)

## Sources Consulted
- ClickHouse MergeTree engine documentation — https://clickhouse.com/docs/en/engines/table-engines/mergetree-family/mergetree (TTL section)
- ClickHouse MergeTree settings reference — https://clickhouse.com/docs/operations/settings/merge-tree-settings (`merge_with_ttl_timeout` default)
- ClickHouse TTL developer guide — https://clickhouse.com/docs/guides/developer/ttl (multiple DELETE rules with WHERE, aggregation TTL examples)
- ClickHouse TTL knowledgebase article — https://clickhouse.com/docs/knowledgebase/when_is_ttl_applied (TTL merge scheduling)

## Issues Found

1. **`merge_with_ttl_timeout` default value was incorrect.**
   - **What was wrong:** The SQL comment stated "default: 1 day" (implying 86400 seconds).
   - **What was changed:** Corrected to "default: 14400 = 4 hours", which matches the official ClickHouse documentation.
   - **Why:** The default has been 14400 seconds (4 hours) in ClickHouse; stating 1 day could lead users to miscalculate TTL merge scheduling.

2. **Multiple DELETE TTL rule behavior was inaccurately described.**
   - **What was wrong:** The post stated "ClickHouse applies the first matching rule per row," which implies a first-match-wins evaluation model.
   - **What was changed:** Corrected to "ClickHouse evaluates all applicable DELETE rules and removes a row when any matching rule's TTL expression has expired."
   - **Why:** ClickHouse evaluates all applicable TTL DELETE rules independently; a row is deleted when any applicable rule's TTL has expired, not based on rule ordering.

3. **Multiple DELETE TTL rules lacked explicit `DELETE` keyword.**
   - **What was wrong:** Both TTL rules used the implicit default action (DELETE) without the explicit keyword.
   - **What was changed:** Added explicit `DELETE` keyword to both rules in the multiple TTL example, consistent with the ClickHouse TTL guide's examples for multiple conditional DELETE rules.
   - **Why:** When defining multiple DELETE rules (especially with WHERE conditions), using explicit `DELETE` keywords improves clarity and follows the pattern shown in official ClickHouse documentation.

## Review Notes
- The storage tiering example defines a `TO VOLUME 'hot'` rule at 7 days, which is redundant if data is already written to the hot volume by default (as is typical). This is not technically wrong but could confuse readers. A comment clarifying this would help.
- The aggregation TTL example uses `GROUP BY toStartOfDay(ts), page` with `ORDER BY (ts, page)`. This works because ClickHouse allows expressions derived from sorting key columns in TTL GROUP BY, but readers should be aware the GROUP BY columns must be derivable from a prefix of the ORDER BY key.
- The ClickHouse documentation states "no more than one DELETE rule" for TTL, yet the official TTL guide shows examples with multiple conditional DELETE rules using WHERE clauses. The blog's multiple-DELETE pattern with WHERE is consistent with the guide examples.
- The `system.parts` query uses `min_time` and `max_time` columns, which are available in modern ClickHouse versions but were not present in very old releases. This is fine for current usage.
- The version claim "Since ClickHouse 20.8" for WHERE conditions in TTL rules is approximately correct.
