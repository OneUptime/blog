# How to Install Calico on Windows Nodes with the Operator Step by Step

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Calico, Kubernetes, Windows, Operator, Networking, CNI, Installation

Description: A step-by-step guide to installing Calico on Windows nodes using the Tigera Operator with operator-managed Windows support.

---

## Introduction

The Tigera Operator can manage Calico installation on Windows nodes in clusters where the operator is already managing the Linux Calico installation. Operator-managed Windows support uses a Windows-specific DaemonSet that the operator deploys automatically when it detects Windows nodes in the cluster, providing a more consistent management experience than the manual script-based installation.

Operator-managed Windows Calico requires the cluster to be using Calico with the Tigera Operator, the Windows nodes to have the necessary Windows features enabled, and the operator's Installation CR to be configured with Windows-compatible settings (VXLAN encapsulation and the Windows dataplane configuration).

This guide covers installing Calico on Windows nodes using the Tigera Operator.

## Prerequisites

- A Kubernetes cluster with Linux nodes running Calico via the Tigera Operator
- Windows Server 2019 or 2022 nodes joined to the cluster
- `kubectl` with cluster admin access
- PowerShell access to Windows nodes for verification

## Step 1: Verify the Operator Is Managing Linux Nodes

```bash
kubectl get tigerastatus
kubectl get installation default -o yaml
```

The Tigera Operator must be installed and healthy before adding Windows support.

## Step 2: Enable Windows Support in the Installation CR

Patch the Installation CR to enable Windows node support.

```bash
kubectl patch installation default --type merge \
  --patch '{
    "spec": {
      "calicoNetwork": {
        "windowsDataplane": "HNS",
        "ipPools": [{
          "blockSize": 26,
          "cidr": "192.168.0.0/16",
          "encapsulation": "VXLAN",
          "natOutgoing": "Enabled",
          "nodeSelector": "all()"
        }]
      }
    }
  }'
```

## Step 3: Verify the Operator Deploys Windows DaemonSet

The operator should automatically detect Windows nodes and deploy the Windows-specific DaemonSet.

```bash
kubectl get daemonset -n calico-system
```

Look for a `calico-node-windows` DaemonSet.

## Step 4: Verify Windows Node Prerequisites

```powershell
# On each Windows node
Get-WindowsFeature Containers
Get-Service containerd
Get-Service kubelet
```

## Step 5: Monitor Windows DaemonSet Rollout

```bash
kubectl rollout status daemonset/calico-node-windows -n calico-system
kubectl get pods -n calico-system -o wide | grep windows
```

## Step 6: Verify Windows Nodes Are Ready

```bash
kubectl get nodes
kubectl get nodes -l kubernetes.io/os=windows
```

Windows nodes should transition to `Ready` once the calico-node-windows pod is running on each.

## Step 7: Test Windows Pod Networking

```yaml
# windows-test-pod.yaml
apiVersion: v1
kind: Pod
metadata:
  name: win-test
spec:
  nodeSelector:
    kubernetes.io/os: windows
  containers:
  - name: win
    image: mcr.microsoft.com/windows/nanoserver:1809
    command: ["cmd", "/c", "ping -t 127.0.0.1"]
```

```bash
kubectl apply -f windows-test-pod.yaml
kubectl get pod win-test -o wide
```

## Conclusion

Installing Calico on Windows nodes with the Tigera Operator simplifies Windows CNI management by extending the operator's automated lifecycle management to include Windows-specific DaemonSets. Once the Installation CR is updated with Windows dataplane configuration, the operator handles deploying and managing the Windows-specific components automatically as Windows nodes are added to the cluster.
