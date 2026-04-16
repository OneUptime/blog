# How to Set Up ClickHouse Hybrid Cloud-On-Premise Architecture

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: ClickHouse, Hybrid Cloud, On-Premise, Architecture, Replication

Description: Configure a ClickHouse hybrid architecture where on-premise nodes hold hot data and cloud replicas handle read scaling and disaster recovery.

---

A hybrid architecture lets you keep sensitive or high-throughput data on-premise while offloading read replicas and cold storage to the cloud. ClickHouse supports this natively through ReplicatedMergeTree and remote disk (S3/GCS/Azure Blob).

## Topology

```text
On-Premise (primary shard, 2 replicas)
  ch-onprem-01  <-->  ch-onprem-02

Cloud (read replica + S3 tiering)
  ch-cloud-01 (replica of on-prem shard)
  S3 cold storage tier
```

## Keeper Ensemble

Run three Keeper nodes: two on-premise, one in the cloud. This gives quorum even if the cloud node is unreachable.

```xml
<keeper_server>
    <raft_configuration>
        <server><id>1</id><hostname>keeper-onprem-01</hostname><port>9234</port></server>
        <server><id>2</id><hostname>keeper-onprem-02</hostname><port>9234</port></server>
        <server><id>3</id><hostname>keeper-cloud-01</hostname><port>9234</port></server>
    </raft_configuration>
</keeper_server>
```

## S3 Storage Policy for Cloud Tiering

On `ch-cloud-01`, configure an S3-backed disk:

```xml
<storage_configuration>
    <disks>
        <s3>
            <type>s3</type>
            <endpoint>https://s3.us-east-1.amazonaws.com/my-ch-bucket/</endpoint>
            <access_key_id>...</access_key_id>
            <secret_access_key>...</secret_access_key>
        </s3>
    </disks>
    <policies>
        <tiered>
            <volumes>
                <hot><disk>default</disk></hot>
                <cold><disk>s3</disk></cold>
            </volumes>
            <move_factor>0.2</move_factor>
        </tiered>
    </policies>
</storage_configuration>
```

## Table with Tiering

```sql
CREATE TABLE events ON CLUSTER 'hybrid'
(
    id   UInt64,
    data String,
    ts   DateTime
)
ENGINE = ReplicatedMergeTree(
    '/clickhouse/tables/shard1/events', '{replica}'
)
PARTITION BY toYYYYMM(ts)
ORDER BY (id, ts)
SETTINGS storage_policy = 'tiered';
```

## Routing Reads to the Cloud Replica

Point BI tools and reporting workloads to `ch-cloud-01`. Writes go to on-premise nodes only. This prevents analytics queries from impacting transactional latency.

## Monitoring

Alert via [OneUptime](https://oneuptime.com) when replication lag between on-premise and cloud exceeds 5 minutes, which may indicate a network issue on the VPN link.

## Summary

Hybrid ClickHouse architecture combines on-premise write performance with cloud read scalability and cold S3 tiering. Keeper's quorum model makes the setup resilient to temporary cloud connectivity issues.
