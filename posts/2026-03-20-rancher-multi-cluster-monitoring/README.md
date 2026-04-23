# How to Set Up Multi-Cluster Monitoring in Rancher - A Practical Guide

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Rancher, Kubernetes, Monitoring, Prometheus, Grafana, Multi-Cluster

Description: Configure centralized multi-cluster monitoring in Rancher using Prometheus, Thanos or Federation, and Grafana dashboards for a unified observability view.

## Introduction

Multi-cluster monitoring in Rancher collects metrics from all downstream clusters and presents them in a unified Grafana dashboard. Rancher's built-in monitoring stack (based on `kube-prometheus-stack`) can be deployed per-cluster and optionally federated to a central instance. This guide covers both per-cluster and centralized multi-cluster monitoring architectures.

## Architecture Options

**Option A: Per-Cluster Monitoring (Simple)**
Each cluster has its own Prometheus and Grafana. Good for small fleets.

**Option B: Federated Central Prometheus (Medium)**
Per-cluster Prometheus instances, with a central Prometheus federating selected metrics.

**Option C: Thanos (Large Scale)**
Per-cluster Prometheus with Thanos Sidecars, and a central Thanos Query for cross-cluster queries.

This guide covers Option B (federation) and Option C (Thanos).

## Step 1: Install Rancher Monitoring per Cluster

```bash
# In Rancher UI: Cluster → Monitoring → Install (Rancher Monitoring)

# Or via Helm for each cluster:

helm repo add rancher-charts https://charts.rancher.io
helm repo update

# Install on each downstream cluster
for cluster_kubeconfig in /tmp/kc-cluster-*.yaml; do
  cluster_name="$(basename "${cluster_kubeconfig}" .yaml | sed 's/^kc-cluster-//')"
  helm install rancher-monitoring \
    rancher-charts/rancher-monitoring \
    -n cattle-monitoring-system \
    --create-namespace \
    --kubeconfig "${cluster_kubeconfig}" \
    --set prometheus.prometheusSpec.externalLabels.cluster="${cluster_name}" \
    --set prometheus.prometheusSpec.retention=3d \
    --set prometheus.prometheusSpec.storageSpec.volumeClaimTemplate.spec.resources.requests.storage=20Gi \
    --set prometheus.thanosServiceExternal.enabled=true
done
```

## Step 2: Option B - Set Up Prometheus Federation

On the central monitoring cluster, configure federation against downstream Prometheus endpoints that are routable from the central cluster:

```yaml
# central-prometheus-additional-scrape.yaml
# Add to the central Prometheus via additionalScrapeConfigs
- job_name: 'federate-cluster-1'
  honor_labels: true
  metrics_path: '/federate'
  params:
    match[]:
      - '{job!=""}'
      - '{__name__=~"up|container_cpu_usage_seconds_total|container_memory_working_set_bytes|kube_pod_status_phase"}'
  static_configs:
    - targets:
        - 'prometheus-cluster-1.example.com:9090'
      labels:
        cluster: cluster-1
        environment: production

- job_name: 'federate-cluster-2'
  honor_labels: true
  metrics_path: '/federate'
  params:
    match[]:
      - '{job!=""}'
  static_configs:
    - targets:
        - 'prometheus-cluster-2.example.com:9090'
      labels:
        cluster: cluster-2
        environment: staging
```

```bash
# Apply the additional scrape config
kubectl create secret generic additional-scrape-configs \
  -n cattle-monitoring-system \
  --from-file=scrape-configs.yaml=central-prometheus-additional-scrape.yaml

# Reference it in the Prometheus CR
kubectl patch prometheus -n cattle-monitoring-system rancher-monitoring-prometheus \
  --type=merge \
  --patch '{"spec":{"additionalScrapeConfigs":{"name":"additional-scrape-configs","key":"scrape-configs.yaml"}}}'
```

## Step 3: Option C - Set Up Thanos for Long-Term Storage

```bash
# Create the object storage secret on each downstream cluster
for cluster_kubeconfig in /tmp/kc-cluster-*.yaml; do
  kubectl --kubeconfig "${cluster_kubeconfig}" create secret generic thanos-objstore-secret \
    -n cattle-monitoring-system \
    --from-file=objstore.yml=thanos-objstore.yml
done

# On each downstream cluster, configure Thanos Sidecar
for cluster_kubeconfig in /tmp/kc-cluster-*.yaml; do
  kubectl --kubeconfig "${cluster_kubeconfig}" patch prometheus -n cattle-monitoring-system rancher-monitoring-prometheus \
    --type=merge --patch '{
      "spec": {
        "thanos": {
          "version": "v0.39.2",
          "image": "quay.io/thanos/thanos:v0.39.2",
          "objectStorageConfig": {
            "name": "thanos-objstore-secret",
            "key": "objstore.yml"
          }
        }
      }
    }'
done
```

```yaml
# thanos-objstore.yml - store metrics in S3
type: S3
config:
  bucket: my-thanos-metrics
  endpoint: s3.us-east-1.amazonaws.com
  region: us-east-1
  access_key: AKIAXXXXXXXX
  secret_key: xxxxxxxxxxxxxxxx
```

```bash
# Deploy Thanos Query on the central cluster
helm repo add bitnami https://charts.bitnami.com/bitnami
helm install thanos bitnami/thanos \
  --namespace monitoring \
  --create-namespace \
  --set-file objstoreConfig=thanos-objstore.yml \
  --set query.enabled=true \
  --set storegateway.enabled=true \
  --set query.stores[0]=cluster-1-thanos-sidecar.example.com:10901 \
  --set query.stores[1]=cluster-2-thanos-sidecar.example.com:10901
```

## Step 4: Configure Multi-Cluster Grafana Dashboards

```bash
# Add the Thanos datasource to Grafana
kubectl apply -f - << 'EOF'
apiVersion: v1
kind: ConfigMap
metadata:
  name: grafana-datasource-thanos
  namespace: cattle-monitoring-system
  labels:
    grafana_datasource: "1"
data:
  thanos-datasource.yaml: |
    apiVersion: 1
    datasources:
      - name: Thanos
        type: prometheus
        access: proxy
        url: http://thanos-query.monitoring.svc:9090
        isDefault: false
        jsonData:
          timeInterval: "5s"
EOF
```

## Step 5: Create Cross-Cluster Dashboards

```json
{
  "title": "Multi-Cluster Overview",
  "panels": [
    {
      "title": "CPU Usage by Cluster",
      "type": "timeseries",
      "targets": [
        {
          "expr": "sum(rate(container_cpu_usage_seconds_total{container!=\"\"}[5m])) by (cluster)",
          "legendFormat": "{{cluster}}"
        }
      ]
    },
    {
      "title": "Memory Usage by Cluster",
      "type": "timeseries",
      "targets": [
        {
          "expr": "sum(container_memory_working_set_bytes{container!=\"\"}) by (cluster) / 1024 / 1024 / 1024",
          "legendFormat": "{{cluster}} (GiB)"
        }
      ]
    },
    {
      "title": "Pod Count by Cluster",
      "type": "stat",
      "targets": [
        {
          "expr": "count(kube_pod_info) by (cluster)",
          "legendFormat": "{{cluster}}"
        }
      ]
    }
  ]
}
```

## Step 6: Configure Cross-Cluster Alerts

```yaml
# PrometheusRule for multi-cluster alerts
apiVersion: monitoring.coreos.com/v1
kind: PrometheusRule
metadata:
  name: multi-cluster-alerts
  namespace: cattle-monitoring-system
spec:
  groups:
    - name: cluster-health
      interval: 1m
      rules:
        - alert: ClusterNodeNotReady
          expr: kube_node_status_condition{condition="Ready",status="true"} == 0
          for: 5m
          labels:
            severity: critical
          annotations:
            summary: "Node {{ $labels.node }} in cluster {{ $labels.cluster }} is not ready"

        - alert: ClusterHighCPU
          expr: >
            sum(rate(container_cpu_usage_seconds_total[5m])) by (cluster)
            / sum(machine_cpu_cores) by (cluster) > 0.85
          for: 10m
          labels:
            severity: warning
          annotations:
            summary: "Cluster {{ $labels.cluster }} CPU usage is above 85%"
```

## Conclusion

Multi-cluster monitoring in Rancher scales from simple per-cluster Prometheus deployments to centralized Thanos-backed long-term metrics storage. Federation and Thanos ensure that all cluster metrics are queryable from a single Grafana instance, enabling cross-cluster dashboards and unified alerting. Start with per-cluster monitoring and graduate to Thanos as your cluster count and metric retention requirements grow.
