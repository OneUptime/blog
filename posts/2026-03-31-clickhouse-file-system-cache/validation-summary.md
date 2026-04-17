# Validation Summary: How to Use File System Cache in ClickHouse

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- ClickHouse
- ClickHouse filesystem cache
- S3 / object storage integration
- ClickHouse system tables (`system.filesystem_cache`, `system.filesystem_cache_settings`, `system.events`)
- ClickHouse storage configuration (XML)

## Sources Consulted
- [ClickHouse Docs — Storing data on external storage](https://clickhouse.com/docs/operations/storing-data)
- [ClickHouse Docs — system.filesystem_cache](https://clickhouse.com/docs/operations/system-tables/filesystem_cache)
- [ClickHouse Docs — system.filesystem_cache_settings](https://clickhouse.com/docs/operations/system-tables/filesystem_cache_settings)
- [ClickHouse Docs — Cache types](https://clickhouse.com/docs/operations/caches)
- [ClickHouse GitHub — programs/server/config.xml](https://github.com/ClickHouse/ClickHouse/blob/master/programs/server/config.xml)
- [Altinity KB — S3 cache example](https://kb.altinity.com/altinity-kb-setup-and-maintenance/altinity-kb-s3-object-storage/s3_cache_example/)

## Issues Found
- **Incorrect column name in `system.filesystem_cache`.** The post referenced a column named `hits` when querying per-file cache entries. The actual column is `cache_hits` (per the official `system.filesystem_cache` schema). Updated both the `SELECT` list and the `ORDER BY` clause to use `cache_hits`.

## Review Notes
- The top-level `<filesystem_caches>` configuration section with a named cache (referenced from an S3 disk via `<cache_name>`) is a valid modern ClickHouse configuration pattern. An alternative (older) pattern wraps the S3 disk with a `<type>cache</type>` disk — both are supported; the post chose the named-cache style, which is accurate.
- `cache_on_write_operations` is correctly documented as a disk-level flag that can be overridden per query via `enable_filesystem_cache_on_write_operations`.
- The SQL settings mentioned (`read_from_filesystem_cache_if_exists_otherwise_bypass_cache`, `enable_filesystem_cache_on_write_operations`, `filesystem_cache_max_download_size`) and the `SYSTEM DROP FILESYSTEM CACHE` statement all match current ClickHouse settings/commands.
- The `system.events` `FilesystemCacheHits` / `FilesystemCacheMisses` counters exist and are appropriate for computing hit rate.
- For production, users should prefer IAM roles or a secrets manager over inline `access_key_id` / `secret_access_key` in `config.xml`, but the post is demonstrating syntax — not a security-correctness issue.
