# How to Use talosctl memory to Check Memory Usage

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Talos Linux, talosctl, Memory Management, Monitoring, Performance

Description: Learn how to use the talosctl memory command to check and analyze memory usage on Talos Linux nodes for performance monitoring

---

Memory usage is one of the most important metrics to track on any server, and Talos Linux nodes are no exception. Running out of memory can cause the OOM killer to terminate critical processes, leading to node instability or complete failure. The `talosctl memory` command gives you a quick, comprehensive view of memory usage on any Talos Linux node without needing SSH access.

## Basic Usage

To check memory usage on a node:

```bash
# Check memory usage on a single node
talosctl memory --nodes 192.168.1.10
```

The output shows the standard Linux memory information, similar to what you would see from `/proc/meminfo`:

```
TOTAL         USED          FREE          SHARED        BUFFERS       CACHE
16384 MB      8192 MB       4096 MB       256 MB        512 MB        3328 MB
```

This gives you a quick overview of how much memory is total, how much is actively used, how much is free, and how much is being used for buffers and cache.

## Understanding Memory Metrics

The numbers reported by `talosctl memory` can be confusing if you are not familiar with how Linux manages memory:

- **Total**: The total physical RAM installed in the node.
- **Used**: Memory actively in use by applications and the kernel.
- **Free**: Memory that is completely unused.
- **Shared**: Memory used by tmpfs and shared memory segments.
- **Buffers**: Memory used by the kernel for block device I/O buffers.
- **Cache**: Memory used by the page cache for file system data.

The important thing to understand is that buffers and cache are not wasted memory. Linux aggressively uses free memory for caching to improve performance. This memory can be reclaimed immediately when applications need it.

The real metric to worry about is "available" memory, which is the sum of free memory plus reclaimable cache and buffers. As long as available memory is reasonable, your node is fine.

## Checking Memory Across Multiple Nodes

To compare memory usage across your cluster:

```bash
# Check memory on all nodes
talosctl memory --nodes 192.168.1.10,192.168.1.11,192.168.1.12,192.168.1.20,192.168.1.21
```

This shows memory information for each node side by side, making it easy to spot nodes that are under memory pressure.

## Scripting Memory Checks

You can automate memory monitoring with scripts:

```bash
#!/bin/bash
# memory-check.sh - Check memory across all cluster nodes

NODES="192.168.1.10 192.168.1.11 192.168.1.12 192.168.1.20 192.168.1.21 192.168.1.22"

echo "Memory Usage Report - $(date)"
echo "==============================="

for node in $NODES; do
  echo ""
  echo "Node: $node"
  talosctl memory --nodes "$node" 2>/dev/null
done
```

## Detecting Memory Pressure

When a node is running low on memory, several things can happen:

1. The kernel starts reclaiming cache aggressively, which degrades I/O performance.
2. Swap (if enabled) starts being used, which significantly slows down processes.
3. The OOM killer activates and terminates processes to free memory.
4. Kubernetes marks the node as having memory pressure and starts evicting pods.

```bash
# Check for memory pressure indicators
talosctl memory --nodes 192.168.1.20

# Also check if Kubernetes has noticed memory pressure
kubectl describe node worker-1 | grep -A5 "Conditions"

# Look for OOM kills in kernel logs
talosctl dmesg --nodes 192.168.1.20 | grep -i "oom\|out of memory"
```

## Combining Memory with Other Metrics

Memory usage alone does not tell the full story. Combine it with other metrics for a complete picture:

```bash
# Check memory usage
talosctl memory --nodes 192.168.1.20

# Check what processes are running
talosctl processes --nodes 192.168.1.20

# Check container resource usage
talosctl stats --nodes 192.168.1.20

# Check disk usage
talosctl disks --nodes 192.168.1.20

# Check file system mounts
talosctl mounts --nodes 192.168.1.20
```

## Setting Up Memory Alerts

While `talosctl memory` is great for manual checks, you should also have automated monitoring. Here is a script that can be run via cron to alert on low memory:

```bash
#!/bin/bash
# memory-alert.sh - Alert when memory usage is high

NODE=$1
THRESHOLD_PERCENT=85

if [ -z "$NODE" ]; then
  echo "Usage: $0 <node-address>"
  exit 1
fi

# Get memory info
MEMORY_OUTPUT=$(talosctl memory --nodes "$NODE" 2>&1)

# Parse total and used memory (adjust parsing based on actual output format)
TOTAL=$(echo "$MEMORY_OUTPUT" | tail -1 | awk '{print $1}')
USED=$(echo "$MEMORY_OUTPUT" | tail -1 | awk '{print $2}')

if [ -n "$TOTAL" ] && [ "$TOTAL" -gt 0 ] 2>/dev/null; then
  USAGE_PERCENT=$((USED * 100 / TOTAL))

  if [ "$USAGE_PERCENT" -ge "$THRESHOLD_PERCENT" ]; then
    echo "ALERT: Node $NODE memory usage is ${USAGE_PERCENT}% (threshold: ${THRESHOLD_PERCENT}%)"
    echo "Total: $TOTAL MB, Used: $USED MB"
    # Add your alerting mechanism here (email, Slack, PagerDuty, etc.)
    exit 1
  else
    echo "OK: Node $NODE memory usage is ${USAGE_PERCENT}%"
  fi
fi
```

## Memory Usage and Kubernetes Resource Requests

Kubernetes resource requests and limits play a major role in memory usage on your nodes:

```bash
# Check the total resource requests on a node
kubectl describe node worker-1 | grep -A10 "Allocated resources"

# This shows:
# - How much memory is requested by pods on this node
# - How much memory is limited
# - The percentage of the node's capacity that is committed
```

If the sum of memory requests approaches the node's total memory, new pods will not be scheduled on that node. If actual memory usage exceeds the limit, Kubernetes will OOM-kill the offending container.

## Investigating High Memory Usage

When you find a node with high memory usage, here is how to drill down:

```bash
# Step 1: Check overall memory
talosctl memory --nodes 192.168.1.20

# Step 2: See which containers are using the most memory
talosctl stats --nodes 192.168.1.20 -k

# Step 3: Check what pods are on this node
kubectl get pods --field-selector spec.nodeName=worker-1 -A \
  -o custom-columns=NAME:.metadata.name,NAMESPACE:.metadata.namespace,MEM:.spec.containers[0].resources.requests.memory

# Step 4: Find the top memory consumers via kubectl top
kubectl top pods --sort-by=memory --field-selector spec.nodeName=worker-1 -A

# Step 5: Check for memory leaks in container stats over time
talosctl stats --nodes 192.168.1.20 -k
# Run again after some time to see if memory is growing
```

## Memory Considerations for Control Plane Nodes

Control plane nodes have specific memory requirements because they run etcd, the Kubernetes API server, and other control plane components:

```bash
# Check memory on control plane nodes specifically
talosctl memory --nodes 192.168.1.10,192.168.1.11,192.168.1.12

# etcd memory usage grows with the number of Kubernetes objects
# Monitor etcd specifically
talosctl logs etcd --nodes 192.168.1.10 | grep -i memory
```

For production clusters, control plane nodes should have at least 4GB of RAM, and ideally 8GB or more for clusters with many resources.

## Comparing Memory Over Time

To track memory trends, collect data at regular intervals:

```bash
#!/bin/bash
# memory-trend.sh - Collect memory data for trend analysis

NODES="192.168.1.10 192.168.1.20 192.168.1.21"
LOG_FILE="./memory-trend.csv"

# Create header if file does not exist
if [ ! -f "$LOG_FILE" ]; then
  echo "timestamp,node,total,used,free,cache" > "$LOG_FILE"
fi

TIMESTAMP=$(date +%Y-%m-%d_%H:%M:%S)

for node in $NODES; do
  MEMORY=$(talosctl memory --nodes "$node" 2>/dev/null | tail -1)
  TOTAL=$(echo "$MEMORY" | awk '{print $1}')
  USED=$(echo "$MEMORY" | awk '{print $2}')
  FREE=$(echo "$MEMORY" | awk '{print $3}')
  CACHE=$(echo "$MEMORY" | awk '{print $6}')

  echo "$TIMESTAMP,$node,$TOTAL,$USED,$FREE,$CACHE" >> "$LOG_FILE"
done
```

Run this script every 5 or 10 minutes via cron to build a history of memory usage across your cluster.

## Best Practices

- Check memory usage regularly, not just when there are problems.
- Set up automated alerts for memory thresholds (85% usage is a common threshold).
- Set appropriate Kubernetes resource requests and limits for all pods.
- Monitor both raw memory usage and Kubernetes node conditions.
- Keep enough memory headroom for system processes and the kubelet.
- Investigate OOM kills immediately - they are a sign of either insufficient resources or memory leaks.
- Control plane nodes need more memory as your cluster grows in the number of Kubernetes objects.
- Use trend data to plan capacity and identify memory leaks before they cause outages.

The `talosctl memory` command is a quick and reliable way to check memory status on your Talos Linux nodes. Combined with automated monitoring, it helps you stay ahead of memory issues and keep your cluster performing well.
