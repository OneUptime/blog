# How to Configure FinOps Practices with Rancher - A Practical Guide

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Rancher, FinOps, Cost-Optimization, Kubernetes, Cloud-economics

Description: A guide to implementing FinOps practices in Rancher environments, covering cost visibility, optimization strategies, accountability frameworks, and continuous cost governance.

## Overview

FinOps (Financial Operations) is a practice that brings together technology, business, and finance teams to enable data-driven cloud spending decisions. For organizations running Rancher with multiple Kubernetes clusters, FinOps practices help align costs with business outcomes and prevent cloud waste. This guide covers implementing the core FinOps phases - Inform, Optimize, and Operate - in Rancher environments.

## FinOps Framework for Kubernetes

The FinOps Framework defines three phases:

1. **Inform**: Gain visibility into cloud spending and usage
2. **Optimize**: Identify and act on cost reduction opportunities
3. **Operate**: Build sustainable cost governance processes

## Phase 1: Inform - Cost Visibility

### Mandatory Resource Tagging Policy

Enforce cost allocation tags via Kubewarden:

```yaml
# Policy: Require cost allocation labels on all Deployments

apiVersion: policies.kubewarden.io/v1
kind: ClusterAdmissionPolicy
metadata:
  name: require-cost-labels
spec:
  module: registry://ghcr.io/kubewarden/policies/safe-labels:v1.0.2
  rules:
    - apiGroups: ["apps"]
      apiVersions: ["v1"]
      resources: ["deployments", "statefulsets", "daemonsets"]
      operations: ["CREATE", "UPDATE"]
  settings:
    mandatory_labels:
      - team           # Engineering team owner
      - cost-center    # Finance cost center
      - environment    # production, staging, dev
      - project        # Business project/product
```

### Real-Time Cost Dashboard

```bash
# Query OpenCost for current spending
curl -s "http://opencost.opencost.svc:9003/allocation/compute" \
  --get \
  --data-urlencode "window=today" \
  --data-urlencode "aggregate=label:cost-center" \
  | jq -r '
    [.data[0] | to_entries[] |
      {
        costCenter: .key,
        dailyCost: (.value.totalCost | round),
        monthlyProjected: ((.value.totalCost * 30) | round)
      }
    ]
    | sort_by(-.dailyCost)[]
    | "  \(.costCenter): $\(.dailyCost)/day, projected monthly: $\(.monthlyProjected)"
  '
```

### Cross-Cluster Cost Aggregation

```python
#!/usr/bin/env python3
# aggregate-cluster-costs.py - Aggregate costs across all Rancher clusters

import requests
from typing import Dict, List

OPENCOST_ENDPOINTS = {
    "prod-us-east": "http://prod-us-east-opencost.svc:9003",
    "prod-eu-west": "http://prod-eu-west-opencost.svc:9003",
    "staging": "http://staging-opencost.svc:9003"
}

def get_cluster_costs(cluster_name: str, endpoint: str) -> Dict:
    """Fetch costs from an OpenCost endpoint"""
    resp = requests.get(
        f"{endpoint}/allocation/compute",
        params={"window": "month", "aggregate": "label:team"},
        timeout=10,
    )
    resp.raise_for_status()
    data = resp.json().get('data', [{}])[0]
    return {
        "cluster": cluster_name,
        "teams": {
            team: round(info.get('totalCost', 0), 2)
            for team, info in data.items()
        }
    }

def aggregate_costs(all_costs: List[Dict]) -> Dict:
    """Aggregate costs across all clusters"""
    aggregated = {}
    for cluster_data in all_costs:
        for team, cost in cluster_data['teams'].items():
            aggregated[team] = aggregated.get(team, 0) + cost
    return aggregated

if __name__ == '__main__':
    all_costs = []
    for cluster, endpoint in OPENCOST_ENDPOINTS.items():
        try:
            costs = get_cluster_costs(cluster, endpoint)
            all_costs.append(costs)
        except Exception as e:
            print(f"Failed to get costs from {cluster}: {e}")

    aggregated = aggregate_costs(all_costs)
    print("\n=== Monthly Cost by Team (All Clusters) ===")
    for team, cost in sorted(aggregated.items(), key=lambda x: x[1], reverse=True):
        print(f"  {team}: ${cost:,.2f}")
    print(f"\n  TOTAL: ${sum(aggregated.values()):,.2f}")
```

## Phase 2: Optimize - Cost Reduction

### Identify and Right-Size Over-Provisioned Workloads

```bash
#!/bin/bash
# find-oversized-workloads.sh - Find pods with high CPU overprovisioning

cpu_to_millicores() {
  case "$1" in
    *m) echo "${1%m}" ;;
    "") echo 0 ;;
    *) awk -v cpu="$1" 'BEGIN { printf "%.0f\n", cpu * 1000 }' ;;
  esac
}

echo "Workloads with CPU utilization below 20% of requests:"
echo ""

# Use kubectl and metrics-server to find low-utilization pods
kubectl top pod -A --sort-by=cpu | while read -r namespace pod cpu memory; do
  # Skip header
  [ "$namespace" = "NAMESPACE" ] && continue

  # Sum CPU requests across all containers in the pod
  REQUESTS=$(kubectl get pod "$pod" -n "$namespace" \
    -o jsonpath='{range .spec.containers[*]}{.resources.requests.cpu}{"\n"}{end}' 2>/dev/null \
    | while read -r request; do cpu_to_millicores "$request"; done \
    | awk '{sum += $1} END {print sum + 0}')
  USAGE=$(cpu_to_millicores "$cpu")

  if [ "$REQUESTS" -gt 0 ] && [ $(( USAGE * 100 / REQUESTS )) -lt 20 ]; then
    echo "Pod: $namespace/$pod - Using: ${cpu}, Requested: ${REQUESTS}m"
  fi
done
```

### Implement Namespace Resource Quotas

Prevent over-provisioning with ResourceQuotas per team:

```yaml
# ResourceQuota for each team namespace
apiVersion: v1
kind: ResourceQuota
metadata:
  name: team-quota
  namespace: team-platform-eng
  annotations:
    cost-center: "CC-001"
    monthly-budget: "2000"   # USD annotation (informational)
spec:
  hard:
    # Compute
    requests.cpu: "20"
    limits.cpu: "40"
    requests.memory: "40Gi"
    limits.memory: "80Gi"
    # Storage
    persistentvolumeclaims: "20"
    requests.storage: "500Gi"
    # Object count
    pods: "100"
    services.loadbalancers: "5"
```

### Spot/Preemptible Node Scheduling

```yaml
# Schedule a batch workload onto GKE or AKS spot/preemptible nodes
apiVersion: apps/v1
kind: Deployment
metadata:
  name: batch-processor
  namespace: batch
spec:
  replicas: 1
  selector:
    matchLabels:
      app: batch-processor
  template:
    metadata:
      labels:
        app: batch-processor
    spec:
      tolerations:
        - key: "cloud.google.com/gke-spot"
          operator: Equal
          value: "true"
          effect: NoSchedule
        - key: "kubernetes.azure.com/scalesetpriority"
          value: spot
          operator: Equal
          effect: NoSchedule
      affinity:
        nodeAffinity:
          requiredDuringSchedulingIgnoredDuringExecution:
            nodeSelectorTerms:
              - matchExpressions:
                  - key: cloud.google.com/gke-spot
                    operator: In
                    values: ["true"]
              - matchExpressions:
                  - key: kubernetes.azure.com/scalesetpriority
                    operator: In
                    values: ["spot"]
      containers:
        - name: worker
          image: busybox:1.36
          command: ["sh", "-c", "while true; do echo processing; sleep 30; done"]
```

### Scale Down Non-Production Workloads at Night

```yaml
# CronJob: Scale down dev/staging workloads at 8 PM weekdays
apiVersion: batch/v1
kind: CronJob
metadata:
  name: dev-cluster-scale-down
  namespace: finops
spec:
  schedule: "0 20 * * 1-5"    # 8 PM Mon-Fri
  jobTemplate:
    spec:
      template:
        spec:
          serviceAccountName: namespace-scaler
          containers:
            - name: scaler
              image: registry.example.com/rancher-scaler:latest
              command:
                - /bin/sh
                - -c
                - |
                  # Scale all deployments in dev namespaces to 0
                  for ns in $(kubectl get ns -l environment=development -o name); do
                    kubectl scale deployments --all --replicas=0 -n "${ns#namespace/}"
                  done
          restartPolicy: OnFailure
```

## Phase 3: Operate - Cost Governance

### Monthly FinOps Review Process

```bash
#!/bin/bash
# finops-monthly-review.sh

MONTH=$(date -d "last month" +%Y-%m)
WINDOW="lastmonth"

echo "=========================================="
echo "FinOps Monthly Review: ${MONTH}"
echo "=========================================="

# 1. Generate team cost report
echo ""
echo "1. Cost by Team:"
curl -s "http://opencost.opencost.svc:9003/allocation/compute" \
  --get \
  --data-urlencode "window=${WINDOW}" \
  --data-urlencode "aggregate=label:team" \
  | jq -r '.data[0] | to_entries[] | "   \(.key): $\(.value.totalCost | round)"'

# 2. Compare to previous month (manual calculation in full implementation)
echo ""
echo "2. Month-over-month change: (see cost dashboard)"

# 3. List top 10 most expensive namespaces
echo ""
echo "3. Top 10 Most Expensive Namespaces:"
curl -s "http://opencost.opencost.svc:9003/allocation/compute" \
  --get \
  --data-urlencode "window=${WINDOW}" \
  --data-urlencode "aggregate=namespace" \
  | jq -r '[.data[0] | to_entries[] | {ns: .key, cost: .value.totalCost}] | sort_by(-.cost) | .[0:10][] | "   \(.ns): $\(.cost | round)"'
```

### Cost Anomaly Detection

```yaml
# Alert on unexpected cost increases
apiVersion: monitoring.coreos.com/v1
kind: PrometheusRule
metadata:
  name: cost-anomaly-alerts
  namespace: cattle-monitoring-system
spec:
  groups:
    - name: finops-anomaly
      rules:
        - alert: UnexpectedCostIncrease
          expr: |
            # Alert if current workload cost increases by more than 50% vs 1 hour ago
            (
              sum(
                (container_cpu_allocation * on (node) group_left() node_cpu_hourly_cost)
                +
                (
                  container_memory_allocation_bytes
                  * on (node) group_left() node_ram_hourly_cost
                  / (1024 * 1024 * 1024)
                )
              )
              /
              sum(
                (container_cpu_allocation offset 1h * on (node) group_left() node_cpu_hourly_cost offset 1h)
                +
                (
                  container_memory_allocation_bytes offset 1h
                  * on (node) group_left() node_ram_hourly_cost offset 1h
                  / (1024 * 1024 * 1024)
                )
              )
            ) > 1.5
          for: 30m
          labels:
            severity: warning
          annotations:
            summary: "Kubernetes cost increased by more than 50% in the last hour"
```

### FinOps KPI Dashboard

```yaml
# Grafana dashboard ConfigMap for FinOps KPIs
apiVersion: v1
kind: ConfigMap
metadata:
  name: finops-dashboard
  namespace: cattle-dashboards
  labels:
    grafana_dashboard: "1"
data:
  finops-kpis.json: |
    {
      "annotations": {
        "list": [
          {
            "builtIn": 1,
            "datasource": {
              "type": "grafana",
              "uid": "-- Grafana --"
            },
            "enable": true,
            "hide": true,
            "iconColor": "rgba(0, 211, 255, 1)",
            "name": "Annotations & Alerts",
            "type": "dashboard"
          }
        ]
      },
      "editable": true,
      "graphTooltip": 1,
      "id": null,
      "links": [],
      "panels": [
        {
          "datasource": null,
          "fieldConfig": {
            "defaults": {
              "color": {
                "mode": "thresholds"
              },
              "mappings": [],
              "thresholds": {
                "mode": "absolute",
                "steps": [
                  {
                    "color": "green",
                    "value": null
                  }
                ]
              },
              "unit": "currencyUSD"
            },
            "overrides": []
          },
          "gridPos": {
            "h": 8,
            "w": 6,
            "x": 0,
            "y": 0
          },
          "id": 1,
          "options": {
            "colorMode": "value",
            "graphMode": "area",
            "justifyMode": "auto",
            "orientation": "auto",
            "reduceOptions": {
              "calcs": [
                "lastNotNull"
              ],
              "fields": "",
              "values": false
            },
            "textMode": "auto"
          },
          "targets": [
            {
              "expr": "sum(node_total_hourly_cost) * 730",
              "legendFormat": "Monthly spend",
              "refId": "A"
            }
          ],
          "title": "Monthly Spend",
          "type": "stat"
        },
        {
          "datasource": null,
          "fieldConfig": {
            "defaults": {
              "color": {
                "mode": "palette-classic"
              },
              "mappings": [],
              "unit": "currencyUSD"
            },
            "overrides": []
          },
          "gridPos": {
            "h": 8,
            "w": 6,
            "x": 6,
            "y": 0
          },
          "id": 2,
          "options": {
            "displayLabels": [
              "name",
              "percent"
            ],
            "legend": {
              "displayMode": "list",
              "placement": "bottom",
              "showLegend": true
            },
            "pieType": "donut",
            "reduceOptions": {
              "calcs": [
                "lastNotNull"
              ],
              "fields": "",
              "values": false
            },
            "tooltip": {
              "mode": "single",
              "sort": "none"
            }
          },
          "targets": [
            {
              "expr": "sum by (namespace) ((container_cpu_allocation * on (node) group_left() node_cpu_hourly_cost) + ((container_memory_allocation_bytes * on (node) group_left() node_ram_hourly_cost) / (1024 * 1024 * 1024)))",
              "legendFormat": "{{namespace}}",
              "refId": "A"
            }
          ],
          "title": "Cost per Namespace",
          "type": "piechart"
        },
        {
          "datasource": null,
          "fieldConfig": {
            "defaults": {
              "color": {
                "mode": "thresholds"
              },
              "mappings": [],
              "max": 100,
              "min": 0,
              "thresholds": {
                "mode": "absolute",
                "steps": [
                  {
                    "color": "green",
                    "value": null
                  },
                  {
                    "color": "orange",
                    "value": 70
                  },
                  {
                    "color": "red",
                    "value": 90
                  }
                ]
              },
              "unit": "percent"
            },
            "overrides": []
          },
          "gridPos": {
            "h": 8,
            "w": 6,
            "x": 12,
            "y": 0
          },
          "id": 3,
          "options": {
            "minVizHeight": 75,
            "minVizWidth": 75,
            "orientation": "auto",
            "reduceOptions": {
              "calcs": [
                "lastNotNull"
              ],
              "fields": "",
              "values": false
            },
            "showThresholdLabels": false,
            "showThresholdMarkers": true
          },
          "targets": [
            {
              "expr": "(sum(rate(container_cpu_usage_seconds_total{container!=\"\",image!=\"\"}[5m])) / sum(kube_pod_resource_request{resource=\"cpu\",unit=\"cores\"})) * 100",
              "legendFormat": "CPU utilization vs requests",
              "refId": "A"
            }
          ],
          "title": "CPU Utilization vs Requests",
          "type": "gauge"
        },
        {
          "datasource": null,
          "fieldConfig": {
            "defaults": {
              "color": {
                "mode": "palette-classic"
              },
              "mappings": [],
              "unit": "currencyUSD"
            },
            "overrides": []
          },
          "gridPos": {
            "h": 8,
            "w": 24,
            "x": 0,
            "y": 8
          },
          "id": 4,
          "options": {
            "legend": {
              "displayMode": "list",
              "placement": "bottom",
              "showLegend": true
            },
            "tooltip": {
              "mode": "single",
              "sort": "none"
            }
          },
          "targets": [
            {
              "expr": "sum(node_total_hourly_cost) * 24",
              "legendFormat": "Daily infrastructure cost",
              "refId": "A"
            }
          ],
          "title": "Cost Trend (90 days)",
          "type": "timeseries"
        }
      ],
      "refresh": "5m",
      "schemaVersion": 39,
      "tags": [
        "finops",
        "opencost",
        "rancher"
      ],
      "templating": {
        "list": []
      },
      "time": {
        "from": "now-90d",
        "to": "now"
      },
      "timepicker": {
        "refresh_intervals": [
          "5m",
          "15m",
          "1h",
          "6h",
          "1d"
        ]
      },
      "timezone": "browser",
      "title": "FinOps KPIs Dashboard",
      "uid": "finops-kpis",
      "version": 1
    }
```

## FinOps Maturity Assessment

| Practice | Crawl | Walk | Run |
|---|---|---|---|
| Cost visibility | Basic Prometheus | OpenCost per cluster | Cross-cluster aggregation |
| Tagging | Some labels | Enforced via policy | Full allocation model |
| Budgets | No budgets | Manual alerts | Automated enforcement |
| Optimization | Ad-hoc | Monthly review | Continuous VPA + spot |
| Accountability | IT only | IT + Finance | Engineering + Finance + Product |

## Conclusion

FinOps in Rancher environments requires combining tooling (OpenCost, Kubecost), policies (mandatory labels, ResourceQuotas), and processes (monthly reviews, chargeback reports). The three phases - Inform, Optimize, and Operate - provide a roadmap from basic cost visibility to continuous cost optimization. Start with mandatory cost allocation labels enforced via Kubewarden, deploy OpenCost for visibility, and schedule regular FinOps review meetings with engineering and finance stakeholders. Cost optimization is an ongoing practice, not a one-time project.
