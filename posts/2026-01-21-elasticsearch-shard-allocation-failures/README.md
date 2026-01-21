# How to Recover from Elasticsearch Shard Allocation Failures

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Elasticsearch, Shard Allocation, Troubleshooting, Recovery, Cluster Health, Operations

Description: A comprehensive guide to recovering from Elasticsearch shard allocation failures using the allocation explain API, covering common causes, resolution strategies, and prevention techniques.

---

Shard allocation failures prevent Elasticsearch from distributing data across nodes, leading to yellow or red cluster status. This guide covers using the allocation explain API and resolving common allocation issues.

## Understanding Shard Allocation

Elasticsearch allocates shards to nodes based on:

- Disk space availability
- Node attributes and awareness settings
- Shard allocation filtering rules
- Maximum shards per node limits
- Existing shard placement (same shard rule)

## Using the Allocation Explain API

### Basic Usage

```bash
curl -u elastic:password -X GET "localhost:9200/_cluster/allocation/explain?pretty"
```

This returns explanation for the first unassigned shard found.

### Explain Specific Shard

```bash
curl -u elastic:password -X GET "localhost:9200/_cluster/allocation/explain?pretty" -H 'Content-Type: application/json' -d'
{
  "index": "my-index",
  "shard": 0,
  "primary": true
}'
```

### Explain with Current State

```bash
curl -u elastic:password -X GET "localhost:9200/_cluster/allocation/explain?include_yes_decisions=true&pretty" -H 'Content-Type: application/json' -d'
{
  "index": "my-index",
  "shard": 0,
  "primary": false
}'
```

## Understanding Allocation Explain Output

### Sample Output

```json
{
  "index": "my-index",
  "shard": 0,
  "primary": true,
  "current_state": "unassigned",
  "unassigned_info": {
    "reason": "INDEX_CREATED",
    "at": "2024-01-21T10:30:00.000Z",
    "last_allocation_status": "no_valid_shard_copy"
  },
  "can_allocate": "no",
  "allocate_explanation": "cannot allocate because allocation is not permitted to any of the nodes",
  "node_allocation_decisions": [
    {
      "node_id": "node-1",
      "node_name": "node-1",
      "transport_address": "192.168.1.10:9300",
      "node_decision": "no",
      "weight_ranking": 1,
      "deciders": [
        {
          "decider": "disk_threshold",
          "decision": "NO",
          "explanation": "the node is above the high watermark cluster setting [cluster.routing.allocation.disk.watermark.high=90%], having less than the minimum required [10%] free space, actual free: [5%]"
        }
      ]
    }
  ]
}
```

### Key Fields

| Field | Description |
|-------|-------------|
| current_state | Current shard state (unassigned, initializing, etc.) |
| unassigned_info.reason | Why the shard became unassigned |
| can_allocate | Whether allocation is possible |
| allocate_explanation | Human-readable explanation |
| node_allocation_decisions | Per-node allocation decisions |
| deciders | Rules that prevented allocation |

## Common Allocation Failure Reasons

### 1. Disk Watermark Exceeded

**Decider:** `disk_threshold`

**Explanation:**
```
the node is above the high watermark cluster setting [cluster.routing.allocation.disk.watermark.high=90%]
```

**Solution:**

Temporary workaround:
```bash
curl -u elastic:password -X PUT "localhost:9200/_cluster/settings" -H 'Content-Type: application/json' -d'
{
  "transient": {
    "cluster.routing.allocation.disk.watermark.low": "90%",
    "cluster.routing.allocation.disk.watermark.high": "95%",
    "cluster.routing.allocation.disk.watermark.flood_stage": "98%"
  }
}'
```

Permanent fix - free disk space:
```bash
# Delete old indices
curl -u elastic:password -X DELETE "localhost:9200/logs-2023.*"

# Reset watermarks
curl -u elastic:password -X PUT "localhost:9200/_cluster/settings" -H 'Content-Type: application/json' -d'
{
  "transient": {
    "cluster.routing.allocation.disk.watermark.low": null,
    "cluster.routing.allocation.disk.watermark.high": null,
    "cluster.routing.allocation.disk.watermark.flood_stage": null
  }
}'
```

### 2. Same Shard Rule

**Decider:** `same_shard`

**Explanation:**
```
a copy of this shard is already allocated to this node
```

**Solution:**

This is normal behavior - primary and replica cannot be on the same node. Add more nodes or reduce replicas:

```bash
curl -u elastic:password -X PUT "localhost:9200/my-index/_settings" -H 'Content-Type: application/json' -d'
{
  "number_of_replicas": 0
}'
```

### 3. Maximum Shards Per Node

**Decider:** `max_shards_per_node`

**Explanation:**
```
too many shards [1000] allocated to this node, [cluster.routing.allocation.total_shards_per_node=1000]
```

**Solution:**

Increase the limit:
```bash
curl -u elastic:password -X PUT "localhost:9200/_cluster/settings" -H 'Content-Type: application/json' -d'
{
  "persistent": {
    "cluster.max_shards_per_node": 2000
  }
}'
```

Or better, reduce shard count by consolidating indices.

### 4. Node Attribute Requirements

**Decider:** `filter`

**Explanation:**
```
node does not match index setting [index.routing.allocation.require.zone] value [zone-a]
```

**Solution:**

Check node attributes:
```bash
curl -u elastic:password -X GET "localhost:9200/_cat/nodeattrs?v"
```

Remove allocation requirement:
```bash
curl -u elastic:password -X PUT "localhost:9200/my-index/_settings" -H 'Content-Type: application/json' -d'
{
  "index.routing.allocation.require.zone": null
}'
```

### 5. Allocation Disabled

**Decider:** `cluster_routing_allocation`

**Explanation:**
```
the cluster has not reached the allocation_enabled threshold
```

**Solution:**

Re-enable allocation:
```bash
curl -u elastic:password -X PUT "localhost:9200/_cluster/settings" -H 'Content-Type: application/json' -d'
{
  "transient": {
    "cluster.routing.allocation.enable": "all"
  }
}'
```

### 6. No Valid Shard Copy

**Explanation:**
```
cannot allocate because a previous copy of the primary shard existed but can no longer be found
```

**Solution:**

If data loss is acceptable, allocate empty primary:
```bash
curl -u elastic:password -X POST "localhost:9200/_cluster/reroute" -H 'Content-Type: application/json' -d'
{
  "commands": [
    {
      "allocate_empty_primary": {
        "index": "my-index",
        "shard": 0,
        "node": "node-1",
        "accept_data_loss": true
      }
    }
  ]
}'
```

Or allocate stale primary:
```bash
curl -u elastic:password -X POST "localhost:9200/_cluster/reroute" -H 'Content-Type: application/json' -d'
{
  "commands": [
    {
      "allocate_stale_primary": {
        "index": "my-index",
        "shard": 0,
        "node": "node-1",
        "accept_data_loss": true
      }
    }
  ]
}'
```

### 7. Awareness Allocation

**Decider:** `awareness`

**Explanation:**
```
allocation would prevent zone [zone-a] from having a copy of the shard
```

**Solution:**

Ensure nodes are distributed across zones or disable forced awareness:
```bash
curl -u elastic:password -X PUT "localhost:9200/_cluster/settings" -H 'Content-Type: application/json' -d'
{
  "persistent": {
    "cluster.routing.allocation.awareness.force.zone.values": null
  }
}'
```

## Manual Shard Allocation Commands

### Move Shard

```bash
curl -u elastic:password -X POST "localhost:9200/_cluster/reroute" -H 'Content-Type: application/json' -d'
{
  "commands": [
    {
      "move": {
        "index": "my-index",
        "shard": 0,
        "from_node": "node-1",
        "to_node": "node-2"
      }
    }
  ]
}'
```

### Allocate Replica

```bash
curl -u elastic:password -X POST "localhost:9200/_cluster/reroute" -H 'Content-Type: application/json' -d'
{
  "commands": [
    {
      "allocate_replica": {
        "index": "my-index",
        "shard": 0,
        "node": "node-2"
      }
    }
  ]
}'
```

### Cancel Allocation

```bash
curl -u elastic:password -X POST "localhost:9200/_cluster/reroute" -H 'Content-Type: application/json' -d'
{
  "commands": [
    {
      "cancel": {
        "index": "my-index",
        "shard": 0,
        "node": "node-1",
        "allow_primary": true
      }
    }
  ]
}'
```

### Retry Failed Shards

```bash
curl -u elastic:password -X POST "localhost:9200/_cluster/reroute?retry_failed=true"
```

## Diagnosing Allocation Issues Script

```bash
#!/bin/bash

ES_HOST="localhost:9200"
AUTH="-u elastic:password"

echo "=== Cluster Health ==="
curl -s $AUTH "$ES_HOST/_cluster/health?pretty"

echo -e "\n=== Unassigned Shards ==="
curl -s $AUTH "$ES_HOST/_cat/shards?v&h=index,shard,prirep,state,unassigned.reason" | grep UNASSIGNED | head -20

echo -e "\n=== Allocation Explain ==="
curl -s $AUTH "$ES_HOST/_cluster/allocation/explain?pretty" 2>/dev/null || echo "No unassigned shards"

echo -e "\n=== Disk Usage ==="
curl -s $AUTH "$ES_HOST/_cat/allocation?v"

echo -e "\n=== Node Attributes ==="
curl -s $AUTH "$ES_HOST/_cat/nodeattrs?v"

echo -e "\n=== Allocation Settings ==="
curl -s $AUTH "$ES_HOST/_cluster/settings?include_defaults=true&flat_settings=true" | grep -E "allocation|watermark"
```

## Prevention Strategies

### 1. Monitor Disk Space

Set up alerts before watermarks are reached:
```bash
# Alert when disk usage > 80%
curl -s -u elastic:password "localhost:9200/_cat/allocation?v" | awk '{if (NR>1 && $6+0 > 80) print "WARNING: " $1 " disk at " $6}'
```

### 2. Configure Appropriate Shard Counts

```bash
# Check total shards
curl -u elastic:password -X GET "localhost:9200/_cluster/stats?pretty" | jq '.indices.shards.total'
```

### 3. Use ILM for Automatic Management

```bash
curl -u elastic:password -X PUT "localhost:9200/_ilm/policy/auto-delete" -H 'Content-Type: application/json' -d'
{
  "policy": {
    "phases": {
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

### 4. Regular Cluster Health Checks

```bash
# Add to cron
0 * * * * curl -s -u elastic:password "localhost:9200/_cluster/health" | grep -q '"status":"green"' || echo "Cluster not green"
```

## Summary

Recovering from shard allocation failures involves:

1. **Use allocation explain API** - Understand why allocation is failing
2. **Identify the decider** - disk_threshold, same_shard, filter, etc.
3. **Apply appropriate fix** - free space, adjust settings, add nodes
4. **Use reroute commands** - Manually allocate when needed
5. **Monitor continuously** - Prevent issues before they occur

The allocation explain API is your primary tool for understanding and resolving shard allocation issues in Elasticsearch.
