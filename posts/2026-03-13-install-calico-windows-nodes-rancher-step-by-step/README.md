# How to Install Calico on Windows Nodes with Rancher Step by Step

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Calico, Kubernetes, Window, Rancher, Networking, CNI, Installation

Description: A step-by-step guide to installing Calico on Windows nodes in a Rancher-managed Kubernetes cluster.

---

## Introduction

Rancher simplifies Kubernetes cluster management and supports mixed Linux/Windows clusters. When creating a Rancher-managed cluster that includes Windows nodes, you can select Calico as the CNI during cluster creation, and Rancher will handle the initial deployment. For existing Rancher clusters, adding Windows nodes with Calico requires careful coordination between Rancher's cluster configuration and the Windows node joining process.

Rancher uses RKE (Rancher Kubernetes Engine) or RKE2 for cluster provisioning. This guide focuses on RKE2-based clusters because Rancher's current Windows cluster workflow uses RKE2 for custom clusters, and RKE2 supports Calico or Flannel for Windows worker nodes.

## Prerequisites

- Rancher management server (v2.7 or later)
- A Rancher-managed RKE2 cluster with Linux nodes running Calico
- Windows Server 2019 or 2022 nodes to be added
- The Windows Server Containers feature enabled on each Windows node
- Rancher CLI or UI access

## Step 1: Verify Linux Cluster Is Using Calico

In the Rancher UI:
- Navigate to your cluster
- Go to **Cluster** > **Edit Config**
- Under **Network Provider**, confirm Calico is selected

Or via CLI:

```bash
kubectl get helmchart rke2-calico -n kube-system 2>/dev/null || \
kubectl get installation default -o yaml 2>/dev/null
```

## Step 2: Configure RKE2 Cluster for Windows

For Rancher-provisioned custom clusters, Windows support is selected when the cluster is created. In the Rancher UI, create the cluster with Windows support:

1. Go to **Cluster Management** > **Create**
2. Select **Custom**
3. In **Container Network**, select **Calico**
4. Add the required Linux etcd, control plane, and worker nodes before adding Windows workers

Or set Calico in the RKE2 server config before the cluster is initialized:

```yaml
# /etc/rancher/rke2/config.yaml
cni: calico
disable-kube-proxy: false
```

## Step 3: Add Windows Nodes via Rancher

Generate the Windows node registration command from Rancher:

1. In Rancher UI, go to **Cluster** > **Registration**
2. Select the **Worker** node role
3. Copy the Windows worker PowerShell registration command

Run on each Windows node:

```powershell
# Run the exact Windows worker registration command copied from Rancher
# in an elevated PowerShell console.
```

## Step 4: Monitor Node Registration

```bash
kubectl get nodes -w
```

The Windows node should appear and eventually reach `Ready` status.

## Step 5: Verify Calico on the Windows Node

```bash
kubectl get pods -n calico-system -o wide | grep <windows-node>
```

## Step 6: Test Windows Pod Deployment

```bash
cat <<EOF | kubectl apply -f -
apiVersion: v1
kind: Pod
metadata:
  name: rancher-win-test
spec:
  os:
    name: windows
  nodeSelector:
    kubernetes.io/os: windows
  containers:
  - name: win
    image: mcr.microsoft.com/windows/nanoserver:ltsc2022
    command: ["cmd", "/c", "ping -t 127.0.0.1"]
EOF
kubectl get pod rancher-win-test -o wide
```

Use a Windows container image tag that matches the Windows Server version on the node; for Windows Server 2019, use a Server 2019/1809 image tag instead of `ltsc2022`.

## Conclusion

Installing Calico on Windows nodes with Rancher leverages Rancher's built-in Windows node registration workflow, which handles much of the CNI setup automatically. The key steps are verifying the Linux cluster is using Calico, selecting Calico for the Windows-capable RKE2 cluster, and running the Rancher-generated registration command on each Windows node. Rancher then manages the Windows node's integration with the Calico CNI.
