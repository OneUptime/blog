# How to Scale Elasticsearch Clusters

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Elasticsearch, Scaling, Clusters, Nodes, Shards, High Availability

Description: A comprehensive guide to scaling Elasticsearch clusters, covering horizontal and vertical scaling, adding nodes, shard rebalancing, and capacity planning for growing workloads.

---

As data and query volumes grow, Elasticsearch clusters need to scale. Proper scaling ensures consistent performance and high availability. This guide covers strategies for scaling Elasticsearch clusters effectively.

## Scaling Strategies

### Vertical Scaling (Scale Up)

Increase resources on existing nodes:
- More CPU
- More RAM
- Faster disks (SSD)

### Horizontal Scaling (Scale Out)

Add more nodes:
- More data nodes for storage
- More replicas for read throughput
- Dedicated master nodes for stability

## Adding Data Nodes

### 1. Prepare the New Node

```yaml
# elasticsearch.yml for new node
cluster.name: production
node.name: data-node-4
node.roles: [data, data_content, data_hot]
network.host: 0.0.0.0
discovery.seed_hosts: ["master-1:9300", "master-2:9300", "master-3:9300"]
```

### 2. Start the Node

```bash
sudo systemctl start elasticsearch

# Verify node joined
curl -X GET "https://localhost:9200/_cat/nodes?v" \
  -u elastic:password
```

### 3. Wait for Shard Rebalancing

```bash
# Watch shard allocation
curl -X GET "https://localhost:9200/_cat/allocation?v" \
  -u elastic:password

# Monitor cluster health
curl -X GET "https://localhost:9200/_cluster/health?pretty" \
  -u elastic:password
```

### 4. Verify Data Distribution

```bash
curl -X GET "https://localhost:9200/_cat/shards?v&h=index,shard,prirep,state,docs,store,node" \
  -u elastic:password
```

## Scaling with Kubernetes (ECK)

### Scale Node Count

```yaml
apiVersion: elasticsearch.k8s.elastic.co/v1
kind: Elasticsearch
metadata:
  name: elasticsearch
spec:
  version: 8.12.0
  nodeSets:
  - name: hot
    count: 5  # Increase from 3 to 5
    config:
      node.roles: [data_hot, data_content, ingest]
    volumeClaimTemplates:
    - metadata:
        name: elasticsearch-data
      spec:
        accessModes: [ReadWriteOnce]
        resources:
          requests:
            storage: 500Gi
        storageClassName: fast-ssd
```

Apply the change:

```bash
kubectl apply -f elasticsearch.yaml

# Watch scaling progress
kubectl get pods -w -l elasticsearch.k8s.elastic.co/cluster-name=elasticsearch
```

### Add New Node Set

```yaml
apiVersion: elasticsearch.k8s.elastic.co/v1
kind: Elasticsearch
metadata:
  name: elasticsearch
spec:
  version: 8.12.0
  nodeSets:
  - name: hot
    count: 3
    config:
      node.roles: [data_hot, data_content, ingest]
    volumeClaimTemplates:
    - metadata:
        name: elasticsearch-data
      spec:
        resources:
          requests:
            storage: 500Gi
        storageClassName: fast-ssd
  - name: warm
    count: 2
    config:
      node.roles: [data_warm]
    volumeClaimTemplates:
    - metadata:
        name: elasticsearch-data
      spec:
        resources:
          requests:
            storage: 2Ti
        storageClassName: standard
```

## Shard Allocation and Rebalancing

### Control Rebalancing Speed

```bash
# Increase concurrent recoveries
curl -X PUT "https://localhost:9200/_cluster/settings" \
  -H "Content-Type: application/json" \
  -u elastic:password \
  -d '{
    "persistent": {
      "cluster.routing.allocation.node_concurrent_recoveries": 4,
      "indices.recovery.max_bytes_per_sec": "100mb"
    }
  }'
```

### Exclude Node from Allocation

Before removing a node:

```bash
curl -X PUT "https://localhost:9200/_cluster/settings" \
  -H "Content-Type: application/json" \
  -u elastic:password \
  -d '{
    "persistent": {
      "cluster.routing.allocation.exclude._name": "data-node-1"
    }
  }'

# Wait for shards to migrate
curl -X GET "https://localhost:9200/_cat/shards?v&h=index,shard,prirep,state,node" \
  -u elastic:password | grep data-node-1
```

### Force Shard Reallocation

```bash
curl -X POST "https://localhost:9200/_cluster/reroute" \
  -H "Content-Type: application/json" \
  -u elastic:password \
  -d '{
    "commands": [
      {
        "move": {
          "index": "products",
          "shard": 0,
          "from_node": "data-node-1",
          "to_node": "data-node-4"
        }
      }
    ]
  }'
```

## Adding Replicas

### Increase Replica Count

```bash
curl -X PUT "https://localhost:9200/products/_settings" \
  -H "Content-Type: application/json" \
  -u elastic:password \
  -d '{
    "index.number_of_replicas": 2
  }'
```

### Set Default Replicas for New Indices

```bash
curl -X PUT "https://localhost:9200/_template/default_replicas" \
  -H "Content-Type: application/json" \
  -u elastic:password \
  -d '{
    "index_patterns": ["*"],
    "settings": {
      "number_of_replicas": 2
    }
  }'
```

## Dedicated Node Roles

### Master Nodes

Dedicated master nodes improve stability:

```yaml
# master-node elasticsearch.yml
node.roles: [master]
cluster.initial_master_nodes: ["master-1", "master-2", "master-3"]
```

```bash
# Verify master nodes
curl -X GET "https://localhost:9200/_cat/nodes?v&h=name,node.role,master" \
  -u elastic:password
```

### Coordinating Nodes

For query routing:

```yaml
# coordinator-node elasticsearch.yml
node.roles: []  # Empty = coordinating only
```

### Ingest Nodes

For preprocessing:

```yaml
# ingest-node elasticsearch.yml
node.roles: [ingest]
```

## Data Tiers

### Hot-Warm-Cold Architecture

```bash
# Hot tier node
node.roles: [data_hot, data_content]

# Warm tier node
node.roles: [data_warm]

# Cold tier node
node.roles: [data_cold]

# Frozen tier node
node.roles: [data_frozen]
```

### Configure Index Lifecycle for Tiers

```bash
curl -X PUT "https://localhost:9200/_ilm/policy/tiered_policy" \
  -H "Content-Type: application/json" \
  -u elastic:password \
  -d '{
    "policy": {
      "phases": {
        "hot": {
          "actions": {
            "rollover": {
              "max_size": "50gb",
              "max_age": "1d"
            }
          }
        },
        "warm": {
          "min_age": "7d",
          "actions": {
            "shrink": { "number_of_shards": 1 },
            "forcemerge": { "max_num_segments": 1 },
            "allocate": {
              "number_of_replicas": 1
            }
          }
        },
        "cold": {
          "min_age": "30d",
          "actions": {
            "allocate": {
              "number_of_replicas": 0
            }
          }
        },
        "delete": {
          "min_age": "90d",
          "actions": {
            "delete": {}
          }
        }
      }
    }
  }'
```

## Capacity Planning

### Calculate Storage Needs

```bash
# Current index sizes
curl -X GET "https://localhost:9200/_cat/indices?v&h=index,store.size&s=store.size:desc" \
  -u elastic:password

# Growth projection
# Daily indexing rate x retention days x (1 + replica count) = Total storage
```

### Memory Planning

- JVM heap: 50% of available RAM (max 31GB)
- Leave 50% for OS file cache
- 1GB heap per 20-30GB of data (rule of thumb)

### Shard Sizing

```bash
# Check shard sizes
curl -X GET "https://localhost:9200/_cat/shards?v&h=index,shard,store&s=store:desc" \
  -u elastic:password

# Target: 10-50GB per shard
# Max shards per node: ~1000
```

## Monitoring Scaling

### Cluster Stats

```bash
curl -X GET "https://localhost:9200/_cluster/stats?human" \
  -u elastic:password
```

### Node Stats

```bash
curl -X GET "https://localhost:9200/_nodes/stats?human" \
  -u elastic:password
```

### Allocation Explanation

```bash
# Why shard not allocated
curl -X GET "https://localhost:9200/_cluster/allocation/explain" \
  -H "Content-Type: application/json" \
  -u elastic:password \
  -d '{
    "index": "products",
    "shard": 0,
    "primary": true
  }'
```

## Removing Nodes

### 1. Exclude Node from Allocation

```bash
curl -X PUT "https://localhost:9200/_cluster/settings" \
  -H "Content-Type: application/json" \
  -u elastic:password \
  -d '{
    "persistent": {
      "cluster.routing.allocation.exclude._name": "data-node-old"
    }
  }'
```

### 2. Wait for Shards to Migrate

```bash
# Check remaining shards on node
watch 'curl -s -X GET "https://localhost:9200/_cat/shards?v" -u elastic:password | grep data-node-old | wc -l'
```

### 3. Stop and Remove Node

```bash
sudo systemctl stop elasticsearch
# Remove from cluster
```

### 4. Clear Exclusion

```bash
curl -X PUT "https://localhost:9200/_cluster/settings" \
  -H "Content-Type: application/json" \
  -u elastic:password \
  -d '{
    "persistent": {
      "cluster.routing.allocation.exclude._name": null
    }
  }'
```

## Auto-Scaling (Kubernetes)

### Horizontal Pod Autoscaler

```yaml
apiVersion: autoscaling/v2
kind: HorizontalPodAutoscaler
metadata:
  name: elasticsearch-data-hpa
spec:
  scaleTargetRef:
    apiVersion: elasticsearch.k8s.elastic.co/v1
    kind: Elasticsearch
    name: elasticsearch
  minReplicas: 3
  maxReplicas: 10
  metrics:
  - type: Resource
    resource:
      name: cpu
      target:
        type: Utilization
        averageUtilization: 70
```

### KEDA Scaler

```yaml
apiVersion: keda.sh/v1alpha1
kind: ScaledObject
metadata:
  name: elasticsearch-scaler
spec:
  scaleTargetRef:
    name: elasticsearch
  minReplicaCount: 3
  maxReplicaCount: 10
  triggers:
  - type: prometheus
    metadata:
      serverAddress: http://prometheus:9090
      metricName: elasticsearch_jvm_memory_used_bytes
      query: sum(elasticsearch_jvm_memory_used_bytes{area="heap"}) / sum(elasticsearch_jvm_memory_max_bytes{area="heap"})
      threshold: "80"
```

## Best Practices

### 1. Scale Gradually

Add nodes one at a time and wait for rebalancing.

### 2. Monitor During Scaling

Watch cluster health and performance.

### 3. Use Dedicated Masters

For clusters with 3+ nodes.

### 4. Plan Shard Count

Cannot change primary shard count after creation.

### 5. Test Scaling Procedures

Practice in non-production first.

### 6. Document Configuration

Keep node configurations consistent.

## Conclusion

Scaling Elasticsearch clusters requires:

1. **Horizontal scaling** - adding nodes for capacity
2. **Vertical scaling** - increasing node resources
3. **Replica management** - read scaling
4. **Data tiers** - optimized storage
5. **Monitoring** - track scaling progress

Plan capacity ahead and scale proactively to maintain performance.
