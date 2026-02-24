# How to Configure Horizontal Pod Autoscaler for Istio

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Istio, HPA, Autoscaling, Kubernetes, Performance

Description: How to set up Horizontal Pod Autoscaler for Istio control plane components and application workloads using Istio metrics for scaling decisions.

---

Autoscaling is critical for keeping your Istio mesh responsive under varying load. The Horizontal Pod Autoscaler (HPA) can scale both the Istio control plane itself and your application workloads. What makes Istio interesting is that it generates rich traffic metrics that you can use as custom scaling signals, going beyond basic CPU and memory scaling.

This guide covers how to configure HPA for Istio components and how to use Istio metrics to drive application autoscaling.

## Scaling the Istio Control Plane

### Scaling Istiod

Istiod can run as multiple replicas. HPA ensures you have enough instances to handle the configuration push load:

```yaml
apiVersion: autoscaling/v2
kind: HorizontalPodAutoscaler
metadata:
  name: istiod
  namespace: istio-system
spec:
  scaleTargetRef:
    apiVersion: apps/v1
    kind: Deployment
    name: istiod
  minReplicas: 2
  maxReplicas: 5
  metrics:
  - type: Resource
    resource:
      name: cpu
      target:
        type: Utilization
        averageUtilization: 80
  - type: Resource
    resource:
      name: memory
      target:
        type: Utilization
        averageUtilization: 75
  behavior:
    scaleUp:
      stabilizationWindowSeconds: 60
      policies:
      - type: Pods
        value: 1
        periodSeconds: 120
    scaleDown:
      stabilizationWindowSeconds: 300
      policies:
      - type: Pods
        value: 1
        periodSeconds: 300
```

The `behavior` section is important. You do not want istiod to scale up and down rapidly because each new istiod instance needs to connect to all sidecars and sync configuration. Scale up slowly and scale down even more slowly.

If you are using the IstioOperator, configure HPA there:

```yaml
apiVersion: install.istio.io/v1alpha1
kind: IstioOperator
spec:
  components:
    pilot:
      k8s:
        hpaSpec:
          minReplicas: 2
          maxReplicas: 5
          metrics:
          - type: Resource
            resource:
              name: cpu
              target:
                type: Utilization
                averageUtilization: 80
```

### Scaling the Ingress Gateway

The ingress gateway benefits more from HPA because traffic patterns are often bursty:

```yaml
apiVersion: autoscaling/v2
kind: HorizontalPodAutoscaler
metadata:
  name: istio-ingressgateway
  namespace: istio-system
spec:
  scaleTargetRef:
    apiVersion: apps/v1
    kind: Deployment
    name: istio-ingressgateway
  minReplicas: 3
  maxReplicas: 20
  metrics:
  - type: Resource
    resource:
      name: cpu
      target:
        type: Utilization
        averageUtilization: 70
  behavior:
    scaleUp:
      stabilizationWindowSeconds: 30
      policies:
      - type: Percent
        value: 100
        periodSeconds: 60
    scaleDown:
      stabilizationWindowSeconds: 300
      policies:
      - type: Pods
        value: 2
        periodSeconds: 120
```

The ingress gateway can scale up more aggressively (doubling every minute) because new gateway instances start handling traffic quickly. Scale down is conservative to avoid dropping connections.

## Using Istio Metrics for Application HPA

This is where things get really useful. Instead of scaling on CPU alone, you can scale based on actual request metrics like requests per second or request latency.

### Prerequisites

You need Prometheus Adapter or KEDA to expose Istio metrics to the HPA controller.

#### Using Prometheus Adapter

Install Prometheus Adapter and configure it to expose Istio metrics:

```yaml
# prometheus-adapter-config.yaml
apiVersion: v1
kind: ConfigMap
metadata:
  name: adapter-config
  namespace: monitoring
data:
  config.yaml: |
    rules:
    - seriesQuery: 'istio_requests_total{destination_service_namespace!="",destination_service_name!=""}'
      resources:
        overrides:
          destination_service_namespace:
            resource: namespace
          destination_service_name:
            resource: service
      name:
        matches: "^(.*)_total$"
        as: "${1}_per_second"
      metricsQuery: 'sum(rate(<<.Series>>{<<.LabelMatchers>>}[2m])) by (<<.GroupBy>>)'
    - seriesQuery: 'istio_request_duration_milliseconds_bucket{destination_service_namespace!=""}'
      resources:
        overrides:
          destination_service_namespace:
            resource: namespace
          destination_service_name:
            resource: service
      name:
        as: "istio_request_p99_latency"
      metricsQuery: 'histogram_quantile(0.99, sum(rate(<<.Series>>{<<.LabelMatchers>>}[2m])) by (le, <<.GroupBy>>))'
```

### Scaling on Requests Per Second

```yaml
apiVersion: autoscaling/v2
kind: HorizontalPodAutoscaler
metadata:
  name: orders-api-hpa
  namespace: api-services
spec:
  scaleTargetRef:
    apiVersion: apps/v1
    kind: Deployment
    name: orders-api
  minReplicas: 3
  maxReplicas: 30
  metrics:
  - type: Object
    object:
      metric:
        name: istio_requests_per_second
      describedObject:
        apiVersion: v1
        kind: Service
        name: orders-api
      target:
        type: Value
        value: 100
  behavior:
    scaleUp:
      stabilizationWindowSeconds: 30
      policies:
      - type: Percent
        value: 50
        periodSeconds: 60
    scaleDown:
      stabilizationWindowSeconds: 300
      policies:
      - type: Pods
        value: 2
        periodSeconds: 120
```

This scales the orders-api when the requests per second per pod exceeds 100.

### Scaling on Request Latency

```yaml
apiVersion: autoscaling/v2
kind: HorizontalPodAutoscaler
metadata:
  name: orders-api-latency-hpa
  namespace: api-services
spec:
  scaleTargetRef:
    apiVersion: apps/v1
    kind: Deployment
    name: orders-api
  minReplicas: 3
  maxReplicas: 30
  metrics:
  - type: Object
    object:
      metric:
        name: istio_request_p99_latency
      describedObject:
        apiVersion: v1
        kind: Service
        name: orders-api
      target:
        type: Value
        value: 500
```

This scales up when p99 latency exceeds 500 milliseconds, which is a great signal for scaling because it means the service is getting slow under load.

### Using KEDA with Istio Metrics

KEDA provides a more flexible way to use Prometheus metrics for scaling:

```yaml
apiVersion: keda.sh/v1alpha1
kind: ScaledObject
metadata:
  name: orders-api-scaledobject
  namespace: api-services
spec:
  scaleTargetRef:
    name: orders-api
  minReplicaCount: 3
  maxReplicaCount: 30
  triggers:
  - type: prometheus
    metadata:
      serverAddress: http://prometheus.monitoring.svc.cluster.local:9090
      metricName: istio_requests_per_second
      query: |
        sum(rate(istio_requests_total{destination_service_name="orders-api",destination_service_namespace="api-services"}[2m]))
      threshold: "300"
```

## Combining CPU and Istio Metrics

For the most robust autoscaling, combine traditional resource metrics with Istio traffic metrics:

```yaml
apiVersion: autoscaling/v2
kind: HorizontalPodAutoscaler
metadata:
  name: orders-api-combined-hpa
  namespace: api-services
spec:
  scaleTargetRef:
    apiVersion: apps/v1
    kind: Deployment
    name: orders-api
  minReplicas: 3
  maxReplicas: 30
  metrics:
  - type: Resource
    resource:
      name: cpu
      target:
        type: Utilization
        averageUtilization: 70
  - type: Object
    object:
      metric:
        name: istio_requests_per_second
      describedObject:
        apiVersion: v1
        kind: Service
        name: orders-api
      target:
        type: Value
        value: 100
```

When multiple metrics are specified, the HPA scales to the maximum number of replicas needed by any single metric. So if CPU says you need 5 replicas but request rate says you need 10, you get 10.

## Verifying HPA Is Working

```bash
# Check HPA status
kubectl get hpa -n api-services

# Detailed HPA status with current metrics
kubectl describe hpa orders-api-hpa -n api-services

# Check if custom metrics are available
kubectl get --raw /apis/custom.metrics.k8s.io/v1beta1 | jq '.resources[].name'
```

## Handling the Sidecar During Scale Events

When new pods are created by the HPA, the sidecar needs to be ready before the application receives traffic. Make sure you have the readiness annotation:

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: orders-api
spec:
  template:
    metadata:
      annotations:
        proxy.istio.io/config: |
          holdApplicationUntilProxyStarts: true
```

## Summary

HPA for Istio works at two levels: scaling the control plane (istiod and gateways) to handle mesh management load, and scaling application workloads using rich traffic metrics from Istio. For the control plane, scale conservatively with generous stabilization windows. For applications, Istio metrics like requests per second and p99 latency are better scaling signals than CPU because they directly reflect user experience. Combine resource metrics with Istio traffic metrics for the most reliable autoscaling behavior.
