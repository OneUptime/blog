# Validation Summary: How to Configure ClickHouse Multiple Disk Volumes

## Status
validated

## Post Type
Tutorial / Configuration Guide

## Technologies Covered
- ClickHouse (MergeTree engine family)
- ClickHouse storage_configuration (disks, volumes, policies)
- Tiered storage (NVMe, HDD, S3)
- TTL-based data movement

## Sources Consulted
- ClickHouse MergeTree documentation — storage_configuration section: https://clickhouse.com/docs/en/engines/table-engines/mergetree-family/mergetree
- ClickHouse system.disks table documentation: https://clickhouse.com/docs/en/operations/system-tables/disks
- ClickHouse system.parts table documentation: https://clickhouse.com/docs/en/operations/system-tables/parts

## Issues Found

1. **Incorrect comment on `max_data_part_size_bytes`**: The XML comment said "Move to next volume when disk is 90% full." This is wrong — `max_data_part_size_bytes` limits the maximum size of an individual data part that can be stored on the volume. Parts exceeding this size are written to the next volume. Fixed the comment to: "Parts larger than 1GB are written to the next volume."

2. **Incorrect comment on `move_factor`**: The XML comment said "Move to next volume when this fraction of space is used." This has the logic inverted — `move_factor` triggers when the ratio of available *free* space drops below this factor, not when this fraction of space is *used*. With `move_factor=0.1`, movement starts when less than 10% of space is free (i.e., more than 90% used). Fixed the comment to: "Move parts to next volume when available free space ratio drops below this factor."

3. **Wrong default disk distribution strategy in Striped Volumes section**: The post stated "Parts are distributed across disks using the `least_used` strategy by default." The ClickHouse documentation confirms that the default strategy is `round_robin`. Fixed to say `round_robin`.

## Review Notes
- The post correctly notes that `ALTER TABLE ... MODIFY SETTING storage_policy` can change a table's policy, but omits the documented constraint that the new policy must include all disks and volumes from the old policy (with the same names). This is a caveat worth knowing but not an error in the current text.
- The Core Concepts section mentions both `round_robin` and `least_used` as distribution strategies within a volume, which is acceptable since both can be configured, though `round_robin` is the default.
- All SQL examples (`CREATE TABLE`, `ALTER TABLE`, TTL movement, `system.disks` and `system.parts` queries) are syntactically correct and use valid column names confirmed against documentation.
