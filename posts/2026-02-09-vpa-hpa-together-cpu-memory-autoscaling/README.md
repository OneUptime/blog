# How to Handle VPA and HPA Together for CPU and Memory Autoscaling

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Kubernetes, VPA, HPA

Description: Learn how to safely use Vertical Pod Autoscaler and Horizontal Pod Autoscaler together by splitting metrics, using VPA in recommendation mode, and avoiding conflicts between vertical and horizontal scaling.

---

Vertical Pod Autoscaler (VPA) and Horizontal Pod Autoscaler (HPA) both manage resources, but they can conflict if not configured carefully. VPA adjusts resource requests per pod while HPA adjusts pod count. This guide shows you how to use them together safely.

## The VPA and HPA Conflict

VPA and HPA conflict when both target the same metric. If HPA scales on CPU utilization and VPA changes CPU requests, HPA's utilization calculations become unstable:

1. HPA sees 80% CPU utilization, scales up pods
2. VPA sees high usage, increases CPU request
3. HPA recalculates utilization with new request, sees lower percentage
4. HPA scales down pods
5. Repeat indefinitely

This causes thrashing.

## Safe Configuration: Split Metrics

The safest approach is to use different metrics:

- HPA scales on CPU
- VPA recommends memory (in Off mode)

```yaml
# HPA for horizontal scaling based on CPU
apiVersion: autoscaling/v2
kind: HorizontalPodAutoscaler
metadata:
  name: web-app-hpa
  namespace: production
spec:
  scaleTargetRef:
    apiVersion: apps/v1
    kind: Deployment
    name: web-app
  minReplicas: 2
  maxReplicas: 10
  metrics:
  - type: Resource
    resource:
      name: cpu
      target:
        type: Utilization
        averageUtilization: 70
---
# VPA for memory sizing (recommendation only)
apiVersion: autoscaling.k8s.io/v1
kind: VerticalPodAutoscaler
metadata:
  name: web-app-vpa
  namespace: production
spec:
  targetRef:
    apiVersion: apps/v1
    kind: Deployment
    name: web-app
  updatePolicy:
    updateMode: "Off"
  resourcePolicy:
    containerPolicies:
    - containerName: app
      controlledResources: ["memory"]
```

HPA handles traffic-based scaling, VPA recommends memory sizing.

## VPA in Recommendation Mode with HPA

Always use VPA updateMode Off or Initial with HPA, never Auto:

```yaml
apiVersion: autoscaling.k8s.io/v1
kind: VerticalPodAutoscaler
metadata:
  name: app-vpa
spec:
  targetRef:
    apiVersion: apps/v1
    kind: Deployment
    name: app
  updatePolicy:
    updateMode: "Off"  # Critical: Never use Auto with HPA
```

Review VPA recommendations periodically and apply manually during maintenance windows.

## Example: CPU HPA + Memory VPA

A complete example splitting responsibilities:

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: api-server
  namespace: production
spec:
  replicas: 3
  selector:
    matchLabels:
      app: api-server
  template:
    metadata:
      labels:
        app: api-server
    spec:
      containers:
      - name: api
        image: api-server:v1
        resources:
          requests:
            cpu: "500m"
            memory: "512Mi"
          limits:
            cpu: "1"
            memory: "1Gi"
---
# HPA scales replicas based on CPU
apiVersion: autoscaling/v2
kind: HorizontalPodAutoscaler
metadata:
  name: api-server-hpa
  namespace: production
spec:
  scaleTargetRef:
    apiVersion: apps/v1
    kind: Deployment
    name: api-server
  minReplicas: 3
  maxReplicas: 20
  metrics:
  - type: Resource
    resource:
      name: cpu
      target:
        type: Utilization
        averageUtilization: 70
---
# VPA recommends memory sizing
apiVersion: autoscaling.k8s.io/v1
kind: VerticalPodAutoscaler
metadata:
  name: api-server-vpa
  namespace: production
spec:
  targetRef:
    apiVersion: apps/v1
    kind: Deployment
    name: api-server
  updatePolicy:
    updateMode: "Off"
  resourcePolicy:
    containerPolicies:
    - containerName: api
      controlledResources: ["memory"]
      minAllowed:
        memory: "256Mi"
      maxAllowed:
        memory: "4Gi"
```

## Using Custom Metrics with HPA

Scale HPA on custom metrics (requests per second, queue length) and let VPA handle CPU/memory:

```yaml
apiVersion: autoscaling/v2
kind: HorizontalPodAutoscaler
metadata:
  name: worker-hpa
  namespace: production
spec:
  scaleTargetRef:
    apiVersion: apps/v1
    kind: Deployment
    name: worker
  minReplicas: 2
  maxReplicas: 50
  metrics:
  - type: Pods
    pods:
      metric:
        name: queue_length
      target:
        type: AverageValue
        averageValue: "10"
---
apiVersion: autoscaling.k8s.io/v1
kind: VerticalPodAutoscaler
metadata:
  name: worker-vpa
  namespace: production
spec:
  targetRef:
    apiVersion: apps/v1
    kind: Deployment
    name: worker
  updatePolicy:
    updateMode: "Off"
```

HPA scales based on queue length, VPA recommends CPU and memory based on actual usage.

## Monitoring VPA and HPA Together

Track both autoscalers:

```bash
# Check HPA status
kubectl get hpa -n production

# Check VPA recommendations
kubectl describe vpa app-vpa -n production

# Check actual replica count
kubectl get deployment app -n production
```

Watch for conflicts:

```bash
# Monitor HPA decisions
kubectl get hpa app-hpa -n production --watch

# Monitor events
kubectl get events -n production --sort-by='.lastTimestamp'
```

## Applying VPA Recommendations with HPA

When VPA recommends new memory requests:

1. Check current HPA status to ensure stable state
2. Apply VPA recommendation during low-traffic period
3. Monitor HPA behavior after the change

```bash
# Check HPA is stable
kubectl get hpa app-hpa -n production

# Apply VPA memory recommendation
kubectl set resources deployment app -n production --requests=memory=768Mi

# Watch HPA for 15 minutes
kubectl get hpa app-hpa -n production --watch
```

## VPA Initial Mode with HPA

Use VPA updateMode Initial to set resources for new pods while HPA controls count:

```yaml
apiVersion: autoscaling.k8s.io/v1
kind: VerticalPodAutoscaler
metadata:
  name: app-vpa
spec:
  targetRef:
    apiVersion: apps/v1
    kind: Deployment
    name: app
  updatePolicy:
    updateMode: "Initial"
  resourcePolicy:
    containerPolicies:
    - containerName: app
      controlledResources: ["memory"]
```

When HPA scales up, new pods get VPA's recommended memory requests. Existing pods keep current resources.

## Best Practices

- Never use VPA Auto mode with HPA
- Split metrics: HPA on CPU or custom metrics, VPA on memory
- Use VPA Off mode with periodic manual updates
- Or use VPA Initial mode to set resources for new pods
- Monitor both autoscalers for conflicts
- Set PodDisruptionBudgets to limit disruption
- Apply VPA changes during low-traffic periods
- Test configuration in staging first
- Document autoscaling strategy clearly

## Anti-Pattern: Both on CPU

Never do this:

```yaml
# Bad: Both autoscalers targeting CPU
apiVersion: autoscaling/v2
kind: HorizontalPodAutoscaler
metadata:
  name: app-hpa
spec:
  metrics:
  - type: Resource
    resource:
      name: cpu
      target:
        type: Utilization
        averageUtilization: 70
---
apiVersion: autoscaling.k8s.io/v1
kind: VerticalPodAutoscaler
metadata:
  name: app-vpa
spec:
  updatePolicy:
    updateMode: "Auto"  # Bad: Conflicts with HPA
  resourcePolicy:
    containerPolicies:
    - containerName: app
      controlledResources: ["cpu", "memory"]
```

This causes scaling thrash.

## Alternative: KEDA for Advanced Autoscaling

For complex scaling scenarios, consider KEDA (Kubernetes Event Driven Autoscaling):

- Scales on diverse event sources (Kafka, Redis, Prometheus)
- Better separation of concerns than HPA+VPA
- Handles both scale-to-zero and scale-up

```yaml
apiVersion: keda.sh/v1alpha1
kind: ScaledObject
metadata:
  name: api-scaler
spec:
  scaleTargetRef:
    name: api-server
  minReplicaCount: 2
  maxReplicaCount: 50
  triggers:
  - type: prometheus
    metadata:
      serverAddress: http://prometheus:9090
      metricName: http_requests_per_second
      threshold: '100'
      query: rate(http_requests_total[1m])
```

## Real-World Example: E-commerce API

An API server that needs both horizontal and vertical scaling:

```yaml
# Deployment with initial resources
apiVersion: apps/v1
kind: Deployment
metadata:
  name: ecommerce-api
  namespace: production
spec:
  replicas: 5
  selector:
    matchLabels:
      app: ecommerce-api
  template:
    metadata:
      labels:
        app: ecommerce-api
    spec:
      containers:
      - name: api
        image: ecommerce-api:v2
        resources:
          requests:
            cpu: "1"
            memory: "1Gi"
          limits:
            cpu: "2"
            memory: "2Gi"
---
# HPA for traffic-based scaling
apiVersion: autoscaling/v2
kind: HorizontalPodAutoscaler
metadata:
  name: ecommerce-api-hpa
  namespace: production
spec:
  scaleTargetRef:
    apiVersion: apps/v1
    kind: Deployment
    name: ecommerce-api
  minReplicas: 5
  maxReplicas: 100
  metrics:
  - type: Resource
    resource:
      name: cpu
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
  behavior:
    scaleDown:
      stabilizationWindowSeconds: 300
      policies:
      - type: Percent
        value: 50
        periodSeconds: 60
    scaleUp:
      stabilizationWindowSeconds: 0
      policies:
      - type: Percent
        value: 100
        periodSeconds: 30
---
# VPA for memory sizing recommendations
apiVersion: autoscaling.k8s.io/v1
kind: VerticalPodAutoscaler
metadata:
  name: ecommerce-api-vpa
  namespace: production
spec:
  targetRef:
    apiVersion: apps/v1
    kind: Deployment
    name: ecommerce-api
  updatePolicy:
    updateMode: "Off"
  resourcePolicy:
    containerPolicies:
    - containerName: api
      controlledResources: ["memory"]
      minAllowed:
        memory: "512Mi"
      maxAllowed:
        memory: "8Gi"
---
# PDB to limit disruption
apiVersion: policy/v1
kind: PodDisruptionBudget
metadata:
  name: ecommerce-api-pdb
  namespace: production
spec:
  minAvailable: 3
  selector:
    matchLabels:
      app: ecommerce-api
```

HPA handles traffic spikes, VPA recommends memory sizing, PDB ensures availability.

## Conclusion

VPA and HPA can coexist if configured carefully. Use HPA for horizontal scaling based on CPU or custom metrics, and VPA in Off or Initial mode for memory sizing. Never use VPA Auto mode with HPA, and avoid targeting the same metric with both autoscalers. Monitor both systems for conflicts, apply VPA recommendations manually during maintenance windows, and test configurations thoroughly in staging. The combination provides both traffic-responsive scaling and data-driven resource sizing.
