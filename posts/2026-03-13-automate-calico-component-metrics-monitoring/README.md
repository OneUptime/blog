# How to Automate Calico Component Metrics Monitoring

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Calico, Kubernetes, Networking, Metrics, Prometheus, Automation, GitOps

Description: Automate the complete setup of Calico metrics collection, ServiceMonitor creation, alert rules deployment, and Grafana dashboard provisioning using GitOps.

---

## Introduction

Manually configuring Calico metrics monitoring for each new cluster is error-prone and creates inconsistency between environments. Automating the full observability stack - from FelixConfiguration changes to ServiceMonitor creation to Grafana dashboard provisioning - ensures every cluster has identical monitoring from day one.

The automation approach uses GitOps to manage all monitoring configuration as code, with Helm values overrides for cluster-specific settings like namespace and label selectors.

## Prerequisites

- Prometheus Operator (kube-prometheus-stack) installed
- Flux CD or ArgoCD for GitOps delivery
- Calico installed via Tigera Operator

## GitOps Repository Structure

```plaintext
observability/
├── calico/
│   ├── felixconfiguration-metrics.yaml
│   ├── kubecontrollers-metrics.yaml
│   ├── services/
│   │   ├── felix-metrics-svc.yaml
│   │   ├── typha-metrics-svc.yaml
│   │   └── kube-controllers-metrics-svc.yaml
│   ├── servicemonitors/
│   │   ├── felix-servicemonitor.yaml
│   │   ├── typha-servicemonitor.yaml
│   │   └── kube-controllers-servicemonitor.yaml
│   ├── prometheusrules/
│   │   └── calico-alerts.yaml
│   └── kustomization.yaml
```

## Kustomization for Calico Metrics

```yaml
# observability/calico/kustomization.yaml
apiVersion: kustomize.config.k8s.io/v1beta1
kind: Kustomization
resources:
  - felixconfiguration-metrics.yaml
  - kubecontrollers-metrics.yaml
  - services/felix-metrics-svc.yaml
  - services/typha-metrics-svc.yaml
  - services/kube-controllers-metrics-svc.yaml
  - servicemonitors/felix-servicemonitor.yaml
  - servicemonitors/typha-servicemonitor.yaml
  - servicemonitors/kube-controllers-servicemonitor.yaml
  - prometheusrules/calico-alerts.yaml
```

## Flux Kustomization for Delivery

```yaml
# flux/kustomizations/calico-observability.yaml
apiVersion: kustomize.toolkit.fluxcd.io/v1
kind: Kustomization
metadata:
  name: calico-observability
  namespace: flux-system
spec:
  interval: 5m
  path: ./observability/calico
  prune: true
  dependsOn:
    - name: calico-system          # Wait for Calico to be installed
    - name: monitoring-stack       # Wait for Prometheus to be installed
  sourceRef:
    kind: GitRepository
    name: cluster-config
  healthChecks:
    - apiVersion: monitoring.coreos.com/v1
      kind: ServiceMonitor
      name: calico-felix-metrics
      namespace: monitoring
```

## Automated Grafana Dashboard Provisioning

```yaml
# Grafana dashboard ConfigMap (auto-provisioned by Grafana sidecar)
apiVersion: v1
kind: ConfigMap
metadata:
  name: calico-metrics-dashboard
  namespace: monitoring
  labels:
    grafana_dashboard: "1"  # Grafana sidecar will auto-import this
data:
  calico-metrics.json: |
    {
      "title": "Calico Component Metrics",
      "uid": "calico-components",
      "panels": [
        {
          "title": "Felix Active Local Policies",
          "type": "stat",
          "targets": [{"expr": "sum(felix_active_local_policies)"}]
        },
        {
          "title": "Felix Policy Programming Latency (p99)",
          "type": "graph",
          "targets": [{
            "expr": "histogram_quantile(0.99, rate(felix_int_dataplane_apply_time_seconds_bucket[5m]))"
          }]
        },
        {
          "title": "Typha Connections",
          "type": "graph",
          "targets": [{"expr": "typha_connections_total"}]
        }
      ]
    }
```

## Automated Alert Rules

```yaml
# observability/calico/prometheusrules/calico-alerts.yaml
apiVersion: monitoring.coreos.com/v1
kind: PrometheusRule
metadata:
  name: calico-component-alerts
  namespace: monitoring
  labels:
    app: kube-prometheus-stack
spec:
  groups:
    - name: calico.felix
      rules:
        - alert: FelixHighPolicyProgrammingLatency
          expr: |
            histogram_quantile(0.99,
              rate(felix_int_dataplane_apply_time_seconds_bucket[5m])
            ) > 1
          for: 10m
          labels:
            severity: warning
          annotations:
            summary: "Felix policy programming latency >1s (p99)"

        - alert: FelixMetricsDown
          expr: up{job="calico-felix-metrics"} == 0
          for: 5m
          labels:
            severity: critical
          annotations:
            summary: "Felix metrics endpoint is down on {{ $labels.instance }}"
```

## Validation Script

```bash
#!/bin/bash
# validate-calico-metrics-setup.sh
echo "=== Calico Metrics Setup Validation ==="
FAILURES=0

for monitor in calico-felix-metrics calico-typha-metrics calico-kube-controllers-metrics; do
  if kubectl get servicemonitor "${monitor}" -n monitoring > /dev/null 2>&1; then
    echo "OK:   ServiceMonitor ${monitor} exists"
  else
    echo "FAIL: ServiceMonitor ${monitor} missing"
    FAILURES=$((FAILURES + 1))
  fi
done

# Check if Prometheus is actually scraping
FELIX_TARGETS=$(curl -s "http://localhost:9090/api/v1/targets" 2>/dev/null | \
  jq '[.data.activeTargets[] | select(.labels.job == "calico-felix-metrics")] | length')
echo "INFO: Felix targets in Prometheus: ${FELIX_TARGETS}"

echo ""
echo "Validation complete: ${FAILURES} failures"
```

## Conclusion

Automating Calico metrics monitoring through GitOps ensures consistent observability across all clusters without manual configuration steps. The GitOps approach manages FelixConfiguration, ServiceMonitors, Services, PrometheusRules, and Grafana dashboards as versioned code, making the monitoring stack reproducible and auditable. Combined with health checks in the Flux Kustomization, you get automatic validation that the monitoring components are deployed and healthy after each GitOps reconciliation.
