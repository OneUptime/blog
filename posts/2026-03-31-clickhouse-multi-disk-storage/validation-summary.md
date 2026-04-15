# Validation Summary: How to Configure ClickHouse Multi-Disk Storage

## Status
validated

## Post Type
Tutorial / Configuration Guide

## Technologies Covered
- ClickHouse (MergeTree engine family)
- ClickHouse storage configuration (disks, volumes, policies)
- ClickHouse system tables (system.disks, system.storage_policies, system.parts)
- XML server configuration (config.xml / config.d/)
- Linux filesystem administration (mkdir, chown)

## Sources Consulted
- ClickHouse official documentation — MergeTree multiple volumes and storage policies: https://clickhouse.com/docs/en/engines/table-engines/mergetree-family/mergetree#table_engine-mergetree-multiple-volumes
- ClickHouse official documentation — system.storage_policies table: https://clickhouse.com/docs/en/operations/system-tables/storage_policies
- ClickHouse official documentation — system.disks table: https://clickhouse.com/docs/en/operations/system-tables/disks

## Issues Found
No technical issues found.

## Review Notes
- The `<load_balancing>round_robin</load_balancing>` volume-level XML element was verified as a valid configuration option with accepted values `round_robin` and `least_used`.
- All five columns queried from `system.disks` (name, path, free_space, total_space, type) and all five columns from `system.storage_policies` (policy_name, volume_name, disks, volume_priority, max_data_part_size) were confirmed against official documentation.
- The `max_data_part_size_bytes` volume-level setting and the `ALTER TABLE ... MOVE PART|PARTITION ... TO VOLUME|DISK` syntax were both verified as correct.
- The example table in the "Applying a Storage Policy" section does not include a `PARTITION BY` clause, while the later "Moving Parts Manually" section demonstrates `MOVE PARTITION '2024-01-01'` which implies date-based partitioning. These are independent illustrative examples and the syntax itself is correct, but readers should note that `MOVE PARTITION` requires the table to have a matching partition scheme.
- The XML configuration uses the modern `<clickhouse>` root tag, which is correct for current versions. Older installations may use `<yandex>` as the root tag.
