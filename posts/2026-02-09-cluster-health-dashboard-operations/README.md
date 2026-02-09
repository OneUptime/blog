# How to Build a Kubernetes Cluster Health Dashboard for Production Operations Teams

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Kubernetes, Monitoring, Dashboards, Operations

Description: Build comprehensive cluster health dashboards that provide operations teams with real-time visibility into Kubernetes cluster status, resource utilization, and application health for effective production management.

---

Operations teams need immediate visibility into cluster health to respond effectively to issues. Scattered metrics across multiple systems force engineers to hunt for information during incidents. A centralized health dashboard consolidates critical metrics, providing at-a-glance cluster status and enabling rapid problem identification.

Effective dashboards balance comprehensiveness with clarity. Too few metrics leave blindspots while too many create information overload. The goal is surfacing the most actionable metrics that indicate cluster and application health, organized for quick comprehension during both normal operations and incidents.

This involves integrating data from Kubernetes APIs, metrics servers, Prometheus, and application instrumentation into unified views that highlight problems and guide investigation.

## Designing Dashboard Structure

Organize dashboards hierarchically from cluster overview to detailed component views.

Top-level dashboard shows overall health:
- Cluster node status
- Pod success rate
- Resource utilization trends
- Critical alert summary
- Application availability

Second-level dashboards drill into specific areas:
- Compute resources (nodes, pods, containers)
- Networking (services, ingress, network policies)
- Storage (persistent volumes, storage classes)
- Workloads (deployments, statefulsets, jobs)
- Security (RBAC, policies, compliance)

Third-level dashboards show individual component details with logs and events.

## Building the Cluster Overview Dashboard

Create a Grafana dashboard showing cluster-wide health:

```json
{
  "dashboard": {
    "title": "Kubernetes Cluster Health Overview",
    "panels": [
      {
        "title": "Cluster Status",
        "type": "stat",
        "targets": [{
          "expr": "count(kube_node_info)"
        }],
        "fieldConfig": {
          "overrides": [{
            "matcher": {"id": "byName", "options": "Total Nodes"},
            "properties": [{
              "id": "thresholds",
              "value": {
                "mode": "absolute",
                "steps": [
                  {"value": 0, "color": "red"},
                  {"value": 3, "color": "green"}
                ]
              }
            }]
          }]
        }
      },
      {
        "title": "Pod Status Distribution",
        "type": "piechart",
        "targets": [{
          "expr": "sum by (phase) (kube_pod_status_phase)"
        }]
      },
      {
        "title": "CPU Usage by Namespace",
        "type": "timeseries",
        "targets": [{
          "expr": "sum by (namespace) (rate(container_cpu_usage_seconds_total[5m]))"
        }]
      },
      {
        "title": "Memory Usage by Namespace",
        "type": "timeseries",
        "targets": [{
          "expr": "sum by (namespace) (container_memory_working_set_bytes)"
        }]
      }
    ]
  }
}
```

Deploy this dashboard using Grafana operator:

```yaml
apiVersion: grafana.integreatly.org/v1beta1
kind: GrafanaDashboard
metadata:
  name: cluster-health-overview
  namespace: monitoring
spec:
  instanceSelector:
    matchLabels:
      dashboards: "grafana"
  json: |
    {
      "title": "Cluster Health Overview",
      "panels": [...]
    }
```

## Node Health Monitoring Panel

Track node health metrics critical for cluster operation:

```promql
# Node availability
up{job="kubelet"}

# Node resource capacity
sum(kube_node_status_allocatable{resource="cpu"}) by (node)
sum(kube_node_status_allocatable{resource="memory"}) by (node)

# Node resource requests
sum(kube_pod_container_resource_requests{resource="cpu"}) by (node)
sum(kube_pod_container_resource_requests{resource="memory"}) by (node)

# Node conditions
kube_node_status_condition{condition="Ready",status="true"}
kube_node_status_condition{condition="DiskPressure",status="true"}
kube_node_status_condition{condition="MemoryPressure",status="true"}
```

Create a node health table:

```yaml
apiVersion: v1
kind: ConfigMap
metadata:
  name: node-health-dashboard
data:
  dashboard.json: |
    {
      "panels": [{
        "title": "Node Health Status",
        "type": "table",
        "targets": [{
          "expr": "kube_node_info",
          "format": "table",
          "instant": true
        }],
        "transformations": [{
          "id": "organize",
          "options": {
            "excludeByName": {},
            "indexByName": {
              "node": 0,
              "kernel_version": 1,
              "kubelet_version": 2,
              "os_image": 3
            }
          }
        }]
      }]
    }
```

## Application Health Metrics

Monitor application-specific health indicators:

```promql
# Application availability (HTTP health checks)
probe_success{job="kubernetes-services"}

# Request rate
sum(rate(http_requests_total[5m])) by (service)

# Error rate
sum(rate(http_requests_total{status=~"5.."}[5m])) by (service) /
sum(rate(http_requests_total[5m])) by (service)

# Request latency
histogram_quantile(0.99,
  sum(rate(http_request_duration_seconds_bucket[5m])) by (le, service)
)

# Pod restarts
rate(kube_pod_container_status_restarts_total[15m])
```

Create application health dashboard:

```yaml
apiVersion: v1
kind: ConfigMap
metadata:
  name: app-health-dashboard
data:
  dashboard.json: |
    {
      "title": "Application Health",
      "panels": [
        {
          "title": "Service Availability",
          "type": "stat",
          "targets": [{
            "expr": "avg(probe_success) * 100"
          }],
          "fieldConfig": {
            "defaults": {
              "unit": "percent",
              "thresholds": {
                "steps": [
                  {"value": 0, "color": "red"},
                  {"value": 99, "color": "yellow"},
                  {"value": 99.9, "color": "green"}
                ]
              }
            }
          }
        },
        {
          "title": "Request Rate",
          "type": "graph",
          "targets": [{
            "expr": "sum(rate(http_requests_total[5m])) by (service)"
          }]
        },
        {
          "title": "Error Rate",
          "type": "graph",
          "targets": [{
            "expr": "sum(rate(http_requests_total{status=~'5..'}[5m])) by (service)"
          }]
        }
      ]
    }
```

## Resource Utilization Dashboard

Track cluster resource consumption:

```promql
# CPU utilization
sum(rate(container_cpu_usage_seconds_total[5m])) /
sum(machine_cpu_cores) * 100

# Memory utilization
sum(container_memory_working_set_bytes) /
sum(machine_memory_bytes) * 100

# Disk usage
(1 - (node_filesystem_avail_bytes /
     node_filesystem_size_bytes)) * 100

# Network I/O
rate(container_network_receive_bytes_total[5m])
rate(container_network_transmit_bytes_total[5m])
```

## Alert Summary Panel

Display active alerts prominently:

```yaml
apiVersion: v1
kind: ConfigMap
metadata:
  name: alerts-dashboard
data:
  dashboard.json: |
    {
      "panels": [{
        "title": "Active Alerts",
        "type": "table",
        "targets": [{
          "expr": "ALERTS{alertstate='firing'}",
          "format": "table",
          "instant": true
        }],
        "transformations": [{
          "id": "organize",
          "options": {
            "excludeByName": {
              "Time": true,
              "job": true
            },
            "indexByName": {
              "severity": 0,
              "alertname": 1,
              "namespace": 2,
              "pod": 3
            }
          }
        }],
        "fieldConfig": {
          "overrides": [{
            "matcher": {"id": "byName", "options": "severity"},
            "properties": [{
              "id": "custom.cellOptions",
              "value": {
                "type": "color-background",
                "mode": "gradient"
              }
            }]
          }]
        }
      }]
    }
```

## Custom Application Metrics

Integrate application-specific metrics:

```go
package main

import (
    "github.com/prometheus/client_golang/prometheus"
    "github.com/prometheus/client_golang/prometheus/promhttp"
    "net/http"
)

var (
    ordersProcessed = prometheus.NewCounterVec(
        prometheus.CounterOpts{
            Name: "orders_processed_total",
            Help: "Total number of processed orders",
        },
        []string{"status"},
    )

    orderProcessingDuration = prometheus.NewHistogramVec(
        prometheus.HistogramOpts{
            Name:    "order_processing_duration_seconds",
            Help:    "Order processing duration in seconds",
            Buckets: prometheus.DefBuckets,
        },
        []string{"status"},
    )

    activeOrders = prometheus.NewGauge(
        prometheus.GaugeOpts{
            Name: "active_orders",
            Help: "Number of orders currently being processed",
        },
    )
)

func init() {
    prometheus.MustRegister(ordersProcessed)
    prometheus.MustRegister(orderProcessingDuration)
    prometheus.MustRegister(activeOrders)
}

func main() {
    http.Handle("/metrics", promhttp.Handler())
    http.ListenAndServe(":8080", nil)
}
```

## Deploying the Complete Dashboard Stack

Deploy Prometheus, Grafana, and dashboards together:

```yaml
apiVersion: v1
kind: Namespace
metadata:
  name: monitoring
---
apiVersion: apps/v1
kind: Deployment
metadata:
  name: grafana
  namespace: monitoring
spec:
  replicas: 1
  selector:
    matchLabels:
      app: grafana
  template:
    metadata:
      labels:
        app: grafana
    spec:
      containers:
      - name: grafana
        image: grafana/grafana:latest
        ports:
        - containerPort: 3000
        env:
        - name: GF_AUTH_ANONYMOUS_ENABLED
          value: "true"
        - name: GF_AUTH_ANONYMOUS_ORG_ROLE
          value: "Viewer"
        volumeMounts:
        - name: dashboards
          mountPath: /etc/grafana/provisioning/dashboards
      volumes:
      - name: dashboards
        configMap:
          name: grafana-dashboards
---
apiVersion: v1
kind: Service
metadata:
  name: grafana
  namespace: monitoring
spec:
  selector:
    app: grafana
  ports:
  - port: 80
    targetPort: 3000
  type: LoadBalancer
```

A well-designed cluster health dashboard transforms operations by providing immediate visibility into system status. By consolidating metrics from across the cluster into organized, actionable views, you enable teams to quickly identify issues, understand impact, and take corrective action. This visibility is essential for maintaining reliable production systems.
