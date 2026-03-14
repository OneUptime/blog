# Monitoring Advantages of the Encapsulation Model in Cilium

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Cilium, Kubernetes, Networking, Monitoring

Description: Set up monitoring and alerting for the benefits of using Cilium encapsulation (overlay) mode including simplified deployment, any-network compatibility, and pod IP isolation to detect issues...

---

## Introduction

Monitoring advantages of the encapsulation model in cilium provides early warning when configuration drift, resource exhaustion, or component failures affect networking. The encapsulation model in Cilium provides several advantages: it works on any network infrastructure without special routing requirements, it isolates pod IPs from the underlying network so there are no IP conflicts, it simplifies multi-cloud and hybrid deployments, and it supports features like transparent encryption at the tunnel level. The overlay abstracts away network topology complexity.

Without monitoring, issues in this area may only surface when applications experience connectivity failures or performance degradation. Proactive monitoring with Prometheus metrics, Grafana dashboards, and alerting rules enables your team to respond before users are impacted.

This guide covers metrics collection, dashboard creation, and alert configuration for advantages of the encapsulation model in cilium.

## Prerequisites

- A Kubernetes cluster with Cilium installed
- Prometheus deployed (e.g., via kube-prometheus-stack)
- Grafana for dashboards
- `kubectl` with cluster-admin access
- The Cilium CLI installed

## Enabling Prometheus Metrics

Ensure Cilium exposes metrics for Prometheus:

```bash
# Verify metrics are enabled
cilium config view | grep prometheus

# If not enabled, upgrade Cilium with metrics
helm upgrade cilium cilium/cilium --version 1.16.5 \
  --namespace kube-system \
  --reuse-values \
  --set prometheus.enabled=true \
  --set operator.prometheus.enabled=true \
  --set hubble.metrics.enabled="{dns,drop,tcp,flow,icmp,http}"

# Verify metrics endpoint
kubectl exec -n kube-system ds/cilium -- wget -qO- http://localhost:9962/metrics | head -20
```

## Key Metrics for Advantages of the Encapsulation Model in Cilium

Monitor these Prometheus metrics:

```bash
# Primary metrics to track
# cilium_forward_count_total - core operational metric
kubectl exec -n kube-system ds/cilium -- cilium metrics list | grep "forward_count_total"

# PromQL queries for Grafana panels:

# Panel 1: Operational rate
rate(cilium_forward_count_total[5m])

# Panel 2: Error rate
rate(cilium_drop_count_total[5m])

# Panel 3: Agent health
cilium_agent_uptime_seconds

# Panel 4: Endpoint state
sum(cilium_endpoint_state) by (endpoint_state)

# Panel 5: Policy evaluation
rate(cilium_policy_l7_total[5m])
```

## Configuring Alerting Rules

Create Prometheus alerts for advantages of the encapsulation model in cilium:

```yaml
# cilium-feature-alerts.yaml
# Alerting rules for advantages of the encapsulation model in cilium
apiVersion: monitoring.coreos.com/v1
kind: PrometheusRule
metadata:
  name: cilium-feature-alerts
  namespace: monitoring
  labels:
    release: kube-prometheus-stack
spec:
  groups:
    - name: cilium.feature
      rules:
        - alert: CiliumAgentUnhealthy
          expr: |
            kube_daemonset_status_number_unavailable{daemonset="cilium"} > 0
          for: 5m
          labels:
            severity: critical
          annotations:
            summary: "Cilium agent pods unavailable"
            description: "{{ $value }} Cilium agent pods are not running, affecting advantages of the encapsulation model in cilium."
        - alert: CiliumHighDropRate
          expr: |
            rate(cilium_drop_count_total[5m]) > 50
          for: 10m
          labels:
            severity: warning
          annotations:
            summary: "High packet drop rate on {{ $labels.instance }}"
            description: "Cilium is dropping {{ $value }} packets/sec. Check advantages of the encapsulation model in cilium configuration."
        - alert: CiliumEndpointsNotReady
          expr: |
            cilium_endpoint_state{endpoint_state="not-ready"} > 0
          for: 10m
          labels:
            severity: warning
          annotations:
            summary: "Cilium endpoints not ready"
            description: "{{ $value }} endpoints are not ready on {{ $labels.instance }}."
```

```bash
kubectl apply -f cilium-feature-alerts.yaml
```

## Building a Monitoring Dashboard

Create a Grafana dashboard for advantages of the encapsulation model in cilium:

```bash
# Dashboard panels (PromQL):

# Row 1: Health Overview
# - Cilium Agent Status: sum(up{job="cilium-agent"})
# - Operator Status: sum(up{job="cilium-operator"})
# - Endpoint Count: sum(cilium_endpoint_state) by (endpoint_state)

# Row 2: Traffic Metrics
# - Forward Rate: rate(cilium_forward_count_total[5m])
# - Drop Rate: rate(cilium_drop_count_total[5m])
# - Drop Reasons: sum(rate(cilium_drop_count_total[5m])) by (reason)

# Row 3: Performance
# - BPF Map Operations: rate(cilium_bpf_map_ops_total[5m])
# - Conntrack Entries: cilium_datapath_conntrack_entries
# - API Call Rate: rate(cilium_k8s_client_api_calls_total[5m])
```

## Monitoring with Hubble

Use Hubble for real-time flow monitoring:

```bash
# Monitor flows in real time
kubectl exec -n kube-system ds/cilium -- hubble observe --last 20

# Monitor drops specifically
kubectl exec -n kube-system ds/cilium -- hubble observe --verdict DROPPED --last 10

# Monitor specific namespaces
kubectl exec -n kube-system ds/cilium -- hubble observe --namespace default --last 10
```

## Verification

Confirm monitoring is operational:

```bash
# Check Prometheus is scraping Cilium
curl -s http://localhost:9090/api/v1/targets 2>/dev/null | python3 -c "
import sys, json
try:
    for t in json.load(sys.stdin)['data']['activeTargets']:
        if 'cilium' in t.get('labels',{}).get('job',''):
            print(f'  {t["labels"]["job"]}: {t["health"]}')
except: print('  Port-forward Prometheus first')
"

# Verify alerts are loaded
kubectl get prometheusrules -n monitoring | grep cilium

# Check that metrics are being collected
kubectl exec -n kube-system ds/cilium -- cilium metrics list | wc -l
```

## Troubleshooting

- **No metrics in Prometheus**: Verify `prometheus.enabled=true` in Cilium Helm values. Check that the ServiceMonitor labels match your Prometheus operator configuration.
- **Dashboard shows No Data**: Confirm the Grafana data source points to the correct Prometheus instance. Test PromQL queries directly in the Prometheus expression browser.
- **Alerts not firing**: Check that PrometheusRule labels match the Prometheus operator's `ruleSelector`. Verify with `kubectl get prometheus -n monitoring -o yaml`.
- **Hubble shows no flows**: Ensure Hubble is enabled with `cilium config view | grep hubble`. Restart Hubble relay if needed.

## Conclusion

Monitoring advantages of the encapsulation model in cilium requires enabling Prometheus metrics on Cilium components, creating dashboards that show operational health and traffic metrics, configuring alerts for component failures and traffic anomalies, and using Hubble for real-time flow analysis. This multi-layer monitoring approach ensures issues are detected early and diagnosed quickly.
