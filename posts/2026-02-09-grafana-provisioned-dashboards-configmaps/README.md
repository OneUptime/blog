# How to Deploy Grafana with Pre-Provisioned Dashboards Using ConfigMaps

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Grafana, Kubernetes, ConfigMap, Dashboards, Monitoring

Description: Learn how to automatically provision Grafana dashboards using Kubernetes ConfigMaps for consistent, version-controlled dashboard deployments.

---

Manually importing Grafana dashboards is tedious and error-prone. Dashboard provisioning automates this process by loading dashboards from files during Grafana startup. In Kubernetes, ConfigMaps provide an elegant solution for storing and deploying dashboard JSON definitions alongside Grafana. This approach enables version control, automated deployments, and consistent dashboard configurations across environments.

## Understanding Grafana Provisioning

Grafana supports provisioning dashboards, datasources, and other resources through configuration files. When Grafana starts, it loads these configurations automatically. The provisioning system watches for changes and can update resources without restart (depending on configuration).

For dashboards, provisioning works through:
1. A provisioning configuration file that tells Grafana where to find dashboards
2. Dashboard JSON files that define the actual dashboards
3. Kubernetes ConfigMaps to store both configuration and dashboard files

## Basic Dashboard Provisioning

Create a ConfigMap with the provisioning configuration:

```yaml
# grafana-dashboard-provider.yaml
apiVersion: v1
kind: ConfigMap
metadata:
  name: grafana-dashboard-provider
  namespace: monitoring
  labels:
    grafana_dashboard: "1"
data:
  provider.yaml: |
    apiVersion: 1
    providers:
      - name: 'default'
        orgId: 1
        folder: ''
        type: file
        disableDeletion: false
        editable: true
        options:
          path: /var/lib/grafana/dashboards/default
```

Create a ConfigMap with a dashboard:

```yaml
# grafana-dashboard-example.yaml
apiVersion: v1
kind: ConfigMap
metadata:
  name: grafana-dashboard-cluster-overview
  namespace: monitoring
  labels:
    grafana_dashboard: "1"
data:
  cluster-overview.json: |
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
      "panels": [
        {
          "datasource": {
            "type": "prometheus",
            "uid": "prometheus"
          },
          "fieldConfig": {
            "defaults": {
              "color": {
                "mode": "palette-classic"
              },
              "custom": {
                "axisLabel": "",
                "axisPlacement": "auto",
                "barAlignment": 0,
                "drawStyle": "line",
                "fillOpacity": 10,
                "gradientMode": "none",
                "hideFrom": {
                  "tooltip": false,
                  "viz": false,
                  "legend": false
                },
                "lineInterpolation": "linear",
                "lineWidth": 1,
                "pointSize": 5,
                "scaleDistribution": {
                  "type": "linear"
                },
                "showPoints": "never",
                "spanNulls": false,
                "stacking": {
                  "group": "A",
                  "mode": "none"
                },
                "thresholdsStyle": {
                  "mode": "off"
                }
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
              "unit": "short"
            },
            "overrides": []
          },
          "gridPos": {
            "h": 8,
            "w": 12,
            "x": 0,
            "y": 0
          },
          "id": 1,
          "options": {
            "legend": {
              "calcs": [],
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
              "datasource": {
                "type": "prometheus",
                "uid": "prometheus"
              },
              "expr": "sum(rate(container_cpu_usage_seconds_total{container!=\"\"}[5m])) by (namespace)",
              "refId": "A"
            }
          ],
          "title": "CPU Usage by Namespace",
          "type": "timeseries"
        }
      ],
      "refresh": "10s",
      "schemaVersion": 38,
      "style": "dark",
      "tags": ["kubernetes", "cluster"],
      "templating": {
        "list": []
      },
      "time": {
        "from": "now-6h",
        "to": "now"
      },
      "timepicker": {},
      "timezone": "",
      "title": "Cluster Overview",
      "uid": "cluster-overview",
      "version": 1,
      "weekStart": ""
    }
```

Configure Grafana to load dashboards from ConfigMaps:

```yaml
# grafana-values.yaml
grafana:
  enabled: true

  # Mount dashboard provider config
  dashboardProviders:
    dashboardproviders.yaml:
      apiVersion: 1
      providers:
        - name: 'default'
          orgId: 1
          folder: ''
          type: file
          disableDeletion: false
          editable: true
          options:
            path: /var/lib/grafana/dashboards/default

  # Mount dashboards from ConfigMaps
  dashboards:
    default:
      cluster-overview:
        file: dashboards/cluster-overview.json

  # Sidecar to automatically discover dashboards
  sidecar:
    dashboards:
      enabled: true
      label: grafana_dashboard
      folder: /tmp/dashboards
      provider:
        foldersFromFilesStructure: true
```

Deploy Grafana with kube-prometheus-stack:

```bash
helm install prometheus-stack prometheus-community/kube-prometheus-stack \
  --namespace monitoring \
  --values grafana-values.yaml
```

## Using Grafana Sidecar for Automatic Discovery

The Grafana sidecar watches for ConfigMaps with a specific label and automatically loads them:

```yaml
# grafana with sidecar configuration
grafana:
  enabled: true

  sidecar:
    dashboards:
      enabled: true
      # Watch for ConfigMaps with this label
      label: grafana_dashboard
      # Optional: watch specific label value
      labelValue: "1"
      # Folder where dashboards are stored
      folder: /tmp/dashboards
      # Enable folder creation from ConfigMap structure
      provider:
        foldersFromFilesStructure: true
      # Watch all namespaces or specific ones
      searchNamespace: ALL
      # Enable to allow dashboard deletion when ConfigMap is removed
      enableDeletion: true
```

Create multiple dashboards:

```bash
# Create dashboard ConfigMaps
kubectl create configmap grafana-dashboard-pods \
  --from-file=pods.json=./dashboards/pods.json \
  -n monitoring

# Add the required label
kubectl label configmap grafana-dashboard-pods grafana_dashboard=1 -n monitoring
```

The sidecar automatically discovers and loads any ConfigMap with the `grafana_dashboard=1` label.

## Organizing Dashboards in Folders

Create dashboards in different folders:

```yaml
# grafana-dashboard-app-monitoring.yaml
apiVersion: v1
kind: ConfigMap
metadata:
  name: grafana-dashboard-app-monitoring
  namespace: monitoring
  labels:
    grafana_dashboard: "1"
  annotations:
    # Specify folder using annotation
    grafana_folder: "Application Monitoring"
data:
  app-metrics.json: |
    {
      "title": "Application Metrics",
      "uid": "app-metrics",
      "version": 1,
      "panels": [...]
    }
```

Configure folder provisioning:

```yaml
grafana:
  sidecar:
    dashboards:
      enabled: true
      label: grafana_dashboard
      folderAnnotation: grafana_folder
      provider:
        foldersFromFilesStructure: true
```

## Creating Dashboards with Variables

Add template variables for dynamic dashboards:

```yaml
apiVersion: v1
kind: ConfigMap
metadata:
  name: grafana-dashboard-namespace-metrics
  namespace: monitoring
  labels:
    grafana_dashboard: "1"
data:
  namespace-metrics.json: |
    {
      "title": "Namespace Metrics",
      "uid": "namespace-metrics",
      "templating": {
        "list": [
          {
            "allValue": null,
            "current": {},
            "datasource": {
              "type": "prometheus",
              "uid": "prometheus"
            },
            "definition": "label_values(kube_namespace_labels, namespace)",
            "hide": 0,
            "includeAll": true,
            "multi": true,
            "name": "namespace",
            "options": [],
            "query": "label_values(kube_namespace_labels, namespace)",
            "refresh": 1,
            "regex": "",
            "skipUrlSync": false,
            "sort": 1,
            "type": "query"
          },
          {
            "datasource": {
              "type": "prometheus",
              "uid": "prometheus"
            },
            "definition": "label_values(kube_pod_info{namespace=~\"$namespace\"}, pod)",
            "hide": 0,
            "includeAll": true,
            "multi": true,
            "name": "pod",
            "options": [],
            "query": "label_values(kube_pod_info{namespace=~\"$namespace\"}, pod)",
            "refresh": 2,
            "regex": "",
            "skipUrlSync": false,
            "sort": 1,
            "type": "query"
          }
        ]
      },
      "panels": [
        {
          "datasource": {
            "type": "prometheus",
            "uid": "prometheus"
          },
          "targets": [
            {
              "expr": "sum(rate(container_cpu_usage_seconds_total{namespace=~\"$namespace\", pod=~\"$pod\"}[5m])) by (pod)",
              "refId": "A"
            }
          ],
          "title": "CPU Usage by Pod",
          "type": "timeseries"
        }
      ]
    }
```

## Comprehensive Dashboard Example

Create a full-featured dashboard:

```yaml
apiVersion: v1
kind: ConfigMap
metadata:
  name: grafana-dashboard-cluster-health
  namespace: monitoring
  labels:
    grafana_dashboard: "1"
  annotations:
    grafana_folder: "Cluster Health"
data:
  cluster-health.json: |
    {
      "annotations": {
        "list": [
          {
            "datasource": {
              "type": "prometheus",
              "uid": "prometheus"
            },
            "enable": true,
            "expr": "ALERTS{alertstate=\"firing\"}",
            "iconColor": "red",
            "name": "Alerts",
            "step": "60s",
            "tagKeys": "alertname",
            "textFormat": "{{ alertname }}",
            "titleFormat": "Alert"
          }
        ]
      },
      "editable": true,
      "fiscalYearStartMonth": 0,
      "graphTooltip": 1,
      "id": null,
      "links": [
        {
          "asDropdown": false,
          "icon": "external link",
          "includeVars": true,
          "keepTime": true,
          "tags": [],
          "targetBlank": true,
          "title": "Prometheus",
          "tooltip": "",
          "type": "link",
          "url": "http://prometheus:9090"
        }
      ],
      "panels": [
        {
          "datasource": {
            "type": "prometheus",
            "uid": "prometheus"
          },
          "fieldConfig": {
            "defaults": {
              "mappings": [],
              "thresholds": {
                "mode": "absolute",
                "steps": [
                  {"color": "green", "value": null},
                  {"color": "red", "value": 80}
                ]
              },
              "unit": "short"
            }
          },
          "gridPos": {"h": 4, "w": 6, "x": 0, "y": 0},
          "id": 1,
          "options": {
            "colorMode": "value",
            "graphMode": "area",
            "justifyMode": "auto",
            "orientation": "auto",
            "reduceOptions": {
              "calcs": ["lastNotNull"],
              "fields": "",
              "values": false
            },
            "textMode": "auto"
          },
          "targets": [
            {
              "expr": "count(kube_node_info)",
              "refId": "A"
            }
          ],
          "title": "Total Nodes",
          "type": "stat"
        },
        {
          "datasource": {
            "type": "prometheus",
            "uid": "prometheus"
          },
          "fieldConfig": {
            "defaults": {
              "mappings": [],
              "thresholds": {
                "mode": "absolute",
                "steps": [
                  {"color": "green", "value": null}
                ]
              },
              "unit": "short"
            }
          },
          "gridPos": {"h": 4, "w": 6, "x": 6, "y": 0},
          "id": 2,
          "options": {
            "colorMode": "value",
            "graphMode": "area",
            "justifyMode": "auto",
            "orientation": "auto",
            "reduceOptions": {
              "calcs": ["lastNotNull"],
              "fields": "",
              "values": false
            },
            "textMode": "auto"
          },
          "targets": [
            {
              "expr": "count(kube_pod_info{pod=~\".+\"})",
              "refId": "A"
            }
          ],
          "title": "Total Pods",
          "type": "stat"
        },
        {
          "datasource": {
            "type": "prometheus",
            "uid": "prometheus"
          },
          "fieldConfig": {
            "defaults": {
              "color": {"mode": "palette-classic"},
              "custom": {
                "axisPlacement": "auto",
                "barAlignment": 0,
                "drawStyle": "line",
                "fillOpacity": 10,
                "gradientMode": "none",
                "hideFrom": {
                  "tooltip": false,
                  "viz": false,
                  "legend": false
                },
                "lineInterpolation": "linear",
                "lineWidth": 1,
                "pointSize": 5,
                "scaleDistribution": {"type": "linear"},
                "showPoints": "never",
                "spanNulls": false
              },
              "mappings": [],
              "thresholds": {
                "mode": "absolute",
                "steps": [{"color": "green", "value": null}]
              },
              "unit": "percentunit"
            }
          },
          "gridPos": {"h": 8, "w": 12, "x": 0, "y": 4},
          "id": 3,
          "options": {
            "legend": {
              "calcs": ["mean", "lastNotNull", "max"],
              "displayMode": "table",
              "placement": "bottom",
              "showLegend": true
            },
            "tooltip": {
              "mode": "multi",
              "sort": "desc"
            }
          },
          "targets": [
            {
              "expr": "sum(rate(node_cpu_seconds_total{mode!=\"idle\"}[5m])) by (instance) / sum(rate(node_cpu_seconds_total[5m])) by (instance)",
              "legendFormat": "{{ instance }}",
              "refId": "A"
            }
          ],
          "title": "Node CPU Usage",
          "type": "timeseries"
        },
        {
          "datasource": {
            "type": "prometheus",
            "uid": "prometheus"
          },
          "fieldConfig": {
            "defaults": {
              "color": {"mode": "palette-classic"},
              "custom": {
                "axisPlacement": "auto",
                "barAlignment": 0,
                "drawStyle": "line",
                "fillOpacity": 10,
                "gradientMode": "none",
                "hideFrom": {
                  "tooltip": false,
                  "viz": false,
                  "legend": false
                },
                "lineInterpolation": "linear",
                "lineWidth": 1,
                "pointSize": 5,
                "scaleDistribution": {"type": "linear"},
                "showPoints": "never",
                "spanNulls": false
              },
              "mappings": [],
              "thresholds": {
                "mode": "absolute",
                "steps": [{"color": "green", "value": null}]
              },
              "unit": "bytes"
            }
          },
          "gridPos": {"h": 8, "w": 12, "x": 12, "y": 4},
          "id": 4,
          "options": {
            "legend": {
              "calcs": ["mean", "lastNotNull", "max"],
              "displayMode": "table",
              "placement": "bottom",
              "showLegend": true
            },
            "tooltip": {
              "mode": "multi",
              "sort": "desc"
            }
          },
          "targets": [
            {
              "expr": "node_memory_MemTotal_bytes - node_memory_MemAvailable_bytes",
              "legendFormat": "{{ instance }}",
              "refId": "A"
            }
          ],
          "title": "Node Memory Usage",
          "type": "timeseries"
        }
      ],
      "refresh": "30s",
      "schemaVersion": 38,
      "style": "dark",
      "tags": ["kubernetes", "cluster", "health"],
      "templating": {"list": []},
      "time": {"from": "now-6h", "to": "now"},
      "timepicker": {},
      "timezone": "",
      "title": "Cluster Health",
      "uid": "cluster-health",
      "version": 1,
      "weekStart": ""
    }
```

## Exporting Existing Dashboards

Export dashboards from Grafana UI for provisioning:

```bash
# Get dashboard JSON via API
GRAFANA_URL="http://localhost:3000"
API_KEY="your-api-key"
DASHBOARD_UID="cluster-overview"

curl -H "Authorization: Bearer $API_KEY" \
  "${GRAFANA_URL}/api/dashboards/uid/${DASHBOARD_UID}" | \
  jq '.dashboard' > dashboard.json

# Create ConfigMap from exported dashboard
kubectl create configmap grafana-dashboard-exported \
  --from-file=dashboard.json \
  -n monitoring

# Add label for sidecar discovery
kubectl label configmap grafana-dashboard-exported grafana_dashboard=1 -n monitoring
```

## Version Control Strategy

Store dashboards in Git for version control:

```bash
# Repository structure
dashboards/
├── cluster/
│   ├── cluster-overview.json
│   └── cluster-health.json
├── applications/
│   ├── app-metrics.json
│   └── api-performance.json
└── infrastructure/
    ├── nodes.json
    └── pods.json

# Create ConfigMaps from directory
for file in dashboards/cluster/*.json; do
  name=$(basename "$file" .json)
  kubectl create configmap "grafana-dashboard-${name}" \
    --from-file="${file}" \
    -n monitoring \
    --dry-run=client -o yaml | \
    kubectl apply -f -
  kubectl label configmap "grafana-dashboard-${name}" \
    grafana_dashboard=1 -n monitoring
done
```

## Troubleshooting Dashboard Provisioning

Check sidecar logs:

```bash
# Get Grafana pod name
GRAFANA_POD=$(kubectl get pod -n monitoring -l app.kubernetes.io/name=grafana -o jsonpath='{.items[0].metadata.name}')

# View sidecar logs
kubectl logs -n monitoring $GRAFANA_POD -c grafana-sc-dashboard
```

Verify ConfigMaps are labeled correctly:

```bash
kubectl get configmap -n monitoring -l grafana_dashboard=1
```

Check dashboard files in Grafana container:

```bash
kubectl exec -n monitoring $GRAFANA_POD -- ls -la /tmp/dashboards/
```

Test dashboard JSON validity:

```bash
# Validate JSON
jq '.' dashboard.json

# Check for required fields
jq '.title, .uid, .version' dashboard.json
```

## Best Practices

1. Use unique UIDs for each dashboard to prevent conflicts
2. Version dashboards in Git alongside application code
3. Use template variables for flexibility across environments
4. Organize dashboards into folders by team or function
5. Set `editable: false` for production dashboards
6. Include meaningful tags for dashboard discovery
7. Document dashboard purpose in description field
8. Test dashboards in non-production before promoting
9. Use consistent naming conventions for ConfigMaps
10. Enable dashboard versioning in Grafana for rollback capability

## Conclusion

Provisioning Grafana dashboards with Kubernetes ConfigMaps enables automated, version-controlled dashboard management. The sidecar pattern provides dynamic discovery and loading without manual intervention. By storing dashboards as code, you can treat them like any other infrastructure component, enabling consistent deployments, peer review, and automated testing. This approach scales from small teams to large enterprises managing hundreds of dashboards across multiple clusters.
