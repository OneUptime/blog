# How to Configure Longhorn Priority Classes

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Longhorn, Kubernetes, Storage, Priority Class, Configuration

Description: Configure Kubernetes Priority Classes for Longhorn components to ensure storage infrastructure pods are protected from eviction and scheduled appropriately.

## Introduction

Kubernetes Priority Classes determine the relative priority of pods when the scheduler needs to make decisions about preemption and eviction. For Longhorn, setting appropriate priority classes ensures that storage infrastructure pods are not evicted during resource pressure, which could disrupt volume availability. This guide explains how to configure priority classes for Longhorn components.

## Why Priority Classes Matter for Longhorn

If Longhorn pods are evicted due to resource pressure:
- Volume attachments may fail
- Replicas may become unavailable
- Backup jobs may be interrupted
- Cluster storage becomes unstable

Setting high-priority classes prevents this by telling Kubernetes that Longhorn pods are more important than regular workloads.

## Kubernetes Built-In Priority Classes

```bash
# View existing priority classes

kubectl get priorityclasses

# Default priority classes:
# system-cluster-critical: 2000000000 (Kubernetes system components)
# system-node-critical: 2000001000 (Node-critical system components)
```

## Creating Custom Priority Classes for Longhorn

### High Priority Class (recommended for production)

```yaml
# longhorn-priority-class.yaml - Priority class for Longhorn components
apiVersion: scheduling.k8s.io/v1
kind: PriorityClass
metadata:
  name: longhorn-critical
# Value below system-cluster-critical (2000000000) and system-node-critical (2000001000)
# This ensures Longhorn is protected but won't preempt critical system pods
value: 1000000
globalDefault: false
description: "Priority class for Longhorn storage components"
preemptionPolicy: PreemptLowerPriority
```

```bash
kubectl apply -f longhorn-priority-class.yaml
```

## Configuring Longhorn to Use Priority Classes

### Via Helm

```yaml
# longhorn-values.yaml - Set priority class for all Longhorn components
longhornManager:
  # Use the system-node-critical built-in class
  priorityClass: "system-node-critical"

longhornDriver:
  priorityClass: "system-node-critical"

longhornUI:
  priorityClass: "longhorn-critical"
```

```bash
helm upgrade longhorn longhorn/longhorn \
  --namespace longhorn-system \
  --values longhorn-values.yaml
```

### Via Longhorn Global Settings

```bash
# Set the global priority class for all Longhorn system managed components
kubectl patch settings.longhorn.io priority-class \
  -n longhorn-system \
  --type merge \
  -p '{"value": "longhorn-critical"}'

# Verify the setting
kubectl get settings.longhorn.io priority-class -n longhorn-system -o yaml
```

### Via Longhorn UI

1. Navigate to **Setting** → **General**
2. Find **Priority Class**
3. Enter the priority class name: `longhorn-critical`
4. Click **Save**

This applies to Longhorn Manager, Instance Manager, and Engine pods.

## Recommended Priority Class Strategy

```yaml
# priority-classes.yaml - Tiered priority classes for a cluster

# For Longhorn manager and instance managers (most critical)
apiVersion: scheduling.k8s.io/v1
kind: PriorityClass
metadata:
  name: longhorn-manager-priority
value: 2000000  # Very high, below system-node-critical
globalDefault: false
description: "Priority for Longhorn managers and instance managers"
---
# For Longhorn UI and CSI components (important but not critical)
apiVersion: scheduling.k8s.io/v1
kind: PriorityClass
metadata:
  name: longhorn-standard-priority
value: 1000000
globalDefault: false
description: "Priority for standard Longhorn components"
---
# For production application workloads
apiVersion: scheduling.k8s.io/v1
kind: PriorityClass
metadata:
  name: production-high
value: 100000
globalDefault: false
description: "High priority for production workloads"
---
# For non-critical applications
apiVersion: scheduling.k8s.io/v1
kind: PriorityClass
metadata:
  name: production-standard
value: 10000
globalDefault: true   # All pods get this by default
description: "Standard priority for production workloads"
```

```bash
kubectl apply -f priority-classes.yaml
```

## Applying Priority Classes to Specific Longhorn Components

For more granular control, patch individual Deployments and DaemonSets:

```bash
# Set priority class for the Longhorn manager DaemonSet
kubectl patch daemonset longhorn-manager -n longhorn-system \
  --type json \
  -p '[{"op": "add", "path": "/spec/template/spec/priorityClassName", "value": "longhorn-manager-priority"}]'

# Set priority class for the Longhorn driver deployer
kubectl patch deployment longhorn-driver-deployer -n longhorn-system \
  --type json \
  -p '[{"op": "add", "path": "/spec/template/spec/priorityClassName", "value": "longhorn-standard-priority"}]'

# Set priority class for the Longhorn UI
kubectl patch deployment longhorn-ui -n longhorn-system \
  --type json \
  -p '[{"op": "add", "path": "/spec/template/spec/priorityClassName", "value": "longhorn-standard-priority"}]'
```

## Verifying Priority Class Assignment

```bash
# Check priority classes on Longhorn pods
kubectl get pods -n longhorn-system \
  -o custom-columns="NAME:.metadata.name,PRIORITY_CLASS:.spec.priorityClassName,PRIORITY:.spec.priority"
```

## Testing Priority Under Resource Pressure

Simulate resource pressure to verify Longhorn pods are protected:

```bash
# Deploy a low-priority workload that requests many resources
kubectl apply -f - <<'EOF'
apiVersion: v1
kind: Pod
metadata:
  name: resource-hog
spec:
  priorityClassName: production-standard  # Low priority
  containers:
    - name: hog
      image: busybox
      resources:
        requests:
          memory: "10Gi"
          cpu: "4"
      command: ["sleep", "3600"]
EOF

# Longhorn pods should not be evicted when this pod triggers preemption
kubectl get pods -n longhorn-system | grep -v Running
```

## Conclusion

Configuring appropriate priority classes for Longhorn is a critical step in hardening your storage infrastructure against resource pressure scenarios. By giving Longhorn components higher priority than regular workloads, you ensure that storage continues to function even when the cluster is under memory or CPU stress. Use the system-level priority classes for the most critical Longhorn components, and establish a clear priority hierarchy across your cluster.
