# How to Install Calico on Windows Nodes with Rancher Step by Step

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Calico, Kubernetes, Windows, Rancher, Networking, CNI, Installation

Description: A step-by-step guide to installing Calico on Windows nodes in a Rancher-managed Kubernetes cluster.

---

## Introduction

Rancher simplifies Kubernetes cluster management and supports mixed Linux/Windows clusters. When creating a Rancher-managed cluster that includes Windows nodes, you can select Calico as the CNI during cluster creation, and Rancher will handle the initial deployment. For existing Rancher clusters without Windows support, adding Windows nodes with Calico requires careful coordination between Rancher's cluster configuration and the Windows node joining process.

Rancher uses RKE (Rancher Kubernetes Engine) or RKE2 for cluster provisioning. Both support Calico as a CNI option, and both have Windows node support, but the configuration paths differ slightly. This guide focuses on RKE2-based clusters, which are Rancher's recommended deployment for new clusters.

## Prerequisites

- Rancher management server (v2.7 or later)
- A Rancher-managed RKE2 cluster with Linux nodes running Calico
- Windows Server 2019 or 2022 nodes to be added
- Rancher CLI or UI access

## Step 1: Verify Linux Cluster Is Using Calico

In the Rancher UI:
- Navigate to your cluster
- Go to **Cluster** > **Edit Config**
- Under **Network Provider**, confirm Calico is selected

Or via CLI:

```bash
kubectl get installation default -n tigera-operator -o yaml 2>/dev/null || \
kubectl get configmap -n cattle-system rke2-chart-values -o yaml | grep calico
```

## Step 2: Configure RKE2 Cluster for Windows

In the Rancher UI, edit the cluster configuration to enable Windows worker nodes:

1. Go to **Cluster** > **Edit Config**
2. Under **Node Pools**, add a new pool with **Node OS: Windows**
3. Set the machine type and count

Or update the RKE2 config:

```yaml
# rke2-cluster.yaml
spec:
  rkeConfig:
    machineGlobalConfig:
      cni: calico
      disable-kube-proxy: false
    windowsProfileSpec:
      version: 1.26
```

## Step 3: Add Windows Nodes via Rancher

Generate the Windows node registration command from Rancher:

1. In Rancher UI, go to **Cluster** > **Registration**
2. Select **Windows** as the node type
3. Copy the PowerShell registration command

Run on each Windows node:

```powershell
# Example registration command (actual command from Rancher UI)
iex (irm https://rancher.example.com/v3/scripts/...) -server https://rancher.example.com -token <token> -worker
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
  nodeSelector:
    kubernetes.io/os: windows
  containers:
  - name: win
    image: mcr.microsoft.com/windows/nanoserver:1809
    command: ["cmd", "/c", "ping -t 127.0.0.1"]
EOF
kubectl get pod rancher-win-test -o wide
```

## Conclusion

Installing Calico on Windows nodes with Rancher leverages Rancher's built-in Windows node registration workflow, which handles much of the CNI setup automatically. The key steps are verifying the Linux cluster is using Calico, enabling Windows node pools in Rancher's cluster configuration, and running the Rancher-generated registration command on each Windows node. Rancher then manages the Windows node's integration with the Calico CNI.
