# How to Troubleshoot Installation Issues with Calico on Windows Nodes

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Calico, Kubernetes, Window, Networking, CNI, Troubleshooting

Description: A diagnostic guide for resolving Calico installation failures specific to Windows Server nodes in Kubernetes clusters.

---

## Introduction

Calico installation failures on Windows nodes have a distinct set of root causes compared to Linux. Windows HNS (Host Network Service) configuration issues, Windows Firewall rules blocking Calico traffic, missing Windows features (like the Containers feature), incorrect containerd CNI directory configuration, and PowerShell execution restrictions can all prevent a successful installation.

Windows networking troubleshooting requires familiarity with Windows-specific tools: `Get-HnsNetwork`, `Get-HnsEndpoint`, Windows Event Viewer, and PowerShell cmdlets. This guide covers the most common Windows-specific Calico installation failures.

## Prerequisites

- Calico installation attempted on Windows Server nodes
- PowerShell (Administrator) access to the Windows nodes
- `kubectl` access from a Linux node

## Step 1: Check Windows Service Status

For manual Calico for Windows installations, check the host services:

```powershell
Get-Service CalicoNode, CalicoFelix | Select-Object Name, Status

# Check for service startup errors

Get-EventLog -LogName Application -Source CalicoNode -Newest 20 | Format-List
Get-EventLog -LogName Application -Source CalicoFelix -Newest 20 | Format-List
```

For operator-based HostProcess installations, Calico runs in Kubernetes pods instead of host-registered Windows services:

```bash
kubectl logs -f -n calico-system -l k8s-app=calico-node-windows -c install-cni
kubectl logs -f -n calico-system -l k8s-app=calico-node-windows -c node
kubectl logs -f -n calico-system -l k8s-app=calico-node-windows -c felix
kubectl logs -f -n calico-system -l k8s-app=calico-node-windows -c confd
```

## Step 2: Check the Calico Log Files

```powershell
Get-ChildItem C:\CalicoWindows\logs
Get-Content C:\CalicoWindows\logs\tigera-node.err.log -Tail 50 -ErrorAction SilentlyContinue
Get-Content C:\CalicoWindows\logs\felix.log -Tail 50 -ErrorAction SilentlyContinue
Get-Content C:\CalicoWindows\logs\confd.log -Tail 50 -ErrorAction SilentlyContinue
```

Common Windows errors:
- `The system cannot find the path specified` - installation path issue
- `Access is denied` - PowerShell execution policy
- `HNS failed` - Windows HNS service issue

## Step 3: Verify Windows Features Are Enabled

```powershell
Get-WindowsFeature Containers
Get-WindowsOptionalFeature -Online | Where-Object { $_.FeatureName -like "*containers*" }
```

Enable if missing:

```powershell
Install-WindowsFeature Containers -Restart
```

## Step 4: Check HNS Network Configuration

```powershell
Import-Module -DisableNameChecking C:\CalicoWindows\libs\hns\hns.psm1
Get-HNSNetwork | Select-Object Name, Type, AddressPrefix
Get-HNSEndpoint | Select-Object Name, IPAddress
```

When using the Calico CNI plugin, Calico IPAM blocks are represented as HNS `l2bridge` networks. If the expected HNS network is missing, Calico has not initialized correctly.

Reset HNS if it is in a bad state:

```powershell
Stop-Service HNS -Force
Start-Service HNS
```

## Step 5: Verify Windows Firewall

```powershell
# Check if Windows Firewall is blocking Calico ports
Get-NetFirewallRule | Where-Object { $_.DisplayName -like "*calico*" -or $_.DisplayName -like "*vxlan*" }

# Allow VXLAN port (4789 UDP) between nodes
New-NetFirewallRule -DisplayName "Calico VXLAN" -Direction Inbound -Protocol UDP -LocalPort 4789 -Action Allow
New-NetFirewallRule -DisplayName "Calico VXLAN Outbound" -Direction Outbound -Protocol UDP -RemotePort 4789 -Action Allow
```

## Step 6: Check Containerd Configuration

```powershell
# Verify containerd is running and has Windows CNI config
Get-Service containerd
Get-ChildItem C:\etc\cni\net.d
Get-Content C:\etc\cni\net.d\10-calico.conflist | ConvertFrom-Json
```

If containerd was installed with a different `conf_dir`, check that directory instead; the Calico Windows CNI config directory must match containerd's CNI configuration directory.

## Conclusion

Troubleshooting Calico on Windows nodes requires checking Windows service logs or HostProcess pod logs, reviewing Calico log files, verifying Windows features are enabled, inspecting HNS network state, allowing Calico ports through Windows Firewall, and confirming containerd's CNI configuration. These Windows-specific diagnostic steps differ significantly from Linux troubleshooting but follow a clear sequence that identifies the most common failure points.
