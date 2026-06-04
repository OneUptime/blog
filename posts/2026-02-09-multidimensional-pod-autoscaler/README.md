# How to Use Multidimensional Pod Autoscaler for Combined CPU and Memory Scaling

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Kubernetes, Autoscaling, Performance

Description: Learn how to implement multidimensional pod autoscaling that considers both CPU and memory metrics simultaneously for more intelligent scaling decisions.

---

Standard Horizontal Pod Autoscaler (HPA) in Kubernetes scales based on a single metric or uses the maximum desired replica count when multiple metrics are configured. This approach misses workloads that need balanced CPU and memory scaling. KEDA can help by feeding HPA custom metrics, including composite metrics from Prometheus queries or KEDA scaling modifiers, so multiple resource dimensions can be evaluated together.

## Why Multidimensional Autoscaling Matters

Consider a caching service that uses memory for cache storage and CPU for request processing. During traffic spikes, both metrics rise together. With an HPA that only tracks CPU:

- If CPU reaches 80% but memory is at 40%, HPA scales up based on CPU
- New pods come online but don't help much because the bottleneck shifts to memory
- Memory climbs to 75% while CPU drops to 50%
- HPA might scale down due to lower CPU, worsening the memory pressure

Multidimensional autoscaling solves this by considering resource utilization patterns across dimensions.

## Installing KEDA for Advanced Scaling

KEDA extends Kubernetes with event-driven autoscaling capabilities and can expose custom metrics to HPA:

```bash
# Add KEDA Helm repository

helm repo add kedacore https://kedacore.github.io/charts
helm repo update

# Install KEDA
helm install keda kedacore/keda \
  --namespace keda \
  --create-namespace \
  --set watchNamespace="" \
  --set operator.replicaCount=1
```

Verify KEDA is running:

```bash
kubectl get pods -n keda
```

## Configuring a Multi-Metric ScaledObject

KEDA uses ScaledObject resources to define autoscaling behavior. Here's a multi-metric configuration for a web application:

```yaml
apiVersion: keda.sh/v1alpha1
kind: ScaledObject
metadata:
  name: webapp-scaler
  namespace: production
spec:
  scaleTargetRef:
    name: webapp-deployment
  minReplicaCount: 2
  maxReplicaCount: 20
  pollingInterval: 15
  cooldownPeriod: 60
  advanced:
    restoreToOriginalReplicaCount: false
    horizontalPodAutoscalerConfig:
      behavior:
        scaleDown:
          stabilizationWindowSeconds: 120
          policies:
          - type: Percent
            value: 50
            periodSeconds: 60
  triggers:
  - type: cpu
    metricType: Utilization
    metadata:
      value: "70"
  - type: memory
    metricType: Utilization
    metadata:
      value: "75"
```

This configuration scales when EITHER CPU exceeds 70% OR memory exceeds 75%. For true multidimensional logic, we need custom metrics.

## Implementing Combined Metric Logic

Create a Prometheus-based multidimensional scaler that computes a composite score:

```yaml
apiVersion: keda.sh/v1alpha1
kind: ScaledObject
metadata:
  name: api-multidim-scaler
  namespace: production
spec:
  scaleTargetRef:
    name: api-deployment
  minReplicaCount: 3
  maxReplicaCount: 30
  pollingInterval: 10
  triggers:
  - type: prometheus
    metadata:
      serverAddress: http://prometheus.monitoring:9090
      # Composite metric: average of normalized CPU and memory utilization
      query: |
        avg(
          (
            sum by (pod) (rate(container_cpu_usage_seconds_total{namespace="production",pod=~"api-.*",container!="",image!=""}[2m])) /
            sum by (pod) (kube_pod_container_resource_requests{namespace="production",pod=~"api-.*",resource="cpu",unit="core"})
          ) +
          (
            sum by (pod) (container_memory_working_set_bytes{namespace="production",pod=~"api-.*",container!="",image!=""}) /
            sum by (pod) (kube_pod_container_resource_requests{namespace="production",pod=~"api-.*",resource="memory",unit="byte"})
          )
        ) / 2
      threshold: "0.7"  # Scale when average utilization crosses 70%
      activationThreshold: "0.5"  # Activate scaling at 50%
```

This query returns one value: the average of per-pod CPU and memory utilization ratios against resource requests. Both dimensions contribute equally to scaling decisions.

## Weighted Multidimensional Scaling

For workloads where one resource matters more, apply weights:

```yaml
apiVersion: keda.sh/v1alpha1
kind: ScaledObject
metadata:
  name: cache-weighted-scaler
  namespace: production
spec:
  scaleTargetRef:
    name: redis-cache
  minReplicaCount: 2
  maxReplicaCount: 15
  triggers:
  - type: prometheus
    metadata:
      serverAddress: http://prometheus.monitoring:9090
      # Weighted: 30% CPU, 70% memory (memory matters more for cache)
      query: |
        avg(
          (
            0.3 * (
              sum by (pod) (rate(container_cpu_usage_seconds_total{namespace="production",pod=~"redis-cache-.*",container!="",image!=""}[2m])) /
              sum by (pod) (kube_pod_container_resource_requests{namespace="production",pod=~"redis-cache-.*",resource="cpu",unit="core"})
            )
          ) +
          (
            0.7 * (
              sum by (pod) (container_memory_working_set_bytes{namespace="production",pod=~"redis-cache-.*",container!="",image!=""}) /
              sum by (pod) (kube_pod_container_resource_requests{namespace="production",pod=~"redis-cache-.*",resource="memory",unit="byte"})
            )
          )
        )
      threshold: "0.75"
      activationThreshold: "0.6"
```

## Using Native HPA with Multiple Metrics

Kubernetes HPA v2 supports multiple metrics, but it does not support custom combination strategies between them. The `behavior` field controls scale-up and scale-down rate limits and stabilization, while HPA still calculates desired replicas for each metric independently and chooses the maximum:

```yaml
apiVersion: autoscaling/v2
kind: HorizontalPodAutoscaler
metadata:
  name: multimetric-hpa
  namespace: production
spec:
  scaleTargetRef:
    apiVersion: apps/v1
    kind: Deployment
    name: worker-deployment
  minReplicas: 2
  maxReplicas: 25
  metrics:
  # CPU metric
  - type: Resource
    resource:
      name: cpu
      target:
        type: Utilization
        averageUtilization: 70
  # Memory metric
  - type: Resource
    resource:
      name: memory
      target:
        type: Utilization
        averageUtilization: 75
  # Custom metric from Prometheus
  - type: Pods
    pods:
      metric:
        name: http_requests_per_second
      target:
        type: AverageValue
        averageValue: "1000"
  behavior:
    scaleUp:
      stabilizationWindowSeconds: 0
      policies:
      - type: Percent
        value: 100
        periodSeconds: 30
      - type: Pods
        value: 4
        periodSeconds: 30
      selectPolicy: Max
    scaleDown:
      stabilizationWindowSeconds: 120
      policies:
      - type: Percent
        value: 25
        periodSeconds: 60
      selectPolicy: Min
```

HPA computes desired replicas for each metric independently, then takes the maximum. This ensures no dimension is starved but may over-provision when only one dimension is stressed.

## Building Custom Multidimensional Logic

For true multidimensional control through native HPA, expose a composite metric through the Kubernetes Custom Metrics API. A plain HTTP service is not enough; HPA reads custom metrics from an aggregated API such as `custom.metrics.k8s.io`, commonly served by Prometheus Adapter:

```yaml
rules:
- seriesQuery: 'container_cpu_usage_seconds_total{namespace!="",pod!="",container!="",image!=""}'
  resources:
    overrides:
      namespace:
        resource: namespace
      pod:
        resource: pod
  name:
    as: "multidimensional_utilization"
  metricsQuery: |
    sqrt(
      (
        sum by (<<.GroupBy>>) (rate(container_cpu_usage_seconds_total{<<.LabelMatchers>>,container!="",image!=""}[2m])) /
        sum by (<<.GroupBy>>) (kube_pod_container_resource_requests{<<.LabelMatchers>>,resource="cpu",unit="core"})
      )
      *
      (
        sum by (<<.GroupBy>>) (container_memory_working_set_bytes{<<.LabelMatchers>>,container!="",image!=""}) /
        sum by (<<.GroupBy>>) (kube_pod_container_resource_requests{<<.LabelMatchers>>,resource="memory",unit="byte"})
      )
    )
```

Deploy the adapter and configure HPA to use the exposed pod metric:

```yaml
apiVersion: autoscaling/v2
kind: HorizontalPodAutoscaler
metadata:
  name: geometric-mean-hpa
spec:
  scaleTargetRef:
    apiVersion: apps/v1
    kind: Deployment
    name: app-deployment
  minReplicas: 2
  maxReplicas: 20
  metrics:
  - type: Pods
    pods:
      metric:
        name: multidimensional_utilization
      target:
        type: AverageValue
        averageValue: "0.7"
```

## Monitoring Multidimensional Scaling

Track scaling decisions and their triggers:

```bash
# Watch HPA status
kubectl get hpa -w

# Check KEDA ScaledObject status
kubectl describe scaledobject webapp-scaler -n production

# View scaling events
kubectl get events -n production --field-selector involvedObject.name=webapp-deployment --sort-by='.lastTimestamp'
```

Create a Prometheus alert for scaling anomalies:

```yaml
groups:
- name: autoscaling
  rules:
  - alert: FrequentMultidimensionalScaling
    expr: |
      changes(kube_deployment_status_replicas{namespace="production",deployment="webapp-deployment"}[10m]) > 5
    for: 15m
    annotations:
      summary: "Deployment {{ $labels.deployment }} scaling too frequently"
      description: "Deployment replica count changed more than 5 times in 10 minutes"
```

## Best Practices

**Choose appropriate combination logic**: Use max (OR logic) for safety-critical systems where any dimension hitting threshold should trigger scaling. Use geometric mean or average (AND logic) for cost optimization where both dimensions should be stressed before scaling.

**Set realistic thresholds**: When combining metrics, lower individual thresholds slightly. A 70% composite score from two 85% dimensions still indicates resource pressure.

**Test under load**: Simulate traffic patterns that stress different dimensions independently and together. Verify scaling behavior matches expectations.

**Monitor cost impact**: Multidimensional scaling can be more aggressive than single-metric HPA. Track cluster costs and adjust weights or thresholds if over-provisioning occurs.

Multidimensional autoscaling provides nuanced control over scaling decisions by considering resource dimensions together rather than independently. This results in better resource utilization and more stable application performance.
