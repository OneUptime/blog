# Preventing Required Software Issues in Cilium Performance

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Cilium, Kubernetes, Performance, Software, Automation

Description: Proactive measures to ensure all required software is correctly installed and maintained for Cilium performance testing.

---

## Introduction

Preventing software issues requires automated validation of dependencies, version pinning, and regular update management. When test nodes are provisioned, they should automatically have all required software installed and validated.

This guide covers the automation and tooling that ensures software dependencies are always met.

The preventive approach eliminates manual setup steps that are prone to inconsistency and omission.

## Prerequisites

- Kubernetes cluster (v1.24+) with Cilium v1.14+
- `cilium` CLI and `kubectl` access
- Node-level root access
- Prometheus monitoring (recommended)

## Automated Node Provisioning

```yaml
apiVersion: apps/v1
kind: DaemonSet
metadata:
  name: node-software-validator
  namespace: kube-system
spec:
  selector:
    matchLabels:
      app: node-software-validator
  template:
    metadata:
      labels:
        app: node-software-validator
    spec:
      hostNetwork: true
      hostPID: true
      initContainers:
      - name: validate
        image: busybox:1.36
        securityContext:
          privileged: true
        command:
        - sh
        - -c
        - |
          # Load required modules
          modprobe wireguard 2>/dev/null || echo "WARN: wireguard module not available"
          modprobe br_netfilter
          # Verify BPF filesystem
          mount | grep -q bpf || mount -t bpf bpf /sys/fs/bpf
          # Set required sysctl
          sysctl -w net.ipv4.ip_forward=1
          echo "Node software validation complete"
      containers:
      - name: pause
        image: registry.k8s.io/pause:3.9
```

## Version Pinning

```bash
# Pin container image versions in test deployments
# Good: specific version
image: networkstatic/iperf3:3.16
# Bad: latest tag
image: networkstatic/iperf3:latest
```

## Software Health Alerting

```yaml
apiVersion: monitoring.coreos.com/v1
kind: PrometheusRule
metadata:
  name: software-health
  namespace: monitoring
spec:
  groups:
  - name: node-software
    rules:
    - alert: KernelVersionMismatch
      expr: count(count by (kernel_version) (node_uname_info)) > 1
      for: 10m
      labels:
        severity: warning
      annotations:
        summary: "Nodes running different kernel versions"
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

Properly preventinging required software issues in cilium performance is essential for reliable Cilium performance testing. Each component plays a role in the accuracy and reproducibility of benchmark results.
