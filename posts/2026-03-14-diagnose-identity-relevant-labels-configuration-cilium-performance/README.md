# Diagnosing Identity-Relevant Labels Configuration in Cilium Performance

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Cilium, Kubernetes, Identity, Labels, Configuration, Performance

Description: How to diagnose identity-relevant labels configuration issues in Cilium that impact performance and scalability.

---

## Introduction

The identity-relevant labels configuration in Cilium determines which Kubernetes labels are used to compute security identities. This configuration directly impacts the total number of identities, BPF map sizes, policy computation time, and ultimately network performance.

Diagnosing configuration issues involves analyzing which labels contribute to identity uniqueness and measuring their performance impact.

This guide provides the specific steps for managing identity-relevant labels configuration.

## Prerequisites

- Kubernetes cluster (v1.24+) with Cilium v1.14+
- `cilium` CLI, `helm`, and `kubectl`
- `iperf3` and `netperf` for benchmarking
- Prometheus and Grafana for monitoring
- Node-level root access

## Analyzing Current Label Configuration

```bash
# View the current identity-relevant label configuration
cilium config view | grep -E "^labels"

# If empty, ALL labels are identity-relevant (default behavior)
# This is the most common source of identity explosion
```

## Label Impact Analysis

```bash
# Count unique label combinations (potential identities)
kubectl get pods --all-namespaces -o json | \
  jq '[.items[].metadata.labels | to_entries | sort_by(.key) | from_entries | tostring] | unique | length'

# Compare with actual identity count
cilium identity list | wc -l

# Find labels with high cardinality
kubectl get pods --all-namespaces -o json | \
  jq '[.items[].metadata.labels | keys[]] | group_by(.) | map({label: .[0], count: length}) | sort_by(-.count)' | head -30
```

## Performance Impact Assessment

```bash
# Measure policy regeneration time
kubectl exec -n kube-system ds/cilium -- cilium endpoint list -o json | \
  jq '[.[] | .status.policy."proxy-statistics" // empty]'

# Check BPF policy map sizes
kubectl exec -n kube-system ds/cilium -- cilium bpf policy get --all | wc -l
```

## Verification

```bash
cilium config view | grep labels
cilium identity list | wc -l
```

## Troubleshooting

- **Policies stop working after label change**: A required label was excluded. Add it back to the configuration.
- **Identity count not decreasing**: Restart Cilium agents and wait for GC cycle.
- **High-cardinality label needed for policy**: Consider restructuring policies to use namespace-level rules instead.
- **Configuration lost after upgrade**: Ensure labels are set in Helm values file, not just runtime config.

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

Diagnosing identity-relevant labels configuration is a critical scalability optimization in Cilium. The right label configuration can reduce identity count by orders of magnitude, directly improving policy computation performance and reducing BPF map pressure in large clusters.
