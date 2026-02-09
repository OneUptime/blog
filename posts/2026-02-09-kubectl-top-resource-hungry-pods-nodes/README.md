# How to Use kubectl top to Identify Resource-Hungry Pods and Nodes

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Kubernetes, kubectl, Resource Management

Description: Master kubectl top command to quickly identify resource-hungry pods and nodes, sort by CPU and memory usage, and find optimization opportunities in your Kubernetes cluster.

---

kubectl top is the fastest way to identify resource hogs in your cluster. It shows real-time CPU and memory usage for nodes and pods. This guide shows you every useful kubectl top command and how to use the data for optimization.

## Prerequisites

kubectl top requires Metrics Server:

```bash
kubectl apply -f https://github.com/kubernetes-sigs/metrics-server/releases/latest/download/components.yaml
```

Verify Metrics Server is running:

```bash
kubectl get deployment metrics-server -n kube-system
```

## Basic Node Usage

View resource usage for all nodes:

```bash
kubectl top nodes
```

Output:

```
NAME       CPU(cores)   CPU%   MEMORY(bytes)   MEMORY%
worker-1   1200m        30%    8Gi             40%
worker-2   800m         20%    6Gi             30%
worker-3   2400m        60%    12Gi            60%
```

Identify overloaded nodes (high CPU% or MEMORY%).

## Sorting Nodes by Resource Usage

Sort by CPU:

```bash
kubectl top nodes --sort-by=cpu
```

Sort by memory:

```bash
kubectl top nodes --sort-by=memory
```

This shows the most loaded nodes first.

## Basic Pod Usage

View pod resource usage in a namespace:

```bash
kubectl top pods -n production
```

Output:

```
NAME           CPU(cores)   MEMORY(bytes)
web-app-abc    150m         512Mi
database-xyz   800m         4Gi
cache-def      50m          256Mi
```

## Sorting Pods by Usage

Sort by CPU:

```bash
kubectl top pods -n production --sort-by=cpu
```

Sort by memory:

```bash
kubectl top pods -n production --sort-by=memory
```

The highest consumers appear first.

## All Namespaces

View pods across all namespaces:

```bash
kubectl top pods --all-namespaces
```

Sort across all namespaces:

```bash
kubectl top pods --all-namespaces --sort-by=memory
```

## Container-Level Usage

See individual container usage in multi-container pods:

```bash
kubectl top pods --containers -n production
```

Output:

```
POD            NAME         CPU(cores)   MEMORY(bytes)
web-app-abc    app          120m         400Mi
web-app-abc    sidecar      30m          112Mi
database-xyz   postgres     800m         4Gi
```

This identifies resource-hungry sidecars.

## Filtering by Label

Show only specific pods:

```bash
kubectl top pods -n production -l app=web
```

Or multiple labels:

```bash
kubectl top pods -n production -l app=web,tier=frontend
```

## Finding Top Resource Consumers

Combine top and sort to find the worst offenders:

```bash
# Top 5 CPU consumers across all namespaces
kubectl top pods --all-namespaces --sort-by=cpu | head -6

# Top 5 memory consumers
kubectl top pods --all-namespaces --sort-by=memory | head -6
```

## Comparing Usage vs Requests

List resource requests alongside usage:

```bash
kubectl top pods -n production
kubectl get pods -n production -o custom-columns=NAME:.metadata.name,CPU_REQ:.spec.containers[*].resources.requests.cpu,MEM_REQ:.spec.containers[*].resources.requests.memory
```

Compare manually to find over or under-provisioned pods.

## Scripting kubectl top

Parse output with awk for automation:

```bash
# Find pods using > 1 CPU
kubectl top pods --all-namespaces --no-headers | awk '$3 > 1000 {print $1, $2, $3}'

# Find pods using > 4Gi memory
kubectl top pods --all-namespaces --no-headers | awk '$4 ~ /Gi/ && $4 > 4 {print $1, $2, $4}'
```

## Monitoring Specific Pods

Watch a pod's usage over time:

```bash
kubectl top pod my-app -n production --watch
```

Update every few seconds. Press Ctrl+C to stop.

## Node Capacity vs Usage

Check allocatable vs used:

```bash
kubectl describe node worker-1 | grep -A 10 "Allocated resources"
```

Compare allocated (requests) vs actual usage from `kubectl top nodes`.

## Finding Idle Resources

Identify pods with low usage:

```bash
# Pods using < 50m CPU
kubectl top pods --all-namespaces --no-headers | awk '$3 < 50 {print $1, $2, $3}'
```

These may be candidates for reducing resource requests.

## Detecting Memory Leaks

Run top periodically and compare:

```bash
# Baseline
kubectl top pod my-app -n production > baseline.txt

# Wait 1 hour
sleep 3600

# Compare
kubectl top pod my-app -n production > current.txt
diff baseline.txt current.txt
```

Growing memory indicates a leak.

## Exporting to CSV

Export node usage to CSV:

```bash
kubectl top nodes --no-headers | awk '{print $1","$2","$3","$4","$5}' > nodes.csv
```

Import into spreadsheets for analysis.

## Combining with Prometheus

kubectl top shows current usage. For trends, use Prometheus:

```promql
# CPU usage over time
rate(container_cpu_usage_seconds_total{namespace="production"}[5m])

# Memory usage over time
container_memory_working_set_bytes{namespace="production"}
```

## Finding Nodes for Draining

Before draining a node, check its load:

```bash
kubectl top node worker-1
```

If usage is low, draining is safe. If high, pods will cause disruption when rescheduled.

## Resource Usage by Node

List all pods on a node with usage:

```bash
# Get node name
NODE=worker-1

# List pods on node
kubectl get pods --all-namespaces --field-selector spec.nodeName=$NODE -o wide

# Top pods on that node
kubectl top pods --all-namespaces --field-selector spec.nodeName=$NODE --sort-by=memory
```

## Finding Noisy Neighbors

In multi-tenant clusters, identify resource hogs affecting others:

```bash
kubectl top pods --all-namespaces --sort-by=cpu | head -20
```

Contact pod owners to optimize or add resource limits.

## Verifying Autoscaler Behavior

Check if HPA is working correctly:

```bash
# Check pod usage
kubectl top pods -n production -l app=web

# Check HPA target
kubectl get hpa web-hpa -n production

# Compare
# If usage is above target but not scaling, investigate HPA
```

## Best Practices

- Run top regularly to understand normal usage patterns
- Sort by CPU and memory to find optimization targets
- Compare usage vs requests weekly
- Export data for historical analysis
- Use --containers to identify sidecar overhead
- Combine with kubectl describe for full context
- Script top for automated reports
- Monitor trends with Prometheus, not just point-in-time with top

## Common Patterns

**Over-Provisioned**: Usage consistently < 30% of requests

```bash
kubectl top pod web-app
# Output: 200m CPU, 512Mi memory

kubectl get pod web-app -o jsonpath='{.spec.containers[0].resources.requests}'
# Output: {"cpu":"1","memory":"2Gi"}
```

Action: Reduce requests to 300m CPU, 768Mi memory

**Under-Provisioned**: Usage near or exceeds requests

```bash
kubectl top pod database
# Output: 1800m CPU, 7Gi memory

kubectl get pod database -o jsonpath='{.spec.containers[0].resources.requests}'
# Output: {"cpu":"2","memory":"8Gi"}
```

Action: Increase requests to 3 CPU, 10Gi memory

## Limitations

- kubectl top shows recent usage (last minute), not peak
- Metrics Server has no history
- Usage can spike between measurements
- Doesn't show disk I/O or network
- Based on cgroup stats, may not reflect application view

Use Prometheus for comprehensive monitoring.

## Real-World Example: Cluster Audit

Audit a production cluster:

```bash
# 1. Find most loaded nodes
kubectl top nodes --sort-by=memory

# 2. Find top CPU consumers
kubectl top pods --all-namespaces --sort-by=cpu | head -10

# 3. Find top memory consumers
kubectl top pods --all-namespaces --sort-by=memory | head -10

# 4. Check container-level usage
kubectl top pods --containers -n production --sort-by=memory

# 5. Identify low-usage pods (candidates for reduction)
kubectl top pods --all-namespaces --no-headers | awk '$3 < 100 {print $0}' | head -20
```

Use this data to right-size deployments.

## Conclusion

kubectl top is your first stop for identifying resource issues in Kubernetes. Use it to find overloaded nodes, resource-hungry pods, and optimization opportunities. Sort by CPU and memory to prioritize investigation. Check container-level usage to size sidecars correctly. Compare usage against requests to find over and under-provisioned workloads. Combine with Prometheus for historical analysis and VPA for automated right-sizing recommendations. Make kubectl top part of your regular cluster operations to maintain efficiency.
