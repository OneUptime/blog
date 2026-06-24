# How to Use PowerShell for IPv6 Network Configuration

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: IPv6, Window, PowerShell, Network Configuration, Automation

Description: A comprehensive reference for PowerShell cmdlets used to manage IPv6 network configuration on Windows, covering addresses, routes, DNS, and network adapter settings.

## Key PowerShell Modules for IPv6

```powershell
# The NetTCPIP and NetAdapter modules provide IPv6 management

Get-Module -ListAvailable | Where-Object {$_.Name -match "Net"}

# Import if needed
Import-Module NetTCPIP
Import-Module NetAdapter
```

## Viewing IPv6 Configuration

```powershell
# Show all IPv6 addresses
Get-NetIPAddress -AddressFamily IPv6

# Show IP configuration for a specific interface, including IPv6 details
Get-NetIPConfiguration -InterfaceAlias "Ethernet"

# Show IPv6 addresses with full properties
Get-NetIPAddress -AddressFamily IPv6 | Format-List *

# Show IPv6 addresses (non-loopback, non-link-local)
Get-NetIPAddress -AddressFamily IPv6 |
    Where-Object {$_.IPAddress -notlike "fe80*" -and $_.IPAddress -ne "::1"}
```

## Managing IPv6 Addresses

```powershell
# Add a static IPv6 address
New-NetIPAddress `
    -InterfaceAlias "Ethernet" `
    -IPAddress "2001:db8::10" `
    -PrefixLength 64 `
    -DefaultGateway "2001:db8::1"

# Modify prefix length of existing address
Set-NetIPAddress `
    -InterfaceAlias "Ethernet" `
    -IPAddress "2001:db8::10" `
    -PrefixLength 64

# Remove a specific IPv6 address
Remove-NetIPAddress `
    -InterfaceAlias "Ethernet" `
    -IPAddress "2001:db8::10" `
    -Confirm:$false

# Remove all manual IPv6 addresses from an interface
Get-NetIPAddress -InterfaceAlias "Ethernet" -AddressFamily IPv6 |
    Where-Object {$_.PrefixOrigin -eq "Manual"} |
    Remove-NetIPAddress -Confirm:$false
```

## Managing IPv6 Routes

```powershell
# View all IPv6 routes
Get-NetRoute -AddressFamily IPv6

# Add a default IPv6 route
New-NetRoute `
    -InterfaceAlias "Ethernet" `
    -DestinationPrefix "::/0" `
    -NextHop "2001:db8::1" `
    -RouteMetric 10

# Add a specific route
New-NetRoute `
    -InterfaceAlias "Ethernet" `
    -DestinationPrefix "2001:db8:100::/48" `
    -NextHop "2001:db8::1"

# Remove a route
Remove-NetRoute `
    -DestinationPrefix "::/0" `
    -InterfaceAlias "Ethernet" `
    -Confirm:$false

# Find best route to destination
Find-NetRoute -RemoteIPAddress "2001:4860:4860::8888"
```

## Managing IPv6 DNS

```powershell
# Set IPv6 DNS servers
Set-DnsClientServerAddress `
    -InterfaceAlias "Ethernet" `
    -ServerAddresses "2001:4860:4860::8888", "2001:4860:4860::8844"

# View current DNS servers
Get-DnsClientServerAddress -InterfaceAlias "Ethernet" -AddressFamily IPv6

# Reset DNS servers to automatic/default assignment
Set-DnsClientServerAddress -InterfaceAlias "Ethernet" -ResetServerAddresses

# Flush DNS cache
Clear-DnsClientCache

# Test DNS resolution
Resolve-DnsName -Name "google.com" -Type AAAA -Server "2001:4860:4860::8888"
```

## Managing IPv6 Adapter Settings

```powershell
# Enable/disable IPv6 on adapter
Enable-NetAdapterBinding -Name "Ethernet" -ComponentID ms_tcpip6
Disable-NetAdapterBinding -Name "Ethernet" -ComponentID ms_tcpip6

# Check adapter IPv6 binding status
Get-NetAdapterBinding -ComponentID ms_tcpip6

# Enable/disable specific adapter
Enable-NetAdapter -Name "Ethernet"
Disable-NetAdapter -Name "Ethernet" -Confirm:$false
```

## Complete IPv6 Configuration Script

```powershell
# Configure a server with static IPv6
param(
    [string]$InterfaceAlias = "Ethernet",
    [string]$IPv6Address = "2001:db8::10",
    [int]$PrefixLength = 64,
    [string]$Gateway = "2001:db8::1",
    [string[]]$DnsServers = @("2001:4860:4860::8888", "2001:4860:4860::8844")
)

# Remove existing manual IPv6 addresses
Get-NetIPAddress -InterfaceAlias $InterfaceAlias -AddressFamily IPv6 |
    Where-Object {$_.PrefixOrigin -eq "Manual"} |
    Remove-NetIPAddress -Confirm:$false -ErrorAction SilentlyContinue

# Add new static address and gateway
New-NetIPAddress -InterfaceAlias $InterfaceAlias `
    -IPAddress $IPv6Address `
    -PrefixLength $PrefixLength `
    -DefaultGateway $Gateway

# Set DNS servers
Set-DnsClientServerAddress -InterfaceAlias $InterfaceAlias `
    -ServerAddresses $DnsServers

Write-Host "IPv6 configuration complete:"
Get-NetIPConfiguration -InterfaceAlias $InterfaceAlias
```

## Summary

PowerShell provides full IPv6 management via `New-NetIPAddress`, `Get-NetRoute`, `Set-DnsClientServerAddress`, and `Enable-NetAdapterBinding`. View configuration with `Get-NetIPConfiguration -InterfaceAlias "Ethernet"`. Add routes with `New-NetRoute`, remove with `Remove-NetRoute`. Use `Find-NetRoute -RemoteIPAddress` to determine which route will be used for a destination. PowerShell cmdlets offer better scripting support than `netsh` equivalents.
