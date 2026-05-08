# Diagnosing Including Labels in Cilium Performance

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Cilium, Kubernetes, Identity, Labels, Performance, Configuration

Description: How to diagnose label inclusion configuration issues in Cilium that affect identity computation and network policy matching.

---

## Introduction

Including the right labels in Cilium's identity computation is a balancing act: too few labels and network policies cannot differentiate between workloads; too many labels and identity count explodes, degrading performance.

Diagnosing label inclusion issues involves checking which labels are configured, verifying policies reference only included labels, and measuring the identity count impact.

This guide provides the specific steps for managing label inclusion in Cilium.

## Prerequisites

- Kubernetes cluster (v1.24+) with Cilium v1.14+
- `cilium` CLI, `hubble`, `helm`, `kubectl`, and `jq`
- Understanding of Cilium identity system
- Access to Cilium configuration and permission to exec into Cilium agent pods

## Understanding Label Inclusion

When Cilium is configured with inclusive patterns in the `labels` setting, only labels that match those patterns plus Cilium's default inclusive patterns are included in identity computation. Diagnosing issues means verifying the right labels are included.

```bash
# Check current label pattern configuration

kubectl -n kube-system get cm cilium-config -o jsonpath='{.data.labels}{"\n"}'

# If the output is empty, Cilium uses its default identity-relevant label behavior:
# most labels are included, with documented default exclusions
```

## Checking Which Labels Are Active

```bash
export CILIUM_DBG="kubectl -n kube-system exec ds/cilium -- cilium-dbg"

# View identities and their labels
$CILIUM_DBG identity list -o json | jq '.[0:5] | .[].labels'

# Check if a specific label is included
$CILIUM_DBG identity list -o json | jq -r '.[].labels[]' | grep "app" | head -5

# Count identities that use a specific label
$CILIUM_DBG identity list -o json | jq '[.[] | select(.labels[] | contains("app"))] | length'
```

## Diagnosing Missing Labels

```bash
# If policies reference a label not in the include list, they won't match
# Check policy labels vs included labels
POLICY_LABELS=$(kubectl get cnp --all-namespaces -o json | \
  jq -r '[.items[].spec | .. | .matchLabels? // empty | keys[]] | unique | sort | .[]')

LABEL_PATTERNS=$(kubectl -n kube-system get cm cilium-config -o jsonpath='{.data.labels}')

DEFAULT_INCLUSIVE_PATTERNS='reserved:.* io\.kubernetes\.pod\.namespace io\.cilium\.k8s\.namespace\.labels io\.cilium\.k8s\.policy\.cluster io\.cilium\.k8s\.policy\.serviceaccount app\.kubernetes\.io'
DEFAULT_EXCLUSIVE_PATTERNS='!io\.kubernetes !kubernetes\.io !statefulset\.kubernetes\.io/pod-name !apps\.kubernetes\.io/pod-index !batch\.kubernetes\.io/job-completion-index !batch\.kubernetes\.io/controller-uid !beta\.kubernetes\.io !k8s\.io !pod-template-generation !pod-template-hash !controller-revision-hash !annotation.* !controller-uid !etcd_node'

if [ -n "$LABEL_PATTERNS" ] && printf '%s\n' "$LABEL_PATTERNS" | tr ' ' '\n' | grep -qv '^!'; then
  INCLUSIVE_PATTERNS="$(printf '%s\n' "$LABEL_PATTERNS" | tr ' ' '\n' | grep -v '^!' | tr '\n' ' ') $DEFAULT_INCLUSIVE_PATTERNS"
else
  INCLUSIVE_PATTERNS=".*"
fi
EXCLUSIVE_PATTERNS="$DEFAULT_EXCLUSIVE_PATTERNS $(printf '%s\n' "$LABEL_PATTERNS" | tr ' ' '\n' | grep '^!' | tr '\n' ' ')"

echo "Labels used in policies:"
echo "$POLICY_LABELS"
echo ""
echo "Identity-relevant label patterns:"
printf '%s\n' "$INCLUSIVE_PATTERNS" | tr ' ' '\n'
printf '%s\n' "$EXCLUSIVE_PATTERNS" | tr ' ' '\n'
echo ""
echo "Policy labels that are not identity-relevant:"
awk -v includes="$INCLUSIVE_PATTERNS" -v excludes="$EXCLUSIVE_PATTERNS" '
  BEGIN {
    ni = split(includes, inc, " ")
    ne = split(excludes, exc, " ")
  }
  {
    included = 0
    excluded = 0
    for (i = 1; i <= ni; i++) {
      pattern = inc[i]
      if (pattern == "") {
        continue
      }
      if ($0 ~ ("^" pattern)) {
        included = 1
        break
      }
    }
    for (i = 1; i <= ne; i++) {
      pattern = exc[i]
      sub(/^!/, "", pattern)
      if (pattern == "") {
        continue
      }
      if ($0 ~ ("^" pattern)) {
        excluded = 1
        break
      }
    }
    if (!included || excluded) {
      print
    }
  }
' <(echo "$POLICY_LABELS")
```

## Verification

```bash
kubectl -n kube-system get cm cilium-config -o jsonpath='{.data.labels}{"\n"}'
kubectl -n kube-system exec ds/cilium -- cilium-dbg identity list | wc -l
```

## Troubleshooting

- **Policies not matching after label change**: A required label was not included. Check policy selectors.
- **Identity count still high after filtering**: Check for high-cardinality labels in the include list.
- **Cannot determine which labels policies need**: Use the analysis script to extract labels from all policies.
- **Label config not persisting**: Ensure it is in the Helm values file, not just set via `cilium config`.

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
kubectl -n kube-system exec ds/cilium -- cilium-dbg bpf ct list > $DIAG_DIR/ct-entries.txt 2>&1
kubectl -n kube-system exec ds/cilium -- cilium-dbg bpf nat list > $DIAG_DIR/nat-entries.txt 2>&1

# Collect endpoint information
kubectl -n kube-system exec ds/cilium -- cilium-dbg endpoint list -o json > $DIAG_DIR/endpoints.json

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
ENDPOINT_ID=$(kubectl -n kube-system exec ds/cilium -- cilium-dbg endpoint list -o json | jq '.[0].id')
kubectl -n kube-system exec ds/cilium -- cilium-dbg monitor --related-to $ENDPOINT_ID --type trace

# Monitor drops with verbose output
kubectl -n kube-system exec ds/cilium -- cilium-dbg monitor --type drop -v

# Monitor policy verdicts
kubectl -n kube-system exec ds/cilium -- cilium-dbg monitor --type policy-verdict

# Filter by specific protocol
kubectl -n kube-system exec ds/cilium -- cilium-dbg monitor --type trace -v | grep TCP
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

Diagnosing label inclusion in Cilium is crucial for maintaining the balance between policy expressiveness and performance. The right configuration includes only the labels needed for network policies, keeping identity count low and policy computation fast.
