# Diagnosing Test Environment Issues in Cilium Performance

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Cilium, Kubernetes, Performance, Testing, Environment Setup

Description: How to diagnose test environment issues that affect Cilium performance benchmarking accuracy and reliability.

---

## Introduction

A reliable Cilium performance test environment must eliminate variables that can skew results. Test environment issues are among the most common causes of misleading benchmark results -- you might tune Cilium extensively only to find the real problem was background workloads, inconsistent node configurations, or network fabric congestion.

Diagnosing test environment issues requires verifying every layer: hardware consistency, OS configuration, Kubernetes setup, network fabric, and workload isolation. Any inconsistency between test runs or between nodes can invalidate your results.

This guide covers the systematic verification of your Cilium performance test environment.

## Prerequisites

- Kubernetes cluster with Cilium v1.14+
- Multiple worker nodes for testing
- `kubectl`, `cilium` CLI, and node-level access
- Understanding of your hardware specifications

## Checking Node Consistency

```bash
# Verify all test nodes have identical hardware
for node in $(kubectl get nodes -o name); do
  echo "=== $node ===" 
  kubectl get $node -o json | jq ".status.capacity"
done

# Check kernel parameters
ssh node-1 "uname -r; sysctl net.core.rmem_max; cat /sys/devices/system/cpu/cpu0/cpufreq/scaling_governor"



```

## Verifying Network Isolation

```bash
# Check for other pods on test nodes
kubectl get pods --all-namespaces -o wide --field-selector spec.nodeName=node-1
# Check for background network traffic
ssh node-1 "iftop -t -s 5 -i eth0 2>/dev/null | head -20"
# Verify no non-system pods on test nodes
PODS=$(kubectl get pods --all-namespaces --field-selector spec.nodeName=node-perf-1 -o json | jq "[.items[] | select(.metadata.namespace != \"kube-system\" and .metadata.namespace != \"monitoring\")] | length")
if [ "$PODS" -gt 0 ]; then echo "FAIL: Non-system pods on test node"; exit 1; fi
```

## Checking Cilium Configuration

```bash
cilium status --verbose
cilium config view | grep -E "tunnel|routing|bpf|encryption"
# Compare across nodes
for pod in $(kubectl get pods -n kube-system -l k8s-app=cilium -o name); do
  echo "=== $pod ===" && kubectl exec -n kube-system $pod -- cilium config view | md5sum
done
```

## Verification

```bash
# Run consistency check
echo "All nodes should show identical configs"
```

## Troubleshooting

- **Nodes show different kernel versions**: Standardize OS images across all test nodes.
- **Background traffic detected**: Cordon test nodes or use dedicated test cluster.
- **Cilium config inconsistent across nodes**: Redeploy Cilium with a consistent Helm values file.

## Collecting Diagnostic Data Systematically

Before making any changes, collect a complete diagnostic snapshot. This ensures you have a baseline to compare against and can reproduce the issue:

```bash
# Create a diagnostic data directory
DIAG_DIR="/tmp/cilium-diag-$(date +%Y%m%d-%H%M%S)"
mkdir -p $DIAG_DIR

# Collect Cilium status
cilium status --verbose > $DIAG_DIR/cilium-status.txt

# Collect Cilium configuration
cilium config view > $DIAG_DIR/cilium-config.txt

# Collect BPF map information
cilium bpf ct list global > $DIAG_DIR/ct-entries.txt 2>&1
cilium bpf nat list > $DIAG_DIR/nat-entries.txt 2>&1

# Collect endpoint information
cilium endpoint list -o json > $DIAG_DIR/endpoints.json

# Collect node information
kubectl get nodes -o wide > $DIAG_DIR/nodes.txt
kubectl describe nodes > $DIAG_DIR/node-details.txt

# Collect Cilium agent logs
kubectl logs -n kube-system ds/cilium --tail=500 > $DIAG_DIR/cilium-logs.txt

# Archive everything
tar czf $DIAG_DIR.tar.gz $DIAG_DIR
echo "Diagnostic data saved to $DIAG_DIR.tar.gz"
```

Keep this diagnostic snapshot for comparison after applying fixes. The data is also useful if you need to escalate to Cilium support or open a GitHub issue.

### Understanding the Diagnostic Output

When reviewing the diagnostic data, focus on these key indicators:

1. **Cilium status**: Look for any components showing errors or degraded state
2. **BPF map utilization**: Compare current entries against maximum capacity
3. **Endpoint health**: Check for endpoints in "not-ready" or "disconnected" state
4. **Agent logs**: Search for ERROR and WARNING messages, especially related to BPF programs or policy computation

The combination of these data points will point you toward the specific subsystem causing the performance issue.

## Advanced Diagnostic Techniques

### Using Cilium Monitor for Real-Time Analysis

The `cilium monitor` command provides real-time visibility into the eBPF datapath:

```bash
# Monitor all traffic for a specific endpoint
ENDPOINT_ID=$(cilium endpoint list -o json | jq '.[0].id')
cilium monitor --related-to $ENDPOINT_ID --type trace

# Monitor drops with verbose output
cilium monitor --type drop -v

# Monitor policy verdicts
cilium monitor --type policy-verdict

# Filter by specific protocol
cilium monitor --type trace -v | grep TCP
```

### Using Hubble for Historical Analysis

Hubble provides historical flow data that helps identify patterns:

```bash
# Start Hubble relay port-forward
cilium hubble port-forward &

# Query recent flows with filters
hubble observe --protocol TCP --last 500 -o json | \
  jq 'select(.verdict == "DROPPED") | {src: .source.pod_name, dst: .destination.pod_name, reason: .drop_reason_desc}'

# Get flow statistics by source and destination
hubble observe --last 1000 -o json | \
  jq -r '\(.source.namespace)/\(.source.pod_name) -> \(.destination.namespace)/\(.destination.pod_name): \(.verdict)' | \
  sort | uniq -c | sort -rn | head -20
```

### Kernel Tracing with BPF

For deep datapath analysis, use BPF tracing tools:

```bash
# Trace BPF program execution time
bpftool prog show --json | jq '.[] | select(.name | contains("cil")) | {name, run_cnt, run_time_ns, avg_ns: (if .run_cnt > 0 then (.run_time_ns / .run_cnt | floor) else 0 end)}'

# Use bpftrace for custom tracing
bpftrace -e 'tracepoint:xdp:xdp_redirect { @cnt[args->action] = count(); }'
```

These diagnostic tools form a comprehensive toolkit for understanding exactly what happens to packets as they traverse Cilium's eBPF datapath.

## Conclusion

Diagnosing test environment issues in Cilium performance testing requires verifying hardware consistency, OS configuration, Cilium settings, and workload isolation across all test nodes. Any inconsistency can invalidate benchmark results and lead to incorrect tuning decisions.
