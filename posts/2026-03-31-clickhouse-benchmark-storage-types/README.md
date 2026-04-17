# How to Benchmark ClickHouse on Different Storage Types

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: ClickHouse, Storage Benchmark, NVMe, SSD, Cold Tier

Description: Learn how to benchmark ClickHouse performance across NVMe, SSD, HDD, and object storage tiers to optimize storage architecture and cost.

---

## Storage Architecture in ClickHouse

ClickHouse supports tiered storage: hot NVMe for recent data, warm SSD for intermediate data, and cold object storage (S3) for archives. Benchmarking each tier guides your data lifecycle policy.

## Setting Up Storage Policies

```xml
<!-- storage.xml -->
<storage_configuration>
    <disks>
        <nvme>
            <path>/mnt/nvme/clickhouse/</path>
        </nvme>
        <ssd>
            <path>/mnt/ssd/clickhouse/</path>
        </ssd>
        <s3_cold>
            <type>s3</type>
            <endpoint>https://my-bucket.s3.amazonaws.com/clickhouse/</endpoint>
            <access_key_id>KEY</access_key_id>
            <secret_access_key>SECRET</secret_access_key>
        </s3_cold>
    </disks>
    <policies>
        <tiered>
            <volumes>
                <hot><disk>nvme</disk></hot>
                <warm><disk>ssd</disk></warm>
                <cold><disk>s3_cold</disk></cold>
            </volumes>
        </tiered>
    </policies>
</storage_configuration>
```

## Creating Tables on Each Storage Tier

```sql
-- NVMe table
CREATE TABLE events_nvme
(ts DateTime, user_id UInt64, amount Float64)
ENGINE = MergeTree()
ORDER BY (user_id, ts)
SETTINGS storage_policy = 'default';  -- Uses NVMe by default

-- Tiered table
CREATE TABLE events_tiered
(ts DateTime, user_id UInt64, amount Float64)
ENGINE = MergeTree()
PARTITION BY toYYYYMM(ts)
ORDER BY (user_id, ts)
SETTINGS storage_policy = 'tiered';
```

## Inserting Identical Test Data

```sql
-- Insert the same data to both tables
INSERT INTO events_nvme
SELECT now() - rand() % 86400, rand() % 1000000, rand() % 500
FROM numbers(10000000);

INSERT INTO events_tiered SELECT * FROM events_nvme;
```

## Benchmarking Read Performance per Tier

```bash
# NVMe benchmark
clickhouse-benchmark --iterations 30 \
    --query "SELECT count(), sum(amount) FROM events_nvme" \
    > results_nvme.txt

# SSD benchmark (after moving parts)
clickhouse-client --query "
ALTER TABLE events_tiered MOVE PARTITION '202604' TO VOLUME 'warm'
"
clickhouse-benchmark --iterations 30 \
    --query "SELECT count(), sum(amount) FROM events_tiered WHERE toYYYYMM(ts) = 202604" \
    > results_ssd.txt
```

## Checking Part Locations

```sql
SELECT
    table,
    disk_name,
    sum(bytes_on_disk) / 1024 / 1024 AS mb,
    count() AS parts
FROM system.parts
WHERE active
GROUP BY table, disk_name
ORDER BY table, disk_name;
```

## S3 Cold Tier Read Latency

```sql
-- Move old parts to S3
ALTER TABLE events_tiered MOVE PARTITION '202301' TO DISK 's3_cold';

-- Benchmark query hitting S3
```

```bash
clickhouse-benchmark --iterations 10 \
    --query "SELECT count() FROM events_tiered WHERE toYYYYMM(ts) = 202301" \
    > results_s3.txt
```

## Typical Results

```text
Storage   | Q1 latency | Throughput | Cost/TB/month
NVMe SSD  | 12ms       | 3.5 GB/s   | $200
SATA SSD  | 28ms       | 1.2 GB/s   | $80
S3        | 180ms      | 300 MB/s   | $23
```

## Summary

Benchmark ClickHouse storage tiers by creating identical tables on each disk, inserting the same data, and running `clickhouse-benchmark` on equivalent queries. Use `system.parts` to verify data placement and compare latency, throughput, and cost to design the optimal tiered storage policy.
