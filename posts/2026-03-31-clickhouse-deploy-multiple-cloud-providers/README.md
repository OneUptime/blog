# How to Deploy ClickHouse Across Multiple Cloud Providers

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: ClickHouse, Multi-Cloud, Deployment, Kubernetes, High Availability

Description: Deploy ClickHouse clusters across AWS, GCP, and Azure simultaneously to achieve vendor independence, geographic redundancy, and cloud-agnostic analytics.

---

Running ClickHouse across multiple cloud providers protects against vendor lock-in and regional outages. The key challenges are cross-cloud networking, consistent configuration, and coordinating replication.

## Architecture Overview

- One shard, three replicas total (one per cloud).
- ClickHouse Keeper runs as a three-node ensemble with one node per cloud.
- A VPN mesh (e.g., WireGuard or a managed solution) connects the clouds.

## Network Setup

Each cloud needs a private subnet with overlapping CIDR ranges avoided:

```text
AWS  VPC: 10.1.0.0/16
GCP  VPC: 10.2.0.0/16
Azure VNet: 10.3.0.0/16
```

Establish site-to-site VPN tunnels between all three. Test round-trip latency - anything above 50 ms will impact replication throughput.

## ClickHouse Keeper Config (all three nodes)

```xml
<keeper_server>
    <tcp_port>9181</tcp_port>
    <server_id>1</server_id>   <!-- unique per node: 1, 2, 3 -->
    <raft_configuration>
        <server><id>1</id><hostname>keeper-aws</hostname><port>9234</port></server>
        <server><id>2</id><hostname>keeper-gcp</hostname><port>9234</port></server>
        <server><id>3</id><hostname>keeper-az</hostname><port>9234</port></server>
    </raft_configuration>
</keeper_server>
```

## Replicated Table Definition

```sql
CREATE TABLE events ON CLUSTER 'multi_cloud'
(
    id   UInt64,
    data String,
    ts   DateTime DEFAULT now()
)
ENGINE = ReplicatedMergeTree(
    '/clickhouse/tables/{shard}/events',
    '{replica}'
)
PARTITION BY toYYYYMM(ts)
ORDER BY (id, ts);
```

## Deployment with Helm on Each Cloud

```bash
helm repo add clickhouse-operator \
  https://docs.altinity.com/clickhouse-operator/

# Run on each cloud's kubectl context
helm install clickhouse clickhouse-operator/clickhouse \
  --set cluster.name=multi_cloud \
  --values values-aws.yaml   # or values-gcp.yaml, values-azure.yaml
```

## Monitoring Cross-Cloud Replication

Track `system.replication_queue` size and `system.replicas` `is_leader` flag on all nodes using [OneUptime](https://oneuptime.com). Alert when replication lag exceeds 60 seconds.

## Summary

Multi-cloud ClickHouse requires a VPN mesh, a cross-cloud Keeper ensemble, and consistent cluster configuration. Helm charts and ReplicatedMergeTree handle the distribution; the main operational challenge is network latency and replication monitoring.
