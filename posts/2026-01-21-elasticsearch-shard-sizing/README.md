# How to Optimize Elasticsearch Shard Sizing

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Elasticsearch, Shards, Performance, Capacity Planning, DevOps

Description: A comprehensive guide to optimizing Elasticsearch shard sizing, covering shard count calculations, sizing best practices, and strategies for avoiding common pitfalls.

---

Proper shard sizing is one of the most critical aspects of Elasticsearch cluster design. Too many small shards waste resources, while too few large shards limit scalability. This guide covers everything you need to know about optimizing shard sizes for your workload.

## Understanding Shards

Each Elasticsearch index is divided into shards:

- **Primary shards**: Hold the original data, set at index creation
- **Replica shards**: Copies of primary shards for high availability

Shards are the unit of:
- Data distribution across nodes
- Parallel query execution
- Failure recovery

## Shard Sizing Guidelines

### The Golden Rules

1. **Target shard size**: 10GB - 50GB per shard
2. **Maximum recommended**: 50GB per shard
3. **Minimum practical**: 1GB per shard (for very small indices)
4. **Shards per GB heap**: ~20 shards per GB of heap memory

### Calculating Shard Count

Formula for primary shard count:

```
number_of_shards = ceil(expected_data_size / target_shard_size)
```

Example:
- Expected data: 200GB
- Target shard size: 40GB
- Shards needed: ceil(200 / 40) = 5 primary shards

### Consider Growth

Plan for data growth:

```
number_of_shards = ceil((current_size + (daily_growth * retention_days)) / target_shard_size)
```

Example:
- Current data: 50GB
- Daily growth: 5GB
- Retention: 30 days
- Total expected: 50 + (5 * 30) = 200GB
- Shards needed: ceil(200 / 40) = 5 primary shards

## Creating Indices with Proper Shard Counts

### Small Index (Under 10GB)

```bash
curl -X PUT "https://localhost:9200/small-index" \
  -H "Content-Type: application/json" \
  -u elastic:password \
  -d '{
    "settings": {
      "number_of_shards": 1,
      "number_of_replicas": 1
    }
  }'
```

### Medium Index (10GB - 100GB)

```bash
curl -X PUT "https://localhost:9200/medium-index" \
  -H "Content-Type: application/json" \
  -u elastic:password \
  -d '{
    "settings": {
      "number_of_shards": 3,
      "number_of_replicas": 1
    }
  }'
```

### Large Index (100GB+)

```bash
curl -X PUT "https://localhost:9200/large-index" \
  -H "Content-Type: application/json" \
  -u elastic:password \
  -d '{
    "settings": {
      "number_of_shards": 5,
      "number_of_replicas": 1
    }
  }'
```

## Checking Current Shard Sizes

### List All Shards with Sizes

```bash
curl -X GET "https://localhost:9200/_cat/shards?v&s=store:desc" \
  -u elastic:password
```

Output:

```
index             shard prirep state   docs    store ip           node
logs-2024.01      0     p      STARTED 5000000 25gb  192.168.1.10 node-1
logs-2024.01      0     r      STARTED 5000000 25gb  192.168.1.11 node-2
logs-2024.01      1     p      STARTED 4800000 24gb  192.168.1.11 node-2
```

### Index-Level Statistics

```bash
curl -X GET "https://localhost:9200/_cat/indices?v&s=store.size:desc" \
  -u elastic:password
```

### Detailed Shard Statistics

```bash
curl -X GET "https://localhost:9200/my-index/_stats?pretty" \
  -u elastic:password
```

## Time-Based Indices Strategy

For time-series data, use rolling indices:

### Daily Indices with ILM

```bash
# Create ILM policy
curl -X PUT "https://localhost:9200/_ilm/policy/logs-policy" \
  -H "Content-Type: application/json" \
  -u elastic:password \
  -d '{
    "policy": {
      "phases": {
        "hot": {
          "actions": {
            "rollover": {
              "max_primary_shard_size": "50gb",
              "max_age": "1d"
            }
          }
        },
        "warm": {
          "min_age": "7d",
          "actions": {
            "shrink": {
              "number_of_shards": 1
            }
          }
        },
        "delete": {
          "min_age": "30d",
          "actions": {
            "delete": {}
          }
        }
      }
    }
  }'
```

### Index Template for Time-Based Indices

```bash
curl -X PUT "https://localhost:9200/_index_template/logs-template" \
  -H "Content-Type: application/json" \
  -u elastic:password \
  -d '{
    "index_patterns": ["logs-*"],
    "template": {
      "settings": {
        "number_of_shards": 3,
        "number_of_replicas": 1,
        "index.lifecycle.name": "logs-policy",
        "index.lifecycle.rollover_alias": "logs"
      }
    }
  }'
```

## Shrinking Indices

Reduce shard count for older, read-only indices:

### Prerequisites

1. Index must be read-only
2. All shards must be on the same node
3. Index health must be green

### Shrink Process

```bash
# Step 1: Block writes and relocate shards
curl -X PUT "https://localhost:9200/logs-2024.01/_settings" \
  -H "Content-Type: application/json" \
  -u elastic:password \
  -d '{
    "settings": {
      "index.blocks.write": true,
      "index.routing.allocation.require._name": "node-1"
    }
  }'

# Step 2: Wait for relocation
curl -X GET "https://localhost:9200/_cat/shards/logs-2024.01?v" \
  -u elastic:password

# Step 3: Shrink the index
curl -X POST "https://localhost:9200/logs-2024.01/_shrink/logs-2024.01-shrunk" \
  -H "Content-Type: application/json" \
  -u elastic:password \
  -d '{
    "settings": {
      "index.number_of_shards": 1,
      "index.number_of_replicas": 1,
      "index.blocks.write": null,
      "index.routing.allocation.require._name": null
    }
  }'
```

## Splitting Indices

Increase shard count for growing indices:

```bash
# Step 1: Block writes
curl -X PUT "https://localhost:9200/products/_settings" \
  -H "Content-Type: application/json" \
  -u elastic:password \
  -d '{
    "settings": {
      "index.blocks.write": true
    }
  }'

# Step 2: Split the index (must split to multiple of original)
curl -X POST "https://localhost:9200/products/_split/products-split" \
  -H "Content-Type: application/json" \
  -u elastic:password \
  -d '{
    "settings": {
      "index.number_of_shards": 6
    }
  }'

# Step 3: Update alias and unblock writes
curl -X POST "https://localhost:9200/_aliases" \
  -H "Content-Type: application/json" \
  -u elastic:password \
  -d '{
    "actions": [
      { "remove": { "index": "products", "alias": "products-alias" } },
      { "add": { "index": "products-split", "alias": "products-alias" } }
    ]
  }'
```

Note: Split factor must be a whole number (e.g., 2 to 4, 2 to 6, 3 to 9).

## Cluster-Level Shard Limits

### Check Current Shard Count

```bash
curl -X GET "https://localhost:9200/_cluster/health?pretty" \
  -u elastic:password
```

Look at `active_shards` and `unassigned_shards`.

### Configure Shard Limits

```bash
curl -X PUT "https://localhost:9200/_cluster/settings" \
  -H "Content-Type: application/json" \
  -u elastic:password \
  -d '{
    "persistent": {
      "cluster.max_shards_per_node": 1000
    }
  }'
```

### Calculate Maximum Shards

Formula:
```
max_shards = number_of_nodes * cluster.max_shards_per_node
```

Example:
- 5 nodes
- 1000 shards per node limit
- Maximum: 5000 total shards

## Shard Allocation Awareness

Distribute shards across zones for fault tolerance:

```bash
# Configure rack awareness
curl -X PUT "https://localhost:9200/_cluster/settings" \
  -H "Content-Type: application/json" \
  -u elastic:password \
  -d '{
    "persistent": {
      "cluster.routing.allocation.awareness.attributes": "rack_id"
    }
  }'
```

Node configuration (`elasticsearch.yml`):

```yaml
node.attr.rack_id: rack1
```

## Monitoring Shard Health

### Shard Allocation Status

```bash
curl -X GET "https://localhost:9200/_cluster/allocation/explain?pretty" \
  -u elastic:password
```

### Unassigned Shards

```bash
curl -X GET "https://localhost:9200/_cat/shards?v&h=index,shard,prirep,state,unassigned.reason&s=state" \
  -u elastic:password
```

### Shard Distribution Across Nodes

```bash
curl -X GET "https://localhost:9200/_cat/allocation?v" \
  -u elastic:password
```

## Common Problems and Solutions

### Too Many Small Shards

Symptoms:
- High heap usage
- Slow cluster state updates
- Increased overhead

Solution:
1. Use fewer, larger shards
2. Shrink old indices
3. Consolidate small indices

### Too Few Large Shards

Symptoms:
- Cannot scale horizontally
- Long recovery times
- Uneven node utilization

Solution:
1. Split indices (requires reindexing for best results)
2. Plan better for new indices

### Unassigned Shards

Check allocation:

```bash
curl -X GET "https://localhost:9200/_cluster/allocation/explain?pretty" \
  -u elastic:password
```

Common causes:
- Not enough nodes
- Disk watermark reached
- Allocation filtering

### Hot Nodes

Some nodes have more active shards:

```bash
# Check node statistics
curl -X GET "https://localhost:9200/_nodes/stats/indices?pretty" \
  -u elastic:password
```

Solution: Rebalance or use shard allocation filtering.

## Best Practices Summary

### Planning

1. **Calculate expected data volume** before creating indices
2. **Plan for growth** - Include retention period in calculations
3. **Use time-based indices** for time-series data
4. **Implement ILM** for automatic rollover and management

### Configuration

1. **Target 10-50GB per shard** for optimal performance
2. **One shard for small indices** (< 10GB)
3. **Use replicas wisely** - 1 replica is usually sufficient
4. **Set shard limits** to prevent runaway creation

### Operations

1. **Monitor shard sizes regularly**
2. **Shrink old indices** to reduce shard count
3. **Use rollover** instead of fixed date indices
4. **Document your shard strategy**

### Capacity Planning

```
Heap per node: 31GB
Shards per GB heap: ~20
Max shards per node: ~620

5-node cluster with 31GB heap each:
Max total shards: ~3100
With 1 replica: ~1550 primary shards
At 30GB per shard: ~46TB raw capacity
```

## Conclusion

Proper shard sizing is essential for Elasticsearch performance and stability. Key takeaways:

1. **Target 10-50GB per shard** - The sweet spot for most workloads
2. **Plan for data growth** - Calculate total expected size
3. **Use ILM with rollover** - Automatic shard management
4. **Monitor shard sizes** - Regular health checks
5. **Shrink old indices** - Reduce overhead from small shards
6. **Set cluster limits** - Prevent shard explosion

With proper shard sizing, your Elasticsearch cluster will perform optimally and scale effectively as your data grows.
