# How to Implement Grafana Dashboard Provisioning from ConfigMaps

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Grafana, Kubernetes, GitOps

Description: Learn how to automate Grafana dashboard deployment using Kubernetes ConfigMaps and provisioning to manage dashboards as code, enable version control, and maintain consistent monitoring across environments.

---

Manually creating dashboards in Grafana is fine for development, but it doesn't scale. When you have multiple environments, teams, or need to recreate dashboards after disasters, you want dashboards defined as code.

Grafana's provisioning feature combined with Kubernetes ConfigMaps gives you dashboards-as-code. You version them in Git, deploy them automatically, and maintain consistency across all your Grafana instances.

## Understanding Dashboard Provisioning

Grafana can automatically load dashboards from files at startup. The provisioning system watches these files and updates dashboards when they change.

In Kubernetes, you store dashboard JSON in ConfigMaps and mount them into the Grafana pod. When ConfigMaps update, Grafana reloads the dashboards.

## Basic Dashboard Provisioning Setup

Start with a simple dashboard provider configuration:

```yaml
apiVersion: v1
kind: ConfigMap
metadata:
  name: grafana-dashboard-provider
  namespace: monitoring
data:
  dashboards.yaml: |
    apiVersion: 1
    providers:
    - name: 'default'
      orgId: 1
      folder: ''
      type: file
      disableDeletion: false
      updateIntervalSeconds: 30
      allowUiUpdates: true
      options:
        path: /var/lib/grafana/dashboards
```

This tells Grafana to load dashboards from `/var/lib/grafana/dashboards`.

## Creating Dashboard ConfigMaps

Store your dashboard JSON in a ConfigMap:

```yaml
apiVersion: v1
kind: ConfigMap
metadata:
  name: grafana-dashboard-cluster
  namespace: monitoring
  labels:
    grafana_dashboard: "1"
data:
  cluster-overview.json: |
    {
      "dashboard": {
        "title": "Cluster Overview",
        "uid": "cluster-overview",
        "tags": ["kubernetes", "cluster"],
        "timezone": "browser",
        "schemaVersion": 27,
        "version": 1,
        "refresh": "30s",
        "panels": [
          {
            "id": 1,
            "title": "Node Count",
            "type": "stat",
            "targets": [
              {
                "expr": "count(kube_node_info)",
                "refId": "A"
              }
            ],
            "gridPos": {
              "x": 0,
              "y": 0,
              "w": 6,
              "h": 4
            }
          },
          {
            "id": 2,
            "title": "Pod Count by Namespace",
            "type": "graph",
            "targets": [
              {
                "expr": "count(kube_pod_info) by (namespace)",
                "legendFormat": "{{namespace}}",
                "refId": "A"
              }
            ],
            "gridPos": {
              "x": 6,
              "y": 0,
              "w": 18,
              "h": 8
            },
            "yaxes": [
              {
                "format": "short",
                "label": "Pods"
              },
              {
                "format": "short"
              }
            ]
          },
          {
            "id": 3,
            "title": "CPU Usage",
            "type": "graph",
            "targets": [
              {
                "expr": "sum(rate(container_cpu_usage_seconds_total{container!=\"\"}[5m])) by (namespace)",
                "legendFormat": "{{namespace}}",
                "refId": "A"
              }
            ],
            "gridPos": {
              "x": 0,
              "y": 8,
              "w": 12,
              "h": 8
            }
          },
          {
            "id": 4,
            "title": "Memory Usage",
            "type": "graph",
            "targets": [
              {
                "expr": "sum(container_memory_working_set_bytes{container!=\"\"}) by (namespace)",
                "legendFormat": "{{namespace}}",
                "refId": "A"
              }
            ],
            "gridPos": {
              "x": 12,
              "y": 8,
              "w": 12,
              "h": 8
            }
          }
        ]
      }
    }
```

## Mounting Dashboards in Grafana

Update your Grafana deployment to mount the ConfigMaps:

```yaml
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
        image: grafana/grafana:10.2.0
        ports:
        - containerPort: 3000
        volumeMounts:
        # Mount dashboard provider config
        - name: dashboard-provider
          mountPath: /etc/grafana/provisioning/dashboards
        # Mount dashboard JSON files
        - name: dashboards
          mountPath: /var/lib/grafana/dashboards
      volumes:
      - name: dashboard-provider
        configMap:
          name: grafana-dashboard-provider
      - name: dashboards
        configMap:
          name: grafana-dashboard-cluster
```

## Managing Multiple Dashboards

For many dashboards, create one ConfigMap per dashboard:

```yaml
apiVersion: v1
kind: ConfigMap
metadata:
  name: grafana-dashboard-nodes
  namespace: monitoring
  labels:
    grafana_dashboard: "1"
data:
  nodes.json: |
    {
      "dashboard": {
        "title": "Node Metrics",
        "uid": "node-metrics",
        "panels": [...]
      }
    }
---
apiVersion: v1
kind: ConfigMap
metadata:
  name: grafana-dashboard-pods
  namespace: monitoring
  labels:
    grafana_dashboard: "1"
data:
  pods.json: |
    {
      "dashboard": {
        "title": "Pod Metrics",
        "uid": "pod-metrics",
        "panels": [...]
      }
    }
---
apiVersion: v1
kind: ConfigMap
metadata:
  name: grafana-dashboard-networking
  namespace: monitoring
  labels:
    grafana_dashboard: "1"
data:
  networking.json: |
    {
      "dashboard": {
        "title": "Network Metrics",
        "uid": "network-metrics",
        "panels": [...]
      }
    }
```

Mount all dashboards using a script:

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: grafana
  namespace: monitoring
spec:
  template:
    spec:
      initContainers:
      # Copy all dashboard ConfigMaps to shared volume
      - name: dashboard-loader
        image: busybox
        command:
        - sh
        - -c
        - |
          # Create dashboard directory
          mkdir -p /dashboards
          # Copy all mounted dashboard files
          cp /tmp/dashboards/*/*.json /dashboards/ || true
        volumeMounts:
        - name: dashboards-temp
          mountPath: /tmp/dashboards
        - name: dashboards
          mountPath: /dashboards
      containers:
      - name: grafana
        volumeMounts:
        - name: dashboards
          mountPath: /var/lib/grafana/dashboards
        - name: dashboard-provider
          mountPath: /etc/grafana/provisioning/dashboards
      volumes:
      - name: dashboard-provider
        configMap:
          name: grafana-dashboard-provider
      - name: dashboards
        emptyDir: {}
      - name: dashboards-temp
        projected:
          sources:
          - configMap:
              name: grafana-dashboard-cluster
          - configMap:
              name: grafana-dashboard-nodes
          - configMap:
              name: grafana-dashboard-pods
          - configMap:
              name: grafana-dashboard-networking
```

## Organizing Dashboards into Folders

Create folders to organize dashboards:

```yaml
apiVersion: v1
kind: ConfigMap
metadata:
  name: grafana-dashboard-provider
  namespace: monitoring
data:
  dashboards.yaml: |
    apiVersion: 1
    providers:
    - name: 'kubernetes'
      orgId: 1
      folder: 'Kubernetes'
      type: file
      disableDeletion: false
      updateIntervalSeconds: 30
      allowUiUpdates: true
      options:
        path: /var/lib/grafana/dashboards/kubernetes

    - name: 'applications'
      orgId: 1
      folder: 'Applications'
      type: file
      disableDeletion: false
      updateIntervalSeconds: 30
      allowUiUpdates: true
      options:
        path: /var/lib/grafana/dashboards/applications

    - name: 'infrastructure'
      orgId: 1
      folder: 'Infrastructure'
      type: file
      disableDeletion: false
      updateIntervalSeconds: 30
      allowUiUpdates: true
      options:
        path: /var/lib/grafana/dashboards/infrastructure
```

Mount dashboards to appropriate folders:

```yaml
volumes:
- name: kubernetes-dashboards
  configMap:
    name: grafana-dashboards-kubernetes
- name: application-dashboards
  configMap:
    name: grafana-dashboards-applications
- name: infrastructure-dashboards
  configMap:
    name: grafana-dashboards-infrastructure

volumeMounts:
- name: kubernetes-dashboards
  mountPath: /var/lib/grafana/dashboards/kubernetes
- name: application-dashboards
  mountPath: /var/lib/grafana/dashboards/applications
- name: infrastructure-dashboards
  mountPath: /var/lib/grafana/dashboards/infrastructure
```

## Exporting Existing Dashboards

Export dashboards from Grafana to create ConfigMaps:

```bash
# Export a dashboard by UID
DASHBOARD_UID="cluster-overview"
GRAFANA_URL="http://grafana.example.com"
API_KEY="your-api-key"

curl -H "Authorization: Bearer $API_KEY" \
  "$GRAFANA_URL/api/dashboards/uid/$DASHBOARD_UID" | \
  jq '.dashboard' > dashboard.json

# Create ConfigMap from exported dashboard
kubectl create configmap grafana-dashboard-exported \
  -n monitoring \
  --from-file=dashboard.json \
  --dry-run=client -o yaml > dashboard-configmap.yaml
```

Automate exporting all dashboards:

```bash
#!/bin/bash
# export-dashboards.sh - Export all Grafana dashboards

GRAFANA_URL="http://grafana.example.com"
API_KEY="your-api-key"
OUTPUT_DIR="./dashboards"

mkdir -p $OUTPUT_DIR

# Get all dashboard UIDs
curl -s -H "Authorization: Bearer $API_KEY" \
  "$GRAFANA_URL/api/search?type=dash-db" | \
  jq -r '.[] | .uid' | while read uid; do

  # Export dashboard
  echo "Exporting $uid..."
  curl -s -H "Authorization: Bearer $API_KEY" \
    "$GRAFANA_URL/api/dashboards/uid/$uid" | \
    jq '.dashboard' > "$OUTPUT_DIR/$uid.json"

  # Create ConfigMap
  kubectl create configmap "grafana-dashboard-$uid" \
    -n monitoring \
    --from-file="$uid.json=$OUTPUT_DIR/$uid.json" \
    --dry-run=client -o yaml > "$OUTPUT_DIR/$uid-configmap.yaml"
done

echo "Exported all dashboards to $OUTPUT_DIR"
```

## Using Dashboard Variables

Create dashboards with variables for flexibility:

```yaml
apiVersion: v1
kind: ConfigMap
metadata:
  name: grafana-dashboard-namespace
  namespace: monitoring
data:
  namespace-overview.json: |
    {
      "dashboard": {
        "title": "Namespace Overview",
        "uid": "namespace-overview",
        "templating": {
          "list": [
            {
              "name": "namespace",
              "type": "query",
              "datasource": "Prometheus",
              "query": "label_values(kube_pod_info, namespace)",
              "refresh": 1,
              "multi": false,
              "includeAll": false
            }
          ]
        },
        "panels": [
          {
            "title": "Pods in $namespace",
            "type": "stat",
            "targets": [
              {
                "expr": "count(kube_pod_info{namespace=\"$namespace\"})",
                "refId": "A"
              }
            ]
          },
          {
            "title": "CPU Usage in $namespace",
            "type": "graph",
            "targets": [
              {
                "expr": "sum(rate(container_cpu_usage_seconds_total{namespace=\"$namespace\"}[5m])) by (pod)",
                "legendFormat": "{{pod}}",
                "refId": "A"
              }
            ]
          }
        ]
      }
    }
```

## Automating Dashboard Updates

Use GitOps to automatically update dashboards:

```yaml
# kustomization.yaml
apiVersion: kustomize.config.k8s.io/v1beta1
kind: Kustomization
namespace: monitoring

resources:
- grafana-deployment.yaml
- grafana-service.yaml

configMapGenerator:
- name: grafana-dashboard-provider
  files:
  - dashboards.yaml

- name: grafana-dashboard-cluster
  files:
  - dashboards/cluster-overview.json

- name: grafana-dashboard-nodes
  files:
  - dashboards/nodes.json

- name: grafana-dashboard-pods
  files:
  - dashboards/pods.json
```

Deploy with Flux or ArgoCD:

```yaml
apiVersion: kustomize.toolkit.fluxcd.io/v1
kind: Kustomization
metadata:
  name: grafana-dashboards
  namespace: flux-system
spec:
  interval: 5m
  path: ./monitoring/grafana
  prune: true
  sourceRef:
    kind: GitRepository
    name: fleet-infra
  targetNamespace: monitoring
```

When you commit dashboard changes to Git, they automatically deploy to Grafana.

## Handling Dashboard Permissions

Control who can edit dashboards:

```yaml
apiVersion: v1
kind: ConfigMap
metadata:
  name: grafana-dashboard-provider
  namespace: monitoring
data:
  dashboards.yaml: |
    apiVersion: 1
    providers:
    - name: 'production'
      orgId: 1
      folder: 'Production'
      type: file
      disableDeletion: true  # Prevent deletion from UI
      updateIntervalSeconds: 30
      allowUiUpdates: false  # Prevent editing from UI
      options:
        path: /var/lib/grafana/dashboards/production

    - name: 'development'
      orgId: 1
      folder: 'Development'
      type: file
      disableDeletion: false
      updateIntervalSeconds: 30
      allowUiUpdates: true  # Allow editing from UI
      options:
        path: /var/lib/grafana/dashboards/development
```

## Monitoring Dashboard Provisioning

Track dashboard provisioning status:

```bash
# Check Grafana logs for provisioning events
kubectl logs -n monitoring -l app=grafana | grep -i provision

# List all dashboards
curl -H "Authorization: Bearer $API_KEY" \
  http://grafana.example.com/api/search?type=dash-db | jq

# Check dashboard metadata
curl -H "Authorization: Bearer $API_KEY" \
  http://grafana.example.com/api/dashboards/uid/cluster-overview | \
  jq '.meta'
```

## Troubleshooting Provisioning Issues

Common problems and solutions:

```bash
# Dashboard not appearing
# Check ConfigMap is mounted
kubectl describe pod -n monitoring -l app=grafana | grep -A 10 Mounts

# Check files exist in pod
kubectl exec -n monitoring -it $(kubectl get pod -n monitoring -l app=grafana -o jsonpath='{.items[0].metadata.name}') -- \
  ls -la /var/lib/grafana/dashboards

# Check dashboard JSON is valid
kubectl get configmap grafana-dashboard-cluster -n monitoring -o json | \
  jq -r '.data["cluster-overview.json"]' | jq

# Dashboard updates not reflecting
# Check updateIntervalSeconds setting
# Force Grafana restart
kubectl rollout restart deployment grafana -n monitoring
```

## Best Practices

Follow these guidelines for effective dashboard provisioning:

1. **Version control**: Store all dashboards in Git for history and rollback.
2. **Use UIDs**: Set unique UIDs for dashboards to enable consistent linking.
3. **Organize logically**: Use folders to group related dashboards.
4. **Limit UI updates**: Set `allowUiUpdates: false` for production dashboards.
5. **Test changes**: Validate dashboard JSON before deploying to production.
6. **Use variables**: Make dashboards flexible with template variables.
7. **Document dashboards**: Add descriptions and links to relevant documentation.
8. **Automate exports**: Regularly export and commit dashboards back to Git.

Dashboard provisioning transforms Grafana from a manual tool into a code-managed platform. By storing dashboards in ConfigMaps and version controlling them, you gain reproducibility, consistency, and the ability to manage monitoring at scale.
