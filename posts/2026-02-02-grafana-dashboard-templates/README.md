# How to Create Grafana Dashboard Templates

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Grafana, Dashboards, Monitoring, Observability, Visualization

Description: Learn how to create reusable Grafana dashboard templates with variables, dynamic queries, and JSON provisioning for consistent monitoring across environments.

---

> Dashboard templates save hours of repetitive work. Build once, deploy everywhere, and keep your monitoring consistent across dev, staging, and production.

Creating dashboards manually for each environment gets old fast. Templates let you parameterize everything, from data sources to label filters, so the same dashboard works everywhere.

---

## Overview

```mermaid
flowchart LR
    Template["Dashboard<br/>Template (JSON)"] --> Dev["Dev Grafana"]
    Template --> Staging["Staging Grafana"]
    Template --> Prod["Prod Grafana"]
    Variables["Variables"] --> Template
    DataSource["Data Source<br/>References"] --> Template
```

---

## Understanding Dashboard Variables

Variables are the foundation of dashboard templates. They let users filter data without editing queries directly.

### Variable Types

| Type | Use Case | Example |
|------|----------|---------|
| Query | Dynamic values from data source | List of pods from Prometheus |
| Custom | Static list of options | Environment names |
| Constant | Hidden fixed values | Refresh intervals |
| Data source | Switch between data sources | Prometheus instances |
| Interval | Time aggregation options | 1m, 5m, 15m |
| Text box | Free-form user input | Service name filter |

---

## Creating Variables

### Query Variable for Dynamic Values

This Prometheus query populates a dropdown with all Kubernetes namespaces:

```promql
# Variable query to get all namespaces
label_values(kube_pod_info, namespace)
```

In Grafana, configure the variable:

```json
{
  "name": "namespace",
  "type": "query",
  "datasource": {
    "type": "prometheus",
    "uid": "${DS_PROMETHEUS}"
  },
  "query": "label_values(kube_pod_info, namespace)",
  "refresh": 2,
  "sort": 1,
  "multi": true,
  "includeAll": true
}
```

### Chained Variables

Chain variables so selections cascade. When users pick a namespace, the pod dropdown updates automatically:

```promql
# First variable: namespace
label_values(kube_pod_info, namespace)

# Second variable: pod (filtered by selected namespace)
label_values(kube_pod_info{namespace="$namespace"}, pod)
```

### Custom Variable for Static Options

Define a custom variable for environments that don't change:

```json
{
  "name": "environment",
  "type": "custom",
  "options": [
    {"text": "Production", "value": "prod"},
    {"text": "Staging", "value": "staging"},
    {"text": "Development", "value": "dev"}
  ],
  "current": {
    "text": "Production",
    "value": "prod"
  }
}
```

---

## Data Source Variables

Data source variables let you switch the entire dashboard between different Prometheus or other data source instances.

### Configuring Data Source Variable

This JSON defines a data source variable that lists all Prometheus instances:

```json
{
  "name": "datasource",
  "type": "datasource",
  "query": "prometheus",
  "regex": "",
  "refresh": 1,
  "current": {
    "text": "default",
    "value": "default"
  }
}
```

### Using Data Source Variable in Panels

Reference the data source variable in panel configurations:

```json
{
  "datasource": {
    "type": "prometheus",
    "uid": "$datasource"
  },
  "targets": [
    {
      "expr": "up{namespace=\"$namespace\"}",
      "refId": "A"
    }
  ]
}
```

---

## Building a Complete Template

### Dashboard JSON Structure

A full dashboard template with variables, panels, and templating. This JSON defines a service monitoring dashboard:

```json
{
  "annotations": {
    "list": []
  },
  "editable": true,
  "fiscalYearStartMonth": 0,
  "graphTooltip": 0,
  "id": null,
  "links": [],
  "liveNow": false,
  "panels": [],
  "schemaVersion": 38,
  "style": "dark",
  "tags": ["kubernetes", "monitoring", "template"],
  "templating": {
    "list": [
      {
        "current": {},
        "datasource": {
          "type": "prometheus",
          "uid": "${DS_PROMETHEUS}"
        },
        "definition": "label_values(kube_pod_info, namespace)",
        "name": "namespace",
        "options": [],
        "query": {
          "query": "label_values(kube_pod_info, namespace)",
          "refId": "StandardVariableQuery"
        },
        "refresh": 2,
        "regex": "",
        "sort": 1,
        "type": "query"
      },
      {
        "current": {},
        "datasource": {
          "type": "prometheus",
          "uid": "${DS_PROMETHEUS}"
        },
        "definition": "label_values(kube_pod_info{namespace=\"$namespace\"}, pod)",
        "name": "pod",
        "options": [],
        "query": {
          "query": "label_values(kube_pod_info{namespace=\"$namespace\"}, pod)",
          "refId": "StandardVariableQuery"
        },
        "refresh": 2,
        "regex": "",
        "sort": 1,
        "type": "query"
      }
    ]
  },
  "time": {
    "from": "now-1h",
    "to": "now"
  },
  "title": "Service Monitoring Template",
  "uid": "service-monitoring-template",
  "version": 1
}
```

### Panel with Variable References

Add panels that use the template variables. This panel shows CPU usage filtered by the selected namespace and pod:

```json
{
  "type": "timeseries",
  "title": "CPU Usage - $pod",
  "gridPos": {
    "h": 8,
    "w": 12,
    "x": 0,
    "y": 0
  },
  "datasource": {
    "type": "prometheus",
    "uid": "${DS_PROMETHEUS}"
  },
  "targets": [
    {
      "expr": "rate(container_cpu_usage_seconds_total{namespace=\"$namespace\", pod=~\"$pod\"}[5m])",
      "legendFormat": "{{container}}",
      "refId": "A"
    }
  ],
  "options": {
    "tooltip": {
      "mode": "multi"
    },
    "legend": {
      "displayMode": "table",
      "placement": "bottom"
    }
  },
  "fieldConfig": {
    "defaults": {
      "unit": "percentunit",
      "custom": {
        "drawStyle": "line",
        "fillOpacity": 10
      }
    }
  }
}
```

---

## Provisioning Templates

### File-Based Provisioning

Store dashboard templates as JSON files and configure Grafana to load them automatically.

Create the provisioning configuration at `/etc/grafana/provisioning/dashboards/default.yaml`:

```yaml
# Grafana dashboard provisioning configuration
# Grafana watches this directory and auto-loads any JSON dashboards
apiVersion: 1

providers:
  - name: 'default'
    orgId: 1
    folder: 'Templates'
    folderUid: 'templates'
    type: file
    disableDeletion: false
    updateIntervalSeconds: 30
    allowUiUpdates: true
    options:
      path: /var/lib/grafana/dashboards
```

### Data Source Provisioning

Provision data sources alongside dashboards. Create `/etc/grafana/provisioning/datasources/default.yaml`:

```yaml
# Data source provisioning for template compatibility
# The UID must match ${DS_PROMETHEUS} references in dashboards
apiVersion: 1

datasources:
  - name: Prometheus
    type: prometheus
    access: proxy
    url: http://prometheus:9090
    uid: prometheus
    isDefault: true
    jsonData:
      httpMethod: POST
      timeInterval: "15s"
```

---

## Template Best Practices

### Using __data Input

The `__data` input lets panels reference other panels' data. Use it for linked visualizations:

```json
{
  "targets": [
    {
      "expr": "sum(rate(http_requests_total{namespace=\"$namespace\"}[5m])) by (status_code)",
      "refId": "A"
    }
  ],
  "transformations": [
    {
      "id": "filterByValue",
      "options": {
        "filters": [
          {
            "fieldName": "status_code",
            "config": {
              "id": "regex",
              "options": {
                "value": "5.."
              }
            }
          }
        ]
      }
    }
  ]
}
```

### Repeating Panels

Create panels that repeat for each variable value. This shows one panel per selected pod:

```json
{
  "type": "stat",
  "title": "Memory - $pod",
  "repeat": "pod",
  "repeatDirection": "h",
  "maxPerRow": 4,
  "gridPos": {
    "h": 4,
    "w": 6,
    "x": 0,
    "y": 0
  },
  "targets": [
    {
      "expr": "container_memory_working_set_bytes{namespace=\"$namespace\", pod=\"$pod\"}",
      "refId": "A"
    }
  ],
  "fieldConfig": {
    "defaults": {
      "unit": "bytes"
    }
  }
}
```

### Repeating Rows

Repeat entire rows for each namespace or service:

```json
{
  "type": "row",
  "title": "Namespace: $namespace",
  "repeat": "namespace",
  "collapsed": false,
  "panels": []
}
```

---

## Export and Import

### Exporting a Dashboard as Template

When exporting, enable "Export for sharing externally" to replace data source UIDs with variables:

```bash
# Using Grafana API to export dashboard
curl -s "http://admin:admin@localhost:3000/api/dashboards/uid/my-dashboard" \
  | jq '.dashboard | del(.id) | del(.uid)' \
  > dashboard-template.json
```

### Processing for Portability

This Python script processes an exported dashboard into a portable template:

```python
# process_template.py
# Converts Grafana dashboard export to a portable template
# Replaces hardcoded data source UIDs with variable references

import json
import sys
import re

def process_template(input_file, output_file):
    """Convert dashboard export to portable template"""

    with open(input_file, 'r') as f:
        dashboard = json.load(f)

    # Remove instance-specific fields that prevent importing
    if 'id' in dashboard:
        del dashboard['id']

    # Generate a new UID or set to null for auto-generation
    dashboard['uid'] = None

    # Replace hardcoded data source UIDs with variable reference
    # This makes the template work with any Prometheus instance
    dashboard_str = json.dumps(dashboard)
    dashboard_str = re.sub(
        r'"uid":\s*"[a-zA-Z0-9_-]+"',
        '"uid": "${DS_PROMETHEUS}"',
        dashboard_str
    )

    dashboard = json.loads(dashboard_str)

    # Add data source variable if not present
    has_ds_var = any(
        v.get('name') == 'DS_PROMETHEUS'
        for v in dashboard.get('templating', {}).get('list', [])
    )

    if not has_ds_var:
        ds_variable = {
            "name": "DS_PROMETHEUS",
            "type": "datasource",
            "query": "prometheus",
            "current": {},
            "hide": 0
        }
        if 'templating' not in dashboard:
            dashboard['templating'] = {'list': []}
        dashboard['templating']['list'].insert(0, ds_variable)

    with open(output_file, 'w') as f:
        json.dump(dashboard, f, indent=2)

    print(f"Template saved to {output_file}")

if __name__ == "__main__":
    if len(sys.argv) != 3:
        print("Usage: python process_template.py input.json output.json")
        sys.exit(1)

    process_template(sys.argv[1], sys.argv[2])
```

---

## Kubernetes ConfigMap Deployment

### Dashboard ConfigMap

Deploy dashboard templates as Kubernetes ConfigMaps for GitOps workflows:

```yaml
# dashboard-configmap.yaml
# Contains the dashboard JSON as a ConfigMap for Kubernetes deployment
apiVersion: v1
kind: ConfigMap
metadata:
  name: grafana-dashboard-service-monitoring
  namespace: monitoring
  labels:
    grafana_dashboard: "1"
data:
  service-monitoring.json: |
    {
      "title": "Service Monitoring",
      "uid": "service-monitoring",
      "templating": {
        "list": [
          {
            "name": "namespace",
            "type": "query",
            "query": "label_values(kube_pod_info, namespace)"
          }
        ]
      },
      "panels": [
        {
          "title": "Request Rate",
          "type": "timeseries",
          "targets": [
            {
              "expr": "sum(rate(http_requests_total{namespace=\"$namespace\"}[5m]))"
            }
          ]
        }
      ]
    }
```

### Grafana Sidecar Configuration

Configure the Grafana Helm chart to auto-load dashboards from ConfigMaps:

```yaml
# values.yaml for Grafana Helm chart
# Enables sidecar that watches for ConfigMaps with dashboard JSON
sidecar:
  dashboards:
    enabled: true
    label: grafana_dashboard
    labelValue: "1"
    folder: /tmp/dashboards
    searchNamespace: ALL
    provider:
      foldersFromFilesStructure: true

  datasources:
    enabled: true
    label: grafana_datasource
```

---

## Testing Templates

### Validate JSON Structure

Use this script to validate dashboard JSON before deployment:

```bash
#!/bin/bash
# validate-dashboard.sh
# Validates Grafana dashboard JSON structure

DASHBOARD_FILE=$1

if [ -z "$DASHBOARD_FILE" ]; then
    echo "Usage: ./validate-dashboard.sh dashboard.json"
    exit 1
fi

# Check JSON syntax
if ! jq empty "$DASHBOARD_FILE" 2>/dev/null; then
    echo "ERROR: Invalid JSON syntax"
    exit 1
fi

# Check required fields
TITLE=$(jq -r '.title' "$DASHBOARD_FILE")
if [ "$TITLE" == "null" ] || [ -z "$TITLE" ]; then
    echo "ERROR: Missing title field"
    exit 1
fi

# Check for panels
PANEL_COUNT=$(jq '.panels | length' "$DASHBOARD_FILE")
if [ "$PANEL_COUNT" -eq 0 ]; then
    echo "WARNING: Dashboard has no panels"
fi

# Check for variables
VAR_COUNT=$(jq '.templating.list | length' "$DASHBOARD_FILE" 2>/dev/null || echo 0)
echo "Variables defined: $VAR_COUNT"

# Check for hardcoded data source UIDs (should use variables)
HARDCODED=$(grep -c '"uid": "[a-zA-Z0-9]' "$DASHBOARD_FILE" || true)
if [ "$HARDCODED" -gt 0 ]; then
    echo "WARNING: Found $HARDCODED hardcoded data source UIDs"
    echo "Consider using \${DS_PROMETHEUS} variable reference"
fi

echo "Validation passed: $DASHBOARD_FILE"
```

### API-Based Template Testing

Test template deployment using the Grafana API:

```python
# test_template.py
# Tests dashboard template by deploying to Grafana and verifying

import requests
import json
import sys

def test_template(grafana_url, api_key, template_file):
    """Deploy and test a dashboard template"""

    headers = {
        "Authorization": f"Bearer {api_key}",
        "Content-Type": "application/json"
    }

    # Load template
    with open(template_file, 'r') as f:
        dashboard = json.load(f)

    # Create payload for dashboard import
    payload = {
        "dashboard": dashboard,
        "overwrite": True,
        "inputs": [
            {
                "name": "DS_PROMETHEUS",
                "type": "datasource",
                "pluginId": "prometheus",
                "value": "prometheus"
            }
        ],
        "folderId": 0
    }

    # Import dashboard
    response = requests.post(
        f"{grafana_url}/api/dashboards/import",
        headers=headers,
        json=payload
    )

    if response.status_code == 200:
        result = response.json()
        print(f"Dashboard imported successfully")
        print(f"URL: {grafana_url}{result['importedUrl']}")
        return True
    else:
        print(f"Import failed: {response.status_code}")
        print(response.text)
        return False

if __name__ == "__main__":
    if len(sys.argv) != 4:
        print("Usage: python test_template.py <grafana_url> <api_key> <template.json>")
        sys.exit(1)

    success = test_template(sys.argv[1], sys.argv[2], sys.argv[3])
    sys.exit(0 if success else 1)
```

---

## Common Patterns

### Service Overview Template

A reusable pattern for service health dashboards:

```mermaid
flowchart TB
    subgraph Row1["Service Health Row"]
        Stat1["Uptime<br/>Stat Panel"]
        Stat2["Error Rate<br/>Stat Panel"]
        Stat3["Latency P99<br/>Stat Panel"]
    end

    subgraph Row2["Traffic Row"]
        Graph1["Request Rate<br/>Time Series"]
        Graph2["Response Codes<br/>Time Series"]
    end

    subgraph Row3["Resources Row"]
        Graph3["CPU Usage<br/>Time Series"]
        Graph4["Memory Usage<br/>Time Series"]
    end
```

### Multi-Service Comparison

Template for comparing metrics across services:

```json
{
  "templating": {
    "list": [
      {
        "name": "service",
        "type": "query",
        "query": "label_values(up, job)",
        "multi": true,
        "includeAll": true
      }
    ]
  },
  "panels": [
    {
      "title": "Latency Comparison",
      "type": "timeseries",
      "targets": [
        {
          "expr": "histogram_quantile(0.99, sum(rate(http_request_duration_seconds_bucket{job=~\"$service\"}[5m])) by (le, job))",
          "legendFormat": "{{job}}"
        }
      ]
    }
  ]
}
```

---

## Troubleshooting

### Common Issues

| Issue | Cause | Solution |
|-------|-------|----------|
| Variables not populating | Data source not configured | Check DS_PROMETHEUS variable |
| Panels show "No Data" | Query uses wrong labels | Verify label names match your metrics |
| Import fails | Invalid JSON | Run through jq validation |
| Variables not cascading | Wrong variable reference | Use $variable not ${variable} in queries |

### Debug Queries

Test variable queries directly in Grafana's Explore view:

```promql
# Test namespace variable query
label_values(kube_pod_info, namespace)

# Test pod variable with namespace filter
label_values(kube_pod_info{namespace="default"}, pod)

# Verify metrics exist
count(up{namespace="default"})
```

---

## Summary

Dashboard templates turn one-time work into reusable assets. Key points:

- **Variables** make dashboards dynamic and environment-agnostic
- **Data source variables** allow switching between Prometheus instances
- **Provisioning** automates dashboard deployment
- **ConfigMaps** enable GitOps workflows for Kubernetes
- **Repeating panels** scale automatically with your infrastructure

Start with simple templates and add complexity as needed. A well-designed template saves hours across your team.

---

*Looking for a complete observability platform? [OneUptime](https://oneuptime.com) provides built-in dashboards, alerting, and monitoring with templates ready for your infrastructure.*
