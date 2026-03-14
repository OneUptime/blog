# How to Upgrade Calico on Windows Nodes with the Operator Safely

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Calico, Kubernetes, Windows, Operator, Networking, CNI, Upgrade

Description: A guide to safely upgrading Calico on Windows nodes when managed by the Tigera Operator.

---

## Introduction

The Tigera Operator does not currently perform automatic rolling upgrades of the Windows DaemonSet in the same way it manages Linux nodes. When you upgrade the operator and Linux Calico components, the Windows DaemonSet image must also be updated, but the rollout behavior may differ. This guide covers how to ensure Windows nodes are safely upgraded in conjunction with the Linux upgrade.

The upgrade sequence - operator first, then Linux DaemonSet, then Windows DaemonSet - ensures that the control plane is always at the newer version before the data plane components are updated.

## Prerequisites

- Calico running on Windows and Linux nodes via the Tigera Operator
- `kubectl` with cluster admin access
- All nodes healthy before the upgrade
- A maintenance window

## Step 1: Pre-Upgrade Health Check

```bash
kubectl get tigerastatus
kubectl get pods -n calico-system
kubectl get nodes
```

All must be healthy. Windows DaemonSet pods should be Running.

## Step 2: Backup Configuration

```bash
kubectl get installation default -o yaml > installation-backup.yaml
calicoctl get felixconfiguration -o yaml > felix-backup.yaml
calicoctl get ippool -o yaml > ippool-backup.yaml
```

## Step 3: Upgrade the Tigera Operator

```bash
kubectl apply -f https://raw.githubusercontent.com/projectcalico/calico/v3.27.0/manifests/tigera-operator.yaml
kubectl rollout status deployment/tigera-operator -n tigera-operator
```

## Step 4: Monitor Linux DaemonSet Upgrade

```bash
kubectl rollout status daemonset/calico-node -n calico-system
```

Wait for all Linux nodes to complete before looking at Windows nodes.

## Step 5: Check Windows DaemonSet Update

```bash
kubectl rollout status daemonset/calico-node-windows -n calico-system
```

If the Windows DaemonSet does not automatically update, patch it manually:

```bash
kubectl set image daemonset/calico-node-windows -n calico-system \
  calico-node-windows=calico/node-windows:v3.27.0
kubectl rollout status daemonset/calico-node-windows -n calico-system
```

## Step 6: Monitor Windows Node Pod Restarts

```bash
watch kubectl get pods -n calico-system -o wide | grep windows
```

Each Windows pod should restart with the new image version. If a pod fails to start, check its logs immediately.

## Step 7: Post-Upgrade Verification

```bash
kubectl get tigerastatus
kubectl get nodes
kubectl get pods -n calico-system
```

Test cross-OS connectivity:

```bash
kubectl run linux-test --image=busybox -- sleep 60
WIN_IP=$(kubectl get pod <windows-pod> -o jsonpath='{.status.podIP}')
kubectl exec linux-test -- ping -c3 $WIN_IP
kubectl delete pod linux-test
```

## Conclusion

Upgrading operator-managed Calico on Windows nodes follows the standard operator upgrade sequence - operator first, Linux DaemonSet second, Windows DaemonSet third. Monitoring the Windows DaemonSet rollout separately from the Linux rollout and verifying cross-OS connectivity after completion ensures the mixed-OS cluster remains fully functional throughout the upgrade.
