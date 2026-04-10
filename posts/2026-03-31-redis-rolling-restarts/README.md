# How to Perform Redis Rolling Restarts

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Redis, High Availability, Operation

Description: Learn how to perform Redis rolling restarts across Sentinel and Cluster setups to apply configuration changes with zero downtime.

---

Rolling restarts allow you to restart Redis nodes one at a time without taking your entire deployment offline. This technique is essential when applying kernel updates, changing configuration that requires a restart, or upgrading Redis versions.

## Rolling Restart with Redis Sentinel

In a Sentinel-managed setup (1 primary + 2 replicas), always restart replicas first:

```bash
# Step 1: Identify current roles
redis-cli -h sentinel-1 -p 26379 SENTINEL masters
redis-cli -h sentinel-1 -p 26379 SENTINEL replicas mymaster

# Output shows which host is currently primary
```

Restart replicas first:

```bash
#!/bin/bash
# rolling-restart-sentinel.sh
SENTINEL_HOST="sentinel-1"
SENTINEL_PORT="26379"
MASTER_NAME="mymaster"

get_master() {
  redis-cli -h "$SENTINEL_HOST" -p "$SENTINEL_PORT" SENTINEL get-master-addr-by-name "$MASTER_NAME" | head -1
}

MASTER_IP=$(get_master)
echo "Current primary: $MASTER_IP"

# Restart non-primary nodes first
for HOST in redis-1 redis-2 redis-3; do
  NODE_IP=$(getent hosts "$HOST" | awk '{print $1}')
  if [ "$NODE_IP" != "$MASTER_IP" ]; then
    echo "Restarting replica: $HOST"
    ssh "$HOST" "sudo systemctl restart redis"
    sleep 5  # Wait for node to rejoin
    redis-cli -h "$HOST" PING || { echo "FAIL: $HOST did not recover"; exit 1; }
    redis-cli -h "$HOST" INFO replication | grep master_link_status
    echo "Replica $HOST restarted successfully"
    sleep 10  # Stabilize replication
  fi
done

# Now failover primary to a healthy replica
echo "Triggering failover from primary: $MASTER_IP"
redis-cli -h "$SENTINEL_HOST" -p "$SENTINEL_PORT" SENTINEL FAILOVER "$MASTER_NAME"

# Wait for new primary election
sleep 15
NEW_MASTER=$(get_master)
echo "New primary: $NEW_MASTER"

# Restart old primary (now a replica)
OLD_PRIMARY_HOST=$(getent hosts "$MASTER_IP" | awk '{print $2}')
echo "Restarting old primary: $OLD_PRIMARY_HOST"
ssh "$OLD_PRIMARY_HOST" "sudo systemctl restart redis"
sleep 5
redis-cli -h "$OLD_PRIMARY_HOST" PING
echo "Rolling restart complete"
```

## Rolling Restart with Redis Cluster

For Redis Cluster, restart one node at a time and verify cluster health before proceeding:

```bash
#!/bin/bash
# rolling-restart-cluster.sh
NODES=("redis-node-1:6379" "redis-node-2:6379" "redis-node-3:6379"
       "redis-node-4:6379" "redis-node-5:6379" "redis-node-6:6379")

check_cluster_ok() {
  redis-cli -c -h redis-node-1 -p 6379 CLUSTER INFO | grep cluster_state | grep -q "ok"
}

for NODE in "${NODES[@]}"; do
  HOST="${NODE%:*}"
  PORT="${NODE#*:}"

  # Check role and skip primaries with no healthy replica
  ROLE=$(redis-cli -h "$HOST" -p "$PORT" INFO replication | grep "^role:" | cut -d: -f2 | tr -d '\r')
  if [ "$ROLE" = "master" ]; then
    REPLICA_COUNT=$(redis-cli -h "$HOST" -p "$PORT" INFO replication | grep "^connected_slaves:" | cut -d: -f2 | tr -d '\r')
    if [ "$REPLICA_COUNT" -eq 0 ]; then
      echo "WARNING: Skipping $HOST - primary with no connected replicas"
      continue
    fi
  fi
  echo "Restarting $HOST ($ROLE)"

  ssh "$HOST" "sudo systemctl restart redis"
  sleep 10

  # Verify node rejoined cluster
  redis-cli -h "$HOST" -p "$PORT" PING || { echo "FAIL: $HOST did not recover"; exit 1; }
  redis-cli -h "$HOST" -p "$PORT" CLUSTER INFO | grep cluster_state

  # Wait for cluster to stabilize
  for i in {1..12}; do
    check_cluster_ok && break
    echo "Waiting for cluster to stabilize... ($i/12)"
    sleep 5
  done

  check_cluster_ok || { echo "FAIL: Cluster not OK after restarting $HOST"; exit 1; }
  echo "$HOST restarted successfully"
done

echo "Rolling restart complete for all nodes"
```

## Monitoring During Rolling Restart

```bash
# Watch cluster state in real time
watch -n 2 'redis-cli CLUSTER INFO | grep -E "cluster_state:|cluster_slots_ok:|cluster_known_nodes:"'

# Monitor replication lag
redis-cli INFO replication | grep -E "master_repl_offset:|slave0:"
```

## Summary

Rolling restarts preserve availability by restarting replicas first, waiting for replication to stabilize, then using Sentinel failover or Cluster resharding to safely restart the primary. Always verify health after each node restart before proceeding to the next, and monitor cluster state throughout the process.
