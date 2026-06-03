# How to Deploy Vitess for Horizontally Sharded MySQL on Kubernetes

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Vitess, MySQL, Kubernetes

Description: Learn how to deploy Vitess on Kubernetes to horizontally shard MySQL databases, enabling massive scale while maintaining MySQL compatibility and managing complexity through automation.

---

Vitess powers some of the largest MySQL deployments in the world, including YouTube and Slack. It solves the fundamental scaling problem of MySQL by automatically sharding data across multiple MySQL instances while presenting a unified interface to applications. This guide demonstrates deploying Vitess on Kubernetes, from initial cluster setup through resharding operations that handle billions of rows without downtime.

## Understanding Vitess Architecture

Vitess sits between your application and MySQL, providing a distributed database layer. VTGate serves as the query router, accepting MySQL protocol connections and routing queries to appropriate shards. VTTablet wraps each MySQL instance, handling connection pooling, query rewriting, and health monitoring. The topology service (using etcd or Consul) tracks cluster metadata and coordinates distributed operations.

This architecture enables horizontal scaling while preserving MySQL compatibility. Applications connect to VTGate using standard MySQL drivers, unaware that data spans multiple physical databases. Vitess handles query routing, transaction coordination, and many cross-shard queries, although cross-shard joins should still be designed carefully because they can be expensive.

## Installing the Vitess Operator

Deploy Vitess using the official Kubernetes operator:

```bash
# Create namespace for Vitess cluster
kubectl create namespace vitess

# Install the Vitess operator CRDs, RBAC, and controller
kubectl apply -k "github.com/planetscale/vitess-operator/deploy?ref=v2.16.0"

# Verify operator is running
kubectl get pods -l app=vitess-operator
```

The operator manages VitessCluster custom resources, creating the Kubernetes resources for MySQL-backed vttablet pods, vtgate, and vtctld components.

## Deploying a Vitess Cluster

Create a basic Vitess cluster with two shards:

```yaml
# vitess-cluster.yaml
apiVersion: planetscale.com/v2
kind: VitessCluster
metadata:
  name: commerce
  namespace: vitess
spec:
  backup:
    engine: builtin
    locations:
      - name: s3-backups
        s3:
          region: us-west-2
          bucket: vitess-backups
          keyPrefix: commerce
          authSecret:
            name: aws-credentials
            key: credentials

  images:
    vtctld: vitess/lite:v23.0.0
    vtgate: vitess/lite:v23.0.0
    vttablet: vitess/lite:v23.0.0
    vtbackup: vitess/lite:v23.0.0
    mysqld:
      mysql80Compatible: vitess/lite:v23.0.0

  # Global cell configuration
  cells:
    - name: zone1
      gateway:
        replicas: 2
        resources:
          requests:
            cpu: 500m
            memory: 512Mi
          limits:
            cpu: 1000m
            memory: 1Gi

  # Topology service (etcd)
  vitessDashboard:
    cells:
      - zone1
    replicas: 1
    resources:
      limits:
        cpu: 100m
        memory: 128Mi

  # Keyspace configuration
  keyspaces:
    - name: commerce
      durabilityPolicy: semi_sync
      turndownPolicy: Immediate

      # Initial sharding configuration
      partitionings:
        - equal:
            parts: 2  # Start with 2 shards
            shardTemplate:
              databaseInitScriptSecret:
                name: init-script
                key: init.sql
              replication:
                enforceSemiSync: true
              tabletPools:
                - cell: zone1
                  type: replica
                  replicas: 3  # 3 replicas per shard
                  dataVolumeClaimTemplate:
                    accessModes: ["ReadWriteOnce"]
                    resources:
                      requests:
                        storage: 100Gi
                    storageClassName: fast-ssd
                  vttablet:
                    resources:
                      requests:
                        cpu: 1000m
                        memory: 2Gi
                      limits:
                        cpu: 2000m
                        memory: 4Gi
                  mysqld:
                    resources:
                      requests:
                        cpu: 1000m
                        memory: 2Gi
                      limits:
                        cpu: 2000m
                        memory: 4Gi

  # Update strategy
  updateStrategy:
    type: Immediate
```

Create the initialization script:

```bash
# Create database initialization script
kubectl create secret generic init-script -n vitess \
  --from-literal=init.sql="
CREATE TABLE products (
  id BIGINT NOT NULL AUTO_INCREMENT,
  sku VARCHAR(255) NOT NULL,
  name VARCHAR(255) NOT NULL,
  price DECIMAL(10,2) NOT NULL,
  PRIMARY KEY (id),
  KEY idx_sku (sku)
);

CREATE TABLE customers (
  id BIGINT NOT NULL,
  email VARCHAR(255) NOT NULL,
  name VARCHAR(255),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY idx_email (email)
);

CREATE TABLE orders (
  id BIGINT NOT NULL,
  customer_id BIGINT NOT NULL,
  total DECIMAL(10,2) NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  KEY idx_customer_id (customer_id)
);
"
```

Deploy the cluster:

```bash
kubectl apply -f vitess-cluster.yaml

# Watch cluster initialization
kubectl get pods -n vitess -w

# Wait for all components to be ready (5-10 minutes)
kubectl get vitesscluster -n vitess
```

## Connecting to Vitess

Connect to VTGate using the MySQL protocol:

```bash
# Port-forward VTGate
kubectl port-forward -n vitess \
  "svc/$(kubectl get vitesscluster commerce -n vitess -o jsonpath='{.status.gatewayServiceName}')" \
  15306:3306

# Connect with MySQL client
mysql -h 127.0.0.1 -P 15306

# Or use the LoadBalancer (if configured)
kubectl get svc -n vitess commerce-zone1-vtgate
mysql -h <EXTERNAL_IP> -P 3306
```

After applying the VSchema in the next section, query across shards transparently:

```sql
-- Show databases (keyspaces)
SHOW DATABASES;

USE commerce;

-- Insert data with explicit primary-vindex values so VTGate can route each row
INSERT INTO customers (id, email, name) VALUES
  (1, 'alice@example.com', 'Alice'),
  (2, 'bob@example.com', 'Bob'),
  (3, 'charlie@example.com', 'Charlie');

-- Query data (Vitess queries all shards and merges results)
SELECT * FROM customers ORDER BY created_at DESC;

-- Check which shard contains specific data
EXPLAIN SELECT * FROM customers WHERE id = 1;
```

Vitess distributes rows across shards based on the table's primary vindex.

## Implementing Custom Sharding Keys

For better control over data distribution, define a sharding key using VSchema:

```yaml
# vschema-config.yaml
apiVersion: v1
kind: ConfigMap
metadata:
  name: vschema-config
  namespace: vitess
data:
  vschema.json: |
    {
      "sharded": true,
      "vindexes": {
        "hash": {
          "type": "hash"
        },
        "xxhash": {
          "type": "xxhash"
        }
      },
      "tables": {
        "customers": {
          "column_vindexes": [
            {
              "column": "id",
              "name": "xxhash"
            }
          ]
        },
        "orders": {
          "column_vindexes": [
            {
              "column": "customer_id",
              "name": "xxhash"
            }
          ]
        },
        "products": {
          "type": "reference"
        }
      }
    }
```

Apply the VSchema:

```bash
# Apply VSchema configuration
kubectl apply -f vschema-config.yaml

# Use vtctldclient to apply the schema
kubectl port-forward -n vitess \
  "svc/$(kubectl get vitesscluster commerce -n vitess -o jsonpath='{.status.vitessDashboard.serviceName}')" \
  15999:15999

vtctldclient --server localhost:15999 \
  ApplyVSchema --vschema="$(kubectl get configmap vschema-config -n vitess -o jsonpath='{.data.vschema\.json}')" \
  commerce
```

This configuration shards customers by id and orders by customer_id using xxhash, keeping related data together when order customer_id values match customer ids.

## Resharding Without Downtime

As data grows, add more shards. With the operator, first add a second partitioning with `parts: 4` to the same keyspace so the target shards are deployed, then create the resharding workflow:

```bash
# Create a resharding operation from 2 shards to 4 shards
vtctldclient --server localhost:15999 \
  Reshard --workflow commerce2customers --target-keyspace commerce create \
  --source-shards='-80,80-' \
  --target-shards='-40,40-80,80-c0,c0-'
```

Monitor the resharding process:

```bash
# Check workflow status
vtctldclient --server localhost:15999 \
  Reshard --workflow commerce2customers --target-keyspace commerce show

# Once caught up, switch reads to new shards
vtctldclient --server localhost:15999 \
  Reshard --workflow commerce2customers --target-keyspace commerce switchtraffic \
  --tablet-types "replica"

# Then switch primary traffic
vtctldclient --server localhost:15999 \
  Reshard --workflow commerce2customers --target-keyspace commerce switchtraffic \
  --tablet-types "primary"

# Complete the resharding
vtctldclient --server localhost:15999 \
  Reshard --workflow commerce2customers --target-keyspace commerce complete
```

Vitess copies data in the background, then switches serving traffic to the new shards without application downtime.

## Configuring Automated Backups

Set up automated backups using the Vitess operator:

```yaml
# backup-schedule.yaml
apiVersion: planetscale.com/v2
kind: VitessBackupSchedule
metadata:
  name: commerce-daily-backup
  namespace: vitess
spec:
  cluster: commerce
  schedule: "0 2 * * *"
  strategies:
    - name: commerce-x-80
      keyspace: commerce
      shard: "-80"
    - name: commerce-80-x
      keyspace: commerce
      shard: "80-"
```

This creates daily backups of each shard to the S3 location configured on the VitessCluster.

## Monitoring Vitess Performance

Deploy Prometheus monitoring:

```yaml
# servicemonitor.yaml
apiVersion: monitoring.coreos.com/v1
kind: ServiceMonitor
metadata:
  name: vitess-monitor
  namespace: vitess
spec:
  selector:
    matchLabels:
      planetscale.com/component: vttablet
  endpoints:
    - port: web
      interval: 15s
      path: /metrics
---
apiVersion: monitoring.coreos.com/v1
kind: ServiceMonitor
metadata:
  name: vtgate-monitor
  namespace: vitess
spec:
  selector:
    matchLabels:
      planetscale.com/component: vtgate
  endpoints:
    - port: web
      interval: 15s
      path: /metrics
```

Key metrics to monitor:

- Query latency and counts (VTGateApi)
- Tablet health and discovery (HealthcheckConnections)
- VReplication lag during resharding (VReplicationLagSeconds)
- VReplication workflow state (VReplicationStreamState)

## Implementing Query Routing Policies

Control query routing for read replicas:

```sql
-- Route reads to replicas (reduce primary load)
USE commerce@replica;
SELECT * FROM customers;

-- Force query to primary for strong consistency
USE commerce@primary;
SELECT * FROM customers WHERE id = 123;

-- Use replicas for analytics
USE commerce@replica;
SELECT COUNT(*) FROM customers;
```

Configure default routing policies in VTGate:

```yaml
spec:
  cells:
    - name: zone1
      gateway:
        extraFlags:
          default-tablet-type: "primary"
          discovery-low-replication-lag: "30s"
          discovery-high-replication-lag-minimum-serving: "2h"
```

## Conclusion

Vitess transforms MySQL into a horizontally scalable database system capable of handling massive datasets while maintaining compatibility with existing MySQL applications. The Kubernetes operator simplifies deployment and management, handling the complexity of distributed database operations through declarative configuration.

The key to success with Vitess is thoughtful sharding key selection and proper VSchema design. By co-locating related data and using consistent hashing, you minimize cross-shard queries and maintain high performance. The ability to reshard without downtime means you can start with a simple sharding scheme and refine it as you learn your access patterns, making Vitess an excellent choice for applications that need to scale beyond single-server MySQL while preserving MySQL compatibility.
