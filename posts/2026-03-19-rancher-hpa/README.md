# How to Configure Horizontal Pod Autoscaling in Rancher

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Rancher, Kubernetes, HPA, Workload

Description: Learn how to configure Horizontal Pod Autoscaling (HPA) in Rancher to automatically scale workloads based on CPU, memory, or custom metrics.

Horizontal Pod Autoscaling (HPA) automatically adjusts the number of pod replicas in a workload based on observed metrics like CPU utilization, memory usage, or custom application metrics. This ensures your application can handle variable traffic loads while keeping costs under control during low-demand periods. This guide walks you through setting up HPA in Rancher.

## Prerequisites

- A running Rancher instance (v2.7 or later)
- A managed Kubernetes cluster with the Metrics Server installed
- A Deployment or StatefulSet workload with resource requests defined
- (Optional) Prometheus and a compatible metrics adapter for custom metrics-based scaling

## Step 1: Verify Metrics Server

HPA requires resource metrics to be available in your cluster. Clusters created in Rancher v2.0.7 and later generally have the required Metrics Server and cluster configuration. Verify metrics are available:

```bash
kubectl top nodes
```

If you get a `Metrics API not available` error, install Metrics Server according to your cluster distribution or use the official installation manifest:

```bash
kubectl apply -f https://github.com/kubernetes-sigs/metrics-server/releases/latest/download/components.yaml
```

## Step 2: Ensure Resource Requests Are Set

HPA calculates utilization as a percentage of the resource request. Your workload must have CPU or memory requests defined. If not, update your workload first:

```yaml
spec:
  template:
    spec:
      containers:
        - name: my-app
          image: my-app:latest
          resources:
            requests:
              cpu: 200m
              memory: 256Mi
            limits:
              cpu: 1000m
              memory: 512Mi
```

## Step 3: Create an HPA via the Rancher UI

1. In Rancher, go to **Cluster Management**, open your cluster, and click **Explore**
2. Navigate to **Service Discovery > HorizontalPodAutoscalers**
3. Click **Create**

Configure the HPA:

- **Name**: Enter a name like `my-app-hpa`
- **Target Reference**: Select your deployment
- **Min Replicas**: The minimum number of pods (e.g., `2`)
- **Max Replicas**: The maximum number of pods (e.g., `10`)

Add a metric:

- **Metric Type**: Resource
- **Resource**: CPU
- **Target Type**: Utilization
- **Target Value**: `70` (scale when average CPU usage exceeds 70% of request)

## Step 4: Create an HPA via YAML

For more control, use YAML through the **Import YAML** feature:

### CPU-Based HPA

```yaml
apiVersion: autoscaling/v2
kind: HorizontalPodAutoscaler
metadata:
  name: my-app-hpa
  namespace: default
spec:
  scaleTargetRef:
    apiVersion: apps/v1
    kind: Deployment
    name: my-app
  minReplicas: 2
  maxReplicas: 10
  metrics:
    - type: Resource
      resource:
        name: cpu
        target:
          type: Utilization
          averageUtilization: 70
```

### Memory-Based HPA

```yaml
apiVersion: autoscaling/v2
kind: HorizontalPodAutoscaler
metadata:
  name: my-app-memory-hpa
  namespace: default
spec:
  scaleTargetRef:
    apiVersion: apps/v1
    kind: Deployment
    name: my-app
  minReplicas: 2
  maxReplicas: 10
  metrics:
    - type: Resource
      resource:
        name: memory
        target:
          type: Utilization
          averageUtilization: 80
```

### Multi-Metric HPA

You can combine multiple metrics. The HPA will scale based on whichever metric requires the most replicas:

```yaml
apiVersion: autoscaling/v2
kind: HorizontalPodAutoscaler
metadata:
  name: my-app-multi-hpa
  namespace: default
spec:
  scaleTargetRef:
    apiVersion: apps/v1
    kind: Deployment
    name: my-app
  minReplicas: 2
  maxReplicas: 20
  metrics:
    - type: Resource
      resource:
        name: cpu
        target:
          type: Utilization
          averageUtilization: 70
    - type: Resource
      resource:
        name: memory
        target:
          type: Utilization
          averageUtilization: 80
```

## Step 5: Configure Scaling Behavior

The `behavior` field controls the rate of scaling to prevent flapping:

```yaml
apiVersion: autoscaling/v2
kind: HorizontalPodAutoscaler
metadata:
  name: my-app-hpa
  namespace: default
spec:
  scaleTargetRef:
    apiVersion: apps/v1
    kind: Deployment
    name: my-app
  minReplicas: 2
  maxReplicas: 20
  metrics:
    - type: Resource
      resource:
        name: cpu
        target:
          type: Utilization
          averageUtilization: 70
  behavior:
    scaleUp:
      stabilizationWindowSeconds: 0
      policies:
        - type: Percent
          value: 100
          periodSeconds: 60
        - type: Pods
          value: 4
          periodSeconds: 60
      selectPolicy: Max
    scaleDown:
      stabilizationWindowSeconds: 300
      policies:
        - type: Percent
          value: 10
          periodSeconds: 60
```

This configuration:

- Scales up immediately by up to 100% or 4 pods per minute (whichever is larger)
- Scales down by only 10% per minute
- Uses a 5-minute downscale stabilization window

## Step 6: Verify the HPA

Check the HPA status in the Rancher UI under **Service Discovery > HorizontalPodAutoscalers**, or use kubectl:

```bash
kubectl get hpa my-app-hpa -n default
```

Output:

```plaintext
NAME         REFERENCE           TARGETS   MINPODS   MAXPODS   REPLICAS   AGE
my-app-hpa   Deployment/my-app   35%/70%   2         10        2          5m
```

The `TARGETS` column shows current usage vs. target.

For detailed information:

```bash
kubectl describe hpa my-app-hpa -n default
```

## Step 7: Test the HPA

Generate load to trigger scaling:

```bash
kubectl run load-generator --image=busybox --restart=Never -- \
  sh -c "while true; do wget -q -O- http://my-app-service; done"
```

Watch the HPA respond:

```bash
kubectl get hpa my-app-hpa -n default --watch
```

You should see the replica count increase as CPU usage rises above 70%.

Clean up the load generator:

```bash
kubectl delete pod load-generator
```

## Summary

Horizontal Pod Autoscaling in Rancher ensures your workloads scale automatically to meet demand. Start with CPU-based scaling as a baseline, add memory-based metrics for memory-intensive applications, and configure scaling behavior to prevent flapping. Always ensure resource requests are set on your containers, as HPA depends on them for utilization calculations.
