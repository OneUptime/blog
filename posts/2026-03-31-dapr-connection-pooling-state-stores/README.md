# How to Use Connection Pooling with Dapr Database State Stores

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Dapr, Connection Pooling, State Store, Performance, Database

Description: Learn how to configure and use connection pooling with Dapr database state stores to prevent connection exhaustion and improve throughput in Kubernetes deployments.

---

## Overview

In Kubernetes, each Dapr sidecar maintains its own connection pool to the database state store. When you have dozens or hundreds of pods, each with a Dapr sidecar, the aggregate number of database connections can easily overwhelm your database. This guide covers strategies for managing connection pooling with Dapr database state stores.

## The Connection Problem

A typical deployment with 50 pods, each with a Dapr sidecar configured for 5 minimum idle connections, creates 250 idle database connections before any workload runs. Most databases have limits:

- PostgreSQL default: `max_connections = 100`
- MySQL default: `max_connections = 151`
- SQL Server default: ~32,767 (but performance degrades with hundreds)

## Option 1 - Reduce Dapr Component Pool Size

For PostgreSQL, tune the connection string directly in the component:

```yaml
apiVersion: dapr.io/v1alpha1
kind: Component
metadata:
  name: postgres-statestore
  namespace: default
spec:
  type: state.postgresql
  version: v2
  metadata:
  - name: connectionString
    value: "host=postgres dbname=daprdb user=dapr password=secret pool_max_conns=3 pool_min_conns=1 pool_max_conn_idle_time=5m"
```

## Option 2 - Deploy PgBouncer as a Sidecar Proxy

Add PgBouncer as a sidecar in the same pod to pool connections:

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: myservice
spec:
  selector:
    matchLabels:
      app: myservice
  template:
    metadata:
      labels:
        app: myservice
    spec:
      containers:
      - name: myservice
        image: myservice:latest
        ports:
        - containerPort: 8080

      - name: pgbouncer
        image: edoburu/pgbouncer:1.22.0-p0
        env:
        - name: DB_HOST
          value: "postgres.default.svc.cluster.local"
        - name: DB_NAME
          value: "daprdb"
        - name: DB_USER
          value: "dapr"
        - name: DB_PASSWORD
          valueFrom:
            secretKeyRef:
              name: pg-secret
              key: password
        - name: POOL_MODE
          value: "transaction"
        - name: MAX_CLIENT_CONN
          value: "100"
        - name: DEFAULT_POOL_SIZE
          value: "5"
        ports:
        - containerPort: 6432
```

Update the Dapr component to connect to the local PgBouncer:

```yaml
  - name: connectionString
    value: "host=127.0.0.1 port=6432 dbname=daprdb user=dapr password=secret"
```

## Option 3 - Use a Shared Connection Pooler

Deploy a shared ProxySQL or PgBouncer as a Kubernetes service:

```yaml
apiVersion: v1
kind: Service
metadata:
  name: pgbouncer
  namespace: default
spec:
  selector:
    app: pgbouncer
  ports:
  - port: 6432
    targetPort: 6432
---
apiVersion: apps/v1
kind: Deployment
metadata:
  name: pgbouncer
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
        image: edoburu/pgbouncer:1.22.0-p0
        env:
        - name: MAX_CLIENT_CONN
          value: "1000"
        - name: DEFAULT_POOL_SIZE
          value: "20"
        - name: POOL_MODE
          value: "transaction"
```

## Monitoring Connection Usage

Check active connections per application:

```sql
-- PostgreSQL
SELECT application_name, count(*) as connections
FROM pg_stat_activity
WHERE datname = 'daprdb'
GROUP BY application_name
ORDER BY connections DESC;
```

```bash
# PgBouncer stats
psql -h pgbouncer -p 6432 -U pgbouncer pgbouncer \
  -c "SHOW POOLS;"
```

## Summary

Connection pooling is critical for Dapr deployments that use relational database state stores at scale. Start by tuning pool sizes in the Dapr component's connection string, then deploy PgBouncer or ProxySQL to aggregate connections. The shared pooler approach scales best in large Kubernetes deployments with many Dapr sidecars.
