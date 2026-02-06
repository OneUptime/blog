# How to Troubleshoot Collector HPA Not Scaling Because the Custom Metrics API Server Is Not Registered

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: OpenTelemetry, HPA, Autoscaling, Custom Metrics

Description: Fix Horizontal Pod Autoscaler failures for the Collector caused by a missing or misconfigured custom metrics API server.

You set up a Horizontal Pod Autoscaler (HPA) for your OpenTelemetry Collector Deployment, targeting a custom metric like queue size or spans-per-second. But the HPA shows "unable to get metrics" and never scales. The problem is almost always that the custom metrics API server is not registered with the Kubernetes API aggregation layer.

## Understanding the Architecture

Kubernetes HPA can scale on three types of metrics:
1. **Resource metrics** (CPU, memory) - provided by metrics-server
2. **Custom metrics** - provided by a custom metrics adapter (like Prometheus Adapter)
3. **External metrics** - provided by an external metrics adapter

For OTel Collector-specific metrics, you need a custom metrics adapter that reads from wherever the Collector exports its internal metrics.

## Diagnosing the Issue

```bash
# Check HPA status
kubectl get hpa otel-collector-hpa -n observability

# Output might show:
# NAME                  REFERENCE                    TARGETS         MINPODS   MAXPODS
# otel-collector-hpa    Deployment/otel-collector    <unknown>/70    2         10

# The <unknown> means the HPA cannot fetch the metric

# Get detailed HPA conditions
kubectl describe hpa otel-collector-hpa -n observability

# Look for conditions like:
# Warning  FailedGetPodsMetric  unable to get metric otelcol_exporter_queue_size:
# the server could not find the requested resource (get pods.custom.metrics.k8s.io)
```

Check if the custom metrics API is registered:

```bash
# List API services
kubectl get apiservice | grep custom

# You should see:
# v1beta1.custom.metrics.k8s.io   prometheus-adapter/custom-metrics-apiserver   True   15d
# v1beta2.custom.metrics.k8s.io   prometheus-adapter/custom-metrics-apiserver   True   15d

# If these are missing, the custom metrics API is not available
```

## Step 1: Deploy Prometheus to Scrape Collector Metrics

First, make sure the Collector exposes internal metrics and Prometheus scrapes them:

```yaml
# Collector config - enable internal telemetry
service:
  telemetry:
    metrics:
      level: detailed
      address: "0.0.0.0:8888"
```

Add a ServiceMonitor or scrape config for Prometheus:

```yaml
apiVersion: monitoring.coreos.com/v1
kind: ServiceMonitor
metadata:
  name: otel-collector
  namespace: observability
spec:
  selector:
    matchLabels:
      app: otel-collector
  endpoints:
    - port: metrics
      interval: 15s
      path: /metrics
```

## Step 2: Install Prometheus Adapter

The Prometheus Adapter translates Prometheus metrics into the Kubernetes custom metrics API:

```bash
helm repo add prometheus-community https://prometheus-community.github.io/helm-charts
helm repo update

helm install prometheus-adapter prometheus-community/prometheus-adapter \
  --namespace monitoring \
  --set prometheus.url=http://prometheus-server.monitoring.svc \
  --set prometheus.port=9090
```

## Step 3: Configure the Adapter Rules

Tell the Prometheus Adapter which Collector metrics to expose:

```yaml
# prometheus-adapter-values.yaml
rules:
  custom:
    - seriesQuery: 'otelcol_exporter_queue_size{namespace!="",pod!=""}'
      resources:
        overrides:
          namespace: {resource: "namespace"}
          pod: {resource: "pod"}
      name:
        matches: "^(.*)$"
        as: "${1}"
      metricsQuery: 'avg(<<.Series>>{<<.LabelMatchers>>}) by (<<.GroupBy>>)'

    - seriesQuery: 'otelcol_receiver_accepted_spans_total{namespace!="",pod!=""}'
      resources:
        overrides:
          namespace: {resource: "namespace"}
          pod: {resource: "pod"}
      name:
        matches: "^(.*)_total$"
        as: "${1}_per_second"
      metricsQuery: 'rate(<<.Series>>{<<.LabelMatchers>>}[2m])'
```

Apply the updated configuration:

```bash
helm upgrade prometheus-adapter prometheus-community/prometheus-adapter \
  --namespace monitoring \
  -f prometheus-adapter-values.yaml
```

## Step 4: Verify the Custom Metrics API

```bash
# Check if the API service is now available
kubectl get apiservice v1beta1.custom.metrics.k8s.io

# Query the custom metrics API directly
kubectl get --raw "/apis/custom.metrics.k8s.io/v1beta1" | jq .

# Check for your specific metric
kubectl get --raw "/apis/custom.metrics.k8s.io/v1beta1/namespaces/observability/pods/*/otelcol_exporter_queue_size" | jq .
```

## Step 5: Create the HPA

Now create the HPA targeting the custom metric:

```yaml
apiVersion: autoscaling/v2
kind: HorizontalPodAutoscaler
metadata:
  name: otel-collector-hpa
  namespace: observability
spec:
  scaleTargetRef:
    apiVersion: apps/v1
    kind: Deployment
    name: otel-collector
  minReplicas: 2
  maxReplicas: 10
  metrics:
    - type: Pods
      pods:
        metric:
          name: otelcol_exporter_queue_size
        target:
          type: AverageValue
          averageValue: "100"  # Scale up when average queue size > 100
  behavior:
    scaleUp:
      stabilizationWindowSeconds: 60
      policies:
        - type: Pods
          value: 2
          periodSeconds: 60
    scaleDown:
      stabilizationWindowSeconds: 300
      policies:
        - type: Pods
          value: 1
          periodSeconds: 120
```

## Verifying Autoscaling

```bash
# Watch the HPA status
kubectl get hpa otel-collector-hpa -n observability -w

# The TARGETS column should now show actual values:
# NAME                  REFERENCE                    TARGETS    MINPODS   MAXPODS
# otel-collector-hpa    Deployment/otel-collector    45/100     2         10

# Check scaling events
kubectl describe hpa otel-collector-hpa -n observability | grep -A20 "Events"
```

The full chain must work: Collector exposes metrics, Prometheus scrapes them, Prometheus Adapter serves them via the custom metrics API, and the HPA reads from that API. A break in any link means the HPA shows "unknown" and never scales.
