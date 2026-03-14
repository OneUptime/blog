# Preventing Encryption Performance in Cilium

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Cilium, Kubernetes, Encryption, WireGuard, IPsec, Performance

Description: How to prevent encryption performance in Cilium, covering both WireGuard and IPsec overhead analysis and optimization.

---

## Introduction

Encryption in Cilium adds CPU overhead to every packet, reducing throughput and increasing latency compared to unencrypted networking. The magnitude of the overhead depends on the encryption protocol (WireGuard vs IPsec), hardware crypto support, and the workload characteristics.

Preventing encryption performance degradation requires continuous monitoring of encrypted throughput and alerting on regressions that could indicate hardware or software changes affecting crypto performance.

This guide covers the specific steps for managing encryption performance in Cilium.

## Prerequisites

- Kubernetes cluster (v1.24+) with Cilium v1.14+
- `cilium` CLI, `helm`, and `kubectl`
- `iperf3` and `netperf` for benchmarking
- Prometheus and Grafana for monitoring
- Node-level root access

## Proactive Encryption Monitoring

```yaml
apiVersion: batch/v1
kind: CronJob
metadata:
  name: encryption-perf-monitor
  namespace: monitoring
spec:
  schedule: "0 4 * * *"
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
              BPS=$(iperf3 -c iperf-server.monitoring -t 20 -P 1 -J | jq '.end.sum_sent.bits_per_second')
              cat <<METRIC | curl --data-binary @- http://pushgateway.monitoring:9091/metrics/job/enc_perf
              cilium_encrypted_bps $BPS
              METRIC
          restartPolicy: OnFailure
```

## Alerting

```yaml
apiVersion: monitoring.coreos.com/v1
kind: PrometheusRule
metadata:
  name: encryption-alerts
  namespace: monitoring
spec:
  groups:
  - name: encryption
    rules:
    - alert: EncryptionPerfDegraded
      expr: cilium_encrypted_bps < 0.8 * avg_over_time(cilium_encrypted_bps[30d])
      for: 1h
      labels:
        severity: warning
```

## Verification

```bash
cilium encrypt status
kubectl exec iperf-client -- iperf3 -c $SERVER_IP -t 10 -P 1 -J | \
  jq '.end.sum_sent.bits_per_second / 1000000000'
```

## Troubleshooting

- **Encryption not active**: Verify Cilium helm values include encryption.enabled=true.
- **Overhead > 40%**: Check for userspace WireGuard or missing AES-NI for IPsec.
- **Some nodes not encrypted**: Check Cilium agent logs for key exchange errors.
- **Performance varies by node pair**: Different hardware capabilities across nodes.

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

Preventing encryption performance in Cilium ensures that the security benefits of transparent encryption come with acceptable performance overhead. With proper protocol selection, hardware utilization, and continuous monitoring, encryption overhead can be kept below 20-30%, making it practical for production deployments.
