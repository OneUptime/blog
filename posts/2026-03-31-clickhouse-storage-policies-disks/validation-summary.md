# Validation Summary: How to Configure ClickHouse Storage Policies with Multiple Disks

## Status
validated

## Post Type
Tutorial / Configuration Guide

## Technologies Covered
- ClickHouse (MergeTree engine, storage configuration)
- S3-compatible object storage
- XML configuration for ClickHouse server
- SQL DDL and system table queries

## Sources Consulted
- ClickHouse official documentation — Storing Data on External Disks: https://clickhouse.com/docs/operations/storing-data
- ClickHouse official documentation — system.storage_policies: https://clickhouse.com/docs/operations/system-tables/storage_policies
- ClickHouse official documentation — system.disks: https://clickhouse.com/docs/operations/system-tables/disks
- ClickHouse official documentation — system.parts: https://clickhouse.com/docs/operations/system-tables/parts
- ClickHouse official documentation — TTL management: https://clickhouse.com/docs/guides/developer/ttl
- ClickHouse official documentation — ALTER TABLE MOVE PARTITION/PART: https://clickhouse.com/docs/sql-reference/statements/alter/partition
- ClickHouse official documentation — Cache types: https://clickhouse.com/docs/operations/caches
- Altinity Blog — Amplifying ClickHouse Capacity with Multi-Volume Storage: https://altinity.com/blog/2019-11-29-amplifying-clickhouse-capacity-with-multi-volume-storage-part-2

## Issues Found

1. **Invalid `reserved_space` setting at volume level**: The `<reserved_space>21474836480</reserved_space>` element was placed inside a volume definition (`<hot>`), but `reserved_space` is not a valid ClickHouse volume-level setting. The correct way to reserve free space on a disk is to use `<keep_free_space_bytes>` at the disk level (inside `<disks>`), not at the volume level. Removed the invalid setting and its comment.

2. **Misleading comment on `max_data_part_size_bytes`**: The comment stated "Move data off this volume when less than 20 GiB remains" which incorrectly describes the setting's purpose. `max_data_part_size_bytes` limits the maximum size of an individual data part that can be stored on the volume — parts exceeding this size are placed on the next volume instead. Updated the comment to "Parts larger than 10 GiB are placed on the next volume".

3. **Imprecise comment on `move_factor`**: The comment said "Move parts to next volume when current volume exceeds this ratio" which is vague. Updated to "Move parts to next volume when free space falls below this ratio (10%)" to accurately describe the behavior — ClickHouse triggers background moves when the available free space ratio drops below the `move_factor` value.

## Review Notes
- The S3 disk cache settings (`cache_enabled`, `data_cache_max_size`, `cache_path`) used in the first XML example are a legacy caching approach. Modern ClickHouse versions (23.x+) prefer a separate `type=cache` disk wrapper with `filesystem_caches` configuration. The legacy settings still work but may be deprecated in future versions. A future update could add a note about the newer caching method.
- The blog post uses example AWS access keys (`AKIAIOSFODNN7EXAMPLE` / `wJalrXUtnFEMI/K7MDENG/bPxRfiCYEXAMPLEKEY`) which are the well-known AWS documentation placeholder keys — this is appropriate for a tutorial.
- All SQL syntax (CREATE TABLE, ALTER TABLE, TTL clauses, system table queries, MOVE PART/PARTITION) is correct and verified against official documentation.
- The claim about JBOD round-robin distribution is accurate — ClickHouse does distribute parts across disks in a single volume using round-robin.
- The superset policy restriction on ALTER TABLE MODIFY SETTING is correctly described.
- All system table columns referenced (system.parts, system.storage_policies, system.disks) are verified to exist.
