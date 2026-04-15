# How to Configure Cassandra Consistency Levels for Dapr

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Dapr, Cassandra, Consistency, State Store, Distributed Database

Description: Learn how to configure Cassandra consistency levels for Dapr state operations to balance availability, durability, and read performance in multi-datacenter deployments.

---

## Cassandra Consistency Levels in Dapr

Cassandra's tunable consistency model lets you choose the tradeoff between consistency and availability per operation. Dapr's Cassandra state store component exposes `consistency` metadata that maps to Cassandra's consistency levels. Choosing the right level affects whether Dapr state operations require acknowledgement from one node, a quorum, or all replicas.

## Dapr Cassandra State Store Component

```yaml
apiVersion: dapr.io/v1alpha1
kind: Component
metadata:
  name: cassandra-statestore
  namespace: production
spec:
  type: state.cassandra
  version: v1
  metadata:
  - name: hosts
    value: "cassandra-0.cassandra.svc,cassandra-1.cassandra.svc,cassandra-2.cassandra.svc"
  - name: username
    secretKeyRef:
      name: cassandra-secret
      key: username
  - name: password
    secretKeyRef:
      name: cassandra-secret
      key: password
  - name: port
    value: "9042"
  - name: keyspace
    value: "daprstate"
  - name: table
    value: "state"
  - name: consistency
    value: "QUORUM"
  - name: replicationFactor
    value: "3"
  - name: protoVersion
    value: "4"
```

## Understanding Consistency Levels

| Level | Write Acks Required | Read Sources | Use Case |
|---|---|---|---|
| ONE | 1 node | 1 node | High availability, tolerate stale reads |
| QUORUM | majority | majority | Balanced consistency and availability |
| LOCAL_QUORUM | majority in local DC | majority in local DC | Multi-DC, avoid cross-DC latency |
| ALL | all nodes | all nodes | Maximum consistency, reduced availability |
| LOCAL_ONE | 1 node in local DC | 1 node in local DC | Lowest latency, may read stale |

## Setting Consistency Level in Dapr

The `consistency` metadata field applies to both reads and writes:

```yaml
# For financial data - use QUORUM
- name: consistency
  value: "QUORUM"

# For user sessions - use LOCAL_QUORUM in multi-DC
- name: consistency
  value: "LOCAL_QUORUM"

# For analytics counters - use ONE for performance
- name: consistency
  value: "ONE"
```

## Creating the Keyspace and Table

```sql
CREATE KEYSPACE IF NOT EXISTS daprstate
WITH replication = {
    'class': 'NetworkTopologyStrategy',
    'dc1': 3,
    'dc2': 3
} AND durable_writes = true;

CREATE TABLE IF NOT EXISTS daprstate.state (
    key    TEXT,
    value  BLOB,
    PRIMARY KEY (key)
) WITH default_time_to_live = 0
AND compaction = {'class': 'LeveledCompactionStrategy'};
```

## Testing Consistency

Write state and verify it is readable:

```python
from dapr.clients import DaprClient
import json

def test_cassandra_consistency():
    with DaprClient() as client:
        key = "order:consistency-test"

        client.save_state(
            store_name="cassandra-statestore",
            key=key,
            value=json.dumps({"status": "confirmed", "amount": 149.99})
        )

        response = client.get_state(
            store_name="cassandra-statestore",
            key=key
        )

        data = json.loads(response.data)
        assert data["status"] == "confirmed"
        print(f"Consistency test passed: {data}")

test_cassandra_consistency()
```

## Multi-DC Consistency Strategy

For multi-datacenter Cassandra deployments, use `LOCAL_QUORUM` to avoid cross-DC write latency while still maintaining consistency within each datacenter:

```yaml
- name: consistency
  value: "LOCAL_QUORUM"
```

Monitor consistency violations using nodetool:

```bash
kubectl exec -n cassandra cassandra-0 -- \
  nodetool tablestats daprstate.state | grep -E "(read|write|latency)"
```

## Summary

Cassandra consistency levels in Dapr balance durability against availability and latency. Use `QUORUM` for transactional state like orders and payments where consistency matters most. Use `LOCAL_QUORUM` in multi-datacenter deployments to avoid cross-DC write latency. Use `ONE` or `LOCAL_ONE` only for non-critical, high-throughput counters where stale reads are acceptable.
