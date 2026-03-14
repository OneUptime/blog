# How to Migrate Existing Workloads to Calico on Windows Nodes with the Operator

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Calico, Kubernetes, Windows, Operator, Networking, CNI, Migration

Description: A guide to migrating Windows workloads to operator-managed Calico networking from an existing CNI configuration.

---

## Introduction

Migrating Windows workloads to operator-managed Calico differs from manual installation in that the operator takes responsibility for managing the Windows DaemonSet lifecycle after the initial installation. This makes post-migration management easier but requires that the migration itself be carefully coordinated to avoid the operator and the existing CNI conflicting during the transition period.

The migration strategy is to add the operator with Windows support enabled, remove the existing Windows CNI, and then let the operator's Windows DaemonSet handle networking for restarted pods. The operator's declarative model means that as long as the Installation CR is correctly configured, the desired end state will be reached.

## Prerequisites

- A Kubernetes cluster with Windows nodes using a non-Calico CNI
- Linux nodes already running Calico via the Tigera Operator
- `kubectl` with cluster admin access
- PowerShell access to Windows nodes

## Step 1: Backup Windows Workload State

```bash
kubectl get pods -A -o wide | grep windows-node > windows-pods-pre-migration.txt
kubectl get deployments -A -o yaml > windows-deployments-backup.yaml
```

## Step 2: Update the Installation CR for Windows

If the operator is already managing Linux nodes, update the Installation CR to enable Windows support.

```bash
kubectl patch installation default --type merge \
  --patch '{"spec":{"calicoNetwork":{"windowsDataplane":"HNS"}}}'
```

## Step 3: Cordon Windows Nodes

```bash
kubectl get nodes -l kubernetes.io/os=windows -o name | xargs kubectl cordon
```

## Step 4: Remove Old Windows CNI on Each Node

```powershell
# Stop old CNI services
Stop-Service <old-cni-service> -Force -ErrorAction SilentlyContinue

# Remove old CNI configs
Remove-Item C:\etc\cni\net.d\<old-cni>.conf -ErrorAction SilentlyContinue

# Clean up HNS networks from old CNI
Get-HnsNetwork | Where-Object { $_.Name -notlike "*calico*" -and $_.Name -ne "nat" } | Remove-HnsNetwork
```

## Step 5: Verify Operator Deploys Windows DaemonSet

```bash
kubectl get pods -n calico-system | grep windows
kubectl rollout status daemonset/calico-node-windows -n calico-system
```

## Step 6: Uncordon and Restart Windows Workloads

```bash
kubectl get nodes -l kubernetes.io/os=windows -o name | xargs kubectl uncordon

# Restart Windows pods to get new Calico IPs
kubectl delete pods -A --field-selector spec.nodeName=<windows-node>
```

## Step 7: Verify Connectivity

```bash
kubectl get pods -A -o wide | grep <windows-node>
kubectl run test --image=busybox -- sleep 60
WIN_IP=$(kubectl get pod <windows-pod> -o jsonpath='{.status.podIP}')
kubectl exec test -- ping -c3 $WIN_IP
kubectl delete pod test
```

## Conclusion

Migrating Windows workloads to operator-managed Calico requires updating the Installation CR with Windows dataplane configuration, cordoning Windows nodes, removing the existing CNI, allowing the operator to deploy the Windows DaemonSet, then uncordoning and restarting Windows pods. The operator's declarative reconciliation ensures the Windows DaemonSet is correctly deployed and managed once the old CNI has been removed.
