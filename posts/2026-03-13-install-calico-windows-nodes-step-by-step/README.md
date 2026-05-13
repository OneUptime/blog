# How to Install Calico on Windows Nodes Step by Step

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Calico, Kubernetes, Window, Networking, CNI, Installation

Description: A step-by-step guide to installing Calico networking on Windows Server nodes in a mixed Linux/Windows Kubernetes cluster.

---

## Introduction

Running Windows containers in Kubernetes requires special handling for networking. Calico supports Windows nodes through a dedicated installation path that runs calico-node as a Windows service rather than a container (since Windows does not support privileged containers). This enables Windows pods to get Calico-managed IP addresses and participate in Calico network policies alongside Linux pods.

Windows nodes in Kubernetes clusters can use Calico VXLAN or Calico BGP networking with the Windows BGP router. IP-in-IP is not supported on Windows nodes, and if Calico CNI with VXLAN is used, BGP must be disabled. VXLAN is commonly used because it can traverse most networks and is supported by Calico for Windows.

This guide covers installing Calico on Windows Server nodes in a mixed Linux/Windows Kubernetes cluster.

## Prerequisites

- A Kubernetes cluster with Linux nodes already running Calico
- Windows Server 2019 or 2022 worker nodes joined to the cluster
- PowerShell access to the Windows nodes
- `kubectl.exe` and the kubelet kubeconfig copied to `C:\k\config` on each Windows node
- `kubectl` access from a Linux node for cluster verification

## Step 1: Verify Linux Nodes Have Calico Installed

```bash
kubectl get nodes
kubectl get pods -n calico-system
calicoctl version
```

Linux nodes must be healthy before adding Windows nodes.

## Step 2: Confirm Windows Node Requirements

On each Windows node (via RDP or WinRM):

```powershell
# Check Windows version

Get-ComputerInfo | Select-Object WindowsProductName, WindowsVersion

# Check containerd is running
Get-Service containerd
Get-Service kubelet

# Verify network adapter
Get-NetAdapter
```

Windows Server 2019 (1809) or later is required.

## Step 3: Download the Calico Windows Installation Script

```powershell
# On the Windows node, download the installation script
Invoke-WebRequest -Uri "https://github.com/projectcalico/calico/releases/download/v3.27.0/install-calico-windows.ps1" -OutFile C:\install-calico-windows.ps1
C:\install-calico-windows.ps1 -DownloadOnly yes -KubeVersion <your Kubernetes version>
```

## Step 4: Configure the Installation

```powershell
# Edit the configuration file
notepad C:\CalicoWindows\config.ps1
```

Set the following variables:

```powershell
$env:CALICO_NETWORKING_BACKEND = "vxlan"
$env:CALICO_DATASTORE_TYPE = "kubernetes"
$env:KUBECONFIG = "C:\k\config"
$env:VXLAN_VNI = "4096"
$env:NODENAME = $(hostname).ToLower()
$env:CALICO_K8S_NODE_REF = $env:NODENAME
```

## Step 5: Run the Installation

```powershell
C:\CalicoWindows\install-calico.ps1
```

This installs calico-node and felix as Windows services.

## Step 6: Verify Windows Node Readiness

```powershell
# Check service status
Get-Service CalicoNode
Get-Service CalicoFelix
```

From the Linux control plane:

```bash
kubectl get nodes
kubectl get pods -A -o wide | grep <windows-node>
```

## Conclusion

Installing Calico on Windows nodes requires downloading the Windows-specific installation package, configuring it with the VXLAN networking backend and the cluster kubeconfig, and running the installation script that sets up calico-node and felix as Windows services. Once complete, Windows pods receive Calico-managed IPs and can communicate with Linux pods in the same cluster.
