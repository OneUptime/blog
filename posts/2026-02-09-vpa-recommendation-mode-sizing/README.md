# How to Use Vertical Pod Autoscaler in Recommendation-Only Mode for Sizing

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Kubernetes, VPA, Autoscaling

Description: Deploy Vertical Pod Autoscaler in recommendation-only mode to analyze actual resource usage and get data-driven suggestions for right-sizing pod requests and limits without automatic updates.

---

Guessing resource requests leads to waste or instability. Vertical Pod Autoscaler (VPA) watches actual usage and recommends optimal requests. In recommendation-only mode, VPA suggests values without changing pods automatically. This guide shows you how to use VPA for safe, data-driven resource sizing.

## What Is VPA Recommendation Mode?

VPA has three update modes:

- **Off**: Generate recommendations only, don't update pods
- **Initial**: Set resources when pods are created, don't update running pods
- **Auto**: Automatically update running pods (requires restart)

Recommendation mode (Off) is safest for production. You get sizing suggestions without surprise pod restarts.

## Installing VPA

Install VPA components:

```bash
git clone https://github.com/kubernetes/autoscaler.git
cd autoscaler/vertical-pod-autoscaler
./hack/vpa-up.sh
```

This deploys three components:

- Recommender: Watches usage and generates recommendations
- Updater: Updates pod resources (not used in Off mode)
- Admission Controller: Applies recommendations at pod creation

Verify installation:

```bash
kubectl get pods -n kube-system | grep vpa
```

## Creating a VPA in Off Mode

Create a VPA for a deployment:

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
    updateMode: "Off"
```

Apply it:

```bash
kubectl apply -f vpa.yaml
```

VPA starts watching the deployment and collecting usage data.

## Viewing VPA Recommendations

Check recommendations after a few minutes:

```bash
kubectl describe vpa web-app-vpa -n production
```

Output shows recommended requests:

```
Recommendation:
  Container Recommendations:
    Container Name:  app
    Lower Bound:
      Cpu:     100m
      Memory:  256Mi
    Target:
      Cpu:     300m
      Memory:  512Mi
    Uncapped Target:
      Cpu:     300m
      Memory:  512Mi
    Upper Bound:
      Cpu:     800m
      Memory:  1Gi
```

Key fields:

- **Target**: Recommended requests for typical usage
- **Lower Bound**: Minimum requests to avoid performance issues
- **Upper Bound**: Maximum requests for peak usage
- **Uncapped Target**: Recommendation without any resource constraints

## Understanding VPA Recommendations

VPA bases recommendations on percentiles of observed usage:

- **Target**: P50-P90 usage (covers typical load)
- **Lower Bound**: P5 usage (minimum needed)
- **Upper Bound**: P95-P99 usage (handles spikes)

Use Target for normal workloads, Upper Bound for latency-sensitive apps.

## Applying VPA Recommendations

VPA doesn't auto-update in Off mode. Apply recommendations manually:

```bash
# Update deployment with Target values
kubectl set resources deployment web-app -n production \
  --requests=cpu=300m,memory=512Mi
```

Or edit the deployment directly:

```bash
kubectl edit deployment web-app -n production
```

Update the resource requests based on VPA's target.

## VPA for Multiple Containers

VPA recommends resources per container in multi-container pods:

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
    name: multi-container-app
  updatePolicy:
    updateMode: "Off"
```

Check recommendations:

```bash
kubectl describe vpa multi-container-vpa -n production
```

Output shows separate recommendations for each container:

```
Container Recommendations:
  Container Name:  app
    Target:
      Cpu:     500m
      Memory:  1Gi
  Container Name:  sidecar
    Target:
      Cpu:     100m
      Memory:  128Mi
```

## Setting VPA Resource Policies

Constrain VPA recommendations with resource policies:

```yaml
apiVersion: autoscaling.k8s.io/v1
kind: VerticalPodAutoscaler
metadata:
  name: constrained-vpa
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
      minAllowed:
        cpu: "100m"
        memory: "128Mi"
      maxAllowed:
        cpu: "2"
        memory: "4Gi"
      controlledResources: ["cpu", "memory"]
```

VPA won't recommend below minAllowed or above maxAllowed. Useful for enforcing boundaries.

## Excluding Specific Resources

Tell VPA to only recommend CPU or memory:

```yaml
resourcePolicy:
  containerPolicies:
  - containerName: app
    controlledResources: ["cpu"]  # Only recommend CPU, not memory
```

Use this when you want to manually manage one resource type.

## VPA with StatefulSets

VPA works with StatefulSets:

```yaml
apiVersion: autoscaling.k8s.io/v1
kind: VerticalPodAutoscaler
metadata:
  name: database-vpa
  namespace: production
spec:
  targetRef:
    apiVersion: apps/v1
    kind: StatefulSet
    name: database
  updatePolicy:
    updateMode: "Off"
```

Recommendations apply to all pods in the StatefulSet.

## Comparing Current vs Recommended

Create a script to compare current requests against VPA recommendations:

```bash
#!/bin/bash
NAMESPACE=$1
VPA_NAME=$2

# Get current requests
CURRENT=$(kubectl get deployment -n $NAMESPACE -o json | jq -r '.items[0].spec.template.spec.containers[0].resources.requests')

# Get VPA target
TARGET=$(kubectl get vpa $VPA_NAME -n $NAMESPACE -o json | jq -r '.status.recommendation.containerRecommendations[0].target')

echo "Current: $CURRENT"
echo "VPA Target: $TARGET"
```

Run it:

```bash
./compare-vpa.sh production web-app-vpa
```

## Monitoring VPA Recommendation Quality

Track how often VPA recommendations change:

```bash
kubectl get vpa web-app-vpa -n production -o yaml --watch
```

Stable recommendations indicate VPA has learned the workload. Constantly changing recommendations suggest variable load patterns.

## VPA for Batch Jobs

VPA can recommend resources for Jobs and CronJobs:

```yaml
apiVersion: autoscaling.k8s.io/v1
kind: VerticalPodAutoscaler
metadata:
  name: batch-job-vpa
  namespace: batch
spec:
  targetRef:
    apiVersion: batch/v1
    kind: Job
    name: data-processor
  updatePolicy:
    updateMode: "Off"
```

VPA learns from job executions and recommends resources for future runs.

## Exporting VPA Recommendations

Export recommendations to JSON for analysis:

```bash
kubectl get vpa -n production -o json | \
  jq '.items[] | {name: .metadata.name, recommendations: .status.recommendation}'
```

Use this data to track recommendation trends or automate resource updates.

## Best Practices

- Run VPA in Off mode for at least a week before applying recommendations
- Use Target for normal workloads, Upper Bound for critical services
- Set minAllowed and maxAllowed to prevent extreme recommendations
- Compare VPA suggestions against application metrics
- Apply recommendations during maintenance windows
- Monitor pods after updating resources
- Use VPA with Prometheus to validate recommendations
- Document why you deviate from VPA suggestions

## Limitations of VPA

- Recommendations based on recent history only
- Can't predict future load changes
- Doesn't account for startup resource needs
- May recommend too low for bursty workloads
- Requires Metrics Server

Use VPA as a guide, not absolute truth. Combine with application knowledge.

## VPA vs HPA

VPA and HPA serve different purposes:

- **VPA**: Adjusts resource requests per pod (vertical scaling)
- **HPA**: Adjusts number of pods (horizontal scaling)

Use both together for memory-based scaling with HPA for CPU-based scaling:

```yaml
# HPA for CPU
apiVersion: autoscaling/v2
kind: HorizontalPodAutoscaler
metadata:
  name: web-app-hpa
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
# VPA for memory (recommendation only)
apiVersion: autoscaling.k8s.io/v1
kind: VerticalPodAutoscaler
metadata:
  name: web-app-vpa
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

## Real-World Example: Over-Provisioned Deployment

A deployment with 1 CPU and 2Gi memory requests:

```bash
kubectl describe vpa web-app-vpa -n production
```

VPA recommends:

```
Target:
  Cpu:     200m
  Memory:  512Mi
```

The deployment is over-provisioned by 5x for CPU and 4x for memory. Update resources:

```bash
kubectl set resources deployment web-app -n production \
  --requests=cpu=200m,memory=512Mi
```

This frees up 0.8 CPU and 1.5Gi per pod. With 10 replicas, you reclaim 8 CPU and 15Gi across the cluster.

## Conclusion

VPA in recommendation-only mode provides data-driven resource sizing without risk. Deploy it in all namespaces, let it collect usage data for a week, then review recommendations. Use Target values for typical workloads and Upper Bound for critical services. Set resource policy boundaries to prevent extreme recommendations. Combine VPA insights with application knowledge and business requirements for optimal sizing. Regular VPA reviews identify right-sizing opportunities that reduce waste and improve cluster efficiency.
