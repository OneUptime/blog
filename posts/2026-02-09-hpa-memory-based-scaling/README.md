# How to Implement HPA with Memory-Based Scaling

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Kubernetes, HPA, Memory

Description: Implement Horizontal Pod Autoscaler with memory-based scaling for memory-intensive workloads like caching systems, data processing pipelines, and in-memory databases.

---

Memory utilization behaves differently from CPU. While CPU can be throttled and shared across processes, memory is a non-compressible resource. When a container exhausts its memory limit, it gets killed by the OOM killer. This makes memory-based autoscaling critical for applications that load large datasets, maintain caches, or perform in-memory processing.

HPA can scale based on memory utilization just like CPU, using metrics from the Metrics Server. By monitoring memory usage and scaling before pods hit their limits, you prevent OOM kills and maintain application stability. Memory-based scaling works particularly well for workloads where memory consumption directly correlates with load, such as in-memory caching layers, data aggregation services, and session storage systems.

## When to Use Memory-Based Scaling

Memory-based autoscaling makes sense when your application's memory footprint grows with user load. Examples include caching layers that store more entries as traffic increases, data processing pipelines that load datasets into memory, and stateful services that maintain connection state or session data.

CPU-bound applications benefit more from CPU-based scaling, but many real-world workloads are memory-bound. If your pods get OOM killed during traffic spikes, or if monitoring shows memory utilization climbing while CPU stays low, memory-based scaling is appropriate.

## Setting Up Memory Metrics

First, ensure your pods define memory requests and limits.

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: cache-service
  namespace: production
spec:
  replicas: 3
  selector:
    matchLabels:
      app: cache
  template:
    metadata:
      labels:
        app: cache
    spec:
      containers:
      - name: redis
        image: redis:7.2
        resources:
          requests:
            memory: 1Gi        # Required for HPA memory metrics
            cpu: 200m
          limits:
            memory: 2Gi        # Prevent unlimited growth
            cpu: 500m
        ports:
        - containerPort: 6379
```

Memory requests tell HPA what 100% utilization means. If you request 1Gi and use 800Mi, that's 80% utilization.

## Basic Memory-Based HPA

Configure HPA to scale based on memory utilization.

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
    name: cache-service
  minReplicas: 3
  maxReplicas: 30
  metrics:
  - type: Resource
    resource:
      name: memory
      target:
        type: Utilization
        averageUtilization: 75  # Scale when average memory exceeds 75%
```

Apply the configuration.

```bash
kubectl apply -f hpa.yaml

# Check HPA status
kubectl get hpa cache-memory-hpa -n production

# Verify memory metrics are available
kubectl top pods -n production -l app=cache
```

HPA maintains average memory utilization around 75% by adding replicas when usage climbs above that threshold.

## Choosing Target Memory Utilization

Unlike CPU, memory utilization should target lower percentages because you can't easily recover from OOM kills. Set targets between 70-85% for most workloads.

```yaml
apiVersion: autoscaling/v2
kind: HorizontalPodAutoscaler
metadata:
  name: conservative-memory-hpa
spec:
  scaleTargetRef:
    apiVersion: apps/v1
    kind: Deployment
    name: data-processor
  minReplicas: 5
  maxReplicas: 50
  metrics:
  - type: Resource
    resource:
      name: memory
      target:
        type: Utilization
        averageUtilization: 70  # Conservative for safety
```

For applications with predictable memory growth, you can target 80-85%. For workloads with sudden memory spikes, target 65-75% to maintain safety margin.

## Combining Memory and CPU Metrics

Most applications benefit from scaling on both CPU and memory.

```yaml
apiVersion: autoscaling/v2
kind: HorizontalPodAutoscaler
metadata:
  name: dual-metric-hpa
spec:
  scaleTargetRef:
    apiVersion: apps/v1
    kind: Deployment
    name: application-server
  minReplicas: 10
  maxReplicas: 100
  metrics:
  - type: Resource
    resource:
      name: memory
      target:
        type: Utilization
        averageUtilization: 75
  - type: Resource
    resource:
      name: cpu
      target:
        type: Utilization
        averageUtilization: 70
```

HPA calculates desired replicas for each metric and uses the maximum. If memory indicates you need 15 replicas but CPU indicates 12, HPA scales to 15. This ensures both constraints are satisfied.

## Using Absolute Memory Values

Instead of percentage utilization, target absolute memory amounts.

```yaml
apiVersion: autoscaling/v2
kind: HorizontalPodAutoscaler
metadata:
  name: absolute-memory-hpa
spec:
  scaleTargetRef:
    apiVersion: apps/v1
    kind: Deployment
    name: session-store
  minReplicas: 5
  maxReplicas: 50
  metrics:
  - type: Resource
    resource:
      name: memory
      target:
        type: AverageValue
        averageValue: 1536Mi  # Scale when average memory exceeds 1.5Gi
```

This approach works well when you know the optimal memory usage per pod regardless of resource requests. For example, if you know each pod handles optimal load at 1.5Gi memory, use that as the target.

## Configuring Scaling Behavior for Memory

Memory workloads often need different scaling behavior than CPU workloads.

```yaml
apiVersion: autoscaling/v2
kind: HorizontalPodAutoscaler
metadata:
  name: memory-aware-hpa
spec:
  scaleTargetRef:
    apiVersion: apps/v1
    kind: Deployment
    name: analytics-engine
  minReplicas: 5
  maxReplicas: 100
  metrics:
  - type: Resource
    resource:
      name: memory
      target:
        type: Utilization
        averageUtilization: 75

  behavior:
    scaleUp:
      stabilizationWindowSeconds: 120  # Longer stabilization for memory
      policies:
      - type: Percent
        value: 50
        periodSeconds: 120
      - type: Pods
        value: 5
        periodSeconds: 120
      selectPolicy: Max

    scaleDown:
      stabilizationWindowSeconds: 600  # Very conservative scale-down
      policies:
      - type: Percent
        value: 10
        periodSeconds: 180
      selectPolicy: Min
```

Memory workloads need longer stabilization windows because memory usage grows gradually as caches fill or datasets load. Quick scale-down can cause the remaining pods to immediately hit high memory, triggering another scale-up.

## Handling Memory-Intensive Startups

Applications that load data during startup have high initial memory usage before serving traffic.

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: data-loader
spec:
  template:
    spec:
      containers:
      - name: app
        image: data-loader:v2
        resources:
          requests:
            memory: 2Gi      # Account for startup memory needs
            cpu: 500m
          limits:
            memory: 4Gi      # Allow headroom during initialization
        startupProbe:
          httpGet:
            path: /health/startup
            port: 8080
          initialDelaySeconds: 60
          periodSeconds: 10
          failureThreshold: 30
```

Use startup probes to delay traffic until initialization completes. This prevents HPA from seeing high memory usage during pod startup and making incorrect scaling decisions.

## Monitoring Memory-Based Scaling

Track memory utilization and scaling events.

```bash
# View current memory usage
kubectl top pods -n production -l app=cache

# Check HPA status
kubectl get hpa cache-memory-hpa -n production -o yaml

# View memory metrics in HPA status
kubectl get hpa cache-memory-hpa -o json | jq '.status.currentMetrics'

# Watch for scaling events
kubectl get events --field-selector involvedObject.name=cache-memory-hpa -w
```

Monitor the relationship between memory usage and replica count to validate your configuration.

## Scaling Memory-Intensive Batch Jobs

Batch processing workloads that load entire datasets into memory need careful configuration.

```yaml
apiVersion: autoscaling/v2
kind: HorizontalPodAutoscaler
metadata:
  name: batch-processor-hpa
spec:
  scaleTargetRef:
    apiVersion: apps/v1
    kind: Deployment
    name: batch-processor
  minReplicas: 2
  maxReplicas: 20
  metrics:
  - type: Resource
    resource:
      name: memory
      target:
        type: Utilization
        averageUtilization: 80  # Higher for batch workloads

  behavior:
    scaleUp:
      stabilizationWindowSeconds: 300  # Wait 5 minutes to see if memory stabilizes
      policies:
      - type: Pods
        value: 3
        periodSeconds: 180
    scaleDown:
      stabilizationWindowSeconds: 900  # Wait 15 minutes before scaling down
      policies:
      - type: Pods
        value: 1
        periodSeconds: 300
```

Batch jobs often have spiky memory patterns as they load and process data. Longer stabilization prevents rapid scaling in response to these expected patterns.

## Troubleshooting Memory-Based HPA

**Pods get OOM killed despite HPA**: Target utilization is too high, or scaling isn't happening fast enough. Lower the target to 65-70% and reduce stabilization windows for scale-up.

```bash
# Check for OOM kills
kubectl get pods -n production
kubectl describe pod pod-name | grep -A 10 "Last State"
```

**Memory utilization stays high after scaling**: Application might have memory leaks, or cached data isn't distributed across new pods. Check if your application architecture supports horizontal scaling for memory workloads.

```bash
# View detailed pod memory
kubectl top pods --sort-by=memory
```

**HPA doesn't scale**: Memory requests might be undefined. Verify all containers have memory requests.

```bash
kubectl get deployment cache-service -o json | jq '.spec.template.spec.containers[].resources.requests.memory'
```

**Scaling is too aggressive**: Increase stabilization windows or reduce policy values.

## Memory-Specific Best Practices

Set memory requests based on actual usage plus safety margin. If your application typically uses 1.2Gi, request 1.5Gi to allow headroom.

Always define memory limits to prevent runaway memory consumption. Set limits 1.5x to 2x higher than requests to allow for traffic spikes while preventing unlimited growth.

```yaml
resources:
  requests:
    memory: 2Gi
  limits:
    memory: 3Gi  # 1.5x requests
```

Monitor for memory leaks separately from autoscaling. If memory usage continuously climbs regardless of load, you have a leak that autoscaling can't solve.

Use pod disruption budgets to ensure minimum availability during scale-down.

```yaml
apiVersion: policy/v1
kind: PodDisruptionBudget
metadata:
  name: cache-pdb
spec:
  minAvailable: 2
  selector:
    matchLabels:
      app: cache
```

This prevents HPA from scaling down to a point where availability is compromised.

## Scaling Stateful Memory Workloads

Applications that maintain state in memory require special consideration.

```yaml
apiVersion: autoscaling/v2
kind: HorizontalPodAutoscaler
metadata:
  name: stateful-memory-hpa
spec:
  scaleTargetRef:
    apiVersion: apps/v1
    kind: StatefulSet
    name: cache-cluster
  minReplicas: 3
  maxReplicas: 30
  metrics:
  - type: Resource
    resource:
      name: memory
      target:
        type: Utilization
        averageUtilization: 70

  behavior:
    scaleUp:
      stabilizationWindowSeconds: 180
      policies:
      - type: Pods
        value: 2
        periodSeconds: 120
    scaleDown:
      stabilizationWindowSeconds: 900
      policies:
      - type: Pods
        value: 1
        periodSeconds: 600
```

StatefulSets scale more slowly because pods are created and terminated sequentially. Adjust your policies to account for this longer scaling time.

## Testing Memory-Based Scaling

Generate memory load to verify HPA responds correctly.

```python
# Python script to consume memory
import time
import os

def allocate_memory(size_mb):
    # Allocate specified amount of memory
    data = bytearray(size_mb * 1024 * 1024)
    time.sleep(3600)  # Hold for an hour

if __name__ == "__main__":
    size = int(os.environ.get('MEMORY_SIZE_MB', '100'))
    allocate_memory(size)
```

Deploy this as a test and watch HPA scale.

```bash
# Deploy memory consumer
kubectl run memory-test --image=python:3.11 --env="MEMORY_SIZE_MB=500" -- python -c "import time; data = bytearray(500 * 1024 * 1024); time.sleep(3600)"

# Watch HPA respond
kubectl get hpa cache-memory-hpa -w
```

## Conclusion

Memory-based autoscaling ensures your applications maintain enough memory capacity to avoid OOM kills while not over-provisioning resources. By configuring HPA with appropriate memory targets, conservative scaling policies, and proper resource requests and limits, you create resilient systems that handle memory-intensive workloads effectively.

The key differences from CPU-based scaling are lower target utilization values, longer stabilization windows, and more conservative scale-down policies. Memory can't be easily reclaimed or throttled, making it critical to scale before hitting limits. Combined with proper monitoring and testing, memory-based HPA provides robust autoscaling for data-intensive Kubernetes workloads.
