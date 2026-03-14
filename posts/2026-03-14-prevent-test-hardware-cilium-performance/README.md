# Preventing Test Hardware Issues in Cilium Performance

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Cilium, Kubernetes, Performance, Hardware, Best Practices

Description: Best practices for preventing hardware-related performance testing issues in Cilium, including hardware standardization, automated validation, and capacity monitoring.

---

## Introduction

Preventing hardware issues in Cilium performance testing requires standardizing the hardware platform, automating hardware configuration validation, and monitoring for hardware degradation. Without these measures, hardware inconsistencies silently undermine the reliability of performance benchmarks.

The preventive approach starts with hardware selection and extends through automated configuration management. Consistent hardware across test nodes eliminates the most common source of result variability.

This guide covers the hardware management practices that ensure reliable Cilium performance testing.

## Prerequisites

- Kubernetes cluster (v1.24+) with Cilium v1.14+
- `cilium` CLI and `kubectl` access
- Node-level root access
- Prometheus monitoring (recommended)

## Hardware Standardization

```bash
# Document hardware requirements for test nodes
cat << 'HWREQ'
Test Node Hardware Requirements:
- NIC: 25G+ with native XDP support
- CPU: 16+ cores with AES-NI and AVX2
- Memory: 64GB+ DDR4
- NUMA: NIC and CPUs on same NUMA node
- PCIe: Gen3 x16 or better for NIC slot
HWREQ

# Validation script for new nodes
#!/bin/bash
PASS=true
SPEED=$(ethtool eth0 | grep Speed | awk '{print $2}')
CORES=$(nproc)
AES=$(grep -c aes /proc/cpuinfo)
if [ "$CORES" -lt 16 ]; then echo "FAIL: Need 16+ cores"; PASS=false; fi
if [ "$AES" -eq 0 ]; then echo "FAIL: No AES-NI"; PASS=false; fi
echo "Validation: $PASS"
```

## Automated Hardware Health Monitoring

```yaml
apiVersion: monitoring.coreos.com/v1
kind: PrometheusRule
metadata:
  name: hardware-health-alerts
  namespace: monitoring
spec:
  groups:
  - name: hardware-health
    rules:
    - alert: CPUGovernorNotPerformance
      expr: node_cpu_scaling_governor{governor!="performance"} > 0
      for: 5m
      labels:
        severity: warning
    - alert: NICErrors
      expr: rate(node_network_receive_errs_total{device="eth0"}[5m]) > 0
      for: 5m
      labels:
        severity: warning
```

## Regular Hardware Benchmarking

```yaml
apiVersion: batch/v1
kind: CronJob
metadata:
  name: hardware-baseline
  namespace: monitoring
spec:
  schedule: "0 1 * * 0"
  jobTemplate:
    spec:
      template:
        spec:
          hostNetwork: true
          containers:
          - name: benchmark
            image: networkstatic/iperf3
            command:
            - /bin/sh
            - -c
            - |
              # Host-to-host baseline (no CNI overhead)
              BPS=$(iperf3 -c node-2 -t 20 -P 1 -J | jq '.end.sum_sent.bits_per_second')
              cat <<METRIC | curl --data-binary @- http://pushgateway.monitoring:9091/metrics/job/hw_baseline
              hardware_baseline_throughput_bps $BPS
              METRIC
          restartPolicy: OnFailure
```

## Verification

```bash
# Run the validation checks above
# All items should show PASS
cilium status --verbose
```

## Troubleshooting

- **Validation fails on specific nodes**: Check if nodes were provisioned from different images.
- **Kernel module load fails**: Verify the module is available for your kernel version.
- **Cilium status unhealthy**: Check agent logs with `kubectl logs -n kube-system ds/cilium`.
- **Tools missing in containers**: Use an image that includes the required tools or mount from host.

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

Properly preventing test hardware issues in Cilium performance is essential for reliable Cilium performance testing. Each component plays a role in the accuracy and reproducibility of benchmark results.
