# How to Set Up SMB Access for Windows Clients to CephFS

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Rook, Ceph, SMB, Window, CephFS

Description: Learn how to configure Windows clients to access CephFS via SMB, including drive mapping, authentication, and offline files settings.

---

## Overview

Windows clients access CephFS through the Samba SMB gateway without any special Ceph software. From the Windows perspective, it looks like a standard network file share (UNC path). This guide covers connecting, authenticating, and optimizing Windows clients for reliable CephFS access.

## Connecting from Windows Explorer

The simplest method is mapping a network drive through Windows Explorer:

1. Open File Explorer
2. Click "This PC" then "Map network drive"
3. Enter: `\\samba01\cephshare`
4. Check "Reconnect at sign-in"
5. Check "Connect using different credentials" if using domain credentials
6. Enter username and password

## Mapping a Drive via PowerShell

For scripted or automated deployment:

```powershell
# Basic drive mapping
New-PSDrive -Name Z -PSProvider FileSystem `
  -Root "\\samba01\cephshare" `
  -Credential (Get-Credential) `
  -Persist

# Using stored credentials
$cred = New-Object System.Management.Automation.PSCredential(
  "EXAMPLE\alice",
  (ConvertTo-SecureString "Password123" -AsPlainText -Force)
)
New-PSDrive -Name Z -PSProvider FileSystem `
  -Root "\\samba01\cephshare" `
  -Credential $cred `
  -Persist
```

## Storing Credentials Securely

Avoid passing plaintext passwords by saving credentials in the Windows Credential Manager:

```powershell
cmdkey /add:samba01 /user:EXAMPLE\alice /pass:Password123
```

After storing credentials, mapping works without a password prompt:

```powershell
net use Z: \\samba01\cephshare /persistent:yes
```

## Setting SMB Version

Ensure Windows uses SMB 3.x for best performance and security:

```powershell
# Check current SMB version being used
Get-SmbConnection | Select-Object ServerName, Dialect

# Disable SMB 1.0 (should always be disabled)
Set-SmbServerConfiguration -EnableSMB1Protocol $false -Force

# Verify SMB 3 is enabled
Get-SmbServerConfiguration | Select-Object EnableSMB2Protocol
```

## Configuring Offline Files

For laptop users who need occasional disconnected access:

```powershell
# Enable the Offline Files service
Set-Service -Name CscService -StartupType Automatic
Start-Service CscService

# Verify the service is running
Get-Service -Name CscService
```

After enabling the service, right-click the mapped drive in File Explorer and select **"Always available offline"** to enable caching for the share.

## Tuning SMB Performance

On the Windows client, adjust buffer sizes for better throughput:

```powershell
# Increase receive window
Set-NetTCPSetting -SettingName internet -AutoTuningLevelLocal Normal

# Enable large MTU if network supports jumbo frames
Set-NetAdapterAdvancedProperty -Name "Ethernet" `
  -DisplayName "Jumbo Packet" -DisplayValue "9014 Bytes"
```

## Troubleshooting Connection Issues

If the drive fails to connect, check common causes:

```powershell
# Test name resolution
Resolve-DnsName samba01

# Test SMB port connectivity
Test-NetConnection -ComputerName samba01 -Port 445

# Check Windows Firewall
Get-NetFirewallRule | Where-Object {$_.DisplayName -like "*File*"}
```

View SMB client diagnostic logs:

```powershell
Get-WinEvent -LogName Microsoft-Windows-SMBClient/Operational | Select-Object -First 20
```

## Summary

Setting up SMB access for Windows clients to CephFS requires mapping a UNC path to the Samba gateway with appropriate credentials. Using PowerShell enables automated, scriptable deployments and persistent drive mappings. Enabling SMB 3.x and configuring proper buffer sizes ensures optimal performance for file-intensive workloads accessing CephFS through the Samba gateway.
