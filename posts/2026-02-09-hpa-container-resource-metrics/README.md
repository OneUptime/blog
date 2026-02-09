# How to Configure HPA containerResource Metrics for Per-Container Scaling

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Kubernetes, Autoscaling, Containers

Description: Learn how to use HPA containerResource metrics to scale pods based on individual container resource utilization instead of aggregate pod metrics.

---

The standard HPA Resource metric type averages resource utilization across all containers in a pod. This works fine for single-container pods but creates problems when pods run multiple containers with different resource profiles. The containerResource metric type, introduced in Kubernetes 1.20, lets you scale based on specific container metrics within multi-container pods.

## The Multi-Container Scaling Problem

Consider a pod running both an application container and a sidecar proxy. The deployment YAML looks like this:

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: webapp-with-proxy
spec:
  replicas: 3
  selector:
    matchLabels:
      app: webapp
  template:
    metadata:
      labels:
        app: webapp
    spec:
      containers:
      - name: app
        image: webapp:v1.2
        resources:
          requests:
            cpu: 500m
            memory: 512Mi
          limits:
            cpu: 1000m
            memory: 1Gi
      - name: envoy-proxy
        image: envoyproxy/envoy:v1.28
        resources:
          requests:
            cpu: 100m
            memory: 128Mi
          limits:
            cpu: 200m
            memory: 256Mi
```

With traditional HPA Resource metrics, autoscaling calculates utilization by averaging across both containers. If the app container hits 90% CPU but the proxy uses only 20%, HPA sees approximately 55% utilization and might not scale when needed.

## Using containerResource Metrics

The containerResource metric type targets a specific container within the pod:

```yaml
apiVersion: autoscaling/v2
kind: HorizontalPodAutoscaler
metadata:
  name: webapp-hpa
  namespace: production
spec:
  scaleTargetRef:
    apiVersion: apps/v1
    kind: Deployment
    name: webapp-with-proxy
  minReplicas: 3
  maxReplicas: 30
  metrics:
  - type: ContainerResource
    containerResource:
      name: cpu
      container: app  # Target only the app container
      target:
        type: Utilization
        averageUtilization: 70
```

This HPA monitors CPU utilization of the `app` container specifically, ignoring the proxy sidecar. When the app container averages 70% CPU across all pods, HPA scales up.

## Scaling on Memory Per Container

Memory-based scaling works the same way:

```yaml
apiVersion: autoscaling/v2
kind: HorizontalPodAutoscaler
metadata:
  name: cache-memory-hpa
  namespace: production
spec:
  scaleTargetRef:
    apiVersion: apps/v1
    kind: Deployment
    name: cache-deployment
  minReplicas: 2
  maxReplicas: 20
  metrics:
  - type: ContainerResource
    containerResource:
      name: memory
      container: redis-cache
      target:
        type: Utilization
        averageUtilization: 80
```

This configuration scales when the redis-cache container uses 80% of its memory request across the pod fleet.

## Combining Multiple Container Metrics

Scale based on multiple containers in the same pod by adding multiple metric definitions:

```yaml
apiVersion: autoscaling/v2
kind: HorizontalPodAutoscaler
metadata:
  name: multi-container-hpa
  namespace: production
spec:
  scaleTargetRef:
    apiVersion: apps/v1
    kind: Deployment
    name: processing-pipeline
  minReplicas: 5
  maxReplicas: 50
  metrics:
  # Scale on processor container CPU
  - type: ContainerResource
    containerResource:
      name: cpu
      container: processor
      target:
        type: Utilization
        averageUtilization: 75
  # Also scale on cache container memory
  - type: ContainerResource
    containerResource:
      name: memory
      container: local-cache
      target:
        type: Utilization
        averageUtilization: 85
  # And monitor the sidecar metrics exporter
  - type: ContainerResource
    containerResource:
      name: cpu
      container: metrics-exporter
      target:
        type: Utilization
        averageUtilization: 60
```

HPA calculates desired replicas for each metric independently and uses the maximum value. This ensures scaling occurs when ANY container reaches its threshold.

## Using AverageValue Instead of Utilization

The Utilization target type scales based on percentage of requested resources. Use AverageValue for absolute resource amounts:

```yaml
apiVersion: autoscaling/v2
kind: HorizontalPodAutoscaler
metadata:
  name: absolute-value-hpa
spec:
  scaleTargetRef:
    apiVersion: apps/v1
    kind: Deployment
    name: data-processor
  minReplicas: 3
  maxReplicas: 25
  metrics:
  - type: ContainerResource
    containerResource:
      name: cpu
      container: processor
      target:
        type: AverageValue
        averageValue: 800m  # Scale when average CPU exceeds 800 millicores
  - type: ContainerResource
    containerResource:
      name: memory
      container: processor
      target:
        type: AverageValue
        averageValue: 1536Mi  # Scale when average memory exceeds 1.5Gi
```

This approach works well when you want consistent resource consumption per pod regardless of resource requests.

## Scaling Init Containers vs Runtime Containers

Init containers run before the main containers start. They don't consume resources during normal operation, so containerResource metrics ignore them. HPA only tracks containers listed in the pod's `spec.containers` field, not `spec.initContainers`.

If you need to make decisions based on init container behavior, use custom metrics instead:

```yaml
apiVersion: autoscaling/v2
kind: HorizontalPodAutoscaler
metadata:
  name: custom-init-aware-hpa
spec:
  scaleTargetRef:
    apiVersion: apps/v1
    kind: Deployment
    name: batch-processor
  minReplicas: 1
  maxReplicas: 10
  metrics:
  - type: Pods
    pods:
      metric:
        name: init_failures_per_minute
      target:
        type: AverageValue
        averageValue: "5"
```

## Troubleshooting Container Resource Metrics

Check HPA status to see current container utilization:

```bash
kubectl get hpa webapp-hpa -o yaml
```

Look for the `currentMetrics` section:

```yaml
status:
  currentMetrics:
  - containerResource:
      container: app
      current:
        averageUtilization: 65
        averageValue: 325m
      name: cpu
    type: ContainerResource
  currentReplicas: 3
  desiredReplicas: 3
```

If metrics show `<unknown>`, verify:

1. The container name matches exactly (case-sensitive)
2. Metrics Server is running and healthy
3. The container has resource requests defined

Check Metrics Server:

```bash
kubectl get deployment metrics-server -n kube-system
kubectl top pods -n production
```

View HPA events for scaling decisions:

```bash
kubectl describe hpa webapp-hpa
```

Look for events like:

```
Events:
  Type    Reason             Age   From                       Message
  ----    ------             ----  ----                       -------
  Normal  SuccessfulRescale  2m    horizontal-pod-autoscaler  New size: 5; reason: cpu resource utilization (percentage of request) above target
```

## Best Practices for Container Resource Scaling

**Define resource requests**: ContainerResource metrics require requests to calculate utilization percentages. Always set CPU and memory requests for containers you want to autoscale.

**Match thresholds to workload patterns**: Main application containers often tolerate 70-80% utilization. Sidecar proxies and logging agents might need lower thresholds (50-60%) since they handle bursty traffic.

**Use specific container names**: Don't scale based on sidecar containers unless their resource usage directly indicates application load. Focus metrics on containers that perform the actual work.

**Combine with pod-level metrics**: For comprehensive scaling, combine containerResource metrics with custom or external metrics:

```yaml
metrics:
- type: ContainerResource
  containerResource:
    name: cpu
    container: api-server
    target:
      type: Utilization
      averageUtilization: 70
- type: Pods
  pods:
    metric:
      name: http_requests_per_second
    target:
      type: AverageValue
      averageValue: "1000"
```

**Monitor actual scaling behavior**: Track whether the right container metrics trigger scaling. Use Prometheus queries to correlate scaling events with container resource usage:

```promql
# Container CPU usage over time
rate(container_cpu_usage_seconds_total{container="app",pod=~"webapp-.*"}[5m])

# Scaling events
kube_hpa_status_current_replicas{hpa="webapp-hpa"}
```

**Set appropriate stabilization windows**: Container metrics can fluctuate rapidly. Use the behavior field to prevent thrashing:

```yaml
spec:
  behavior:
    scaleDown:
      stabilizationWindowSeconds: 300  # Wait 5 minutes before scaling down
    scaleUp:
      stabilizationWindowSeconds: 0    # Scale up immediately
```

The containerResource metric type provides precise control over autoscaling in multi-container pods. By targeting specific containers, you ensure scaling decisions reflect the actual workload, not averaged metrics that might hide resource pressure in critical components.
