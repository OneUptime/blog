# Validation Summary: How to Benchmark ClickHouse on Different Storage Types

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- ClickHouse (MergeTree storage, storage policies, tiered storage)
- ClickHouse XML configuration (`storage_configuration`)
- `clickhouse-benchmark` CLI utility
- `clickhouse-client` CLI utility
- AWS S3 (as cold tier object storage)
- SQL: `CREATE TABLE`, `ALTER TABLE ... MOVE PARTITION`, `system.parts`

## Sources Consulted
- ClickHouse storage configuration docs: https://clickhouse.com/docs/operations/storing-data
- ClickHouse `ALTER TABLE ... MOVE PARTITION` syntax: https://clickhouse.com/docs/sql-reference/statements/alter/partition
- `clickhouse-benchmark` reference: https://clickhouse.com/docs/operations/utilities/clickhouse-benchmark
- `system.parts` schema: https://clickhouse.com/docs/operations/system-tables/parts
- MergeTree partitioning (`toYYYYMM` partition IDs): https://clickhouse.com/docs/engines/table-engines/mergetree-family/custom-partitioning-key

## Issues Found
1. **Undefined table `events_ssd` referenced in SSD benchmark.** The post created `events_nvme` and `events_tiered` but the SSD benchmark `ALTER TABLE` and query referenced a non-existent `events_ssd` table. Changed both to use `events_tiered` (the only table that has SSD as part of its storage policy).
2. **`MOVE PARTITION '202301'` invalid for unpartitioned table.** The original `events_tiered` definition had no `PARTITION BY` clause, so it had a single `tuple()` partition (or `'all'` partition ID), making `MOVE PARTITION '202301'` impossible. Added `PARTITION BY toYYYYMM(ts)` to the `events_tiered` definition so the monthly partition moves in both the SSD and S3 sections become valid (verified that `toYYYYMM` produces partition IDs in `'YYYYMM'` format).
3. **SSD `MOVE PARTITION tuple()` updated.** Once monthly partitioning was added, `tuple()` no longer matches the partition key. Replaced with `MOVE PARTITION '202604' TO VOLUME 'warm'` (the warm volume contains the SSD disk in the tiered policy) and updated the benchmark query to filter on the same partition so the read actually exercises the SSD-resident parts.

## Review Notes
- The comment "Uses NVMe by default" on `storage_policy = 'default'` is technically only true if the operator has set the top-level `<path>` directive in `config.xml` to point at the NVMe mount. ClickHouse's implicit `default` policy uses whatever directory `<path>` resolves to — it does not auto-detect NVMe. Left as-is because it is a reasonable assumption for a tutorial setting up NVMe as the primary disk, but readers running on default installs should be aware.
- The "Typical Results" table contains illustrative numbers; latency, throughput, and per-TB cost vary widely by workload, hardware generation, and S3 region/tier. Treat as ballpark only.
- The S3 disk configuration shown uses inline `<access_key_id>` / `<secret_access_key>`. For production, IAM roles or named credentials in a separate `<named_collections>` block are preferable.
