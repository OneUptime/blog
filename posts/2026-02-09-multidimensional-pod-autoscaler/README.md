# How to Use Multidimensional Pod Autoscaler for Combined CPU and Memory Scaling

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Kubernetes, Autoscaling, Performance

Description: Learn how to implement multidimensional pod autoscaling that considers both CPU and memory metrics simultaneously for more intelligent scaling decisions.

---

Standard Horizontal Pod Autoscaler (HPA) in Kubernetes scales based on a single metric or uses the maximum value when multiple metrics are configured. This approach misses workloads that need balanced CPU and memory scaling. The Multidimensional Pod Autoscaler (MPA), part of the KEDA project and available as an enhanced HPA strategy, evaluates multiple resource dimensions together.

## Why Multidimensional Autoscaling Matters

Consider a caching service that uses memory for cache storage and CPU for request processing. During traffic spikes, both metrics rise together. With standard HPA using max logic:

- If CPU reaches 80% but memory is at 40%, HPA scales up based on CPU
- New pods come online but don't help much because the bottleneck shifts to memory
- Memory climbs to 75% while CPU drops to 50%
- HPA might scale down due to low CPU, worsening the memory pressure

Multidimensional autoscaling solves this by considering resource utilization patterns across dimensions.

## Installing KEDA for Advanced Scaling

KEDA extends Kubernetes with event-driven autoscaling capabilities including multidimensional scaling:

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

## Configuring Multidimensional ScaledObject

KEDA uses ScaledObject resources to define autoscaling behavior. Here's a multidimensional configuration for a web application:

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
            rate(container_cpu_usage_seconds_total{pod=~"api-.*"}[2m]) /
            on(pod) group_left() kube_pod_container_resource_limits{resource="cpu",pod=~"api-.*"}
          ) +
          (
            container_memory_working_set_bytes{pod=~"api-.*"} /
            on(pod) group_left() kube_pod_container_resource_limits{resource="memory",pod=~"api-.*"}
          )
        ) / 2
      threshold: "0.7"  # Scale when average utilization crosses 70%
      activationThreshold: "0.5"  # Activate scaling at 50%
```

This query computes the average of CPU and memory utilization ratios. Both dimensions contribute equally to scaling decisions.

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
        (
          0.3 * (
            rate(container_cpu_usage_seconds_total{pod=~"redis-cache-.*"}[2m]) /
            on(pod) group_left() kube_pod_container_resource_limits{resource="cpu",pod=~"redis-cache-.*"}
          )
        ) +
        (
          0.7 * (
            container_memory_working_set_bytes{pod=~"redis-cache-.*"} /
            on(pod) group_left() kube_pod_container_resource_limits{resource="memory",pod=~"redis-cache-.*"}
          )
        )
      threshold: "0.75"
      activationThreshold: "0.6"
```

## Using Native HPA with Multiple Metrics

Kubernetes HPA v2 supports multiple metrics with different combination strategies. Configure behavior using the metricType field:

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

For true multidimensional control, create a custom metrics adapter:

```python
# multidim_metrics_server.py
from kubernetes import client, config
import prometheus_api_client
from http.server import HTTPServer, BaseHTTPRequestHandler
import json

class MetricsHandler(BaseHTTPRequestHandler):
    def do_GET(self):
        # Parse request for pod metrics
        namespace = self.parse_namespace()
        pod_selector = self.parse_selector()

        # Query Prometheus for CPU and memory
        prom = prometheus_api_client.PrometheusConnect(url="http://prometheus:9090")

        cpu_query = f'rate(container_cpu_usage_seconds_total{{namespace="{namespace}",pod=~"{pod_selector}"}}[2m])'
        mem_query = f'container_memory_working_set_bytes{{namespace="{namespace}",pod=~"{pod_selector}"}}'

        cpu_data = prom.custom_query(cpu_query)
        mem_data = prom.custom_query(mem_query)

        # Compute multidimensional score
        score = self.compute_multidim_score(cpu_data, mem_data)

        # Return custom metric
        response = {
            "kind": "MetricValueList",
            "apiVersion": "custom.metrics.k8s.io/v1beta1",
            "metadata": {},
            "items": [{
                "describedObject": {
                    "kind": "Pod",
                    "namespace": namespace,
                    "name": pod_selector
                },
                "metricName": "multidimensional_utilization",
                "value": f"{score}"
            }]
        }

        self.send_response(200)
        self.send_header('Content-Type', 'application/json')
        self.end_headers()
        self.wfile.write(json.dumps(response).encode())

    def compute_multidim_score(self, cpu_data, mem_data):
        # Normalize both metrics to 0-1 range
        cpu_normalized = self.normalize_cpu(cpu_data)
        mem_normalized = self.normalize_memory(mem_data)

        # Combine using geometric mean (prevents overscaling if one dimension is low)
        score = (cpu_normalized * mem_normalized) ** 0.5

        return score

# Start server
server = HTTPServer(('', 8080), MetricsHandler)
server.serve_forever()
```

Deploy this as a service and configure HPA to use it:

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
kubectl describe scaledobject webapp-scaler

# View scaling events
kubectl get events --field-selector involvedObject.name=webapp-deployment --sort-by='.lastTimestamp'
```

Create a Prometheus alert for scaling anomalies:

```yaml
groups:
- name: autoscaling
  rules:
  - alert: FrequentMultidimensionalScaling
    expr: |
      rate(keda_scaledobject_scaling_total[10m]) > 0.5
    for: 15m
    annotations:
      summary: "ScaledObject {{ $labels.scaledobject }} scaling too frequently"
      description: "Multidimensional autoscaler triggering more than 5 times per 10 minutes"
```

## Best Practices

**Choose appropriate combination logic**: Use max (OR logic) for safety-critical systems where any dimension hitting threshold should trigger scaling. Use geometric mean or average (AND logic) for cost optimization where both dimensions should be stressed before scaling.

**Set realistic thresholds**: When combining metrics, lower individual thresholds slightly. A 70% composite score from two 85% dimensions still indicates resource pressure.

**Test under load**: Simulate traffic patterns that stress different dimensions independently and together. Verify scaling behavior matches expectations.

**Monitor cost impact**: Multidimensional scaling can be more aggressive than single-metric HPA. Track cluster costs and adjust weights or thresholds if over-provisioning occurs.

Multidimensional autoscaling provides nuanced control over scaling decisions by considering resource dimensions together rather than independently. This results in better resource utilization and more stable application performance.
