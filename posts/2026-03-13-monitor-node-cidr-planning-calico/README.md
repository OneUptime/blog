# Monitor Node CIDR Planning with Calico

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Calico, CIDR, Node Planning, Kubernetes, Networking, Capacity Planning, IPAM

Description: Learn how to plan and monitor node CIDR allocations in Calico, ensuring each node has sufficient IP address capacity for pod scheduling while avoiding IP exhaustion across the cluster.

---

## Introduction

Every Kubernetes node needs a range of pod IP addresses large enough to accommodate the maximum number of pods it will run. In Calico, this range comes from IP pool blocks allocated to the node via the block affinity mechanism. Planning node CIDRs correctly - accounting for the maximum pods per node, block size, and cluster growth - is essential for preventing pod scheduling failures from IP exhaustion.

Node CIDR planning with Calico involves choosing appropriate IP pool CIDRs, configuring block sizes, and ensuring that the total IP space scales with your cluster's expected maximum pod count. Monitoring node CIDR utilization helps detect when individual nodes are running low on IP capacity before pods start failing to schedule.

This guide covers node CIDR capacity planning formulas, monitoring per-node IP utilization, and alerting on capacity thresholds.

## Prerequisites

- Kubernetes cluster with Calico v3.27+ using Calico IPAM
- `calicoctl` v3.27+ installed
- `kubectl` with admin access
- Cluster sizing information (max nodes, max pods per node)

## Step 1: Calculate Required CIDR Space

Determine the total IP pool size needed for your cluster based on node count and pod density.

Use the following formula to calculate required IP space:

```bash
# IP planning formula:
# Required IPs = (max_nodes * max_pods_per_node) * 1.5 (50% headroom for rolling updates)
# Block size: typically /26 (64 IPs) - one block per ~60 pods on a node
# Blocks per node: ceil(max_pods_per_node / IPs_per_block)

# Example calculation for a 50-node cluster with 100 pods per node:
python3 << 'EOF'
import math

max_nodes = 50
max_pods_per_node = 100
headroom_factor = 1.5
block_size_prefix = 26  # /26 = 64 IPs per block
ips_per_block = 2 ** (32 - block_size_prefix)  # 64 IPs

# IPs needed
required_ips = max_nodes * max_pods_per_node * headroom_factor
blocks_per_node = math.ceil(max_pods_per_node / ips_per_block)
total_blocks = blocks_per_node * max_nodes * headroom_factor

# Minimum pool CIDR size
min_prefix = 32 - math.ceil(math.log2(required_ips))

print(f"Max nodes: {max_nodes}")
print(f"Max pods per node: {max_pods_per_node}")
print(f"Required IPs (with headroom): {required_ips:.0f}")
print(f"Blocks per node: {blocks_per_node}")
print(f"Total blocks needed: {total_blocks:.0f}")
print(f"Minimum pool prefix: /{min_prefix}")
print(f"Recommended pool: 192.168.0.0/16 ({2**16} IPs)")
EOF
```

## Step 2: Review Current Node CIDR Allocation

Inspect the current per-node IP block allocation to understand utilization.

Query block affinity and pod counts per node:

```bash
# Get pod count per node (actual usage)
kubectl get pods -A -o wide --no-headers | \
  awk '{print $8}' | sort | uniq -c | sort -rn | head -20

# Get block count per node (IP capacity)
calicoctl get blockaffinities -o yaml | \
  awk '/node:/{node=$2} /cidr:/{blocks[node]++} END{for (n in blocks) print blocks[n], n}' | \
  sort -rn

# Calculate utilization per node
echo "=== Node IP Utilization ==="
kubectl get nodes -o name | while read node; do
  node_name="${node#node/}"
  pod_count=$(kubectl get pods -A -o wide --no-headers | \
    awk -v n="$node_name" '$8==n{count++} END{print count+0}')
  block_count=$(calicoctl get blockaffinities -o yaml | \
    grep "node: $node_name" | wc -l)
  ip_capacity=$((block_count * 64))  # Assuming /26 blocks = 64 IPs each
  
  echo "Node: $node_name | Pods: $pod_count | Blocks: $block_count | IP Capacity: $ip_capacity"
done
```

## Step 3: Monitor Nodes Approaching IP Capacity

Detect nodes that are running low on available IPs before pods fail to schedule.

Create a script to identify high-utilization nodes:

```bash
#!/bin/bash
# node-cidr-capacity.sh - check per-node IP capacity utilization

ALERT_THRESHOLD=80  # Alert at 80% utilization

echo "=== Node CIDR Capacity Report ==="
echo "Timestamp: $(date -u)"
echo ""

kubectl get nodes --no-headers -o custom-columns=NAME:.metadata.name | \
while read node; do
  # Count running pods on this node
  pod_count=$(kubectl get pods -A -o wide --no-headers 2>/dev/null | \
    awk -v n="$node" '$8==n && $5~/Running/{count++} END{print count+0}')
  
  # Count allocated blocks (capacity)
  block_count=$(calicoctl get blockaffinities -o yaml 2>/dev/null | \
    grep -c "node: $node")
  ip_capacity=$((block_count * 64))
  
  if [ $ip_capacity -gt 0 ]; then
    utilization=$(echo "scale=1; $pod_count * 100 / $ip_capacity" | bc)
    
    if (( $(echo "$utilization > $ALERT_THRESHOLD" | bc -l) )); then
      echo "ALERT: $node - Utilization: $utilization% ($pod_count/$ip_capacity IPs)"
    else
      echo "OK: $node - Utilization: $utilization% ($pod_count/$ip_capacity IPs)"
    fi
  fi
done
```

## Step 4: Configure MaxPodsPerNode Alignment

Ensure Kubernetes and Calico CIDR configurations are aligned.

Verify that kubelet max-pods setting matches IP pool capacity:

```bash
# Check max pods configuration per node
kubectl get nodes -o yaml | grep -A2 "capacity:" | grep "pods:"

# Check FelixConfiguration for any per-node limits
calicoctl get felixconfiguration default -o yaml | grep -i "maxIpset\|maxPolicy"

# Ensure block size supports max pods per node
# maxPods=110 -> needs at least 2 blocks of /26 (128 IPs)
# maxPods=250 -> needs at least 4 blocks of /26 (256 IPs)
echo "Block size analysis:"
python3 -c "
block_size = 64  # /26 IPs per block
for max_pods in [110, 250, 500]:
    blocks_needed = (max_pods + block_size - 1) // block_size
    print(f'maxPods={max_pods}: needs {blocks_needed} blocks ({blocks_needed * block_size} IPs capacity)')
"
```

## Step 5: Create CIDR Capacity Prometheus Alerts

Set up proactive alerts for node IP capacity.

Configure Prometheus alerting rules for node CIDR capacity:

```yaml
# node-cidr-alerts.yaml - per-node IP capacity alerts
apiVersion: monitoring.coreos.com/v1
kind: PrometheusRule
metadata:
  name: calico-node-cidr-capacity
  namespace: monitoring
spec:
  groups:
  - name: node-cidr
    rules:
    - alert: NodeIPCapacityLow
      expr: |
        (calico_ipam_ips_total{type="used"} /
         calico_ipam_ips_total{type="total"}) > 0.80
      for: 5m
      labels:
        severity: warning
      annotations:
        summary: "Node {{ $labels.node }} is using over 80% of allocated IPs"
```

Apply the alerts:

```bash
kubectl apply -f node-cidr-alerts.yaml
```

## Best Practices

- Plan IP pool size for 3x your expected maximum pod count to allow for growth and block allocation overhead
- Set block size to at least `ceil(maxPodsPerNode / 0.8)` to avoid per-node IP exhaustion
- Use separate IP pools per node pool with appropriate block sizes for different pod densities
- Review node CIDR utilization monthly and expand IP pools before reaching 60% utilization
- Monitor node pod scheduling failures with OneUptime as an early indicator of CIDR capacity issues

## Conclusion

Proper node CIDR planning with Calico prevents pod scheduling failures from IP exhaustion, which can be difficult to diagnose when they occur under load. By calculating required IP space, monitoring per-node block utilization, and setting capacity alerts, you can ensure your cluster always has sufficient IP addresses for workloads. Use OneUptime to monitor pod scheduling success rates as a real-world validation that your CIDR planning is adequate for current and growing workload demands.
