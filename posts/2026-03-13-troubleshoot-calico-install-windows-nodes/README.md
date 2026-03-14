# How to Troubleshoot Installation Issues with Calico on Windows Nodes

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Calico, Kubernetes, Windows, Networking, CNI, Troubleshooting

Description: A diagnostic guide for resolving Calico installation failures specific to Windows Server nodes in Kubernetes clusters.

---

## Introduction

Calico installation failures on Windows nodes have a distinct set of root causes compared to Linux. Windows HNS (Host Network Service) configuration issues, Windows Firewall rules blocking Calico traffic, missing Windows features (like Hyper-V or Containers features), incorrect containerd configuration, and PowerShell execution policy restrictions can all prevent a successful installation.

Windows networking troubleshooting requires familiarity with Windows-specific tools: `Get-HnsNetwork`, `Get-HnsEndpoint`, Windows Event Viewer, and PowerShell cmdlets. This guide covers the most common Windows-specific Calico installation failures.

## Prerequisites

- Calico installation attempted on Windows Server nodes
- PowerShell (Administrator) access to the Windows nodes
- `kubectl` access from a Linux node

## Step 1: Check Windows Service Status

```powershell
Get-Service CalicoNode, CalicoFelix | Select-Object Name, Status

# Check for service startup errors
Get-EventLog -LogName Application -Source CalicoNode -Newest 20 | Format-List
Get-EventLog -LogName Application -Source CalicoFelix -Newest 20 | Format-List
```

## Step 2: Check the Calico Log Files

```powershell
Get-Content C:\CalicoWindows\logs\calico-node.log -Tail 50
Get-Content C:\CalicoWindows\logs\felix.log -Tail 50
```

Common Windows errors:
- `The system cannot find the path specified` - installation path issue
- `Access is denied` - PowerShell execution policy
- `HNS failed` - Windows HNS service issue

## Step 3: Verify Windows Features Are Enabled

```powershell
Get-WindowsFeature Hyper-V, Containers
Get-WindowsOptionalFeature -Online | Where-Object { $_.FeatureName -like "*containers*" }
```

Enable if missing:

```powershell
Install-WindowsFeature Hyper-V, Containers -IncludeManagementTools -Restart
```

## Step 4: Check HNS Network Configuration

```powershell
Get-HnsNetwork | Select-Object Name, Type, AddressPrefix
```

Calico should create a VXLAN HNS network. If it is missing, Calico has not initialized correctly.

Reset HNS if it is in a bad state:

```powershell
Stop-Service HNS -Force
Start-Service HNS
```

## Step 5: Verify Windows Firewall

```powershell
# Check if Windows Firewall is blocking Calico ports
Get-NetFirewallRule | Where-Object { $_.DisplayName -like "*calico*" -or $_.DisplayName -like "*vxlan*" }

# Allow VXLAN port (4789 UDP)
New-NetFirewallRule -DisplayName "Calico VXLAN" -Direction Inbound -Protocol UDP -LocalPort 4789 -Action Allow
```

## Step 6: Check Containerd Configuration

```powershell
# Verify containerd is running and has Windows CNI config
Get-Service containerd
Get-Content C:\ProgramData\containerd\cni\conf\calico.conf | ConvertFrom-Json
```

## Conclusion

Troubleshooting Calico on Windows nodes requires checking Windows service logs via Event Viewer and Calico log files, verifying Windows features are enabled, inspecting HNS network state, allowing Calico ports through Windows Firewall, and confirming containerd's CNI configuration. These Windows-specific diagnostic steps differ significantly from Linux troubleshooting but follow a clear sequence that identifies the most common failure points.
