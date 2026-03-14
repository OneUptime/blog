# Preventing Native Routing Performance in Cilium

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Cilium, Kubernetes, Performance, Native Routing, BPF, BGP

Description: How to prevent native routing performance in Cilium, covering route configuration, BPF host routing, and BGP integration.

---

## Introduction

Native routing mode in Cilium eliminates tunnel encapsulation overhead by routing pod traffic directly through the underlying network. This provides the best possible throughput and latency, but requires proper route configuration between nodes.

Preventing native routing issues requires proper initial configuration, route health monitoring, and configuration drift detection.

This guide provides the specific steps and commands for native routing performance management.

## Prerequisites

- Kubernetes cluster (v1.24+) with Cilium v1.14+
- `cilium` CLI, `helm`, and `kubectl`
- `iperf3` and `netperf` for benchmarking
- Prometheus and Grafana for monitoring
- Node-level root access

## Standard Native Routing Configuration

```bash
# Always deploy with native routing from the start
helm install cilium cilium/cilium --namespace kube-system \
  --set tunnel=disabled \
  --set routingMode=native \
  --set autoDirectNodeRoutes=true \
  --set ipv4NativeRoutingCIDR="10.0.0.0/8" \
  --set bpf.hostLegacyRouting=false \
  --set bpf.masquerade=true \
  --set kubeProxyReplacement=true \
  --set prometheus.enabled=true
```

## Route Health Monitoring

```yaml
apiVersion: monitoring.coreos.com/v1
kind: PrometheusRule
metadata:
  name: routing-health
  namespace: monitoring
spec:
  groups:
  - name: native-routing
    rules:
    - alert: CiliumRoutesMissing
      expr: cilium_nodes_all_num - cilium_nodes_all_connected > 0
      for: 5m
      labels:
        severity: critical
      annotations:
        summary: "Not all Cilium nodes are connected via routes"
```

## Configuration Drift Prevention

```bash
# Validate routing config periodically
#!/bin/bash
TUNNEL=$(cilium config view | grep "^tunnel" | awk '{print $2}')
if [ "$TUNNEL" != "disabled" ]; then
  echo "ALERT: Tunnel mode is $TUNNEL, expected disabled"
fi
```

## Verification

```bash
cilium status --verbose | grep -E "DatapathMode|Host Routing|Routing"
ip route show | head -20
```

## Troubleshooting

- **Routes not appearing**: Check autoDirectNodeRoutes and ensure nodes are on the same L2 segment, or use BGP.
- **BPF host routing not activating**: Requires kubeProxyReplacement=true and compatible kernel (5.10+).
- **Asymmetric throughput**: Check for different NIC speeds or route path differences between nodes.
- **BGP peering not establishing**: Verify BGP ASN configuration and firewall rules for TCP port 179.

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

Native routing in Cilium provides the best possible network performance by eliminating tunnel overhead. Preventing native routing configuration ensures pods benefit from direct routing with BPF host routing acceleration, achieving 90%+ of bare-metal throughput.
