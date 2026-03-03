# How to Set Resource Requests and Limits on Talos Linux

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Talos Linux, Resource Requests, Resource Limits, Kubernetes, Capacity Planning, Performance

Description: A practical guide to setting Kubernetes resource requests and limits correctly on Talos Linux for optimal scheduling, performance, and cost efficiency.

---

Resource requests and limits are the foundation of Kubernetes resource management. Requests tell the scheduler how much CPU and memory a pod needs to be placed on a node, while limits define the maximum a pod can consume. Getting these values right is essential for stable, efficient clusters. Set them too low, and your applications will be throttled or OOM killed. Set them too high, and you waste capacity that other workloads could use.

On Talos Linux, the minimal operating system overhead means more resources are available for your pods, making accurate resource configuration even more impactful. Every megabyte you save on over-provisioning translates more directly into additional workload capacity.

## Requests vs Limits: What They Actually Do

**Requests** serve two purposes:
1. The scheduler uses them to decide which node has enough room for the pod
2. The kubelet uses them to set cgroup parameters that guarantee a minimum allocation

**Limits** define the ceiling:
1. CPU limits enforce CFS bandwidth control (throttling)
2. Memory limits trigger OOM kills when exceeded

```yaml
# Example showing requests and limits
spec:
  containers:
    - name: app
      resources:
        requests:
          cpu: "250m"      # 0.25 CPU cores guaranteed
          memory: "512Mi"  # 512 MiB guaranteed
        limits:
          cpu: "1"         # Can burst up to 1 CPU core
          memory: "1Gi"    # OOM killed if exceeds 1 GiB
```

## How Talos Linux Allocatable Resources Work

On a Talos Linux node, the allocatable resources are calculated as:

```
Allocatable = Capacity - System Reserved - Kube Reserved - Eviction Threshold
```

For a node with 4 CPUs and 16 GB RAM:

```yaml
# Typical Talos Linux resource budget
# Total Capacity: 4 CPU, 16 GiB memory

# System Reserved (Talos OS, containerd)
# CPU: 250m, Memory: 512Mi

# Kube Reserved (kubelet)
# CPU: 250m, Memory: 512Mi

# Eviction Threshold
# Memory: 750Mi

# Allocatable for pods:
# CPU: 4000m - 250m - 250m = 3500m
# Memory: 16384Mi - 512Mi - 512Mi - 750Mi = 14610Mi
```

Configure these values in the Talos machine config:

```yaml
# talos-reserved-resources.yaml
# Configure reserved resources for accurate scheduling
machine:
  kubelet:
    extraArgs:
      system-reserved: "cpu=250m,memory=512Mi"
      kube-reserved: "cpu=250m,memory=512Mi"
      eviction-hard: "memory.available<750Mi,nodefs.available<10%"
      enforce-node-allocatable: "pods,system-reserved,kube-reserved"
```

## Step 1: Start with Observations

Never guess at resource values. Start by deploying without limits and observe actual usage:

```yaml
# initial-deployment.yaml
# Deploy with requests only to observe actual usage patterns
apiVersion: apps/v1
kind: Deployment
metadata:
  name: my-service
  namespace: staging
spec:
  replicas: 2
  selector:
    matchLabels:
      app: my-service
  template:
    metadata:
      labels:
        app: my-service
    spec:
      containers:
        - name: app
          image: my-service:latest
          resources:
            requests:
              # Start with conservative requests
              cpu: "100m"
              memory: "128Mi"
            # No limits initially - observe behavior first
```

Monitor for at least a week, including peak traffic periods:

```bash
# Check resource usage over time using Prometheus
# CPU usage (actual cores used)
curl -s "http://prometheus:9090/api/v1/query" \
  --data-urlencode 'query=
    quantile_over_time(0.99,
      rate(container_cpu_usage_seconds_total{
        namespace="staging", container="app"
      }[5m])[7d:5m]
    )'

# Memory usage (working set, not including cache)
curl -s "http://prometheus:9090/api/v1/query" \
  --data-urlencode 'query=
    quantile_over_time(0.99,
      container_memory_working_set_bytes{
        namespace="staging", container="app"
      }[7d:5m]
    )'
```

## Step 2: Use VPA Recommendations

Deploy the Vertical Pod Autoscaler in recommendation mode:

```yaml
# vpa-recommendation.yaml
# VPA to recommend resource values based on actual usage
apiVersion: autoscaling.k8s.io/v1
kind: VerticalPodAutoscaler
metadata:
  name: my-service-vpa
  namespace: staging
spec:
  targetRef:
    apiVersion: apps/v1
    kind: Deployment
    name: my-service
  updatePolicy:
    updateMode: "Off"  # Recommendations only
```

Read the recommendations:

```bash
# Get VPA recommendation
kubectl get vpa my-service-vpa -n staging -o json | jq '
  .status.recommendation.containerRecommendations[] | {
    container: .containerName,
    target: {cpu: .target.cpu, memory: .target.memory},
    lowerBound: {cpu: .lowerBound.cpu, memory: .lowerBound.memory},
    upperBound: {cpu: .upperBound.cpu, memory: .upperBound.memory}
  }'
```

## Step 3: Set Requests Based on Data

Use the P50 (median) for requests and P99 or upper bound for limits:

```yaml
# production-deployment.yaml
# Resource values based on observed usage data
apiVersion: apps/v1
kind: Deployment
metadata:
  name: my-service
  namespace: production
spec:
  replicas: 3
  selector:
    matchLabels:
      app: my-service
  template:
    metadata:
      labels:
        app: my-service
    spec:
      containers:
        - name: app
          image: my-service:v1.2.0
          resources:
            requests:
              # P50 usage + 20% buffer
              cpu: "200m"
              memory: "384Mi"
            limits:
              # Memory: P99 usage + 25% buffer
              memory: "768Mi"
              # CPU: Consider not setting a limit
              # (see discussion below)
```

## The CPU Limits Debate

There is an ongoing discussion in the Kubernetes community about whether to set CPU limits. Here are the arguments:

**Arguments for setting CPU limits:**
- Prevents a single pod from consuming all node CPU
- Makes resource usage more predictable
- Required for Guaranteed QoS class

**Arguments against CPU limits:**
- Causes unnecessary throttling when the node has spare CPU
- Creates latency spikes due to CFS bandwidth control
- Wastes available CPU capacity across the cluster

My recommendation for Talos Linux clusters:

```yaml
# For latency-sensitive services: no CPU limit
resources:
  requests:
    cpu: "500m"
    memory: "1Gi"
  limits:
    memory: "2Gi"
    # No CPU limit - let it burst

# For batch/background jobs: set CPU limit to prevent runaway
resources:
  requests:
    cpu: "500m"
    memory: "1Gi"
  limits:
    cpu: "2"
    memory: "4Gi"

# For critical services requiring Guaranteed QoS: match request and limit
resources:
  requests:
    cpu: "2"
    memory: "4Gi"
  limits:
    cpu: "2"
    memory: "4Gi"
```

## Setting Namespace-Level Defaults

Use LimitRange to set defaults and enforce boundaries per namespace:

```yaml
# limitrange-production.yaml
# Default resource values for the production namespace
apiVersion: v1
kind: LimitRange
metadata:
  name: resource-defaults
  namespace: production
spec:
  limits:
    - type: Container
      default:
        cpu: "500m"
        memory: "512Mi"
      defaultRequest:
        cpu: "100m"
        memory: "128Mi"
      max:
        cpu: "4"
        memory: "8Gi"
      min:
        cpu: "10m"
        memory: "16Mi"

    - type: Pod
      max:
        cpu: "8"
        memory: "16Gi"
```

## Setting Namespace-Level Quotas

Use ResourceQuota to limit total resource consumption per namespace:

```yaml
# resourcequota-production.yaml
# Total resource limits for the production namespace
apiVersion: v1
kind: ResourceQuota
metadata:
  name: resource-quota
  namespace: production
spec:
  hard:
    requests.cpu: "20"
    requests.memory: "40Gi"
    limits.cpu: "40"
    limits.memory: "80Gi"
    pods: "100"
    persistentvolumeclaims: "20"
```

## Monitoring Resource Efficiency

Track how well your resource settings match actual usage:

```yaml
# resource-efficiency-rules.yaml
# Prometheus rules for tracking resource efficiency
apiVersion: monitoring.coreos.com/v1
kind: PrometheusRule
metadata:
  name: resource-efficiency
  namespace: monitoring
spec:
  groups:
    - name: resource.efficiency
      rules:
        # CPU efficiency: actual usage vs requests
        - record: namespace:cpu_efficiency:ratio
          expr: >
            sum by (namespace) (
              rate(container_cpu_usage_seconds_total{container!=""}[5m])
            )
            /
            sum by (namespace) (
              kube_pod_container_resource_requests{resource="cpu"}
            )

        # Memory efficiency
        - record: namespace:memory_efficiency:ratio
          expr: >
            sum by (namespace) (
              container_memory_working_set_bytes{container!=""}
            )
            /
            sum by (namespace) (
              kube_pod_container_resource_requests{resource="memory"}
            )

        # Alert on low efficiency
        - alert: LowCPUEfficiency
          expr: namespace:cpu_efficiency:ratio < 0.2
          for: 7d
          labels:
            severity: info
          annotations:
            summary: >
              Namespace {{ $labels.namespace }} CPU efficiency
              is only {{ $value | humanizePercentage }}.
              Resources may be over-provisioned.

        - alert: HighMemoryUsage
          expr: namespace:memory_efficiency:ratio > 0.9
          for: 1h
          labels:
            severity: warning
          annotations:
            summary: >
              Namespace {{ $labels.namespace }} memory usage
              is {{ $value | humanizePercentage }} of requests.
              Risk of OOM kills.
```

## Common Mistakes

**Mistake 1: Setting requests too high**
```yaml
# Bad: requesting 2 CPU for a service that uses 200m on average
resources:
  requests:
    cpu: "2"      # Wastes 1800m of schedulable CPU
  limits:
    cpu: "2"
```

**Mistake 2: Setting limits equal to requests for all pods**
```yaml
# Suboptimal for most workloads
# Only do this for Guaranteed QoS critical services
resources:
  requests:
    cpu: "1"
    memory: "2Gi"
  limits:
    cpu: "1"       # Cannot burst even when CPU is available
    memory: "2Gi"
```

**Mistake 3: No memory limit**
```yaml
# Dangerous: a memory leak can take down the entire node
resources:
  requests:
    cpu: "100m"
    memory: "256Mi"
  # No memory limit = BestEffort for memory
  # A memory leak will eventually cause node-level OOM
```

## Summary

Setting resource requests and limits correctly on Talos Linux is both an art and a science. Start with observations, use VPA recommendations, and iterate based on real usage data. Always set memory limits to prevent runaway memory consumption. Consider carefully whether CPU limits are appropriate for each workload - they prevent starvation but cause throttling. Use LimitRange and ResourceQuota to set guardrails at the namespace level, and monitor resource efficiency continuously to catch both over-provisioning and under-provisioning. On Talos Linux, where OS overhead is minimal and predictable, getting these values right has a direct and significant impact on cluster efficiency and workload performance.
