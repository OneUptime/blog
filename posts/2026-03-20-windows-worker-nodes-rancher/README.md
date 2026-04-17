# How to Add Windows Worker Nodes to Rancher - Worker Nodes

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Rancher, Window, Kubernetes, Windows Worker Nodes, Mixed Cluster, Container

Description: Add Windows Server worker nodes to a Rancher-managed Kubernetes cluster to run Windows containers alongside Linux workloads.

## Introduction

Kubernetes supports Windows worker nodes for running Windows containers (IIS, .NET Framework, legacy Windows apps). Rancher provides first-class support for mixed Linux/Windows clusters. Windows nodes require Windows Server 2019 or later and run alongside Linux nodes.

## Prerequisites

- Existing Rancher cluster with at least 2 Linux nodes (control plane must be Linux)
- Windows Server 2019 or 2022 with the latest patches
- Flannel with VXLAN backend or Calico for Windows networking

## Step 1: Prepare the Windows Node

```powershell
# On the Windows node - run as Administrator

# Enable necessary Windows features

Install-WindowsFeature -Name Containers

# Configure required Windows settings
Set-ItemProperty -Path 'HKLM:\SYSTEM\CurrentControlSet\Services\hns\State' `
    -Name EnableCompartmentNamespace -Value 1

# Disable Windows Firewall for cluster network interface (or configure rules)
# Set-NetFirewallProfile -Profile Domain,Public,Private -Enabled False

# Restart to apply changes
Restart-Computer
```

## Step 2: Enable Windows Support in Rancher Cluster

When creating a new cluster in Rancher, enable Windows support:

```yaml
# cluster.yaml - RKE configuration
windowsSupport: true

network:
  plugin: flannel
  flannel_network_provider:
    iface: "eth0"
  options:
    flannel_backend_type: vxlan   # Required for Windows; host-gw may not work
```

For existing clusters, Windows support cannot be added retroactively-create a new cluster.

## Step 3: Register Windows Node in Rancher

1. Navigate to your cluster in Rancher UI
2. Click **Edit Cluster** > **Cluster Members**
3. Go to **Nodes** > **Add Node**
4. Select **Worker** role
5. Select **Windows** operating system
6. Copy the registration command

Run the registration command on the Windows node:

```powershell
# Registration command from Rancher UI
# Example:
PowerShell.exe -executionpolicy bypass -File "c:\run.ps1" `
    -server https://rancher.example.com `
    -token K108abc123 `
    --worker
```

## Step 4: Verify Windows Node Registration

```bash
# Check the Windows node appears in the cluster
kubectl get nodes -o wide

# Windows nodes show OS information
# NAME            STATUS   ROLES    OS-IMAGE                         KERNEL-VERSION
# win-worker-1    Ready    <none>   Windows Server 2022 Datacenter  10.0.20348.1668
# linux-worker-1  Ready    <none>   Ubuntu 22.04.3 LTS               5.15.0-91-generic
```

## Step 5: Label Windows Nodes

```bash
# Windows nodes are automatically labeled, but add custom labels for scheduling
kubectl label node win-worker-1 \
  windows-version=2022 \
  workload-type=windows

# Add a taint to prevent Linux workloads from scheduling on Windows nodes
kubectl taint node win-worker-1 os=windows:NoSchedule
```

## Step 6: Schedule a Windows Container

```yaml
# windows-workload.yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: iis-server
spec:
  replicas: 2
  selector:
    matchLabels:
      app: iis
  template:
    metadata:
      labels:
        app: iis
    spec:
      nodeSelector:
        kubernetes.io/os: windows    # Schedule only on Windows nodes
      tolerations:
        - key: os
          operator: Equal
          value: windows
          effect: NoSchedule
      containers:
        - name: iis
          image: mcr.microsoft.com/windows/servercore/iis:windowsservercore-ltsc2022
          ports:
            - containerPort: 80
```

## Conclusion

Windows worker nodes in Rancher enable running Windows containers alongside Linux containers in the same cluster. The key requirement is that the control plane must always be Linux, and the cluster network plugin must support Windows (Flannel with VXLAN or Calico). Always match the Windows container base image version to your Windows worker node OS version.
