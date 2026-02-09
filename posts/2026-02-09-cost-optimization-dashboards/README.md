# How to Build Cost Optimization Dashboards That Track Kubernetes Resource Efficiency Over Time

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Kubernetes, Cost Optimization, Grafana, Monitoring, Resource Management

Description: Build comprehensive cost optimization dashboards using Prometheus and Grafana to track Kubernetes resource efficiency trends, identify waste, and measure optimization efforts over time.

---

Understanding your Kubernetes costs is one thing. Tracking how efficiently you use those resources over time is another challenge entirely. A well-designed cost optimization dashboard transforms raw metrics into actionable insights, showing you where money is wasted and whether your optimization efforts actually work.

Resource efficiency dashboards go beyond simple cost tracking. They reveal utilization trends, highlight over-provisioned workloads, track optimization initiatives, and measure the impact of changes over weeks and months. These dashboards become your primary tool for driving continuous cost improvement.

## Key Metrics for Resource Efficiency Tracking

Effective cost optimization dashboards combine several metric categories. Resource utilization metrics show actual CPU and memory usage compared to requests and limits. Cost efficiency metrics calculate cost per request, cost per user, or cost per transaction. Waste metrics identify unused resources like empty persistent volumes or idle pods. Trend metrics track changes over time to measure optimization progress.

The goal is not just to know what you spend today, but to understand if you're getting better at managing costs month over month. Historical trending is critical for demonstrating the ROI of optimization work.

## Setting Up the Metrics Collection Stack

Start with Prometheus for metrics collection and Grafana for visualization. You'll need kube-state-metrics for Kubernetes resource information and node-exporter for node-level metrics.

```bash
# Install Prometheus stack using Helm
helm repo add prometheus-community https://prometheus-community.github.io/helm-charts
helm repo update

# Create custom values file for extended retention
cat > prometheus-values.yaml <<EOF
prometheus:
  prometheusSpec:
    retention: 90d
    storageSpec:
      volumeClaimTemplate:
        spec:
          accessModes: ["ReadWriteOnce"]
          resources:
            requests:
              storage: 100Gi

    # Enable recording rules for cost metrics
    additionalScrapeConfigs: []

grafana:
  adminPassword: "your-secure-password"
  persistence:
    enabled: true
    size: 10Gi

  dashboardProviders:
    dashboardproviders.yaml:
      apiVersion: 1
      providers:
      - name: 'cost-optimization'
        orgId: 1
        folder: 'Cost Optimization'
        type: file
        disableDeletion: false
        editable: true
        options:
          path: /var/lib/grafana/dashboards/cost-optimization

  dashboardsConfigMaps:
    cost-optimization: "cost-dashboards"

# Enable persistent storage for Prometheus
kubeStateMetrics:
  enabled: true

nodeExporter:
  enabled: true
EOF

# Install the stack
helm install prometheus prometheus-community/kube-prometheus-stack \
  --namespace monitoring \
  --create-namespace \
  --values prometheus-values.yaml
```

Wait for all components to be ready:

```bash
kubectl get pods -n monitoring
kubectl wait --for=condition=ready pod -l app.kubernetes.io/name=prometheus -n monitoring --timeout=300s
```

## Creating Recording Rules for Cost Efficiency Metrics

Recording rules precompute complex queries, making dashboard loading fast even with 90 days of data. Define rules that calculate efficiency metrics.

```yaml
# cost-efficiency-rules.yaml
apiVersion: monitoring.coreos.com/v1
kind: PrometheusRule
metadata:
  name: cost-efficiency-rules
  namespace: monitoring
spec:
  groups:
  - name: resource_efficiency
    interval: 5m
    rules:
    # CPU request utilization percentage
    - record: namespace:cpu_request_utilization:ratio
      expr: |
        sum by (namespace) (rate(container_cpu_usage_seconds_total{container!="",container!="POD"}[5m]))
        /
        sum by (namespace) (kube_pod_container_resource_requests{resource="cpu"})

    # Memory request utilization percentage
    - record: namespace:memory_request_utilization:ratio
      expr: |
        sum by (namespace) (container_memory_working_set_bytes{container!="",container!="POD"})
        /
        sum by (namespace) (kube_pod_container_resource_requests{resource="memory"})

    # CPU waste (requested but unused)
    - record: namespace:cpu_waste_cores:sum
      expr: |
        sum by (namespace) (kube_pod_container_resource_requests{resource="cpu"})
        -
        sum by (namespace) (rate(container_cpu_usage_seconds_total{container!="",container!="POD"}[5m]))

    # Memory waste (requested but unused)
    - record: namespace:memory_waste_bytes:sum
      expr: |
        sum by (namespace) (kube_pod_container_resource_requests{resource="memory"})
        -
        sum by (namespace) (container_memory_working_set_bytes{container!="",container!="POD"})

    # Pod count by namespace
    - record: namespace:pod_count:sum
      expr: sum by (namespace) (kube_pod_info)

    # Node resource utilization
    - record: node:cpu_utilization:ratio
      expr: |
        1 - avg by (node) (rate(node_cpu_seconds_total{mode="idle"}[5m]))

    - record: node:memory_utilization:ratio
      expr: |
        1 - (
          node_memory_MemAvailable_bytes
          /
          node_memory_MemTotal_bytes
        )

    # Over-provisioning factor (how much we request vs use)
    - record: namespace:cpu_overprovisioning:ratio
      expr: |
        sum by (namespace) (kube_pod_container_resource_requests{resource="cpu"})
        /
        sum by (namespace) (rate(container_cpu_usage_seconds_total{container!="",container!="POD"}[5m]))

    - record: namespace:memory_overprovisioning:ratio
      expr: |
        sum by (namespace) (kube_pod_container_resource_requests{resource="memory"})
        /
        sum by (namespace) (container_memory_working_set_bytes{container!="",container!="POD"})

  - name: cost_tracking
    interval: 1h
    rules:
    # Approximate cost per namespace based on resource requests
    # Adjust the multipliers based on your actual cloud costs
    - record: namespace:estimated_hourly_cost:dollars
      expr: |
        (
          sum by (namespace) (kube_pod_container_resource_requests{resource="cpu"}) * 0.04
          +
          sum by (namespace) (kube_pod_container_resource_requests{resource="memory"}) / 1024 / 1024 / 1024 * 0.005
        )

    # Daily cost projection
    - record: namespace:estimated_daily_cost:dollars
      expr: namespace:estimated_hourly_cost:dollars * 24

    # Monthly cost projection
    - record: namespace:estimated_monthly_cost:dollars
      expr: namespace:estimated_hourly_cost:dollars * 24 * 30

    # Cost per pod
    - record: namespace:cost_per_pod:dollars
      expr: |
        namespace:estimated_hourly_cost:dollars
        /
        namespace:pod_count:sum
```

Apply the recording rules:

```bash
kubectl apply -f cost-efficiency-rules.yaml

# Verify rules are loaded
kubectl port-forward -n monitoring svc/prometheus-operated 9090:9090

# Open http://localhost:9090/rules and verify your rules appear
```

## Building the Resource Efficiency Overview Dashboard

Create a comprehensive Grafana dashboard that shows key efficiency metrics. This JSON configuration defines the dashboard structure.

```json
{
  "dashboard": {
    "title": "Kubernetes Resource Efficiency Overview",
    "tags": ["cost", "efficiency", "optimization"],
    "timezone": "browser",
    "schemaVersion": 16,
    "version": 1,
    "refresh": "5m",
    "time": {
      "from": "now-30d",
      "to": "now"
    },
    "panels": [
      {
        "title": "Total Monthly Cost Trend",
        "type": "graph",
        "gridPos": {"h": 8, "w": 12, "x": 0, "y": 0},
        "targets": [
          {
            "expr": "sum(namespace:estimated_monthly_cost:dollars)",
            "legendFormat": "Total Monthly Cost",
            "refId": "A"
          }
        ],
        "yaxes": [
          {
            "format": "currencyUSD",
            "label": "Cost"
          }
        ]
      },
      {
        "title": "Average CPU Request Utilization",
        "type": "graph",
        "gridPos": {"h": 8, "w": 12, "x": 12, "y": 0},
        "targets": [
          {
            "expr": "avg(namespace:cpu_request_utilization:ratio) * 100",
            "legendFormat": "Cluster Average",
            "refId": "A"
          }
        ],
        "yaxes": [
          {
            "format": "percent",
            "label": "Utilization",
            "min": 0,
            "max": 100
          }
        ],
        "alert": {
          "conditions": [
            {
              "evaluator": {"params": [30], "type": "lt"},
              "operator": {"type": "and"},
              "query": {"params": ["A", "5m", "now"]},
              "reducer": {"type": "avg"},
              "type": "query"
            }
          ],
          "name": "Low CPU Utilization Alert"
        }
      },
      {
        "title": "Average Memory Request Utilization",
        "type": "graph",
        "gridPos": {"h": 8, "w": 12, "x": 0, "y": 8},
        "targets": [
          {
            "expr": "avg(namespace:memory_request_utilization:ratio) * 100",
            "legendFormat": "Cluster Average",
            "refId": "A"
          }
        ],
        "yaxes": [
          {
            "format": "percent",
            "label": "Utilization",
            "min": 0,
            "max": 100
          }
        ]
      },
      {
        "title": "CPU Waste by Namespace (Top 10)",
        "type": "bargauge",
        "gridPos": {"h": 8, "w": 12, "x": 12, "y": 8},
        "targets": [
          {
            "expr": "topk(10, namespace:cpu_waste_cores:sum)",
            "legendFormat": "{{ namespace }}",
            "refId": "A",
            "instant": true
          }
        ],
        "options": {
          "orientation": "horizontal",
          "displayMode": "gradient"
        },
        "fieldConfig": {
          "defaults": {
            "unit": "cores",
            "thresholds": {
              "mode": "absolute",
              "steps": [
                {"value": 0, "color": "green"},
                {"value": 2, "color": "yellow"},
                {"value": 5, "color": "red"}
              ]
            }
          }
        }
      },
      {
        "title": "Cost Per Namespace (Monthly)",
        "type": "table",
        "gridPos": {"h": 10, "w": 24, "x": 0, "y": 16},
        "targets": [
          {
            "expr": "sort_desc(namespace:estimated_monthly_cost:dollars)",
            "legendFormat": "",
            "refId": "A",
            "instant": true,
            "format": "table"
          }
        ],
        "transformations": [
          {
            "id": "organize",
            "options": {
              "excludeByName": {"Time": true},
              "renameByName": {
                "namespace": "Namespace",
                "Value": "Monthly Cost ($)"
              }
            }
          }
        ]
      }
    ]
  }
}
```

Save this as a ConfigMap and load it into Grafana:

```bash
# Create the dashboard ConfigMap
cat > cost-dashboard-configmap.yaml <<EOF
apiVersion: v1
kind: ConfigMap
metadata:
  name: cost-dashboards
  namespace: monitoring
data:
  efficiency-overview.json: |
$(cat dashboard.json | sed 's/^/    /')
EOF

kubectl apply -f cost-dashboard-configmap.yaml

# Restart Grafana to load the dashboard
kubectl rollout restart deployment/prometheus-grafana -n monitoring
```

Access Grafana and navigate to the Cost Optimization folder:

```bash
kubectl port-forward -n monitoring svc/prometheus-grafana 3000:80

# Open http://localhost:3000
# Login with admin/your-secure-password
# Navigate to Dashboards -> Cost Optimization
```

## Creating a Trend Analysis Dashboard

Build a second dashboard focused on tracking efficiency improvements over time. This helps demonstrate the ROI of optimization efforts.

```yaml
# Create Prometheus queries that compare current metrics to historical baselines
# Example query for month-over-month cost reduction
(
  avg_over_time(sum(namespace:estimated_monthly_cost:dollars)[30d:1d] offset 30d)
  -
  avg_over_time(sum(namespace:estimated_monthly_cost:dollars)[30d:1d])
)
/
avg_over_time(sum(namespace:estimated_monthly_cost:dollars)[30d:1d] offset 30d)
* 100

# Example query for utilization improvement trend
# Calculate 7-day average utilization for each week over 90 days
avg_over_time(
  avg(namespace:cpu_request_utilization:ratio)[7d]
) by (namespace)
```

Create panels that show these trends visually:

```bash
# Panel 1: Month-over-month cost savings percentage
# Panel 2: Rolling 7-day average CPU utilization
# Panel 3: Week-over-week reduction in CPU waste
# Panel 4: Historical optimization initiative annotations
```

Add annotations to mark optimization initiatives:

```bash
# Create annotations in Grafana for major changes
# Examples: "Implemented VPA", "Right-sized production", "Moved to Spot"
# This helps correlate efficiency changes with specific actions
```

## Automating Cost Optimization Reports

Generate weekly reports automatically using Grafana's reporting feature or custom scripts.

```bash
# Install Grafana image renderer for PDF reports
helm upgrade prometheus prometheus-community/kube-prometheus-stack \
  --namespace monitoring \
  --reuse-values \
  --set grafana.imageRenderer.enabled=true

# Configure report generation via API
curl -X POST \
  http://admin:password@localhost:3000/api/reports \
  -H 'Content-Type: application/json' \
  -d '{
    "name": "Weekly Cost Efficiency Report",
    "dashboard": {
      "uid": "cost-efficiency-dashboard-uid"
    },
    "schedule": {
      "frequency": "weekly",
      "day": "monday",
      "hour": 9
    },
    "emails": ["team@company.com"],
    "message": "Weekly Kubernetes cost efficiency metrics"
  }'
```

Alternatively, create a custom script that queries Prometheus and sends summaries:

```python
#!/usr/bin/env python3
# weekly-cost-report.py

import requests
from datetime import datetime, timedelta

PROMETHEUS_URL = "http://prometheus-server.monitoring.svc:9090"

def query_prometheus(query):
    response = requests.get(f"{PROMETHEUS_URL}/api/v1/query", params={"query": query})
    return response.json()["data"]["result"]

def generate_report():
    # Current monthly cost
    current_cost = query_prometheus("sum(namespace:estimated_monthly_cost:dollars)")

    # Average CPU utilization
    cpu_util = query_prometheus("avg(namespace:cpu_request_utilization:ratio) * 100")

    # Total CPU waste
    cpu_waste = query_prometheus("sum(namespace:cpu_waste_cores:sum)")

    print("=== Kubernetes Cost Efficiency Report ===")
    print(f"Date: {datetime.now().strftime('%Y-%m-%d')}")
    print(f"\nProjected Monthly Cost: ${float(current_cost[0]['value'][1]):.2f}")
    print(f"Average CPU Utilization: {float(cpu_util[0]['value'][1]):.1f}%")
    print(f"Total CPU Waste: {float(cpu_waste[0]['value'][1]):.1f} cores")

if __name__ == "__main__":
    generate_report()
```

Run this script weekly via a CronJob:

```yaml
# cost-report-cronjob.yaml
apiVersion: batch/v1
kind: CronJob
metadata:
  name: weekly-cost-report
  namespace: monitoring
spec:
  schedule: "0 9 * * 1"  # Every Monday at 9 AM
  jobTemplate:
    spec:
      template:
        spec:
          containers:
          - name: report-generator
            image: python:3.11-slim
            command: ["/scripts/weekly-cost-report.py"]
            volumeMounts:
            - name: scripts
              mountPath: /scripts
          volumes:
          - name: scripts
            configMap:
              name: cost-report-script
              defaultMode: 0755
          restartPolicy: OnFailure
```

## Tracking Optimization Initiative Impact

Create dashboard variables to filter by time ranges around specific optimization initiatives. This lets you measure before-and-after impact.

```bash
# Add dashboard variables in Grafana
# Variable: $optimization_date (date picker)
# Variable: $comparison_window (days before/after)

# Queries that compare periods
(
  avg_over_time(metric[$comparison_window] @ $optimization_date)
  -
  avg_over_time(metric[$comparison_window] @ ($optimization_date - $comparison_window))
)
```

Document each optimization initiative with expected impact and actual measured results. This builds a library of proven optimization strategies.

Cost optimization dashboards transform abstract metrics into concrete business value. By tracking efficiency trends over time, you demonstrate the ROI of optimization work, identify the highest-impact opportunities, and build a culture of continuous cost improvement. Start simple with basic utilization tracking and expand to more sophisticated analyses as you gain experience.
