# How to Set Up Vertical Pod Autoscaler on Talos Linux

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Talos Linux, Kubernetes, Vertical Pod Autoscaler, VPA, Resource Management, Scaling

Description: A practical guide to installing and configuring the Vertical Pod Autoscaler on Talos Linux for automatic CPU and memory resource right-sizing.

---

While the Horizontal Pod Autoscaler adds more pod replicas to handle load, the Vertical Pod Autoscaler (VPA) takes a different approach. It adjusts the CPU and memory requests and limits of individual pods based on actual usage patterns. This helps you right-size your workloads so you are not over-provisioning (wasting money) or under-provisioning (causing performance issues). On Talos Linux, the VPA is especially useful because it helps you make the most of your node resources in an environment where you want efficient utilization.

This guide covers installing, configuring, and using the VPA on Talos Linux.

## What Does the VPA Do?

The VPA has three main components:

1. **Recommender** - Watches resource usage of pods and computes recommended CPU and memory requests
2. **Updater** - Evicts pods that need resource adjustments so they can be recreated with updated resources
3. **Admission Controller** - Mutates new pods to apply the recommended resources at creation time

Together, these components ensure your pods always have appropriate resource allocations based on their actual consumption patterns.

## Installing the VPA

The VPA is not included in Kubernetes by default. Install it from the official repository:

```bash
# Clone the VPA repository
git clone https://github.com/kubernetes/autoscaler.git
cd autoscaler/vertical-pod-autoscaler

# Install the VPA components
./hack/vpa-up.sh
```

Alternatively, install it using the individual manifests:

```bash
# Apply VPA CRDs
kubectl apply -f https://raw.githubusercontent.com/kubernetes/autoscaler/master/vertical-pod-autoscaler/deploy/vpa-v1-crd-gen.yaml

# Apply RBAC
kubectl apply -f https://raw.githubusercontent.com/kubernetes/autoscaler/master/vertical-pod-autoscaler/deploy/vpa-rbac.yaml

# Deploy the VPA components
kubectl apply -f https://raw.githubusercontent.com/kubernetes/autoscaler/master/vertical-pod-autoscaler/deploy/recommender-deployment.yaml
kubectl apply -f https://raw.githubusercontent.com/kubernetes/autoscaler/master/vertical-pod-autoscaler/deploy/updater-deployment.yaml
kubectl apply -f https://raw.githubusercontent.com/kubernetes/autoscaler/master/vertical-pod-autoscaler/deploy/admission-controller-deployment.yaml
```

Verify the installation:

```bash
# Check that all VPA components are running
kubectl get pods -n kube-system | grep vpa

# Verify the VPA CRD is installed
kubectl get crd | grep verticalpodautoscalers
```

You should see three pods running: `vpa-recommender`, `vpa-updater`, and `vpa-admission-controller`.

## Creating a Sample Workload

Let us deploy a workload to test the VPA:

```yaml
# test-deployment.yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: resource-consumer
  labels:
    app: resource-consumer
spec:
  replicas: 2
  selector:
    matchLabels:
      app: resource-consumer
  template:
    metadata:
      labels:
        app: resource-consumer
    spec:
      containers:
      - name: consumer
        image: nginx:1.25
        resources:
          requests:
            cpu: "100m"
            memory: "64Mi"
          limits:
            cpu: "1000m"
            memory: "512Mi"
```

```bash
kubectl apply -f test-deployment.yaml
```

## VPA in Recommendation-Only Mode

The safest way to start with the VPA is in "Off" mode, which provides recommendations without making any changes:

```yaml
# vpa-off-mode.yaml
apiVersion: autoscaling.k8s.io/v1
kind: VerticalPodAutoscaler
metadata:
  name: resource-consumer-vpa
spec:
  targetRef:
    apiVersion: apps/v1
    kind: Deployment
    name: resource-consumer
  updatePolicy:
    updateMode: "Off"
```

```bash
kubectl apply -f vpa-off-mode.yaml

# Wait a few minutes for the VPA to collect data, then check recommendations
kubectl describe vpa resource-consumer-vpa
```

The output will include something like:

```text
Recommendation:
  Container Recommendations:
    Container Name:  consumer
    Lower Bound:
      Cpu:     25m
      Memory:  32Mi
    Target:
      Cpu:     50m
      Memory:  48Mi
    Uncapped Target:
      Cpu:     50m
      Memory:  48Mi
    Upper Bound:
      Cpu:     200m
      Memory:  128Mi
```

The fields mean:
- **Lower Bound**: Minimum recommended resources
- **Target**: The recommended resource request
- **Uncapped Target**: Target without considering min/max constraints
- **Upper Bound**: Maximum recommended resources

## VPA in Auto Mode

When you are confident in the recommendations, switch to "Auto" mode. In this mode, the VPA will actually modify pod resources:

```yaml
# vpa-auto-mode.yaml
apiVersion: autoscaling.k8s.io/v1
kind: VerticalPodAutoscaler
metadata:
  name: resource-consumer-vpa
spec:
  targetRef:
    apiVersion: apps/v1
    kind: Deployment
    name: resource-consumer
  updatePolicy:
    updateMode: "Auto"
  resourcePolicy:
    containerPolicies:
    - containerName: consumer
      minAllowed:
        cpu: "50m"
        memory: "64Mi"
      maxAllowed:
        cpu: "2"
        memory: "2Gi"
      controlledResources: ["cpu", "memory"]
```

```bash
kubectl apply -f vpa-auto-mode.yaml
```

In Auto mode, the VPA will evict pods that need resource adjustments and the new pods will be created with updated resource requests by the admission controller.

## VPA in Initial Mode

The "Initial" mode is a middle ground. It sets resource requests only when pods are first created but does not evict running pods:

```yaml
# vpa-initial-mode.yaml
apiVersion: autoscaling.k8s.io/v1
kind: VerticalPodAutoscaler
metadata:
  name: webapp-vpa
spec:
  targetRef:
    apiVersion: apps/v1
    kind: Deployment
    name: webapp
  updatePolicy:
    updateMode: "Initial"
  resourcePolicy:
    containerPolicies:
    - containerName: webapp
      minAllowed:
        cpu: "100m"
        memory: "128Mi"
      maxAllowed:
        cpu: "4"
        memory: "4Gi"
```

This is useful for workloads that are sensitive to restarts. New pods (from scaling events or deployments) get the recommended resources, but existing pods keep running with their current allocation.

## Controlling Which Resources Are Managed

You can configure the VPA to manage only CPU or only memory:

```yaml
# vpa-cpu-only.yaml
apiVersion: autoscaling.k8s.io/v1
kind: VerticalPodAutoscaler
metadata:
  name: webapp-vpa-cpu-only
spec:
  targetRef:
    apiVersion: apps/v1
    kind: Deployment
    name: webapp
  updatePolicy:
    updateMode: "Auto"
  resourcePolicy:
    containerPolicies:
    - containerName: webapp
      controlledResources: ["cpu"]
      # Memory will not be modified
```

This is handy when you have a good understanding of your application's memory needs but want the VPA to optimize CPU allocation.

## Multi-Container Pods

For pods with multiple containers, configure each container separately:

```yaml
# vpa-multi-container.yaml
apiVersion: autoscaling.k8s.io/v1
kind: VerticalPodAutoscaler
metadata:
  name: multi-container-vpa
spec:
  targetRef:
    apiVersion: apps/v1
    kind: Deployment
    name: multi-container-app
  updatePolicy:
    updateMode: "Auto"
  resourcePolicy:
    containerPolicies:
    - containerName: main-app
      minAllowed:
        cpu: "200m"
        memory: "256Mi"
      maxAllowed:
        cpu: "4"
        memory: "8Gi"
    - containerName: sidecar
      minAllowed:
        cpu: "50m"
        memory: "64Mi"
      maxAllowed:
        cpu: "500m"
        memory: "512Mi"
    - containerName: log-shipper
      mode: "Off"  # Don't touch this container
```

## VPA and HPA Together

Running VPA and HPA together requires care. They should not both manage the same metric. A safe combination is:

- HPA scales based on custom metrics (like requests per second)
- VPA manages CPU and memory requests

```yaml
# vpa-with-hpa.yaml
apiVersion: autoscaling.k8s.io/v1
kind: VerticalPodAutoscaler
metadata:
  name: webapp-vpa
spec:
  targetRef:
    apiVersion: apps/v1
    kind: Deployment
    name: webapp
  updatePolicy:
    updateMode: "Auto"
  resourcePolicy:
    containerPolicies:
    - containerName: webapp
      controlledResources: ["cpu", "memory"]
---
# HPA uses custom metrics, NOT cpu/memory
apiVersion: autoscaling/v2
kind: HorizontalPodAutoscaler
metadata:
  name: webapp-hpa
spec:
  scaleTargetRef:
    apiVersion: apps/v1
    kind: Deployment
    name: webapp
  minReplicas: 2
  maxReplicas: 20
  metrics:
  - type: Pods
    pods:
      metric:
        name: requests_per_second
      target:
        type: AverageValue
        averageValue: "100"
```

## Monitoring VPA on Talos Linux

```bash
# View all VPA resources
kubectl get vpa

# Get detailed recommendations
kubectl describe vpa resource-consumer-vpa

# Check VPA events
kubectl get events --field-selector reason=EvictedByVPA

# View VPA recommender logs
kubectl logs -n kube-system -l app=vpa-recommender --tail=50

# Check current resource requests vs VPA recommendations
kubectl get vpa resource-consumer-vpa -o jsonpath='{.status.recommendation.containerRecommendations[*]}' | python3 -m json.tool
```

## Best Practices

1. **Start with Off mode.** Always begin by collecting recommendations before enabling automatic updates.

2. **Set min and max bounds.** Prevent the VPA from setting resources too low (causing OOM kills) or too high (wasting resources).

3. **Be careful with stateful workloads.** VPA evictions can be disruptive for StatefulSets. Use "Initial" mode or "Off" mode for databases and similar workloads.

4. **Monitor eviction frequency.** If the VPA is constantly evicting pods, your workload might have highly variable resource usage. Consider using wider bounds or switching to "Initial" mode.

5. **Give it time.** The VPA needs several hours or days of historical data to make good recommendations. Do not expect accurate results immediately.

## Wrapping Up

The Vertical Pod Autoscaler on Talos Linux helps you maintain optimal resource allocation for your workloads without constant manual tuning. Start with recommendation-only mode to understand your application's resource patterns, then graduate to automatic mode once you trust the recommendations. Combined with the Horizontal Pod Autoscaler for replica scaling, the VPA ensures your pods are right-sized while your cluster handles load efficiently.
