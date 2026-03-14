# Preventing 32-Process Performance Degradation in Cilium

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Cilium, Kubernetes, Performance, Multi-Process, Best Practices

Description: Proactive strategies to prevent performance degradation when running highly parallel 32-process workloads in Cilium-managed clusters.

---

## Introduction

Preventing performance degradation for 32-process workloads in Cilium requires proactive resource management, continuous monitoring, and capacity planning. High-parallelism workloads are particularly sensitive to resource exhaustion because 32 processes can consume shared resources much faster than low-parallelism workloads.

This guide covers the preventive measures that should be in place before deploying 32-process workloads, including resource reservation, automated monitoring, and configuration guardrails.

The key principle is over-provisioning shared resources. At 32-process parallelism, running close to resource limits invites sudden performance cliffs.

## Prerequisites

- Kubernetes cluster with Cilium v1.14+
- Prometheus and Grafana monitoring stack
- Understanding of your workload's parallelism requirements

## Resource Pre-Provisioning

Configure generous resource limits from the start:

```bash
helm install cilium cilium/cilium --namespace kube-system \
  --set bpf.ctGlobalTCPMax=1048576 \
  --set bpf.ctGlobalAnyMax=524288 \
  --set bpf.natMax=1048576 \
  --set bpf.mapDynamicSizeRatio=0.0025 \
  --set kubeProxyReplacement=true \
  --set loadBalancer.acceleration=native \
  --set tunnel=disabled \
  --set routingMode=native \
  --set autoDirectNodeRoutes=true \
  --set prometheus.enabled=true \
  --set hubble.enabled=true
```

## Automated Scaling Tests

```yaml
apiVersion: batch/v1
kind: CronJob
metadata:
  name: scaling-regression-test
  namespace: monitoring
spec:
  schedule: "0 4 * * *"
  jobTemplate:
    spec:
      template:
        spec:
          containers:
          - name: tester
            image: networkstatic/iperf3
            command:
            - /bin/sh
            - -c
            - |
              SERVER="iperf-server.monitoring"
              for P in 1 8 16 32; do
                BPS=$(iperf3 -c $SERVER -t 20 -P $P -J | jq '.end.sum_sent.bits_per_second')
                cat <<METRIC | curl --data-binary @- http://pushgateway.monitoring:9091/metrics/job/scaling_test
              cilium_scaling_throughput_bps{processes="$P"} $BPS
              METRIC
                sleep 5
              done
          restartPolicy: OnFailure
```

## Alerting for Resource Exhaustion

```yaml
apiVersion: monitoring.coreos.com/v1
kind: PrometheusRule
metadata:
  name: high-parallelism-alerts
  namespace: monitoring
spec:
  groups:
  - name: 32-process-perf
    rules:
    - alert: ConntrackTableNearFull
      expr: cilium_bpf_map_pressure{map_name=~".*ct.*"} > 0.75
      for: 5m
      labels:
        severity: warning
      annotations:
        summary: "Conntrack table above 75% capacity"
    - alert: ScalingEfficiencyDegraded
      expr: |
        cilium_scaling_throughput_bps{processes="32"}
        / cilium_scaling_throughput_bps{processes="1"} < 15
      for: 1h
      labels:
        severity: warning
      annotations:
        summary: "32-process scaling efficiency below 15x single-process"
```

## Node Configuration Guardrails

```yaml
apiVersion: apps/v1
kind: DaemonSet
metadata:
  name: node-config-guardrail
  namespace: kube-system
spec:
  selector:
    matchLabels:
      app: node-config-guardrail
  template:
    metadata:
      labels:
        app: node-config-guardrail
    spec:
      hostNetwork: true
      initContainers:
      - name: configure
        image: busybox:1.36
        securityContext:
          privileged: true
        command:
        - sh
        - -c
        - |
          # Ensure NIC queues match CPU count
          CPUS=$(nproc)
          ethtool -L eth0 combined $CPUS 2>/dev/null || true
          # Kernel tuning
          sysctl -w net.core.netdev_max_backlog=50000
          sysctl -w net.core.somaxconn=65535
          sysctl -w net.ipv4.ip_local_port_range="1024 65535"
          sysctl -w net.ipv4.tcp_congestion_control=bbr
      containers:
      - name: pause
        image: registry.k8s.io/pause:3.9
```

## Verification

```bash
# Verify CronJob is collecting metrics
kubectl get cronjobs -n monitoring
curl -s http://prometheus:9090/api/v1/query?query=cilium_scaling_throughput_bps

# Check node configuration
ssh node-1 "ethtool -l eth0; sysctl net.core.netdev_max_backlog"

# Verify alerting rules
kubectl get prometheusrules -n monitoring
```

## Troubleshooting

- **CronJob results inconsistent**: Cordon the test nodes to prevent scheduling during benchmarks.
- **Alerts too sensitive**: Adjust thresholds based on your hardware capabilities.
- **Node config DaemonSet permission denied**: Ensure PSP or Pod Security Admission allows privileged containers.
- **Scaling test shows regression**: Correlate with recent Cilium or kernel upgrades.

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

Preventing performance degradation for 32-process workloads requires generous resource pre-provisioning, daily automated scaling tests, alerting on resource exhaustion, and node configuration guardrails. At high parallelism, small configuration drifts cause large performance impacts, so continuous monitoring and automated remediation are essential. Build these preventive measures into your cluster from day one.
