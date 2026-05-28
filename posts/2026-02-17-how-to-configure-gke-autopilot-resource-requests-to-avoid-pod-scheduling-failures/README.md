# Configure GKE Autopilot Resource Requests to Avoid Pod Scheduling Failures

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: GCP, GKE, Autopilot, Kubernetes, Resource Management, Pod Scheduling

Description: Learn how to properly configure resource requests in GKE Autopilot to prevent pod scheduling failures and optimize costs with Autopilot's unique resource model.

---

GKE Autopilot is a managed Kubernetes mode where Google takes care of the nodes entirely. You just define your workloads, and Autopilot provisions the right amount of compute. But this convenience comes with a catch: Autopilot is strict about resource requests. If your pods do not have them set correctly, they will fail to schedule, get mutated in unexpected ways, or cost more than they should.

Understanding how Autopilot handles resource requests is the key to running workloads on it smoothly.

## How Autopilot Differs from Standard

In GKE Standard, you manage node pools and can run pods without resource requests (though it is not recommended). In Autopilot, every pod must have resource requests. If you do not specify them, Autopilot applies defaults.

The defaults are:

- CPU: 500m (0.5 vCPU)
- Memory: 2Gi
- Ephemeral storage: 1Gi

These defaults might be way more than your small utility pods need, leading to unnecessary costs. Or they might be less than your application needs, leading to OOM kills and poor performance.

## Setting Resource Requests Properly

Always explicitly set resource requests for every container in your pods. This gives you control over costs and prevents Autopilot from guessing.

Here is a properly configured deployment for Autopilot:

```yaml
# deployment.yaml - Deployment with explicit resource requests for Autopilot

apiVersion: apps/v1
kind: Deployment
metadata:
  name: web-app
  namespace: default
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
        - name: web-app
          image: us-docker.pkg.dev/my-project/my-repo/web-app:v1.0
          resources:
            requests:
              # Set CPU and memory to what the app actually needs
              cpu: 250m
              memory: 512Mi
              ephemeral-storage: 100Mi
            limits:
              # Set limits equal to requests for Guaranteed QoS
              cpu: 250m
              memory: 512Mi
              ephemeral-storage: 100Mi
```

## Understanding Autopilot's Resource Minimums

Autopilot enforces minimum resource requests per pod. If your requests are below these minimums, Autopilot will automatically bump them up.

The current minimums for the default general-purpose compute class depend on whether your cluster supports bursting:

- CPU: 50m per pod with bursting, or 250m per pod without bursting
- Memory: 52Mi per pod with bursting, or 512Mi per pod without bursting
- Ephemeral storage: 10Mi per container

Note that the CPU and memory minimums are per-pod minimums, not per-container. If your non-bursting pod has two containers each requesting 100m CPU, the total is 200m, which is below the 250m minimum. Autopilot will increase one of the container requests to meet the minimum.

This matters because you are billed based on the actual resource requests, not what you specified. Check what Autopilot actually allocated:

```bash
# Check the actual resource requests after Autopilot mutation
kubectl get pod my-pod -o jsonpath='{.spec.containers[*].resources}' | python3 -m json.tool
```

Resource Request Ratios

Autopilot requires specific ratios between CPU and memory. You cannot request 8 CPUs with 512Mi of memory because the ratio is too skewed. For the default general-purpose compute class, the allowed ratios are:

- For every 1 vCPU, you can request between 1Gi and 6.5Gi of memory
- The minimum for the default general-purpose class is 50m CPU with 52Mi memory on clusters that support bursting, or 250m CPU with 512Mi memory on clusters that do not support bursting
- The maximum per pod is 30 vCPU with 110Gi memory for the default general-purpose compute class

If your requests do not fit within these ratios, Autopilot will adjust them. This adjustment always goes up, never down, so you end up paying for more than you requested.

Here is a quick reference for common configurations:

```yaml
# Good: 1:2 CPU to memory ratio (well within bounds)
resources:
  requests:
    cpu: "1"
    memory: 2Gi

# Good: 1:4 CPU to memory ratio (standard for most apps)
resources:
  requests:
    cpu: "1"
    memory: 4Gi

# Will be adjusted: too much memory for the CPU
resources:
  requests:
    cpu: 250m
    memory: 4Gi  # Autopilot will increase CPU to meet the ratio
```

## Compute Classes

Autopilot offers different compute classes for different workload types:

- **General-purpose** (default): Balanced CPU and memory, good for most workloads
- **Balanced**: Higher maximum CPU and memory capacity than the default platform
- **Scale-Out**: Optimized for horizontal scaling with simultaneous multi-threading disabled
- **Performance**: For workloads that need specific Compute Engine machine series

Specify the compute class with a node selector:

```yaml
# deployment.yaml - Using the Scale-Out compute class for lightweight pods
apiVersion: apps/v1
kind: Deployment
metadata:
  name: worker
spec:
  replicas: 10
  selector:
    matchLabels:
      app: worker
  template:
    metadata:
      labels:
        app: worker
    spec:
      nodeSelector:
        # Use Scale-Out class for horizontally scaled pods
        cloud.google.com/compute-class: Scale-Out
      containers:
        - name: worker
          image: us-docker.pkg.dev/my-project/my-repo/worker:v1.0
          resources:
            requests:
              cpu: 250m
              memory: 1Gi
```

The Scale-Out class uses a 1:4 CPU-to-memory ratio and can be a good fit for horizontally scaled workloads.

## Debugging Scheduling Failures

When a pod fails to schedule on Autopilot, the events tell you why. Common errors include:

```bash
# Check events for scheduling failures
kubectl describe pod my-failing-pod
```

**"Insufficient cpu" or "Insufficient memory"**: Your pod's requested resources cannot currently be satisfied. Check the compute class limits, requested zones, and resource availability.

**"Does not have minimum availability"**: Autopilot could not provision nodes in the requested zone. Try adding topology spread constraints or using a regional cluster.

**"Pod has unbound immediate PersistentVolumeClaims"**: Your PVC is not provisioned yet. Check storage class and PV status.

## Right-Sizing with VPA Recommendations

Use the Vertical Pod Autoscaler in recommendation mode to find the right resource requests:

```yaml
# vpa.yaml - VPA for getting resource recommendations on Autopilot
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
    # Use "Off" to get recommendations without auto-applying them
    updateMode: "Off"
```

After running for a few hours, check the recommendations:

```bash
# Get VPA recommendations for your workload
kubectl get vpa web-app-vpa -o yaml | grep -A 20 recommendation
```

Use these recommendations to set your resource requests accurately.

## Cost Optimization Tips

Since you pay per pod resource request for general-purpose Autopilot workloads, optimization matters. Here are practical strategies:

First, do not over-request. If your app uses 200m CPU, do not request 1 CPU "just in case." Use VPA recommendations to find the right values.

Second, use the right compute class. Scale-Out is designed for horizontally scaled workloads. General-purpose is better when you do not need specialized CPU behavior or higher compute-class limits.

Third, use Horizontal Pod Autoscaler to scale replicas based on load instead of over-provisioning individual pods:

```yaml
# hpa.yaml - Scale pods horizontally instead of over-provisioning
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
  maxReplicas: 20
  metrics:
    - type: Resource
      resource:
        name: cpu
        target:
          type: Utilization
          averageUtilization: 70
```

Fourth, use Spot pods for fault-tolerant workloads by adding a toleration and node selector:

```yaml
# Spot pod configuration for cost savings on fault-tolerant workloads
nodeSelector:
  cloud.google.com/gke-spot: "true"
tolerations:
  - key: cloud.google.com/gke-spot
    operator: Equal
    value: "true"
    effect: NoSchedule
```

Spot pods cost significantly less but can be preempted. They work well for batch jobs, workers, and development environments.

Getting resource requests right on Autopilot takes some upfront effort, but it pays off in both reliability and cost. Take the time to measure, set explicit values, and choose the right compute class for each workload.
