# How to Configure Longhorn Toleration Settings

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Longhorn, Kubernetes, Storage, Toleration, Node Scheduling, Configuration

Description: Configure tolerations for Longhorn components to deploy storage infrastructure on tainted nodes such as dedicated storage nodes or nodes with special hardware.

## Introduction

Kubernetes taints and tolerations control which pods can be scheduled on which nodes. Taints on a node repel all pods by default, while tolerations on a pod allow it to be scheduled on tainted nodes. For Longhorn, configuring tolerations allows you to deploy storage components on specialized nodes - such as dedicated storage nodes, nodes with specific hardware, or nodes in a particular region - that have taints applied.

## When to Use Tolerations for Longhorn

Tolerations are useful when:
- You have dedicated storage nodes with taints to prevent general workloads
- You want Longhorn to run on control-plane/master nodes
- You use spot/preemptible nodes with special taints
- You have hardware-specific nodes (e.g., nodes with NVMe drives)

## Understanding Taints and Tolerations

### Example Node Taints

```bash
# Taint a node as a dedicated storage node

kubectl taint nodes storage-node-1 dedicated=storage:NoSchedule

# Taint a control-plane node (typically done by kubeadm)
kubectl taint nodes control-plane-1 node-role.kubernetes.io/control-plane:NoSchedule

# Taint spot/preemptible instances
kubectl taint nodes spot-node-1 cloud.google.com/gke-spot=true:NoSchedule
```

### Verify Node Taints

```bash
# Check taints on all nodes
kubectl get nodes -o custom-columns="NAME:.metadata.name,TAINTS:.spec.taints"

# More detailed view
kubectl describe nodes | grep -A 3 Taints
```

## Setting Longhorn Tolerations Globally

### Via Longhorn Settings

```bash
# Set tolerations for all Longhorn system components
# Tolerations are specified as a semicolon-separated string in key=value:effect format
kubectl patch settings.longhorn.io taint-toleration \
  -n longhorn-system \
  --type merge \
  -p '{"value": "dedicated=storage:NoSchedule"}'

# For multiple tolerations (semicolon-separated)
kubectl patch settings.longhorn.io taint-toleration \
  -n longhorn-system \
  --type merge \
  -p '{"value": "dedicated=storage:NoSchedule;storage=true:NoExecute"}'
```

### Via Longhorn UI

1. Navigate to **Setting** → **General**
2. Find **Kubernetes Taint Toleration**
3. Enter tolerations in the format: `key=value:effect`
4. Click **Save**

Longhorn will restart its components to apply the new tolerations.

## Setting Tolerations via Helm

```yaml
# longhorn-values.yaml - Toleration configuration

# Global tolerations applied to user-deployed Longhorn components
global:
  tolerations:
    # Tolerate dedicated storage nodes
    - key: "dedicated"
      operator: "Equal"
      value: "storage"
      effect: "NoSchedule"
    # Tolerate control-plane nodes
    - key: "node-role.kubernetes.io/control-plane"
      operator: "Exists"
      effect: "NoSchedule"

# Tolerations for system-managed components (e.g. instance-manager)
defaultSettings:
  taintToleration: "dedicated=storage:NoSchedule"

# Per-component tolerations (override global)
longhornManager:
  tolerations:
    - key: "dedicated"
      operator: "Equal"
      value: "storage"
      effect: "NoSchedule"
    - key: "node-role.kubernetes.io/control-plane"
      operator: "Exists"
      effect: "NoSchedule"

longhornDriver:
  tolerations:
    - key: "dedicated"
      operator: "Equal"
      value: "storage"
      effect: "NoSchedule"
```

```bash
helm upgrade longhorn longhorn/longhorn \
  --namespace longhorn-system \
  --values longhorn-values.yaml
```

## Deploying Longhorn on Dedicated Storage Nodes

### Step 1: Set Up Dedicated Storage Nodes

```bash
# Label nodes as storage nodes
kubectl label node storage-node-1 node-type=storage
kubectl label node storage-node-2 node-type=storage
kubectl label node storage-node-3 node-type=storage

# Apply taint to prevent regular workloads from running here
kubectl taint node storage-node-1 dedicated=storage:NoSchedule
kubectl taint node storage-node-2 dedicated=storage:NoSchedule
kubectl taint node storage-node-3 dedicated=storage:NoSchedule
```

### Step 2: Configure Longhorn to Tolerate Storage Node Taint

```bash
# Allow Longhorn managers to run on storage nodes
kubectl patch settings.longhorn.io taint-toleration \
  -n longhorn-system \
  --type merge \
  -p '{"value": "dedicated=storage:NoSchedule"}'
```

### Step 3: Restrict Longhorn to Storage Nodes Only

Combine tolerations with node selectors to ONLY use dedicated storage nodes:

```yaml
# longhorn-values.yaml - Restrict to storage nodes
longhornManager:
  nodeSelector:
    node-type: storage    # Only schedule on nodes labeled as storage
  tolerations:
    - key: dedicated
      operator: Equal
      value: storage
      effect: NoSchedule
```

## Configuring Tolerations for Spot/Preemptible Nodes

If you use spot instances for storage and they have preemption taints:

```yaml
# Tolerate AWS spot instance interruption taint
global:
  tolerations:
    - key: "spot-instance"
      operator: "Equal"
      value: "true"
      effect: "NoSchedule"
    # Or for GKE spot nodes:
    - key: "cloud.google.com/gke-spot"
      operator: "Equal"
      value: "true"
      effect: "NoSchedule"
```

> **Note:** Using spot/preemptible nodes for Longhorn storage is risky since node termination can cause replica unavailability. Only do this if you have enough replicas (3+) and sufficient non-spot nodes.

## Verifying Toleration Settings

```bash
# Check current toleration settings
kubectl get settings.longhorn.io taint-toleration -n longhorn-system -o yaml

# Verify Longhorn pods have the tolerations applied
kubectl get pods -n longhorn-system -o yaml | \
  grep -A 10 "tolerations:"

# Check if manager pods are running on tainted nodes
kubectl get pods -n longhorn-system -l app=longhorn-manager \
  -o custom-columns="NAME:.metadata.name,NODE:.spec.nodeName"

# Confirm those nodes are tainted
kubectl get nodes -o custom-columns="NAME:.metadata.name,TAINTS:.spec.taints"
```

## Conclusion

Toleration settings give you precise control over where Longhorn components are deployed within your cluster. Whether you need to isolate storage workloads on dedicated hardware, enable Longhorn on control-plane nodes, or support specialized node configurations, tolerations make it possible. Combine tolerations with node selectors for maximum control over your storage infrastructure placement, and always test toleration changes in a staging environment before applying them to production.
