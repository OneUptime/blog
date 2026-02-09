# How to Implement Reserved Capacity with Resource Reservations

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Kubernetes, Resource Reservation, Capacity Planning, Cost Optimization, Cloud Economics

Description: Use resource reservations and reserved instances to guarantee capacity for critical workloads while optimizing cloud infrastructure costs.

---

Reserved capacity combines cloud provider reserved instances with Kubernetes resource reservations to guarantee availability for critical workloads at reduced costs. This strategy trades flexibility for savings, typically 30-60% compared to on-demand pricing, while ensuring capacity when you need it.

## Understanding Reserved Capacity Economics

Cloud providers offer reserved instances at discounted rates in exchange for commitment. You commit to paying for specific instance types in specific regions for one or three years. In return, you receive 30-70% discounts depending on payment terms and commitment length.

Reserved instances work best for steady-state workloads with predictable capacity needs. Burst workloads should use on-demand or spot instances. The key is identifying your baseline capacity - the minimum resources you always need.

In Kubernetes terms, baseline capacity supports critical services that must always run. Burst capacity supports traffic spikes, batch jobs, and development workloads.

## Analyzing Baseline Capacity Requirements

Calculate baseline by examining historical cluster usage:

```promql
# Minimum node count over 90 days
min_over_time(count(kube_node_info)[90d:1d])

# Minimum total CPU requests over 90 days
min_over_time(sum(kube_pod_container_resource_requests_cpu_cores)[90d:1d])

# Minimum total memory requests over 90 days
min_over_time(sum(kube_pod_container_resource_requests_memory_bytes)[90d:1d])
```

The minimum values represent your baseline. You always need at least this much capacity. Reserve this amount.

For new clusters without history, estimate baseline from:
- Critical service replica counts and resource requests
- Expected steady-state traffic
- Database and cache capacity requirements
- System component overhead (15-20% of total)

## Purchasing Reserved Instances

On AWS, purchase reserved instances matching your baseline:

```bash
# Calculate needed reserved capacity
# Example: 50 t3.xlarge nodes minimum
aws ec2 describe-reserved-instances-offerings \
  --instance-type t3.xlarge \
  --offering-class standard \
  --product-description "Linux/UNIX"

# Purchase reserved instances
aws ec2 purchase-reserved-instances-offering \
  --reserved-instances-offering-id xxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx \
  --instance-count 50
```

Choose payment options:
- **All upfront**: Maximum discount (up to 70%)
- **Partial upfront**: Balanced discount (up to 50%)
- **No upfront**: Minimum discount (up to 35%) but no initial payment

For GCP, use committed use discounts:

```bash
gcloud compute commitments create my-commitment \
  --region=us-central1 \
  --resources=vcpu=800,memory=3200GB \
  --plan=12-month
```

GCP's model is more flexible - you commit to resource amounts rather than specific instance types.

## Creating Dedicated Reserved Node Pools

Separate reserved and on-demand capacity into different node pools:

```yaml
# Reserved instance node pool
apiVersion: eksctl.io/v1alpha5
kind: ClusterConfig
metadata:
  name: production
managedNodeGroups:
- name: reserved-baseline
  instanceType: t3.xlarge
  minSize: 50
  maxSize: 50  # Fixed size matching reservations
  desiredCapacity: 50
  labels:
    capacity-type: reserved
    workload-priority: critical
  taints:
  - key: reserved-capacity
    value: "true"
    effect: NoSchedule
---
# On-demand burst pool
- name: on-demand-burst
  instanceType: t3.xlarge
  minSize: 0
  maxSize: 100
  desiredCapacity: 10
  labels:
    capacity-type: on-demand
    workload-priority: normal
```

The reserved pool has fixed size matching your reserved instance count. The burst pool scales dynamically.

## Scheduling Critical Workloads on Reserved Nodes

Direct critical services to reserved capacity:

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: payment-service
  namespace: production
spec:
  replicas: 10
  template:
    spec:
      priorityClassName: high-priority
      affinity:
        nodeAffinity:
          requiredDuringSchedulingIgnoredDuringExecution:
            nodeSelectorTerms:
            - matchExpressions:
              - key: capacity-type
                operator: In
                values:
                - reserved
      tolerations:
      - key: reserved-capacity
        operator: Equal
        value: "true"
        effect: NoSchedule
      containers:
      - name: payment
        image: payment-service:v1
        resources:
          requests:
            memory: "2Gi"
            cpu: "1000m"
          limits:
            memory: "2Gi"
            cpu: "1000m"
```

The node affinity and toleration ensure this service only runs on reserved nodes, guaranteeing capacity.

## Fallback to On-Demand Capacity

For less critical services, prefer reserved but tolerate on-demand:

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: api-gateway
spec:
  replicas: 20
  template:
    spec:
      affinity:
        nodeAffinity:
          preferredDuringSchedulingIgnoredDuringExecution:
          - weight: 100
            preference:
              matchExpressions:
              - key: capacity-type
                operator: In
                values:
                - reserved
      tolerations:
      - key: reserved-capacity
        operator: Equal
        value: "true"
        effect: NoSchedule
      containers:
      - name: gateway
        resources:
          requests:
            cpu: "500m"
            memory: "1Gi"
```

The preferred affinity schedules on reserved nodes when available. If reserved nodes are full, pods schedule on on-demand nodes.

This maximizes reserved instance utilization while maintaining flexibility.

## Capacity Reservation Monitoring

Track reserved vs actual usage:

```promql
# Reserved node count
count(kube_node_labels{label_capacity_type="reserved"})

# Pods on reserved nodes
count(kube_pod_info{node=~".*reserved.*"})

# Reserved node utilization
sum(kube_pod_container_resource_requests_cpu_cores{node=~".*reserved.*"}) /
sum(kube_node_status_capacity_cpu_cores{label_capacity_type="reserved"})

# Wasted reserved capacity
(
  sum(kube_node_status_capacity_cpu_cores{label_capacity_type="reserved"}) -
  sum(kube_pod_container_resource_requests_cpu_cores{node=~".*reserved.*"})
)
```

If reserved node utilization falls below 80%, you are paying for unused capacity. Either move more workloads to reserved nodes or reduce reservations.

## Right-Sizing Reserved Capacity

Review reservations quarterly. Cloud providers allow modifying reservations with limitations.

On AWS, you can sell unused reserved instances on the marketplace:

```bash
# List your reserved instances
aws ec2 describe-reserved-instances \
  --filters "Name=state,Values=active"

# Create marketplace listing for unused RIs
aws ec2 create-reserved-instances-listing \
  --reserved-instances-id xxxxxxx \
  --instance-count 10 \
  --price-schedules file://pricing.json
```

For GCP, commitments cannot be modified or sold. Plan carefully before committing.

## Handling Commitment Expiration

Track reservation expiration dates:

```bash
# AWS - find expiring reservations
aws ec2 describe-reserved-instances \
  --filters "Name=state,Values=active" \
  --query 'ReservedInstances[?End<=`2026-03-31`].[ReservedInstancesId,End,InstanceCount]' \
  --output table
```

Set reminders 90 days before expiration to review whether to renew.

Before expiration, evaluate:
- Has baseline capacity increased or decreased?
- Are you using newer instance types?
- Would convertible reservations provide more flexibility?

## Convertible vs Standard Reservations

Convertible reservations allow changing instance types during the commitment. Standard reservations lock you into specific types but offer higher discounts.

Use standard reservations for stable workloads on proven instance types. Use convertible for evolving infrastructure where you might upgrade instance types.

Example: If running t3.xlarge nodes and confident they will remain optimal, buy standard reservations for maximum discount. If evaluating t4g.xlarge (ARM-based) as a potential replacement, buy convertible reservations to allow future conversion.

## Multi-Year Commitment Strategy

Three-year commitments offer maximum savings but require confidence in long-term needs. Consider a layered approach:

```
Year 1: 3-year commitment for 30% of baseline
Year 2: 1-year commitment for 30% of baseline
Year 3: On-demand for remaining 40%
```

This staggers commitment renewal and provides flexibility as needs evolve.

## Reserved Capacity for Spot Fallback

Use reserved instances as guaranteed capacity backing spot instances:

```yaml
managedNodeGroups:
# Primary capacity - spot instances
- name: spot-primary
  instanceTypes:
  - t3.xlarge
  - t3a.xlarge
  spot: true
  minSize: 0
  maxSize: 200
  desiredCapacity: 100
  labels:
    capacity-type: spot

# Fallback capacity - reserved instances
- name: reserved-fallback
  instanceType: t3.xlarge
  minSize: 50
  maxSize: 50
  desiredCapacity: 50
  labels:
    capacity-type: reserved
```

During normal operation, workloads run on spot instances. During spot interruptions, pods reschedule to reserved nodes, preventing service disruption.

## Cost Modeling

Calculate total cost of ownership:

```
On-demand only:
- 150 t3.xlarge @ $0.1664/hour
- 720 hours/month
- Monthly cost: $17,971

Reserved baseline + on-demand burst:
- 50 reserved t3.xlarge @ $0.0998/hour (40% discount)
- 100 on-demand t3.xlarge @ $0.1664/hour
- Monthly cost: $3,592 + $11,981 = $15,573
- Savings: $2,398/month (13%)

Reserved baseline + spot burst:
- 50 reserved t3.xlarge @ $0.0998/hour
- 100 spot t3.xlarge @ $0.0500/hour (70% discount)
- Monthly cost: $3,592 + $3,600 = $7,192
- Savings: $10,779/month (60%)
```

The mixed strategy combining reserved and spot instances offers maximum savings while maintaining guaranteed capacity.

## Kubernetes Resource Quotas for Reserved Capacity

Prevent oversubscription of reserved capacity:

```yaml
apiVersion: v1
kind: ResourceQuota
metadata:
  name: reserved-capacity-quota
  namespace: production
spec:
  hard:
    requests.cpu: "800"      # Total reserved node CPU
    requests.memory: "3200Gi" # Total reserved node memory
  scopeSelector:
    matchExpressions:
    - operator: In
      scopeName: PriorityClass
      values: ["high-priority", "critical-priority"]
```

This quota limits high and critical priority workloads (those targeting reserved nodes) to the reserved capacity. It prevents accidentally scheduling more pods than reserved nodes can handle.

## Documentation and Change Control

Maintain a reservation tracking document:

```markdown
# Reserved Capacity Tracking

## Current Reservations
| Provider | Instance Type | Count | Region | Expiration | Annual Cost |
|----------|--------------|-------|---------|------------|-------------|
| AWS      | t3.xlarge    | 50    | us-east-1 | 2027-01-15 | $42,732   |
| AWS      | m5.2xlarge   | 20    | us-east-1 | 2026-06-01 | $67,248   |

## Committed Utilization
- Target: 80% minimum utilization
- Current: 87% (reserved nodes running 87 of 100 possible pods)
- Last Review: 2026-01-15

## Upcoming Expirations
- 2026-06-01: 20x m5.2xlarge (evaluate renewal vs m6i.2xlarge conversion)
```

Review this document quarterly with finance and engineering teams to ensure reservations align with actual needs.

Reserved capacity transforms cloud economics from variable to predictable. Combined with Kubernetes resource management, it guarantees critical workload capacity while delivering substantial cost savings. The key is accurate baseline identification and disciplined capacity management.
