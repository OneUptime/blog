# How to Add Windows Worker Nodes to Rancher

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Rancher, Window, Kubernetes, Worker Nodes, Hybrid Cluster

Description: Add Windows Server worker nodes to Rancher-managed Kubernetes clusters to run Windows containers alongside Linux workloads in a hybrid cluster configuration.

## Introduction

Rancher supports hybrid Kubernetes clusters with both Linux and Windows worker nodes. Windows nodes can run Windows-specific workloads like .NET Framework applications, IIS, and SQL Server, while Linux nodes handle Linux-native workloads. In Rancher-provisioned RKE2 clusters, the control plane runs on Linux and you should keep at least one Linux worker node for Rancher cluster components such as the cluster agent, DNS, metrics server, and Ingress. This guide covers adding Windows Server nodes to a Rancher-managed cluster.

## Prerequisites

- Rancher-managed RKE2 custom cluster with Linux control plane nodes and at least one Linux worker node
- Windows Server 2019 or 2022
- Cluster created with a Windows-compatible CNI (Flannel or Calico)
- At minimum Windows version: Windows Server 2019 (1809+)
- Rancher version with RKE2 Windows support

## Step 1: Prepare the Cluster for Windows Nodes

In Rancher, create the custom cluster with `Calico` or `Flannel` selected in the `Container Network` field. If you use Flannel with Windows, only the `vxlan` backend is supported.

```bash
# Verify the active bundled CNI chart in RKE2
kubectl get helmcharts -n kube-system
```

```yaml
# /etc/rancher/rke2/config.yaml on Linux server nodes
cni: flannel
```

## Step 2: Prepare Windows Node

```powershell
# Run on Windows Server node (as Administrator)

# Check Windows version
(Get-ComputerInfo).WindowsProductName
[System.Environment]::OSVersion.Version
winver

# Enable the required Windows Containers feature
Enable-WindowsOptionalFeature -Online -FeatureName Containers -All

# Reboot after enabling Containers
Restart-Computer

# Configure firewall rules instead of disabling Windows Firewall.
# Open the ports required for your cluster:
# 6443/TCP - Kubernetes API
# 9345/TCP - RKE2 registration/supervisor API
# 10250/TCP - kubelet metrics
# 30000-32767/TCP - NodePort range
# 4789/UDP - Calico or Flannel VXLAN
# 179/TCP - Calico BGP (only if using Calico BGP)
```

## Step 3: Register the Windows Worker Node

Rancher-managed custom clusters install and manage RKE2 for Windows nodes through the Windows registration command generated in the Rancher UI. Do not manually download the RKE2 Windows zip for this workflow.

1. In Rancher, go to `Cluster Management` -> your cluster -> `Registration`.
2. Under `Node Role`, select `Worker`.
3. Copy the Windows registration command.
4. Run it in an elevated Command Prompt on the Windows host.

The Windows registration command only appears after the cluster is already running with Linux `etcd`, control plane, and worker nodes.

## Step 4: Verify Windows Node Registration

```bash
# From Linux control plane (kubectl)
# Check Windows node appears in cluster
kubectl get nodes -o wide

# Windows node should show:
# NAME          STATUS   ROLES    AGE   VERSION   OS-IMAGE
# win-node-01   Ready    <none>   5m    v1.28.x   Windows Server 2022

# Check node labels
kubectl describe node win-node-01 | grep -A 10 Labels

# Verify Windows node has correct OS labels
kubectl get nodes -l kubernetes.io/os=windows
```

## Step 5: Configure Windows-Specific Node Labels and Taints

```bash
# Windows nodes already get the standard OS and Windows build labels from Kubernetes.
# Add only your own workload labels if needed.
kubectl label node win-node-01 \
  workload-type=windows

# Optionally taint Windows nodes so only Windows workloads schedule there
kubectl taint nodes win-node-01 \
  os=windows:NoSchedule

# Use the automatically added node.kubernetes.io/windows-build label
# in workload nodeSelector rules when you need to match Windows builds.

# Verify labels and taints
kubectl get node win-node-01 --show-labels
kubectl describe node win-node-01
```

## Step 6: Configure ImagePullSecrets for Windows

```bash
# Create registry secret that works for Windows containers
kubectl create secret docker-registry windows-registry-secret \
  --docker-server=registry.example.com \
  --docker-username=winuser \
  --docker-password=password \
  --namespace=production

# Patch the default service account (or use imagePullSecrets in pod spec)
kubectl patch serviceaccount default \
  -n production \
  -p '{"imagePullSecrets": [{"name": "windows-registry-secret"}]}'
```

## Step 7: Verify Windows Container Runtime

```powershell
# On the Windows node, verify container runtime

# Check RKE2 status
Get-Service rke2

# List running Kubernetes containers
& "C:\var\lib\rancher\rke2\bin\crictl.exe" `
  --config "C:\var\lib\rancher\rke2\agent\etc\crictl.yaml" ps

# Check recent RKE2 events
Get-WinEvent -LogName Application -MaxEvents 50 |
  Where-Object { $_.ProviderName -eq "rke2" }
```

## Conclusion

Adding Windows worker nodes to Rancher creates a hybrid cluster capable of running both Linux and Windows containerized workloads from a single management plane. The key requirements are Linux control plane nodes plus at least one Linux worker node, Windows Server 2019+ with the Containers feature enabled, a Windows-compatible network plugin (Flannel or Calico, with VXLAN for Flannel on Windows), and registering the Windows worker from the Rancher UI. After node registration, use node selectors and tolerations to direct Windows workloads to Windows nodes and Linux workloads to Linux nodes.
