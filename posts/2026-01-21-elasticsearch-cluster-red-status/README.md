# How to Debug Elasticsearch 'Cluster Red' Status

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Elasticsearch, Troubleshooting, Cluster Health, Red Status, Unassigned Shards, Recovery

Description: A comprehensive guide to debugging and resolving Elasticsearch cluster red status, covering diagnosis of unassigned shards, recovery procedures, and preventive measures.

---

A red cluster status in Elasticsearch indicates that one or more primary shards are not allocated, meaning some data is unavailable. This guide covers systematic diagnosis and resolution of cluster red status.

## Understanding Cluster Health Status

Elasticsearch cluster health has three states:

- **Green** - All primary and replica shards are allocated
- **Yellow** - All primary shards are allocated, but some replicas are not
- **Red** - One or more primary shards are not allocated (data unavailable)

## Quick Diagnosis

### Check Cluster Health

```bash
curl -u elastic:password -X GET "localhost:9200/_cluster/health?pretty"
```

Response indicating red status:

```json
{
  "cluster_name": "production",
  "status": "red",
  "timed_out": false,
  "number_of_nodes": 3,
  "number_of_data_nodes": 3,
  "active_primary_shards": 45,
  "active_shards": 90,
  "relocating_shards": 0,
  "initializing_shards": 0,
  "unassigned_shards": 10,
  "delayed_unassigned_shards": 0,
  "number_of_pending_tasks": 0,
  "number_of_in_flight_fetch": 0,
  "task_max_waiting_in_queue_millis": 0,
  "active_shards_percent_as_number": 90.0
}
```

### List Affected Indices

```bash
# Show indices with red health
curl -u elastic:password -X GET "localhost:9200/_cat/indices?v&health=red"

# Show all indices with health status
curl -u elastic:password -X GET "localhost:9200/_cat/indices?v&s=health"
```

### List Unassigned Shards

```bash
curl -u elastic:password -X GET "localhost:9200/_cat/shards?v&h=index,shard,prirep,state,unassigned.reason&s=state"
```

## Understanding Unassigned Shard Reasons

```bash
curl -u elastic:password -X GET "localhost:9200/_cluster/allocation/explain?pretty"
```

Common unassigned reasons:

| Reason | Description |
|--------|-------------|
| INDEX_CREATED | Index was just created |
| CLUSTER_RECOVERED | Cluster recovery process |
| INDEX_REOPENED | Index was reopened |
| DANGLING_INDEX_IMPORTED | Dangling index imported |
| NEW_INDEX_RESTORED | Restored from snapshot |
| EXISTING_INDEX_RESTORED | Restored from snapshot |
| REPLICA_ADDED | Replica added |
| ALLOCATION_FAILED | Allocation attempt failed |
| NODE_LEFT | Node left the cluster |
| REROUTE_CANCELLED | Reroute was cancelled |
| REINITIALIZED | Shard reinitialized |
| REALLOCATED_REPLICA | Replica reallocated |

## Detailed Allocation Explanation

### Check Why a Specific Shard Is Unassigned

```bash
curl -u elastic:password -X GET "localhost:9200/_cluster/allocation/explain?pretty" -H 'Content-Type: application/json' -d'
{
  "index": "my-index",
  "shard": 0,
  "primary": true
}'
```

Response example:

```json
{
  "index": "my-index",
  "shard": 0,
  "primary": true,
  "current_state": "unassigned",
  "unassigned_info": {
    "reason": "NODE_LEFT",
    "at": "2024-01-21T10:30:00.000Z",
    "last_allocation_status": "no_valid_shard_copy"
  },
  "can_allocate": "no",
  "allocate_explanation": "cannot allocate because a previous copy of the primary shard existed but can no longer be found on the nodes in the cluster",
  "node_allocation_decisions": [
    {
      "node_id": "node-1",
      "node_name": "node-1",
      "node_decision": "no",
      "deciders": [
        {
          "decider": "same_shard",
          "decision": "NO",
          "explanation": "a copy of this shard is already allocated to this node"
        }
      ]
    }
  ]
}
```

## Common Causes and Solutions

### 1. Node Failure

**Symptoms:**
- Shards marked with reason `NODE_LEFT`
- Primary shards unassigned

**Resolution:**

If the node can be recovered:
```bash
# Start the failed node
sudo systemctl start elasticsearch

# Monitor recovery
curl -u elastic:password -X GET "localhost:9200/_cat/recovery?v&active_only=true"
```

If the node data is lost:
```bash
# Allocate stale primary (may lose some data)
curl -u elastic:password -X POST "localhost:9200/_cluster/reroute" -H 'Content-Type: application/json' -d'
{
  "commands": [
    {
      "allocate_stale_primary": {
        "index": "my-index",
        "shard": 0,
        "node": "node-2",
        "accept_data_loss": true
      }
    }
  ]
}'
```

### 2. Disk Watermark Exceeded

**Symptoms:**
- Allocation explain shows disk watermark issues
- High disk usage on nodes

**Check disk usage:**
```bash
curl -u elastic:password -X GET "localhost:9200/_cat/allocation?v"
```

**Resolution:**

Temporarily adjust watermarks:
```bash
curl -u elastic:password -X PUT "localhost:9200/_cluster/settings" -H 'Content-Type: application/json' -d'
{
  "transient": {
    "cluster.routing.allocation.disk.watermark.low": "90%",
    "cluster.routing.allocation.disk.watermark.high": "95%",
    "cluster.routing.allocation.disk.watermark.flood_stage": "97%"
  }
}'
```

Free up disk space:
```bash
# Delete old indices
curl -u elastic:password -X DELETE "localhost:9200/logs-2023.*"

# Force merge to reduce segment count
curl -u elastic:password -X POST "localhost:9200/logs-*/_forcemerge?max_num_segments=1"
```

Reset watermarks after cleanup:
```bash
curl -u elastic:password -X PUT "localhost:9200/_cluster/settings" -H 'Content-Type: application/json' -d'
{
  "transient": {
    "cluster.routing.allocation.disk.watermark.low": null,
    "cluster.routing.allocation.disk.watermark.high": null,
    "cluster.routing.allocation.disk.watermark.flood_stage": null
  }
}'
```

### 3. Allocation Disabled

**Check allocation settings:**
```bash
curl -u elastic:password -X GET "localhost:9200/_cluster/settings?include_defaults=true&flat_settings=true" | grep allocation
```

**Re-enable allocation:**
```bash
curl -u elastic:password -X PUT "localhost:9200/_cluster/settings" -H 'Content-Type: application/json' -d'
{
  "transient": {
    "cluster.routing.allocation.enable": "all"
  }
}'
```

### 4. Node Attributes Mismatch

**Symptoms:**
- Index requires specific node attributes that no node has

**Check node attributes:**
```bash
curl -u elastic:password -X GET "localhost:9200/_cat/nodeattrs?v"
```

**Check index allocation settings:**
```bash
curl -u elastic:password -X GET "localhost:9200/my-index/_settings?pretty" | grep allocation
```

**Resolution:**

Remove allocation requirements:
```bash
curl -u elastic:password -X PUT "localhost:9200/my-index/_settings" -H 'Content-Type: application/json' -d'
{
  "index.routing.allocation.require.zone": null
}'
```

### 5. Corrupted Shard

**Symptoms:**
- Allocation failed due to shard corruption
- Exception in allocation explanation

**Resolution:**

First, try to recover from replica:
```bash
# Check if replicas exist
curl -u elastic:password -X GET "localhost:9200/_cat/shards/my-index?v"
```

If no valid replica, allocate empty primary:
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

### 6. Too Many Shards per Node

**Check current limit:**
```bash
curl -u elastic:password -X GET "localhost:9200/_cluster/settings?include_defaults=true" | jq '.defaults.cluster.max_shards_per_node'
```

**Increase limit temporarily:**
```bash
curl -u elastic:password -X PUT "localhost:9200/_cluster/settings" -H 'Content-Type: application/json' -d'
{
  "transient": {
    "cluster.max_shards_per_node": 2000
  }
}'
```

## Manual Shard Allocation

### Allocate Unassigned Replica

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

### Move Shard Between Nodes

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

### Cancel Stuck Recovery

```bash
curl -u elastic:password -X POST "localhost:9200/_cluster/reroute" -H 'Content-Type: application/json' -d'
{
  "commands": [
    {
      "cancel": {
        "index": "my-index",
        "shard": 0,
        "node": "node-1"
      }
    }
  ]
}'
```

## Recovery Monitoring

### Watch Recovery Progress

```bash
# Active recoveries
curl -u elastic:password -X GET "localhost:9200/_cat/recovery?v&active_only=true"

# Detailed recovery stats
curl -u elastic:password -X GET "localhost:9200/_recovery?pretty&active_only=true"
```

### Speed Up Recovery

```bash
curl -u elastic:password -X PUT "localhost:9200/_cluster/settings" -H 'Content-Type: application/json' -d'
{
  "transient": {
    "indices.recovery.max_bytes_per_sec": "500mb",
    "cluster.routing.allocation.node_concurrent_recoveries": 4
  }
}'
```

## Restoring from Snapshot

If data is lost and you have snapshots:

```bash
# List available snapshots
curl -u elastic:password -X GET "localhost:9200/_snapshot/my-repo/_all?pretty"

# Close the index
curl -u elastic:password -X POST "localhost:9200/my-index/_close"

# Restore from snapshot
curl -u elastic:password -X POST "localhost:9200/_snapshot/my-repo/snapshot-name/_restore" -H 'Content-Type: application/json' -d'
{
  "indices": "my-index",
  "ignore_unavailable": true,
  "include_global_state": false
}'

# Monitor restore progress
curl -u elastic:password -X GET "localhost:9200/_recovery/my-index?pretty"
```

## Preventive Measures

### 1. Configure Proper Replicas

```bash
# Ensure at least 1 replica for important indices
curl -u elastic:password -X PUT "localhost:9200/my-index/_settings" -H 'Content-Type: application/json' -d'
{
  "number_of_replicas": 1
}'
```

### 2. Set Up Monitoring Alerts

Monitor for:
- Cluster health changes
- Unassigned shard count
- Disk usage approaching watermarks
- Node departures

### 3. Configure Delayed Allocation

```bash
# Prevent immediate reallocation on temporary node failures
curl -u elastic:password -X PUT "localhost:9200/_all/_settings" -H 'Content-Type: application/json' -d'
{
  "settings": {
    "index.unassigned.node_left.delayed_timeout": "5m"
  }
}'
```

### 4. Regular Snapshots

```bash
# Create snapshot repository
curl -u elastic:password -X PUT "localhost:9200/_snapshot/backup-repo" -H 'Content-Type: application/json' -d'
{
  "type": "fs",
  "settings": {
    "location": "/mnt/backups"
  }
}'

# Create snapshot
curl -u elastic:password -X PUT "localhost:9200/_snapshot/backup-repo/snapshot-$(date +%Y%m%d)?wait_for_completion=true"
```

## Troubleshooting Checklist

```bash
#!/bin/bash
# Elasticsearch Red Cluster Troubleshooting

ES_HOST="localhost:9200"
AUTH="-u elastic:password"

echo "=== Cluster Health ==="
curl -s $AUTH "$ES_HOST/_cluster/health?pretty"

echo -e "\n=== Red Indices ==="
curl -s $AUTH "$ES_HOST/_cat/indices?v&health=red"

echo -e "\n=== Unassigned Shards ==="
curl -s $AUTH "$ES_HOST/_cat/shards?v&h=index,shard,prirep,state,unassigned.reason" | grep UNASSIGNED

echo -e "\n=== Allocation Explanation ==="
curl -s $AUTH "$ES_HOST/_cluster/allocation/explain?pretty"

echo -e "\n=== Disk Usage ==="
curl -s $AUTH "$ES_HOST/_cat/allocation?v"

echo -e "\n=== Cluster Settings ==="
curl -s $AUTH "$ES_HOST/_cluster/settings?pretty"

echo -e "\n=== Node Status ==="
curl -s $AUTH "$ES_HOST/_cat/nodes?v&h=name,heap.percent,ram.percent,cpu,disk.used_percent,node.role"
```

## Summary

Resolving Elasticsearch red cluster status involves:

1. **Identify the cause** using allocation explain API
2. **Check common issues** - disk space, node failures, allocation settings
3. **Apply appropriate fix** - recover node, reallocate shards, restore from snapshot
4. **Monitor recovery** - track progress until cluster is green
5. **Implement prevention** - replicas, monitoring, snapshots

Red cluster status requires immediate attention as it indicates data unavailability. Always prioritize understanding the root cause before taking corrective action to avoid data loss.
