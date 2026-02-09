# How to Configure Karpenter Consolidation Policies for Optimal Kubernetes Node Bin Packing

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Karpenter, Kubernetes, Cost Optimization, Node Autoscaling, Bin Packing

Description: Configure Karpenter consolidation policies to optimize node bin packing, automatically rightsizing and replacing nodes to minimize waste and reduce cloud compute costs by 30-50%.

---

Karpenter's consolidation feature continuously evaluates node utilization and automatically replaces underutilized nodes with optimally-sized alternatives. This automatic bin packing reduces waste from fragmented capacity and idle nodes. This guide shows you how to configure Karpenter consolidation for maximum cost efficiency.

## Understanding Karpenter Consolidation

Karpenter monitors node utilization and identifies opportunities to consolidate pods onto fewer nodes. It considers whether pods can be rescheduled to other existing nodes, whether multiple nodes can be replaced by a single larger node, and whether nodes can be replaced with cheaper alternatives.

Consolidation happens automatically in the background without manual intervention.

## Installing Karpenter

Install Karpenter on EKS:

```bash
# Create Karpenter namespace
kubectl create namespace karpenter

# Install using Helm
helm repo add karpenter https://charts.karpenter.sh
helm repo update

helm install karpenter karpenter/karpenter \
  --namespace karpenter \
  --set settings.aws.clusterName=my-cluster \
  --set settings.aws.clusterEndpoint=$(aws eks describe-cluster --name my-cluster --query "cluster.endpoint" --output text) \
  --set settings.aws.defaultInstanceProfile=KarpenterNodeInstanceProfile \
  --set serviceAccount.annotations."eks\.amazonaws\.com/role-arn"=arn:aws:iam::123456789:role/KarpenterControllerRole

# Verify installation
kubectl get pods -n karpenter
```

## Configuring Consolidation Policies

Create a NodePool with consolidation enabled:

```yaml
# nodepool-consolidated.yaml
apiVersion: karpenter.sh/v1beta1
kind: NodePool
metadata:
  name: default
spec:
  template:
    spec:
      requirements:
      - key: karpenter.sh/capacity-type
        operator: In
        values: ["spot", "on-demand"]
      - key: node.kubernetes.io/instance-type
        operator: In
        values:
        - m5.large
        - m5.xlarge
        - m5.2xlarge
        - m5a.large
        - m5a.xlarge
        - m6i.large
        - m6i.xlarge
      nodeClassRef:
        name: default

  disruption:
    consolidationPolicy: WhenUnderutilized
    consolidateAfter: 30s  # Consolidate quickly
    expireAfter: 720h      # Replace nodes after 30 days

  limits:
    cpu: "1000"
    memory: 1000Gi
```

Consolidation policies:

- `WhenUnderutilized`: Consolidate when nodes are underutilized (default)
- `WhenEmpty`: Only consolidate completely empty nodes

## Optimizing Bin Packing Efficiency

Configure pod topology spread to improve bin packing:

```yaml
# deployment-optimized.yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: web-app
spec:
  replicas: 20
  selector:
    matchLabels:
      app: web-app
  template:
    metadata:
      labels:
        app: web-app
    spec:
      topologySpreadConstraints:
      - maxSkew: 2
        topologyKey: topology.kubernetes.io/zone
        whenUnsatisfiable: ScheduleAnyway
        labelSelector:
          matchLabels:
            app: web-app
      - maxSkew: 1
        topologyKey: kubernetes.io/hostname
        whenUnsatisfiable: ScheduleAnyway
        labelSelector:
          matchLabels:
            app: web-app
      containers:
      - name: web
        image: web-app:v1.0
        resources:
          requests:
            cpu: "500m"
            memory: "512Mi"
          limits:
            cpu: "1000m"
            memory: "1Gi"
```

## Monitoring Consolidation Activity

Track consolidation events:

```bash
# Watch for consolidation activity
kubectl logs -n karpenter -l app.kubernetes.io/name=karpenter -f | grep consolidation
```

Create Prometheus queries:

```promql
# Nodes removed by consolidation
sum(increase(karpenter_nodes_terminated_total{reason="consolidation"}[24h]))

# Consolidation savings estimate
sum(karpenter_consolidation_actions_performed_total) * avg_node_cost_per_hour * 730

# Pods disrupted by consolidation
sum(increase(karpenter_pods_disrupted_total{reason="consolidation"}[24h]))
```

## Preventing Consolidation Disruptions

Protect critical pods from consolidation:

```yaml
# critical-deployment.yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: critical-service
spec:
  template:
    metadata:
      annotations:
        karpenter.sh/do-not-evict: "true"  # Prevent consolidation eviction
    spec:
      containers:
      - name: service
        image: critical-service:v1.0
```

Use PodDisruptionBudgets:

```yaml
# pdb.yaml
apiVersion: policy/v1
kind: PodDisruptionBudget
metadata:
  name: critical-service-pdb
spec:
  minAvailable: 3
  selector:
    matchLabels:
      app: critical-service
```

## Advanced Consolidation Scenarios

Configure multi-node consolidation:

```yaml
# aggressive-consolidation.yaml
apiVersion: karpenter.sh/v1beta1
kind: NodePool
metadata:
  name: batch-processing
spec:
  template:
    spec:
      requirements:
      - key: karpenter.sh/capacity-type
        operator: In
        values: ["spot"]
      nodeClassRef:
        name: default

  disruption:
    consolidationPolicy: WhenUnderutilized
    consolidateAfter: 10s    # Aggressive consolidation
    budgets:
    - nodes: "10%"           # Allow disrupting 10% of nodes at once
```

## Cost Savings from Consolidation

Calculate consolidation savings:

```python
#!/usr/bin/env python3
# consolidation-savings.py

import subprocess
import json
from datetime import datetime, timedelta

def get_node_costs():
    """Get node costs before and after consolidation"""
    # Get current nodes
    cmd = "kubectl get nodes -o json"
    result = subprocess.run(cmd.split(), capture_output=True, text=True)
    nodes = json.loads(result.stdout)

    total_capacity = 0
    total_allocatable = 0

    for node in nodes['items']:
        capacity_cpu = parse_cpu(node['status']['capacity']['cpu'])
        allocatable_cpu = parse_cpu(node['status']['allocatable']['cpu'])

        total_capacity += capacity_cpu
        total_allocatable += allocatable_cpu

    # Estimate cost per vCPU (simplified)
    cost_per_vcpu_hour = 0.05  # $0.05 per vCPU hour

    hourly_cost = total_allocatable * cost_per_vcpu_hour
    monthly_cost = hourly_cost * 730

    print(f"Total cluster capacity: {total_capacity} vCPUs")
    print(f"Total allocatable: {total_allocatable} vCPUs")
    print(f"Monthly cost: ${monthly_cost:.2f}")

    return monthly_cost

def parse_cpu(cpu_str):
    """Parse CPU string to cores"""
    if cpu_str.endswith('m'):
        return float(cpu_str[:-1]) / 1000
    return float(cpu_str)

if __name__ == '__main__':
    cost = get_node_costs()
```

## Consolidation Best Practices

Set appropriate consolidation timers:

```yaml
# For stable workloads
consolidateAfter: 5m  # Wait 5 minutes before consolidating

# For bursty workloads
consolidateAfter: 15m  # Wait longer to avoid churn

# For batch jobs
consolidateAfter: 30s  # Consolidate quickly after job completion
```

Use instance type diversity:

```yaml
requirements:
- key: node.kubernetes.io/instance-type
  operator: In
  values:
  - m5.large
  - m5a.large
  - m6i.large
  - m5.xlarge
  - m5a.xlarge
  - m6i.xlarge
```

## Conclusion

Karpenter consolidation automatically optimizes node utilization through intelligent bin packing and rightsizing. By continuously evaluating workload placement and replacing underutilized nodes, Karpenter typically achieves 30-50% cost reduction compared to static node pools. Proper configuration of consolidation policies, disruption budgets, and instance type selection ensures both cost efficiency and application stability.
