# How to Upgrade Calico on Windows Nodes Safely

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Calico, Kubernetes, Windows, Networking, CNI, Upgrade

Description: A guide to safely upgrading Calico on Windows Server nodes in a Kubernetes cluster while maintaining pod networking continuity.

---

## Introduction

Upgrading Calico on Windows nodes is more manual than on Linux nodes because the Tigera Operator does not manage Windows node upgrades automatically. The operator manages Linux `calico-node` DaemonSet pods, but Windows nodes run calico-node as a Windows service that must be upgraded by downloading and installing a new binary package.

This means Windows node Calico upgrades must be coordinated manually with Linux node upgrades. The recommended approach is to upgrade Linux nodes first (let the operator handle those), then upgrade Windows nodes one at a time using the Windows installation script.

## Prerequisites

- Calico running on both Linux and Windows nodes
- A tested upgrade package for the target Windows version
- PowerShell access to all Windows nodes
- `kubectl` access from a Linux node

## Step 1: Upgrade Linux Nodes First

Let the Tigera Operator upgrade Linux nodes.

```bash
kubectl apply -f https://raw.githubusercontent.com/projectcalico/calico/v3.27.0/manifests/tigera-operator.yaml
kubectl rollout status daemonset/calico-node -n calico-system
```

Verify Linux nodes are healthy before proceeding to Windows.

## Step 2: Download New Windows Package on Each Node

```powershell
# On each Windows node
$CALICO_VERSION = "v3.27.0"
Invoke-WebRequest -Uri "https://github.com/projectcalico/calico/releases/download/$CALICO_VERSION/calico-windows-$CALICO_VERSION.zip" `
  -OutFile C:\calico-windows-new.zip
```

## Step 3: Cordon the Windows Node

```bash
kubectl cordon <windows-node-name>
```

## Step 4: Stop Calico Services and Upgrade

```powershell
Stop-Service CalicoFelix -Force
Stop-Service CalicoNode -Force

# Backup old installation
Rename-Item C:\CalicoWindows C:\CalicoWindows.bak

# Extract new package
Expand-Archive -Path C:\calico-windows-new.zip -DestinationPath C:\CalicoWindows

# Copy configuration from backup
Copy-Item C:\CalicoWindows.bak\config.ps1 C:\CalicoWindows\config.ps1
```

## Step 5: Reinstall Services with New Binaries

```powershell
C:\CalicoWindows\install-calico.ps1
Get-Service CalicoNode, CalicoFelix
```

## Step 6: Uncordon and Verify

```bash
kubectl uncordon <windows-node-name>
kubectl get node <windows-node-name>
kubectl get pods -A -o wide | grep <windows-node-name>
```

```powershell
# Test a Windows pod
Get-HnsEndpoint | Measure-Object
```

Repeat Steps 3-6 for each Windows node.

## Conclusion

Upgrading Calico on Windows nodes requires manual binary replacement because the Tigera Operator only manages Linux nodes. The process - cordon, stop services, extract new binaries, reinstall, uncordon - should be applied to one Windows node at a time, with connectivity verification after each node to ensure the upgrade is proceeding correctly.
