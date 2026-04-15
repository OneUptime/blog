# Validation Summary: How to Configure ClickHouse Storage Policies

## Status
validated

## Post Type
Tutorial / Configuration Guide

## Technologies Covered
- ClickHouse (MergeTree engine family)
- ClickHouse storage configuration (disks, volumes, policies)
- ClickHouse TTL-based data tiering
- Amazon S3 object storage integration
- JBOD (Just a Bunch of Disks) volume configuration

## Sources Consulted
- ClickHouse official documentation — MergeTree storage policies: https://clickhouse.com/docs/en/engines/table-engines/mergetree-family/mergetree
- ClickHouse official documentation — system.storage_policies table: https://clickhouse.com/docs/en/operations/system-tables/storage_policies
- ClickHouse official documentation — system.tables table: https://clickhouse.com/docs/en/operations/system-tables/tables
- ClickHouse official documentation — system.disks table: https://clickhouse.com/docs/en/operations/system-tables/disks

## Issues Found
No technical issues found.

All configuration snippets, SQL statements, system table queries, and conceptual explanations were verified against official ClickHouse documentation:

- **XML configuration structure**: The `<storage_configuration>` hierarchy of `<disks>`, `<policies>`, `<volumes>` is correct.
- **`move_factor`**: Correctly placed at the policy level (not volume). The semantics described (0.2 = move when 20% free space remains) match the docs (default is 0.1).
- **`max_data_part_size_bytes`**: Confirmed as a valid volume-level setting that causes oversized parts to skip to the next volume.
- **`<load_balancing>`**: Confirmed as a valid volume-level tag with `round_robin` and `least_used` as valid values.
- **S3 disk configuration**: The `<type>`, `<endpoint>`, `<access_key_id>`, `<secret_access_key>`, and `<metadata_path>` fields are all valid.
- **SQL syntax**: All `CREATE TABLE`, `ALTER TABLE`, and `SELECT` statements use correct ClickHouse SQL syntax including TTL expressions with `TO VOLUME` and `DELETE` clauses.
- **System table queries**: All referenced columns (`policy_name`, `volume_name`, `disks`, `volume_priority`, `max_data_part_size` in `system.storage_policies`; `name`, `type`, `path`, `free_space`, `total_space` in `system.disks`; `name`, `storage_policy` in `system.tables`) are confirmed to exist.
- **Policy change constraint**: The statement that you can only switch to a policy containing all disks currently used by the table is accurate.

## Review Notes
- The S3 disk configuration uses `<metadata_path>`, which is valid but represents the older configuration style. Newer ClickHouse versions may manage metadata differently, though this setting remains supported for backward compatibility.
- The post does not specify a minimum ClickHouse version. All features described (storage policies, TTL-based tiering, S3 disks, JBOD volumes) have been stable since ClickHouse 20.x and remain current.
- The `from_env` attribute for S3 credentials is a good security practice worth highlighting — the post correctly demonstrates this pattern rather than hardcoding secrets.
