# How to Implement Vertical Pod Autoscaler for Automatic Right-Sizing

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Kubernetes, VPA, Autoscaling, Resource Optimization, Performance

Description: Deploy Vertical Pod Autoscaler to automatically adjust pod resource requests based on actual usage patterns and eliminate manual right-sizing efforts.

---

The Vertical Pod Autoscaler automatically adjusts CPU and memory requests for pods based on historical usage. Unlike manual right-sizing, VPA continuously monitors workloads and adapts to changing resource needs. This eliminates guesswork and reduces the operational burden of maintaining optimal resource allocation.

## How VPA Works

VPA consists of three components working together. The Recommender analyzes metrics and suggests resource values. The Updater evicts pods that need resource changes. The Admission Controller intercepts pod creation and applies recommended resources.

When a pod starts, the Admission Controller injects VPA-recommended requests. As the pod runs, the Recommender observes CPU and memory usage from metrics-server. When actual usage diverges significantly from requests, the Updater evicts the pod. The Admission Controller then recreates it with updated requests.

This eviction-based approach means VPA causes pod restarts. For stateless applications, this is acceptable. For stateful workloads or services requiring high availability, use VPA in recommendation mode only.

## Installing VPA

VPA is not included in standard Kubernetes distributions. Install it manually:

```bash
# Clone the VPA repository
git clone https://github.com/kubernetes/autoscaler.git
cd autoscaler/vertical-pod-autoscaler

# Install VPA components
./hack/vpa-up.sh
```

This script creates the VPA CRDs and deploys the three VPA components to the kube-system namespace. Verify installation:

```bash
kubectl get deployment -n kube-system | grep vpa
kubectl get crd | grep verticalpodautoscaler
```

You should see vpa-admission-controller, vpa-recommender, and vpa-updater deployments.

## Creating Your First VPA

Start with a simple deployment that benefits from automatic sizing:

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: web-app
  namespace: production
spec:
  replicas: 3
  selector:
    matchLabels:
      app: web-app
  template:
    metadata:
      labels:
        app: web-app
    spec:
      containers:
      - name: app
        image: myapp:v1
        resources:
          requests:
            memory: "128Mi"
            cpu: "100m"
          limits:
            memory: "512Mi"
            cpu: "500m"
```

Create a VPA resource targeting this deployment:

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
        memory: "64Mi"
        cpu: "50m"
      maxAllowed:
        memory: "2Gi"
        cpu: "2000m"
      controlledResources:
      - cpu
      - memory
```

The updateMode of Auto enables automatic request updates. VPA will evict pods when recommendations differ from current requests by more than 10%.

## Understanding Update Modes

VPA supports three update modes, each suited to different scenarios:

**Off**: VPA generates recommendations but does not apply them. View recommendations manually:

```bash
kubectl describe vpa web-app-vpa -n production
```

Use this mode for initial testing or when you want approval before changes.

**Initial**: VPA sets requests only when pods are created. Existing pods keep their current requests. This avoids disruptive evictions:

```yaml
updatePolicy:
  updateMode: "Initial"
```

New pods get optimized requests immediately. Existing pods update naturally during rolling deployments.

**Auto**: VPA updates both new and existing pods. Existing pods get evicted when recommendations change significantly:

```yaml
updatePolicy:
  updateMode: "Auto"
```

This provides the most automatic behavior but causes the most disruption.

## Configuring Resource Boundaries

Always set minAllowed and maxAllowed to prevent VPA from setting extreme values:

```yaml
resourcePolicy:
  containerPolicies:
  - containerName: app
    minAllowed:
      memory: "128Mi"
      cpu: "100m"
    maxAllowed:
      memory: "4Gi"
      cpu: "2000m"
```

Without boundaries, VPA might recommend tiny requests during low traffic or enormous requests after temporary spikes. The boundaries keep recommendations within acceptable ranges.

Set minimums based on your application's baseline needs. Set maximums based on node capacity and cost constraints. A good rule of thumb is maxAllowed should not exceed 50% of your largest node's capacity.

## Controlling Which Resources VPA Manages

Sometimes you want VPA to manage only CPU or only memory:

```yaml
resourcePolicy:
  containerPolicies:
  - containerName: app
    controlledResources:
    - cpu  # VPA manages CPU, not memory
    minAllowed:
      cpu: "100m"
    maxAllowed:
      cpu: "2000m"
```

This is useful when memory usage is predictable but CPU needs vary. Or when you have strict memory limits due to node constraints but flexible CPU allocation.

## Handling Multiple Containers

For pods with multiple containers, configure policies per container:

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
    updateMode: "Auto"
  resourcePolicy:
    containerPolicies:
    - containerName: app
      minAllowed:
        memory: "256Mi"
        cpu: "200m"
      maxAllowed:
        memory: "2Gi"
        cpu: "2000m"
    - containerName: sidecar
      minAllowed:
        memory: "64Mi"
        cpu: "50m"
      maxAllowed:
        memory: "512Mi"
        cpu: "500m"
    - containerName: istio-proxy
      mode: "Off"  # Don't manage Istio sidecar
```

The mode field per container allows fine-grained control. Set it to Off for containers managed externally like service mesh sidecars.

## VPA with Horizontal Pod Autoscaler

VPA and HPA can coexist but must target different resources. VPA should manage CPU while HPA scales based on custom metrics:

```yaml
# VPA manages CPU only
apiVersion: autoscaling.k8s.io/v1
kind: VerticalPodAutoscaler
metadata:
  name: app-vpa
spec:
  targetRef:
    apiVersion: apps/v1
    kind: Deployment
    name: myapp
  updatePolicy:
    updateMode: "Auto"
  resourcePolicy:
    containerPolicies:
    - containerName: app
      controlledResources:
      - cpu
---
# HPA scales replicas based on custom metrics
apiVersion: autoscaling/v2
kind: HorizontalPodAutoscaler
metadata:
  name: app-hpa
spec:
  scaleTargetRef:
    apiVersion: apps/v1
    kind: Deployment
    name: myapp
  minReplicas: 2
  maxReplicas: 10
  metrics:
  - type: Pods
    pods:
      metric:
        name: http_requests_per_second
      target:
        type: AverageValue
        averageValue: "1000"
```

Never configure both VPA and HPA to manage CPU. This creates conflicts where VPA increases CPU requests while HPA scales replicas, leading to unstable behavior.

## Monitoring VPA Recommendations

Check VPA status regularly to understand its behavior:

```bash
kubectl get vpa -n production
kubectl describe vpa web-app-vpa -n production
```

The describe output shows current recommendations:

```
Recommendation:
  Container Recommendations:
    Container Name:  app
    Lower Bound:
      Cpu:     150m
      Memory:  200Mi
    Target:
      Cpu:     250m
      Memory:  384Mi
    Upper Bound:
      Cpu:     500m
      Memory:  768Mi
```

Target represents the recommended values. Lower Bound is the minimum VPA would set. Upper Bound is the maximum for current conditions.

Track recommendation changes over time with Prometheus:

```promql
# Current VPA recommendation
vpa_status_recommendation{
  target_name="web-app-vpa",
  namespace="production"
}

# Recommendation changes
delta(vpa_status_recommendation[1h])
```

Alert on frequent recommendation changes - this indicates unstable workload behavior or VPA misconfiguration.

## Troubleshooting VPA Issues

Pods not getting updated despite VPA being in Auto mode suggests several possible issues. Check if metrics-server is running:

```bash
kubectl get deployment metrics-server -n kube-system
kubectl top nodes
```

VPA requires metrics-server to gather usage data. Without it, VPA cannot make recommendations.

Verify VPA components are healthy:

```bash
kubectl get pods -n kube-system -l app=vpa-recommender
kubectl logs -n kube-system -l app=vpa-recommender
```

Look for errors in the logs. Common issues include API server communication problems or insufficient RBAC permissions.

Check if recommendations fall within your defined boundaries:

```bash
kubectl describe vpa web-app-vpa -n production | grep -A 10 "Target"
```

If recommendations equal minAllowed or maxAllowed, VPA is being constrained by your boundaries. Adjust them if appropriate.

## Handling Stateful Applications

VPA's eviction-based updates are problematic for stateful applications. Use recommendation mode and apply changes during maintenance windows:

```yaml
apiVersion: autoscaling.k8s.io/v1
kind: VerticalPodAutoscaler
metadata:
  name: database-vpa
  namespace: data
spec:
  targetRef:
    apiVersion: apps/v1
    kind: StatefulSet
    name: postgres
  updatePolicy:
    updateMode: "Off"
```

Periodically review recommendations:

```bash
kubectl describe vpa database-vpa -n data
```

Apply recommended resources manually during scheduled maintenance:

```yaml
# Update StatefulSet with recommended resources
kubectl edit statefulset postgres -n data
```

This approach balances optimization with stability requirements.

## Performance Considerations

VPA adds computational overhead. The Recommender continuously analyzes metrics for all VPA-managed workloads. In large clusters, this consumes significant CPU and memory.

Configure the Recommender's resource limits appropriately:

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: vpa-recommender
  namespace: kube-system
spec:
  template:
    spec:
      containers:
      - name: recommender
        resources:
          requests:
            cpu: "200m"
            memory: "512Mi"
          limits:
            cpu: "1000m"
            memory: "2Gi"
```

Monitor Recommender resource usage and scale if it approaches limits.

VPA also increases pod churn. Evictions trigger pod recreation, temporarily reducing available replicas. Ensure deployments have sufficient replicas to tolerate this:

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: web-app
spec:
  replicas: 5  # Minimum 3 for availability during VPA updates
  strategy:
    rollingUpdate:
      maxUnavailable: 1  # Limit concurrent updates
```

## Best Practices

Start with recommendation mode for all workloads. Observe recommendations for a week before enabling Auto mode. This builds confidence in VPA's behavior.

Set conservative boundaries initially:

```yaml
minAllowed:
  memory: "64Mi"
  cpu: "50m"
maxAllowed:
  memory: "1Gi"  # Conservative max
  cpu: "1000m"
```

Expand boundaries as you validate VPA's recommendations align with actual needs.

Exclude critical production services from Auto mode initially. Use Initial mode for gradual adoption:

```yaml
updatePolicy:
  updateMode: "Initial"
```

Monitor VPA recommendations and pod eviction rates. High eviction rates indicate unstable workloads or too-tight boundaries.

Document VPA configuration decisions. Note why specific boundaries were chosen and when to review them. Resource needs change as applications evolve.

VPA transforms resource management from a manual, error-prone process to an automated, data-driven system. The initial setup effort pays off through continuously optimized resource allocation and reduced operational toil.
