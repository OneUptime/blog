# How to Set Up Prometheus Federation Across Multiple Kubernetes Clusters

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Prometheus, Kubernetes, Multi-Cluster, Federation, Observability

Description: Learn how to configure Prometheus federation to aggregate metrics from multiple Kubernetes clusters into a central monitoring system for unified visibility.

---

Managing multiple Kubernetes clusters creates a challenge for monitoring. Each cluster runs its own Prometheus instance, fragmenting metrics across isolated systems. Federation solves this by pulling metrics from cluster-level Prometheus instances into a central global Prometheus.

This guide covers implementing hierarchical federation for multi-cluster Kubernetes environments.

## Understanding Prometheus Federation Architecture

Federation uses Prometheus's /federate endpoint to scrape selected metrics from one Prometheus server into another. The target Prometheus (federated) pulls metrics from source Prometheus servers (federation targets).

In a multi-cluster setup, each cluster has:

1. **Local Prometheus**: Scrapes metrics from cluster resources
2. **Federation Prometheus**: Aggregates metrics from all local instances

The federation instance queries all cluster Prometheus servers every 30-60 seconds, pulling pre-aggregated metrics for global visibility.

## Preparing Local Prometheus Instances

Each cluster needs a Prometheus instance with recording rules that pre-aggregate metrics for federation. This reduces the volume of data transferred and stored centrally.

Create recording rules for cluster-level aggregations:

```yaml
apiVersion: monitoring.coreos.com/v1
kind: PrometheusRule
metadata:
  name: federation-aggregations
  namespace: monitoring
spec:
  groups:
  - name: cluster_aggregations
    interval: 30s
    rules:
    # Total CPU usage across cluster
    - record: cluster:container_cpu_usage_seconds:sum_rate
      expr: |
        sum(
          rate(container_cpu_usage_seconds_total{container!=""}[5m])
        )

    # Total memory usage across cluster
    - record: cluster:container_memory_working_set_bytes:sum
      expr: |
        sum(
          container_memory_working_set_bytes{container!=""}
        )

    # Pod count by namespace
    - record: cluster_namespace:kube_pod_info:count
      expr: |
        count by (namespace) (kube_pod_info)

    # Node count and status
    - record: cluster:kube_node_status_condition:count
      expr: |
        count by (condition, status) (
          kube_node_status_condition
        )
```

These recording rules create compact aggregated metrics suitable for federation.

## Exposing Federation Endpoints

Ensure local Prometheus instances expose the /federate endpoint. With Prometheus Operator, this is enabled by default.

Verify the endpoint is accessible:

```bash
# Port-forward to local Prometheus
kubectl port-forward -n monitoring svc/prometheus-operated 9090:9090

# Test federation endpoint
curl 'http://localhost:9090/federate?match[]={__name__=~"cluster:.*"}' | head -20
```

The match parameter filters which metrics are exposed. Use it to limit federation to aggregated metrics only.

## Deploying the Federation Prometheus

Deploy a central Prometheus instance that scrapes all cluster Prometheus servers. This can run in a dedicated monitoring cluster or in one of the existing clusters.

```yaml
apiVersion: v1
kind: ConfigMap
metadata:
  name: prometheus-federation-config
  namespace: monitoring
data:
  prometheus.yml: |
    global:
      scrape_interval: 60s
      evaluation_interval: 60s
      external_labels:
        prometheus: federation

    scrape_configs:
    # Federate from cluster-east-1
    - job_name: 'federate-east-1'
      honor_labels: true
      metrics_path: '/federate'
      params:
        'match[]':
          - '{__name__=~"cluster:.*"}'
          - '{__name__=~"cluster_namespace:.*"}'
      static_configs:
      - targets:
        - 'prometheus.east-1.example.com:9090'
        labels:
          cluster: 'east-1'
          region: 'us-east-1'

    # Federate from cluster-west-1
    - job_name: 'federate-west-1'
      honor_labels: true
      metrics_path: '/federate'
      params:
        'match[]':
          - '{__name__=~"cluster:.*"}'
          - '{__name__=~"cluster_namespace:.*"}'
      static_configs:
      - targets:
        - 'prometheus.west-1.example.com:9090'
        labels:
          cluster: 'west-1'
          region: 'us-west-1'

    # Federate from cluster-eu-1
    - job_name: 'federate-eu-1'
      honor_labels: true
      metrics_path: '/federate'
      params:
        'match[]':
          - '{__name__=~"cluster:.*"}'
          - '{__name__=~"cluster_namespace:.*"}'
      static_configs:
      - targets:
        - 'prometheus.eu-1.example.com:9090'
        labels:
          cluster: 'eu-1'
          region: 'eu-central-1'
---
apiVersion: apps/v1
kind: Deployment
metadata:
  name: prometheus-federation
  namespace: monitoring
spec:
  replicas: 2
  selector:
    matchLabels:
      app: prometheus-federation
  template:
    metadata:
      labels:
        app: prometheus-federation
    spec:
      containers:
      - name: prometheus
        image: prom/prometheus:v2.45.0
        args:
          - '--config.file=/etc/prometheus/prometheus.yml'
          - '--storage.tsdb.path=/prometheus'
          - '--storage.tsdb.retention.time=90d'
          - '--web.enable-lifecycle'
        ports:
        - containerPort: 9090
          name: http
        volumeMounts:
        - name: config
          mountPath: /etc/prometheus
        - name: storage
          mountPath: /prometheus
      volumes:
      - name: config
        configMap:
          name: prometheus-federation-config
      - name: storage
        persistentVolumeClaim:
          claimName: prometheus-federation-storage
---
apiVersion: v1
kind: Service
metadata:
  name: prometheus-federation
  namespace: monitoring
spec:
  selector:
    app: prometheus-federation
  ports:
  - port: 9090
    name: http
```

The `honor_labels: true` setting preserves labels from federated metrics. The cluster and region labels identify the source cluster for each metric.

## Configuring Network Access Between Clusters

Federation requires network connectivity from the federation Prometheus to each cluster's Prometheus endpoint. Options include:

### VPN or VPC Peering

Connect cluster networks directly:

```yaml
# Expose Prometheus in each cluster via LoadBalancer
apiVersion: v1
kind: Service
metadata:
  name: prometheus-federation-lb
  namespace: monitoring
spec:
  type: LoadBalancer
  selector:
    app: prometheus
    prometheus: kube-prometheus
  ports:
  - port: 9090
    targetPort: 9090
```

Use the LoadBalancer IP in federation scrape configs.

### Ingress with TLS

Expose Prometheus through ingress controllers:

```yaml
apiVersion: networking.k8s.io/v1
kind: Ingress
metadata:
  name: prometheus-federation
  namespace: monitoring
  annotations:
    cert-manager.io/cluster-issuer: letsencrypt-prod
spec:
  tls:
  - hosts:
    - prometheus.east-1.example.com
    secretName: prometheus-tls
  rules:
  - host: prometheus.east-1.example.com
    http:
      paths:
      - path: /federate
        pathType: Prefix
        backend:
          service:
            name: prometheus-operated
            port:
              number: 9090
```

This exposes only the /federate endpoint publicly with TLS encryption.

### VPN Gateway or Service Mesh

Use a service mesh like Istio for cross-cluster communication:

```yaml
apiVersion: networking.istio.io/v1beta1
kind: ServiceEntry
metadata:
  name: prometheus-west-1
  namespace: monitoring
spec:
  hosts:
  - prometheus.west-1.svc.cluster.local
  addresses:
  - 10.100.50.10  # West-1 cluster ingress gateway IP
  ports:
  - number: 9090
    name: http-prometheus
    protocol: HTTP
  location: MESH_EXTERNAL
  resolution: STATIC
```

## Implementing Authentication

Secure federation endpoints with authentication to prevent unauthorized access.

### Basic Auth

Add basic authentication to Prometheus:

```yaml
# Create basic auth credentials
apiVersion: v1
kind: Secret
metadata:
  name: prometheus-federation-auth
  namespace: monitoring
type: Opaque
stringData:
  username: federation
  password: <strong-password>
---
# Update Prometheus config with basic_auth
scrape_configs:
- job_name: 'federate-east-1'
  honor_labels: true
  metrics_path: '/federate'
  basic_auth:
    username: federation
    password_file: /etc/prometheus/secrets/password
  params:
    'match[]':
      - '{__name__=~"cluster:.*"}'
  static_configs:
  - targets:
    - 'prometheus.east-1.example.com:9090'
```

### Bearer Token Auth

Use Kubernetes ServiceAccount tokens:

```yaml
scrape_configs:
- job_name: 'federate-east-1'
  honor_labels: true
  metrics_path: '/federate'
  authorization:
    type: Bearer
    credentials_file: /var/run/secrets/kubernetes.io/serviceaccount/token
  tls_config:
    ca_file: /var/run/secrets/kubernetes.io/serviceaccount/ca.crt
  params:
    'match[]':
      - '{__name__=~"cluster:.*"}'
  static_configs:
  - targets:
    - 'prometheus.east-1.svc.cluster.local:9090'
```

## Optimizing Match Selectors

Federation match parameters control which metrics are pulled. Be selective to avoid overwhelming the federation instance.

```yaml
params:
  'match[]':
    # Include all cluster-level aggregations
    - '{__name__=~"cluster:.*"}'
    - '{__name__=~"cluster_namespace:.*"}'

    # Include specific important metrics
    - 'up{job=~"kubernetes-.*"}'
    - 'kube_node_status_condition'
    - 'kube_persistentvolume_status_phase'

    # Include critical alerts
    - 'ALERTS{alertstate="firing"}'
```

Avoid federating high-cardinality metrics like per-pod CPU usage. Only pull aggregated metrics.

## Creating Global Recording Rules

The federation Prometheus can create additional recording rules that aggregate across all clusters:

```yaml
apiVersion: monitoring.coreos.com/v1
kind: PrometheusRule
metadata:
  name: global-aggregations
  namespace: monitoring
spec:
  groups:
  - name: global_metrics
    interval: 60s
    rules:
    # Total CPU across all clusters
    - record: global:container_cpu_usage_seconds:sum_rate
      expr: |
        sum(cluster:container_cpu_usage_seconds:sum_rate)

    # CPU by cluster
    - record: global_cluster:container_cpu_usage_seconds:sum_rate
      expr: |
        sum by (cluster) (cluster:container_cpu_usage_seconds:sum_rate)

    # Total pods across all clusters
    - record: global:kube_pod_info:count
      expr: |
        sum(cluster_namespace:kube_pod_info:count)

    # Pods by cluster and namespace
    - record: global_cluster_namespace:kube_pod_info:count
      expr: |
        sum by (cluster, namespace) (cluster_namespace:kube_pod_info:count)
```

## Setting Up Alerting

Configure alerts that trigger based on global or per-cluster conditions:

```yaml
groups:
- name: federation_alerts
  rules:
  - alert: ClusterDown
    expr: |
      up{job=~"federate-.*"} == 0
    for: 5m
    labels:
      severity: critical
    annotations:
      summary: "Cluster {{ $labels.cluster }} Prometheus unreachable"
      description: "Cannot scrape metrics from cluster {{ $labels.cluster }}"

  - alert: GlobalHighCPU
    expr: |
      global:container_cpu_usage_seconds:sum_rate > 100
    for: 10m
    labels:
      severity: warning
    annotations:
      summary: "High CPU usage across all clusters"
      description: "Global CPU usage is {{ $value }} cores"

  - alert: ClusterHighMemory
    expr: |
      global_cluster:container_memory_working_set_bytes:sum / 1024 / 1024 / 1024 > 500
    for: 5m
    labels:
      severity: warning
    annotations:
      summary: "High memory in cluster {{ $labels.cluster }}"
      description: "Memory usage is {{ $value }}GB"
```

## Visualizing Multi-Cluster Metrics

Create Grafana dashboards that visualize metrics across all clusters:

```json
{
  "panels": [
    {
      "title": "CPU Usage by Cluster",
      "targets": [
        {
          "expr": "global_cluster:container_cpu_usage_seconds:sum_rate"
        }
      ]
    },
    {
      "title": "Total Pods by Cluster",
      "targets": [
        {
          "expr": "sum by (cluster) (cluster_namespace:kube_pod_info:count)"
        }
      ]
    }
  ]
}
```

Use cluster labels to filter or group metrics by cluster in dashboard variables.

## Monitoring Federation Health

Track federation scrape success and latency:

```promql
# Federation scrape success rate
rate(prometheus_target_scrapes_total{job=~"federate-.*"}[5m])

# Federation scrape duration
prometheus_target_interval_length_seconds{job=~"federate-.*"}

# Samples ingested per cluster
rate(prometheus_tsdb_head_samples_appended_total[5m])
```

Set up alerts for federation failures:

```yaml
- alert: FederationScrapeFailing
  expr: |
    rate(prometheus_target_scrapes_total{job=~"federate-.*"}[5m]) < 0.5
  for: 10m
  labels:
    severity: warning
  annotations:
    summary: "Federation scraping {{ $labels.job }} failing"
```

Prometheus federation provides a scalable approach to multi-cluster monitoring by aggregating pre-computed metrics into a unified view without overwhelming the central system.
