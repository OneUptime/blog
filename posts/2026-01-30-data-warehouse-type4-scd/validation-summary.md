# Validation Summary: How to Implement Type 4 SCD

## Status
validated

## Post Type
Tutorial / Implementation guide

## Technologies Covered
- Data warehousing
- Slowly Changing Dimensions (SCD)
- Type 4 SCD / history-table modeling
- PostgreSQL SQL and PL/pgSQL
- PostgreSQL indexing and partitioning
- Mermaid diagrams

## Sources Consulted
- PostgreSQL Documentation: CREATE INDEX, including partial-index predicate immutability requirements: https://www.postgresql.org/docs/current/sql-createindex.html
- PostgreSQL Documentation: PL/pgSQL transaction management in procedures: https://www.postgresql.org/docs/current/plpgsql-transactions.html
- PostgreSQL Documentation: Comparison functions and `IS DISTINCT FROM`: https://www.postgresql.org/docs/current/functions-comparison.html
- PostgreSQL Documentation: Array functions, including `array_remove`: https://www.postgresql.org/docs/current/functions-array.html
- PostgreSQL Documentation: Table partitioning and primary-key constraints on partitioned tables: https://www.postgresql.org/docs/current/ddl-partitioning.html
- Kimball Group: Type 4 mini-dimension technique: https://www.kimballgroup.com/data-warehouse-business-intelligence-resources/kimball-techniques/dimensional-modeling-techniques/type-4-mini-dimension/
- Kimball Group: Slowly Changing Dimension Types 0, 4, 5, 6 and 7: https://www.kimballgroup.com/2013/02/design-tip-152-slowly-changing-dimension-types-0-4-5-6-7/

## Issues Found
- The architecture diagram looped the "No" branch from `Changed?` back to comparison, which incorrectly implied an endless loop for unchanged records. Changed it to a `Skip` node.
- The staging table allowed `NULL` values for `first_name` and `last_name`, while the target table requires those columns to be `NOT NULL`. Updated the staging definition to match the target requirement.
- Several change-detection predicates used `!=`, which does not return true when one side is `NULL` in PostgreSQL. Replaced those comparisons with `IS DISTINCT FROM` where appropriate.
- The `changed_columns` array omitted `address_line2` even though `address_line2` was included in the update-detection predicate. Added `address_line2` to the tracked columns.
- `customer_tier` comparisons could report a change when the staging value was `NULL` but the update would retain the current value. Made the detection logic match the `COALESCE` behavior used by the update.
- The procedure included an unconditional `COMMIT`. PostgreSQL only allows transaction control in procedures when called at top level and not through an intervening command or explicit transaction context. Replaced it with a note explaining when a `COMMIT` can be added.
- The point-in-time query used inclusive `BETWEEN` bounds for temporal validity, which can double-count rows at validity boundaries. Changed the logic to half-open intervals: `valid_from <= timestamp < valid_to`.
- The current-row fallback in the point-in-time query could return the current row for dates before it became current. Added a check against `updated_at`.
- The audit report labeled `valid_from` as the change timestamp even though the archived old version's change occurred at `valid_to`. Changed the selected timestamp to `valid_to`.
- The audit report used `BETWEEN '2025-01-01' AND '2025-12-31'` on a timestamp column, which would exclude most of December 31. Replaced it with a half-open year range.
- The partial-index example used `CURRENT_DATE` in the predicate. PostgreSQL requires functions and operators in index definitions, including partial-index predicates, to be immutable. Replaced it with a fixed timestamp cutoff and a note to refresh periodically.

## Review Notes
- PostgreSQL was the assumed SQL dialect because the examples use `SERIAL`, PL/pgSQL, `TEXT[]`, `IS DISTINCT FROM`, and `CREATE OR REPLACE PROCEDURE`.
- Kimball's formal Type 4 technique is a mini-dimension pattern, while the post uses the common history-table interpretation of Type 4 SCD. The post is still technically useful as a history-table SCD implementation, but future edits could clarify the terminology difference.
