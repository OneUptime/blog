# How to Implement Auto-Scaling Policies on Talos Linux

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Talos Linux, Auto-Scaling, Kubernetes, HPA, VPA, Cluster Autoscaler, Cost Optimization

Description: A comprehensive guide to implementing horizontal, vertical, and cluster auto-scaling policies on Talos Linux for efficient resource utilization.

---

Auto-scaling is the practice of automatically adjusting the number of pods or nodes in your cluster based on actual demand. When done right, it ensures your applications have enough resources during traffic spikes while avoiding waste during quiet periods. On Talos Linux, auto-scaling works particularly well because the minimal OS overhead gives you more predictable capacity and the fast boot times mean new nodes come online quickly.

This guide covers all three dimensions of Kubernetes auto-scaling: horizontal pod scaling, vertical pod scaling, and cluster-level node scaling.

## The Three Dimensions of Auto-Scaling

Kubernetes offers three complementary auto-scaling mechanisms:

1. **Horizontal Pod Autoscaler (HPA)** - Adds or removes pod replicas based on metrics
2. **Vertical Pod Autoscaler (VPA)** - Adjusts CPU and memory requests for individual pods
3. **Cluster Autoscaler** - Adds or removes nodes when pods cannot be scheduled or nodes are underutilized

Each addresses a different problem, and they work best when used together.

## Setting Up the Metrics Server

All auto-scaling starts with metrics. The metrics server provides CPU and memory usage data:

```bash
# Install the metrics server
kubectl apply -f https://github.com/kubernetes-sigs/metrics-server/releases/latest/download/components.yaml

# Verify it is working
kubectl top nodes
kubectl top pods -A
```

On Talos Linux, the metrics server should work out of the box since kubelet metrics are exposed by default.

## Horizontal Pod Autoscaler

HPA is the most commonly used autoscaler. It adjusts the number of replicas based on observed metrics.

### Basic CPU-Based HPA

```yaml
# hpa-cpu-basic.yaml
# Scale based on CPU utilization
apiVersion: autoscaling/v2
kind: HorizontalPodAutoscaler
metadata:
  name: web-app-hpa
  namespace: production
spec:
  scaleTargetRef:
    apiVersion: apps/v1
    kind: Deployment
    name: web-app
  minReplicas: 3
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
      # Scale up quickly when needed
      stabilizationWindowSeconds: 60
      policies:
        - type: Percent
          value: 50
          periodSeconds: 60
        - type: Pods
          value: 4
          periodSeconds: 60
      selectPolicy: Max
    scaleDown:
      # Scale down slowly to avoid flapping
      stabilizationWindowSeconds: 300
      policies:
        - type: Percent
          value: 10
          periodSeconds: 120
      selectPolicy: Min
```

### Multi-Metric HPA

Scale based on multiple metrics for more accurate decisions:

```yaml
# hpa-multi-metric.yaml
# Scale based on CPU, memory, and custom metrics
apiVersion: autoscaling/v2
kind: HorizontalPodAutoscaler
metadata:
  name: api-server-hpa
  namespace: production
spec:
  scaleTargetRef:
    apiVersion: apps/v1
    kind: Deployment
    name: api-server
  minReplicas: 2
  maxReplicas: 50
  metrics:
    # CPU utilization
    - type: Resource
      resource:
        name: cpu
        target:
          type: Utilization
          averageUtilization: 65

    # Memory utilization
    - type: Resource
      resource:
        name: memory
        target:
          type: Utilization
          averageUtilization: 75

    # Requests per second from Prometheus
    - type: Pods
      pods:
        metric:
          name: http_requests_per_second
        target:
          type: AverageValue
          averageValue: "1000"

    # Queue depth from external metric
    - type: External
      external:
        metric:
          name: queue_messages_ready
          selector:
            matchLabels:
              queue: "tasks"
        target:
          type: AverageValue
          averageValue: "30"
```

### Custom Metrics with Prometheus Adapter

To scale on custom metrics, deploy the Prometheus adapter:

```bash
# Install Prometheus adapter for custom metrics
helm repo add prometheus-community https://prometheus-community.github.io/helm-charts

helm install prometheus-adapter prometheus-community/prometheus-adapter \
  --namespace monitoring \
  --set prometheus.url="http://prometheus-kube-prometheus-prometheus.monitoring.svc.cluster.local" \
  --set prometheus.port=9090
```

Configure the adapter to expose your application metrics:

```yaml
# prometheus-adapter-config.yaml
# Map Prometheus metrics to Kubernetes custom metrics
rules:
  - seriesQuery: 'http_requests_total{namespace!="",pod!=""}'
    resources:
      overrides:
        namespace: {resource: "namespace"}
        pod: {resource: "pod"}
    name:
      matches: "^(.*)_total$"
      as: "${1}_per_second"
    metricsQuery: 'rate(<<.Series>>{<<.LabelMatchers>>}[2m])'

  - seriesQuery: 'queue_messages_ready{queue!=""}'
    resources:
      overrides:
        namespace: {resource: "namespace"}
    name:
      as: "queue_messages_ready"
    metricsQuery: '<<.Series>>{<<.LabelMatchers>>}'
```

## Vertical Pod Autoscaler

VPA adjusts resource requests and limits based on actual usage patterns:

```bash
# Install VPA
kubectl apply -f https://github.com/kubernetes/autoscaler/releases/latest/download/vpa-v1-crd-gen.yaml
kubectl apply -f https://github.com/kubernetes/autoscaler/releases/latest/download/vpa-rbac.yaml

# Deploy VPA components
kubectl apply -f https://github.com/kubernetes/autoscaler/releases/latest/download/vpa-admission-controller-deployment.yaml
kubectl apply -f https://github.com/kubernetes/autoscaler/releases/latest/download/vpa-recommender-deployment.yaml
kubectl apply -f https://github.com/kubernetes/autoscaler/releases/latest/download/vpa-updater-deployment.yaml
```

Configure VPA for a workload:

```yaml
# vpa-auto-mode.yaml
# VPA in auto mode for a stateless service
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
    # Auto mode will restart pods to apply new resource values
    updateMode: "Auto"
    # Only update during allowed windows
    minReplicas: 2
  resourcePolicy:
    containerPolicies:
      - containerName: api-server
        controlledResources: ["cpu", "memory"]
        minAllowed:
          cpu: 100m
          memory: 128Mi
        maxAllowed:
          cpu: 4
          memory: 8Gi
        controlledValues: RequestsAndLimits
```

Important note: Do not use VPA and HPA on the same metric for the same workload. If HPA scales on CPU, VPA should only control memory, or vice versa.

## Cluster Autoscaler

The cluster autoscaler adds or removes Talos Linux nodes based on pod scheduling demand:

```yaml
# cluster-autoscaler-values.yaml
# Cluster autoscaler for Talos Linux on AWS
image:
  tag: "v1.29.0"

autoDiscovery:
  clusterName: "talos-production"

extraArgs:
  # How long to wait before scaling down
  scale-down-delay-after-add: "10m"
  scale-down-unneeded-time: "10m"
  # Utilization threshold for scale-down
  scale-down-utilization-threshold: "0.5"
  # Maximum time to wait for node to become ready
  max-node-provision-time: "5m"
  # Balance node groups evenly
  balance-similar-node-groups: "true"
  # Consider pod priorities when scaling
  expendable-pods-priority-cutoff: "-10"
  # Skip nodes with local storage
  skip-nodes-with-local-storage: "false"
  # Scan interval
  scan-interval: "10s"

resources:
  requests:
    cpu: 100m
    memory: 300Mi
  limits:
    cpu: 500m
    memory: 600Mi
```

Deploy the cluster autoscaler:

```bash
# Install cluster autoscaler
helm install cluster-autoscaler autoscaler/cluster-autoscaler \
  --namespace kube-system \
  -f cluster-autoscaler-values.yaml
```

## KEDA for Event-Driven Scaling

For more advanced scaling scenarios, KEDA (Kubernetes Event-Driven Autoscaling) provides scaling based on external event sources:

```bash
# Install KEDA
helm repo add kedacore https://kedacore.github.io/charts
helm install keda kedacore/keda --namespace keda --create-namespace
```

Example: Scale a worker deployment based on message queue depth:

```yaml
# keda-scaledobject.yaml
# Scale workers based on RabbitMQ queue length
apiVersion: keda.sh/v1alpha1
kind: ScaledObject
metadata:
  name: task-worker-scaler
  namespace: production
spec:
  scaleTargetRef:
    name: task-worker
  minReplicaCount: 1
  maxReplicaCount: 30
  cooldownPeriod: 300
  pollingInterval: 15
  triggers:
    - type: rabbitmq
      metadata:
        host: "amqp://rabbitmq.production.svc.cluster.local:5672"
        queueName: "tasks"
        queueLength: "10"
        mode: "QueueLength"
```

## Scaling Policies Best Practices

Here are some guidelines for effective auto-scaling on Talos Linux:

```yaml
# Scale-up should be aggressive (respond quickly to demand)
# Scale-down should be conservative (avoid premature scaling)
behavior:
  scaleUp:
    stabilizationWindowSeconds: 30    # React quickly
    policies:
      - type: Percent
        value: 100                     # Double capacity if needed
        periodSeconds: 60
  scaleDown:
    stabilizationWindowSeconds: 300   # Wait 5 minutes before scaling down
    policies:
      - type: Pods
        value: 1                       # Remove one pod at a time
        periodSeconds: 120
```

## Monitoring Auto-Scaling Activity

Track scaling events and their effectiveness:

```bash
# View recent HPA events
kubectl get events --field-selector reason=SuccessfulRescale -A

# Check HPA status
kubectl get hpa -A -o wide

# View cluster autoscaler logs
kubectl logs -n kube-system -l app.kubernetes.io/name=cluster-autoscaler --tail=100
```

## Summary

Auto-scaling on Talos Linux takes advantage of the platform's fast boot times and minimal overhead to deliver responsive, cost-efficient scaling. Use HPA for workload-level horizontal scaling, VPA for right-sizing individual pods, and the cluster autoscaler for node-level capacity management. KEDA adds event-driven scaling for queue-based and batch workloads. The key is to configure scale-up to be fast and scale-down to be conservative, ensuring your applications stay responsive while minimizing waste during quiet periods.
