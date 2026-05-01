# How to Configure Dual-Stack IPv4/IPv6 on Windows Server

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Dual-Stack, IPv4, IPv6, Windows Server, Networking, PowerShell

Description: Configure dual-stack IPv4 and IPv6 networking on Windows Server using PowerShell and GUI, assign static addresses, configure routes, and verify both protocol stacks.

## Introduction

Windows Server supports dual-stack networking natively. Both IPv4 and IPv6 are enabled by default. You can assign static addresses for both protocols on the same adapter and configure routes for each independently.

## Checking Current Configuration

```powershell
# View all network adapters and addresses

Get-NetIPAddress | Format-Table InterfaceAlias, AddressFamily, IPAddress, PrefixLength

# View interface details
Get-NetAdapter

# View routing table for both families
Get-NetRoute -AddressFamily IPv4
Get-NetRoute -AddressFamily IPv6
```

## Configuring Static Dual-Stack Addresses (PowerShell)

```powershell
# Get the interface index
$ifIndex = (Get-NetAdapter -Name "Ethernet").ifIndex

# Remove existing IP addresses (optional, to start clean)
# Remove-NetIPAddress -InterfaceIndex $ifIndex -Confirm:$false

# Add IPv4 address
New-NetIPAddress `
  -InterfaceIndex $ifIndex `
  -AddressFamily IPv4 `
  -IPAddress "10.0.0.5" `
  -PrefixLength 24 `
  -DefaultGateway "10.0.0.1"

# Add IPv6 address
New-NetIPAddress `
  -InterfaceIndex $ifIndex `
  -AddressFamily IPv6 `
  -IPAddress "2001:db8::5" `
  -PrefixLength 64

# Add IPv6 default route
New-NetRoute `
  -InterfaceIndex $ifIndex `
  -AddressFamily IPv6 `
  -DestinationPrefix "::/0" `
  -NextHop "2001:db8::1"

# Set DNS for both families
Set-DnsClientServerAddress `
  -InterfaceIndex $ifIndex `
  -ServerAddresses ("8.8.8.8", "8.8.4.4", "2001:4860:4860::8888")
```

## Configuring via GUI

```text
1. Control Panel → Network and Sharing Center → Change adapter settings
2. Right-click adapter → Properties
3. Configure both:
   - Internet Protocol Version 4 (TCP/IPv4)
   - Internet Protocol Version 6 (TCP/IPv6)
4. Set static addresses for each
```

## Verifying Dual-Stack

```powershell
# Verify both addresses are assigned
Get-NetIPAddress -InterfaceAlias "Ethernet" | Format-Table

# Test IPv4 connectivity
Test-NetConnection -ComputerName 8.8.8.8 -InformationLevel Detailed

# Test IPv6 connectivity
Test-NetConnection -ComputerName "2001:4860:4860::8888" -InformationLevel Detailed

# Ping with specific protocol
ping /4 8.8.8.8
ping /6 2001:4860:4860::8888

# Check DNS resolution
Resolve-DnsName google.com -Type A     # IPv4
Resolve-DnsName google.com -Type AAAA  # IPv6
```

## IPv6 Preference Setting

```powershell
# Windows prefers IPv6 by default when both are available
# To check preference policy:
netsh interface ipv6 show prefixpolicies

# To prefer IPv4 over IPv6 (not recommended long-term):
# Set the DisabledComponents registry value to 0x20 and restart the server.
New-Item -Path "HKLM:\SYSTEM\CurrentControlSet\Services\Tcpip6\Parameters" -Force | Out-Null
New-ItemProperty -Path "HKLM:\SYSTEM\CurrentControlSet\Services\Tcpip6\Parameters" `
  -Name "DisabledComponents" -PropertyType DWord -Value 0x20 -Force
```

## Firewall Configuration

```powershell
# Windows Firewall handles both protocols
# Allow ICMP for both families (useful for diagnostics):
New-NetFirewallRule -DisplayName "Allow ICMPv4" `
  -Protocol ICMPv4 -IcmpType Any -Action Allow -Direction Inbound

New-NetFirewallRule -DisplayName "Allow ICMPv6" `
  -Protocol ICMPv6 -IcmpType Any -Action Allow -Direction Inbound
```

## Conclusion

Windows Server dual-stack configuration requires assigning both IPv4 and IPv6 addresses to the same adapter. Use `New-NetIPAddress` for both address families. Windows prefers IPv6 by default when available, but applications still need separate IPv4/IPv6 listeners or a dual-stack socket configuration to accept connections on both protocols. Verify connectivity with `Test-NetConnection` for both IPv4 (-ComputerName with IPv4) and IPv6 (-ComputerName with IPv6) addresses.
