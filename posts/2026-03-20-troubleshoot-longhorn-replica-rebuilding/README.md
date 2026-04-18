# How to Troubleshoot Longhorn Replica Rebuilding

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Longhorn, Kubernetes, Storage, Troubleshooting, Replica, Replication

Description: Diagnose and resolve issues with Longhorn replica rebuilding, including stuck rebuilds, slow rebuilds, and volumes stuck in degraded state.

## Introduction

When a Longhorn replica fails or a new replica needs to be built (due to scaling up replica count or replacing a failed replica), Longhorn initiates a rebuild process. This process copies data from a healthy replica to the new one. Problems during rebuilding can leave volumes in a degraded state, increasing the risk of data loss. This guide helps you diagnose and resolve replica rebuilding issues.

## Understanding the Rebuild Process

1. A replica is marked as failed (node down, disk error, etc.)
2. Longhorn schedules a new replica on an available node
3. The new replica syncs data from a healthy replica
4. Once caught up, it becomes a full member

## Initial Diagnosis

```bash
# Check volume robustness - degraded means rebuilding or missing replicas

kubectl get volumes.longhorn.io -n longhorn-system \
  -o custom-columns="NAME:.metadata.name,STATE:.status.state,ROBUSTNESS:.status.robustness"

# Look for volumes with "degraded" robustness
kubectl get volumes.longhorn.io -n longhorn-system \
  -o json | \
  jq -r '.items[] | select(.status.robustness == "degraded") | .metadata.name'

# Check replica status for a specific volume
kubectl get replicas.longhorn.io -n longhorn-system \
  -l longhornvolume=<volume-name>

# Get detailed replica information
kubectl describe replicas.longhorn.io -n longhorn-system \
  -l longhornvolume=<volume-name>
```

## Issue 1: Rebuild Not Starting

A volume is degraded but no rebuild is occurring.

```bash
# Check if there are schedulable nodes available
kubectl get nodes.longhorn.io -n longhorn-system | grep -v true

# Check disk availability on nodes
kubectl get nodes.longhorn.io -n longhorn-system \
  -o yaml | grep -E "storageAvailable|allowScheduling"

# Check the Longhorn manager logs for scheduling errors
kubectl logs -n longhorn-system \
  -l app=longhorn-manager \
  --tail=100 | grep -i "replica\|schedule\|error"
```

### Common Cause: No Schedulable Nodes

```bash
# Check if node scheduling is disabled
kubectl get nodes.longhorn.io -n longhorn-system \
  -o custom-columns="NAME:.metadata.name,SCHEDULABLE:.spec.allowScheduling"

# Re-enable scheduling on a node
kubectl patch nodes.longhorn.io <node-name> \
  -n longhorn-system \
  --type merge \
  -p '{"spec": {"allowScheduling": true}}'
```

### Common Cause: Insufficient Disk Space

```bash
# Check disk space across all Longhorn nodes
kubectl get nodes.longhorn.io -n longhorn-system -o yaml | \
  grep -A 3 "storageAvailable:"

# If a node has low storage, increase the over-provisioning setting or free space
kubectl patch settings.longhorn.io storage-over-provisioning-percentage \
  -n longhorn-system \
  --type merge \
  -p '{"value": "300"}'
```

## Issue 2: Replica Stuck in Rebuilding State

A rebuild has been running for too long.

```bash
# Check rebuild progress
kubectl describe replicas.longhorn.io -n longhorn-system \
  -l longhornvolume=<volume-name> | grep -A 5 "Status:"

# Check the rebuilding replica's node
kubectl get replicas.longhorn.io -n longhorn-system \
  -l longhornvolume=<volume-name> \
  -o custom-columns="NAME:.metadata.name,NODE:.spec.nodeID,STATE:.status.currentState"

# Check the instance manager on the target node
kubectl get pods -n longhorn-system \
  -l app=longhorn-instance-manager \
  --field-selector spec.nodeName=<target-node>

# Check instance manager logs for the rebuilding process
kubectl logs -n longhorn-system <instance-manager-pod> --tail=100
```

### Solution: Restart the Rebuild

```bash
# Delete the stuck replica to trigger a fresh rebuild
kubectl delete replica.longhorn.io <stuck-replica-name> -n longhorn-system

# Longhorn will automatically schedule a new replica
kubectl get replicas.longhorn.io -n longhorn-system \
  -l longhornvolume=<volume-name> -w
```

## Issue 3: Rebuild Fails Repeatedly

```bash
# Check the error messages on the failed replica
kubectl describe replica.longhorn.io <replica-name> -n longhorn-system | \
  grep -i "error\|fail\|reason"

# Check the volume engine logs
kubectl logs -n longhorn-system \
  -l longhorn.io/managed-by=longhorn-manager \
  --tail=200 | grep -i "rebuild\|error"
```

### Common Cause: Network Issues Between Nodes

```bash
# Test network connectivity between nodes
# SSH to source node
ping <destination-node-ip>

# Test the Longhorn manager port (9500)
nc -zv <destination-node-ip> 9500

# Check for firewall rules blocking Longhorn ports
# Longhorn manager uses TCP 9500; instance managers use dynamic data ports
# in the 10000-30000 range for engine/replica communication
iptables -L -n | grep -E "9500|10000"
```

### Common Cause: Disk Errors on Target Node

```bash
# Check disk health on the target node
# SSH to the node
dmesg | grep -i "error\|I/O error\|EXT4-fs error" | tail -20

# Check filesystem errors
journalctl -u longhorn-manager | grep -i "disk\|filesystem\|error" | tail -50

# Check smart disk status
smartctl -a /dev/sdb  # Replace with the actual disk device
```

## Issue 4: Too Many Concurrent Rebuilds Impacting Performance

```bash
# Check current concurrent rebuild limit
kubectl get settings.longhorn.io concurrent-replica-rebuild-per-node-limit \
  -n longhorn-system -o yaml

# Reduce concurrent rebuilds to minimize I/O impact
kubectl patch settings.longhorn.io concurrent-replica-rebuild-per-node-limit \
  -n longhorn-system \
  --type merge \
  -p '{"value": "2"}'  # Reduce from default 5

# Monitor rebuild progress
kubectl get replicas.longhorn.io -n longhorn-system | grep rebuilding
```

## Monitoring Rebuild Progress

```bash
# Script to monitor active rebuilds
cat << 'EOF' > monitor-rebuilds.sh
#!/bin/bash
echo "=== Replica Status ==="
while true; do
  echo "--- $(date) ---"
  kubectl get replicas.longhorn.io -n longhorn-system \
    -o custom-columns="NAME:.metadata.name,VOLUME:.spec.volumeName,NODE:.spec.nodeID,STATE:.status.currentState" | \
    grep -v "running"
  sleep 30
done
EOF
chmod +x monitor-rebuilds.sh
./monitor-rebuilds.sh
```

## Forcing a Volume to Re-evaluate Replicas

If a volume is stuck degraded even though all nodes are healthy:

```bash
# Check the volume's engine status
kubectl describe volumes.longhorn.io <volume-name> -n longhorn-system | \
  grep -A 20 "Conditions:"

# Try detaching and reattaching the volume
# First ensure no pod is using it, then:
kubectl patch volumes.longhorn.io <volume-name> \
  -n longhorn-system \
  --type merge \
  -p '{"spec": {"nodeID": ""}}'

# Then reattach it to the appropriate node
```

## Conclusion

Replica rebuilding issues in Longhorn are usually caused by resource constraints (disk space, schedulable nodes), network problems, or transient errors. By systematically checking node availability, disk space, network connectivity, and instance manager health, you can identify the root cause and restore volumes to a healthy state. Proactive monitoring with Prometheus alerts for degraded volumes allows you to catch these issues early before they escalate to complete volume failure.
