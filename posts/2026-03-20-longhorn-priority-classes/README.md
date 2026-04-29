# How to Configure Longhorn Priority Classes - A Practical Guide

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Longhorn, Priority Class, Kubernetes, Storage, Resource Management, QoS, SUSE Rancher

Description: Learn how to configure Kubernetes PriorityClasses for Longhorn system components to protect storage operations from being preempted during node resource contention.

---

Longhorn components need to survive node resource pressure. Assigning appropriate PriorityClasses helps keep Longhorn system-managed components from being the first pods preempted or evicted, and you can apply the same class to user-deployed components as well.

---

## Why Priority Classes Matter for Longhorn

When a node is under resource pressure:
- Kubernetes may evict lower-priority pods during node-pressure events such as memory or disk pressure
- If Longhorn data-plane or control-plane pods are evicted, storage operations can be disrupted and volumes may become unavailable
- Setting a high priority class helps protect Longhorn from being evicted before lower-priority user workloads

---

## Step 1: Create Priority Classes

Create or verify a Longhorn-specific priority class:

```yaml
# longhorn-priority-class.yaml

apiVersion: scheduling.k8s.io/v1
kind: PriorityClass
metadata:
  name: longhorn-critical
# Use a value below the built-in system-* classes and above regular workloads
value: 1000000000
globalDefault: false
description: "Priority class for Longhorn storage components"
preemptionPolicy: PreemptLowerPriority
```

```bash
kubectl apply -f longhorn-priority-class.yaml
```

---

## Step 2: Configure Longhorn to Use the Priority Class

Set the priority class for Longhorn's system-managed components via the UI or directly:

```bash
# Update via kubectl
kubectl patch settings.longhorn.io priority-class \
  -n longhorn-system \
  --type merge \
  -p '{"value":"longhorn-critical"}'

# Verify the setting
kubectl get settings.longhorn.io priority-class \
  -n longhorn-system \
  -o jsonpath='{.value}'
```

After this change, Longhorn recreates its system-managed components to apply the new priority class. Detach all Longhorn volumes first if you want the change applied immediately; otherwise you may need to reapply the setting after detaching the remaining volumes, or wait for the next hourly synchronization. Longhorn Manager, Driver, and UI must be configured separately in your Helm values or deployment YAML.

---

## Step 3: Verify Priority Classes Are Applied

```bash
# Check which Longhorn pods have the priority class
kubectl get pods -n longhorn-system \
  -o custom-columns='NAME:.metadata.name,PRIORITY_CLASS:.spec.priorityClassName'
```

---

## Step 4: Configure Priority Class for Workloads

Define priority classes for your workloads relative to Longhorn:

```yaml
# storage-consumer-priority.yaml
apiVersion: scheduling.k8s.io/v1
kind: PriorityClass
metadata:
  name: storage-consumer-high
# Lower than longhorn-critical so Longhorn is protected
value: 500000
```

```yaml
# Reference in pod spec
spec:
  priorityClassName: storage-consumer-high
  containers:
    - name: app
      image: myapp:latest
```

---

## Priority Class Hierarchy for Longhorn Clusters

```text
system-node-critical    (built-in highest)
system-cluster-critical (built-in)
longhorn-critical      1,000,000,000 (protect storage layer)
database-workloads           800,000 (stateful apps)
api-services                 500,000 (stateless apps)
batch-jobs                   100,000 (low priority)
default (user pods)                0
```

---

## Best Practices

- Set Longhorn's priority class during installation when possible. If you change it later, detach all Longhorn volumes first so restarted system-managed components can pick up the setting cleanly.
- Do not set Longhorn's priority class above cluster system components - Longhorn should not preempt CoreDNS or kube-proxy.
- If you want Longhorn Manager, Driver, and UI to use the same class, set those values in your Helm chart or deployment YAML as well.
- Create separate priority classes for your stateful vs. stateless workloads to control eviction order independently.
