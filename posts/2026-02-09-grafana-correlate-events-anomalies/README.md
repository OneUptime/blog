# How to Build a Grafana Dashboard That Correlates Kubernetes Events with Metric Anomalies

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Grafana, Kubernetes, Monitoring

Description: Discover how to create a comprehensive Grafana dashboard that correlates Kubernetes events with metric anomalies to identify root causes faster and improve incident response in your cluster.

---

When investigating Kubernetes incidents, you often find yourself switching between multiple tools and dashboards. You check metrics in Grafana, then jump to kubectl to view events, then back to logs, creating a disjointed troubleshooting experience. Building a dashboard that correlates Kubernetes events with metric anomalies transforms this fragmented process into a unified investigation workflow.

This guide shows you how to build a Grafana dashboard that overlays Kubernetes events on metric graphs, helping you quickly identify whether a spike in CPU usage coincided with a pod restart, or if network latency increased when a deployment rolled out.

## Understanding the Data Sources

To correlate events with metrics, you need two data sources working together:

1. Prometheus (or compatible TSDB) for metrics
2. Kubernetes events exposed as metrics via kube-state-metrics or as annotations

The key insight is that Kubernetes events have timestamps, just like metrics. By normalizing both onto the same time axis, you can visualize correlations.

## Setting Up kube-state-metrics for Event Exposure

First, ensure kube-state-metrics exposes event information. Deploy or upgrade kube-state-metrics with event monitoring enabled:

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: kube-state-metrics
  namespace: monitoring
spec:
  replicas: 1
  selector:
    matchLabels:
      app: kube-state-metrics
  template:
    metadata:
      labels:
        app: kube-state-metrics
    spec:
      serviceAccountName: kube-state-metrics
      containers:
      - name: kube-state-metrics
        image: registry.k8s.io/kube-state-metrics/kube-state-metrics:v2.10.1
        args:
        - --resources=events  # Enable event metrics
        - --metric-labels-allowlist=events=[*]
        ports:
        - containerPort: 8080
          name: http-metrics
        - containerPort: 8081
          name: telemetry
---
apiVersion: v1
kind: ServiceAccount
metadata:
  name: kube-state-metrics
  namespace: monitoring
---
apiVersion: rbac.authorization.k8s.io/v1
kind: ClusterRole
metadata:
  name: kube-state-metrics
rules:
- apiGroups: [""]
  resources:
  - events
  verbs: ["list", "watch"]
---
apiVersion: rbac.authorization.k8s.io/v1
kind: ClusterRoleBinding
metadata:
  name: kube-state-metrics
roleRef:
  apiGroup: rbac.authorization.k8s.io
  kind: ClusterRole
  name: kube-state-metrics
subjects:
- kind: ServiceAccount
  name: kube-state-metrics
  namespace: monitoring
```

This configuration enables kube-state-metrics to track Kubernetes events and expose them as Prometheus metrics.

## Creating Event Annotation Queries

Grafana annotations overlay events on time-series graphs. Create annotation queries that pull Kubernetes events from Prometheus:

```json
{
  "annotations": {
    "list": [
      {
        "datasource": "Prometheus",
        "enable": true,
        "expr": "changes(kube_event_unique_events_total{reason!=\"\"}[1m]) > 0",
        "iconColor": "rgba(255, 96, 96, 1)",
        "name": "Kubernetes Events",
        "step": "60s",
        "tagKeys": "reason,type,involved_object_kind,involved_object_name",
        "textFormat": "{{reason}}: {{involved_object_kind}}/{{involved_object_name}}",
        "titleFormat": "K8s Event"
      }
    ]
  }
}
```

This annotation shows event markers on your graphs. When a pod crashes or a deployment scales, you'll see a marker at that exact timestamp.

## Building the Correlation Dashboard

Create a comprehensive dashboard that combines metrics with event context. Here's the dashboard JSON structure:

```json
{
  "dashboard": {
    "title": "Kubernetes Metrics and Events Correlation",
    "timezone": "browser",
    "panels": [
      {
        "type": "timeseries",
        "title": "Pod CPU Usage with Events",
        "targets": [
          {
            "expr": "rate(container_cpu_usage_seconds_total{namespace=\"$namespace\", pod=\"$pod\"}[5m])",
            "legendFormat": "{{container}}"
          }
        ],
        "fieldConfig": {
          "defaults": {
            "custom": {
              "drawStyle": "line",
              "lineInterpolation": "smooth"
            }
          }
        }
      }
    ]
  }
}
```

## Creating Event-Triggered Annotations

Use transformation queries to create annotations based on specific event patterns:

```promql
# Annotation for pod restarts
changes(kube_pod_container_status_restarts_total{namespace="$namespace", pod="$pod"}[5m]) > 0

# Annotation for OOMKilled events
kube_pod_container_status_last_terminated_reason{reason="OOMKilled"} == 1

# Annotation for failed scheduling events
kube_event_unique_events_total{reason="FailedScheduling"}

# Annotation for deployment rollouts
changes(kube_deployment_status_observed_generation{namespace="$namespace"}[1m]) > 0

# Annotation for node pressure events
kube_node_status_condition{condition=~"MemoryPressure|DiskPressure", status="true"} == 1
```

Each of these queries identifies specific events that often correlate with metric anomalies.

## Advanced Correlation Patterns

Create panels that explicitly highlight correlations using PromQL calculations:

```promql
# CPU spike correlation with pod events
(
  rate(container_cpu_usage_seconds_total[5m]) > 0.8
) and on(pod, namespace) (
  changes(kube_pod_status_phase[5m]) > 0
)

# Memory usage anomaly during event windows
(
  container_memory_working_set_bytes >
  avg_over_time(container_memory_working_set_bytes[1h] offset 1h) * 1.5
) and on(pod, namespace) (
  kube_event_count{type="Warning"} > 0
)

# Network errors correlated with service changes
(
  rate(node_network_receive_errs_total[5m]) > 0
) and on() (
  changes(kube_service_spec_external_ips[5m]) > 0
)
```

These queries explicitly find situations where metrics deviate from normal while events occur.

## Building a Multi-Panel Event Timeline

Create a dedicated event timeline panel that shows event density over time:

```json
{
  "type": "timeseries",
  "title": "Event Timeline",
  "targets": [
    {
      "expr": "sum(rate(kube_event_unique_events_total[5m])) by (reason)",
      "legendFormat": "{{reason}}"
    }
  ],
  "fieldConfig": {
    "defaults": {
      "custom": {
        "drawStyle": "bars",
        "barAlignment": 0,
        "fillOpacity": 80
      },
      "color": {
        "mode": "palette-classic"
      }
    },
    "overrides": [
      {
        "matcher": {
          "id": "byName",
          "options": "BackOff"
        },
        "properties": [
          {
            "id": "color",
            "value": {
              "fixedColor": "red"
            }
          }
        ]
      }
    ]
  }
}
```

This bar chart shows when event clusters occur, making it easy to spot correlation with metric spikes.

## Creating Event-Metric Correlation Tables

Add a table panel that shows recent events alongside current metric states:

```json
{
  "type": "table",
  "title": "Recent Events and Current Metrics",
  "targets": [
    {
      "expr": "topk(10, kube_event_unique_events_total)",
      "format": "table",
      "instant": true
    },
    {
      "expr": "container_memory_working_set_bytes{pod=\"$pod\"}",
      "format": "table",
      "instant": true
    }
  ],
  "transformations": [
    {
      "id": "merge",
      "options": {}
    },
    {
      "id": "organize",
      "options": {
        "excludeByName": {},
        "indexByName": {
          "reason": 0,
          "involved_object_name": 1,
          "Value": 2
        }
      }
    }
  ]
}
```

## Implementing Smart Event Filtering

Not all events are equally important. Filter events based on severity and relevance:

```promql
# Only show warning and error events
kube_event_unique_events_total{type=~"Warning|Error"}

# Filter out noisy events
kube_event_unique_events_total{reason!~"Pulling|Pulled|Created|Started"}

# Show only events for specific resources
kube_event_unique_events_total{involved_object_kind=~"Pod|Deployment|StatefulSet"}

# Time-windowed event filtering
kube_event_unique_events_total[5m]
  unless
kube_event_unique_events_total[5m] offset 10m
```

## Creating Anomaly Detection Overlays

Combine statistical anomaly detection with event correlation:

```promql
# Standard deviation based anomaly detection
(
  rate(container_cpu_usage_seconds_total[5m])
  >
  (
    avg_over_time(rate(container_cpu_usage_seconds_total[5m])[1h:5m])
    + 2 * stddev_over_time(rate(container_cpu_usage_seconds_total[5m])[1h:5m])
  )
)

# Overlay with events happening in same time window
* on(pod, namespace) group_left(reason)
(
  kube_event_unique_events_total > 0
)
```

This identifies metric values that deviate beyond two standard deviations while events are occurring.

## Building Alert Rules Based on Correlations

Create alerts that fire only when metrics AND events correlate:

```yaml
apiVersion: monitoring.coreos.com/v1
kind: PrometheusRule
metadata:
  name: correlated-alerts
  namespace: monitoring
spec:
  groups:
  - name: correlation
    rules:
    - alert: HighCPUWithPodEvents
      expr: |
        (
          rate(container_cpu_usage_seconds_total[5m]) > 0.9
        ) and on(pod, namespace) (
          changes(kube_event_unique_events_total{type="Warning"}[5m]) > 0
        )
      for: 5m
      annotations:
        summary: "High CPU usage correlates with pod events"
        description: "Pod {{$labels.pod}} has high CPU and recent warning events"
```

## Visualizing Deployment Impact

Track how deployments affect metrics:

```promql
# CPU change during deployment
rate(container_cpu_usage_seconds_total[5m])
  and on()
changes(kube_deployment_status_updated_replicas[5m]) > 0

# Memory usage before and after deployment
(
  avg_over_time(container_memory_working_set_bytes[10m])
  -
  avg_over_time(container_memory_working_set_bytes[10m] offset 15m)
) and on()
  changes(kube_deployment_metadata_generation[15m]) > 0
```

## Creating Dashboard Variables for Drill-Down

Set up variables that let users filter the correlation view:

```json
{
  "templating": {
    "list": [
      {
        "name": "namespace",
        "type": "query",
        "query": "label_values(kube_pod_info, namespace)",
        "refresh": 1
      },
      {
        "name": "pod",
        "type": "query",
        "query": "label_values(kube_pod_info{namespace=\"$namespace\"}, pod)",
        "refresh": 1
      },
      {
        "name": "event_reason",
        "type": "query",
        "query": "label_values(kube_event_unique_events_total, reason)",
        "multi": true,
        "includeAll": true
      }
    ]
  }
}
```

## Conclusion

Correlating Kubernetes events with metric anomalies transforms how you troubleshoot cluster issues. Instead of manually connecting dots across multiple tools, a well-designed Grafana dashboard surfaces these correlations automatically. You see exactly when a deployment triggered a CPU spike, when a pod restart aligned with memory pressure, or when network errors coincided with service changes.

Start with basic event annotations, then layer in more sophisticated correlation queries. Add filtering to reduce noise, and create alerts that fire only when meaningful correlations exist. This approach dramatically reduces mean time to resolution for Kubernetes incidents.
