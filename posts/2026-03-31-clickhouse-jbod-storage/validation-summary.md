# Validation Summary: How to Use JBOD Storage Policy in ClickHouse

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- ClickHouse (MergeTree storage policies, multi-disk volumes, JBOD)
- ClickHouse system tables (`system.parts`, `system.disks`)
- ClickHouse TTL with `TO VOLUME` moves
- ClickHouse S3 disk type (cold tier reference)
- Linux disk management (`mkfs.ext4`, `mount`, `/etc/fstab`, `chown`)
- XML-based ClickHouse server configuration (`config.d`)
- Mermaid diagrams

## Sources Consulted
- ClickHouse MergeTree docs — multiple volumes / storage configuration: https://clickhouse.com/docs/en/engines/table-engines/mergetree-family/mergetree
- ClickHouse `system.storage_policies` docs: https://clickhouse.com/docs/operations/system-tables/storage_policies
- Altinity KB — Multi-Volume Storage / load balancing: https://altinity.com/blog/2019-11-29-amplifying-clickhouse-capacity-with-multi-volume-storage-part-2
- ChistaData — Storage Policies & Load Balancing in ClickHouse MergeTree: https://chistadata.com/storage-policies-load-balancing-in-clickhouse-mergetree/

## Issues Found
- **Contradictory description of disk selection.** The introduction correctly states JBOD writes parts in round-robin order, but the section under the diagram contradicted this with "ClickHouse picks the disk with the most free space for each new part write... it is free-space-weighted." Per ClickHouse docs, the default `load_balancing` for a volume is `round_robin`; the free-space behavior corresponds to the optional `least_used` setting. Rewrote that paragraph to state the round-robin default and to explain how to opt into `least_used` via `<load_balancing>least_used</load_balancing>`.

## Review Notes
- XML config structure (`<storage_configuration>`, `<disks>`, `<policies>`, `<volumes>`, `<disk>`, `<max_data_part_size_bytes>`, `<move_factor>`) and the `<clickhouse>` root element are correct for current ClickHouse versions.
- Default `move_factor` of `0.1` matches the documented default.
- `system.parts` columns referenced (`disk_name`, `bytes_on_disk`, `active`, `table`) are valid, as are `system.disks` columns (`name`, `type`, `free_space`, `total_space`) and the `formatReadableSize` function.
- `SETTINGS storage_policy = 'jbod'` and `ALTER TABLE ... MODIFY TTL ts + INTERVAL 90 DAY TO VOLUME 'cold'` syntax is correct.
- Linux setup commands are valid; in production, fstab entries are usually written by UUID (e.g. `UUID=...`) rather than device path to survive enumeration changes, but device-path entries still work and are acceptable for a tutorial.
- The post correctly notes that JBOD provides no redundancy and that a single part is not striped across disks — both accurate.
