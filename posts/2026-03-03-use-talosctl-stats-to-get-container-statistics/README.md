# How to Use talosctl stats to Get Container Statistics

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Talos Linux, Talosctl, Container Monitoring, Performance, Kubernetes

Description: Learn how to use talosctl stats to get real-time container resource statistics on Talos Linux nodes for performance analysis

---

When debugging performance issues in a Kubernetes cluster running on Talos Linux, you need to see exactly how much CPU and memory each container is using. The `talosctl stats` command provides container statistics directly from the container runtime, giving you granular visibility into resource consumption at the container level.

## What talosctl stats Shows

The `talosctl stats` command queries the container runtime on the target node and returns resource usage metrics for each container. This is similar to `docker stats` if you are familiar with Docker, but it works through the Talos API instead of a local Docker socket.

```bash
# Get container statistics for a node

talosctl stats --nodes 192.168.1.20
```

The output includes information like:

```text
NODE          NAMESPACE   ID              MEMORY(MB)   CPU
worker-1      k8s.io      pause-abc123    1.20         1000000
worker-1      k8s.io      coredns-xyz     32.50        150000000
worker-1      k8s.io      nginx-def456    48.70        230000000
worker-1      system      kubelet         156.30       1450000000
```

## Understanding the Metrics

Each column tells you something specific about container resource usage:

- **NODE**: The node that returned the container statistics.
- **NAMESPACE**: The containerd namespace, such as `system` or `k8s.io`.
- **ID**: The container identifier (often truncated).
- **MEMORY(MB)**: Current memory usage in megabytes.
- **CPU**: Cumulative CPU usage reported by the runtime, in nanoseconds.

## Filtering by Namespace

You can filter the output to show only Kubernetes containers:

```bash
# Show only Kubernetes containers
talosctl stats --nodes 192.168.1.20 -k
```

Or show only system containers:

```bash
# Show only system containers
talosctl stats --nodes 192.168.1.20
```

The `-k` flag limits output to the `k8s.io` namespace, which contains all Kubernetes pod containers.

## Checking Stats Across Multiple Nodes

To compare resource usage across your cluster:

```bash
# Check stats on all worker nodes
talosctl stats --nodes 192.168.1.20,192.168.1.21,192.168.1.22 -k
```

This helps identify which nodes are handling more workload and whether the load is balanced across your cluster.

## Finding Resource-Heavy Containers

When a node is under stress, you need to find which containers are consuming the most resources:

```bash
# Get stats and sort by memory usage
talosctl stats --nodes 192.168.1.20 -k | awk 'NR == 1 {next} {print $(NF-1) "\t" $0}' | sort -k1 -rn | head -10 | cut -f2-

# Get stats and sort by cumulative CPU usage
talosctl stats --nodes 192.168.1.20 -k | awk 'NR == 1 {next} {print $NF "\t" $0}' | sort -k1 -rn | head -10 | cut -f2-
```

The top memory consumers are usually the first place to look when investigating performance problems. The cumulative CPU column is useful for finding containers that have used the most CPU time since they started.

## Correlating Stats with Kubernetes Pods

The container IDs in `talosctl stats` do not directly match pod names, but you can correlate them:

```bash
# Get container stats
talosctl stats --nodes 192.168.1.20 -k

# List containers with more detail (including image names)
talosctl containers --nodes 192.168.1.20 -k

# Cross-reference with Kubernetes pods on this node
kubectl get pods --field-selector spec.nodeName=worker-1 -A -o wide
```

By matching the container images and IDs between the stats output and the containers output, you can trace which pod is consuming resources.

## Monitoring Over Time

To understand resource trends, capture stats at regular intervals:

```bash
#!/bin/bash
# container-stats-monitor.sh - Track container stats over time

NODE=$1
INTERVAL=30
OUTPUT_DIR="./stats-history"
mkdir -p "$OUTPUT_DIR"

echo "Monitoring container stats on $NODE every ${INTERVAL} seconds"
echo "Press Ctrl+C to stop"

while true; do
  TIMESTAMP=$(date +%Y%m%d-%H%M%S)
  OUTPUT_FILE="$OUTPUT_DIR/${NODE}-${TIMESTAMP}.txt"

  echo "=== $TIMESTAMP ===" > "$OUTPUT_FILE"
  talosctl stats --nodes "$NODE" -k >> "$OUTPUT_FILE" 2>&1

  echo "Captured stats at $TIMESTAMP"
  sleep "$INTERVAL"
done
```

This creates a time series of container statistics that you can analyze to identify trends, such as slowly growing memory usage (which could indicate a leak).

## Detecting Memory Leaks

A common use case for container stats is detecting memory leaks. If a container's memory usage keeps growing without coming back down, it likely has a leak:

```bash
#!/bin/bash
# memory-leak-detector.sh - Detect containers with growing memory

NODE=$1
CHECK_COUNT=5
CHECK_INTERVAL=60

if [ -z "$NODE" ]; then
  echo "Usage: $0 <node-address>"
  exit 1
fi

declare -A BASELINE

echo "Collecting baseline stats..."
STATS=$(talosctl stats --nodes "$NODE" -k 2>/dev/null | tail -n +2)

# Store baseline memory values
while IFS= read -r line; do
  ID=$(echo "$line" | awk '{print $(NF-2)}')
  MEM=$(echo "$line" | awk '{print $(NF-1)}')
  BASELINE[$ID]=$MEM
done <<< "$STATS"

echo "Monitoring for $((CHECK_COUNT * CHECK_INTERVAL / 60)) minutes..."

for i in $(seq 1 $CHECK_COUNT); do
  sleep "$CHECK_INTERVAL"
  echo "Check $i of $CHECK_COUNT..."

  STATS=$(talosctl stats --nodes "$NODE" -k 2>/dev/null | tail -n +2)

  while IFS= read -r line; do
    ID=$(echo "$line" | awk '{print $(NF-2)}')
    MEM=$(echo "$line" | awk '{print $(NF-1)}')

    if [ -n "${BASELINE[$ID]}" ]; then
      GROWTH=$(echo "$MEM - ${BASELINE[$ID]}" | bc 2>/dev/null)
      if [ -n "$GROWTH" ] && (( $(echo "$GROWTH > 50" | bc -l 2>/dev/null) )); then
        echo "WARNING: Container $ID memory grew by ${GROWTH}MB (from ${BASELINE[$ID]} to $MEM)"
      fi
    fi
  done <<< "$STATS"
done
```

## Stats vs. Kubernetes Metrics

Talosctl stats and Kubernetes metrics (from the metrics server) show related but slightly different information:

```bash
# Talosctl stats - shows raw container-level resource usage
talosctl stats --nodes 192.168.1.20 -k

# kubectl top - shows pod-level resource usage from metrics server
kubectl top pods --sort-by=memory -A
kubectl top nodes
```

The talosctl stats command shows raw container runtime metrics, while `kubectl top` relies on the metrics server and may include overhead from the pod abstraction. Both are useful - use `talosctl stats` for container-level debugging and `kubectl top` for Kubernetes-level capacity management.

## Automating Resource Reports

Generate periodic resource reports for your cluster:

```bash
#!/bin/bash
# resource-report.sh - Generate a resource usage report

NODES="192.168.1.10 192.168.1.11 192.168.1.20 192.168.1.21 192.168.1.22"
REPORT_FILE="./resource-report-$(date +%Y%m%d).txt"

echo "Cluster Resource Report - $(date)" > "$REPORT_FILE"
echo "=====================================" >> "$REPORT_FILE"

for node in $NODES; do
  echo "" >> "$REPORT_FILE"
  echo "=== Node: $node ===" >> "$REPORT_FILE"

  echo "--- Memory ---" >> "$REPORT_FILE"
  talosctl memory --nodes "$node" >> "$REPORT_FILE" 2>&1

  echo "--- Top 10 Containers by Memory ---" >> "$REPORT_FILE"
  talosctl stats --nodes "$node" -k 2>/dev/null | awk 'NR == 1 {next} {print $(NF-1) "\t" $0}' | sort -k1 -rn | head -10 | cut -f2- >> "$REPORT_FILE"

  echo "--- Top 10 Containers by Cumulative CPU ---" >> "$REPORT_FILE"
  talosctl stats --nodes "$node" -k 2>/dev/null | awk 'NR == 1 {next} {print $NF "\t" $0}' | sort -k1 -rn | head -10 | cut -f2- >> "$REPORT_FILE"
done

echo "" >> "$REPORT_FILE"
echo "Report complete." >> "$REPORT_FILE"

echo "Report saved to $REPORT_FILE"
```

## Using Stats for Right-Sizing

Container stats help you right-size your Kubernetes resource requests and limits:

```bash
# Observe actual resource usage
talosctl stats --nodes 192.168.1.20 -k

# Compare with Kubernetes resource requests
kubectl get pods -A -o custom-columns=\
  NAME:.metadata.name,\
  CPU_REQ:.spec.containers[0].resources.requests.cpu,\
  MEM_REQ:.spec.containers[0].resources.requests.memory,\
  CPU_LIM:.spec.containers[0].resources.limits.cpu,\
  MEM_LIM:.spec.containers[0].resources.limits.memory
```

If containers consistently use much less than their requests, you can reduce the requests to improve scheduling density. If containers approach their limits, you should increase them to avoid throttling or OOM kills.

## Checking System Container Overhead

System containers run Talos services such as kubelet. Kubernetes pod containers, including control plane static pods, are shown in the `k8s.io` namespace with `-k`. Understanding their resource usage helps with capacity planning:

```bash
# Check system container resource usage
talosctl stats --nodes 192.168.1.10

# Typical overhead:
# kubelet: 100-300MB memory, moderate CPU
# containerd: 50-100MB memory, low CPU
# etcd and kube-apiserver: check with -k on control plane nodes
```

## Best Practices

- Use `talosctl stats` regularly to understand your baseline resource usage.
- Track stats over time to detect memory leaks and gradual resource growth.
- Correlate container stats with Kubernetes pod information for a complete picture.
- Use stats data to right-size resource requests and limits.
- Set up automated reporting to catch resource anomalies early.
- Compare stats across similar nodes to identify scheduling imbalances.
- Combine stats with memory, processes, and services commands for comprehensive troubleshooting.
- Check system container overhead to accurately plan capacity for workloads.

The `talosctl stats` command gives you direct insight into container resource consumption on your Talos Linux nodes. It is invaluable for performance debugging, capacity planning, and ensuring your workloads are properly resourced.
