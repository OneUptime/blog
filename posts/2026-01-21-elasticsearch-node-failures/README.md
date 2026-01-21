# How to Handle Elasticsearch Node Failures

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Elasticsearch, Node Failures, Recovery, High Availability, Troubleshooting, Cluster Management

Description: A comprehensive guide to handling Elasticsearch node failures including detection, recovery procedures, shard rebalancing, and best practices for maintaining cluster availability.

---

Node failures are inevitable in any distributed system. This guide covers how to detect, diagnose, and recover from Elasticsearch node failures while maintaining cluster availability and data integrity.

## Understanding Node Failures

Elasticsearch nodes can fail for various reasons:

- **Hardware failures** - Disk, memory, or network issues
- **Software crashes** - JVM errors, out-of-memory conditions
- **Network partitions** - Connectivity loss between nodes
- **Planned maintenance** - Upgrades, restarts, or configuration changes

## Detecting Node Failures

### Cluster Health Monitoring

```bash
# Check cluster health
curl -X GET "localhost:9200/_cluster/health?pretty"
```

Response indicating a node failure:

```json
{
  "cluster_name": "production-cluster",
  "status": "yellow",
  "number_of_nodes": 2,
  "number_of_data_nodes": 2,
  "active_primary_shards": 50,
  "active_shards": 100,
  "relocating_shards": 0,
  "initializing_shards": 5,
  "unassigned_shards": 50,
  "delayed_unassigned_shards": 50
}
```

### Node Status Check

```bash
# List all nodes
curl -X GET "localhost:9200/_cat/nodes?v&h=name,ip,heap.percent,ram.percent,cpu,load_1m,node.role,master"

# Check specific node
curl -X GET "localhost:9200/_nodes/node-1/stats?pretty"
```

### Unassigned Shard Analysis

```bash
# List unassigned shards
curl -X GET "localhost:9200/_cat/shards?v&h=index,shard,prirep,state,unassigned.reason"

# Get allocation explanation
curl -X GET "localhost:9200/_cluster/allocation/explain?pretty" -H 'Content-Type: application/json' -d'
{
  "index": "my-index",
  "shard": 0,
  "primary": true
}'
```

## Immediate Response Actions

### Step 1: Assess the Situation

```bash
# Full cluster state
curl -X GET "localhost:9200/_cluster/state?pretty"

# Pending tasks
curl -X GET "localhost:9200/_cluster/pending_tasks?pretty"

# Node statistics
curl -X GET "localhost:9200/_nodes/stats?pretty"
```

### Step 2: Check Node Logs

On the failed node (if accessible):

```bash
# Check Elasticsearch logs
tail -f /var/log/elasticsearch/production-cluster.log

# Check system logs
journalctl -u elasticsearch -n 100

# Check for OOM killer
dmesg | grep -i "killed process"
```

### Step 3: Prevent Unnecessary Shard Movement

If the failure is temporary, delay shard reallocation:

```bash
curl -X PUT "localhost:9200/_cluster/settings" -H 'Content-Type: application/json' -d'
{
  "transient": {
    "cluster.routing.allocation.enable": "primaries"
  }
}'
```

## Recovery Procedures

### Scenario 1: Node Can Be Restarted

If the node is recoverable:

```bash
# Start Elasticsearch on the failed node
sudo systemctl start elasticsearch

# Monitor node rejoining
watch -n 2 'curl -s localhost:9200/_cat/nodes?v'

# Check recovery progress
curl -X GET "localhost:9200/_cat/recovery?v&active_only=true"
```

### Scenario 2: Node Data Is Intact

When the node's data directory is preserved:

```bash
# Ensure data directory permissions
sudo chown -R elasticsearch:elasticsearch /var/lib/elasticsearch

# Start Elasticsearch
sudo systemctl start elasticsearch

# The node will recover shards from local data
curl -X GET "localhost:9200/_cat/recovery?v&h=index,shard,type,stage,files_percent,bytes_percent"
```

### Scenario 3: Node Data Is Lost

When the node needs fresh start:

```bash
# Remove node from cluster configuration if using static discovery
# Then start fresh Elasticsearch instance

# After node joins, shards will be replicated from other nodes
curl -X GET "localhost:9200/_cluster/health?wait_for_status=green&timeout=30m"
```

### Scenario 4: Permanent Node Removal

When replacing a failed node:

```bash
# Remove allocation exclusion for old node
curl -X PUT "localhost:9200/_cluster/settings" -H 'Content-Type: application/json' -d'
{
  "transient": {
    "cluster.routing.allocation.exclude._name": "failed-node"
  }
}'

# Add new node to discovery settings
# Update elasticsearch.yml on existing nodes:
# discovery.seed_hosts: ["node-1", "node-2", "new-node"]

# Re-enable allocation
curl -X PUT "localhost:9200/_cluster/settings" -H 'Content-Type: application/json' -d'
{
  "transient": {
    "cluster.routing.allocation.enable": "all"
  }
}'
```

## Shard Rebalancing

### Manual Shard Movement

```bash
# Move a specific shard
curl -X POST "localhost:9200/_cluster/reroute" -H 'Content-Type: application/json' -d'
{
  "commands": [
    {
      "move": {
        "index": "my-index",
        "shard": 0,
        "from_node": "node-2",
        "to_node": "node-3"
      }
    }
  ]
}'
```

### Allocate Unassigned Shard

```bash
# Allocate replica shard
curl -X POST "localhost:9200/_cluster/reroute" -H 'Content-Type: application/json' -d'
{
  "commands": [
    {
      "allocate_replica": {
        "index": "my-index",
        "shard": 0,
        "node": "node-3"
      }
    }
  ]
}'

# Force allocate stale primary (data loss risk)
curl -X POST "localhost:9200/_cluster/reroute" -H 'Content-Type: application/json' -d'
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

### Cancel Ongoing Recovery

```bash
curl -X POST "localhost:9200/_cluster/reroute" -H 'Content-Type: application/json' -d'
{
  "commands": [
    {
      "cancel": {
        "index": "my-index",
        "shard": 0,
        "node": "node-3"
      }
    }
  ]
}'
```

## Recovery Tuning

### Speed Up Recovery

```bash
curl -X PUT "localhost:9200/_cluster/settings" -H 'Content-Type: application/json' -d'
{
  "transient": {
    "indices.recovery.max_bytes_per_sec": "500mb",
    "cluster.routing.allocation.node_concurrent_recoveries": 4,
    "cluster.routing.allocation.node_initial_primaries_recoveries": 8
  }
}'
```

### Monitor Recovery Progress

```bash
# Detailed recovery status
curl -X GET "localhost:9200/_cat/recovery?v&active_only=true"

# Recovery stats
curl -X GET "localhost:9200/_nodes/stats/indices/recovery?pretty"
```

### Throttle Recovery (Reduce Impact)

```bash
curl -X PUT "localhost:9200/_cluster/settings" -H 'Content-Type: application/json' -d'
{
  "transient": {
    "indices.recovery.max_bytes_per_sec": "50mb",
    "cluster.routing.allocation.node_concurrent_recoveries": 2
  }
}'
```

## Handling Split-Brain Scenarios

### Detection

```bash
# Check master node
curl -X GET "localhost:9200/_cat/master?v"

# Check all nodes see the same master
for node in node-1 node-2 node-3; do
  echo "Master seen by $node:"
  curl -s "http://$node:9200/_cat/master"
done
```

### Prevention

```yaml
# elasticsearch.yml
discovery.zen.minimum_master_nodes: 2  # For clusters < 7.x
# 7.x+ handles this automatically with voting configuration
```

### Recovery from Split-Brain

```bash
# Stop all nodes in the minority partition
# Verify cluster state on majority partition
curl -X GET "localhost:9200/_cluster/state?pretty"

# Restart minority nodes - they will rejoin majority cluster
sudo systemctl start elasticsearch
```

## Handling Specific Failure Modes

### Out of Memory (OOM)

```bash
# Check JVM heap usage
curl -X GET "localhost:9200/_nodes/stats/jvm?pretty"

# Increase heap size (max 50% of RAM, not exceeding 31GB)
# Edit /etc/elasticsearch/jvm.options:
# -Xms16g
# -Xmx16g

# Restart node
sudo systemctl restart elasticsearch
```

### Disk Full

```bash
# Check disk usage
curl -X GET "localhost:9200/_cat/allocation?v"

# Clear read-only block
curl -X PUT "localhost:9200/_all/_settings" -H 'Content-Type: application/json' -d'
{
  "index.blocks.read_only_allow_delete": null
}'

# Delete old indices to free space
curl -X DELETE "localhost:9200/logs-2024.01.*"
```

### Network Partition

```bash
# Verify network connectivity
ping node-2
nc -zv node-2 9300

# Check transport layer
curl -X GET "localhost:9200/_nodes/node-2/stats/transport?pretty"

# Verify firewall rules
sudo iptables -L -n | grep 9300
```

## Automated Failure Handling

### Configure Delayed Allocation

```bash
curl -X PUT "localhost:9200/_all/_settings" -H 'Content-Type: application/json' -d'
{
  "settings": {
    "index.unassigned.node_left.delayed_timeout": "5m"
  }
}'
```

### Set Up Alerting

Using Elasticsearch Watcher:

```bash
curl -X PUT "localhost:9200/_watcher/watch/node-failure-alert" -H 'Content-Type: application/json' -d'
{
  "trigger": {
    "schedule": {
      "interval": "1m"
    }
  },
  "input": {
    "http": {
      "request": {
        "host": "localhost",
        "port": 9200,
        "path": "/_cluster/health"
      }
    }
  },
  "condition": {
    "compare": {
      "ctx.payload.number_of_nodes": {
        "lt": 3
      }
    }
  },
  "actions": {
    "notify_ops": {
      "webhook": {
        "method": "POST",
        "url": "https://hooks.slack.com/services/xxx/yyy/zzz",
        "body": "Node failure detected! Only {{ctx.payload.number_of_nodes}} nodes in cluster."
      }
    }
  }
}'
```

## Recovery Checklist

After a node failure, follow this checklist:

```bash
# 1. Check cluster health
curl -s localhost:9200/_cluster/health?pretty | jq '.status, .number_of_nodes, .unassigned_shards'

# 2. Identify unassigned shards
curl -s localhost:9200/_cat/shards | grep UNASSIGNED

# 3. Check allocation explain
curl -s localhost:9200/_cluster/allocation/explain?pretty

# 4. Monitor recovery
curl -s localhost:9200/_cat/recovery?v&active_only=true

# 5. Verify all shards assigned
curl -s localhost:9200/_cluster/health?wait_for_status=green&timeout=30m

# 6. Check node attributes
curl -s localhost:9200/_cat/nodeattrs?v

# 7. Verify index health
curl -s localhost:9200/_cat/indices?v&health=yellow
curl -s localhost:9200/_cat/indices?v&health=red
```

## Best Practices

### Pre-Failure Preparation

1. **Maintain 3+ master-eligible nodes** for quorum
2. **Configure allocation awareness** across failure domains
3. **Set appropriate replica counts** (minimum 1 for production)
4. **Monitor cluster health** continuously
5. **Test recovery procedures** regularly

### During Failure

1. **Assess impact** before taking action
2. **Delay allocation** for temporary failures
3. **Document actions** for post-incident review
4. **Communicate status** to stakeholders

### Post-Failure

1. **Verify full recovery** - all shards green
2. **Review logs** for root cause
3. **Update procedures** based on lessons learned
4. **Test backups** to ensure they work

## Summary

Handling Elasticsearch node failures effectively requires:

1. **Quick detection** through monitoring and alerting
2. **Proper assessment** of failure type and impact
3. **Appropriate response** based on failure scenario
4. **Recovery monitoring** until cluster returns to green
5. **Post-incident review** to prevent recurrence

With proper preparation and these recovery procedures, you can minimize downtime and data loss during node failures.
