# How to Implement Data Tiering in ClickHouse

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: ClickHouse, Data Tiering, Storage, Hot-Warm-Cold, TTL, Cost Optimization

Description: A comprehensive guide to implementing data tiering in ClickHouse with hot, warm, and cold storage using TTL rules and S3 for cost-effective long-term data retention.

---

Data tiering moves data between storage tiers based on age and access patterns, optimizing costs while maintaining query performance for recent data.

## Storage Policy Configuration

### Define Storage Tiers

```xml
<!-- config.d/storage.xml -->
<clickhouse>
    <storage_configuration>
        <disks>
            <!-- Hot tier: Fast NVMe -->
            <nvme>
                <path>/mnt/nvme/clickhouse/</path>
            </nvme>

            <!-- Warm tier: SSD -->
            <ssd>
                <path>/mnt/ssd/clickhouse/</path>
            </ssd>

            <!-- Cold tier: HDD or S3 -->
            <s3_cold>
                <type>s3</type>
                <endpoint>https://s3.amazonaws.com/my-bucket/cold/</endpoint>
                <access_key_id>xxx</access_key_id>
                <secret_access_key>xxx</secret_access_key>
            </s3_cold>
        </disks>

        <policies>
            <tiered>
                <volumes>
                    <hot>
                        <disk>nvme</disk>
                    </hot>
                    <warm>
                        <disk>ssd</disk>
                    </warm>
                    <cold>
                        <disk>s3_cold</disk>
                    </cold>
                </volumes>
            </tiered>
        </policies>
    </storage_configuration>
</clickhouse>
```

### Create Tiered Table

```sql
CREATE TABLE events_tiered (
    timestamp DateTime,
    event_type String,
    user_id UInt64,
    data String
) ENGINE = MergeTree()
PARTITION BY toYYYYMM(timestamp)
ORDER BY (event_type, timestamp)
TTL
    timestamp + INTERVAL 7 DAY TO VOLUME 'warm',
    timestamp + INTERVAL 30 DAY TO VOLUME 'cold',
    timestamp + INTERVAL 365 DAY DELETE
SETTINGS storage_policy = 'tiered';
```

## Monitoring Tiered Storage

```sql
-- Data distribution across volumes
SELECT
    disk_name,
    partition,
    formatReadableSize(sum(bytes_on_disk)) AS size,
    sum(rows) AS rows
FROM system.parts
WHERE table = 'events_tiered' AND active
GROUP BY disk_name, partition
ORDER BY partition DESC;

-- Storage policy status
SELECT
    policy_name,
    volume_name,
    disks
FROM system.storage_policies;
```

## Manual Data Movement

```sql
-- Move specific partition to cold storage
ALTER TABLE events_tiered
MOVE PARTITION '202401' TO VOLUME 'cold';

-- Move data older than date
ALTER TABLE events_tiered
MOVE PARTITION ID 'all'
WHERE timestamp < '2024-01-01'
TO VOLUME 'cold';
```

## Cost Optimization

| Tier | Storage Type | Cost/TB/mo | Access Latency |
|------|--------------|------------|----------------|
| Hot | NVMe | $100-200 | <1ms |
| Warm | SSD | $30-50 | 1-5ms |
| Cold | S3 | $5-20 | 50-200ms |

## Conclusion

Data tiering in ClickHouse provides:

1. **Cost optimization** by using cheaper storage for old data
2. **Performance** by keeping recent data on fast storage
3. **Automatic movement** via TTL rules
4. **Flexible policies** for different data patterns

Configure tiering based on your access patterns and budget requirements.
