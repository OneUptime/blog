# Preventing Tunneling Performance Issues in Cilium

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Cilium, Kubernetes, Performance, Tunneling, VXLAN, GENEVE, Native Routing

Description: How to prevent tunneling-related performance issues in Cilium, covering VXLAN/Geneve overhead, MTU configuration, and native routing alternatives.

---

## Introduction

Tunneling (VXLAN or Geneve) in Cilium adds encapsulation overhead to every cross-node packet. This overhead includes additional headers (50-60 bytes), extra processing for encapsulation/decapsulation, and potential MTU-related fragmentation. Preventing these issues is critical for achieving optimal network performance.

The best prevention is starting with native routing mode from day one. When tunneling is required, proper MTU configuration and monitoring prevent the most common performance issues.

This guide provides the specific steps for each aspect of tunnel performance management.

## Prerequisites

- Kubernetes cluster (v1.24+) with Cilium v1.14+
- `cilium` CLI, `helm`, and `kubectl`
- `iperf3` and `netperf` for benchmarking
- Prometheus and Grafana for monitoring
- Node-level root access

## Default to Native Routing

```bash
# Start new clusters with native routing
helm install cilium cilium/cilium --namespace kube-system \
  --set tunnel=disabled \
  --set routingMode=native \
  --set autoDirectNodeRoutes=true \
  --set ipv4NativeRoutingCIDR="10.0.0.0/8" \
  --set bpf.hostLegacyRouting=false \
  --set kubeProxyReplacement=true
```

## Monitor Tunnel Overhead

```yaml
apiVersion: batch/v1
kind: CronJob
metadata:
  name: tunnel-overhead-check
  namespace: monitoring
spec:
  schedule: "0 3 * * *"
  jobTemplate:
    spec:
      template:
        spec:
          containers:
          - name: checker
            image: networkstatic/iperf3
            command:
            - /bin/sh
            - -c
            - |
              BPS=$(iperf3 -c iperf-server.monitoring -t 20 -P 1 -J | \
                jq '.end.sum_sent.bits_per_second')
              cat <<METRIC | curl --data-binary @- http://pushgateway.monitoring:9091/metrics/job/tunnel_check
              cilium_pod_throughput_bps $BPS
              METRIC
          restartPolicy: OnFailure
```

## Configuration Guardrails

```bash
# Alert if someone enables tunneling
kubectl get cm cilium-config -n kube-system -o yaml | grep tunnel
# Should show: tunnel: disabled
```

## Verification

```bash
cilium status --verbose | grep -E "Tunnel|DatapathMode"
kubectl exec iperf-client -- iperf3 -c $SERVER_IP -t 10 -P 1 -J | \
  jq '.end.sum_sent.bits_per_second / 1000000000'
```

## Troubleshooting

- **Cannot switch to native routing**: Cloud provider may require specific network configuration. Check provider documentation.
- **MTU too low causes poor performance**: Verify with ping -M do and adjust MTU in Cilium config.
- **Fragmentation despite correct MTU**: Check for nested encapsulation (tunnel inside tunnel).
- **Native routing breaks cross-node**: Ensure node routes are configured correctly.

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

Preventing tunneling performance in Cilium is essential for optimal cross-node communication. Native routing eliminates tunnel overhead entirely and should be the default choice when the network supports it. When tunneling is required, proper MTU configuration and BPF host routing minimize the performance impact.
