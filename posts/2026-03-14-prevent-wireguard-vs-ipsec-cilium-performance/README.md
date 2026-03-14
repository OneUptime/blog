# Preventing WireGuard vs IPsec Performance Differences in Cilium

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Cilium, Kubernetes, WireGuard, IPsec, Encryption, Performance

Description: Proactive strategies to prevent encryption performance issues when using WireGuard or IPsec with Cilium, including monitoring, testing, and capacity planning.

---

## Introduction

Encryption performance can degrade over time due to increased traffic volumes, kernel updates that change crypto paths, or hardware changes that affect offload capabilities. Preventing these issues requires continuous monitoring of encryption overhead and proactive testing of both protocol options.

This guide covers the monitoring and testing framework that keeps encryption performance optimal regardless of which protocol you use.

The key principle is monitoring the encryption overhead ratio continuously, not just the absolute throughput.

## Prerequisites

- Kubernetes cluster with Cilium v1.14+ and encryption enabled
- Prometheus and Grafana monitoring
- CI/CD pipeline for automated testing

## Continuous Encryption Overhead Monitoring

```yaml
apiVersion: batch/v1
kind: CronJob
metadata:
  name: encryption-overhead-monitor
  namespace: monitoring
spec:
  schedule: "0 3 * * *"
  jobTemplate:
    spec:
      template:
        spec:
          containers:
          - name: monitor
            image: networkstatic/iperf3
            command:
            - /bin/sh
            - -c
            - |
              # Measure encrypted throughput
              ENC=$(iperf3 -c iperf-server.monitoring -t 20 -P 1 -J | \
                jq '.end.sum_sent.bits_per_second')
              cat <<METRIC | curl --data-binary @- http://pushgateway.monitoring:9091/metrics/job/enc_overhead
              cilium_encrypted_throughput_bps $ENC
              METRIC
          restartPolicy: OnFailure
```

## Alerting Rules

```yaml
apiVersion: monitoring.coreos.com/v1
kind: PrometheusRule
metadata:
  name: encryption-perf-alerts
  namespace: monitoring
spec:
  groups:
  - name: encryption-performance
    rules:
    - alert: EncryptionThroughputRegression
      expr: |
        cilium_encrypted_throughput_bps
        < 0.8 * avg_over_time(cilium_encrypted_throughput_bps[30d])
      for: 1h
      labels:
        severity: warning
      annotations:
        summary: "Encrypted throughput dropped 20% below 30-day average"
```

## Pre-Upgrade Testing

```bash
#!/bin/bash
# Run before kernel or Cilium upgrades
echo "Current encryption performance:"
kubectl exec iperf-client -- iperf3 -c $SERVER_IP -t 20 -P 1 -J | \
  jq '.end.sum_sent.bits_per_second / 1000000000'
echo "Save this value for post-upgrade comparison"
```

## Verification

```bash
kubectl get cronjobs -n monitoring
curl -s http://prometheus:9090/api/v1/query?query=cilium_encrypted_throughput_bps
```

## Troubleshooting

- **Overhead increasing gradually**: Check for kernel updates that may have changed crypto code paths.
- **Sudden performance drop**: Check if NIC hardware offload was disabled by a driver update.
- **Alert fatigue**: Adjust thresholds based on your hardware's encryption ceiling.
- **CronJob failing**: Check image pull and network policy permissions.

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

Preventing encryption performance degradation requires continuous monitoring of the encrypted throughput and the overhead ratio compared to unencrypted baselines. By tracking these metrics daily and alerting on regressions, you can catch issues caused by kernel updates, hardware changes, or configuration drift before they affect production traffic.
