# How to Migrate Existing Workloads to Calico on Windows Nodes with the Operator

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Calico, Kubernetes, Window, Operator, Networking, CNI, Migration

Description: A guide to migrating Windows workloads to operator-managed Calico networking from an existing CNI configuration.

---

## Introduction

Migrating Windows workloads to operator-managed Calico differs from manual installation in that the operator takes responsibility for managing the Windows DaemonSet lifecycle after the initial installation. This makes post-migration management easier but requires that the migration itself be carefully coordinated to avoid the operator and the existing CNI conflicting during the transition period.

The migration strategy is to add the operator with Windows support enabled, remove the existing Windows CNI, and then let the operator's Windows DaemonSet handle networking for restarted pods. The operator's declarative model means that as long as the Installation CR is correctly configured, the desired end state will be reached.

## Prerequisites

- A Kubernetes cluster with Windows nodes using a non-Calico CNI
- Linux nodes already running Calico via the Tigera Operator
- Calico v3.27 or later, Kubernetes v1.22 or later, HostProcess container support, and containerd v1.6 or later on Windows nodes
- Calico networking configured with VXLAN, or BGP without encapsulation, because IPIP is not supported on Windows nodes
- The Kubernetes service CIDR used by the API server
- `kube-proxy` running on Windows nodes, or a plan to install the Windows HostProcess kube-proxy DaemonSet
- `kubectl` with cluster admin access
- PowerShell access to Windows nodes

## Step 1: Backup Windows Workload State

```bash
kubectl get pods -A -o wide --field-selector spec.nodeName=<windows-node> > windows-pods-pre-migration.txt
kubectl get deployments -A -o yaml > windows-deployments-backup.yaml
```

## Step 2: Update the Installation CR for Windows

If the operator is already managing Linux nodes, update the Installation CR to enable Windows support.

```bash
kubectl patch ipamconfigurations default --type merge \
  --patch '{"spec":{"strictAffinity":true}}'

kubectl patch installation default --type merge \
  --patch '{"spec":{"serviceCIDRs":["<service-cidr>"],"calicoNetwork":{"windowsDataplane":"HNS"}}}'
```

## Step 3: Cordon and Drain Windows Nodes

```bash
kubectl get nodes -l kubernetes.io/os=windows -o jsonpath='{range .items[*]}{.metadata.name}{"\n"}{end}' | xargs kubectl cordon
kubectl get nodes -l kubernetes.io/os=windows -o jsonpath='{range .items[*]}{.metadata.name}{"\n"}{end}' | xargs -I{} kubectl drain {} --ignore-daemonsets --delete-emptydir-data
```

## Step 4: Remove Old Windows CNI on Each Node

```powershell
# Stop old CNI services

Stop-Service <old-cni-service> -Force -ErrorAction SilentlyContinue

# Remove old CNI configs
Remove-Item C:\etc\cni\net.d\<old-cni>* -Force -ErrorAction SilentlyContinue

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
kubectl get nodes -l kubernetes.io/os=windows -o jsonpath='{range .items[*]}{.metadata.name}{"\n"}{end}' | xargs kubectl uncordon

# If a managed Windows workload still needs to be restarted, restart its controller
kubectl rollout restart deployment -n <namespace> <deployment>
```

## Step 7: Verify Connectivity

```bash
kubectl get pods -A -o wide | grep <windows-node>
kubectl run test --image=busybox -- sleep 3600
kubectl wait --for=condition=Ready pod/test --timeout=60s
WIN_IP=$(kubectl get pod <windows-pod> -n <namespace> -o jsonpath='{.status.podIP}')
kubectl exec test -- ping -c3 $WIN_IP
kubectl delete pod test
```

## Conclusion

Migrating Windows workloads to operator-managed Calico requires updating the Installation CR with Windows dataplane configuration and the Kubernetes service CIDR, cordoning and draining Windows nodes, removing the existing CNI, allowing the operator to deploy the Windows DaemonSet, then uncordoning and restarting any remaining Windows pods. The operator's declarative reconciliation ensures the Windows DaemonSet is correctly deployed and managed once the old CNI has been removed.
