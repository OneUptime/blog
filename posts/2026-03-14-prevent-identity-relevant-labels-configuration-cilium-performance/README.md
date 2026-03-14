# Preventing Identity-Relevant Labels Configuration in Cilium Performance

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Cilium, Kubernetes, Identity, Labels, Configuration, Performance

Description: How to prevent identity-relevant labels configuration issues in Cilium that impact performance and scalability.

---

## Introduction

The identity-relevant labels configuration in Cilium determines which Kubernetes labels are used to compute security identities. This configuration directly impacts the total number of identities, BPF map sizes, policy computation time, and ultimately network performance.

Preventing configuration issues requires establishing a label governance process and monitoring identity growth from initial deployment.

This guide provides the specific steps for managing identity-relevant labels configuration.

## Prerequisites

- Kubernetes cluster (v1.24+) with Cilium v1.14+
- `cilium` CLI, `helm`, and `kubectl`
- `iperf3` and `netperf` for benchmarking
- Prometheus and Grafana for monitoring
- Node-level root access

## Standard Label Configuration

```bash
# Include in every Cilium installation
helm install cilium cilium/cilium --namespace kube-system \
  --set labels="k8s:app k8s:io.kubernetes.pod.namespace k8s:io.cilium.k8s.policy"
```

## Label Governance Process

```bash
#!/bin/bash
# label-review.sh - Run before adding new identity-relevant labels

NEW_LABEL=$1
echo "Reviewing addition of label: $NEW_LABEL"

# Count how many unique values this label has
VALUES=$(kubectl get pods --all-namespaces -o json | \
  jq --arg l "$NEW_LABEL" '[.items[] | .metadata.labels[$l] // empty] | unique | length')

echo "Unique values for $NEW_LABEL: $VALUES"
echo "This would multiply identity count by up to ${VALUES}x"

CURRENT_IDS=$(cilium identity list | wc -l)
echo "Current identities: $CURRENT_IDS"
echo "Estimated new identities: $((CURRENT_IDS * VALUES))"
```

## Monitoring

```yaml
apiVersion: monitoring.coreos.com/v1
kind: PrometheusRule
metadata:
  name: identity-config-alerts
  namespace: monitoring
spec:
  groups:
  - name: identity-config
    rules:
    - alert: IdentityCountAboveThreshold
      expr: cilium_identity_count > 10000
      for: 30m
      labels:
        severity: warning
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

Preventing identity-relevant labels configuration is a critical scalability optimization in Cilium. The right label configuration can reduce identity count by orders of magnitude, directly improving policy computation performance and reducing BPF map pressure in large clusters.
