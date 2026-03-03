# How to Set Up Grafana Dashboards for Talos Linux

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Talos Linux, Grafana, Dashboard, Monitoring, Kubernetes

Description: Step-by-step guide to creating and configuring Grafana dashboards for monitoring your Talos Linux Kubernetes cluster.

---

Grafana turns raw metrics from your Talos Linux cluster into visual dashboards that make it easy to spot problems, track trends, and understand cluster behavior at a glance. While Prometheus collects and stores the data, Grafana is where you actually look at it. Setting up good dashboards saves you from having to write ad-hoc PromQL queries every time you want to check on your cluster.

This guide covers deploying Grafana, connecting it to your data sources, importing community dashboards, and building custom dashboards tailored to Talos Linux.

## Deploying Grafana

If you installed the kube-prometheus-stack, Grafana is already included. If not, deploy it separately:

```bash
# Add the Grafana Helm repository
helm repo add grafana https://grafana.github.io/helm-charts
helm repo update

# Install Grafana with persistent storage
helm install grafana grafana/grafana \
  --namespace monitoring \
  --set persistence.enabled=true \
  --set persistence.size=10Gi \
  --set adminPassword=your-secure-password \
  --set service.type=LoadBalancer
```

For a more detailed setup, use a values file:

```yaml
# grafana-values.yaml
# Grafana configuration for Talos Linux monitoring
persistence:
  enabled: true
  size: 10Gi
  storageClassName: local-path

adminPassword: your-secure-password

service:
  type: LoadBalancer

# Auto-provision data sources
datasources:
  datasources.yaml:
    apiVersion: 1
    datasources:
      - name: Prometheus
        type: prometheus
        url: http://prometheus-kube-prometheus-prometheus.monitoring.svc:9090
        access: proxy
        isDefault: true
      - name: Loki
        type: loki
        url: http://loki-gateway.logging.svc:80
        access: proxy

# Auto-provision dashboard providers
dashboardProviders:
  dashboardproviders.yaml:
    apiVersion: 1
    providers:
      - name: default
        orgId: 1
        folder: 'Talos Linux'
        type: file
        disableDeletion: false
        editable: true
        options:
          path: /var/lib/grafana/dashboards/default

# Import community dashboards by ID
dashboards:
  default:
    node-exporter:
      gnetId: 1860
      revision: 33
      datasource: Prometheus
    kubernetes-cluster:
      gnetId: 6417
      revision: 1
      datasource: Prometheus
    etcd:
      gnetId: 3070
      revision: 3
      datasource: Prometheus
```

Install with the custom values:

```bash
# Deploy Grafana with auto-provisioned dashboards
helm install grafana grafana/grafana \
  --namespace monitoring \
  -f grafana-values.yaml
```

## Accessing Grafana

Once deployed, access the Grafana interface:

```bash
# Port-forward to access Grafana locally
kubectl port-forward -n monitoring svc/grafana 3000:80

# Or if using LoadBalancer, get the external IP
kubectl get svc -n monitoring grafana
```

Navigate to `http://localhost:3000` and log in with the admin credentials.

## Essential Dashboards for Talos Linux

### Node Overview Dashboard

Create a dashboard that shows the health of all nodes at a glance. Here is the JSON model for a Talos node overview panel:

```json
{
  "title": "Talos Node Overview",
  "panels": [
    {
      "title": "CPU Usage by Node",
      "type": "timeseries",
      "targets": [
        {
          "expr": "100 - (avg by (instance) (rate(node_cpu_seconds_total{mode=\"idle\"}[5m])) * 100)",
          "legendFormat": "{{ instance }}"
        }
      ]
    },
    {
      "title": "Memory Usage by Node",
      "type": "timeseries",
      "targets": [
        {
          "expr": "(1 - node_memory_MemAvailable_bytes / node_memory_MemTotal_bytes) * 100",
          "legendFormat": "{{ instance }}"
        }
      ]
    },
    {
      "title": "Disk Usage by Node",
      "type": "gauge",
      "targets": [
        {
          "expr": "(1 - node_filesystem_avail_bytes{mountpoint=\"/\"} / node_filesystem_size_bytes{mountpoint=\"/\"}) * 100",
          "legendFormat": "{{ instance }}"
        }
      ]
    }
  ]
}
```

### Kubernetes Workload Dashboard

This dashboard tracks pod status, restart counts, and resource utilization:

```yaml
# Key PromQL queries for a Kubernetes workload dashboard

# Running pods per namespace
sum by (namespace) (kube_pod_status_phase{phase="Running"})

# Pods in error state
sum by (namespace, pod) (kube_pod_status_phase{phase=~"Failed|Unknown"})

# Container restart rate
sum by (namespace, pod) (increase(kube_pod_container_status_restarts_total[1h]))

# CPU request vs actual usage
sum by (namespace) (rate(container_cpu_usage_seconds_total[5m]))
/
sum by (namespace) (kube_pod_container_resource_requests{resource="cpu"})

# Memory request vs actual usage
sum by (namespace) (container_memory_working_set_bytes)
/
sum by (namespace) (kube_pod_container_resource_requests{resource="memory"})
```

### etcd Dashboard

Monitoring etcd is critical for cluster health. Create a dashboard with these panels:

```yaml
# etcd dashboard PromQL queries

# etcd leader status (should always be 1)
etcd_server_has_leader

# etcd proposal commit rate
rate(etcd_server_proposals_committed_total[5m])

# etcd proposal failure rate (should be 0)
rate(etcd_server_proposals_failed_total[5m])

# WAL fsync duration (99th percentile)
histogram_quantile(0.99, rate(etcd_disk_wal_fsync_duration_seconds_bucket[5m]))

# Backend commit duration (99th percentile)
histogram_quantile(0.99, rate(etcd_disk_backend_commit_duration_seconds_bucket[5m]))

# Database size
etcd_mvcc_db_total_size_in_bytes

# Number of keys
etcd_debugging_mvcc_keys_total

# gRPC request rate
rate(grpc_server_handled_total{grpc_type="unary"}[5m])
```

## Building a Custom Talos Linux Dashboard

Create a comprehensive dashboard as a ConfigMap that gets auto-provisioned:

```yaml
# talos-dashboard-configmap.yaml
# Custom Grafana dashboard for Talos Linux cluster monitoring
apiVersion: v1
kind: ConfigMap
metadata:
  name: talos-dashboard
  namespace: monitoring
  labels:
    grafana_dashboard: "1"
data:
  talos-cluster.json: |
    {
      "dashboard": {
        "title": "Talos Linux Cluster",
        "tags": ["talos", "kubernetes"],
        "timezone": "browser",
        "refresh": "30s",
        "templating": {
          "list": [
            {
              "name": "node",
              "type": "query",
              "query": "label_values(node_uname_info, instance)",
              "datasource": "Prometheus"
            }
          ]
        },
        "rows": [
          {
            "title": "Cluster Overview",
            "panels": [
              {
                "title": "Total Nodes",
                "type": "stat",
                "targets": [{"expr": "count(node_uname_info)"}]
              },
              {
                "title": "Total Pods",
                "type": "stat",
                "targets": [{"expr": "sum(kubelet_running_pods)"}]
              },
              {
                "title": "Cluster CPU Usage",
                "type": "gauge",
                "targets": [{"expr": "avg(100 - (avg by (instance) (rate(node_cpu_seconds_total{mode='idle'}[5m])) * 100))"}]
              },
              {
                "title": "Cluster Memory Usage",
                "type": "gauge",
                "targets": [{"expr": "avg((1 - node_memory_MemAvailable_bytes / node_memory_MemTotal_bytes) * 100)"}]
              }
            ]
          }
        ]
      }
    }
```

Apply the ConfigMap:

```bash
# Deploy the custom dashboard
kubectl apply -f talos-dashboard-configmap.yaml
```

If you have the Grafana sidecar enabled (which is the default in kube-prometheus-stack), the dashboard will appear automatically.

## Setting Up Dashboard Variables

Variables make dashboards interactive. Add these to let users filter by node, namespace, or pod:

```
# Node variable
Query: label_values(node_uname_info, instance)
Name: node

# Namespace variable
Query: label_values(kube_pod_info, namespace)
Name: namespace

# Pod variable (filtered by namespace)
Query: label_values(kube_pod_info{namespace="$namespace"}, pod)
Name: pod
```

Use these variables in your panel queries:

```
# CPU usage for selected node
100 - (avg(rate(node_cpu_seconds_total{mode="idle", instance="$node"}[5m])) * 100)

# Pod count for selected namespace
count(kube_pod_info{namespace="$namespace"})
```

## Adding Annotations for Events

Annotations mark important events on your time series graphs. Configure annotations to show Kubernetes events:

```yaml
# In your Grafana dashboard JSON, add annotations
{
  "annotations": {
    "list": [
      {
        "datasource": "Prometheus",
        "enable": true,
        "expr": "changes(kube_deployment_status_observed_generation{namespace=\"$namespace\"}[1m]) > 0",
        "name": "Deployments",
        "tagKeys": "namespace,deployment",
        "titleFormat": "Deployment updated"
      }
    ]
  }
}
```

## Organizing Dashboards

As your dashboard collection grows, organize them into folders:

```bash
# Create folders using the Grafana API
curl -X POST http://admin:password@localhost:3000/api/folders \
  -H "Content-Type: application/json" \
  -d '{"title": "Talos Infrastructure"}'

curl -X POST http://admin:password@localhost:3000/api/folders \
  -H "Content-Type: application/json" \
  -d '{"title": "Kubernetes Workloads"}'

curl -X POST http://admin:password@localhost:3000/api/folders \
  -H "Content-Type: application/json" \
  -d '{"title": "etcd"}'
```

## Dashboard Best Practices

Keep your Grafana dashboards effective with these practices. First, start every dashboard with a row of stat panels showing the most important numbers at a glance - total nodes, total pods, overall CPU and memory usage. Second, use consistent color schemes across dashboards so that green always means healthy and red always means trouble. Third, set reasonable time ranges and refresh intervals - 30 seconds is a good default for operational dashboards, while 5 minutes is better for trend analysis. Fourth, add documentation links to dashboard descriptions so on-call engineers know what each panel means and what to do when values go outside normal ranges.

Fifth, export your dashboards as JSON and store them in version control. This lets you track changes, roll back problematic modifications, and replicate dashboards across environments. The ConfigMap approach shown earlier makes this natural since the dashboard definition lives in a YAML file that can be committed to your Git repository.

Grafana dashboards are your window into what is happening inside your Talos Linux cluster. With well-designed dashboards covering node health, Kubernetes workloads, and etcd performance, you can catch problems early and resolve them before they impact your users.
