# How to Optimize GKE Pod CPU and Memory Requests Using Vertical Pod Autoscaler Recommendations

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: GCP, GKE, Kubernetes, Vertical Pod Autoscaler, Resource Optimization

Description: Learn how to use the GKE Vertical Pod Autoscaler to right-size pod CPU and memory requests, reducing waste and improving cluster efficiency.

---

One of the trickiest parts of running workloads on GKE is setting the right CPU and memory requests for your pods. Set them too high and you waste money on unused resources. Set them too low and your pods get throttled or OOMKilled. Most teams guess at initial values and never revisit them, leading to clusters that are dramatically over-provisioned. The Vertical Pod Autoscaler (VPA) solves this by observing actual resource usage and recommending - or automatically applying - better values.

## The Problem with Manual Resource Requests

When you write a Kubernetes deployment spec, you specify CPU and memory requests and limits. Requests determine how much resource the scheduler reserves for your pod, while limits cap what the pod can actually use.

The typical developer experience goes something like this: you are not sure how much CPU your service needs, so you request 500m (half a CPU) and 512Mi of memory. It works fine. You never change it. Six months later, monitoring shows your service actually uses 50m of CPU and 80Mi of memory. You have been reserving 10x more CPU and 6x more memory than needed across dozens of replicas.

## How VPA Works

The Vertical Pod Autoscaler has three components:

- **Recommender**: Watches resource usage over time and calculates recommended requests
- **Updater**: Evicts pods that need to be updated with new resource recommendations
- **Admission Controller**: Sets resource requests on new pods when they are created

VPA analyzes historical CPU and memory usage data and produces four types of recommendations: lower bound, target, uncapped target, and upper bound. The target recommendation is what you typically want to use.

## Enabling VPA on GKE

VPA is built into GKE and just needs to be enabled on your cluster:

```bash
# Enable VPA on an existing GKE cluster
gcloud container clusters update my-cluster \
  --enable-vertical-pod-autoscaling \
  --region us-central1
```

For new clusters, add the flag at creation time:

```bash
# Create a new cluster with VPA enabled
gcloud container clusters create my-cluster \
  --enable-vertical-pod-autoscaling \
  --region us-central1 \
  --num-nodes 3
```

## Starting with Recommendation-Only Mode

I strongly recommend starting VPA in "Off" mode, which provides recommendations without actually changing anything. This lets you review the suggestions before applying them.

Create a VPA resource for your deployment:

```yaml
# vpa-recommendation.yaml
# This VPA object will observe the api-server deployment
# and provide recommendations without modifying pods
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
    # "Off" mode means VPA only provides recommendations
    # It will not modify pods automatically
    updateMode: "Off"
```

Apply it:

```bash
# Apply the VPA resource to start collecting recommendations
kubectl apply -f vpa-recommendation.yaml
```

Wait at least 24 hours (ideally a full week to capture different traffic patterns) before checking the recommendations:

```bash
# View VPA recommendations for the api-server deployment
kubectl describe vpa api-server-vpa -n production
```

The output will look something like this:

```
Recommendation:
  Container Recommendations:
    Container Name: api-server
    Lower Bound:
      Cpu:     25m
      Memory:  64Mi
    Target:
      Cpu:     100m
      Memory:  128Mi
    Uncapped Target:
      Cpu:     100m
      Memory:  128Mi
    Upper Bound:
      Cpu:     400m
      Memory:  512Mi
```

## Understanding the Recommendations

The four recommendation levels give you flexibility:

- **Lower Bound**: The minimum resources your container needs. Below this, you will likely see performance issues.
- **Target**: The recommended value based on observed usage. This is what VPA would set if you enabled auto mode.
- **Uncapped Target**: Same as target, but ignoring any min/max constraints you set in the VPA policy.
- **Upper Bound**: The maximum the container has used. Setting requests at this level gives lots of headroom.

For most production workloads, I recommend setting requests at the target value and limits at the upper bound (or slightly above). This gives your pods enough room to handle spikes without wasting resources during normal operation.

## Applying Recommendations Manually

After reviewing the recommendations, update your deployment:

```yaml
# Updated deployment with VPA-recommended resource values
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
        - name: api-server
          image: gcr.io/my-project/api-server:v2.1
          resources:
            requests:
              # Set to VPA target recommendation
              cpu: 100m
              memory: 128Mi
            limits:
              # Set to VPA upper bound for headroom
              cpu: 400m
              memory: 512Mi
```

## Enabling Auto Mode

Once you are comfortable with the recommendations and have validated them, you can switch to Auto mode where VPA will adjust resources automatically:

```yaml
# vpa-auto.yaml
# Auto mode will evict and recreate pods with updated resource values
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
    # Auto mode will update pods when recommendations change significantly
    updateMode: "Auto"
  resourcePolicy:
    containerPolicies:
      - containerName: api-server
        # Set minimum and maximum bounds to prevent extreme values
        minAllowed:
          cpu: 50m
          memory: 64Mi
        maxAllowed:
          cpu: 2
          memory: 2Gi
```

The `minAllowed` and `maxAllowed` constraints are important safety rails. Without them, VPA might set requests too low during quiet periods and cause issues when traffic returns.

## VPA and HPA Together

A common question is whether you can use VPA and the Horizontal Pod Autoscaler (HPA) together. The answer is yes, but with a caveat - VPA should not manage the same resource that HPA uses for scaling decisions.

If HPA scales based on CPU, then VPA should only manage memory. If HPA scales based on custom metrics, VPA can manage both CPU and memory.

```yaml
# VPA that only manages memory, leaving CPU for HPA
apiVersion: autoscaling.k8s.io/v1
kind: VerticalPodAutoscaler
metadata:
  name: api-server-vpa
spec:
  targetRef:
    apiVersion: apps/v1
    kind: Deployment
    name: api-server
  updatePolicy:
    updateMode: "Auto"
  resourcePolicy:
    containerPolicies:
      - containerName: api-server
        # Only manage memory, let HPA handle CPU-based scaling
        controlledResources: ["memory"]
        minAllowed:
          memory: 64Mi
        maxAllowed:
          memory: 2Gi
```

## Monitoring the Impact

After applying VPA recommendations, track the difference:

```bash
# Compare actual usage vs requests to measure resource efficiency
# This shows the ratio of actual CPU usage to requested CPU
kubectl top pods -n production --containers | sort -k3 -rn
```

You can also set up a Cloud Monitoring dashboard to track resource utilization before and after VPA changes. Key metrics to watch include `kubernetes.io/container/cpu/request_utilization` and `kubernetes.io/container/memory/request_utilization`. Healthy values are between 60 and 80 percent - high enough to be efficient but with room for bursts.

## Tips from Production Experience

After running VPA across many GKE clusters, here are a few things I have learned:

Always start with "Off" mode. Auto mode will restart your pods, and you want to understand the recommendations before that happens. Let VPA collect data for at least a week before trusting the recommendations, because weekend traffic patterns differ from weekday ones. Set reasonable min and max constraints in auto mode to avoid surprises. Use pod disruption budgets alongside VPA to ensure auto mode does not take down too many replicas at once during updates. Review VPA recommendations quarterly even in auto mode, because your application's resource profile changes as features are added.

Right-sizing pod resources is one of the highest-impact optimizations you can make on GKE. VPA takes the guesswork out of it, and the cost savings across a cluster with hundreds of pods can be substantial.
