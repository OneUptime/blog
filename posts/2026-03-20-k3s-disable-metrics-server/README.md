# How to Disable Metrics Server in K3s

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: k3s, Kubernetes, Rancher, Metrics Server, Prometheus, Monitoring

Description: Learn how to disable K3s's built-in metrics-server and replace it with a custom Prometheus-based metrics stack.

## Introduction

K3s includes the Kubernetes Metrics Server by default, which provides the `kubectl top` commands and powers Horizontal Pod Autoscaler (HPA) CPU and memory metrics. Some teams prefer to disable the built-in metrics-server and replace it with a more comprehensive metrics solution like Prometheus with the Prometheus Adapter, which can serve custom HPA metrics and, when configured, the resource metrics API.

## Understanding the Metrics Server

The default K3s metrics-server:
- Collects CPU and memory metrics from kubelets
- Powers `kubectl top nodes` and `kubectl top pods`
- Provides the resource metrics API used by the Horizontal Pod Autoscaler (HPA) for CPU and memory metrics
- Is lightweight but limited to basic resource metrics

## Reasons to Replace the Metrics Server

1. You want custom HPA metrics (e.g., scale on request rate, queue depth)
2. You're deploying a full Prometheus stack and want a unified metrics source
3. You need historical metrics storage (Prometheus + Thanos/Cortex)
4. Resource constraints on very small nodes where every add-on matters

## Disabling the Metrics Server

### Before Installation

```bash
sudo mkdir -p /etc/rancher/k3s

sudo tee /etc/rancher/k3s/config.yaml > /dev/null <<EOF
token: "ClusterToken"
disable:
  - metrics-server
EOF

curl -sfL https://get.k3s.io | sudo sh -
```

### On an Existing Cluster

```bash
# On multi-server clusters, repeat this on each server node
sudo mkdir -p /etc/rancher/k3s/config.yaml.d

sudo tee /etc/rancher/k3s/config.yaml.d/disable-metrics-server.yaml > /dev/null <<EOF
disable:
  - metrics-server
EOF

sudo systemctl restart k3s

# Verify removal
kubectl -n kube-system get pods | grep metrics-server
# Should return empty
```

## Verifying Metrics Server is Removed

```bash
# Check no metrics-server pods are running
kubectl -n kube-system get pods | grep metrics-server

# Verify kubectl top no longer works (expected)
kubectl top nodes
# Error: Metrics API not available

# Check APIService is gone
kubectl get apiservice | grep 'v1beta1.metrics.k8s.io'
# v1beta1.metrics.k8s.io should be gone
```

## Option 1: Install Metrics Server Manually

If you just want to customize the metrics-server (not replace it):

```bash
# Install with custom settings
helm repo add metrics-server https://kubernetes-sigs.github.io/metrics-server/
helm repo update

helm install metrics-server metrics-server/metrics-server \
    --namespace kube-system \
    --set args[0]=--kubelet-preferred-address-types=InternalIP \
    --set args[1]=--kubelet-insecure-tls  # Only for development
```

### For Production

```bash
helm install metrics-server metrics-server/metrics-server \
    --namespace kube-system \
    --set args[0]=--kubelet-preferred-address-types=InternalIP \
    --set apiService.insecureSkipTLSVerify=false \
    --set tls.type=helm
```

In production, avoid `--kubelet-insecure-tls`; use trusted kubelet serving certificates instead.

## Option 2: Install Full Prometheus Stack

For production monitoring, deploy kube-prometheus-stack:

```bash
# Add the Prometheus community Helm charts
helm repo add prometheus-community https://prometheus-community.github.io/helm-charts
helm repo update

# Install kube-prometheus-stack
helm install prometheus prometheus-community/kube-prometheus-stack \
    --namespace monitoring \
    --create-namespace \
    --set grafana.adminPassword=admin123 \
    --set prometheus.prometheusSpec.retention=30d \
    --set prometheus.prometheusSpec.storageSpec.volumeClaimTemplate.spec.accessModes[0]=ReadWriteOnce \
    --set prometheus.prometheusSpec.storageSpec.volumeClaimTemplate.spec.resources.requests.storage=20Gi
```

This stack does not install Prometheus Adapter; install it separately if you want HPA or `kubectl top` backed by Prometheus.

## Option 3: Install Prometheus Adapter for HPA

If you disabled metrics-server but need HPA to work with Prometheus-backed custom metrics, or want Prometheus to also serve resource metrics:

```bash
# After creating prometheus-adapter-values.yaml (shown below), install the Prometheus Adapter
helm install prometheus-adapter prometheus-community/prometheus-adapter \
    --namespace monitoring \
    -f prometheus-adapter-values.yaml \
    --set prometheus.url=http://prometheus-operated.monitoring.svc.cluster.local \
    --set prometheus.port=9090

# Verify the API is registered
kubectl get apiservice | grep custom.metrics
kubectl get apiservice | grep 'v1beta1.metrics.k8s.io'  # Present when rules.resource is configured
```

### Configure Custom HPA Metrics

```yaml
# prometheus-adapter-values.yaml
# First define the adapter rules in a values file
rules:
  custom:
    - seriesQuery: 'http_requests_total{namespace!="",pod!=""}'
      resources:
        overrides:
          namespace: {resource: "namespace"}
          pod: {resource: "pod"}
      name:
        matches: "^(.*)_total"
        as: "${1}_per_second"
      metricsQuery: 'sum(rate(<<.Series>>{<<.LabelMatchers>>}[2m])) by (<<.GroupBy>>)'
  resource:
    cpu:
      containerQuery: |
        sum by (<<.GroupBy>>) (
          rate(container_cpu_usage_seconds_total{container!="",<<.LabelMatchers>>}[3m])
        )
      nodeQuery: |
        sum by (<<.GroupBy>>) (
          rate(node_cpu_seconds_total{mode!="idle",mode!="iowait",mode!="steal",<<.LabelMatchers>>}[3m])
        )
      resources:
        overrides:
          node:
            resource: node
          namespace:
            resource: namespace
          pod:
            resource: pod
      containerLabel: container
    memory:
      containerQuery: |
        round(sum by (<<.GroupBy>>) (
          avg_over_time(container_memory_working_set_bytes{container!="",<<.LabelMatchers>>}[3m])
        ))
      nodeQuery: |
        round(sum by (<<.GroupBy>>) (
          avg_over_time(node_memory_MemTotal_bytes{<<.LabelMatchers>>}[3m])
          -
          avg_over_time(node_memory_MemAvailable_bytes{<<.LabelMatchers>>}[3m])
        ))
      resources:
        overrides:
          node:
            resource: node
          namespace:
            resource: namespace
          pod:
            resource: pod
      containerLabel: container
    window: 3m
```

```yaml
# hpa-with-custom-metric.yaml
apiVersion: autoscaling/v2
kind: HorizontalPodAutoscaler
metadata:
  name: my-app-hpa
spec:
  scaleTargetRef:
    apiVersion: apps/v1
    kind: Deployment
    name: my-app
  minReplicas: 1
  maxReplicas: 10
  metrics:
    # Standard CPU metric (from metrics-server or prometheus-adapter when rules.resource is configured)
    - type: Resource
      resource:
        name: cpu
        target:
          type: Utilization
          averageUtilization: 50
    # Custom metric from Prometheus
    - type: Pods
      pods:
        metric:
          name: http_requests_per_second
        target:
          type: AverageValue
          averageValue: "100"
```

## Restoring kubectl top Functionality

After deploying the standalone metrics-server, or kube-prometheus-stack plus Prometheus Adapter with `rules.resource`:

```bash
# Test kubectl top with standalone metrics-server
kubectl top nodes
kubectl top pods --all-namespaces

# Or with prometheus-adapter
kubectl top nodes  # Works once prometheus-adapter serves metrics.k8s.io resource metrics
```

## Comparing Solutions

| Feature | K3s Metrics Server | Standalone Metrics Server | kube-prometheus-stack + Adapter |
|---------|--------------------|--------------------------|----------------------|
| kubectl top | Yes | Yes | Yes (with resource rules) |
| HPA (CPU/Memory) | Yes | Yes | Yes (with resource rules) |
| HPA (Custom) | No | No | Yes |
| Long-term storage | No | No | Yes |
| Dashboards | No | No | Grafana |
| Alerting | No | No | Alertmanager |
| Resource usage | Low | Low | Medium-High |

## Conclusion

Disabling K3s's built-in metrics-server makes sense when you're deploying a comprehensive Prometheus-based monitoring stack and want a unified metrics source. For basic `kubectl top` and HPA functionality without Prometheus, reinstalling the standalone metrics-server with Helm gives you full control over the configuration. For production clusters requiring custom HPA metrics, the Prometheus Adapter bridges Prometheus metrics to the Kubernetes custom metrics API, and can also serve resource metrics when `rules.resource` is configured.
