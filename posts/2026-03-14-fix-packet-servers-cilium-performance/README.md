# Fixing Packet Server Issues in Cilium Performance

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Cilium, Kubernetes, Performance, Packet Processing, Optimization

Description: How to fix packet server configuration to achieve accurate Cilium performance benchmarks, including resource allocation, multi-instance deployment, and server-side tuning.

---

## Introduction

Fixing packet server issues involves ensuring servers have adequate resources, are correctly configured for the test type, and are not themselves the bottleneck. The fixes depend on whether you are running throughput, latency, or connection rate tests.

For throughput tests, servers need sufficient CPU and memory for packet generation. For latency tests, servers need low scheduling latency. For connection rate tests, servers need high file descriptor limits and fast socket allocation.

This guide provides server configurations optimized for each benchmark type.

## Prerequisites

- Kubernetes cluster (v1.24+) with Cilium v1.14+
- `cilium` CLI and `kubectl` access
- Node-level root access
- Prometheus monitoring (recommended)

## Resource-Optimized Server Deployment

```yaml
apiVersion: v1
kind: Pod
metadata:
  name: iperf-server-optimized
spec:
  containers:
  - name: iperf3
    image: networkstatic/iperf3
    args: ["-s"]
    resources:
      requests:
        cpu: "4"
        memory: "2Gi"
      limits:
        cpu: "4"
        memory: "2Gi"
  nodeSelector:
    kubernetes.io/hostname: node-1
```

## Server-Side Tuning

```bash
# Inside the server container or via init container
sysctl -w net.core.rmem_max=67108864
sysctl -w net.core.wmem_max=67108864
sysctl -w net.ipv4.tcp_rmem="4096 87380 67108864"
sysctl -w net.ipv4.tcp_wmem="4096 65536 67108864"
sysctl -w net.core.somaxconn=65535
```

## Multi-Server for High Parallelism

```bash
# Deploy separate servers for different test types
kubectl apply -f - <<YAML
apiVersion: v1
kind: Pod
metadata:
  name: netperf-server
spec:
  containers:
  - name: netperf
    image: cilium/netperf
    command: ["netserver", "-D"]
    resources:
      requests:
        cpu: "4"
        memory: "1Gi"
      limits:
        cpu: "4"
        memory: "1Gi"
YAML
```

## Verification

```bash
# Run the validation checks above
# All items should show PASS
cilium status --verbose
```

## Troubleshooting

- **Validation fails on specific nodes**: Check if nodes were provisioned from different images.
- **Kernel module load fails**: Verify the module is available for your kernel version.
- **Cilium status unhealthy**: Check agent logs with `kubectl logs -n kube-system ds/cilium`.
- **Tools missing in containers**: Use an image that includes the required tools or mount from host.

## Implementing Changes Safely

When applying performance fixes to a production Cilium cluster, follow a staged rollout approach to minimize risk:

```bash
# Step 1: Test on a single node first
kubectl cordon node-test-1
kubectl drain node-test-1 --ignore-daemonsets --delete-emptydir-data

# Step 2: Apply configuration changes
helm upgrade cilium cilium/cilium --namespace kube-system \
  --reuse-values \
  <your-changes-here>

# Step 3: Wait for the Cilium agent on the test node to restart
kubectl rollout status ds/cilium -n kube-system --timeout=120s

# Step 4: Run a quick benchmark on the test node
kubectl uncordon node-test-1
# Deploy test pods on the node and verify performance

# Step 5: If successful, roll out to remaining nodes
# Cilium DaemonSet will handle the rolling update
```

### Change Tracking

Document every change you make along with its measured impact. Create a log entry for each modification:

```bash
cat >> /tmp/perf-changes.log << LOG
Date: $(date)
Change: <description of change>
Before: <metric before change>
After: <metric after change>
Impact: <percentage improvement or regression>
LOG
```

This change log is invaluable for understanding which optimizations provide the most benefit and for reverting changes if unexpected regressions occur. It also helps when you need to apply the same optimizations to other clusters.

### Rolling Back Changes

If a change causes unexpected behavior, roll back immediately:

```bash
# Rollback to previous Helm release
helm rollback cilium -n kube-system

# Verify the rollback was successful
cilium status --verbose
kubectl rollout status ds/cilium -n kube-system
```

## Post-Fix Validation Checklist

After applying any fix, run through this validation checklist to ensure the fix is complete and has not introduced regressions:

```bash
#!/bin/bash
# post-fix-checklist.sh

echo "=== Post-Fix Validation Checklist ==="

# 1. Cilium agent health
echo "1. Cilium agent health:"
cilium status | grep -E "OK|error|degraded"

# 2. No agent restarts
echo "2. Agent restart count:"
kubectl get pods -n kube-system -l k8s-app=cilium -o json | \
  jq '.items[].status.containerStatuses[].restartCount'

# 3. No new drops
echo "3. Recent drops:"
cilium monitor --type drop | timeout 5 head -5 || echo "No drops in 5 seconds"

# 4. Endpoint health
echo "4. Endpoint health:"
cilium endpoint list | grep -c "ready"
cilium endpoint list | grep -c "not-ready"

# 5. Performance benchmark
echo "5. Quick performance check:"
kubectl exec perf-client -- iperf3 -c perf-server.monitoring -t 10 -P 1 -J | \
  jq '.end.sum_sent.bits_per_second / 1000000000' | \
  xargs -I{} echo "{} Gbps"

echo "=== Checklist Complete ==="
```

### Monitoring for Regression

After applying fixes, monitor closely for 24-48 hours:

```bash
# Watch Cilium events for any errors
kubectl get events -n kube-system --watch --field-selector involvedObject.kind=Pod

# Monitor agent CPU and memory
watch -n5 "kubectl top pods -n kube-system -l k8s-app=cilium"
```

Document the fix, its impact, and any follow-up actions needed in your team's runbook or wiki.

## Conclusion

Properly fixinging packet server issues in cilium performance is essential for reliable Cilium performance testing. Each component plays a role in the accuracy and reproducibility of benchmark results.
