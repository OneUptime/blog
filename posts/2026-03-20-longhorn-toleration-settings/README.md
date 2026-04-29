# How to Configure Longhorn Toleration Settings - A Practical Guide

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Longhorn, Toleration, Taints, Kubernetes, Storage, Node Selection, SUSE Rancher

Description: Learn how to configure Longhorn global toleration settings so Longhorn system pods can be scheduled on tainted nodes, enabling dedicated storage nodes in your Kubernetes cluster.

---

Kubernetes node taints prevent non-tolerating pods from being scheduled on nodes. When you reserve dedicated storage nodes with custom taints, Longhorn components need matching tolerations to run on those nodes.

---

## Use Case: Dedicated Storage Nodes

A common pattern is to add a `dedicated=storage:NoSchedule` taint to specific nodes reserved for Longhorn, and configure Longhorn to tolerate this taint so Longhorn components can run on those nodes while general workloads without a matching toleration cannot.

---

## Step 1: Taint Storage-Dedicated Nodes

```bash
# Taint nodes reserved for Longhorn storage

kubectl taint node storage-node-01 dedicated=storage:NoSchedule
kubectl taint node storage-node-02 dedicated=storage:NoSchedule
kubectl taint node storage-node-03 dedicated=storage:NoSchedule

# Verify taints
kubectl describe node storage-node-01 | grep Taints
```

---

## Step 2: Configure Longhorn Tolerations

Set the toleration in Longhorn's `taint-toleration` setting for system-managed components. This applies to components such as instance manager, backing image manager, share manager, CSI driver, and engine image pods. If you also want Longhorn Manager, Driver, and UI to run on tainted nodes, set matching tolerations in your Helm values or deployment YAML.

```bash
# Set via kubectl
kubectl patch settings.longhorn.io taint-toleration \
  -n longhorn-system \
  --type merge \
  -p '{"value":"dedicated=storage:NoSchedule"}'
```

For multiple tolerations, separate with semicolons:

```bash
# Multiple tolerations
kubectl patch settings.longhorn.io taint-toleration \
  -n longhorn-system \
  --type merge \
  -p '{"value":"dedicated=storage:NoSchedule;node-role=longhorn:NoExecute"}'
```

---

## Step 3: Apply the Setting Safely

To apply the modified toleration setting immediately, stop workloads and detach all Longhorn volumes first. When volumes are still attached, Longhorn does not restart the affected system-managed components immediately; reconfigure the setting after detaching the remaining volumes or wait for the next hourly reconciliation cycle.

```bash
# Watch affected Longhorn pods reconcile with the new toleration
kubectl get pods -n longhorn-system -w

# Check whether the setting has been applied
kubectl get settings.longhorn.io taint-toleration \
  -n longhorn-system

# Verify tolerations are applied
kubectl get pods -n longhorn-system -o json | \
  jq '.items[].spec.tolerations'
```

---

## Step 4: Restrict Longhorn System-Managed Components to Storage Nodes

To restrict Longhorn system-managed components to storage nodes, combine tolerations with a node selector. If you also want Longhorn Manager, Driver, and UI on those nodes, set matching node selectors in your Helm values or deployment YAML.

```bash
# Set node selector to run Longhorn only on labeled storage nodes
kubectl label node storage-node-01 node-type=longhorn
kubectl label node storage-node-02 node-type=longhorn
kubectl label node storage-node-03 node-type=longhorn

# Set the Longhorn system managed component node selector
kubectl patch settings.longhorn.io system-managed-components-node-selector \
  -n longhorn-system \
  --type merge \
  -p '{"value":"node-type:longhorn"}'
```

---

## Step 5: Test Toleration Is Working

Deploy a test pod without the toleration - it should not be scheduled on tainted storage nodes. If your cluster has no other schedulable nodes, it will remain `Pending`:

```bash
# This pod should not be scheduled on tainted storage nodes
kubectl run no-toleration-pod --image=nginx

# Check the pod status and assigned node
kubectl get pod no-toleration-pod -o wide
```

---

## Best Practices

- Use `NoSchedule` taints (not `NoExecute`) for storage-only nodes unless you want to forcibly evict existing pods.
- After adding tolerations, verify that Longhorn replicas are being placed on the storage-only nodes as intended.
- Document your taint and toleration scheme - it is easy to accidentally add new nodes that are not tainted, leading to uneven storage distribution.
