# Preventing Baseline Performance in Cilium

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Cilium, Kubernetes, Performance, Baseline, Benchmarking

Description: How to prevent baseline performance issues in Cilium by comparing pod-to-pod performance against host-to-host hardware baselines.

---

## Introduction

Baseline performance represents the maximum achievable throughput and minimum latency of your hardware without any CNI overhead. Every Cilium performance analysis should start with establishing this baseline, because it sets the upper bound for what is achievable.

Preventing baseline regression requires continuous tracking of pod-to-host efficiency and alerting when it degrades.

This guide provides the methodology and commands for baseline performance management in Cilium.

## Prerequisites

- Kubernetes cluster (v1.24+) with Cilium v1.14+
- `cilium` CLI, `helm`, and `kubectl`
- `iperf3` and `netperf` for benchmarking
- Prometheus and Grafana for monitoring
- Node-level root access

## Automated Baseline Tracking

```yaml
apiVersion: batch/v1
kind: CronJob
metadata:
  name: baseline-tracker
  namespace: monitoring
spec:
  schedule: "0 2 * * *"
  jobTemplate:
    spec:
      template:
        spec:
          containers:
          - name: tracker
            image: networkstatic/iperf3
            command:
            - /bin/sh
            - -c
            - |
              # Pod-to-pod throughput
              BPS=$(iperf3 -c iperf-server.monitoring -t 20 -P 1 -J | \
                jq '.end.sum_sent.bits_per_second')
              cat <<METRIC | curl --data-binary @- http://pushgateway.monitoring:9091/metrics/job/baseline
              cilium_baseline_throughput_bps $BPS
              METRIC
          restartPolicy: OnFailure
```

## Baseline Regression Alerts

```yaml
apiVersion: monitoring.coreos.com/v1
kind: PrometheusRule
metadata:
  name: baseline-alerts
  namespace: monitoring
spec:
  groups:
  - name: baseline
    rules:
    - alert: BaselineThroughputRegression
      expr: |
        cilium_baseline_throughput_bps
        < 0.85 * avg_over_time(cilium_baseline_throughput_bps[30d])
      for: 1h
      labels:
        severity: warning
      annotations:
        summary: "Throughput dropped 15% below 30-day baseline"
```

## Verification

```bash
cilium status --verbose
echo "Compare pod throughput vs host baseline"
```

## Troubleshooting

- **Host baseline lower than expected**: Check NIC link speed, CPU governor, and kernel TCP tuning.
- **Pod performance much lower than host**: Check Cilium datapath mode -- tunnel mode adds significant overhead.
- **Inconsistent baseline measurements**: Increase test duration, check for background workloads.
- **Baseline changes after kernel update**: Re-run host baseline and update reference values.

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


## Best Practices Summary

Following these best practices ensures long-term success with your Cilium deployment:

- Always measure before and after changes to quantify impact accurately
- Use version-controlled configuration files to prevent drift and enable rollback
- Automate recurring tasks like benchmarking and validation with CronJobs
- Keep kernel, Cilium, and tooling versions consistent across all nodes in the cluster
- Document every performance-related decision and its measured outcome for future reference
- Review performance metrics weekly as part of your operational routine to catch slow regressions


## Conclusion

Preventing baseline performance in Cilium establishes the reference point for all performance optimization. With optimal Cilium configuration (native routing, BPF host routing, XDP acceleration), pod-to-pod throughput should achieve 90-98% of host-to-host baseline, confirming minimal CNI overhead.
