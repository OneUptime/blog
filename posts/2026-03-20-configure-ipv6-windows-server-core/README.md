# How to Configure IPv6 on Windows Server Core

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: IPv6, Windows Server Core, PowerShell, Netsh, Network Configuration

Description: Learn how to configure IPv6 on Windows Server Core - a minimal installation without a GUI - using PowerShell and netsh commands for complete IPv6 network setup.

## Checking IPv6 Status on Server Core

```powershell
# Show all network adapters

Get-NetAdapter

# Show IPv6 addresses
Get-NetIPAddress -AddressFamily IPv6

# Show full IP configuration (equivalent to ipconfig /all)
Get-NetIPConfiguration

# Check IPv6 binding status
Get-NetAdapterBinding -ComponentID ms_tcpip6
```

## Configure Static IPv6 Address

```powershell
# Get adapter name
$adapter = Get-NetAdapter | Where-Object {$_.Status -eq "Up"} | Select-Object -First 1 -ExpandProperty Name

# Assign static IPv6 address
New-NetIPAddress `
    -InterfaceAlias $adapter `
    -IPAddress "2001:db8::10" `
    -PrefixLength 64 `
    -DefaultGateway "2001:db8::1"

# Set IPv6 DNS
Set-DnsClientServerAddress `
    -InterfaceAlias $adapter `
    -ServerAddresses "2001:4860:4860::8888", "2001:4860:4860::8844"

# Verify
Get-NetIPConfiguration -InterfaceAlias $adapter
```

## Configure IPv6 via netsh on Server Core

```cmd
:: Show interfaces
netsh interface ipv6 show interfaces

:: Add IPv6 address (interface name from above)
netsh interface ipv6 add address "Ethernet" 2001:db8::10/64

:: Add default gateway
netsh interface ipv6 add route ::/0 "Ethernet" 2001:db8::1

:: Add DNS server
netsh interface ipv6 add dnsserver "Ethernet" 2001:4860:4860::8888 index=1

:: Verify
netsh interface ipv6 show addresses
netsh interface ipv6 show routes
```

## Rename Network Adapters (for clarity on Server Core)

```powershell
# Rename adapter for clarity
Rename-NetAdapter -Name "Ethernet0" -NewName "Management"
Rename-NetAdapter -Name "Ethernet1" -NewName "Production"

# Now configure with meaningful names
New-NetIPAddress -InterfaceAlias "Production" `
    -IPAddress "2001:db8::10" `
    -PrefixLength 64 `
    -DefaultGateway "2001:db8::1"
```

## Test IPv6 Connectivity from Server Core

```powershell
# Ping test
Test-NetConnection -ComputerName "2001:4860:4860::8888"

# Port-specific test
Test-NetConnection -ComputerName "2001:4860:4860::8888" -Port 443

# DNS resolution test
Resolve-DnsName -Name "google.com" -Type AAAA

# Traceroute
tracert -6 2001:4860:4860::8888
```

## Enable IPv6 Forwarding on Server Core (for router role)

```powershell
# Enable IPv6 forwarding (for servers acting as routers)
Set-NetIPInterface -AddressFamily IPv6 -Forwarding Enabled

# Verify
Get-NetIPInterface -AddressFamily IPv6 | Select-Object InterfaceAlias, Forwarding
```

## Persistent Configuration with Startup Script

```powershell
# Create a startup script for IPv6 configuration
# Run via Task Scheduler at boot or with Group Policy startup scripts

$script = @'
# IPv6 static configuration script
$adapter = "Ethernet"
$ipv6 = "2001:db8::10"
$prefix = 64
$gateway = "2001:db8::1"
$dns = @("2001:4860:4860::8888", "8.8.8.8")

# Remove old config and apply new
Get-NetIPAddress -InterfaceAlias $adapter -AddressFamily IPv6 |
    Where-Object {$_.PrefixOrigin -eq "Manual"} |
    Remove-NetIPAddress -Confirm:$false -EA SilentlyContinue

New-NetIPAddress -InterfaceAlias $adapter -IPAddress $ipv6 `
    -PrefixLength $prefix -DefaultGateway $gateway

Set-DnsClientServerAddress -InterfaceAlias $adapter -ServerAddresses $dns
'@

$script | Out-File "C:\Scripts\Configure-IPv6.ps1"
```

## Summary

On Windows Server Core, all IPv6 configuration is done via PowerShell (`New-NetIPAddress`, `Set-DnsClientServerAddress`) or `netsh interface ipv6` commands. Use `Get-NetIPConfiguration` to view current state and `Test-NetConnection` for connectivity testing. Rename adapters with `Rename-NetAdapter` for clarity. For routing, enable forwarding with `Set-NetIPInterface -AddressFamily IPv6 -Forwarding Enabled`.
