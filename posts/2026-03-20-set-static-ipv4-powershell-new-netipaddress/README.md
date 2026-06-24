# How to Set a Static IPv4 Address Using PowerShell New-NetIPAddress

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Window, PowerShell, Networking, IPv4, Static IP, New-NetIPAddress

Description: Assign a static IPv4 address, prefix length, and default gateway to a Windows network adapter using the PowerShell New-NetIPAddress cmdlet.

## Introduction

`New-NetIPAddress` is the modern PowerShell cmdlet for assigning static IP addresses. It provides a cleaner, object-oriented alternative to `netsh` and integrates well with PowerShell scripting and automation.

## Prerequisites

- PowerShell running as Administrator
- The interface alias or index of the target adapter

## Finding the Interface Alias and Index

```powershell
# List all adapters with alias and index

Get-NetAdapter | Select-Object Name, InterfaceIndex, Status, MacAddress
```

## Removing an Existing IP Before Assigning

If the adapter has a DHCP or existing static address:

```powershell
# Remove existing IPv4 address on the interface
$iface = Get-NetAdapter -Name "Ethernet"
Remove-NetIPAddress -InterfaceIndex $iface.InterfaceIndex -AddressFamily IPv4 -Confirm:$false

# Also remove the existing default route (gateway)
Remove-NetRoute -InterfaceIndex $iface.InterfaceIndex -AddressFamily IPv4 -DestinationPrefix "0.0.0.0/0" -Confirm:$false
```

## Assigning a Static IPv4 Address

```powershell
# Assign static IP with prefix length and default gateway
New-NetIPAddress `
    -InterfaceAlias "Ethernet" `
    -AddressFamily IPv4 `
    -IPAddress "192.168.1.100" `
    -PrefixLength 24 `
    -DefaultGateway "192.168.1.1"
```

`PrefixLength 24` is equivalent to subnet mask `255.255.255.0`.

## Setting DNS Servers

```powershell
# Set DNS after assigning the IP
Set-DnsClientServerAddress `
    -InterfaceAlias "Ethernet" `
    -ServerAddresses @("8.8.8.8", "1.1.1.1")
```

## Disabling DHCP

To explicitly disable IPv4 DHCP:

```powershell
# Disable IPv4 DHCP on the interface
Set-NetIPInterface -InterfaceAlias "Ethernet" -AddressFamily IPv4 -Dhcp Disabled
```

## Verifying the Configuration

```powershell
# Show the IP address
Get-NetIPAddress -InterfaceAlias "Ethernet" -AddressFamily IPv4

# Show the default gateway
Get-NetRoute -DestinationPrefix "0.0.0.0/0" | Where-Object InterfaceAlias -eq "Ethernet"

# Show DNS
Get-DnsClientServerAddress -InterfaceAlias "Ethernet"
```

## Complete Static IP Configuration Script

```powershell
# Complete script: set static IP, gateway, and DNS

$AdapterName = "Ethernet"
$IPAddress   = "192.168.1.100"
$PrefixLen   = 24
$Gateway     = "192.168.1.1"
$DNS         = @("8.8.8.8", "1.1.1.1")

$iface = Get-NetAdapter -Name $AdapterName

# Remove existing configuration
Remove-NetIPAddress -InterfaceIndex $iface.InterfaceIndex -AddressFamily IPv4 -Confirm:$false -ErrorAction SilentlyContinue
Remove-NetRoute     -InterfaceIndex $iface.InterfaceIndex -AddressFamily IPv4 -DestinationPrefix "0.0.0.0/0" -Confirm:$false -ErrorAction SilentlyContinue

# Disable IPv4 DHCP
Set-NetIPInterface -InterfaceIndex $iface.InterfaceIndex -AddressFamily IPv4 -Dhcp Disabled

# Assign static IP
New-NetIPAddress -InterfaceIndex $iface.InterfaceIndex `
    -AddressFamily IPv4 -IPAddress $IPAddress `
    -PrefixLength $PrefixLen -DefaultGateway $Gateway

# Set DNS
Set-DnsClientServerAddress -InterfaceIndex $iface.InterfaceIndex -ServerAddresses $DNS

Write-Host "Static IP configuration complete."
ipconfig
```

## Conclusion

`New-NetIPAddress` combined with `Set-DnsClientServerAddress` provides a fully scriptable static IP configuration in PowerShell. It is the preferred method for automation, Active Directory provisioning scripts, and Windows Server deployments.
