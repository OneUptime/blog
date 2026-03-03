# How to Configure Custom Metrics for Autoscaling on Talos

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Talos Linux, Kubernetes, Custom Metrics, Autoscaling, Prometheus, Monitoring

Description: Learn how to configure custom metrics for Kubernetes autoscaling on Talos Linux using Prometheus and the Prometheus Adapter.

---

Scaling on CPU and memory works for many applications, but sometimes you need to scale based on business-level metrics. Things like request queue depth, active connections, messages in a queue, or response latency are often better indicators of when your application needs more replicas. On Talos Linux, you can set up custom metrics for the Horizontal Pod Autoscaler using Prometheus and the Prometheus Adapter.

This guide walks through the entire pipeline: exposing custom metrics from your application, collecting them with Prometheus, making them available to Kubernetes through the custom metrics API, and using them in HPA configurations.

## The Custom Metrics Pipeline

The flow of custom metrics in Kubernetes looks like this:

1. Your application exposes metrics (typically via a `/metrics` endpoint in Prometheus format)
2. Prometheus scrapes and stores those metrics
3. The Prometheus Adapter reads metrics from Prometheus and serves them through the Kubernetes custom metrics API
4. The HPA queries the custom metrics API and makes scaling decisions

## Prerequisites

You will need:
- A Talos Linux cluster with `kubectl` configured
- Helm installed for deploying Prometheus and the adapter
- An application that exposes Prometheus metrics

## Step 1: Deploy Prometheus

If you do not already have Prometheus running, deploy it using the kube-prometheus-stack:

```bash
# Add the Prometheus community Helm repo
helm repo add prometheus-community https://prometheus-community.github.io/helm-charts
helm repo update

# Install Prometheus
helm install prometheus prometheus-community/kube-prometheus-stack \
  --namespace monitoring \
  --create-namespace \
  --set prometheus.prometheusSpec.serviceMonitorSelectorNilUsesHelmValues=false
```

```bash
# Verify Prometheus is running
kubectl get pods -n monitoring | grep prometheus
```

## Step 2: Deploy an Application with Custom Metrics

Let us create a sample application that exposes custom Prometheus metrics:

```yaml
# custom-metrics-app.yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: webapp
  labels:
    app: webapp
spec:
  replicas: 2
  selector:
    matchLabels:
      app: webapp
  template:
    metadata:
      labels:
        app: webapp
      annotations:
        prometheus.io/scrape: "true"
        prometheus.io/port: "8080"
        prometheus.io/path: "/metrics"
    spec:
      containers:
      - name: webapp
        image: webapp:latest
        ports:
        - containerPort: 8080
          name: http
        resources:
          requests:
            cpu: "100m"
            memory: "128Mi"
---
apiVersion: v1
kind: Service
metadata:
  name: webapp
  labels:
    app: webapp
spec:
  selector:
    app: webapp
  ports:
  - port: 80
    targetPort: 8080
    name: http
```

If you are using the kube-prometheus-stack, create a ServiceMonitor instead of relying on annotations:

```yaml
# service-monitor.yaml
apiVersion: monitoring.coreos.com/v1
kind: ServiceMonitor
metadata:
  name: webapp-monitor
  namespace: default
  labels:
    release: prometheus
spec:
  selector:
    matchLabels:
      app: webapp
  endpoints:
  - port: http
    interval: 15s
    path: /metrics
```

```bash
kubectl apply -f custom-metrics-app.yaml
kubectl apply -f service-monitor.yaml
```

## Step 3: Install the Prometheus Adapter

The Prometheus Adapter bridges between Prometheus and the Kubernetes custom metrics API:

```bash
# Install Prometheus Adapter
helm install prometheus-adapter prometheus-community/prometheus-adapter \
  --namespace monitoring \
  --set prometheus.url=http://prometheus-kube-prometheus-prometheus.monitoring.svc \
  --set prometheus.port=9090
```

## Step 4: Configure Metric Rules

The Prometheus Adapter needs rules that tell it how to map Prometheus metrics to the Kubernetes custom metrics API. Create a custom configuration:

```yaml
# prometheus-adapter-values.yaml
prometheus:
  url: http://prometheus-kube-prometheus-prometheus.monitoring.svc
  port: 9090

rules:
  default: false
  custom:
  # Map http_requests_total to a per-second rate
  - seriesQuery: 'http_requests_total{namespace!="",pod!=""}'
    resources:
      overrides:
        namespace:
          resource: namespace
        pod:
          resource: pod
    name:
      matches: "^(.*)_total$"
      as: "${1}_per_second"
    metricsQuery: 'sum(rate(<<.Series>>{<<.LabelMatchers>>}[2m])) by (<<.GroupBy>>)'

  # Map active connections gauge
  - seriesQuery: 'http_active_connections{namespace!="",pod!=""}'
    resources:
      overrides:
        namespace:
          resource: namespace
        pod:
          resource: pod
    name:
      matches: "^(.*)"
      as: "${1}"
    metricsQuery: 'sum(<<.Series>>{<<.LabelMatchers>>}) by (<<.GroupBy>>)'

  # Map request queue depth
  - seriesQuery: 'request_queue_length{namespace!="",pod!=""}'
    resources:
      overrides:
        namespace:
          resource: namespace
        pod:
          resource: pod
    name:
      matches: "^(.*)"
      as: "${1}"
    metricsQuery: 'avg(<<.Series>>{<<.LabelMatchers>>}) by (<<.GroupBy>>)'

  # Map response latency percentile
  - seriesQuery: 'http_request_duration_seconds_bucket{namespace!="",pod!=""}'
    resources:
      overrides:
        namespace:
          resource: namespace
        pod:
          resource: pod
    name:
      as: "http_request_duration_seconds_p95"
    metricsQuery: 'histogram_quantile(0.95, sum(rate(<<.Series>>{<<.LabelMatchers>>}[5m])) by (<<.GroupBy>>, le))'
```

```bash
# Upgrade the Prometheus Adapter with custom rules
helm upgrade prometheus-adapter prometheus-community/prometheus-adapter \
  --namespace monitoring \
  -f prometheus-adapter-values.yaml
```

## Step 5: Verify Custom Metrics Are Available

```bash
# Check that the custom metrics API is registered
kubectl get apiservices | grep custom.metrics

# List available custom metrics
kubectl get --raw /apis/custom.metrics.k8s.io/v1beta1 | python3 -m json.tool

# Query a specific metric for pods
kubectl get --raw "/apis/custom.metrics.k8s.io/v1beta1/namespaces/default/pods/*/http_requests_per_second" | python3 -m json.tool
```

If you see your metrics listed, the pipeline is working correctly.

## Step 6: Create HPA with Custom Metrics

Now create an HPA that scales based on your custom metrics:

```yaml
# hpa-custom-metrics.yaml
apiVersion: autoscaling/v2
kind: HorizontalPodAutoscaler
metadata:
  name: webapp-hpa
  namespace: default
spec:
  scaleTargetRef:
    apiVersion: apps/v1
    kind: Deployment
    name: webapp
  minReplicas: 2
  maxReplicas: 20
  metrics:
  # Scale based on requests per second per pod
  - type: Pods
    pods:
      metric:
        name: http_requests_per_second
      target:
        type: AverageValue
        averageValue: "100"
  behavior:
    scaleUp:
      stabilizationWindowSeconds: 30
      policies:
      - type: Pods
        value: 4
        periodSeconds: 60
    scaleDown:
      stabilizationWindowSeconds: 300
      policies:
      - type: Pods
        value: 2
        periodSeconds: 60
```

```bash
kubectl apply -f hpa-custom-metrics.yaml

# Check the HPA status
kubectl get hpa webapp-hpa
kubectl describe hpa webapp-hpa
```

## Scaling on Multiple Custom Metrics

You can combine multiple custom metrics in a single HPA:

```yaml
# hpa-multi-custom.yaml
apiVersion: autoscaling/v2
kind: HorizontalPodAutoscaler
metadata:
  name: webapp-hpa-multi
spec:
  scaleTargetRef:
    apiVersion: apps/v1
    kind: Deployment
    name: webapp
  minReplicas: 2
  maxReplicas: 30
  metrics:
  # Scale on request rate
  - type: Pods
    pods:
      metric:
        name: http_requests_per_second
      target:
        type: AverageValue
        averageValue: "100"
  # Also consider active connections
  - type: Pods
    pods:
      metric:
        name: http_active_connections
      target:
        type: AverageValue
        averageValue: "50"
  # And CPU as a safety net
  - type: Resource
    resource:
      name: cpu
      target:
        type: Utilization
        averageUtilization: 70
```

## Scaling on External Metrics

External metrics come from sources outside your pods, like a message queue:

```yaml
# Configure in prometheus-adapter values
rules:
  external:
  - seriesQuery: 'rabbitmq_queue_messages{queue="orders"}'
    resources: {}
    name:
      as: "rabbitmq_orders_queue_length"
    metricsQuery: 'rabbitmq_queue_messages{queue="orders"}'
```

```yaml
# hpa-external-metric.yaml
apiVersion: autoscaling/v2
kind: HorizontalPodAutoscaler
metadata:
  name: order-processor-hpa
spec:
  scaleTargetRef:
    apiVersion: apps/v1
    kind: Deployment
    name: order-processor
  minReplicas: 1
  maxReplicas: 10
  metrics:
  - type: External
    external:
      metric:
        name: rabbitmq_orders_queue_length
      target:
        type: Value
        value: "100"
```

## Debugging Custom Metrics

When things do not work, here is how to diagnose:

```bash
# Check if the adapter is running
kubectl get pods -n monitoring | grep adapter

# View adapter logs
kubectl logs -n monitoring -l app.kubernetes.io/name=prometheus-adapter --tail=100

# Verify Prometheus has the metric
kubectl port-forward -n monitoring svc/prometheus-kube-prometheus-prometheus 9090:9090 &
curl "http://localhost:9090/api/v1/query?query=http_requests_total"

# Check the custom metrics API directly
kubectl get --raw /apis/custom.metrics.k8s.io/v1beta1 | python3 -m json.tool

# Check HPA conditions for errors
kubectl describe hpa webapp-hpa | grep -A 10 "Conditions:"
```

Common issues:
- Prometheus is not scraping the target (check ServiceMonitor or scrape annotations)
- The adapter rules do not match the metric name (check seriesQuery patterns)
- The metric has no data for the requested pod/namespace labels
- The adapter cannot reach Prometheus (check the URL and port)

## Wrapping Up

Custom metrics autoscaling on Talos Linux gives you the power to scale based on what actually matters to your application. The setup involves a few moving parts - Prometheus for collection, the Prometheus Adapter for translation, and the HPA for scaling decisions - but once the pipeline is in place, adding new metrics is straightforward. Start with simple per-pod metrics like request rate, then expand to queue depths and latency percentiles as your scaling strategy matures.
