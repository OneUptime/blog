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

These commands provide a quick view of current resource usage across your cluster. The metrics-server must be installed for kubectl top to work.

```bash
# Show real-time CPU and memory usage per node
kubectl top nodes

# Show detailed breakdown of allocatable vs allocated resources per node
kubectl describe nodes | grep -A 5 "Allocated resources"
```

### Calculate Cluster Efficiency

This script calculates the efficiency of your cluster by comparing allocatable capacity, requested resources, and actual usage. Large gaps between requested and used resources indicate over-provisioning opportunities.

```bash
#!/bin/bash
# cluster-efficiency.sh
# Calculate cluster resource efficiency metrics

echo "=== Cluster Efficiency Report ==="

# Get total allocatable CPU across all nodes (in millicores)
TOTAL_CPU=$(kubectl get nodes -o json | jq '[.items[].status.allocatable.cpu | rtrimstr("m") | tonumber] | add')
# Get total allocatable memory across all nodes (in Ki)
TOTAL_MEM=$(kubectl get nodes -o json | jq '[.items[].status.allocatable.memory | rtrimstr("Ki") | tonumber] | add')

# Get total CPU requests from all pods (in millicores)
REQUESTED_CPU=$(kubectl get pods -A -o json | jq '[.items[].spec.containers[].resources.requests.cpu // "0m" | rtrimstr("m") | tonumber] | add')
# Get total memory requests from all pods
REQUESTED_MEM=$(kubectl get pods -A -o json | jq '[.items[].spec.containers[].resources.requests.memory // "0Ki" | rtrimstr("Ki") | rtrimstr("Mi") | tonumber] | add')

# Get actual usage (requires metrics-server to be installed)
USED_CPU=$(kubectl top pods -A --no-headers | awk '{sum += $3} END {print sum}')
USED_MEM=$(kubectl top pods -A --no-headers | awk '{sum += $4} END {print sum}')

# Display results
echo "CPU: Allocatable=${TOTAL_CPU}m, Requested=${REQUESTED_CPU}m, Used=${USED_CPU}m"
# Request efficiency: how much of allocatable capacity is requested
echo "CPU Request Efficiency: $(echo "scale=2; $REQUESTED_CPU / $TOTAL_CPU * 100" | bc)%"
# Actual efficiency: how much of allocatable capacity is actually used
echo "CPU Actual Efficiency: $(echo "scale=2; $USED_CPU / $TOTAL_CPU * 100" | bc)%"
```

### Prometheus Queries

These PromQL queries provide comprehensive visibility into cluster utilization over time. Use them to build dashboards that track efficiency trends and identify optimization opportunities.

```promql
# Cluster CPU utilization - ratio of used CPU to allocatable CPU
sum(rate(container_cpu_usage_seconds_total{container!=""}[5m]))
/
sum(kube_node_status_allocatable{resource="cpu"})

# Cluster memory utilization - ratio of used memory to allocatable memory
sum(container_memory_working_set_bytes{container!=""})
/
sum(kube_node_status_allocatable{resource="memory"})

# Request vs usage ratio by namespace - identifies over-provisioned namespaces
# Values > 1 indicate requests exceed usage (over-provisioned)
sum(kube_pod_container_resource_requests{resource="cpu"}) by (namespace)
/
sum(rate(container_cpu_usage_seconds_total{container!=""}[1h])) by (namespace)
```

## Step 2: Right-Size Pod Requests

### Find Over-Provisioned Pods

These PromQL queries identify pods requesting significantly more resources than they use. Pods with a ratio greater than 2 are requesting at least twice their actual usage, making them prime candidates for right-sizing.

```promql
# Pods requesting more than 2x what they use (CPU)
# Returns pods where requests are at least double actual usage
(
  sum(kube_pod_container_resource_requests{resource="cpu"}) by (pod, namespace)
  /
  sum(rate(container_cpu_usage_seconds_total[24h])) by (pod, namespace)
) > 2

# Pods requesting more than 2x what they use (Memory)
# Returns pods where memory requests far exceed working set
(
  sum(kube_pod_container_resource_requests{resource="memory"}) by (pod, namespace)
  /
  sum(container_memory_working_set_bytes) by (pod, namespace)
) > 2
```

### Use VPA Recommendations

The Vertical Pod Autoscaler can provide resource recommendations without automatically applying them. Set updateMode to "Off" to use VPA purely as a recommendation engine for manual tuning.

```yaml
# VPA in recommendation-only mode
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
    updateMode: "Off"  # Just get recommendations, don't auto-apply
```

Use the describe command to view the VPA's resource recommendations. The target values are typically good starting points for your resource requests.

```bash
# Get recommendations from VPA
kubectl describe vpa my-app-vpa

# Target recommendations are usually good starting points
```

### Apply Right-Sized Resources

Based on your profiling data, set resources that match actual usage patterns. Requests should cover typical usage (P95), while limits provide headroom for occasional spikes.

```yaml
resources:
  requests:
    cpu: 100m     # Based on P95 actual usage - ensures adequate scheduling
    memory: 256Mi # Based on P99 actual usage + 10% buffer for safety
  limits:
    cpu: 200m     # 2x request allows for temporary CPU bursts
    memory: 320Mi # Request + 25% buffer prevents OOM on memory spikes
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

This example shows how to compare different instance sizing strategies. The total cost depends on the number and size of instances needed to meet your requirements. Larger instances often provide better value per resource unit.

```python
# Example calculation for web services
# Total needed: 100 CPU cores, 200GB memory

# Option 1: Many small nodes - more overhead, less efficient
# 50x m5.large (2 vCPU, 8GB) = 100 CPU, 400GB mem
# Cost: 50 * $0.096 = $4.80/hr

# Option 2: Fewer large nodes - better bin packing
# 4x m5.4xlarge (16 vCPU, 64GB) = 64 CPU, 256GB mem
# Cost: 4 * $0.768 = $3.07/hr

# Option 3: Mixed sizes - optimized for actual workload
# 8x m5.xlarge (4 vCPU, 16GB) + 2x m5.2xlarge (8 vCPU, 32GB)
# = 48 CPU, 192GB mem
# Cost: 8 * $0.192 + 2 * $0.384 = $2.30/hr
```

### Consider Pod Density

Cloud providers limit the number of pods per node based on ENI (Elastic Network Interface) limits. When running many small pods, larger nodes are more efficient because they allow higher pod density.

```yaml
# Small nodes = lower pod density
# m5.large: ~29 pods max (ENI limits on AWS)
# m5.xlarge: ~58 pods max

# Factor this into node selection
# If you have many small pods, larger nodes are more efficient
```

## Step 4: Enable Cluster Autoscaling

### Cluster Autoscaler Configuration

The Cluster Autoscaler automatically adjusts the number of nodes based on pod scheduling demands. This configuration shows key parameters for controlling scale-up and scale-down behavior.

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
            - --nodes=2:20:my-node-group       # Min 2, max 20 nodes in this group
            - --scale-down-enabled=true        # Enable scale-down
            - --scale-down-delay-after-add=10m # Wait 10m after adding before removing
            - --scale-down-delay-after-delete=0s # No delay after deleting a node
            - --scale-down-unneeded-time=10m   # Node must be unneeded for 10m
            - --scale-down-utilization-threshold=0.5  # Scale down if < 50% utilized
            - --skip-nodes-with-local-storage=false   # Allow scaling nodes with emptyDir
            - --balance-similar-node-groups=true      # Balance nodes across AZs
```

### Key Parameters for Cost Optimization

These parameters control how aggressively the autoscaler removes underutilized nodes. Choose between cost optimization (aggressive) or stability (conservative) based on your workload requirements.

```bash
# Aggressive scale-down (cost-focused)
# Faster scale-down for cost savings, acceptable for stateless workloads
--scale-down-unneeded-time=5m           # Remove unneeded nodes after 5 minutes
--scale-down-utilization-threshold=0.5   # Scale down nodes under 50% utilization
--scale-down-delay-after-add=5m          # Quick scale-down after scale-up

# Conservative (stability-focused)
# Slower scale-down to avoid thrashing, better for stateful workloads
--scale-down-unneeded-time=30m           # Wait 30 minutes before removing nodes
--scale-down-utilization-threshold=0.3   # Only remove very underutilized nodes
--scale-down-delay-after-add=15m         # Longer delay prevents rapid cycling
```

## Step 5: Improve Bin Packing

### Use Topology Spread Constraints

Topology spread constraints help distribute pods evenly across nodes, improving overall resource utilization and resilience. This prevents scenarios where some nodes are overloaded while others sit idle.

```yaml
spec:
  topologySpreadConstraints:
    - maxSkew: 1                           # Maximum difference in pod count across nodes
      topologyKey: kubernetes.io/hostname   # Spread across nodes (hostnames)
      whenUnsatisfiable: ScheduleAnyway     # Still schedule if perfect spread impossible
      labelSelector:
        matchLabels:
          app: my-app                       # Apply to pods with this label
```

### Enable Descheduler

The descheduler periodically evaluates running pods and moves them to achieve better resource distribution. Unlike the scheduler which only runs at pod creation, descheduler optimizes placement continuously.

```bash
# Install descheduler via Helm
helm repo add descheduler https://kubernetes-sigs.github.io/descheduler/
helm install descheduler descheduler/descheduler \
  --namespace kube-system \
  --set schedule="*/5 * * * *"  # Run every 5 minutes
```

Descheduler configuration:

This policy configures the descheduler to move pods from underutilized nodes (below 20% CPU/memory) to better-utilized nodes (targeting 50% utilization), improving overall cluster efficiency.

```yaml
apiVersion: descheduler/v1alpha1
kind: DeschedulerPolicy
strategies:
  # Fix pods violating spread constraints
  RemovePodsViolatingTopologySpreadConstraint:
    enabled: true
  # Rebalance pods from underutilized nodes
  LowNodeUtilization:
    enabled: true
    params:
      nodeResourceUtilizationThresholds:
        thresholds:
          cpu: 20              # Node is underutilized if CPU < 20%
          memory: 20           # Node is underutilized if memory < 20%
        targetThresholds:
          cpu: 50              # Target CPU utilization after rebalancing
          memory: 50           # Target memory utilization after rebalancing
```

## Step 6: Schedule-Based Scaling

### Scale Down Non-Production at Night

KEDA (Kubernetes Event-Driven Autoscaling) enables time-based scaling. This configuration scales staging workloads to zero during off-hours, eliminating costs when environments aren't in use.

```yaml
# KEDA ScaledObject for time-based scaling
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
        start: 0 18 * * 1-5    # Scale down at 6 PM on weekdays
        end: 0 8 * * 1-5       # Scale up at 8 AM on weekdays
        desiredReplicas: "0"   # Zero replicas during off-hours
```

### Node Pool Scheduling

This script automatically scales development node pools based on time of day. Running it via cron saves significant costs by eliminating dev infrastructure during nights and weekends.

```bash
# Scale down dev node pool at night
#!/bin/bash
# schedule-nodepool.sh - Run via cron for automatic scheduling

HOUR=$(date +%H)
# Check if current hour is between 8 PM (20) and 8 AM (8)
if [ $HOUR -ge 20 ] || [ $HOUR -lt 8 ]; then
  # Night hours - scale to zero
  eksctl scale nodegroup --cluster=my-cluster --name=dev-pool --nodes=0
else
  # Business hours - scale to normal capacity
  eksctl scale nodegroup --cluster=my-cluster --name=dev-pool --nodes=3
fi
```

## Step 7: Reserved Capacity Planning

### Calculate Baseline Requirements

These PromQL queries calculate your minimum sustained resource needs over time. Use the 5th percentile (P5) to identify your baseline that should be covered by reserved instances.

```promql
# Minimum CPU needed (P5 over 30 days)
# This represents your baseline that's almost always needed
quantile(0.05, sum(rate(container_cpu_usage_seconds_total[5m])))

# Minimum memory needed (P5 over 30 days)
# Use this to size reserved instance commitments
quantile(0.05, sum(container_memory_working_set_bytes))
```

### Reserved Instance Strategy

Split your capacity into three tiers for optimal cost savings: reserved instances for steady-state load, on-demand for regular buffer, and spot instances for burst capacity that can tolerate interruptions.

```
Total Capacity Needed: 100 CPU, 400GB memory

Reserved (steady state):    60 CPU, 240GB memory  (60%)  # Always-on baseline
On-Demand (buffer):         20 CPU, 80GB memory   (20%)  # Regular operations buffer
Spot (burst capacity):      20 CPU, 80GB memory   (20%)  # Interrupt-tolerant burst

Cost savings: ~40% vs all on-demand
```

## Monitoring and Alerting

### Utilization Dashboard

These Grafana dashboard queries provide visibility into cluster efficiency. Use them to build dashboards that track utilization trends and identify optimization opportunities over time.

```yaml
# Grafana dashboard queries

# Node utilization heatmap - visualize CPU usage per node
1 - avg(rate(node_cpu_seconds_total{mode="idle"}[5m])) by (node)

# Memory utilization by node - track memory pressure
(node_memory_MemTotal_bytes - node_memory_MemAvailable_bytes)
/
node_memory_MemTotal_bytes

# Request vs actual ratio - identify over-provisioning
# High values indicate requests far exceed actual usage
sum(kube_pod_container_resource_requests{resource="cpu"})
/
sum(rate(container_cpu_usage_seconds_total[5m]))
```

### Alerts for Over-Provisioning

These PrometheusRules alert when the cluster is significantly underutilized, helping you proactively identify cost optimization opportunities before they accumulate on your cloud bill.

```yaml
apiVersion: monitoring.coreos.com/v1
kind: PrometheusRule
metadata:
  name: capacity-alerts
spec:
  groups:
    - name: capacity
      rules:
        # Alert when cluster CPU is consistently underutilized
        - alert: ClusterUnderutilized
          expr: |
            sum(rate(container_cpu_usage_seconds_total{container!=""}[1h]))
            /
            sum(kube_node_status_allocatable{resource="cpu"})
            < 0.3
          for: 24h                   # Must be sustained for 24 hours
          labels:
            severity: info
          annotations:
            summary: "Cluster CPU utilization below 30% for 24h"

        # Alert when requests significantly exceed actual usage
        - alert: HighRequestToUsageRatio
          expr: |
            sum(kube_pod_container_resource_requests{resource="cpu"})
            /
            sum(rate(container_cpu_usage_seconds_total[1h]))
            > 5
          for: 24h                   # Sustained over-provisioning
          labels:
            severity: warning
          annotations:
            summary: "Requests are 5x actual usage"
```

## Automation with Goldilocks

Goldilocks provides a dashboard that shows VPA recommendations alongside current resource settings, making it easy to identify right-sizing opportunities across your entire cluster.

```bash
# Install Goldilocks via Helm
helm repo add fairwinds-stable https://charts.fairwinds.com/stable
helm install goldilocks fairwinds-stable/goldilocks --namespace goldilocks --create-namespace

# Enable Goldilocks for a specific namespace (creates VPAs automatically)
kubectl label namespace production goldilocks.fairwinds.com/enabled=true

# Access the dashboard to view recommendations
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
