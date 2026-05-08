# Preventing Including Labels in Cilium Performance

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Cilium, Kubernetes, Identity, Labels, Performance, Configuration

Description: How to prevent label inclusion configuration issues in Cilium that affect identity computation and network policy matching.

---

## Introduction

Including the right labels in Cilium's identity computation is a balancing act: too few labels and network policies cannot differentiate between workloads; too many labels and identity count explodes, degrading performance.

Preventing label inclusion issues requires establishing the configuration at install time, implementing policy review gates, and monitoring identity count continuously.

This guide provides the specific steps for managing label inclusion in Cilium.

## Prerequisites

- Kubernetes cluster (v1.24+) with Cilium v1.14+
- `cilium` CLI, `helm`, and `kubectl`
- Understanding of Cilium identity system
- Access to Cilium configuration

## Standard Label Include Configuration

```bash
# Define standard labels during installation

helm install cilium cilium/cilium --namespace kube-system \
  --set labels="app$"
```

## Policy Review Gate

```bash
#!/bin/bash
# pre-apply-policy-check.sh
# Run before applying new CiliumNetworkPolicies

POLICY_FILE=$1
CONFIG_LABELS=$(kubectl -n kube-system get configmap cilium-config -o jsonpath='{.data.labels}')

# Extract labels from policy
POLICY_LABELS=$(python3 -c "
import sys, yaml, json
labels = set()
def extract_labels(obj):
    if isinstance(obj, dict):
        if 'matchLabels' in obj:
            labels.update(obj['matchLabels'].keys())
        for v in obj.values():
            extract_labels(v)
    elif isinstance(obj, list):
        for v in obj:
            extract_labels(v)
for data in yaml.safe_load_all(sys.stdin):
    extract_labels(data)
print('\n'.join(sorted(labels)))
" < "$POLICY_FILE")

MISSING=$(POLICY_LABELS="$POLICY_LABELS" python3 - "$CONFIG_LABELS" <<'PY'
import os, re, sys
patterns = sys.argv[1].split()
policy_labels = [line.strip() for line in os.environ.get('POLICY_LABELS', '').splitlines() if line.strip()]

if not any(not pattern.startswith('!') for pattern in patterns):
    sys.exit(0)

default_includes = [
    r'reserved:.*',
    r'io\.kubernetes\.pod\.namespace',
    r'io\.cilium\.k8s\.namespace\.labels',
    r'io\.cilium\.k8s\.policy\.cluster',
    r'io\.cilium\.k8s\.policy\.serviceaccount',
    r'app\.kubernetes\.io',
]
includes = [pattern for pattern in patterns if not pattern.startswith('!')] + default_includes

def normalize(label):
    return label.split(':', 1)[1] if label.startswith(('k8s:', 'any:')) else label

for label in policy_labels:
    key = normalize(label)
    if not any(re.match(pattern, key) for pattern in includes):
        print(label)
PY
)
if [ -n "$MISSING" ]; then
  echo "WARNING: Policy uses labels not in identity config:"
  echo "$MISSING"
  echo "These labels will not affect identity matching!"
fi
```

## Identity Monitoring

```yaml
apiVersion: monitoring.coreos.com/v1
kind: PrometheusRule
metadata:
  name: label-inclusion-alerts
  namespace: monitoring
spec:
  groups:
  - name: label-inclusion
    rules:
    - alert: HighIdentityCount
      expr: sum(cilium_identity) > 5000
      for: 30m
      labels:
        severity: warning
```

## Verification

```bash
kubectl -n kube-system get configmap cilium-config -o jsonpath='{.data.labels}{"\n"}'
kubectl -n kube-system exec ds/cilium -- cilium-dbg identity list | wc -l
```

## Troubleshooting

- **Policies not matching after label change**: A required label was not included. Check policy selectors.
- **Identity count still high after filtering**: Check for high-cardinality labels in the include list.
- **Cannot determine which labels policies need**: Use the analysis script to extract labels from all policies.
- **Label config not persisting**: Ensure it is in the Helm values file, not just set via `cilium config`.

## Building a Prevention Framework

A comprehensive prevention framework combines multiple layers of protection to ensure issues are caught before they impact production:

### Layer 1: Configuration Management

Store all Cilium and cluster configurations in version control. Use GitOps tools like Flux or ArgoCD to enforce desired state:

```bash
# Store Cilium values in Git
git add cilium-values.yaml
git commit -m "Cilium performance configuration baseline"

# Use Flux HelmRelease for automatic reconciliation
cat > cilium-helmrelease.yaml << 'YAML'
apiVersion: helm.toolkit.fluxcd.io/v2
kind: HelmRelease
metadata:
  name: cilium
  namespace: kube-system
spec:
  interval: 5m
  chart:
    spec:
      chart: cilium
      version: "1.14.x"
      sourceRef:
        kind: HelmRepository
        name: cilium
  valuesFrom:
  - kind: ConfigMap
    name: cilium-values
YAML
```

### Layer 2: Automated Testing

Run performance regression tests on every change:

```bash
#!/bin/bash
# perf-gate.sh - Run as part of CI/CD pipeline

echo "Running performance regression gate..."

# Quick smoke test
BPS=$(kubectl exec perf-client -- iperf3 -c perf-server.monitoring -t 10 -P 1 -J | \
  jq '.end.sum_sent.bits_per_second')
MIN_BPS=8000000000

if (( $(echo "$BPS < $MIN_BPS" | bc -l) )); then
  echo "FAIL: Performance below minimum threshold"
  echo "Measured: $BPS, Required: $MIN_BPS"
  exit 1
fi

echo "PASS: Performance within acceptable range"
```

### Layer 3: Observability

Maintain dashboards and alerts that provide real-time visibility into performance metrics. The monitoring should be checked daily and alerts should be acted upon within the SLA defined by your team.

Regular performance reviews (weekly or biweekly) where the team examines trends and proactively addresses any degradation before it becomes critical are highly recommended.

## Change Management Integration

Integrate performance prevention into your change management process:

### Pre-Change Performance Snapshot

Before any cluster change, capture a performance snapshot:

```bash
#!/bin/bash
# pre-change-snapshot.sh
SNAPSHOT="/tmp/perf-snapshot-$(date +%Y%m%d-%H%M%S)"
mkdir -p $SNAPSHOT

# Throughput
kubectl exec perf-client -- iperf3 -c perf-server.monitoring -t 15 -P 1 -J > $SNAPSHOT/throughput.json

# Latency
kubectl exec netperf-client -- netperf -H netperf-server.monitoring -t TCP_RR -l 15 > $SNAPSHOT/latency.txt

# Connection rate
kubectl exec netperf-client -- netperf -H netperf-server.monitoring -t TCP_CRR -l 15 > $SNAPSHOT/connrate.txt

# Cilium state
cilium status --verbose > $SNAPSHOT/cilium-status.txt
cilium config view > $SNAPSHOT/cilium-config.txt

echo "Snapshot saved to $SNAPSHOT"
echo "Run post-change-compare.sh after the change to detect regressions"
```

### Post-Change Comparison

```bash
#!/bin/bash
# post-change-compare.sh <pre-change-snapshot-dir>
PRE=$1
POST="/tmp/perf-snapshot-post-$(date +%Y%m%d-%H%M%S)"
mkdir -p $POST

kubectl exec perf-client -- iperf3 -c perf-server.monitoring -t 15 -P 1 -J > $POST/throughput.json

PRE_BPS=$(jq '.end.sum_sent.bits_per_second' $PRE/throughput.json)
POST_BPS=$(jq '.end.sum_sent.bits_per_second' $POST/throughput.json)
CHANGE=$(echo "scale=2; ($POST_BPS - $PRE_BPS) / $PRE_BPS * 100" | bc)

echo "Throughput change: ${CHANGE}%"
if (( $(echo "$CHANGE < -5" | bc -l) )); then
  echo "WARNING: >5% throughput regression detected"
fi
```

### Runbook Updates

Maintain a living runbook that documents all known performance issues and their resolutions. Update it after every incident.

## Conclusion

Preventing label inclusion in Cilium is crucial for maintaining the balance between policy expressiveness and performance. The right configuration includes only the labels needed for network policies, keeping identity count low and policy computation fast.
