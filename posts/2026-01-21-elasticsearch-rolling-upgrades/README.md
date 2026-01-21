# How to Upgrade Elasticsearch Without Downtime

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Elasticsearch, Upgrades, Rolling Upgrade, Migration, Zero Downtime, Operations

Description: A comprehensive guide to upgrading Elasticsearch without downtime using rolling upgrades, covering version compatibility, pre-upgrade checks, and step-by-step upgrade procedures.

---

Upgrading Elasticsearch requires careful planning to avoid downtime and data loss. Rolling upgrades allow you to upgrade one node at a time while the cluster continues serving requests. This guide covers the complete upgrade process for zero-downtime upgrades.

## Upgrade Paths

### Supported Upgrade Paths

- 7.17 -> 8.x (requires upgrade to 7.17 first)
- 8.x -> 8.y (rolling upgrade supported)
- Major version upgrades require intermediate versions

### Check Current Version

```bash
curl -X GET "https://localhost:9200" \
  -u elastic:password

curl -X GET "https://localhost:9200/_nodes?filter_path=nodes.*.version" \
  -u elastic:password
```

## Pre-Upgrade Checklist

### 1. Check Deprecation Warnings

```bash
curl -X GET "https://localhost:9200/_migration/deprecations" \
  -u elastic:password
```

### 2. Verify Cluster Health

```bash
curl -X GET "https://localhost:9200/_cluster/health?pretty" \
  -u elastic:password

# Should be GREEN before upgrading
```

### 3. Create Snapshot Backup

```bash
# Create snapshot repository if not exists
curl -X PUT "https://localhost:9200/_snapshot/upgrade_backup" \
  -H "Content-Type: application/json" \
  -u elastic:password \
  -d '{
    "type": "fs",
    "settings": {
      "location": "/mount/backups/pre_upgrade"
    }
  }'

# Create snapshot
curl -X PUT "https://localhost:9200/_snapshot/upgrade_backup/pre_upgrade_snapshot?wait_for_completion=true" \
  -H "Content-Type: application/json" \
  -u elastic:password \
  -d '{
    "indices": "*",
    "include_global_state": true
  }'
```

### 4. Disable Shard Allocation

Prevents shard movement during node restart:

```bash
curl -X PUT "https://localhost:9200/_cluster/settings" \
  -H "Content-Type: application/json" \
  -u elastic:password \
  -d '{
    "persistent": {
      "cluster.routing.allocation.enable": "primaries"
    }
  }'
```

### 5. Stop Non-Essential Indexing

```bash
# Optionally stop indexing to speed up recovery
curl -X PUT "https://localhost:9200/_cluster/settings" \
  -H "Content-Type: application/json" \
  -u elastic:password \
  -d '{
    "transient": {
      "cluster.routing.rebalance.enable": "none"
    }
  }'
```

### 6. Perform Synced Flush (Pre-8.0)

```bash
# For versions before 8.0
curl -X POST "https://localhost:9200/_flush/synced" \
  -u elastic:password
```

## Rolling Upgrade Procedure

### Step 1: Upgrade One Node

For each node, starting with data-only nodes:

```bash
# 1. Stop indexing to this node
# 2. Disable shard allocation (done above)

# 3. Stop Elasticsearch
sudo systemctl stop elasticsearch

# 4. Upgrade the package
# Debian/Ubuntu
sudo apt-get update && sudo apt-get install elasticsearch=8.12.0

# RHEL/CentOS
sudo yum install elasticsearch-8.12.0

# 5. Update configuration if needed
# Review /etc/elasticsearch/elasticsearch.yml

# 6. Start Elasticsearch
sudo systemctl start elasticsearch

# 7. Wait for node to join
curl -X GET "https://localhost:9200/_cat/nodes?v" \
  -u elastic:password
```

### Step 2: Wait for Cluster Recovery

```bash
# Wait for yellow (all primaries allocated)
curl -X GET "https://localhost:9200/_cluster/health?wait_for_status=yellow&timeout=5m" \
  -u elastic:password
```

### Step 3: Re-enable Shard Allocation

```bash
curl -X PUT "https://localhost:9200/_cluster/settings" \
  -H "Content-Type: application/json" \
  -u elastic:password \
  -d '{
    "persistent": {
      "cluster.routing.allocation.enable": null
    }
  }'
```

### Step 4: Wait for Green Status

```bash
curl -X GET "https://localhost:9200/_cluster/health?wait_for_status=green&timeout=5m" \
  -u elastic:password
```

### Step 5: Repeat for Each Node

Repeat steps 1-4 for remaining nodes:
1. Data nodes first
2. Then ingest nodes
3. Master-eligible nodes last
4. Dedicated master nodes very last

## Automated Rolling Upgrade Script

```bash
#!/bin/bash

ES_HOST="localhost"
ES_PORT="9200"
ES_USER="elastic"
ES_PASS="password"
NEW_VERSION="8.12.0"

# Function to wait for green status
wait_for_green() {
    echo "Waiting for cluster to become green..."
    while true; do
        STATUS=$(curl -s -X GET "https://$ES_HOST:$ES_PORT/_cluster/health" \
            -u $ES_USER:$ES_PASS | jq -r '.status')
        if [ "$STATUS" == "green" ]; then
            echo "Cluster is green!"
            break
        fi
        echo "Current status: $STATUS. Waiting..."
        sleep 10
    done
}

# Function to wait for yellow status
wait_for_yellow() {
    echo "Waiting for cluster to become at least yellow..."
    while true; do
        STATUS=$(curl -s -X GET "https://$ES_HOST:$ES_PORT/_cluster/health" \
            -u $ES_USER:$ES_PASS | jq -r '.status')
        if [ "$STATUS" == "green" ] || [ "$STATUS" == "yellow" ]; then
            echo "Cluster is $STATUS!"
            break
        fi
        echo "Current status: $STATUS. Waiting..."
        sleep 10
    done
}

# Function to disable shard allocation
disable_allocation() {
    echo "Disabling shard allocation..."
    curl -X PUT "https://$ES_HOST:$ES_PORT/_cluster/settings" \
        -H "Content-Type: application/json" \
        -u $ES_USER:$ES_PASS \
        -d '{
            "persistent": {
                "cluster.routing.allocation.enable": "primaries"
            }
        }'
}

# Function to enable shard allocation
enable_allocation() {
    echo "Enabling shard allocation..."
    curl -X PUT "https://$ES_HOST:$ES_PORT/_cluster/settings" \
        -H "Content-Type: application/json" \
        -u $ES_USER:$ES_PASS \
        -d '{
            "persistent": {
                "cluster.routing.allocation.enable": null
            }
        }'
}

# Function to upgrade a node
upgrade_node() {
    NODE=$1
    echo "=== Upgrading node: $NODE ==="

    # SSH to node and perform upgrade
    ssh $NODE << EOF
        sudo systemctl stop elasticsearch
        sudo apt-get update
        sudo apt-get install -y elasticsearch=$NEW_VERSION
        sudo systemctl start elasticsearch
EOF

    echo "Waiting for node $NODE to rejoin..."
    sleep 30
}

# Main upgrade procedure
echo "Starting rolling upgrade to version $NEW_VERSION"

# 1. Check cluster health
echo "Checking cluster health..."
HEALTH=$(curl -s -X GET "https://$ES_HOST:$ES_PORT/_cluster/health" \
    -u $ES_USER:$ES_PASS | jq -r '.status')
if [ "$HEALTH" != "green" ]; then
    echo "ERROR: Cluster is not green. Current status: $HEALTH"
    exit 1
fi

# 2. Create pre-upgrade snapshot
echo "Creating pre-upgrade snapshot..."
curl -X PUT "https://$ES_HOST:$ES_PORT/_snapshot/upgrade_backup/pre_upgrade_$(date +%Y%m%d_%H%M%S)?wait_for_completion=true" \
    -H "Content-Type: application/json" \
    -u $ES_USER:$ES_PASS \
    -d '{"indices": "*", "include_global_state": true}'

# 3. Get list of nodes (data nodes first, then master)
DATA_NODES=$(curl -s -X GET "https://$ES_HOST:$ES_PORT/_cat/nodes?h=name,node.role" \
    -u $ES_USER:$ES_PASS | grep 'd' | awk '{print $1}')
MASTER_NODES=$(curl -s -X GET "https://$ES_HOST:$ES_PORT/_cat/nodes?h=name,node.role" \
    -u $ES_USER:$ES_PASS | grep 'm' | awk '{print $1}')

# 4. Upgrade data nodes
for NODE in $DATA_NODES; do
    disable_allocation
    upgrade_node $NODE
    wait_for_yellow
    enable_allocation
    wait_for_green
done

# 5. Upgrade master nodes
for NODE in $MASTER_NODES; do
    disable_allocation
    upgrade_node $NODE
    wait_for_yellow
    enable_allocation
    wait_for_green
done

echo "=== Rolling upgrade complete! ==="
curl -X GET "https://$ES_HOST:$ES_PORT/_cat/nodes?v" \
    -u $ES_USER:$ES_PASS
```

## Upgrading on Kubernetes

### Using ECK Operator

```yaml
apiVersion: elasticsearch.k8s.elastic.co/v1
kind: Elasticsearch
metadata:
  name: elasticsearch
spec:
  version: 8.12.0  # Change version here
  nodeSets:
  - name: default
    count: 3
    config:
      node.store.allow_mmap: false
    podTemplate:
      spec:
        containers:
        - name: elasticsearch
          resources:
            limits:
              memory: 4Gi
              cpu: 2
```

Apply the update:

```bash
kubectl apply -f elasticsearch.yaml

# Watch the rolling update
kubectl get pods -w -l elasticsearch.k8s.elastic.co/cluster-name=elasticsearch
```

### Check ECK Upgrade Status

```bash
kubectl get elasticsearch

# View upgrade progress
kubectl describe elasticsearch elasticsearch
```

## Post-Upgrade Tasks

### 1. Verify All Nodes Upgraded

```bash
curl -X GET "https://localhost:9200/_cat/nodes?v&h=name,version" \
  -u elastic:password
```

### 2. Check Cluster Health

```bash
curl -X GET "https://localhost:9200/_cluster/health?pretty" \
  -u elastic:password
```

### 3. Verify Index Compatibility

```bash
curl -X GET "https://localhost:9200/_cat/indices?v&h=index,status,health" \
  -u elastic:password
```

### 4. Update Index Settings

Some settings may need updating after upgrade:

```bash
curl -X PUT "https://localhost:9200/_all/_settings" \
  -H "Content-Type: application/json" \
  -u elastic:password \
  -d '{
    "index.routing.allocation.require._tier_preference": null
  }'
```

### 5. Reindex Old Indices (if needed)

```bash
# Check for indices that need reindexing
curl -X GET "https://localhost:9200/_cat/indices?v&h=index,creation.date.string" \
  -u elastic:password

# Reindex if necessary
curl -X POST "https://localhost:9200/_reindex" \
  -H "Content-Type: application/json" \
  -u elastic:password \
  -d '{
    "source": { "index": "old_index" },
    "dest": { "index": "new_index" }
  }'
```

## Rollback Procedure

If upgrade fails:

### 1. Stop the Upgraded Node

```bash
sudo systemctl stop elasticsearch
```

### 2. Downgrade Package

```bash
# Debian/Ubuntu
sudo apt-get install elasticsearch=8.11.0

# RHEL/CentOS
sudo yum downgrade elasticsearch-8.11.0
```

### 3. Restore from Snapshot (if needed)

```bash
# Close indices
curl -X POST "https://localhost:9200/_all/_close" \
  -u elastic:password

# Restore snapshot
curl -X POST "https://localhost:9200/_snapshot/upgrade_backup/pre_upgrade_snapshot/_restore" \
  -H "Content-Type: application/json" \
  -u elastic:password \
  -d '{
    "indices": "*",
    "include_global_state": true
  }'
```

## Best Practices

### 1. Always Backup First

Create a snapshot before any upgrade.

### 2. Test in Non-Production First

Upgrade development/staging clusters first.

### 3. Read Release Notes

Check for breaking changes and deprecations.

### 4. Plan for Downgrade

Know the rollback procedure before starting.

### 5. Monitor During Upgrade

Watch cluster health and performance metrics.

### 6. Upgrade During Low Traffic

Schedule upgrades during maintenance windows.

### 7. Keep One Version Behind

Test new versions before production deployment.

## Conclusion

Zero-downtime Elasticsearch upgrades require:

1. **Pre-upgrade preparation** - backups, deprecation checks
2. **Rolling upgrade procedure** - one node at a time
3. **Shard allocation management** - prevent unnecessary movement
4. **Health monitoring** - wait for recovery between nodes
5. **Post-upgrade verification** - check all nodes and indices

With proper planning, you can upgrade Elasticsearch clusters without service interruption.
