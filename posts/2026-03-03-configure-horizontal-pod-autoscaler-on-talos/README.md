# How to Configure Horizontal Pod Autoscaler on Talos

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Talos Linux, Kubernetes, Horizontal Pod Autoscaler, HPA, Scaling, Performance

Description: Learn how to configure the Horizontal Pod Autoscaler on Talos Linux to automatically scale your application pods based on CPU, memory, and custom metrics.

---

The Horizontal Pod Autoscaler (HPA) is one of the most used scaling mechanisms in Kubernetes. It automatically adjusts the number of pod replicas in a Deployment, ReplicaSet, or StatefulSet based on observed metrics like CPU utilization or memory usage. On Talos Linux, the HPA works out of the box once you have the Metrics Server installed, making it straightforward to add automatic scaling to your workloads.

This guide covers setting up the HPA on Talos Linux, from basic CPU-based scaling to more advanced configurations.

## Prerequisites

The HPA relies on the Metrics Server to collect resource metrics from the kubelet on each node. On Talos Linux, you need to install it since it does not come pre-installed.

### Installing Metrics Server

```bash
# Install Metrics Server using the official manifest
kubectl apply -f https://github.com/kubernetes-sigs/metrics-server/releases/latest/download/components.yaml
```

On some Talos Linux setups, especially with self-signed certificates, you may need to add the `--kubelet-insecure-tls` flag:

```bash
# Patch Metrics Server to allow insecure TLS (for development/testing)
kubectl patch deployment metrics-server -n kube-system --type='json' \
  -p='[{"op": "add", "path": "/spec/template/spec/containers/0/args/-", "value": "--kubelet-insecure-tls"}]'
```

Verify Metrics Server is working:

```bash
# Wait for metrics-server to be ready
kubectl -n kube-system rollout status deployment metrics-server

# Check node metrics
kubectl top nodes

# Check pod metrics
kubectl top pods --all-namespaces
```

## Creating a Sample Application

Let us deploy a simple application to scale:

```yaml
# webapp-deployment.yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: webapp
  labels:
    app: webapp
spec:
  replicas: 2
  selector:
    matchLabels:
      app: webapp
  template:
    metadata:
      labels:
        app: webapp
    spec:
      containers:
      - name: webapp
        image: nginx:1.25
        ports:
        - containerPort: 80
        resources:
          # Resource requests are REQUIRED for HPA to work
          requests:
            cpu: "100m"
            memory: "128Mi"
          limits:
            cpu: "500m"
            memory: "256Mi"
---
apiVersion: v1
kind: Service
metadata:
  name: webapp
spec:
  selector:
    app: webapp
  ports:
  - port: 80
    targetPort: 80
```

```bash
kubectl apply -f webapp-deployment.yaml
```

Important: The HPA requires resource requests to be set on your containers. Without them, the HPA cannot calculate utilization percentages.

## Basic HPA with CPU Scaling

Create an HPA that scales based on CPU utilization:

```bash
# Create HPA using kubectl
kubectl autoscale deployment webapp \
  --cpu-percent=50 \
  --min=2 \
  --max=10
```

This creates an HPA that:
- Maintains between 2 and 10 replicas
- Targets 50% average CPU utilization across all pods
- Scales up when average CPU exceeds 50%, scales down when it drops below

```bash
# Check the HPA status
kubectl get hpa webapp

# Get detailed information
kubectl describe hpa webapp
```

## HPA with YAML Manifest

For production use, define your HPA declaratively:

```yaml
# hpa-cpu.yaml
apiVersion: autoscaling/v2
kind: HorizontalPodAutoscaler
metadata:
  name: webapp-hpa
  namespace: default
spec:
  scaleTargetRef:
    apiVersion: apps/v1
    kind: Deployment
    name: webapp
  minReplicas: 2
  maxReplicas: 20
  metrics:
  - type: Resource
    resource:
      name: cpu
      target:
        type: Utilization
        averageUtilization: 50
```

```bash
kubectl apply -f hpa-cpu.yaml
```

## HPA with Memory Scaling

You can scale based on memory utilization as well:

```yaml
# hpa-memory.yaml
apiVersion: autoscaling/v2
kind: HorizontalPodAutoscaler
metadata:
  name: webapp-hpa-memory
spec:
  scaleTargetRef:
    apiVersion: apps/v1
    kind: Deployment
    name: webapp
  minReplicas: 2
  maxReplicas: 15
  metrics:
  - type: Resource
    resource:
      name: memory
      target:
        type: Utilization
        averageUtilization: 70
```

Be careful with memory-based scaling. Unlike CPU, memory is not easily reclaimed. An application might allocate memory and hold onto it even when load decreases, which means the HPA might not scale down as expected.

## Combined CPU and Memory Scaling

You can use multiple metrics together. The HPA will scale to satisfy all metric targets:

```yaml
# hpa-combined.yaml
apiVersion: autoscaling/v2
kind: HorizontalPodAutoscaler
metadata:
  name: webapp-hpa-combined
spec:
  scaleTargetRef:
    apiVersion: apps/v1
    kind: Deployment
    name: webapp
  minReplicas: 3
  maxReplicas: 25
  metrics:
  - type: Resource
    resource:
      name: cpu
      target:
        type: Utilization
        averageUtilization: 60
  - type: Resource
    resource:
      name: memory
      target:
        type: Utilization
        averageUtilization: 75
```

When multiple metrics are specified, the HPA calculates the desired replica count for each metric and picks the highest number. This ensures that all metrics are satisfied.

## Scaling Based on Absolute Values

Instead of percentages, you can target absolute resource values:

```yaml
# hpa-absolute.yaml
apiVersion: autoscaling/v2
kind: HorizontalPodAutoscaler
metadata:
  name: webapp-hpa-absolute
spec:
  scaleTargetRef:
    apiVersion: apps/v1
    kind: Deployment
    name: webapp
  minReplicas: 2
  maxReplicas: 10
  metrics:
  - type: Resource
    resource:
      name: cpu
      target:
        type: AverageValue
        averageValue: 200m
  - type: Resource
    resource:
      name: memory
      target:
        type: AverageValue
        averageValue: 200Mi
```

This approach scales to keep average CPU usage per pod at 200 millicores and average memory at 200 MiB, regardless of what the resource requests are set to.

## Configuring Scaling Behavior

The `behavior` field gives you fine-grained control over how fast scaling happens:

```yaml
# hpa-behavior.yaml
apiVersion: autoscaling/v2
kind: HorizontalPodAutoscaler
metadata:
  name: webapp-hpa-controlled
spec:
  scaleTargetRef:
    apiVersion: apps/v1
    kind: Deployment
    name: webapp
  minReplicas: 2
  maxReplicas: 50
  metrics:
  - type: Resource
    resource:
      name: cpu
      target:
        type: Utilization
        averageUtilization: 50
  behavior:
    scaleUp:
      stabilizationWindowSeconds: 60
      policies:
      # Scale up by at most 4 pods per minute
      - type: Pods
        value: 4
        periodSeconds: 60
      # Or scale up by at most 100% per minute
      - type: Percent
        value: 100
        periodSeconds: 60
      selectPolicy: Max
    scaleDown:
      stabilizationWindowSeconds: 300
      policies:
      # Scale down by at most 2 pods per minute
      - type: Pods
        value: 2
        periodSeconds: 60
      selectPolicy: Min
```

The `stabilizationWindowSeconds` prevents flapping by looking at metrics over a time window before making scaling decisions. The `selectPolicy` determines which policy to use when multiple apply - `Max` picks the policy that changes the most replicas (for aggressive scaling), `Min` picks the least (for conservative scaling).

## Load Testing the HPA

Generate load to see the HPA in action:

```bash
# Deploy a load generator
kubectl run load-generator --image=busybox:1.36 --restart=Never -- /bin/sh -c \
  "while true; do wget -q -O- http://webapp.default.svc.cluster.local; done"

# Watch the HPA react
kubectl get hpa webapp-hpa -w

# In another terminal, watch pods scale
kubectl get pods -l app=webapp -w
```

You should see the CPU utilization climb, and the HPA will start adding pods to bring utilization back down to the target.

```bash
# Stop the load generator
kubectl delete pod load-generator

# Watch the HPA scale back down (after the stabilization window)
kubectl get hpa webapp-hpa -w
```

## Monitoring HPA Events

```bash
# View HPA events
kubectl describe hpa webapp-hpa | tail -20

# Check HPA conditions
kubectl get hpa webapp-hpa -o yaml | grep -A 20 "conditions:"

# View scaling events across the namespace
kubectl get events --field-selector reason=SuccessfulRescale
```

## Common Issues on Talos Linux

**Metrics not available.** If you see `<unknown>` in the TARGETS column of `kubectl get hpa`, the Metrics Server is not returning data. Check that it is running and can reach the kubelets:

```bash
# Check Metrics Server logs
kubectl logs -n kube-system -l k8s-app=metrics-server

# Verify metrics API is available
kubectl get --raw /apis/metrics.k8s.io/v1beta1/nodes
```

**Missing resource requests.** The HPA cannot calculate utilization without resource requests. Always set them on containers you want to autoscale.

**Slow scaling.** The default HPA sync period is 15 seconds. If scaling feels slow, check the stabilization windows in your behavior configuration.

## Wrapping Up

The Horizontal Pod Autoscaler is a must-have for production workloads on Talos Linux. Install the Metrics Server, set resource requests on your containers, and create HPA resources that match your application's scaling needs. Use the behavior field to control scaling speed, and always test your scaling configuration under load before relying on it in production. The HPA keeps your applications responsive during traffic spikes while saving resources during quiet periods.
