# How to Use Vitess for MySQL Horizontal Scaling

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: MySQL, Vitess, Horizontal Scaling, Sharding, Kubernetes

Description: Use Vitess to horizontally scale MySQL by adding transparent sharding, connection pooling, and query planning across multiple MySQL instances.

---

## What is Vitess?

Vitess is a database clustering system for horizontal scaling of MySQL developed at YouTube and now a CNCF graduated project. It provides transparent sharding, connection pooling, query routing, and schema management across many MySQL instances while remaining compatible with MySQL client protocols.

## Core Vitess Components

```text
[Application] --> [VTGate] --> [VTTablet] --> [MySQL]
                      |
                 [Topology Store]
                 (etcd/ZooKeeper)
```

- **VTGate** - Query router that applications connect to
- **VTTablet** - Sidecar process alongside each MySQL instance
- **VTorc** - Topology-aware orchestration and auto-failover
- **Topology store** - etcd or ZooKeeper for cluster metadata

## Installation with Operator on Kubernetes

The easiest production deployment is via the Vitess Operator:

```bash
# Install the Vitess Operator
kubectl apply -f https://github.com/planetscale/vitess-operator/releases/latest/download/operator.yaml
```

## Local Development Setup with vtctldclient

For local testing, use the `vitess` Docker image:

```bash
docker run -d --name vitess \
  -p 3306:3306 \
  -p 15000:15000 \
  -p 15001:15001 \
  vitess/vttestserver:latest \
  --alsologtostderr \
  --port=15000 \
  --grpc_port=15001 \
  --mysql_port=3306 \
  --keyspaces=commerce \
  --num_shards=2 \
  --mysql_bind_host=0.0.0.0
```

## Connecting to Vitess

Applications connect to VTGate using the standard MySQL protocol:

```bash
mysql -u user -h 127.0.0.1 -P 3306 commerce
```

## Defining a Keyspace and Sharding Key

A keyspace is a logical database. Sharding splits a keyspace across multiple shards based on a vindex (sharding key):

```sql
-- Create a table with a sharding key (customer_id)
CREATE TABLE orders (
    order_id    BIGINT NOT NULL AUTO_INCREMENT,
    customer_id BIGINT NOT NULL,
    amount      DECIMAL(10,2),
    PRIMARY KEY (order_id)
) ENGINE=InnoDB;
```

Define the vschema (Vitess schema) to tell Vitess how to shard:

```json
{
  "sharded": true,
  "vindexes": {
    "hash": {
      "type": "hash"
    }
  },
  "tables": {
    "orders": {
      "column_vindexes": [
        {
          "column": "customer_id",
          "name": "hash"
        }
      ],
      "auto_increment": {
        "column": "order_id",
        "sequence": "orders_seq"
      }
    }
  }
}
```

Apply the vschema:

```bash
vtctldclient ApplyVSchema --vschema-file=vschema.json commerce
```

## Resharding: Splitting Shards

When a shard grows too large, you can split it without downtime:

```bash
# Start the workflow to reshard from 2 to 4 shards
vtctldclient Reshard --workflow=reshard2to4 --target-keyspace=commerce \
  create --source-shards="-80,80-" --target-shards="-40,40-80,80-c0,c0-"

# Monitor progress
vtctldclient Workflow show --keyspace=commerce --workflow=reshard2to4

# Switch reads
vtctldclient Reshard --workflow=reshard2to4 --target-keyspace=commerce \
  switchtraffic --tablet-types=rdonly,replica

# Switch writes (cutover)
vtctldclient Reshard --workflow=reshard2to4 --target-keyspace=commerce \
  switchtraffic --tablet-types=primary
```

## Connection Pooling

VTTablet manages MySQL connections efficiently:

```ini
# VTTablet flags
--queryserver-config-pool-size=16
--queryserver-config-stream-pool-size=200
--queryserver-config-transaction-cap=20
```

## Monitoring Vitess

```bash
# Vitess exposes Prometheus metrics on the VTGate web port
curl http://localhost:15001/metrics | grep vtgate
```

Key metrics to monitor:
- `vtgate_api_count` - API calls by operation and keyspace
- `vtgate_api_error_count` - API errors by operation and code
- `vtgate_queries_processed_total` - total queries processed by plan type

## Summary

Vitess enables horizontal MySQL scaling by adding a transparent routing layer (VTGate) in front of MySQL instances, with VTTablet managing each MySQL node. Sharding is defined via vschema files that map table columns to sharding functions (vindexes), and resharding can be performed online without application downtime. Applications connect using standard MySQL protocol, making Vitess largely transparent to existing code.
