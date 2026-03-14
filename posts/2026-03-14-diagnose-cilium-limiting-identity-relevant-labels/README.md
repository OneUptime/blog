# Diagnosing Cilium Limiting Identity-Relevant Labels

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Cilium, Kubernetes, Identity, Labels, Scalability, Performance

Description: How to diagnose issues with Cilium's identity-relevant labels configuration, which directly impacts scalability and policy computation performance.

---

## Introduction

Cilium's security identity system assigns a unique numeric identity to each distinct set of security-relevant labels. When too many labels are identity-relevant, the number of unique identities can explode, causing increased memory usage, slower policy computation, and larger BPF maps.

Diagnosing identity label issues involves counting identities, analyzing label distribution, and measuring the impact on policy computation performance.

This guide provides the specific steps for managing identity-relevant labels in Cilium.

## Prerequisites

- Kubernetes cluster (v1.24+) with Cilium v1.14+
- `cilium` CLI, `helm`, and `kubectl`
- `iperf3` and `netperf` for benchmarking
- Prometheus and Grafana for monitoring
- Node-level root access

## Understanding Identity Labels

Cilium assigns a security identity to each unique set of labels. By default, many Kubernetes labels are identity-relevant, which can cause identity explosion in large clusters.

```bash
# Check current identity count
cilium identity list | wc -l

# See which labels are identity-relevant
cilium config view | grep labels

# Analyze identity label distribution
cilium identity list -o json | jq '.[].labels | length' | sort -n | uniq -c
```

## Detecting Identity Explosion

```bash
# Compare identity count vs pod count
PODS=$(kubectl get pods --all-namespaces --no-headers | wc -l)
IDS=$(cilium identity list | wc -l)
echo "Pods: $PODS, Identities: $IDS"
echo "Ratio: $(echo "scale=2; $IDS / $PODS" | bc)"
# Ratio should be < 0.5 for well-optimized clusters
# Ratio > 1.0 indicates identity explosion

# Find labels causing unique identities
cilium identity list -o json | \
  jq -r '.[].labels[]' | sort | uniq -c | sort -rn | head -20
```

## Performance Impact

```bash
# Check policy computation time (increases with identity count)
kubectl exec -n kube-system ds/cilium -- cilium metrics list | grep policy_computation

# Check BPF policy map usage
kubectl exec -n kube-system ds/cilium -- cilium bpf policy get --all -o json | \
  jq 'length'
```

## Verification

```bash
cilium identity list | wc -l
cilium config view | grep labels
```

## Troubleshooting

- **Identity count not decreasing after label change**: Wait for garbage collection (up to 15 minutes).
- **Policies broken after label restriction**: Add the missing label to the identity-relevant list.
- **Cannot reduce below certain count**: Namespace-level identities are the minimum.
- **Agent memory still high**: Identity reduction takes effect gradually as endpoints regenerate.

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

Diagnosing Cilium's identity-relevant labels is essential for scalability. By carefully selecting which labels contribute to security identities, you can reduce identity count by 10x or more in large clusters, directly improving policy computation time and reducing resource consumption.
