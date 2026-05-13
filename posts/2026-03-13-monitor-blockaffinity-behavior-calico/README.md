# Monitor BlockAffinity Behavior in Calico

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Calico, IPAM, BlockAffinity, Kubernetes, Networking, Monitoring, IP Management

Description: Understand and monitor Calico's BlockAffinity resources that control how IP address blocks are assigned to nodes, ensuring efficient IP utilization and preventing allocation failures.

---

## Introduction

Calico IPAM uses a concept called "block affinity" to manage how IP address blocks from IP pools are assigned to nodes. Each node is given affinity to one or more blocks (subnets of configurable size, default /26 for IPv4 and /122 for IPv6), and Calico tries to allocate pod IPs from blocks affiliated with that node. BlockAffinity resources in the Calico datastore track these assignments.

Understanding block affinity behavior is critical for diagnosing IP allocation failures, understanding why certain nodes have high or low IP utilization, and planning IP pool capacity. Problems with block affinity - such as blocks not being released after node deletion or allocation failures due to fragmented pools - can lead to pod scheduling failures that are difficult to diagnose without understanding the underlying IPAM model.

This guide covers monitoring BlockAffinity resources in Calico, interpreting allocation patterns, and identifying and resolving common block affinity issues.

## Prerequisites

- Kubernetes cluster with Calico v3.27+ using Calico IPAM
- `calicoctl` v3.27+ installed
- `kubectl` with admin access
- Basic understanding of Calico IPAM concepts

## Step 1: Inspect BlockAffinity Resources

View the current block affinity assignments across all nodes.

List all BlockAffinity resources to understand how blocks are distributed:

```bash
# List all block affinity resources (node-to-block assignments)
calicoctl get blockaffinity -o wide

# Show block affinity for a specific node
calicoctl get blockaffinity -o yaml | grep -A5 "node: <node-name>"

# Count blocks per node to identify uneven distribution
calicoctl get blockaffinity -o yaml | \
  grep "node:" | sort | uniq -c | sort -rn
```

## Step 2: Correlate Blocks with IP Pool Utilization

Understand how block affinity affects overall IP pool utilization.

Query the IPAM allocation state and correlate with block affinity:

```bash
# Show detailed IPAM allocation status
calicoctl ipam show --show-blocks

# Show IP utilization per IP pool
calicoctl ipam show

# Identify blocks with very low utilization (potential fragmentation)
calicoctl ipam show --show-blocks | grep -E '^\| (IP Pool|Block)'
```

## Step 3: Monitor for Orphaned Block Affinities

Detect block affinities that remain after node deletion (a common cause of IP pool exhaustion).

Check for block affinities that reference non-existent nodes:

```bash
# Get all nodes currently in the cluster
CLUSTER_NODES=$(kubectl get nodes -o jsonpath='{.items[*].metadata.name}')
echo "Cluster nodes: $CLUSTER_NODES"

# List all block affinity node references
calicoctl get blockaffinity -o yaml | grep "node:" | awk '{print $2}' | sort -u

# Compare to find orphaned affinities (nodes no longer in cluster)
# Any node name in blockaffinities but NOT in kubectl get nodes is orphaned
calicoctl get blockaffinity -o yaml | grep "node:" | awk '{print $2}' | \
  while read node; do
    if ! kubectl get node "$node" &>/dev/null; then
      echo "ORPHANED block affinity for node: $node"
    fi
  done
```

## Step 4: Release Leaked IPAM Allocations

Clean up leaked IPAM allocations for deleted nodes to reclaim IP addresses.

Use `calicoctl ipam check` to generate a leak report, then release only the leaked addresses from that report:

```bash
# Check if there are any leaked IP allocations from deleted nodes
calicoctl ipam check --show-problem-ips

# Generate a report for release (use with caution)
# First confirm the node is truly gone and not just temporarily unavailable
kubectl get node <deleted-node-name>   # Should return "not found"

# Write a report of IPAM consistency problems
calicoctl ipam check -o report.json

# Release leaked IPs listed in the report
calicoctl ipam release --from-report=report.json

# Alternatively, inspect all IPs checked by the consistency scan
calicoctl ipam check --show-all-ips
```

## Step 5: Create a BlockAffinity Monitoring Dashboard

Set up ongoing monitoring for block affinity health using Prometheus metrics.

Configure Calico to export IPAM metrics and create alerts for exhaustion:

```yaml
# ipam-metrics-alert.yaml - alert on block affinity and IPAM exhaustion
apiVersion: monitoring.coreos.com/v1
kind: PrometheusRule
metadata:
  name: calico-ipam-blockaffinity
  namespace: monitoring
spec:
  groups:
  - name: calico-ipam-blocks
    rules:
    - alert: CalicoIPAMPoolNearExhaustion
      # Alert when more than 90% of IPs are allocated in an IP pool
      expr: |
        (
          sum by (ippool) (ipam_allocations_in_use)
          /
          max by (ippool) (ipam_ippool_size)
        ) > 0.90
      for: 5m
      labels:
        severity: warning
      annotations:
        summary: "Calico IP pool is 90%+ allocated"
        description: "IP pool may exhaust soon, consider adding more CIDR ranges"
```

Apply the Prometheus alerting rule:

```bash
kubectl apply -f ipam-metrics-alert.yaml
```

## Best Practices

- Keep the default Calico IP pool block size (`/26` for IPv4, `/122` for IPv6) for most workloads to balance block count and utilization
- Run `calicoctl ipam check` regularly in production to detect leaked allocations early
- Ensure the Calico node controller is enabled so Calico can clean up data for Kubernetes nodes that no longer exist
- Monitor IP pool allocation with Calico kube-controllers Prometheus metrics and alert before exhaustion
- Use OneUptime to monitor pod scheduling success rates as a proxy metric for IPAM health

## Conclusion

BlockAffinity resources are the foundation of Calico's IPAM model, and monitoring their state is essential for maintaining healthy IP allocation across your cluster. By regularly auditing block affinity assignments, detecting orphaned blocks from deleted nodes, and setting up proactive capacity alerts, you can prevent IP exhaustion before it causes pod scheduling failures. Integrate with OneUptime to track pod scheduling success as a high-level indicator of underlying IPAM health.
