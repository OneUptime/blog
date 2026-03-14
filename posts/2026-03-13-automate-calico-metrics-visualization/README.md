# How to Automate Calico Metrics Visualization

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Calico, Kubernetes, Networking, Metrics, Grafana, Automation

Description: Automate Calico Grafana dashboard provisioning using ConfigMaps, Grafana Operator, and GitOps to ensure consistent visualization across all clusters.

---

## Introduction

Manually importing Grafana dashboards for each cluster is unsustainable at scale. Automating dashboard provisioning ensures every cluster has identical visualization from day one, dashboard changes are version-controlled, and new clusters automatically get the latest dashboards without manual import.

## GitOps Dashboard Provisioning

```yaml
# grafana-dashboards-calico.yaml
# Grafana sidecar automatically imports ConfigMaps with grafana_dashboard label
apiVersion: v1
kind: ConfigMap
metadata:
  name: calico-overview-dashboard
  namespace: monitoring
  labels:
    grafana_dashboard: "1"
    grafana_folder: "Calico"
data:
  calico-overview.json: |
    {
      "title": "Calico - Overview",
      "uid": "calico-overview-auto",
      "templating": {
        "list": [
          {
            "name": "node",
            "type": "query",
            "datasource": "Prometheus",
            "query": "label_values(kube_node_info, node)"
          }
        ]
      },
      "panels": [
        {
          "title": "Felix Policies by Node",
          "type": "bargauge",
          "targets": [{"expr": "felix_active_local_policies"}]
        }
      ]
    }
```

## Flux Kustomization for Dashboards

```yaml
# flux/kustomizations/calico-dashboards.yaml
apiVersion: kustomize.toolkit.fluxcd.io/v1
kind: Kustomization
metadata:
  name: calico-grafana-dashboards
  namespace: flux-system
spec:
  interval: 5m
  path: ./observability/grafana-dashboards/calico
  prune: true
  dependsOn:
    - name: grafana
  sourceRef:
    kind: GitRepository
    name: cluster-config
```

## Automated Dashboard Testing

```bash
#!/bin/bash
# test-grafana-dashboards.sh
GRAFANA_URL="${1:-http://grafana.monitoring.svc:3000}"
GRAFANA_TOKEN="${2}"

echo "=== Testing Calico Dashboards ==="

# List all Calico dashboards
dashboards=$(curl -s "${GRAFANA_URL}/api/search?query=calico" \
  -H "Authorization: Bearer ${GRAFANA_TOKEN}" | \
  jq -r '.[] | .uid + " " + .title')

echo "${dashboards}" | while read uid title; do
  # Check dashboard is accessible
  status=$(curl -s -o /dev/null -w "%{http_code}" \
    "${GRAFANA_URL}/api/dashboards/uid/${uid}" \
    -H "Authorization: Bearer ${GRAFANA_TOKEN}")

  if [[ "${status}" == "200" ]]; then
    echo "OK:   ${title} (${uid})"
  else
    echo "FAIL: ${title} (${uid}) - HTTP ${status}"
  fi
done
```

## Grafana as Code with Grafonnet

```jsonnet
// calico-felix-dashboard.jsonnet
local grafana = import 'grafonnet/grafana.libsonnet';
local dashboard = grafana.dashboard;
local stat = grafana.stat;
local timeseries = grafana.timeseries;

dashboard.new(
  'Calico Felix Performance',
  uid='calico-felix-perf',
  time_from='now-1h',
  tags=['calico', 'networking'],
)
.addPanel(
  stat.new(
    'Active Local Policies',
    datasource='Prometheus',
  ).addTarget(
    grafana.prometheus.target('sum(felix_active_local_policies)')
  ),
  gridPos={x: 0, y: 0, w: 6, h: 4}
)
.addPanel(
  timeseries.new(
    'Felix Dataplane Programming Latency p99',
  ).addTarget(
    grafana.prometheus.target(
      'histogram_quantile(0.99, rate(felix_int_dataplane_apply_time_seconds_bucket[5m]))',
      legendFormat='{{node}}'
    )
  ),
  gridPos={x: 0, y: 4, w: 24, h: 8}
)
```

## Conclusion

Automating Calico metrics visualization through GitOps-managed ConfigMaps, Grafana sidecar auto-import, and dashboard testing scripts ensures consistent observability across all clusters. Version-controlling dashboards as code means every change is reviewed, tested, and rolled out consistently. Use Grafonnet for complex dashboards that need programmatic generation, and stick with ConfigMap-based JSON for simpler dashboards. The automated testing script confirms dashboards are accessible after each deployment, catching configuration errors before they affect on-call engineers.
