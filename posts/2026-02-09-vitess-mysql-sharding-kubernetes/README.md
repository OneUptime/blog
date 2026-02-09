# Using Vitess for MySQL Horizontal Sharding on Kubernetes

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Vitess, MySQL, Sharding, Kubernetes, Database

Description: Learn how to deploy and operate Vitess on Kubernetes for horizontal MySQL sharding with automated resharding, connection pooling, and query routing.

---

As MySQL databases grow beyond the capacity of a single server, horizontal sharding becomes necessary. But implementing sharding at the application level is complex, error-prone, and creates tight coupling between your business logic and data distribution. Vitess, originally developed at YouTube and now a CNCF graduated project, solves this by providing a transparent sharding layer for MySQL that handles query routing, connection pooling, and online resharding. In this post, we will deploy Vitess on Kubernetes and configure horizontal sharding for a production workload.

## What Is Vitess

Vitess sits between your application and MySQL, providing a MySQL-compatible interface while transparently routing queries to the correct shard. Its architecture consists of several components:

**VTGate** is the query router. Applications connect to VTGate instead of MySQL directly. VTGate parses SQL queries, determines which shard(s) they need to reach, and routes them accordingly.

**VTTablet** runs alongside each MySQL instance and manages replication, health checking, and query serving. Each tablet belongs to a shard and has a role (primary, replica, or read-only).

**VTOrc** handles automated failover and topology management, similar to MySQL Orchestrator.

**vtctld** is the control plane that manages the topology and provides an administrative API and web interface.

**Topology Service** stores cluster metadata. On Kubernetes, this is typically etcd.

## Deploying Vitess with the Operator

The Vitess Kubernetes Operator is the recommended deployment method. Install the operator first:

```bash
kubectl apply -f https://github.com/planetscale/vitess-operator/releases/latest/download/operator.yaml
```

Now create a VitessCluster custom resource. Here is a configuration for a sharded e-commerce database:

```yaml
apiVersion: planetscale.com/v2
kind: VitessCluster
metadata:
  name: ecommerce
  namespace: vitess
spec:
  images:
    vtgate: vitess/lite:19.0
    vttablet: vitess/lite:19.0
    vtbackup: vitess/lite:19.0
    vtctld: vitess/lite:19.0
    mysqld:
      mysql80Compatible: vitess/lite:19.0
    mysqldExporter: prom/mysqld-exporter:v0.15.1

  cells:
    - name: zone1
      gateway:
        authentication:
          static:
            secret:
              name: vitess-auth
              key: users.json
        replicas: 3
        resources:
          requests:
            cpu: "2"
            memory: 2Gi
          limits:
            cpu: "4"
            memory: 4Gi

  keyspaces:
    - name: commerce
      turndownPolicy: Immediate
      partitionings:
        - equal:
            parts: 4
            shardTemplate:
              databaseInitScriptSecret:
                name: commerce-init-script
                key: init.sql
              tabletPools:
                - cell: zone1
                  type: replica
                  replicas: 3
                  mysqld:
                    resources:
                      requests:
                        cpu: "4"
                        memory: 8Gi
                      limits:
                        cpu: "8"
                        memory: 16Gi
                  dataVolumeClaimTemplate:
                    accessModes:
                      - ReadWriteOnce
                    resources:
                      requests:
                        storage: 100Gi
                    storageClassName: fast-ssd

  updateStrategy:
    type: Immediate
```

Apply it:

```bash
kubectl create namespace vitess
kubectl apply -f vitess-cluster.yaml
```

## Defining the VSchema

The VSchema (Vitess Schema) tells Vitess how to route queries to shards. It defines which columns are used for sharding (vindexes) and how tables are distributed:

```json
{
  "sharded": true,
  "vindexes": {
    "hash": {
      "type": "hash"
    },
    "customer_lookup": {
      "type": "consistent_lookup_unique",
      "params": {
        "table": "customer_lookup",
        "from": "email",
        "to": "customer_id"
      },
      "owner": "customers"
    }
  },
  "tables": {
    "customers": {
      "column_vindexes": [
        {
          "column": "customer_id",
          "name": "hash"
        },
        {
          "column": "email",
          "name": "customer_lookup"
        }
      ]
    },
    "orders": {
      "column_vindexes": [
        {
          "column": "customer_id",
          "name": "hash"
        }
      ]
    },
    "order_items": {
      "column_vindexes": [
        {
          "column": "customer_id",
          "name": "hash"
        }
      ]
    },
    "products": {
      "type": "reference"
    }
  }
}
```

Key concepts in this VSchema:

The `hash` vindex distributes rows across shards based on a hash of the sharding column. This ensures even data distribution.

The `consistent_lookup_unique` vindex allows looking up customers by email. Without it, Vitess would need to scatter the query to all shards since it would not know which shard holds a given email.

The `orders` and `order_items` tables are sharded by `customer_id`, co-locating them with the parent `customers` table. This means joins between customers, orders, and order_items can be served by a single shard.

The `products` table is marked as `reference`, meaning it is copied to every shard. This is ideal for small lookup tables that are frequently joined with sharded tables.

Apply the VSchema using vtctldclient:

```bash
kubectl exec -it $(kubectl get pods -n vitess -l "app=vitess,component=vtctld" -o name | head -1) -n vitess -- \
  vtctldclient ApplyVSchema --vschema-file /tmp/vschema.json commerce
```

## Database Initialization

Create the initialization SQL script as a Kubernetes Secret:

```sql
-- init.sql
CREATE TABLE customers (
    customer_id BIGINT NOT NULL AUTO_INCREMENT,
    email VARCHAR(255) NOT NULL,
    name VARCHAR(255) NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (customer_id)
) ENGINE=InnoDB;

CREATE TABLE orders (
    order_id BIGINT NOT NULL AUTO_INCREMENT,
    customer_id BIGINT NOT NULL,
    total_amount DECIMAL(10, 2) NOT NULL,
    status ENUM('pending', 'processing', 'shipped', 'delivered', 'cancelled') NOT NULL DEFAULT 'pending',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (order_id)
) ENGINE=InnoDB;

CREATE TABLE order_items (
    item_id BIGINT NOT NULL AUTO_INCREMENT,
    order_id BIGINT NOT NULL,
    customer_id BIGINT NOT NULL,
    product_id BIGINT NOT NULL,
    quantity INT NOT NULL,
    unit_price DECIMAL(10, 2) NOT NULL,
    PRIMARY KEY (item_id)
) ENGINE=InnoDB;

CREATE TABLE products (
    product_id BIGINT NOT NULL AUTO_INCREMENT,
    name VARCHAR(255) NOT NULL,
    price DECIMAL(10, 2) NOT NULL,
    category VARCHAR(100),
    PRIMARY KEY (product_id)
) ENGINE=InnoDB;

CREATE TABLE customer_lookup (
    email VARCHAR(255) NOT NULL,
    customer_id BIGINT NOT NULL,
    keyspace_id VARBINARY(128),
    PRIMARY KEY (email)
) ENGINE=InnoDB;
```

```bash
kubectl create secret generic commerce-init-script \
  --from-file=init.sql=init.sql \
  -n vitess
```

## Connecting Applications

Applications connect to VTGate using a standard MySQL client. VTGate speaks the MySQL wire protocol:

```bash
# Port-forward VTGate for local testing
kubectl port-forward svc/ecommerce-vtgate-zone1 3306:3306 -n vitess
```

```bash
# Connect with mysql client
mysql -h 127.0.0.1 -P 3306 -u user -p
```

From within the Kubernetes cluster, applications connect using the service DNS name:

```yaml
# Application deployment
env:
  - name: DB_HOST
    value: ecommerce-vtgate-zone1.vitess.svc.cluster.local
  - name: DB_PORT
    value: "3306"
  - name: DB_NAME
    value: "commerce"
```

Queries work transparently:

```sql
-- This is routed to the correct shard based on customer_id
INSERT INTO customers (email, name) VALUES ('alice@example.com', 'Alice');

-- This scatter-gathers across all shards
SELECT COUNT(*) FROM orders WHERE status = 'pending';

-- This is routed to a single shard because customer_id is the sharding key
SELECT o.order_id, o.total_amount, oi.product_id, oi.quantity
FROM orders o
JOIN order_items oi ON o.order_id = oi.order_id AND o.customer_id = oi.customer_id
WHERE o.customer_id = 12345;

-- This uses the lookup vindex to find the right shard
SELECT * FROM customers WHERE email = 'alice@example.com';
```

## Online Resharding

One of Vitess's most powerful features is online resharding, the ability to split or merge shards without downtime. When your 4 shards are running out of capacity, you can split them to 8:

```bash
# Create the new shards
vtctldclient Reshard --target-keyspace commerce --workflow split create \
  --source-shards '-40,40-80,80-c0,c0-' \
  --target-shards '-20,20-40,40-60,60-80,80-a0,a0-c0,c0-e0,e0-'

# Monitor the progress
vtctldclient Reshard --target-keyspace commerce --workflow split show

# When the copy is complete, switch reads
vtctldclient Reshard --target-keyspace commerce --workflow split switchtraffic --tablet-types=rdonly,replica

# Then switch writes
vtctldclient Reshard --target-keyspace commerce --workflow split switchtraffic --tablet-types=primary

# Clean up the old shards
vtctldclient Reshard --target-keyspace commerce --workflow split complete
```

The entire process happens online. Applications continue reading and writing throughout the resharding operation.

## Monitoring and Observability

Vitess exposes Prometheus metrics from all components. Deploy ServiceMonitors to scrape them:

```yaml
apiVersion: monitoring.coreos.com/v1
kind: ServiceMonitor
metadata:
  name: vitess
  namespace: vitess
spec:
  selector:
    matchLabels:
      app: vitess
  endpoints:
    - port: web
      path: /metrics
      interval: 15s
```

Key metrics to monitor include VTGate query latency, error rates by shard, replication lag per tablet, and connection pool utilization. The vtctld web UI provides a visual overview of the cluster topology and tablet health at a glance.

Vitess makes MySQL horizontal sharding practical and operable on Kubernetes. By handling the complexity of query routing, connection pooling, and online resharding, it lets your team scale MySQL to handle millions of queries per second without rewriting your application. The investment in setting up the VSchema and understanding Vitess concepts pays off quickly as your data grows beyond what a single MySQL server can handle.
