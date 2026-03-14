# Diagnosing Excluding Labels in Cilium Performance

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Cilium, Kubernetes, Identity, Labels, Exclusion, Performance, Scalability

Description: How to diagnose label exclusion issues in Cilium that cause identity explosion and performance degradation.

---

## Introduction

Label exclusion in Cilium allows you to remove specific high-cardinality labels from identity computation while keeping all other labels identity-relevant. This is particularly useful for labels like `pod-template-hash` that are automatically added by Kubernetes controllers and have unique values per ReplicaSet.

Diagnosing label exclusion issues involves identifying high-cardinality labels, measuring their impact on identity count, and assessing the performance penalty from the inflated identity space.

This guide provides the specific steps for managing label exclusion in Cilium.

## Prerequisites

- Kubernetes cluster (v1.24+) with Cilium v1.14+
- `cilium` CLI, `helm`, and `kubectl`
- Understanding of Cilium identity system
- Access to Cilium configuration

## Understanding Label Exclusion

Label exclusion is the inverse approach to label inclusion: instead of specifying which labels to include, you specify which labels to exclude from identity computation. This is useful when most labels should be identity-relevant but a few high-cardinality labels cause problems.

```bash
# Check current configuration
cilium config view | grep "^labels"

# Labels prefixed with '!' or '-' are excluded
# Example: --set labels="k8s:!pod-template-hash k8s:!controller-revision-hash"
```

## Finding Labels to Exclude

```bash
# Find high-cardinality labels that inflate identity count
kubectl get pods --all-namespaces -o json | \
  jq '[.items[].metadata.labels | to_entries[] | .key] | group_by(.) | map({label: .[0], count: length}) | sort_by(-.count)' | head -20

# Common high-cardinality labels to exclude:
# - pod-template-hash (set by Deployments, unique per ReplicaSet)
# - controller-revision-hash (set by StatefulSets/DaemonSets)
# - pod-template-generation
# - rollout-hash

# Check how many unique values each label has
for label in pod-template-hash controller-revision-hash; do
  VALUES=$(kubectl get pods --all-namespaces -o json | \
    jq --arg l "$label" '[.items[] | .metadata.labels[$l] // empty] | unique | length')
  echo "$label: $VALUES unique values"
done
```

## Impact Assessment

```bash
# Current identity count
cilium identity list | wc -l

# Estimate reduction from excluding a label
LABEL="pod-template-hash"
WITH=$(kubectl get pods --all-namespaces -o json | \
  jq '[.items[].metadata.labels | to_entries | sort_by(.key) | from_entries | tostring] | unique | length')
WITHOUT=$(kubectl get pods --all-namespaces -o json | \
  jq --arg l "$LABEL" '[.items[].metadata.labels | del(.[$l]) | to_entries | sort_by(.key) | from_entries | tostring] | unique | length')
echo "With $LABEL: $WITH unique combos"
echo "Without $LABEL: $WITHOUT unique combos"
echo "Potential reduction: $((WITH - WITHOUT))"
```

## Verification

```bash
cilium config view | grep labels
cilium identity list | wc -l
cilium identity list -o json | jq '.[0:3] | .[].labels'
```

## Troubleshooting

- **Excluded label needed for policy**: Remove it from the exclusion list and add to include list instead.
- **Identity count unchanged after exclusion**: Restart Cilium agents and wait for GC.
- **New Deployment creates identities rapidly**: Its pod-template-hash may not be excluded.
- **Exclusion syntax wrong**: Use `k8s:!label-name` format with the exclamation mark prefix.

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

Diagnosing label exclusion in Cilium addresses one of the most common sources of identity explosion. By excluding automatically-generated high-cardinality labels like pod-template-hash and controller-revision-hash, you can reduce identity count by 50% or more in typical Kubernetes clusters, directly improving policy computation performance and reducing BPF map pressure.
