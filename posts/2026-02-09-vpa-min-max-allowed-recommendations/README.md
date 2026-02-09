# How to Configure VPA minAllowed and maxAllowed for Safe Recommendation Ranges

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Kubernetes, VPA, Resource Management

Description: Configure Vertical Pod Autoscaler minAllowed and maxAllowed bounds to constrain resource recommendations within safe ranges, preventing excessive or insufficient resource allocations.

---

Vertical Pod Autoscaler analyzes pod resource usage and recommends optimal CPU and memory requests. Without constraints, VPA might suggest extremely high resources during traffic spikes or very low resources during idle periods. The minAllowed and maxAllowed fields let you define acceptable bounds for these recommendations, ensuring they stay within sensible ranges for your workloads.

These constraints protect against both over-provisioning that wastes cluster resources and under-provisioning that degrades performance. By setting appropriate bounds, you ensure VPA recommendations balance efficiency with reliability.

## Understanding Resource Bounds

The minAllowed field sets the lower bound for resource recommendations. VPA will never recommend values below this limit, even if observed usage suggests lower resources would suffice. The maxAllowed field sets the upper bound, preventing VPA from recommending excessive resources during temporary spikes.

These bounds apply to both CPU and memory independently. You can set different constraints for each resource type based on your workload characteristics.

## Basic minAllowed and maxAllowed Configuration

Configure VPA with resource bounds.

```yaml
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
    updateMode: "Auto"

  resourcePolicy:
    containerPolicies:
    - containerName: app
      minAllowed:
        cpu: 100m
        memory: 128Mi
      maxAllowed:
        cpu: 4000m
        memory: 8Gi

      # Control scaling mode per resource
      controlledResources: ["cpu", "memory"]
```

VPA will recommend resources between 100m-4000m CPU and 128Mi-8Gi memory, regardless of observed usage patterns.

## Setting Conservative Lower Bounds

Prevent VPA from recommending resources too low for reliable operation.

```yaml
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
    updateMode: "Auto"

  resourcePolicy:
    containerPolicies:
    - containerName: api
      minAllowed:
        cpu: 500m      # Minimum for acceptable response times
        memory: 512Mi  # Minimum to avoid OOM on startup
      maxAllowed:
        cpu: 8000m
        memory: 16Gi
```

These minimums ensure the API server always has enough resources to handle baseline traffic and startup requirements.

## Constraining Maximum Resources

Prevent runaway resource recommendations during anomalous usage.

```yaml
apiVersion: autoscaling.k8s.io/v1
kind: VerticalPodAutoscaler
metadata:
  name: batch-worker-vpa
  namespace: workers
spec:
  targetRef:
    apiVersion: apps/v1
    kind: Deployment
    name: batch-worker

  updatePolicy:
    updateMode: "Auto"

  resourcePolicy:
    containerPolicies:
    - containerName: worker
      minAllowed:
        cpu: 250m
        memory: 256Mi
      maxAllowed:
        cpu: 2000m     # Cap CPU to prevent cost overruns
        memory: 4Gi    # Cap memory based on node capacity
```

The maxAllowed values prevent VPA from recommending more resources than your nodes can provide or your budget allows.

## Different Bounds for Multiple Containers

Configure independent bounds for each container in a pod.

```yaml
apiVersion: autoscaling.k8s.io/v1
kind: VerticalPodAutoscaler
metadata:
  name: multi-container-vpa
  namespace: production
spec:
  targetRef:
    apiVersion: apps/v1
    kind: Deployment
    name: app-with-sidecar

  updatePolicy:
    updateMode: "Auto"

  resourcePolicy:
    containerPolicies:
    # Main application container
    - containerName: app
      minAllowed:
        cpu: 500m
        memory: 512Mi
      maxAllowed:
        cpu: 4000m
        memory: 8Gi

    # Sidecar proxy container
    - containerName: proxy
      minAllowed:
        cpu: 50m
        memory: 64Mi
      maxAllowed:
        cpu: 500m
        memory: 512Mi

    # Logging sidecar
    - containerName: log-shipper
      minAllowed:
        cpu: 25m
        memory: 32Mi
      maxAllowed:
        cpu: 200m
        memory: 256Mi
```

Each container gets appropriate bounds based on its role and typical resource usage.

## CPU-Only or Memory-Only Bounds

Constrain only specific resources while leaving others unbounded.

```yaml
apiVersion: autoscaling.k8s.io/v1
kind: VerticalPodAutoscaler
metadata:
  name: cpu-constrained-vpa
  namespace: production
spec:
  targetRef:
    apiVersion: apps/v1
    kind: Deployment
    name: compute-worker

  updatePolicy:
    updateMode: "Auto"

  resourcePolicy:
    containerPolicies:
    - containerName: worker
      # Only constrain CPU
      minAllowed:
        cpu: 1000m
      maxAllowed:
        cpu: 8000m

      # Let VPA recommend any memory amount
      controlledResources: ["cpu", "memory"]
```

This configuration constrains CPU recommendations but allows VPA to recommend any memory amount based on observed usage.

## Bounds Based on Node Resources

Set bounds that align with your node instance types.

```yaml
apiVersion: autoscaling.k8s.io/v1
kind: VerticalPodAutoscaler
metadata:
  name: node-aware-vpa
  namespace: production
spec:
  targetRef:
    apiVersion: apps/v1
    kind: Deployment
    name: data-processor

  updatePolicy:
    updateMode: "Auto"

  resourcePolicy:
    containerPolicies:
    - containerName: processor
      minAllowed:
        cpu: 500m
        memory: 1Gi
      maxAllowed:
        # Nodes have 16 CPU, leave room for system pods
        cpu: 14000m
        # Nodes have 64Gi memory, leave room for overhead
        memory: 56Gi
```

These bounds ensure recommendations fit within node capacity while accounting for system overhead.

## Monitoring VPA Recommendations Against Bounds

Track when recommendations hit the configured limits.

```bash
# Check VPA recommendations
kubectl describe vpa web-app-vpa -n production

# View recommended values
kubectl get vpa web-app-vpa -n production -o json | \
  jq '.status.recommendation.containerRecommendations[]'

# Check if recommendations are hitting bounds
kubectl get vpa web-app-vpa -n production -o json | \
  jq '.status.recommendation.containerRecommendations[] |
      select(.target.cpu == .maxAllowed.cpu or
             .target.memory == .maxAllowed.memory or
             .target.cpu == .minAllowed.cpu or
             .target.memory == .minAllowed.memory)'
```

If recommendations consistently hit maxAllowed, consider increasing the bound or investigating why usage is so high. If they frequently hit minAllowed, your bounds might be too high.

## Adjusting Bounds Based on Usage Patterns

Refine bounds using actual usage data.

```bash
# Get current resource usage
kubectl top pods -n production -l app=web-app

# Compare against VPA recommendations
kubectl get vpa web-app-vpa -n production -o json | \
  jq '.status.recommendation.containerRecommendations[] |
      {container: .containerName, target: .target}'

# View usage history from metrics
kubectl get --raw /apis/metrics.k8s.io/v1beta1/namespaces/production/pods | \
  jq '.items[] | select(.metadata.labels.app=="web-app") |
      {pod: .metadata.name, usage: .containers[].usage}'
```

Use this data to set bounds that accommodate normal usage ranges while preventing extreme recommendations.

## Combining with Pod Disruption Budgets

Coordinate bounds with PDB to ensure safe updates.

```yaml
apiVersion: policy/v1
kind: PodDisruptionBudget
metadata:
  name: web-app-pdb
  namespace: production
spec:
  minAvailable: 3
  selector:
    matchLabels:
      app: web-app
---
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
    updateMode: "Auto"
    minReplicas: 5  # Ensure enough pods for PDB

  resourcePolicy:
    containerPolicies:
    - containerName: app
      minAllowed:
        cpu: 200m
        memory: 256Mi
      maxAllowed:
        cpu: 4000m
        memory: 8Gi
```

The PDB ensures VPA updates don't violate availability requirements when applying new resource recommendations.

## Handling Init Containers

Configure bounds for init containers separately.

```yaml
apiVersion: autoscaling.k8s.io/v1
kind: VerticalPodAutoscaler
metadata:
  name: init-container-vpa
  namespace: production
spec:
  targetRef:
    apiVersion: apps/v1
    kind: Deployment
    name: data-loader

  updatePolicy:
    updateMode: "Auto"

  resourcePolicy:
    containerPolicies:
    # Init container that loads data
    - containerName: data-init
      mode: "Off"  # Don't manage init container resources
      minAllowed:
        cpu: 1000m
        memory: 2Gi
      maxAllowed:
        cpu: 4000m
        memory: 8Gi

    # Main application container
    - containerName: app
      mode: "Auto"
      minAllowed:
        cpu: 250m
        memory: 512Mi
      maxAllowed:
        cpu: 2000m
        memory: 4Gi
```

Init containers often have different resource patterns than main containers and may need different bounds.

## Testing Bound Configurations

Validate bounds under various load conditions.

```yaml
# Create test VPA with experimental bounds
apiVersion: autoscaling.k8s.io/v1
kind: VerticalPodAutoscaler
metadata:
  name: test-vpa
  namespace: staging
spec:
  targetRef:
    apiVersion: apps/v1
    kind: Deployment
    name: app

  updatePolicy:
    updateMode: "Initial"  # Only set on pod creation

  resourcePolicy:
    containerPolicies:
    - containerName: app
      minAllowed:
        cpu: 100m
        memory: 128Mi
      maxAllowed:
        cpu: 2000m
        memory: 4Gi
```

Test with Initial mode to observe recommendations without automatic updates, then adjust bounds before switching to Auto mode.

## Best Practices

Set minAllowed based on the minimum resources required for your application to function correctly under baseline load. Include overhead for startup, initialization, and any periodic background tasks.

Set maxAllowed based on realistic maximum usage plus a safety margin. Consider node capacity, cost constraints, and whether extreme recommendations indicate application issues rather than legitimate resource needs.

Review VPA recommendations regularly to ensure bounds remain appropriate as application behavior evolves. Seasonal traffic patterns or feature changes may require bound adjustments.

Use different bounds for different environments. Production might have higher minimums for reliability, while staging can use lower bounds to save costs.

Document the rationale for specific bound values. Future team members need context for why certain limits were chosen.

## Common Pitfalls

Setting minAllowed too high wastes resources during low-traffic periods. Setting it too low risks performance degradation or pod evictions during normal operation.

Setting maxAllowed at node capacity limits prevents pod scheduling due to insufficient overhead for system components. Leave 10-15% margin below node capacity.

Forgetting to update bounds after changing instance types or adding new features can result in inappropriate resource recommendations.

## Conclusion

The minAllowed and maxAllowed configuration options in VPA provide essential guardrails for resource recommendations. By constraining recommendations within sensible ranges, you prevent both wasteful over-provisioning and risky under-provisioning.

Properly configured bounds ensure VPA improves resource efficiency without compromising reliability. Combined with monitoring and periodic review, resource bounds help you get the most value from vertical autoscaling while maintaining safe, predictable pod resource allocations.
