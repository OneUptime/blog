# How to Configure Dapr with CockroachDB State Store

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Dapr, CockroachDB, State Store, Configuration, Distributed Database

Description: Learn how to configure the Dapr CockroachDB state store component for globally distributed, ACID-compliant state persistence in cloud-native microservices.

---

CockroachDB is a distributed SQL database that provides ACID transactions, automatic sharding, and multi-region capabilities. Using it as a Dapr state store gives your microservices strongly consistent state with the resilience of a distributed database.

## Prerequisites

- Dapr CLI installed and initialized
- CockroachDB cluster (local, CockroachDB Serverless, or self-hosted)

## Running CockroachDB Locally

```bash
# Start a single-node local cluster
cockroach start-single-node --insecure --listen-addr=localhost:26257

# Or via Docker
docker run -d \
  --name cockroachdb \
  -p 26257:26257 \
  -p 8080:8080 \
  cockroachdb/cockroach:latest start-single-node \
  --insecure
```

Create the state database:

```bash
cockroach sql --insecure --host=localhost:26257 -e "CREATE DATABASE daprstate;"
```

## Creating the CockroachDB State Store Component

Dapr provides a dedicated CockroachDB state store component (`state.cockroachdb`) that leverages CockroachDB's PostgreSQL-compatible wire protocol:

```yaml
# components/cockroachdb-statestore.yaml
apiVersion: dapr.io/v1alpha1
kind: Component
metadata:
  name: statestore
spec:
  type: state.cockroachdb
  version: v1
  metadata:
    - name: connectionString
      secretKeyRef:
        name: cockroachdb-secret
        key: connection-string
    - name: actorStateStore
      value: "true"
    - name: cleanupIntervalInSeconds
      value: "3600"
    - name: tableName
      value: "dapr_state"
```

Store the connection string:

```bash
# Insecure local cluster
kubectl create secret generic cockroachdb-secret \
  --from-literal=connection-string="postgresql://root@localhost:26257/daprstate?sslmode=disable"

# Secure cluster with certificates
kubectl create secret generic cockroachdb-secret \
  --from-literal=connection-string="postgresql://dapruser@localhost:26257/daprstate?sslmode=verify-full&sslrootcert=/certs/ca.crt"
```

## Connecting to CockroachDB Serverless

CockroachDB Serverless offers a free tier suitable for development:

```bash
# Connection string from CockroachDB Cloud console
kubectl create secret generic cockroachdb-secret \
  --from-literal=connection-string="postgresql://dapruser:password@free-tier.cockroachlabs.cloud:26257/daprstate?sslmode=verify-full&options=--cluster%3Dmy-cluster-123"
```

## Setting Up a User for Dapr

```sql
-- Create a dedicated Dapr user
CREATE USER dapruser WITH PASSWORD 'secure-password';

-- Grant permissions
GRANT ALL ON DATABASE daprstate TO dapruser;
USE daprstate;
GRANT ALL ON SCHEMA public TO dapruser;
```

## Basic State Operations

```bash
# Save state with strong consistency
curl -X POST http://localhost:3500/v1.0/state/statestore \
  -H "Content-Type: application/json" \
  -d '[{
    "key": "order:ORD-2026-001",
    "value": {
      "customerId": "cust-456",
      "items": [{"sku": "A1", "qty": 2}],
      "total": 59.98,
      "status": "confirmed"
    },
    "options": {"consistency": "strong"}
  }]'

# Atomic multi-key transaction
curl -X POST http://localhost:3500/v1.0/state/statestore/transaction \
  -H "Content-Type: application/json" \
  -d '{
    "operations": [
      {
        "operation": "upsert",
        "request": {"key": "inventory:A1", "value": {"stock": 48}}
      },
      {
        "operation": "upsert",
        "request": {"key": "order:ORD-2026-001", "value": {"status": "fulfilled"}}
      }
    ]
  }'
```

## Multi-Region Configuration

CockroachDB's real strength is multi-region deployment. Configure region-aware placement:

```sql
-- Set table locality for low-latency reads in specific regions
ALTER TABLE dapr_state SET LOCALITY REGIONAL BY ROW;
```

For multi-region clusters, the connection string points to any node:

```yaml
    - name: connectionString
      value: "postgresql://dapruser:pass@cockroachdb-lb:26257/daprstate?sslmode=verify-full"
```

## Inspecting State in CockroachDB

```sql
-- Connect
cockroach sql --url="postgresql://dapruser@localhost:26257/daprstate?sslmode=disable"

-- List state entries
SELECT key, updatetime FROM dapr_state ORDER BY updatetime DESC LIMIT 20;

-- Check state value
SELECT key, value FROM dapr_state WHERE key = 'order:ORD-2026-001';

-- Monitor transaction performance
SELECT * FROM crdb_internal.active_queries;
```

## Summary

The Dapr CockroachDB state store combines the familiar PostgreSQL interface with CockroachDB's distributed resilience and multi-region capabilities. It is particularly valuable for globally distributed applications that need ACID-compliant state without managing the complexity of multi-master replication in traditional databases.
