# How to Set Placement Preferences and Constraints in Portainer for Kubernetes (2)

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Portainer, Kubernetes, Placement, NodeAffinity, DevOps

Description: Learn how to configure Kubernetes node affinity, pod affinity, taints, and tolerations in Portainer to control where workloads are scheduled.

## Introduction

Kubernetes offers powerful mechanisms for controlling where pods are scheduled: node selectors, node affinity, pod affinity/anti-affinity, and taints/tolerations. Portainer exposes node-label placement rules through its application form. This guide covers configuring placement for Kubernetes workloads.

## Prerequisites

- Portainer with Kubernetes environment
- Nodes with labels configured
- Understanding of Kubernetes scheduling concepts

## Step 1: Configure Node Labels

Before using placement rules, ensure nodes have appropriate labels:

```bash
# Add labels to nodes

kubectl label node worker-01 environment=production
kubectl label node worker-01 disktype=ssd
kubectl label node worker-01 topology.kubernetes.io/zone=us-east-1a --overwrite
kubectl label node gpu-node-01 accelerator=nvidia

# Verify
kubectl get nodes --show-labels
```

## Step 2: Node Selector (Simplest Approach)

The simplest way to constrain pods to specific nodes:

### Via Portainer Form

In the application form under **Placement preferences and constraints**:

```text
Placement rules:
  Key:   disktype    Value: ssd
  Key:   environment Value: production
  Policy: Mandatory
```

### Via YAML

```yaml
spec:
  nodeSelector:
    disktype: ssd            # Only nodes with this label
    environment: production  # AND this label
```

## Step 3: Node Affinity (More Flexible)

Node affinity provides more expressive rules with operators:

```yaml
spec:
  affinity:
    nodeAffinity:
      # REQUIRED: Pod will not schedule if not satisfied
      requiredDuringSchedulingIgnoredDuringExecution:
        nodeSelectorTerms:
          - matchExpressions:
              - key: environment
                operator: In
                values:
                  - production
                  - staging
              - key: disktype
                operator: In
                values:
                  - ssd
                  - nvme

      # PREFERRED: Scheduler tries to satisfy, but not required
      preferredDuringSchedulingIgnoredDuringExecution:
        - weight: 100    # Higher weight = stronger preference
          preference:
            matchExpressions:
              - key: topology.kubernetes.io/zone
                operator: In
                values:
                  - us-east-1a
        - weight: 50
          preference:
            matchExpressions:
              - key: instance-type
                operator: In
                values:
                  - m5.large
```

### Node Affinity Operators

| Operator | Description |
|----------|-------------|
| `In` | Node label value is in the list |
| `NotIn` | Node label value is not in the list |
| `Exists` | Node has this label (any value) |
| `DoesNotExist` | Node does not have this label |
| `Gt` | Node label value > specified number |
| `Lt` | Node label value < specified number |

## Step 4: Pod Anti-Affinity (Spread Replicas)

Ensure replicas are spread across nodes/zones to improve availability:

```yaml
spec:
  affinity:
    # Don't schedule on nodes already running this app
    podAntiAffinity:
      requiredDuringSchedulingIgnoredDuringExecution:
        - labelSelector:
            matchLabels:
              app: my-api    # Match pods with this label
          topologyKey: kubernetes.io/hostname  # "Different nodes"

      # Prefer spreading across zones
      preferredDuringSchedulingIgnoredDuringExecution:
        - weight: 100
          podAffinityTerm:
            labelSelector:
              matchLabels:
                app: my-api
            topologyKey: topology.kubernetes.io/zone  # "Different zones"
```

## Step 5: Pod Affinity (Co-locate Services)

Schedule pods near related services (e.g., cache near app):

```yaml
spec:
  affinity:
    podAffinity:
      preferredDuringSchedulingIgnoredDuringExecution:
        - weight: 100
          podAffinityTerm:
            labelSelector:
              matchLabels:
                app: redis-cache
            topologyKey: kubernetes.io/hostname  # Same node as Redis
```

## Step 6: Topology Spread Constraints (Modern Approach)

In Kubernetes 1.19 and later, topology spread constraints are generally available for even distribution:

```yaml
spec:
  topologySpreadConstraints:
    # Spread evenly across nodes
    - maxSkew: 1              # Allow at most 1 replica difference between nodes
      topologyKey: kubernetes.io/hostname
      whenUnsatisfiable: DoNotSchedule  # Or ScheduleAnyway for soft constraint
      labelSelector:
        matchLabels:
          app: my-api

    # Spread evenly across zones
    - maxSkew: 1
      topologyKey: topology.kubernetes.io/zone
      whenUnsatisfiable: ScheduleAnyway   # Prefer but not required
      labelSelector:
        matchLabels:
          app: my-api
```

## Step 7: Taints and Tolerations

Taints repel pods; tolerations allow pods to schedule despite taints:

```bash
# Taint a node to dedicate it to GPU workloads
kubectl taint nodes gpu-node-01 dedicated=gpu:NoSchedule

# Pods need a matching toleration to schedule on gpu-node-01
```

```yaml
spec:
  tolerations:
    - key: dedicated
      operator: Equal
      value: gpu
      effect: NoSchedule
```

Combined with node affinity:

```yaml
spec:
  affinity:
    # Must run on GPU node
    nodeAffinity:
      requiredDuringSchedulingIgnoredDuringExecution:
        nodeSelectorTerms:
          - matchExpressions:
              - key: accelerator
                operator: In
                values:
                  - nvidia

  # Tolerate the GPU taint
  tolerations:
    - key: dedicated
      operator: Equal
      value: gpu
      effect: NoSchedule
```

## Step 8: Portainer Placement Configuration

In Portainer:

1. In the application form, scroll to **Placement preferences and constraints**
2. Add rules based on node labels and choose **Mandatory** or **Preferred**
3. For advanced affinity, anti-affinity, or topology spread rules, deploy with **Create from code** or edit the application's **YAML** tab in Portainer Business Edition

## Verify Placement

```bash
# Check which nodes pods are scheduled on
kubectl get pods -n production -o wide

# Describe a pod to see scheduling decisions
kubectl describe pod <pod-name> -n production | grep -A5 "Node:"

# Check if affinity rules are affecting scheduling
kubectl describe pod <pod-name> -n production | grep -A20 "Events:"
```

## Conclusion

Kubernetes placement controls - from simple node selectors to complex affinity rules - give you precise control over workload distribution. Use node selectors for straightforward requirements, node affinity for complex conditions, pod anti-affinity to spread replicas across failure domains, and topology spread constraints for even distribution. Portainer exposes basic node-label placement through the form UI; for advanced affinity rules, use a manifest or the YAML editor for full control.
