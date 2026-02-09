# How to Build Grafana Dashboard Templates with Repeating Panels for Kubernetes Namespaces

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Grafana, Kubernetes, Dashboards, Visualization, Templating

Description: Learn how to create Grafana dashboard templates with repeating panels that automatically generate visualizations for all Kubernetes namespaces dynamically.

---

Creating separate dashboard panels for each namespace becomes unmanageable as clusters grow. Grafana's repeating panels feature automatically generates panels based on variable values, letting one template scale to hundreds of namespaces.

This guide covers building dynamic dashboards that adapt to your cluster's namespaces automatically.

## Understanding Repeating Panels

Repeating panels use Grafana variables to dynamically create multiple instances of a panel. Each instance uses a different variable value, creating separate visualizations for each namespace, pod, or any other label.

A single panel template with `repeat: namespace` creates one panel per namespace automatically. When namespaces are added or removed, panels appear or disappear without manual dashboard editing.

## Creating Namespace Variables

Start by creating a variable that queries available namespaces from Prometheus.

In Grafana dashboard settings, add a variable:

```json
{
  "name": "namespace",
  "type": "query",
  "datasource": "Prometheus",
  "query": "label_values(kube_namespace_status_phase, namespace)",
  "refresh": 2,
  "multi": true,
  "includeAll": true,
  "allValue": ".*",
  "regex": "",
  "sort": 1
}
```

The `refresh: 2` setting updates the variable on dashboard load, ensuring new namespaces appear automatically. The `multi: true` and `includeAll` options let users filter by specific namespaces.

## Creating a Repeating Row

Rows can repeat to organize panels by namespace. Each repeated row contains the same panels but filtered to different namespaces.

```json
{
  "panels": [],
  "repeat": "namespace",
  "repeatDirection": "v",
  "title": "Namespace: $namespace",
  "type": "row"
}
```

The `repeatDirection: "v"` setting stacks rows vertically. Use `"h"` for horizontal repetition.

## Creating Repeating Panels

Within a row, create panels that repeat horizontally:

```json
{
  "title": "CPU Usage - $namespace",
  "type": "graph",
  "repeat": "namespace",
  "repeatDirection": "h",
  "maxPerRow": 4,
  "targets": [
    {
      "expr": "sum(rate(container_cpu_usage_seconds_total{namespace=\"$namespace\", container!=\"\"}[5m]))",
      "legendFormat": "CPU Usage"
    }
  ]
}
```

The `maxPerRow: 4` setting limits horizontal panels to 4 per row before wrapping to the next row.

## Building a Complete Namespace Dashboard

Here's a full dashboard JSON with repeating panels for namespace monitoring:

```json
{
  "dashboard": {
    "title": "Kubernetes Namespaces Overview",
    "templating": {
      "list": [
        {
          "name": "namespace",
          "type": "query",
          "datasource": "Prometheus",
          "query": "label_values(kube_namespace_status_phase{phase=\"Active\"}, namespace)",
          "refresh": 2,
          "multi": false,
          "includeAll": false,
          "sort": 1
        }
      ]
    },
    "panels": [
      {
        "type": "row",
        "title": "Namespace: $namespace",
        "repeat": "namespace",
        "panels": [
          {
            "title": "CPU Usage",
            "type": "graph",
            "gridPos": {"h": 8, "w": 12, "x": 0, "y": 0},
            "targets": [
              {
                "expr": "sum(rate(container_cpu_usage_seconds_total{namespace=\"$namespace\", container!=\"\"}[5m]))",
                "legendFormat": "CPU Cores"
              }
            ]
          },
          {
            "title": "Memory Usage",
            "type": "graph",
            "gridPos": {"h": 8, "w": 12, "x": 12, "y": 0},
            "targets": [
              {
                "expr": "sum(container_memory_working_set_bytes{namespace=\"$namespace\", container!=\"\"}) / 1024 / 1024 / 1024",
                "legendFormat": "Memory (GB)"
              }
            ]
          },
          {
            "title": "Network Traffic",
            "type": "graph",
            "gridPos": {"h": 8, "w": 12, "x": 0, "y": 8},
            "targets": [
              {
                "expr": "sum(rate(container_network_receive_bytes_total{namespace=\"$namespace\"}[5m])) / 1024 / 1024",
                "legendFormat": "Receive (MB/s)"
              },
              {
                "expr": "sum(rate(container_network_transmit_bytes_total{namespace=\"$namespace\"}[5m])) / 1024 / 1024",
                "legendFormat": "Transmit (MB/s)"
              }
            ]
          },
          {
            "title": "Pod Count",
            "type": "stat",
            "gridPos": {"h": 8, "w": 12, "x": 12, "y": 8},
            "targets": [
              {
                "expr": "count(kube_pod_info{namespace=\"$namespace\"})",
                "legendFormat": "Pods"
              }
            ]
          }
        ]
      }
    ]
  }
}
```

This creates a row for each namespace with CPU, memory, network, and pod count panels.

## Repeating Panels Horizontally

For compact dashboards, repeat panels horizontally in a single row:

```json
{
  "title": "CPU Usage per Namespace",
  "type": "graph",
  "repeat": "namespace",
  "repeatDirection": "h",
  "maxPerRow": 3,
  "gridPos": {"h": 8, "w": 8, "x": 0, "y": 0},
  "targets": [
    {
      "expr": "sum(rate(container_cpu_usage_seconds_total{namespace=\"$namespace\", container!=\"\"}[5m]))"
    }
  ]
}
```

This creates 3 CPU panels per row, one for each namespace.

## Using Multi-Select Variables

Allow users to select specific namespaces instead of all:

```json
{
  "name": "namespace",
  "type": "query",
  "datasource": "Prometheus",
  "query": "label_values(kube_namespace_status_phase, namespace)",
  "refresh": 2,
  "multi": true,
  "includeAll": true,
  "current": {
    "value": ["production", "staging"],
    "text": ["production", "staging"]
  }
}
```

The repeating panels will only generate for selected namespaces, reducing dashboard clutter.

## Chained Variables for Pod Filtering

Create hierarchical variables for namespace → deployment → pod filtering:

```json
{
  "templating": {
    "list": [
      {
        "name": "namespace",
        "query": "label_values(kube_pod_info, namespace)"
      },
      {
        "name": "deployment",
        "query": "label_values(kube_pod_info{namespace=\"$namespace\"}, pod)",
        "regex": "^(.*)-[a-z0-9]+-[a-z0-9]+$",
        "multi": false
      },
      {
        "name": "pod",
        "query": "label_values(kube_pod_info{namespace=\"$namespace\"}, pod)",
        "multi": true
      }
    ]
  }
}
```

Now panels can filter by namespace and drill down to specific deployments.

## Repeating by Custom Label

Repeat panels by any label, not just namespace:

```json
{
  "name": "cluster",
  "query": "label_values(up{job=\"kubernetes-nodes\"}, cluster)"
}
```

Then create panels that repeat per cluster:

```json
{
  "title": "Cluster $cluster Status",
  "repeat": "cluster",
  "targets": [
    {
      "expr": "count(kube_node_info{cluster=\"$cluster\"})"
    }
  ]
}
```

## Using Regex to Filter Variables

Filter variable values with regex to exclude unwanted namespaces:

```json
{
  "name": "namespace",
  "query": "label_values(kube_namespace_status_phase, namespace)",
  "regex": "^(?!kube-|default|monitoring).*"
}
```

This excludes system namespaces from repeating panels.

## Setting Panel Height and Width

Control repeated panel dimensions:

```json
{
  "repeat": "namespace",
  "repeatDirection": "h",
  "maxPerRow": 4,
  "gridPos": {
    "h": 8,
    "w": 6,
    "x": 0,
    "y": 0
  }
}
```

This creates panels 6 units wide and 8 units tall, fitting 4 per row (24 units total width).

## Repeating Stat Panels

Create compact stat panels for quick namespace overviews:

```json
{
  "type": "stat",
  "title": "$namespace Pods",
  "repeat": "namespace",
  "maxPerRow": 6,
  "gridPos": {"h": 4, "w": 4},
  "targets": [
    {
      "expr": "count(kube_pod_status_phase{namespace=\"$namespace\", phase=\"Running\"})"
    }
  ],
  "options": {
    "colorMode": "background",
    "graphMode": "none",
    "orientation": "auto"
  },
  "fieldConfig": {
    "defaults": {
      "thresholds": {
        "steps": [
          {"value": 0, "color": "red"},
          {"value": 1, "color": "green"}
        ]
      }
    }
  }
}
```

This shows running pod counts with color coding.

## Repeating Table Panels

Tables can show detailed per-namespace metrics:

```json
{
  "type": "table",
  "title": "Namespace Resources",
  "repeat": "namespace",
  "targets": [
    {
      "expr": "sum by (namespace) (rate(container_cpu_usage_seconds_total{namespace=\"$namespace\"}[5m]))",
      "format": "table",
      "instant": true
    },
    {
      "expr": "sum by (namespace) (container_memory_working_set_bytes{namespace=\"$namespace\"}) / 1024 / 1024 / 1024",
      "format": "table",
      "instant": true
    }
  ],
  "transformations": [
    {
      "id": "merge"
    }
  ]
}
```

## Provisioning Dashboards with Repeating Panels

Deploy dashboards as code using Grafana provisioning:

```yaml
apiVersion: v1
kind: ConfigMap
metadata:
  name: grafana-dashboards
  namespace: monitoring
data:
  namespace-overview.json: |
    {
      "dashboard": {
        "title": "Namespace Overview",
        "templating": {
          "list": [
            {
              "name": "namespace",
              "type": "query",
              "query": "label_values(kube_namespace_status_phase, namespace)",
              "multi": false
            }
          ]
        },
        "panels": [
          {
            "type": "row",
            "repeat": "namespace",
            "panels": [...]
          }
        ]
      }
    }
```

## Performance Considerations

Repeating panels can create many queries. Optimize with:

1. Use recording rules for complex queries
2. Limit maxPerRow to reasonable values (3-6)
3. Use caching for variable queries
4. Filter variables with regex to reduce panel count
5. Consider using single panels with `$namespace` variable instead of repeating

Example with variable instead of repeat:

```json
{
  "targets": [
    {
      "expr": "sum by (namespace) (rate(container_cpu_usage_seconds_total{namespace=~\"$namespace\", container!=\"\"}[5m]))",
      "legendFormat": "{{namespace}}"
    }
  ]
}
```

This shows all namespaces in one panel instead of repeating.

Repeating panels transform static dashboards into dynamic templates that scale automatically with your Kubernetes infrastructure.
