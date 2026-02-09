# How to Implement HPA with Object Metrics for Queue-Based Scaling

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Kubernetes, HPA, Queue

Description: Implement Horizontal Pod Autoscaler with object metrics to scale worker pods based on message queue depth and other Kubernetes object metrics for event-driven workloads.

---

Object metrics in HPA allow scaling based on metrics associated with Kubernetes objects like Services, Ingresses, or custom resources. This differs from pod metrics which average across all pods, or external metrics which come from outside Kubernetes. Object metrics are particularly useful for scaling workers based on queue depth stored in ConfigMaps, scaling backends based on Ingress traffic, or scaling based on custom resource status.

The most common use case is queue-based autoscaling where you monitor the number of pending messages in a queue and scale workers to process them. Instead of scaling when worker CPU is high, you scale proactively based on how much work is waiting. This prevents queue backlog from growing while ensuring you don't run excess workers when the queue is empty.

## Understanding Object Metrics

Object metrics come from Kubernetes API objects and are exposed through the custom metrics API. You reference a specific object by its API version, kind, and name. HPA queries that object's metrics and scales based on the values.

For queue-based scaling, you typically expose queue depth as a metric associated with a Service or custom resource representing the queue. A metrics adapter queries the actual queue system (RabbitMQ, Redis, etc.) and exposes the depth as a Kubernetes metric.

## Setting Up Queue Depth Metrics

First, deploy a metrics adapter that exposes queue depth. Here's an example using a custom metrics server with Redis.

```yaml
apiVersion: v1
kind: ConfigMap
metadata:
  name: queue-metrics-config
  namespace: monitoring
data:
  config.yaml: |
    metrics:
    - name: redis_list_length
      query: 'LLEN tasks:pending'
      type: object
      resource:
        apiVersion: v1
        kind: Service
        name: redis-queue
        namespace: workers
---
apiVersion: apps/v1
kind: Deployment
metadata:
  name: queue-metrics-adapter
  namespace: monitoring
spec:
  replicas: 1
  selector:
    matchLabels:
      app: queue-metrics
  template:
    metadata:
      labels:
        app: queue-metrics
    spec:
      containers:
      - name: adapter
        image: queue-metrics-adapter:v1.0
        env:
        - name: REDIS_URL
          value: "redis://redis-queue.workers.svc.cluster.local:6379"
        volumeMounts:
        - name: config
          mountPath: /config
      volumes:
      - name: config
        configMap:
          name: queue-metrics-config
```

This adapter connects to Redis, checks list length, and exposes it as an object metric.

## Creating HPA with Object Metrics

Configure HPA to scale based on the queue depth metric.

```yaml
apiVersion: autoscaling/v2
kind: HorizontalPodAutoscaler
metadata:
  name: queue-worker-hpa
  namespace: workers
spec:
  scaleTargetRef:
    apiVersion: apps/v1
    kind: Deployment
    name: queue-worker
  minReplicas: 2
  maxReplicas: 100

  metrics:
  - type: Object
    object:
      metric:
        name: redis_list_length
      describedObject:
        apiVersion: v1
        kind: Service
        name: redis-queue
        namespace: workers
      target:
        type: Value
        value: "50"  # Scale when total queue depth exceeds 50

  behavior:
    scaleUp:
      stabilizationWindowSeconds: 60
      policies:
      - type: Percent
        value: 100
        periodSeconds: 60
      - type: Pods
        value: 10
        periodSeconds: 60
      selectPolicy: Max
    scaleDown:
      stabilizationWindowSeconds: 300
      policies:
      - type: Percent
        value: 20
        periodSeconds: 120
```

Apply this configuration.

```bash
kubectl apply -f hpa.yaml

# Check HPA status
kubectl get hpa queue-worker-hpa -n workers

# Verify object metric is available
kubectl get --raw "/apis/custom.metrics.k8s.io/v1beta1/namespaces/workers/services/redis-queue/redis_list_length" | jq .
```

HPA now scales workers based on total queue depth. When 50 items are in the queue, HPA maintains enough workers to process them based on your other configured metrics and policies.

## Scaling Based on Per-Pod Queue Target

For more sophisticated scaling, calculate workers needed based on target items per pod.

```yaml
apiVersion: autoscaling/v2
kind: HorizontalPodAutoscaler
metadata:
  name: per-pod-queue-hpa
  namespace: workers
spec:
  scaleTargetRef:
    apiVersion: apps/v1
    kind: Deployment
    name: advanced-worker
  minReplicas: 3
  maxReplicas: 150

  metrics:
  - type: Object
    object:
      metric:
        name: queue_depth_per_worker
      describedObject:
        apiVersion: v1
        kind: Service
        name: task-queue
      target:
        type: AverageValue
        averageValue: "25"  # Target 25 items per worker

  behavior:
    scaleUp:
      stabilizationWindowSeconds: 120
      policies:
      - type: Pods
        value: 20
        periodSeconds: 90
      - type: Percent
        value: 100
        periodSeconds: 90
      selectPolicy: Max
    scaleDown:
      stabilizationWindowSeconds: 600
      policies:
      - type: Percent
        value: 15
        periodSeconds: 180
```

With AverageValue, HPA calculates: desired replicas equals total queue depth divided by target per pod. If 500 items are queued with a target of 25 per pod, HPA scales to 20 workers.

## Combining Queue Metrics with Resource Metrics

Use both queue depth and CPU to ensure workers aren't overloaded.

```yaml
apiVersion: autoscaling/v2
kind: HorizontalPodAutoscaler
metadata:
  name: balanced-queue-hpa
spec:
  scaleTargetRef:
    apiVersion: apps/v1
    kind: Deployment
    name: balanced-worker
  minReplicas: 5
  maxReplicas: 100

  metrics:
  # Scale based on queue depth
  - type: Object
    object:
      metric:
        name: pending_tasks
      describedObject:
        apiVersion: v1
        kind: Service
        name: queue-service
      target:
        type: AverageValue
        averageValue: "30"

  # Also monitor CPU to prevent overload
  - type: Resource
    resource:
      name: cpu
      target:
        type: Utilization
        averageUtilization: 75

  # And memory
  - type: Resource
    resource:
      name: memory
      target:
        type: Utilization
        averageUtilization: 80
```

HPA scales based on whichever metric suggests more replicas. If queue depth indicates 20 replicas but CPU suggests 25, HPA scales to 25.

## Scaling Multiple Worker Types from One Queue

Different worker types can process the same queue with different scaling strategies.

```yaml
# Fast workers for urgent tasks
apiVersion: autoscaling/v2
kind: HorizontalPodAutoscaler
metadata:
  name: urgent-worker-hpa
spec:
  scaleTargetRef:
    apiVersion: apps/v1
    kind: Deployment
    name: urgent-worker
  minReplicas: 5
  maxReplicas: 50
  metrics:
  - type: Object
    object:
      metric:
        name: urgent_queue_depth
      describedObject:
        kind: Service
        name: queue-service
      target:
        type: AverageValue
        averageValue: "10"  # Aggressive scaling for urgent work
---
# Standard workers for normal tasks
apiVersion: autoscaling/v2
kind: HorizontalPodAutoscaler
metadata:
  name: standard-worker-hpa
spec:
  scaleTargetRef:
    apiVersion: apps/v1
    kind: Deployment
    name: standard-worker
  minReplicas: 10
  maxReplicas: 200
  metrics:
  - type: Object
    object:
      metric:
        name: standard_queue_depth
      describedObject:
        kind: Service
        name: queue-service
      target:
        type: AverageValue
        averageValue: "50"  # Less aggressive for standard work
```

This allows priority-based scaling where urgent tasks get resources faster.

## Monitoring Queue-Based Scaling

Track queue depth and worker scaling relationship.

```bash
# Check current queue depth metric
kubectl get --raw "/apis/custom.metrics.k8s.io/v1beta1/namespaces/workers/services/redis-queue/redis_list_length" | jq '.value'

# View HPA status
kubectl describe hpa queue-worker-hpa -n workers

# Watch scaling events
kubectl get events -n workers --field-selector involvedObject.name=queue-worker-hpa -w

# Monitor worker count vs queue depth
watch -n 5 'echo "Workers: $(kubectl get deployment queue-worker -n workers -o jsonpath="{.status.replicas}")"; echo "Queue: $(kubectl get --raw "/apis/custom.metrics.k8s.io/v1beta1/namespaces/workers/services/redis-queue/redis_list_length" | jq -r ".value")"'
```

## Handling Queue Depth Spikes

Configure aggressive scale-up for sudden queue growth.

```yaml
apiVersion: autoscaling/v2
kind: HorizontalPodAutoscaler
metadata:
  name: spike-aware-hpa
spec:
  scaleTargetRef:
    apiVersion: apps/v1
    kind: Deployment
    name: elastic-worker
  minReplicas: 5
  maxReplicas: 500

  metrics:
  - type: Object
    object:
      metric:
        name: queue_backlog
      describedObject:
        kind: Service
        name: message-queue
      target:
        type: AverageValue
        averageValue: "20"

  behavior:
    scaleUp:
      stabilizationWindowSeconds: 0  # Scale immediately
      policies:
      - type: Percent
        value: 200  # Triple capacity if needed
        periodSeconds: 60
      - type: Pods
        value: 50
        periodSeconds: 30
      selectPolicy: Max
    scaleDown:
      stabilizationWindowSeconds: 900  # Wait 15 minutes
      policies:
      - type: Percent
        value: 10
        periodSeconds: 300
```

This configuration responds instantly to queue growth but scales down slowly after the spike passes.

## Using Custom Resources for Queue Metrics

Define a custom resource to represent queue state.

```yaml
apiVersion: apiextensions.k8s.io/v1
kind: CustomResourceDefinition
metadata:
  name: messagequeus.queue.example.com
spec:
  group: queue.example.com
  versions:
  - name: v1
    served: true
    storage: true
    schema:
      openAPIV3Schema:
        type: object
        properties:
          spec:
            type: object
            properties:
              queueName:
                type: string
          status:
            type: object
            properties:
              depth:
                type: integer
              oldestMessageAge:
                type: integer
  scope: Namespaced
  names:
    plural: messagequeus
    singular: messagequeue
    kind: MessageQueue
---
apiVersion: queue.example.com/v1
kind: MessageQueue
metadata:
  name: task-queue
  namespace: workers
spec:
  queueName: "tasks"
status:
  depth: 0
  oldestMessageAge: 0
```

Update this resource's status from a controller watching your actual queue, then reference it in HPA.

```yaml
apiVersion: autoscaling/v2
kind: HorizontalPodAutoscaler
metadata:
  name: crd-based-hpa
spec:
  scaleTargetRef:
    apiVersion: apps/v1
    kind: Deployment
    name: task-worker
  minReplicas: 2
  maxReplicas: 100
  metrics:
  - type: Object
    object:
      metric:
        name: queue_depth
      describedObject:
        apiVersion: queue.example.com/v1
        kind: MessageQueue
        name: task-queue
      target:
        type: Value
        value: "100"
```

## Best Practices

Set target values based on your worker's processing rate. If workers process 10 items per minute, and you want to clear the queue within 5 minutes, target 50 items per worker.

Use aggressive scale-up and conservative scale-down for queue workloads. Clearing backlogs quickly improves overall system performance.

Monitor both queue depth and age of oldest message. Scaling based only on depth might miss important messages waiting too long.

Configure minimum replicas above zero for queues that regularly receive work. Cold starts add latency to message processing.

Test your scaling with realistic queue growth patterns. Simulate gradual increases, sudden spikes, and sustained high load.

Set appropriate stabilization windows based on message arrival patterns. Bursty queues need longer windows to avoid scaling oscillation.

## Troubleshooting

**HPA doesn't see object metric**: Verify the custom metrics API server is running and the metric is properly registered.

```bash
kubectl get apiservices | grep custom.metrics
kubectl logs -n monitoring deployment/queue-metrics-adapter
```

**Scaling is delayed**: Check the metrics adapter polling interval and HPA evaluation period. Both add latency to scaling decisions.

**Workers scale but queue grows**: Your target value might be too conservative, or workers are processing slower than expected. Monitor actual processing rate.

## Conclusion

Object metrics enable sophisticated queue-based autoscaling in Kubernetes. By scaling workers based on actual work waiting in queues rather than worker resource utilization, you build more responsive systems that maintain queue backlogs at acceptable levels. The key is exposing queue metrics through the custom metrics API, choosing appropriate target values based on worker processing capacity, and configuring scaling behaviors that match your queue's traffic patterns.
