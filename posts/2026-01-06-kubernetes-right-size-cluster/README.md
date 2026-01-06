# How to Right-Size Your Kubernetes Cluster (And Stop Over-Provisioning)

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Kubernetes, Cost Optimization, Capacity Planning, Resource Management, DevOps, Cloud

Description: A practical guide to right-sizing your Kubernetes cluster, including node selection, resource analysis, bin packing optimization, and automated recommendations.

---

Most Kubernetes clusters are over-provisioned. Teams request resources they don't need, nodes sit half-empty, and cloud bills grow. Here's how to right-size everything.

## The Over-Provisioning Problem

Common symptoms:
- Node CPU utilization under 30%
- Memory utilization under 40%
- Pods requesting 10x what they use
- Cluster autoscaler never scales down
- Monthly cloud bill surprises

## Step 1: Analyze Current Utilization

### Node-Level Analysis

```bash
# Node resource usage
kubectl top nodes

# Detailed node capacity vs usage
kubectl describe nodes | grep -A 5 "Allocated resources"
```

### Calculate Cluster Efficiency

```bash
#!/bin/bash
# cluster-efficiency.sh

echo "=== Cluster Efficiency Report ==="

# Get total allocatable
TOTAL_CPU=$(kubectl get nodes -o json | jq '[.items[].status.allocatable.cpu | rtrimstr("m") | tonumber] | add')
TOTAL_MEM=$(kubectl get nodes -o json | jq '[.items[].status.allocatable.memory | rtrimstr("Ki") | tonumber] | add')

# Get total requests
REQUESTED_CPU=$(kubectl get pods -A -o json | jq '[.items[].spec.containers[].resources.requests.cpu // "0m" | rtrimstr("m") | tonumber] | add')
REQUESTED_MEM=$(kubectl get pods -A -o json | jq '[.items[].spec.containers[].resources.requests.memory // "0Ki" | rtrimstr("Ki") | rtrimstr("Mi") | tonumber] | add')

# Get actual usage (requires metrics-server)
USED_CPU=$(kubectl top pods -A --no-headers | awk '{sum += $3} END {print sum}')
USED_MEM=$(kubectl top pods -A --no-headers | awk '{sum += $4} END {print sum}')

echo "CPU: Allocatable=${TOTAL_CPU}m, Requested=${REQUESTED_CPU}m, Used=${USED_CPU}m"
echo "CPU Request Efficiency: $(echo "scale=2; $REQUESTED_CPU / $TOTAL_CPU * 100" | bc)%"
echo "CPU Actual Efficiency: $(echo "scale=2; $USED_CPU / $TOTAL_CPU * 100" | bc)%"
```

### Prometheus Queries

```promql
# Cluster CPU utilization
sum(rate(container_cpu_usage_seconds_total{container!=""}[5m]))
/
sum(kube_node_status_allocatable{resource="cpu"})

# Cluster memory utilization
sum(container_memory_working_set_bytes{container!=""})
/
sum(kube_node_status_allocatable{resource="memory"})

# Request vs usage ratio by namespace
sum(kube_pod_container_resource_requests{resource="cpu"}) by (namespace)
/
sum(rate(container_cpu_usage_seconds_total{container!=""}[1h])) by (namespace)
```

## Step 2: Right-Size Pod Requests

### Find Over-Provisioned Pods

```promql
# Pods requesting more than 2x what they use (CPU)
(
  sum(kube_pod_container_resource_requests{resource="cpu"}) by (pod, namespace)
  /
  sum(rate(container_cpu_usage_seconds_total[24h])) by (pod, namespace)
) > 2

# Pods requesting more than 2x what they use (Memory)
(
  sum(kube_pod_container_resource_requests{resource="memory"}) by (pod, namespace)
  /
  sum(container_memory_working_set_bytes) by (pod, namespace)
) > 2
```

### Use VPA Recommendations

```yaml
apiVersion: autoscaling.k8s.io/v1
kind: VerticalPodAutoscaler
metadata:
  name: my-app-vpa
spec:
  targetRef:
    apiVersion: apps/v1
    kind: Deployment
    name: my-app
  updatePolicy:
    updateMode: "Off"  # Just get recommendations
```

```bash
# Get recommendations
kubectl describe vpa my-app-vpa

# Target recommendations are usually good starting points
```

### Apply Right-Sized Resources

```yaml
resources:
  requests:
    cpu: 100m     # Based on P95 actual usage
    memory: 256Mi # Based on P99 actual usage + 10%
  limits:
    cpu: 200m     # 2x request for burst
    memory: 320Mi # Request + 25% buffer
```

## Step 3: Optimize Node Selection

### Instance Type Selection Matrix

| Workload Type | Recommended Instance | Why |
|---------------|---------------------|-----|
| Web services | General purpose (m5, n2) | Balanced CPU/memory |
| ML training | GPU (p3, a2) | GPU acceleration |
| Memory cache | Memory optimized (r5, n2-highmem) | High memory ratio |
| Batch processing | Compute optimized (c5, c2) | CPU-heavy |
| Dev/test | Burstable (t3, e2) | Cost-effective |

### Calculate Optimal Instance Size

```python
# Example calculation for web services
# Total needed: 100 CPU cores, 200GB memory

# Option 1: Many small nodes
# 50x m5.large (2 vCPU, 8GB) = 100 CPU, 400GB mem
# Cost: 50 * $0.096 = $4.80/hr

# Option 2: Fewer large nodes
# 4x m5.4xlarge (16 vCPU, 64GB) = 64 CPU, 256GB mem
# Cost: 4 * $0.768 = $3.07/hr

# Option 3: Mixed sizes
# 8x m5.xlarge (4 vCPU, 16GB) + 2x m5.2xlarge (8 vCPU, 32GB)
# = 48 CPU, 192GB mem
# Cost: 8 * $0.192 + 2 * $0.384 = $2.30/hr
```

### Consider Pod Density

```yaml
# Small nodes = lower pod density
# m5.large: ~29 pods max (ENI limits on AWS)
# m5.xlarge: ~58 pods max

# Factor this into node selection
# If you have many small pods, larger nodes are more efficient
```

## Step 4: Enable Cluster Autoscaling

### Cluster Autoscaler Configuration

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: cluster-autoscaler
  namespace: kube-system
spec:
  template:
    spec:
      containers:
        - name: cluster-autoscaler
          image: k8s.gcr.io/autoscaling/cluster-autoscaler:v1.28.0
          command:
            - ./cluster-autoscaler
            - --cloud-provider=aws
            - --nodes=2:20:my-node-group
            - --scale-down-enabled=true
            - --scale-down-delay-after-add=10m
            - --scale-down-delay-after-delete=0s
            - --scale-down-unneeded-time=10m
            - --scale-down-utilization-threshold=0.5
            - --skip-nodes-with-local-storage=false
            - --balance-similar-node-groups=true
```

### Key Parameters for Cost Optimization

```bash
# Aggressive scale-down (cost-focused)
--scale-down-unneeded-time=5m
--scale-down-utilization-threshold=0.5
--scale-down-delay-after-add=5m

# Conservative (stability-focused)
--scale-down-unneeded-time=30m
--scale-down-utilization-threshold=0.3
--scale-down-delay-after-add=15m
```

## Step 5: Improve Bin Packing

### Use Topology Spread Constraints

```yaml
spec:
  topologySpreadConstraints:
    - maxSkew: 1
      topologyKey: kubernetes.io/hostname
      whenUnsatisfiable: ScheduleAnyway
      labelSelector:
        matchLabels:
          app: my-app
```

### Enable Descheduler

```bash
helm repo add descheduler https://kubernetes-sigs.github.io/descheduler/
helm install descheduler descheduler/descheduler \
  --namespace kube-system \
  --set schedule="*/5 * * * *"
```

Descheduler configuration:

```yaml
apiVersion: descheduler/v1alpha1
kind: DeschedulerPolicy
strategies:
  RemovePodsViolatingTopologySpreadConstraint:
    enabled: true
  LowNodeUtilization:
    enabled: true
    params:
      nodeResourceUtilizationThresholds:
        thresholds:
          cpu: 20
          memory: 20
        targetThresholds:
          cpu: 50
          memory: 50
```

## Step 6: Schedule-Based Scaling

### Scale Down Non-Production at Night

```yaml
apiVersion: keda.sh/v1alpha1
kind: ScaledObject
metadata:
  name: staging-scaler
  namespace: staging
spec:
  scaleTargetRef:
    name: staging-deployment
  triggers:
    - type: cron
      metadata:
        timezone: America/New_York
        start: 0 18 * * 1-5  # 6 PM weekdays
        end: 0 8 * * 1-5     # 8 AM weekdays
        desiredReplicas: "0"
```

### Node Pool Scheduling

```bash
# Scale down dev node pool at night
#!/bin/bash
HOUR=$(date +%H)
if [ $HOUR -ge 20 ] || [ $HOUR -lt 8 ]; then
  eksctl scale nodegroup --cluster=my-cluster --name=dev-pool --nodes=0
else
  eksctl scale nodegroup --cluster=my-cluster --name=dev-pool --nodes=3
fi
```

## Step 7: Reserved Capacity Planning

### Calculate Baseline Requirements

```promql
# Minimum CPU needed (P5 over 30 days)
quantile(0.05, sum(rate(container_cpu_usage_seconds_total[5m])))

# Minimum memory needed (P5 over 30 days)
quantile(0.05, sum(container_memory_working_set_bytes))
```

### Reserved Instance Strategy

```
Total Capacity Needed: 100 CPU, 400GB memory

Reserved (steady state):    60 CPU, 240GB memory  (60%)
On-Demand (buffer):         20 CPU, 80GB memory   (20%)
Spot (burst capacity):      20 CPU, 80GB memory   (20%)

Cost savings: ~40% vs all on-demand
```

## Monitoring and Alerting

### Utilization Dashboard

```yaml
# Grafana dashboard queries

# Node utilization heatmap
1 - avg(rate(node_cpu_seconds_total{mode="idle"}[5m])) by (node)

# Memory utilization by node
(node_memory_MemTotal_bytes - node_memory_MemAvailable_bytes)
/
node_memory_MemTotal_bytes

# Request vs actual
sum(kube_pod_container_resource_requests{resource="cpu"})
/
sum(rate(container_cpu_usage_seconds_total[5m]))
```

### Alerts for Over-Provisioning

```yaml
apiVersion: monitoring.coreos.com/v1
kind: PrometheusRule
metadata:
  name: capacity-alerts
spec:
  groups:
    - name: capacity
      rules:
        - alert: ClusterUnderutilized
          expr: |
            sum(rate(container_cpu_usage_seconds_total{container!=""}[1h]))
            /
            sum(kube_node_status_allocatable{resource="cpu"})
            < 0.3
          for: 24h
          labels:
            severity: info
          annotations:
            summary: "Cluster CPU utilization below 30% for 24h"

        - alert: HighRequestToUsageRatio
          expr: |
            sum(kube_pod_container_resource_requests{resource="cpu"})
            /
            sum(rate(container_cpu_usage_seconds_total[1h]))
            > 5
          for: 24h
          labels:
            severity: warning
          annotations:
            summary: "Requests are 5x actual usage"
```

## Automation with Goldilocks

```bash
# Install Goldilocks
helm repo add fairwinds-stable https://charts.fairwinds.com/stable
helm install goldilocks fairwinds-stable/goldilocks --namespace goldilocks --create-namespace

# Enable for namespace
kubectl label namespace production goldilocks.fairwinds.com/enabled=true

# Access dashboard
kubectl port-forward -n goldilocks svc/goldilocks-dashboard 8080:80
```

Goldilocks shows:
- Current resource settings
- VPA recommendations
- Potential savings

## Right-Sizing Checklist

### Weekly Review

- [ ] Check cluster CPU utilization (target: 60-70%)
- [ ] Check cluster memory utilization (target: 70-80%)
- [ ] Review VPA recommendations
- [ ] Check for unused namespaces/deployments
- [ ] Verify autoscaler is scaling down unused nodes

### Monthly Review

- [ ] Analyze request vs actual usage trends
- [ ] Review reserved instance coverage
- [ ] Check for right-sizing opportunities
- [ ] Update capacity forecasts
- [ ] Review node type mix

### Quarterly Review

- [ ] Re-evaluate instance type selection
- [ ] Review spot instance strategy
- [ ] Assess multi-AZ/region needs
- [ ] Update capacity planning models

## Quick Wins Summary

1. **Apply VPA recommendations** - Usually 30-50% savings
2. **Enable aggressive autoscaling** - Scale down unused nodes
3. **Use spot for 20-30% of capacity** - 60-90% cheaper
4. **Turn off dev/staging at night** - 66% savings
5. **Remove unused PVCs** - Storage adds up
6. **Right-size databases** - Often massively over-provisioned

---

Right-sizing is an ongoing process, not a one-time project. Set up monitoring, review weekly, and continuously optimize. Most organizations can reduce Kubernetes costs by 30-50% through disciplined right-sizing.
