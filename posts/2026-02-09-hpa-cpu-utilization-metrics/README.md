# How to Configure HorizontalPodAutoscaler with CPU Utilization Metrics

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Kubernetes, HPA, Autoscaling

Description: Configure Horizontal Pod Autoscaler with CPU utilization metrics to automatically scale your Kubernetes workloads based on processor usage patterns and maintain optimal application performance.

---

CPU utilization remains the most common metric for autoscaling Kubernetes workloads. When your application's CPU usage increases, HPA automatically adds more pods to distribute the load. When CPU usage drops, HPA scales down to conserve resources. This simple but effective approach works well for CPU-bound applications where processing power directly correlates with capacity.

The Horizontal Pod Autoscaler monitors CPU metrics from the Metrics Server and calculates the desired number of replicas to maintain your target utilization. By configuring CPU-based autoscaling correctly, you ensure your applications have enough capacity to handle traffic spikes while avoiding unnecessary resource costs during quiet periods.

## Understanding CPU Utilization in HPA

HPA measures CPU utilization as a percentage of the CPU request defined in your pod spec. If a container requests 500m (0.5 cores) and uses 250m, that's 50% utilization. HPA averages this percentage across all pods and compares it to your target to determine whether to scale.

The calculation looks at actual CPU usage reported by the kubelet, not CPU limits. This means your target utilization percentage relates to requests, not limits. Setting requests accurately is critical for effective CPU-based autoscaling.

## Prerequisites for CPU-Based HPA

Before configuring HPA, ensure the Metrics Server is running in your cluster.

```bash
# Check if Metrics Server is installed
kubectl get deployment metrics-server -n kube-system

# If not installed, deploy it
kubectl apply -f https://github.com/kubernetes-sigs/metrics-server/releases/latest/download/components.yaml

# Verify metrics are available
kubectl top nodes
kubectl top pods -n default
```

Without the Metrics Server, HPA cannot retrieve CPU metrics and will show unknown status.

## Basic CPU-Based HPA Configuration

Create a deployment with CPU requests defined.

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: web-application
  namespace: production
spec:
  replicas: 3
  selector:
    matchLabels:
      app: web
  template:
    metadata:
      labels:
        app: web
    spec:
      containers:
      - name: web-server
        image: nginx:1.21
        resources:
          requests:
            cpu: 200m        # Required for HPA CPU metrics
            memory: 256Mi
          limits:
            cpu: 500m
            memory: 512Mi
        ports:
        - containerPort: 80
```

Now configure HPA to scale based on CPU utilization.

```yaml
apiVersion: autoscaling/v2
kind: HorizontalPodAutoscaler
metadata:
  name: web-app-hpa
  namespace: production
spec:
  scaleTargetRef:
    apiVersion: apps/v1
    kind: Deployment
    name: web-application
  minReplicas: 3
  maxReplicas: 30
  metrics:
  - type: Resource
    resource:
      name: cpu
      target:
        type: Utilization
        averageUtilization: 70  # Scale when average CPU exceeds 70%
```

Apply both manifests.

```bash
kubectl apply -f deployment.yaml
kubectl apply -f hpa.yaml

# Check HPA status
kubectl get hpa web-app-hpa -n production

# Watch for scaling events
kubectl get hpa web-app-hpa -n production -w
```

HPA now maintains average CPU utilization around 70% by adjusting replica count between 3 and 30.

## Setting Appropriate Target Utilization

The target utilization value significantly impacts scaling behavior. Too low, and you waste resources. Too high, and you risk performance degradation during traffic spikes.

```yaml
apiVersion: autoscaling/v2
kind: HorizontalPodAutoscaler
metadata:
  name: api-server-hpa
spec:
  scaleTargetRef:
    apiVersion: apps/v1
    kind: Deployment
    name: api-server
  minReplicas: 5
  maxReplicas: 100
  metrics:
  - type: Resource
    resource:
      name: cpu
      target:
        type: Utilization
        averageUtilization: 60  # Conservative for latency-sensitive apps
```

For latency-sensitive applications, target 50-70% CPU utilization to maintain headroom for traffic bursts. Batch processing workloads can tolerate 80-90% since brief periods at 100% won't impact user experience.

## Configuring Scale-Up and Scale-Down Behavior

Control how aggressively HPA responds to CPU changes with behavior policies.

```yaml
apiVersion: autoscaling/v2
kind: HorizontalPodAutoscaler
metadata:
  name: controlled-scaling-hpa
spec:
  scaleTargetRef:
    apiVersion: apps/v1
    kind: Deployment
    name: backend-service
  minReplicas: 10
  maxReplicas: 100
  metrics:
  - type: Resource
    resource:
      name: cpu
      target:
        type: Utilization
        averageUtilization: 65

  behavior:
    scaleUp:
      stabilizationWindowSeconds: 60
      policies:
      - type: Percent
        value: 50           # Allow 50% increase per minute
        periodSeconds: 60
      - type: Pods
        value: 10           # Or add 10 pods per minute
        periodSeconds: 60
      selectPolicy: Max     # Use whichever adds more pods

    scaleDown:
      stabilizationWindowSeconds: 300  # Wait 5 minutes before scaling down
      policies:
      - type: Percent
        value: 10           # Remove at most 10% per period
        periodSeconds: 60
      selectPolicy: Min     # Use most conservative policy
```

This configuration scales up quickly when CPU is high but scales down slowly to avoid oscillation during variable traffic patterns.

## Monitoring HPA Decisions

Track HPA behavior and CPU metrics to validate your configuration.

```bash
# View current HPA status
kubectl get hpa controlled-scaling-hpa -o yaml

# Check current CPU utilization
kubectl top pods -l app=backend-service

# View HPA events
kubectl describe hpa controlled-scaling-hpa

# Watch scaling decisions in real-time
kubectl get events --field-selector involvedObject.name=controlled-scaling-hpa -w
```

Look for the current and desired replica counts in the HPA status.

```yaml
status:
  currentMetrics:
  - resource:
      current:
        averageUtilization: 72
        averageValue: 144m
      name: cpu
    type: Resource
  currentReplicas: 15
  desiredReplicas: 17
```

When current utilization exceeds your target, desired replicas will be higher than current replicas, triggering a scale-up.

## Using Absolute CPU Values

Instead of utilization percentage, you can target absolute CPU values.

```yaml
apiVersion: autoscaling/v2
kind: HorizontalPodAutoscaler
metadata:
  name: absolute-cpu-hpa
spec:
  scaleTargetRef:
    apiVersion: apps/v1
    kind: Deployment
    name: processing-service
  minReplicas: 5
  maxReplicas: 50
  metrics:
  - type: Resource
    resource:
      name: cpu
      target:
        type: AverageValue
        averageValue: 500m  # Scale when average CPU exceeds 500 millicores
```

This approach works when you want consistent CPU usage per pod regardless of how requests are defined. It's particularly useful when different container images might have different resource requests but should scale at the same CPU usage point.

## Combining CPU with Other Metrics

HPA can consider multiple metrics simultaneously.

```yaml
apiVersion: autoscaling/v2
kind: HorizontalPodAutoscaler
metadata:
  name: multi-metric-hpa
spec:
  scaleTargetRef:
    apiVersion: apps/v1
    kind: Deployment
    name: application-server
  minReplicas: 10
  maxReplicas: 100
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

HPA calculates desired replicas for each metric independently and uses the maximum value. This ensures scaling occurs when either CPU or memory reaches its threshold.

## Handling CPU Throttling

When pods hit CPU limits, they get throttled, which can cause performance issues without triggering HPA scaling.

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: no-throttle-app
spec:
  template:
    spec:
      containers:
      - name: app
        resources:
          requests:
            cpu: 500m
          limits:
            cpu: 2000m     # Generous limit to avoid throttling
```

Set CPU limits higher than requests to allow bursting. HPA scales based on utilization of requests, so pods can temporarily exceed the target percentage while HPA adds more replicas.

Alternatively, remove CPU limits entirely for workloads where you want maximum burst capacity.

```yaml
resources:
  requests:
    cpu: 500m
    memory: 512Mi
  # No CPU limit - allows unlimited bursting
```

## Testing Your HPA Configuration

Generate load to verify HPA responds appropriately.

```bash
# Create a load generator pod
kubectl run load-generator --image=busybox --rm -it -- /bin/sh

# Inside the pod, generate requests
while true; do wget -q -O- http://web-application.production.svc.cluster.local; done
```

Watch HPA scale up in response.

```bash
# In another terminal
kubectl get hpa web-app-hpa -n production -w
```

You should see current CPU utilization increase, followed by desired replicas increasing to bring utilization back to target.

## Troubleshooting Common Issues

**HPA shows unknown/0% CPU**: Metrics Server isn't running or pods don't have CPU requests defined. Verify Metrics Server is healthy and all containers specify CPU requests.

```bash
kubectl get pods -n kube-system -l k8s-app=metrics-server
kubectl logs -n kube-system -l k8s-app=metrics-server
```

**HPA doesn't scale up**: Current utilization might not exceed target. Check actual CPU usage.

```bash
kubectl top pods -l app=web
```

If usage is below target, HPA won't scale up. If usage is above target but HPA doesn't scale, check if you've reached maxReplicas or if stabilization windows are delaying scaling.

**Pods scale up and down rapidly**: Stabilization windows are too short or target utilization is too close to actual utilization. Increase stabilizationWindowSeconds, especially for scaleDown.

**Scaling is too slow**: Increase the values in your scaling policies or reduce periodSeconds. Shorten stabilizationWindowSeconds for scaleUp if immediate response is critical.

## Best Practices

Set CPU requests based on actual resource usage measured during load testing. Don't guess - use monitoring data to determine appropriate values.

Target 60-75% CPU utilization for most workloads. This provides headroom for traffic spikes while avoiding waste. Batch workloads can target 80-90%.

Configure asymmetric scaling behavior with fast scale-up and slow scale-down. This maintains performance during traffic increases while avoiding premature scale-down during temporary dips.

Always define both minReplicas and maxReplicas. Min ensures baseline availability and performance. Max prevents runaway scaling that could exhaust cluster resources or budget.

Monitor actual CPU utilization alongside replica count to validate your HPA configuration. Use Prometheus, Grafana, or similar tools to visualize the relationship between load, CPU usage, and scaling decisions.

Test autoscaling behavior under realistic load patterns before deploying to production. Use load testing tools like k6, Locust, or Apache Bench to simulate traffic and observe scaling behavior.

## Conclusion

CPU utilization metrics provide a straightforward, effective foundation for Kubernetes autoscaling. By configuring HPA with appropriate CPU targets and scaling behaviors, you create systems that automatically adjust capacity to match demand. The key is setting accurate CPU requests, choosing target utilization values that balance performance and cost, and tuning scaling policies to match your application's traffic patterns.

While CPU-based scaling works well for many workloads, consider supplementing it with memory, custom metrics, or external metrics for applications where CPU alone doesn't fully represent capacity constraints. The combination of CPU-based HPA with appropriate behavior policies and resource configurations creates robust autoscaling that maintains performance while optimizing resource utilization.
