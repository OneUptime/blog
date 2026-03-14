# Preventing Cilium Limiting Identity-Relevant Labels

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Cilium, Kubernetes, Identity, Labels, Scalability, Performance

Description: How to prevent issues with Cilium's identity-relevant labels configuration, which directly impacts scalability and policy computation performance.

---

## Introduction

Cilium's security identity system assigns a unique numeric identity to each distinct set of security-relevant labels. When too many labels are identity-relevant, the number of unique identities can explode, causing increased memory usage, slower policy computation, and larger BPF maps.

Preventing identity explosion requires configuring label limits from day one, monitoring identity growth, and establishing a label governance policy.

This guide provides the specific steps for managing identity-relevant labels in Cilium.

## Prerequisites

- Kubernetes cluster (v1.24+) with Cilium v1.14+
- `cilium` CLI, `helm`, and `kubectl`
- `iperf3` and `netperf` for benchmarking
- Prometheus and Grafana for monitoring
- Node-level root access

## Initial Label Configuration

```bash
# Always configure label limits during initial installation
helm install cilium cilium/cilium --namespace kube-system \
  --set labels="k8s:app k8s:io.kubernetes.pod.namespace k8s:io.cilium.k8s.policy"
```

## Identity Count Monitoring

```yaml
apiVersion: monitoring.coreos.com/v1
kind: PrometheusRule
metadata:
  name: identity-alerts
  namespace: monitoring
spec:
  groups:
  - name: cilium-identity
    rules:
    - alert: IdentityCountHigh
      expr: cilium_identity_count > 5000
      for: 30m
      labels:
        severity: warning
      annotations:
        summary: "Cilium identity count exceeds 5000"
    - alert: IdentityGrowthRapid
      expr: deriv(cilium_identity_count[1h]) > 100
      for: 15m
      labels:
        severity: warning
      annotations:
        summary: "Cilium identities growing rapidly (>100/hour)"
```

## Label Policy Documentation

```bash
# Document which labels are identity-relevant
cat << 'DOC'
Identity-Relevant Labels Policy:
- k8s:app - Required for application-level policies
- k8s:io.kubernetes.pod.namespace - Required for namespace isolation
- k8s:io.cilium.k8s.policy - Required for CiliumNetworkPolicy
- All other labels are NOT identity-relevant
- New identity-relevant labels require performance review
DOC
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

Preventing Cilium's identity-relevant labels is essential for scalability. By carefully selecting which labels contribute to security identities, you can reduce identity count by 10x or more in large clusters, directly improving policy computation time and reducing resource consumption.
