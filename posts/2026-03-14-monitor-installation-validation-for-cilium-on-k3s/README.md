# Monitoring Installation Validation for Cilium on K3s

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Cilium, Kubernetes, k3s, Monitoring

Description: Set up monitoring and alerting for Cilium installation health on K3s, including Prometheus metrics collection, Grafana dashboards, and automated health alerts.

---

## Introduction

Monitoring Cilium's installation health on K3s goes beyond checking if pods are running. Cilium exposes detailed metrics through Prometheus about agent health, eBPF program status, endpoint state, and policy enforcement that reveal issues before they cause connectivity failures.

A proper monitoring setup for Cilium on K3s collects metrics from both Cilium agents and the Hubble observability layer, creates dashboards that show networking health at a glance, and triggers alerts when components degrade.

This guide sets up comprehensive monitoring for your Cilium installation on K3s.

## Prerequisites

- A K3s cluster with Cilium installed
- Prometheus deployed (e.g., via kube-prometheus-stack Helm chart)
- Grafana for dashboards
- `kubectl` and Helm with cluster-admin access

## Enabling Cilium Prometheus Metrics

Configure Cilium to expose metrics for Prometheus scraping:

```bash
# Upgrade Cilium with metrics enabled

helm upgrade cilium cilium/cilium --version 1.16.5 \
  --namespace kube-system \
  --reuse-values \
  --set prometheus.enabled=true \
  --set operator.prometheus.enabled=true \
  --set hubble.enabled=true \
  --set hubble.metrics.enabled="{dns,drop,tcp,flow,port-distribution,icmp,httpV2}" \
  --set prometheus.serviceMonitor.enabled=true \
  --set prometheus.serviceMonitor.namespace=monitoring \
  --set prometheus.serviceMonitor.labels.release=kube-prometheus-stack \
  --set operator.prometheus.serviceMonitor.enabled=true \
  --set operator.prometheus.serviceMonitor.namespace=monitoring \
  --set operator.prometheus.serviceMonitor.labels.release=kube-prometheus-stack \
  --set hubble.metrics.serviceMonitor.enabled=true \
  --set hubble.metrics.serviceMonitor.labels.release=kube-prometheus-stack
```

These Helm values create ServiceMonitor resources for Prometheus Operator to discover Cilium and Hubble metrics. Verify they were created:

```bash
kubectl get servicemonitor -n monitoring cilium-agent cilium-operator hubble
```

## Configuring Prometheus Alerting Rules

Create alerts that detect Cilium installation health issues:

```yaml
# cilium-alerts.yaml
# Prometheus alerting rules for Cilium on K3s
apiVersion: monitoring.coreos.com/v1
kind: PrometheusRule
metadata:
  name: cilium-health-alerts
  namespace: monitoring
  labels:
    release: kube-prometheus-stack
spec:
  groups:
    - name: cilium.health
      rules:
        - alert: CiliumAgentNotRunning
          expr: |
            kube_daemonset_status_number_unavailable{daemonset="cilium"} > 0
          for: 5m
          labels:
            severity: critical
          annotations:
            summary: "Cilium agent pods unavailable"
            description: "{{ $value }} Cilium agent pods are not running."
        - alert: CiliumEndpointNotReady
          expr: |
            cilium_endpoint_state{endpoint_state="not-ready"} > 0
          for: 10m
          labels:
            severity: warning
          annotations:
            summary: "Cilium endpoints not ready on {{ $labels.instance }}"
            description: "{{ $value }} endpoints are in not-ready state."
        - alert: CiliumDropRateHigh
          expr: |
            rate(cilium_drop_count_total[5m]) > 100
          for: 5m
          labels:
            severity: warning
          annotations:
            summary: "High packet drop rate on {{ $labels.instance }}"
            description: "Cilium is dropping {{ $value }} packets/sec, reason: {{ $labels.reason }}."
```

```bash
kubectl apply -f cilium-alerts.yaml
```

## Building a Grafana Dashboard

Key metrics to display on your Cilium monitoring dashboard:

```bash
# PromQL queries for Grafana panels

# Panel: Cluster Health (Stat)
sum(cilium_unreachable_nodes) + sum(cilium_unreachable_health_endpoints)

# Panel: Endpoints by State (Pie Chart)
sum(cilium_endpoint_state) by (endpoint_state)

# Panel: Packet Drop Rate (Time Series)
rate(cilium_drop_count_total[5m])

# Panel: Policy Change Failures (Stat)
sum(rate(cilium_policy_change_total{outcome="failure"}[5m]))

# Panel: API Request Rate (Time Series)
rate(cilium_k8s_client_api_calls_total[5m])

# Panel: BPF Map Operations (Time Series)
rate(cilium_bpf_map_ops_total[5m])

# Panel: Hubble Flow Rate (Time Series)
rate(hubble_flows_processed_total[5m])
```

Import the official Cilium Grafana dashboards:

```bash
# The Cilium project provides pre-built dashboards
# Import dashboard IDs from Grafana.com:
# - Cilium Agent: 16611
# - Cilium Operator: 16612
# - Hubble: 16613

# Or download and import directly:
curl -sL https://raw.githubusercontent.com/cilium/cilium/main/install/kubernetes/cilium/files/cilium-agent/dashboards/cilium-dashboard.json \
  -o /tmp/cilium-dashboard.json
```

## Monitoring Hubble Flow Data

Set up Hubble flow monitoring for deeper observability:

```bash
# Verify Hubble is collecting flows
kubectl exec -n kube-system ds/cilium -- hubble observe --last 10

# Check Hubble metrics
kubectl -n kube-system port-forward svc/hubble-metrics 9965:9965 &
curl -s http://localhost:9965/metrics | grep "hubble_flows_processed_total"

# Monitor DNS traffic through Hubble
kubectl exec -n kube-system ds/cilium -- hubble observe --type l7 --protocol dns --last 20
```

## Verification

Confirm monitoring is collecting data:

```bash
# Check Prometheus is scraping Cilium metrics
curl -s http://localhost:9090/api/v1/targets | python3 -c "
import sys, json
for t in json.load(sys.stdin)['data']['activeTargets']:
    if 'cilium' in t.get('labels',{}).get('job',''):
        print(f'{t[\"labels\"][\"job\"]}: {t[\"health\"]}')
"

# Verify metrics are available
curl -s "http://localhost:9090/api/v1/query?query=cilium_unreachable_nodes" | python3 -c "
import sys, json
result = json.load(sys.stdin)['data']['result']
print(f'Cilium health metrics found: {len(result)} instances')
"

# Check alerting rules
curl -s http://localhost:9090/api/v1/rules | python3 -c "
import sys, json
for g in json.load(sys.stdin)['data']['groups']:
    for r in g['rules']:
        if 'cilium' in r['name'].lower():
            print(f'{r[\"name\"]}: {r[\"state\"]}')
"
```

## Troubleshooting

- **No Cilium metrics in Prometheus**: Verify `prometheus.enabled=true` is set in the Cilium Helm values. Check that the ServiceMonitor labels match your Prometheus operator's `serviceMonitorSelector`.
- **Hubble metrics missing**: Ensure Hubble is enabled and the metrics list in Helm values is not empty. Restart Hubble relay if needed.
- **Dashboard shows partial data**: Some metrics are only available when certain features are enabled. For example, L7 metrics require Hubble L7 protocol visibility to be configured.
- **Alerts not firing**: Verify the PrometheusRule labels match your Prometheus operator's `ruleSelector`. Test alert expressions directly in the Prometheus UI.

## Conclusion

Monitoring Cilium installation health on K3s requires enabling Prometheus metrics on both the Cilium agent and operator, collecting Hubble flow metrics for observability, setting up alerts for agent availability and packet drops, and building dashboards that provide at-a-glance health status. The combination of infrastructure-level monitoring and flow-level observability gives you complete visibility into your Cilium-based networking layer.
