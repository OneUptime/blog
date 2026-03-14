# Preventing Excluding Labels in Cilium Performance

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Cilium, Kubernetes, Identity, Labels, Exclusion, Performance, Scalability

Description: How to prevent label exclusion issues in Cilium that cause identity explosion and performance degradation.

---

## Introduction

Label exclusion in Cilium allows you to remove specific high-cardinality labels from identity computation while keeping all other labels identity-relevant. This is particularly useful for labels like `pod-template-hash` that are automatically added by Kubernetes controllers and have unique values per ReplicaSet.

Fixing label exclusion means configuring Cilium to exclude high-cardinality labels that provide no security value but inflate the identity space.

This guide provides the specific steps for managing label exclusion in Cilium.

## Prerequisites

- Kubernetes cluster (v1.24+) with Cilium v1.14+
- `cilium` CLI, `helm`, and `kubectl`
- Understanding of Cilium identity system
- Access to Cilium configuration

## Default Exclusion Configuration

```bash
# Include common exclusions in every installation
helm install cilium cilium/cilium --namespace kube-system \
  --set labels="k8s:!pod-template-hash k8s:!controller-revision-hash k8s:!pod-template-generation k8s:!rollouts-pod-template-hash"
```

## Automated Label Cardinality Monitoring

```yaml
apiVersion: batch/v1
kind: CronJob
metadata:
  name: label-cardinality-check
  namespace: monitoring
spec:
  schedule: "0 6 * * *"
  jobTemplate:
    spec:
      template:
        spec:
          serviceAccountName: monitoring-sa
          containers:
          - name: checker
            image: bitnami/kubectl:latest
            command:
            - /bin/sh
            - -c
            - |
              # Find high-cardinality labels
              kubectl get pods --all-namespaces -o json | \
                jq -r '[.items[].metadata.labels | to_entries[]] | group_by(.key) | .[] |
                  select(([.[].value] | unique | length) > 100) |
                  "HIGH_CARDINALITY: \(.[0].key) = \([.[].value] | unique | length) values"'
          restartPolicy: OnFailure
```

## Identity Growth Alerting

```yaml
apiVersion: monitoring.coreos.com/v1
kind: PrometheusRule
metadata:
  name: label-exclusion-alerts
  namespace: monitoring
spec:
  groups:
  - name: label-exclusion
    rules:
    - alert: IdentityCountHigh
      expr: cilium_identity_count > 5000
      for: 30m
      labels:
        severity: warning
      annotations:
        summary: "High identity count may indicate missing label exclusions"
    - alert: IdentityGrowthRate
      expr: rate(cilium_identity_count[1h]) > 50
      for: 15m
      labels:
        severity: warning
      annotations:
        summary: "Identity count growing rapidly"
```

## Documentation

```bash
cat << 'DOC'
Label Exclusion Policy:
- pod-template-hash: Always exclude (Deployment artifact)
- controller-revision-hash: Always exclude (StatefulSet/DaemonSet artifact)
- pod-template-generation: Always exclude (DaemonSet artifact)
- Any label with >100 unique values: Review for exclusion
- New label exclusions require testing with existing policies
DOC
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

Preventing label exclusion in Cilium addresses one of the most common sources of identity explosion. By excluding automatically-generated high-cardinality labels like pod-template-hash and controller-revision-hash, you can reduce identity count by 50% or more in typical Kubernetes clusters, directly improving policy computation performance and reducing BPF map pressure.
