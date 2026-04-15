# How to Use Cassandra Replication with Dapr State Store

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Dapr, Cassandra, Replication, State Store, Distributed Database, NoSQL

Description: Configure Apache Cassandra with multi-datacenter replication as a Dapr state store for high-availability, write-optimized stateful microservices.

---

## Overview

Apache Cassandra is designed for massive write throughput with linear horizontal scalability and multi-datacenter replication. Dapr's Cassandra state store component leverages these capabilities for high-volume stateful microservices that need write-optimized, geo-distributed state storage.

## Cassandra Cluster Setup

Deploy a Cassandra cluster with Helm:

```bash
helm repo add bitnami https://charts.bitnami.com/bitnami

helm install cassandra bitnami/cassandra \
  --set cluster.seedCount=3 \
  --set dbUser.user=dapr \
  --set dbUser.password=secret \
  --set replicaCount=3 \
  --set persistence.size=50Gi
```

## Keyspace and Table Configuration

Create a keyspace with NetworkTopologyStrategy for multi-datacenter replication:

```sql
-- Connect to Cassandra
cqlsh cassandra -u dapr -p secret

-- Create keyspace with replication
CREATE KEYSPACE dapr_state
  WITH REPLICATION = {
    'class': 'NetworkTopologyStrategy',
    'us-east': 3,
    'eu-west': 2
  }
  AND DURABLE_WRITES = true;

USE dapr_state;

-- Dapr creates the table, but verify it was created correctly
DESCRIBE TABLE state;

-- Note: Dapr's Cassandra state store does not support TTL via ttlInSeconds metadata.
-- To use TTL, set it directly in CQL with INSERT ... USING TTL.
```

## Dapr Component Configuration

```yaml
apiVersion: dapr.io/v1alpha1
kind: Component
metadata:
  name: cassandra-state
  namespace: default
spec:
  type: state.cassandra
  version: v1
  metadata:
  - name: hosts
    value: "cassandra-0.cassandra.default.svc.cluster.local,cassandra-1.cassandra.default.svc.cluster.local"
  - name: username
    secretKeyRef:
      name: cassandra-secret
      key: username
  - name: password
    secretKeyRef:
      name: cassandra-secret
      key: password
  - name: keyspace
    value: "dapr_state"
  - name: table
    value: "state"
  - name: consistency
    value: "QUORUM"
  - name: replicationFactor
    value: "3"
  - name: protoVersion
    value: "4"
  - name: dataCenter
    value: "us-east"
```

## Consistency Level Trade-offs

Choose the consistency level based on your CAP requirements:

```yaml
# Strongest consistency (R + W > N guarantees strong consistency, not linearizability)
  - name: consistency
    value: "QUORUM"

# Local quorum for multi-datacenter (lower latency, same local consistency)
  - name: consistency
    value: "LOCAL_QUORUM"

# Eventual consistency (highest throughput, no cross-DC coordination)
  - name: consistency
    value: "ONE"
```

## Saving State

```go
package main

import (
    "context"
    "encoding/json"
    "fmt"
    dapr "github.com/dapr/go-sdk/client"
)

func saveSessionData(sessionID string, sessionData interface{}) error {
    client, _ := dapr.NewClient()
    defer client.Close()

    ctx := context.Background()

    data, err := json.Marshal(sessionData)
    if err != nil {
        return err
    }

    // Note: Dapr's Cassandra state store does not support TTL via ttlInSeconds metadata.
    return client.SaveState(ctx, "cassandra-state",
        fmt.Sprintf("session:%s", sessionID),
        data,
        nil,
    )
}
```

## Compaction Strategy for State Data

Tune compaction for write-heavy state patterns:

```sql
-- Use LeveledCompactionStrategy for read-heavy state
ALTER TABLE dapr_state.state
  WITH compaction = {
    'class': 'LeveledCompactionStrategy',
    'sstable_size_in_mb': '160'
  };

-- Use TWCS for time-series state with TTLs
ALTER TABLE dapr_state.state
  WITH compaction = {
    'class': 'TimeWindowCompactionStrategy',
    'compaction_window_size': '1',
    'compaction_window_unit': 'HOURS'
  };
```

## Monitoring Cassandra Health

```bash
# Check cluster status
nodetool status

# View key metrics
nodetool tpstats

# Check read/write latency
nodetool tablestats dapr_state.state | grep -E "Read|Write"

# Monitor pending compactions
nodetool compactionstats
```

## Summary

Cassandra with Dapr state store is ideal for write-intensive workloads that require linear horizontal scalability and multi-datacenter replication. LOCAL_QUORUM consistency balances performance and reliability in multi-datacenter deployments. TimeWindowCompactionStrategy optimizes disk usage when state data has TTLs set natively in CQL, automatically reclaiming space from expired entries without manual maintenance. Note that Dapr's Cassandra state store does not support TTL via the `ttlInSeconds` metadata — use Cassandra's native `USING TTL` clause directly if you need expiring data.
