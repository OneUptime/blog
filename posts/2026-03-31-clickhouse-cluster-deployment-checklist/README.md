# ClickHouse Cluster Deployment Checklist

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: ClickHouse, Cluster, Deployment, Checklist, Replication

Description: A cluster deployment checklist for ClickHouse covering topology planning, Keeper configuration, network setup, and post-deployment validation.

---

Deploying a ClickHouse cluster requires coordinating multiple components: compute nodes, ClickHouse Keeper for coordination, distributed tables, and network configuration. This checklist walks through each phase.

## Topology Planning

```text
[ ] Determine number of shards based on data volume and query parallelism
[ ] Determine replicas per shard (2 minimum for HA, 3 for quorum reads)
[ ] Plan ClickHouse Keeper nodes: 3 for quorum (must be odd number)
[ ] Decide whether Keeper runs on dedicated nodes or colocated with ClickHouse
[ ] Assign static IP addresses or DNS names to all nodes
[ ] Document cluster topology in a diagram
```

## Network Prerequisites

```text
[ ] All ClickHouse nodes can reach each other on port 9000 (native) and 9009 (inter-server)
[ ] All nodes can reach Keeper nodes on port 9181 (Keeper client) and 9234 (Raft)
[ ] Firewall rules configured for all required ports
[ ] Network bandwidth tested between nodes (minimum 1Gbps, 10Gbps recommended)
[ ] Hostnames resolvable across all nodes (/etc/hosts or DNS)
```

## ClickHouse Keeper Deployment

```text
[ ] Keeper configuration deployed to 3 nodes with unique server_id values
[ ] Keeper started and quorum formed (check logs for "leader elected")
[ ] Keeper connection tested from ClickHouse nodes
```

```bash
# Test Keeper connectivity from ClickHouse node
echo "ruok" | nc keeper-node-1 9181
# Expected response: imok
```

## ClickHouse Node Configuration

```text
[ ] config.xml macros set correctly on each node ({shard} and {replica})
[ ] remote_servers block pointing to all nodes in cluster
[ ] Keeper connection configured in zookeeper section
[ ] Interserver HTTP secret set (same value on all nodes)
[ ] listen_host set to node's actual interface
```

```xml
<!-- /etc/clickhouse-server/config.d/macros.xml on shard 1, replica 1 -->
<clickhouse>
  <macros>
    <shard>01</shard>
    <replica>replica-1</replica>
    <cluster>production</cluster>
  </macros>
</clickhouse>
```

## Schema Deployment

```sql
-- Create replicated table on all nodes
CREATE TABLE events ON CLUSTER production (
    event_time DateTime,
    user_id UInt32,
    event_type String
) ENGINE = ReplicatedMergeTree(
    '/clickhouse/tables/{shard}/events',
    '{replica}'
)
ORDER BY (user_id, event_time)
PARTITION BY toYYYYMM(event_time);

-- Create distributed table
CREATE TABLE events_dist ON CLUSTER production
AS events
ENGINE = Distributed(production, default, events, user_id);
```

## Post-Deployment Validation

```sql
-- Verify all shards and replicas are online
SELECT * FROM system.clusters WHERE cluster = 'production';

-- Verify replication is working
INSERT INTO events_dist VALUES (now(), 1, 'test');
SELECT count() FROM events_dist WHERE event_type = 'test';

-- Check replication lag
SELECT database, table, replica_name, is_leader, absolute_delay
FROM system.replicas;
```

## Summary

A successful ClickHouse cluster deployment depends on getting the foundation right: correct network topology, a working Keeper quorum, consistent macro configuration across nodes, and validated replication before onboarding production traffic. Test each layer independently before proceeding to the next.
