# Validation Summary: How to Use system.detached_parts in ClickHouse

## Status
validated

## Post Type
Tutorial / Reference Guide

## Technologies Covered
- ClickHouse (MergeTree engine family)
- `system.detached_parts` system table
- `system.parts` system table
- ClickHouse ALTER TABLE partition/part manipulation commands

## Sources Consulted
- ClickHouse official documentation: system.detached_parts table (https://clickhouse.com/docs/operations/system-tables/detached_parts)
- ClickHouse official documentation: system.parts table (https://clickhouse.com/docs/operations/system-tables/parts)
- ClickHouse official documentation: ALTER TABLE PARTITION/PART statements (https://clickhouse.com/docs/sql-reference/statements/alter/partition)
- Altinity Knowledge Base: Understanding Detached Parts in ClickHouse

## Issues Found

1. **Incorrect `reason` value `detach`**: The blog listed `detach` as a reason value for manually detached parts. In ClickHouse, user-detached parts actually have an empty string (`''`) as the reason, not `detach`. Fixed to `''` (empty string) with the description "manually detached by user".

2. **Incorrect `reason` value `merge_not_in_part`**: The blog listed `merge_not_in_part` as a reason value. This value does not exist in ClickHouse. The correct value is `merge-not-byte-identical`, which indicates a merge result that differs from the expected part. Fixed the value and updated the description accordingly.

## Review Notes
- All SQL syntax for `ALTER TABLE ... ATTACH PART`, `DROP DETACHED PART`, and `DROP DETACHED PARTITION` is correct.
- The `SETTINGS allow_drop_detached = 1` requirement for DROP DETACHED operations is correctly documented.
- The columns referenced in queries (`database`, `table`, `partition_id`, `name`, `reason`, `modification_time`, `bytes_on_disk`) are valid columns in `system.detached_parts` in recent ClickHouse versions.
- The `system.parts` columns `name` and `active` used in the verification query are correct.
- The list of reason values is not exhaustive (other values include `broken-on-start`, `ignored`, `clone`, `covered-by-broken`, `mutate-not-byte-identical`), but this is acceptable for a blog post covering common cases.
- The conceptual explanation of detached parts and the `detached/` subdirectory is accurate.
