# How to Deploy Vitess for Horizontally Sharded MySQL on Kubernetes

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Vitess, MySQL, Kubernetes

Description: Learn how to deploy Vitess on Kubernetes to horizontally shard MySQL databases, enabling massive scale while maintaining MySQL compatibility and managing complexity through automation.

---

Vitess powers some of the largest MySQL deployments in the world, including YouTube and Slack. It solves the fundamental scaling problem of MySQL by automatically sharding data across multiple MySQL instances while presenting a unified interface to applications. This guide demonstrates deploying Vitess on Kubernetes, from initial cluster setup through resharding operations that handle billions of rows without downtime.

## Understanding Vitess Architecture

Vitess sits between your application and MySQL, providing a distributed database layer. VTGate serves as the query router, accepting MySQL protocol connections and routing queries to appropriate shards. VTTablet wraps each MySQL instance, handling connection pooling, query rewriting, and health monitoring. The topology service (using etcd or Consul) tracks cluster metadata and coordinates distributed operations.

This architecture enables horizontal scaling while preserving MySQL compatibility. Applications connect to VTGate using standard MySQL drivers, unaware that data spans multiple physical databases. Vitess handles query routing, transaction coordination, and cross-shard joins automatically.

## Installing the Vitess Operator

Deploy Vitess using the official Kubernetes operator:

```bash
# Install the Vitess operator
kubectl apply -f https://raw.githubusercontent.com/planetscale/vitess-operator/v2.11.0/deploy/operator.yaml

# Create namespace for Vitess cluster
kubectl create namespace vitess

# Verify operator is running
kubectl get pods -n vitess-operator
```

The operator manages VitessCluster custom resources, creating StatefulSets for MySQL, vtgate, and vtctld components.

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
  id BIGINT NOT NULL AUTO_INCREMENT,
  email VARCHAR(255) NOT NULL,
  name VARCHAR(255),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY idx_email (email)
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
  svc/commerce-zone1-vtgate 15306:3306

# Connect with MySQL client
mysql -h 127.0.0.1 -P 15306

# Or use the LoadBalancer (if configured)
kubectl get svc -n vitess commerce-zone1-vtgate
mysql -h <EXTERNAL_IP> -P 3306
```

Query across shards transparently:

```sql
-- Show databases (keyspaces)
SHOW DATABASES;

USE commerce;

-- Insert data (automatically routed to appropriate shard)
INSERT INTO customers (email, name) VALUES
  ('alice@example.com', 'Alice'),
  ('bob@example.com', 'Bob'),
  ('charlie@example.com', 'Charlie');

-- Query data (Vitess queries all shards and merges results)
SELECT * FROM customers ORDER BY created_at DESC;

-- Check which shard contains specific data
EXPLAIN SELECT * FROM customers WHERE email = 'alice@example.com';
```

Vitess automatically distributes data across shards based on the primary key.

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
        },
        "lookup": {
          "type": "consistent_lookup_unique",
          "params": {
            "table": "customer_lookup",
            "from": "email",
            "to": "customer_id"
          }
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

# Use vtctlclient to apply the schema
kubectl exec -it -n vitess \
  $(kubectl get pods -n vitess -l app=vtctld -o jsonpath='{.items[0].metadata.name}') \
  -- vtctlclient -server localhost:15999 \
  ApplyVSchema -vschema="$(cat vschema-config.yaml | yq e '.data."vschema.json"' -)" \
  commerce
```

This configuration shards customers and orders by customer_id using xxhash, keeping related data together for efficient queries.

## Resharding Without Downtime

As data grows, add more shards:

```bash
# Create a resharding operation from 2 shards to 4 shards
kubectl exec -it -n vitess \
  $(kubectl get pods -n vitess -l app=vtctld -o jsonpath='{.items[0].metadata.name}') \
  -- vtctlclient -server localhost:15999 \
  Reshard -source_shards='-80,80-' \
  -target_shards='-40,40-80,80-c0,c0-' \
  commerce.commerce2customers
```

Monitor the resharding process:

```bash
# Check workflow status
kubectl exec -it -n vitess \
  $(kubectl get pods -n vitess -l app=vtctld -o jsonpath='{.items[0].metadata.name}') \
  -- vtctlclient -server localhost:15999 \
  Workflow commerce.commerce2customers show

# Once caught up, switch reads to new shards
kubectl exec -it -n vitess \
  $(kubectl get pods -n vitess -l app=vtctld -o jsonpath='{.items[0].metadata.name}') \
  -- vtctlclient -server localhost:15999 \
  Workflow commerce.commerce2customers SwitchTraffic

# Complete the resharding
kubectl exec -it -n vitess \
  $(kubectl get pods -n vitess -l app=vtctld -o jsonpath='{.items[0].metadata.name}') \
  -- vtctlclient -server localhost:15999 \
  Workflow commerce.commerce2customers Complete
```

Vitess copies data in the background, then atomically switches traffic to the new shards without application downtime.

## Configuring Automated Backups

Set up automated backups using vtbackup:

```yaml
# backup-cronjob.yaml
apiVersion: batch/v1
kind: CronJob
metadata:
  name: vitess-backup
  namespace: vitess
spec:
  schedule: "0 2 * * *"
  jobTemplate:
    spec:
      template:
        spec:
          containers:
            - name: vtbackup
              image: vitess/lite:v17.0.0
              command:
                - bash
                - -c
                - |
                  vtbackup \
                    -topo_implementation=etcd2 \
                    -topo_global_server_address=etcd-global:2379 \
                    -backup_storage_implementation=s3 \
                    -s3_backup_aws_region=us-west-2 \
                    -s3_backup_storage_bucket=vitess-backups \
                    -s3_backup_storage_root=commerce \
                    -init_keyspace=commerce \
                    -init_shard=-80
              env:
                - name: AWS_ACCESS_KEY_ID
                  valueFrom:
                    secretKeyRef:
                      name: aws-credentials
                      key: access-key-id
                - name: AWS_SECRET_ACCESS_KEY
                  valueFrom:
                    secretKeyRef:
                      name: aws-credentials
                      key: secret-access-key
          restartPolicy: OnFailure
```

This creates daily backups of each shard to S3.

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
      app: vttablet
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
      app: vtgate
  endpoints:
    - port: web
      interval: 15s
      path: /metrics
```

Key metrics to monitor:

- Query latency percentiles (vtgate_api_count, vtgate_api_error_count)
- Shard health (vttablet_tablet_state)
- Replication lag (vttablet_replication_lag_seconds)
- Connection pool utilization (vtgate_vttablet_call_count)

## Implementing Query Routing Policies

Control query routing for read replicas:

```sql
-- Route reads to replicas (reduce primary load)
SELECT /*+ SCATTER_ERRORS_AS_WARNINGS */ * FROM customers;

-- Force query to primary for strong consistency
SELECT /*+ PRIMARY */ * FROM customers WHERE id = 123;

-- Use specific replica for analytics
SELECT /*+ REPLICA */ COUNT(*) FROM customers;
```

Configure default routing policies in VTGate:

```yaml
spec:
  cells:
    - name: zone1
      gateway:
        extraFlags:
          tablet_types_to_wait: "MASTER,REPLICA"
          tablet_grpc_timeout: "30s"
          queryserver-config-query-timeout: "30"
```

## Conclusion

Vitess transforms MySQL into a horizontally scalable database system capable of handling massive datasets while maintaining compatibility with existing MySQL applications. The Kubernetes operator simplifies deployment and management, handling the complexity of distributed database operations through declarative configuration.

The key to success with Vitess is thoughtful sharding key selection and proper VSchema design. By co-locating related data and using consistent hashing, you minimize cross-shard queries and maintain high performance. The ability to reshard without downtime means you can start with a simple sharding scheme and refine it as you learn your access patterns, making Vitess an excellent choice for applications that need to scale beyond single-server MySQL while preserving MySQL compatibility.
