# How to Troubleshoot Longhorn Replica Rebuilding Loops

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Longhorn, Troubleshooting, Replica Rebuilding, Storage, Kubernetes, Data Recovery, SUSE Rancher

Description: Learn how to diagnose and resolve Longhorn replica rebuilding failures, understand replica states, manage rebuilding priorities, and recover degraded volumes.

---

Longhorn volumes become degraded when a replica fails or a node goes offline. The replica rebuilding process restores redundancy by copying data to a replacement replica. Rebuilding failures can leave volumes in a degraded state, increasing the risk of data loss.

---

## Understanding Replica States

| State | Description |
|---|---|
| Running | Replica process is running |
| Starting | Replica process is starting |
| Stopping | Replica process is stopping |
| Stopped | Replica process is stopped |
| Error | Replica process has encountered an error |
| Unknown | Longhorn cannot determine the replica state |

---

## Step 1: Check Volume and Replica Status

```bash
# List all volumes and their robustness

kubectl get volume -n longhorn-system \
  -o custom-columns='NAME:.metadata.name,STATE:.status.state,ROBUSTNESS:.status.robustness'

# Check replicas for a specific volume
kubectl get replica -n longhorn-system \
  -l longhornvolume=<volume-name> \
  -o custom-columns='NAME:.metadata.name,NODE:.spec.nodeID,STATE:.status.currentState'

# Describe a specific replica for error details
kubectl describe replica <replica-name> -n longhorn-system
```

---

## Step 2: Check Rebuilding Progress

```bash
# Forward the Longhorn backend API locally
kubectl port-forward -n longhorn-system svc/longhorn-backend 9500:9500

# In another terminal, query rebuild progress for the volume
curl -s http://127.0.0.1:9500/v1/volumes/<volume-name> \
  | jq '.rebuildStatus'

# Or use the Longhorn UI:
# Volumes → select volume → Replicas tab
# Look for "Rebuilding: X%" progress
```

---

## Step 3: Diagnose Rebuilding Failures

```bash
# Check Longhorn manager logs for rebuilding errors
kubectl logs -n longhorn-system \
  $(kubectl get pod -n longhorn-system -l app=longhorn-manager -o name | head -1) \
  | grep -i "rebuild\|replica\|error" | tail -50

# Find the instance manager for the replica
kubectl get replica <replica-name> -n longhorn-system \
  -o jsonpath='{.status.instanceManagerName}{"\n"}'

# Check logs for that instance manager pod
kubectl logs -n longhorn-system <instance-manager-name>
```

---

## Common Issue 1: Rebuilding Stalls Due to Disk Space

```bash
# Check disk usage on all nodes
kubectl get node.longhorn.io -n longhorn-system -o yaml \
  | grep -A 5 "diskStatus"

# Check disk space directly on the node
kubectl debug node/<node-name> -it --image=alpine -- \
  df -h /host/var/lib/longhorn

# If disk is full, expand the disk or add a new disk to Longhorn
# Longhorn UI → Node → Edit → Add Disk
```

---

## Common Issue 2: Rebuilding Fails Due to Network Issues

```bash
# Get the replica's runtime IP and port
kubectl get replica -n longhorn-system \
  -l longhornvolume=<volume-name> \
  -o custom-columns='NAME:.metadata.name,IP:.status.ip,PORT:.status.port'

# Check network connectivity between nodes
# Replica runtime ports are assigned dynamically, so use the port from the command above

kubectl debug node/<source-node> -it --image=alpine -- \
  nc -zv <replica-ip> <replica-port>

# Check for NetworkPolicy blocking Longhorn traffic
kubectl get networkpolicy -A | grep longhorn
```

---

## Common Issue 3: Manual Replica Removal and Rebuild

If a replica is stuck in a failed state on a degraded volume and not rebuilding automatically:

```bash
# Delete the failed replica (Longhorn will create a new one)
kubectl delete replica <failed-replica-name> -n longhorn-system

# Monitor the new replica being created
kubectl get replica -n longhorn-system \
  -l longhornvolume=<volume-name> -w
```

---

## Step 4: Configure Rebuilding Settings

```bash
# Adjust concurrent rebuild limit (default: 5)
kubectl patch setting -n longhorn-system \
  concurrent-replica-rebuild-per-node-limit \
  --type merge \
  -p '{"value":"2"}'

# Adjust how long Longhorn waits before creating a replacement replica (seconds, default: 600)
kubectl patch setting -n longhorn-system \
  replica-replenishment-wait-interval \
  --type merge \
  -p '{"value":"600"}'
```

---

## Step 5: Force a Volume to Rebuild

```bash
# Detach and reattach the volume to trigger rebuilding
# First, scale down the workload
kubectl scale deployment <deployment-name> --replicas=0

# Wait for the volume to detach
kubectl get volume -n longhorn-system <volume-name> -w

# Scale back up - Longhorn will reattach and trigger rebuild
kubectl scale deployment <deployment-name> --replicas=1
```

---

## Step 6: Verify Rebuild Completion

```bash
# Volume should show "healthy" after rebuild completes
kubectl get volume -n longhorn-system <volume-name> \
  -o jsonpath='{.status.robustness}'

# All replicas should be "running"
kubectl get replica -n longhorn-system \
  -l longhornvolume=<volume-name> \
  -o jsonpath='{.items[*].status.currentState}'
```

---

## Best Practices

- Monitor Longhorn volume robustness with Prometheus alerts - a volume in `degraded` state means rebuilding is needed and the risk of data loss is elevated.
- Set `concurrent-replica-rebuild-per-node-limit` to a value that won't overwhelm node I/O during peak hours - rebuilding is I/O intensive.
- Keep more free space than the `storage-minimal-available-percentage` threshold (25% by default) on Longhorn disks - rebuilding requires extra space on the target disk.
