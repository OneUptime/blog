# Preventing Connection Rate (TCP_CRR) Degradation in Cilium

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Cilium, Kubernetes, Networking, Performance, TCP_CRR, Monitoring

Description: Proactive measures to prevent TCP connection rate degradation in Cilium clusters, including conntrack monitoring, capacity alerts, and connection pattern analysis.

---

## Introduction

TCP_CRR performance can degrade gradually as clusters grow and connection patterns change. New services increase conntrack table utilization, additional network policies add evaluation overhead, and growing traffic patterns can exhaust NAT port ranges. Without proactive monitoring, these issues only surface when applications start timing out on connection establishment.

This guide covers the preventive measures that maintain high TCP_CRR performance over time, including automated benchmarking, resource monitoring, and capacity planning for connection-rate-sensitive workloads.

The critical insight is that conntrack table utilization is the leading indicator of TCP_CRR degradation. Monitor it continuously.

## Prerequisites

- Kubernetes cluster with Cilium v1.14+
- Prometheus and Grafana monitoring
- Baseline TCP_CRR measurements established

## Continuous Connection Rate Monitoring

```yaml
apiVersion: batch/v1
kind: CronJob
metadata:
  name: tcp-crr-monitor
  namespace: monitoring
spec:
  schedule: "*/15 * * * *"
  jobTemplate:
    spec:
      template:
        spec:
          containers:
          - name: monitor
            image: cilium/netperf
            command:
            - /bin/sh
            - -c
            - |
              CRR=$(netperf -H netperf-server.monitoring -t TCP_CRR -l 10 2>/dev/null | tail -1 | awk '{print $1}')
              cat <<METRIC | curl --data-binary @- http://pushgateway.monitoring:9091/metrics/job/tcp_crr
              cilium_tcp_crr_rate $CRR
              METRIC
          restartPolicy: OnFailure
```

## Conntrack Table Monitoring

```yaml
apiVersion: monitoring.coreos.com/v1
kind: PrometheusRule
metadata:
  name: conntrack-alerts
  namespace: monitoring
spec:
  groups:
  - name: conntrack-capacity
    rules:
    - alert: ConntrackTableAbove75Percent
      expr: cilium_bpf_map_pressure{map_name=~".*ct_tcp.*"} > 0.75
      for: 10m
      labels:
        severity: warning
      annotations:
        summary: "TCP conntrack table above 75% on {{ $labels.instance }}"
    - alert: TCPCRRRegression
      expr: |
        cilium_tcp_crr_rate < 0.8 * avg_over_time(cilium_tcp_crr_rate[7d])
      for: 30m
      labels:
        severity: warning
      annotations:
        summary: "TCP_CRR dropped 20% below weekly average"
    - alert: NATTableAbove75Percent
      expr: cilium_bpf_map_pressure{map_name=~".*nat.*"} > 0.75
      for: 10m
      labels:
        severity: warning
      annotations:
        summary: "NAT table above 75% on {{ $labels.instance }}"
```

## Policy Change Impact Testing

```bash
#!/bin/bash
# test-policy-crr-impact.sh

BEFORE=$(kubectl exec netperf-client -- \
  netperf -H netperf-server.monitoring -t TCP_CRR -l 10 2>/dev/null | tail -1 | awk '{print $1}')

kubectl apply -f new-policy.yaml
sleep 15

AFTER=$(kubectl exec netperf-client -- \
  netperf -H netperf-server.monitoring -t TCP_CRR -l 10 2>/dev/null | tail -1 | awk '{print $1}')

IMPACT=$(echo "scale=2; ($AFTER - $BEFORE) / $BEFORE * 100" | bc)
echo "Connection rate impact: ${IMPACT}%"

if (( $(echo "$IMPACT < -10" | bc -l) )); then
  echo "WARNING: Policy caused >10% connection rate regression"
fi
```

## Connection Pattern Analysis

Monitor connection creation patterns to predict capacity needs:

```bash
# Track new connection rate from Hubble
hubble observe --protocol TCP --last 5000 -o json | \
  jq 'select(.l4.TCP.flags.SYN == true and .l4.TCP.flags.ACK == false) | .time' | \
  sort | uniq -c
```

## Verification

```bash
# Verify monitoring is active
kubectl get cronjobs -n monitoring | grep crr

# Check Prometheus metrics
curl -s "http://prometheus:9090/api/v1/query?query=cilium_tcp_crr_rate"

# Verify alerts are loaded
kubectl get prometheusrules -n monitoring

# Check conntrack utilization trend
curl -s "http://prometheus:9090/api/v1/query?query=cilium_bpf_map_pressure"
```

## Troubleshooting

- **CRR monitor showing zero**: Check netperf server is running and reachable.
- **Conntrack alerts firing frequently**: Increase table sizes or reduce timeouts.
- **Policy impact test unreliable**: Run multiple iterations and average results.
- **NAT table pressure increasing**: Check for port leaks from long-lived connections.

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

## Conclusion

Preventing TCP_CRR degradation requires continuous monitoring of both the connection rate itself and the underlying resources that support it. Conntrack table utilization is the most important leading indicator, followed by NAT table pressure and policy complexity. By monitoring these proactively and testing the impact of every policy change, you can maintain high connection rates as your cluster evolves.
