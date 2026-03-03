# How to Scale Based on CPU/Memory Metrics on Talos Linux

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Talos Linux, Kubernetes, Autoscaling, CPU Metrics, Memory Metrics, HPA

Description: A hands-on guide to scaling Kubernetes workloads based on CPU and memory utilization metrics on Talos Linux clusters.

---

CPU and memory are the most straightforward metrics for autoscaling Kubernetes workloads. They are available out of the box through the Metrics Server, require no custom metric pipelines, and work well for a wide range of applications. On Talos Linux, scaling based on these resource metrics is the first autoscaling capability most teams set up, and for many workloads, it is all you need.

This guide covers the practical details of setting up resource-based autoscaling on Talos Linux, including how to choose the right thresholds, handle edge cases, and avoid common mistakes.

## Installing the Metrics Server

The Metrics Server is a prerequisite for resource-based autoscaling. It collects CPU and memory usage data from the kubelet on each node and makes it available through the Kubernetes Metrics API.

```bash
# Install Metrics Server
kubectl apply -f https://github.com/kubernetes-sigs/metrics-server/releases/latest/download/components.yaml

# On some Talos setups, you may need to patch for TLS
kubectl patch deployment metrics-server -n kube-system --type='json' \
  -p='[{"op": "add", "path": "/spec/template/spec/containers/0/args/-", "value": "--kubelet-insecure-tls"}]'

# Wait for it to be ready
kubectl rollout status deployment metrics-server -n kube-system

# Verify it works
kubectl top nodes
kubectl top pods
```

If `kubectl top` returns actual values instead of errors, you are good to go.

## Understanding CPU Metrics

Kubernetes measures CPU in millicores (m). One core equals 1000 millicores. When you set a resource request of 200m, you are requesting 20% of one CPU core.

The HPA calculates CPU utilization as:

```
utilization = (current CPU usage / CPU request) * 100
```

For example, if a pod requests 200m of CPU and is currently using 160m, its utilization is 80%.

```bash
# Check current CPU usage of pods in a deployment
kubectl top pods -l app=webapp

# Output example:
# NAME                     CPU(cores)   MEMORY(bytes)
# webapp-abc123-xyz        156m         89Mi
# webapp-abc123-def        142m         91Mi
```

## Understanding Memory Metrics

Memory is measured in bytes, typically expressed as Mi (mebibytes) or Gi (gibibytes). The utilization calculation is the same as CPU:

```
utilization = (current memory usage / memory request) * 100
```

One important difference is that memory is not as elastic as CPU. When a pod allocates memory, it may hold onto it even when the load decreases. This means memory-based scaling can be less responsive on the way down.

## Setting Up a Deployment with Resource Requests

Resource requests are mandatory for the HPA to work. Without them, the HPA cannot calculate utilization percentages:

```yaml
# webapp-deployment.yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: webapp
  labels:
    app: webapp
spec:
  replicas: 3
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
          requests:
            cpu: "200m"
            memory: "256Mi"
          limits:
            cpu: "1000m"
            memory: "512Mi"
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

## CPU-Based Scaling

Create an HPA that targets CPU utilization:

```yaml
# hpa-cpu.yaml
apiVersion: autoscaling/v2
kind: HorizontalPodAutoscaler
metadata:
  name: webapp-cpu-hpa
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
      name: cpu
      target:
        type: Utilization
        averageUtilization: 60
```

```bash
kubectl apply -f hpa-cpu.yaml

# Check HPA status
kubectl get hpa webapp-cpu-hpa
```

With this configuration, the HPA will:
- Scale up when average CPU utilization exceeds 60%
- Scale down when it drops below 60% (after the stabilization period)
- Keep replicas between 2 and 15

## Memory-Based Scaling

```yaml
# hpa-memory.yaml
apiVersion: autoscaling/v2
kind: HorizontalPodAutoscaler
metadata:
  name: webapp-memory-hpa
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

A higher threshold for memory (70% vs 60% for CPU) is common because memory usage tends to be more stable and predictable than CPU.

## Combined CPU and Memory Scaling

The most robust approach uses both metrics:

```yaml
# hpa-combined.yaml
apiVersion: autoscaling/v2
kind: HorizontalPodAutoscaler
metadata:
  name: webapp-combined-hpa
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
        averageUtilization: 60
  - type: Resource
    resource:
      name: memory
      target:
        type: Utilization
        averageUtilization: 75
  behavior:
    scaleUp:
      stabilizationWindowSeconds: 30
      policies:
      - type: Percent
        value: 50
        periodSeconds: 60
    scaleDown:
      stabilizationWindowSeconds: 300
      policies:
      - type: Percent
        value: 25
        periodSeconds: 60
```

When both metrics are specified, the HPA picks the metric that requires the most replicas. This ensures both CPU and memory targets are satisfied.

## Choosing the Right Thresholds

Picking the right target utilization depends on your application:

**CPU-intensive web servers (nginx, API servers):**
- Target: 50-60% CPU
- These applications need headroom for traffic spikes

**Background workers (queue processors, batch jobs):**
- Target: 70-80% CPU
- More consistent workloads can tolerate higher utilization

**Memory-heavy applications (caches, data processing):**
- Target: 70-80% memory
- Leave headroom to prevent OOM kills

**Mixed workloads:**
- CPU target: 60%
- Memory target: 75%
- Start conservative and adjust based on observation

## Load Testing to Validate Scaling

Generate load and observe the scaling behavior:

```bash
# Deploy a load generator
kubectl run load-test --image=busybox:1.36 --restart=Never -- /bin/sh -c \
  "while true; do wget -q -O- http://webapp.default.svc.cluster.local; done"

# Watch the HPA in real time
kubectl get hpa webapp-combined-hpa -w

# In another terminal, watch pod count
kubectl get pods -l app=webapp -w
```

Monitor the scaling:

```bash
# Check current utilization
kubectl top pods -l app=webapp

# View HPA events
kubectl describe hpa webapp-combined-hpa | tail -20

# Check scaling decisions
kubectl get events --field-selector reason=SuccessfulRescale --sort-by='.lastTimestamp'
```

Stop the load test and observe scale-down:

```bash
# Stop the load generator
kubectl delete pod load-test

# The HPA will scale down after the stabilization window (default 5 minutes)
kubectl get hpa webapp-combined-hpa -w
```

## Using Absolute Values Instead of Percentages

Sometimes targeting absolute values makes more sense:

```yaml
# hpa-absolute-values.yaml
apiVersion: autoscaling/v2
kind: HorizontalPodAutoscaler
metadata:
  name: webapp-absolute-hpa
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
        type: AverageValue
        averageValue: "150m"   # Target 150 millicores per pod
  - type: Resource
    resource:
      name: memory
      target:
        type: AverageValue
        averageValue: "200Mi"  # Target 200 MiB per pod
```

This approach is useful when you know your application performs best at a specific resource usage level, regardless of what the requests are set to.

## Common Mistakes

**Not setting resource requests.** The HPA shows `<unknown>` for targets if containers do not have resource requests.

**Setting requests too high.** If you request 1 CPU but your app only uses 100m, utilization stays at 10% and the HPA never scales up, even under load.

**Setting requests too low.** If you request 50m but your app needs 500m at baseline, the HPA calculates 1000% utilization and scales to the maximum immediately.

**Ignoring the scaling algorithm.** The HPA uses this formula:
```
desiredReplicas = ceil(currentReplicas * (currentMetricValue / desiredMetricValue))
```

Understanding this helps explain why the HPA sometimes scales to unexpected replica counts.

**Not configuring behavior.** Without explicit behavior settings, the HPA may scale up and down too aggressively, causing unnecessary pod churn.

## Monitoring and Alerting

Set up monitoring to track scaling behavior:

```bash
# Create a script to log HPA status over time
while true; do
  echo "$(date): $(kubectl get hpa webapp-combined-hpa --no-headers)"
  sleep 30
done
```

For production environments, set up Prometheus alerts:

```yaml
# Alert when HPA is at max replicas
- alert: HPAAtMaxReplicas
  expr: kube_horizontalpodautoscaler_status_current_replicas == kube_horizontalpodautoscaler_spec_max_replicas
  for: 15m
  labels:
    severity: warning
  annotations:
    summary: "HPA {{ $labels.horizontalpodautoscaler }} is at maximum replicas"
```

## Wrapping Up

Scaling based on CPU and memory metrics is the foundation of autoscaling on Talos Linux. Install the Metrics Server, set appropriate resource requests on your containers, and create HPA resources with sensible thresholds. Start with conservative targets, load test to validate behavior, and tune based on your observations. For most workloads, this straightforward approach provides effective automatic scaling without the complexity of custom metrics pipelines.
