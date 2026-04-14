# How to Configure PostgreSQL Connection Pooling for Dapr

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Dapr, PostgreSQL, Connection Pool, State Store, Performance

Description: Learn how to configure PostgreSQL connection pooling for Dapr state stores using PgBouncer and native pool settings to optimize throughput and resource usage.

---

## Why Connection Pooling Matters for Dapr

Each Dapr sidecar maintains its own database connection pool to PostgreSQL. In a cluster with 50 pods, you could have 50 x N connections open simultaneously. PostgreSQL's default `max_connections` limit is 100, making connection pooling essential for production deployments. PgBouncer provides transaction-mode pooling that dramatically reduces the number of live backend connections.

## Deploying PgBouncer in Kubernetes

Deploy PgBouncer as a sidecar or shared service:

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: pgbouncer
  namespace: db
spec:
  replicas: 2
  selector:
    matchLabels:
      app: pgbouncer
  template:
    metadata:
      labels:
        app: pgbouncer
    spec:
      containers:
      - name: pgbouncer
        image: bitnami/pgbouncer:1.22.0
        env:
        - name: POSTGRESQL_HOST
          value: "postgres.db.svc.cluster.local"
        - name: POSTGRESQL_PORT
          value: "5432"
        - name: POSTGRESQL_USERNAME
          value: "dapr"
        - name: POSTGRESQL_PASSWORD
          valueFrom:
            secretKeyRef:
              name: pg-secret
              key: password
        - name: PGBOUNCER_POOL_MODE
          value: "transaction"
        - name: PGBOUNCER_MAX_CLIENT_CONN
          value: "500"
        - name: PGBOUNCER_DEFAULT_POOL_SIZE
          value: "20"
        - name: PGBOUNCER_PORT
          value: "6432"
        ports:
        - containerPort: 6432
```

## Dapr PostgreSQL State Store Component

Point the Dapr component at PgBouncer:

```yaml
apiVersion: dapr.io/v1alpha1
kind: Component
metadata:
  name: pg-statestore
  namespace: production
spec:
  type: state.postgresql
  version: v2
  metadata:
  - name: connectionString
    secretKeyRef:
      name: pg-dapr-secret
      key: connectionString
  - name: tablePrefix
    value: "dapr."
  - name: timeout
    value: "20s"
  - name: maxConns
    value: "5"
  - name: connectionMaxIdleTime
    value: "5m"
  - name: cleanupInterval
    value: "1h"
```

Create the connection string secret, pointing at PgBouncer:

```bash
kubectl create secret generic pg-dapr-secret \
  --namespace production \
  --from-literal=connectionString="host=pgbouncer.db.svc.cluster.local port=6432 user=dapr password=secret dbname=appstate sslmode=require"
```

## Schema Initialization

Dapr's PostgreSQL state store requires a table. Let Dapr create it automatically, or create it manually:

```sql
CREATE SCHEMA IF NOT EXISTS dapr;

CREATE TABLE IF NOT EXISTS dapr.state (
    key         TEXT NOT NULL PRIMARY KEY,
    value       BYTEA NOT NULL,
    etag        UUID NOT NULL DEFAULT gen_random_uuid(),
    created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at  TIMESTAMPTZ,
    expires_at  TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS state_expires_at_idx
    ON dapr.state (expires_at)
    WHERE expires_at IS NOT NULL;
```

## Tuning Pool Size Per Sidecar

With 50 pods and `maxConns: 5`, Dapr will use at most 250 connections to PgBouncer. PgBouncer then multiplies down to 20 real backend connections. Calculate the target pool size:

```bash
# Formula: (total_pods * maxConns) / pgbouncer_default_pool_size = connections per pool
# Example: (50 * 5) / 20 = 12.5 -> set default_pool_size=15 in PgBouncer
echo "Expected backend connections: $((50 * 5))"
```

## Verifying Connection Pool Usage

Monitor active connections in PgBouncer:

```bash
kubectl exec -n db deploy/pgbouncer -- \
  psql -h localhost -p 6432 -U pgbouncer pgbouncer -c "SHOW POOLS;"
```

Expected output shows `cl_active` (client connections) well above `sv_active` (backend connections), confirming multiplexing is working.

## Summary

Configuring PgBouncer in transaction-pool mode between Dapr sidecars and PostgreSQL multiplexes hundreds of client connections down to tens of backend connections, staying well within PostgreSQL's `max_connections` limit. Setting `maxConns` in the Dapr component limits per-pod pool size, and calculating total expected connections before deployment prevents connection exhaustion in production.
