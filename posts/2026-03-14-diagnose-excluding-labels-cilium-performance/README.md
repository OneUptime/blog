# Diagnosing Excluding Labels in Cilium Performance

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Cilium, Kubernetes, Identity, Labels, Exclusion, Performance, Scalability

Description: How to diagnose label exclusion issues in Cilium that cause identity explosion and performance degradation.

---

## Introduction

Label exclusion in Cilium allows you to remove specific high-cardinality labels from identity computation while keeping all other labels identity-relevant. Cilium already excludes common Kubernetes-generated labels such as `pod-template-hash` by default, but the same mechanism is useful for additional custom rollout, build, or timestamp labels that have unique values per workload revision.

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

# Labels prefixed with '!' are excluded
# Example: --set labels="!rollout-hash !build-id"
```

## Finding Labels to Exclude

```bash
# Find high-cardinality label values that can inflate identity count
kubectl get pods --all-namespaces -o json | \
  jq '[.items[] | .metadata.labels // {} | to_entries[] | {key, value}] |
      group_by(.key) |
      map({label: .[0].key, pods: length, uniqueValues: ([.[].value] | unique | length)}) |
      sort_by(-.uniqueValues, -.pods) | .[:20]'

# Common high-cardinality labels to exclude:
# - custom rollout-hash labels
# - custom build-id or version-sha labels
# - timestamp or deployment-time labels
#
# Cilium excludes pod-template-hash, controller-revision-hash,
# pod-template-generation, and several other Kubernetes-generated labels by default.

# Check how many unique values each label has
for label in rollout-hash build-id; do
  VALUES=$(kubectl get pods --all-namespaces -o json | \
    jq --arg l "$label" '[.items[] | .metadata.labels[$l] // empty] | unique | length')
  echo "$label: $VALUES unique values"
done
```

## Impact Assessment

```bash
# Current identity count
kubectl get ciliumidentities --no-headers 2>/dev/null | wc -l

# Estimate reduction from excluding a label
LABEL="rollout-hash"
WITH=$(kubectl get pods --all-namespaces -o json | \
  jq '[.items[] | .metadata.labels // {} | to_entries | sort_by(.key) | from_entries | tostring] | unique | length')
WITHOUT=$(kubectl get pods --all-namespaces -o json | \
  jq --arg l "$LABEL" '[.items[] | .metadata.labels // {} | del(.[$l]) | to_entries | sort_by(.key) | from_entries | tostring] | unique | length')
echo "With $LABEL: $WITH unique combos"
echo "Without $LABEL: $WITHOUT unique combos"
echo "Potential reduction: $((WITH - WITHOUT))"
```

## Verification

```bash
cilium config view | grep labels
kubectl get ciliumidentities --no-headers 2>/dev/null | wc -l
kubectl get ciliumidentities -o json | jq '.items[0:3] | .[]["security-labels"]'
```

## Troubleshooting

- **Excluded label needed for policy**: Remove it from the exclusion list and make sure it is included in the identity-relevant label set.
- **Identity count unchanged after exclusion**: Restart Cilium agents and wait for GC.
- **New Deployment creates identities rapidly**: Check for custom rollout, build, timestamp, or revision labels that are not excluded.
- **Exclusion syntax wrong**: Use `!label-name` format with the exclamation mark prefix.

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
CILIUM_POD=$(kubectl -n kube-system get pods -l k8s-app=cilium -o jsonpath='{.items[0].metadata.name}')
kubectl -n kube-system exec "$CILIUM_POD" -c cilium-agent -- cilium-dbg bpf ct list global > $DIAG_DIR/ct-entries.txt 2>&1
kubectl -n kube-system exec "$CILIUM_POD" -c cilium-agent -- cilium-dbg bpf nat list > $DIAG_DIR/nat-entries.txt 2>&1

# Collect endpoint information
kubectl -n kube-system exec "$CILIUM_POD" -c cilium-agent -- cilium-dbg endpoint list -o json > $DIAG_DIR/endpoints.json

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

The `cilium-dbg monitor` command provides real-time visibility into the eBPF datapath:

```bash
# Monitor all traffic for a specific endpoint
CILIUM_POD=$(kubectl -n kube-system get pods -l k8s-app=cilium -o jsonpath='{.items[0].metadata.name}')
ENDPOINT_ID=$(kubectl -n kube-system exec "$CILIUM_POD" -c cilium-agent -- cilium-dbg endpoint list -o json | jq '.[0].id')
kubectl -n kube-system exec "$CILIUM_POD" -c cilium-agent -- cilium-dbg monitor --related-to $ENDPOINT_ID --type trace

# Monitor drops with verbose output
kubectl -n kube-system exec "$CILIUM_POD" -c cilium-agent -- cilium-dbg monitor --type drop -v

# Monitor policy verdicts
kubectl -n kube-system exec "$CILIUM_POD" -c cilium-agent -- cilium-dbg monitor --type policy-verdict

# Filter by specific protocol
kubectl -n kube-system exec "$CILIUM_POD" -c cilium-agent -- cilium-dbg monitor --type trace -v | grep TCP
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
bpftrace -e 'tracepoint:xdp:xdp_redirect { @cnt[args->act] = count(); }'
```

These diagnostic tools form a comprehensive toolkit for understanding exactly what happens to packets as they traverse Cilium's eBPF datapath.

## Conclusion

Diagnosing label exclusion in Cilium addresses one of the most common sources of identity explosion. Cilium already excludes several automatically-generated high-cardinality Kubernetes labels, including pod-template-hash and controller-revision-hash, by default. By finding and excluding additional custom high-cardinality labels, you can reduce identity count, improve policy computation performance, and reduce BPF map pressure.
