# How to Configure Dapr with Apache Cassandra State Store

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Dapr, Cassandra, State Store, Configuration, Microservice

Description: Learn how to configure the Dapr Apache Cassandra state store component for high-throughput, distributed state persistence with tunable consistency in microservices.

---

Apache Cassandra provides a distributed, highly available state store with linear scalability and tunable consistency. Dapr's Cassandra state store component is ideal for high-write workloads, IoT state management, and applications that need multi-region state distribution.

## Prerequisites

- Dapr CLI installed and initialized
- Cassandra cluster (local Docker or managed service like DataStax Astra)

## Running Cassandra Locally

```bash
docker run -d \
  --name cassandra \
  -e CASSANDRA_CLUSTER_NAME=DaprCluster \
  -p 9042:9042 \
  cassandra:4.1

# Wait for Cassandra to start (takes ~60 seconds)
docker logs -f cassandra | grep -m 1 "Starting listening for CQL clients"
```

## Creating the Cassandra Keyspace

```bash
docker exec -it cassandra cqlsh

# In cqlsh:
CREATE KEYSPACE daprstate
WITH replication = {
  'class': 'SimpleStrategy',
  'replication_factor': 1
};
```

For production with NetworkTopologyStrategy:

```sql
CREATE KEYSPACE daprstate
WITH replication = {
  'class': 'NetworkTopologyStrategy',
  'datacenter1': 3,
  'datacenter2': 3
};
```

## Creating the Cassandra State Store Component

```yaml
# components/cassandra-statestore.yaml
apiVersion: dapr.io/v1alpha1
kind: Component
metadata:
  name: statestore
spec:
  type: state.cassandra
  version: v1
  metadata:
    - name: hosts
      value: "localhost"
    - name: port
      value: "9042"
    - name: username
      value: "cassandra"
    - name: password
      secretKeyRef:
        name: cassandra-secret
        key: password
    - name: keyspace
      value: "daprstate"
    - name: table
      value: "dapr_state"
    - name: replicationFactor
      value: "1"
    - name: consistency
      value: "QUORUM"
    - name: protoVersion
      value: "4"
```

Store credentials:

```bash
kubectl create secret generic cassandra-secret \
  --from-literal=password=cassandra
```

## Connecting to Multiple Cassandra Nodes

```yaml
    - name: hosts
      value: "cassandra-0.cassandra,cassandra-1.cassandra,cassandra-2.cassandra"
```

## Connecting to DataStax Astra DB

For DataStax Astra (managed Cassandra-as-a-Service):

```yaml
    - name: hosts
      value: "your-db-id-region.db.astra.datastax.com"
    - name: port
      value: "29042"
    - name: username
      value: "token"
    - name: password
      secretKeyRef:
        name: astra-secret
        key: application-token
    - name: keyspace
      value: "your_keyspace"
```

## Basic State Operations

```bash
# Save high-throughput state (IoT sensor data)
curl -X POST http://localhost:3500/v1.0/state/statestore \
  -H "Content-Type: application/json" \
  -d '[{
    "key": "sensor:device-001:latest",
    "value": {
      "temperature": 23.5,
      "humidity": 65.2,
      "timestamp": "2026-03-31T10:00:00Z"
    }
  }]'

# Get state
curl http://localhost:3500/v1.0/state/statestore/sensor:device-001:latest
```

## Tuning Consistency

Cassandra provides tunable consistency levels:

```yaml
    - name: consistency
      value: "ONE"       # Fastest, lowest consistency
      # value: "QUORUM"  # Balanced - recommended for most use cases
      # value: "ALL"     # Strongest consistency, slowest
      # value: "LOCAL_QUORUM"  # For multi-datacenter deployments
```

## Inspecting Cassandra State

```sql
-- Connect to Cassandra
docker exec -it cassandra cqlsh

-- List state table
USE daprstate;
SELECT key, value FROM dapr_state LIMIT 20;

-- Get specific state
SELECT key, value FROM dapr_state WHERE key = 'sensor:device-001:latest';
```

## Summary

The Dapr Cassandra state store is purpose-built for high-throughput, distributed state workloads where linear scalability and multi-region replication are requirements. Tuning consistency level to QUORUM provides the right balance between availability and consistency for most production use cases.
