# How to Handle Auto-Scaling with Istio

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Istio, Auto-Scaling, HPA, Kubernetes, Performance, Metrics

Description: How to configure Kubernetes Horizontal Pod Autoscaler to work correctly with Istio, including using Istio metrics for scaling decisions.

---

Auto-scaling with the Kubernetes Horizontal Pod Autoscaler (HPA) works out of the box with Istio, but there are nuances you should be aware of. The sidecar proxy affects resource metrics, and Istio's telemetry data can actually be used to make smarter scaling decisions based on request rates and latencies instead of just CPU usage.

## Basic HPA with Istio Sidecars

A standard HPA based on CPU works with Istio, but the CPU metrics include both your application and the Envoy sidecar. This means scaling thresholds need to account for the sidecar's resource consumption.

```yaml
apiVersion: autoscaling/v2
kind: HorizontalPodAutoscaler
metadata:
  name: my-service-hpa
  namespace: default
spec:
  scaleTargetRef:
    apiVersion: apps/v1
    kind: Deployment
    name: my-service
  minReplicas: 2
  maxReplicas: 20
  metrics:
  - type: Resource
    resource:
      name: cpu
      target:
        type: Utilization
        averageUtilization: 70
  - type: Resource
    resource:
      name: memory
      target:
        type: Utilization
        averageUtilization: 80
```

The sidecar typically uses 50-100m CPU at idle and more under load. If your application requests 200m CPU and the sidecar requests 100m, the pod's total CPU request is 300m. The HPA calculates utilization against this total. So a 70% target means scaling happens when total pod CPU usage hits 210m, not when your app alone hits 140m.

## Accounting for Sidecar Resources

To make CPU-based scaling more predictable, explicitly set the sidecar's resource requests:

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: my-service
spec:
  template:
    metadata:
      annotations:
        sidecar.istio.io/proxyCPU: "100m"
        sidecar.istio.io/proxyMemory: "128Mi"
    spec:
      containers:
      - name: my-service
        image: my-service:latest
        resources:
          requests:
            cpu: 200m
            memory: 256Mi
          limits:
            cpu: 500m
            memory: 512Mi
```

With these values, you know the total pod CPU request is 300m (200m app + 100m sidecar). Set your HPA target accordingly.

## Scaling Based on Istio Metrics

CPU-based scaling is simple but not always the best signal. Istio provides rich request-level metrics that can be better indicators for scaling. You can use these through the Prometheus Adapter or KEDA.

### Using Prometheus Adapter

First, make sure Prometheus is scraping Istio metrics. Then install the Prometheus Adapter:

```bash
helm install prometheus-adapter prometheus-community/prometheus-adapter -n monitoring \
  -f prometheus-adapter-values.yaml
```

Configure custom metrics in `prometheus-adapter-values.yaml`:

```yaml
rules:
  custom:
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
      as: "istio_request_latency_p99"
    metricsQuery: 'histogram_quantile(0.99, sum(rate(<<.Series>>{<<.LabelMatchers>>}[2m])) by (le, <<.GroupBy>>))'
```

Then create an HPA that uses the custom metric:

```yaml
apiVersion: autoscaling/v2
kind: HorizontalPodAutoscaler
metadata:
  name: my-service-hpa
  namespace: default
spec:
  scaleTargetRef:
    apiVersion: apps/v1
    kind: Deployment
    name: my-service
  minReplicas: 2
  maxReplicas: 50
  metrics:
  - type: Object
    object:
      metric:
        name: istio_requests_per_second
      describedObject:
        apiVersion: v1
        kind: Service
        name: my-service
      target:
        type: Value
        value: 100
```

This scales based on request rate: when the service receives more than 100 requests per second, scale up.

### Using KEDA

KEDA (Kubernetes Event-Driven Autoscaler) provides more flexible scaling triggers, including Prometheus-based triggers:

```yaml
apiVersion: keda.sh/v1alpha1
kind: ScaledObject
metadata:
  name: my-service-scaler
  namespace: default
spec:
  scaleTargetRef:
    name: my-service
  pollingInterval: 15
  cooldownPeriod: 60
  minReplicaCount: 2
  maxReplicaCount: 50
  triggers:
  - type: prometheus
    metadata:
      serverAddress: http://prometheus.monitoring:9090
      metricName: istio_requests_total
      query: sum(rate(istio_requests_total{destination_service_name="my-service",destination_service_namespace="default",response_code!~"5.*"}[2m]))
      threshold: "100"
```

KEDA also supports scaling to zero, which is useful for serverless patterns.

## Handling Scale-Up Delays

When the HPA triggers a scale-up, new pods need time to start and have their sidecars configured. During this window, existing pods handle all the traffic. To smooth this out:

**Configure startup probes**: Make sure the HPA doesn't count pods as ready until both the application and the sidecar are healthy:

```yaml
spec:
  containers:
  - name: my-service
    startupProbe:
      httpGet:
        path: /healthz
        port: 8080
      failureThreshold: 30
      periodSeconds: 2
```

**Use preStop hooks**: Prevent pods from being terminated before they finish handling requests:

```yaml
spec:
  containers:
  - name: my-service
    lifecycle:
      preStop:
        exec:
          command: ["sleep", "10"]
```

**Configure PodDisruptionBudget**: Prevent too many pods from being removed at once during scale-down:

```yaml
apiVersion: policy/v1
kind: PodDisruptionBudget
metadata:
  name: my-service-pdb
  namespace: default
spec:
  minAvailable: 2
  selector:
    matchLabels:
      app: my-service
```

## HPA Behavior Configuration

Fine-tune how quickly the HPA scales up and down:

```yaml
apiVersion: autoscaling/v2
kind: HorizontalPodAutoscaler
metadata:
  name: my-service-hpa
  namespace: default
spec:
  scaleTargetRef:
    apiVersion: apps/v1
    kind: Deployment
    name: my-service
  minReplicas: 2
  maxReplicas: 50
  behavior:
    scaleUp:
      stabilizationWindowSeconds: 30
      policies:
      - type: Percent
        value: 100
        periodSeconds: 60
      - type: Pods
        value: 5
        periodSeconds: 60
      selectPolicy: Max
    scaleDown:
      stabilizationWindowSeconds: 300
      policies:
      - type: Percent
        value: 10
        periodSeconds: 60
      selectPolicy: Min
  metrics:
  - type: Resource
    resource:
      name: cpu
      target:
        type: Utilization
        averageUtilization: 70
```

The `scaleUp` section allows aggressive scaling (up to 100% increase or 5 pods, whichever is more, per minute). The `scaleDown` section is conservative (max 10% decrease per minute with a 5-minute stabilization window). This prevents flapping.

## Circuit Breaking and Auto-Scaling Interaction

Istio's circuit breaking can interact with auto-scaling in unexpected ways. If the circuit breaker trips because of too many pending requests, it returns 503 errors. These 503s might not trigger a scale-up if your HPA is based on CPU rather than request metrics.

Configure your DestinationRule's connection limits with your HPA in mind:

```yaml
apiVersion: networking.istio.io/v1
kind: DestinationRule
metadata:
  name: my-service
spec:
  host: my-service
  trafficPolicy:
    connectionPool:
      http:
        http1MaxPendingRequests: 100
        http2MaxRequests: 1000
    outlierDetection:
      consecutive5xxErrors: 10
      interval: 30s
      baseEjectionTime: 30s
```

Set the circuit breaker thresholds high enough that the HPA has time to scale before the breaker trips.

## Monitoring Auto-Scaling

Keep an eye on scaling events:

```bash
kubectl describe hpa my-service-hpa -n default
```

The events section shows when and why scaling decisions were made. Also check the metrics the HPA is using:

```bash
kubectl get hpa my-service-hpa -n default -o yaml
```

Look at the `status.currentMetrics` field to see the actual values the HPA sees versus the targets.

Auto-scaling with Istio works well once you account for the sidecar's resource usage and take advantage of Istio's request-level metrics. The combination of Istio's observability with Kubernetes' auto-scaling gives you a responsive system that scales based on real traffic patterns, not just CPU spikes.
