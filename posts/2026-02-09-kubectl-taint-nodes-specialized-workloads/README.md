# How to Use kubectl taint to Mark Nodes for Specialized Workloads

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Kubernetes, kubectl, Node Management

Description: Master kubectl taint to dedicate nodes for specific workloads like GPU processing, databases, or high-priority applications, ensuring optimal resource utilization and workload isolation.

---

Not all nodes should run all pods. GPU nodes cost more and should only run GPU workloads. Database nodes need specific performance characteristics. kubectl taint marks nodes as special, preventing general pods from scheduling there unless they explicitly tolerate the taint.

## Understanding Taints and Tolerations

Taints repel pods, tolerations allow pods to overcome taints:

```bash
# Taint a node
kubectl taint nodes worker-1 workload=gpu:NoSchedule

# Pods without matching toleration cannot schedule on worker-1
# Pods with toleration can schedule there
```

Taints have three components: key, value, and effect.

## Taint Effects

Three effects control taint behavior:

```bash
# NoSchedule - prevent new pods from scheduling
kubectl taint nodes worker-1 dedicated=gpu:NoSchedule

# PreferNoSchedule - avoid scheduling but allow if necessary
kubectl taint nodes worker-2 dedicated=gpu:PreferNoSchedule

# NoExecute - evict existing pods without toleration
kubectl taint nodes worker-3 dedicated=gpu:NoExecute
```

NoExecute is the strongest effect, affecting already-running pods.

## Adding Taints to Nodes

Mark nodes for dedicated purposes:

```bash
# Taint for GPU workloads
kubectl taint nodes gpu-node-1 hardware=gpu:NoSchedule

# Taint for database workloads
kubectl taint nodes db-node-1 workload=database:NoSchedule

# Taint for high-priority applications
kubectl taint nodes critical-node-1 tier=critical:NoSchedule

# Taint with value
kubectl taint nodes worker-1 environment=production:NoSchedule
```

This reserves nodes for specific workload types.

## Viewing Node Taints

Check which taints exist on nodes:

```bash
# Show taints for all nodes
kubectl get nodes -o custom-columns=NAME:.metadata.name,TAINTS:.spec.taints

# Describe node to see taints
kubectl describe node worker-1 | grep Taints

# Get taints in YAML format
kubectl get node worker-1 -o yaml | grep -A 5 taints

# List nodes without taints
kubectl get nodes -o json | jq -r '.items[] | select(.spec.taints == null) | .metadata.name'
```

This reveals node specialization across the cluster.

## Removing Taints

Clear taints from nodes:

```bash
# Remove specific taint (note the trailing -)
kubectl taint nodes worker-1 hardware=gpu:NoSchedule-

# Remove taint by key only
kubectl taint nodes worker-1 hardware-

# Remove all taints with a specific key
kubectl taint nodes --all dedicated-

# Verify removal
kubectl describe node worker-1 | grep Taints
```

The minus suffix indicates taint removal.

## GPU Node Tainting

Dedicate nodes with GPUs for GPU workloads:

```bash
# Taint GPU nodes
kubectl taint nodes gpu-node-1 nvidia.com/gpu=present:NoSchedule
kubectl taint nodes gpu-node-2 nvidia.com/gpu=present:NoSchedule

# Only pods with this toleration can schedule:
# tolerations:
# - key: nvidia.com/gpu
#   operator: Equal
#   value: present
#   effect: NoSchedule
```

This prevents non-GPU pods from wasting expensive GPU resources.

## Database Node Tainting

Reserve nodes for databases:

```bash
# Taint database nodes
kubectl taint nodes db-node-1 workload=database:NoSchedule
kubectl taint nodes db-node-2 workload=database:NoSchedule

# Database pods need toleration:
# tolerations:
# - key: workload
#   operator: Equal
#   value: database
#   effect: NoSchedule
```

Database pods get predictable performance without interference.

## High-Priority Workload Tainting

Dedicate nodes for critical applications:

```bash
# Taint nodes for critical workloads
kubectl taint nodes critical-1 tier=critical:NoSchedule
kubectl taint nodes critical-2 tier=critical:NoSchedule

# Critical pods tolerate the taint:
# tolerations:
# - key: tier
#   operator: Equal
#   value: critical
#   effect: NoSchedule
```

This ensures critical services have dedicated resources.

## Evicting Existing Pods

NoExecute effect removes running pods:

```bash
# Taint with NoExecute
kubectl taint nodes worker-1 maintenance=true:NoExecute

# All pods without matching toleration are evicted immediately
# Pods with toleration remain

# Useful for node maintenance
```

Use NoExecute to clear nodes for maintenance or hardware issues.

## Taint with Grace Period

Control eviction timing:

```bash
# Evict pods after 300 seconds
kubectl taint nodes worker-1 maintenance=true:NoExecute

# Pods specify grace period in toleration:
# tolerations:
# - key: maintenance
#   operator: Equal
#   value: true
#   effect: NoExecute
#   tolerationSeconds: 300
```

Grace periods allow gradual workload migration.

## Multiple Taints per Node

Nodes can have several taints:

```bash
# Add multiple taints
kubectl taint nodes worker-1 hardware=gpu:NoSchedule
kubectl taint nodes worker-1 environment=production:NoSchedule
kubectl taint nodes worker-1 team=ml:NoSchedule

# Pods must tolerate ALL taints to schedule
# tolerations:
# - key: hardware
#   value: gpu
#   effect: NoSchedule
# - key: environment
#   value: production
#   effect: NoSchedule
# - key: team
#   value: ml
#   effect: NoSchedule
```

Multiple taints create fine-grained node specialization.

## Taint with Operator Exists

Match any value for a taint key:

```bash
# Taint node
kubectl taint nodes worker-1 special=value:NoSchedule

# Pod tolerates any value for 'special' key:
# tolerations:
# - key: special
#   operator: Exists
#   effect: NoSchedule
```

Exists operator provides flexible matching.

## Master Node Taints

Master nodes typically have taints to prevent workload scheduling:

```bash
# Check master node taints
kubectl describe node master-1 | grep Taints
# Taints: node-role.kubernetes.io/master:NoSchedule

# To schedule on master (not recommended)
# Add toleration:
# tolerations:
# - key: node-role.kubernetes.io/master
#   effect: NoSchedule
```

Leave master taints in place for cluster stability.

## Tainting Node Pools

Cloud providers often manage node pools:

```bash
# GKE - taint node pool during creation
gcloud container node-pools create gpu-pool \
  --cluster=my-cluster \
  --node-taints=nvidia.com/gpu=present:NoSchedule

# EKS - configure node group with taints
# Use launch template or node group configuration

# AKS - add taints to node pool
az aks nodepool add \
  --cluster-name my-cluster \
  --name gpupool \
  --node-taints nvidia.com/gpu=present:NoSchedule
```

Cloud-managed taints apply to entire node pools.

## Temporary Taints for Maintenance

Prepare nodes for maintenance:

```bash
# Mark node for maintenance
kubectl taint nodes worker-1 maintenance=scheduled:NoSchedule

# New pods avoid the node
# Existing pods continue running

# Before actual maintenance, evict pods
kubectl taint nodes worker-1 maintenance=scheduled:NoExecute

# Perform maintenance
# ...

# Remove taint when done
kubectl taint nodes worker-1 maintenance-
```

This creates a safe maintenance workflow.

## Taint-Based Autoscaling

Some autoscalers respect taints:

```bash
# Taint new nodes on creation
# Cluster autoscaler provisions nodes with taints
# Only pods with tolerations trigger scaling

# Example: taint all nodes in a pool
kubectl taint nodes -l pool=spot-instances spot=true:NoSchedule

# Only spot-tolerant pods trigger spot instance provisioning
```

This optimizes autoscaling for specialized workloads.

## Monitoring Taint Coverage

Check which pods can schedule where:

```bash
#!/bin/bash
# check-taint-coverage.sh

echo "Nodes with taints:"
kubectl get nodes -o json | \
  jq -r '.items[] | select(.spec.taints != null) | "\(.metadata.name): \(.spec.taints)"'

echo -e "\nPods that might be stuck:"
kubectl get pods --all-namespaces -o json | \
  jq -r '.items[] | select(.status.phase == "Pending") | "\(.metadata.namespace)/\(.metadata.name)"'
```

This identifies scheduling issues caused by taints.

## Validating Toleration Matching

Ensure pods have correct tolerations:

```bash
#!/bin/bash
# validate-tolerations.sh

NODE=$1

# Get node taints
TAINTS=$(kubectl get node $NODE -o json | jq -r '.spec.taints[]? | "\(.key):\(.effect)"')

echo "Node $NODE taints:"
echo "$TAINTS"

echo -e "\nPods on this node must tolerate:"
for taint in $TAINTS; do
    echo "  - $taint"
done

# Check pods on node
echo -e "\nPods currently on $NODE:"
kubectl get pods --all-namespaces --field-selector spec.nodeName=$NODE -o wide
```

This verifies taint and toleration alignment.

## Common Taint Patterns

Standard taint key formats:

```bash
# Hardware-based
kubectl taint nodes gpu-1 nvidia.com/gpu=true:NoSchedule
kubectl taint nodes ssd-1 node.kubernetes.io/disk-type=ssd:NoSchedule

# Workload-based
kubectl taint nodes db-1 workload=database:NoSchedule
kubectl taint nodes cache-1 workload=cache:NoSchedule

# Environment-based
kubectl taint nodes prod-1 environment=production:NoSchedule
kubectl taint nodes dev-1 environment=development:PreferNoSchedule

# Team-based
kubectl taint nodes team-a-1 team=team-a:NoSchedule
kubectl taint nodes team-b-1 team=team-b:NoSchedule
```

Consistent patterns simplify taint management.

## Taint Automation

Automatically taint nodes based on labels:

```bash
#!/bin/bash
# auto-taint.sh

# Taint all nodes with gpu=true label
kubectl get nodes -l gpu=true -o name | while read node; do
    NODE_NAME=$(echo $node | cut -d/ -f2)
    kubectl taint nodes $NODE_NAME hardware=gpu:NoSchedule --overwrite
    echo "Tainted $NODE_NAME for GPU workloads"
done

# Taint all nodes in production zone
kubectl get nodes -l zone=production -o name | while read node; do
    NODE_NAME=$(echo $node | cut -d/ -f2)
    kubectl taint nodes $NODE_NAME environment=production:NoSchedule --overwrite
    echo "Tainted $NODE_NAME for production"
done
```

Automation maintains consistent taint application.

## Taint Documentation

Document taints for team awareness:

```bash
# Add annotations explaining taints
kubectl annotate node gpu-1 \
  taint-purpose="Reserved for GPU-intensive ML workloads" \
  taint-team="ml-platform" \
  taint-added="2026-02-09"

# Document in cluster documentation
# Include toleration examples for developers
```

Documentation prevents confusion about node availability.

## Troubleshooting Taint Issues

When pods won't schedule:

```bash
# Check pod events
kubectl describe pod stuck-pod | grep -A 10 Events

# Look for taint-related scheduling failures
# "0/5 nodes are available: 3 node(s) had taint {workload: database}, that the pod didn't tolerate"

# Check node taints
kubectl get nodes -o custom-columns=NAME:.metadata.name,TAINTS:.spec.taints

# Add appropriate toleration to pod spec
# Or remove taint if not needed
kubectl taint nodes worker-1 workload-
```

Scheduling failures often indicate missing tolerations.

## Combining Taints with Node Affinity

Use both for precise scheduling:

```bash
# Taint node
kubectl taint nodes gpu-1 hardware=gpu:NoSchedule

# Pod uses both toleration and affinity:
# spec:
#   tolerations:
#   - key: hardware
#     value: gpu
#     effect: NoSchedule
#   affinity:
#     nodeAffinity:
#       requiredDuringSchedulingIgnoredDuringExecution:
#         nodeSelectorTerms:
#         - matchExpressions:
#           - key: gpu-type
#             operator: In
#             values:
#             - nvidia-v100
```

This ensures pods schedule on specific GPU models.

Taints transform uniform node pools into specialized infrastructure. Mark nodes for GPUs, databases, or critical workloads, then use tolerations to grant access selectively. This optimizes resource utilization, reduces costs, and ensures workloads run on appropriate hardware. For more scheduling control, see https://oneuptime.com/blog/post/2026-01-25-kubectl-describe-debugging/view for debugging node assignment issues.
