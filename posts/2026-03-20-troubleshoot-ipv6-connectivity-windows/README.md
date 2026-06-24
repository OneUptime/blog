# How to Troubleshoot IPv6 Connectivity on Windows

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: IPv6, Window, Troubleshooting, Network Diagnostics, PowerShell

Description: A systematic guide to diagnosing and resolving IPv6 connectivity problems on Windows, covering address assignment issues, routing problems, DNS failures, and firewall blocks.

## Step 1: Verify IPv6 is Enabled

```powershell
# Check if IPv6 binding is enabled on adapters

Get-NetAdapterBinding -ComponentID ms_tcpip6 | Select-Object Name, Enabled

# Check registry for DisabledComponents
(Get-ItemProperty "HKLM:\SYSTEM\CurrentControlSet\Services\Tcpip6\Parameters" `
    -Name DisabledComponents -ErrorAction SilentlyContinue).DisabledComponents
# Should be 0 or not exist

# View IPv6 addresses
Get-NetIPAddress -AddressFamily IPv6
```

## Step 2: Check Address Assignment

```powershell
# Show all IPv6 addresses
ipconfig /all | Select-String "IPv6"

# Check for non-link-local IPv6 address (global unicast 2000::/3 or ULA fc00::/7)
Get-NetIPAddress -AddressFamily IPv6 |
    Where-Object {$_.IPAddress -notlike "fe80*" -and $_.IPAddress -ne "::1"}

# If only link-local (fe80::) addresses exist:
# - No RA received (SLAAC not working)
# - No DHCPv6 server
# - Check if router is configured for IPv6
```

## Step 3: Test Basic Connectivity

```cmd
:: Test loopback
ping -6 ::1

:: Test link-local gateway (get gateway address from ipconfig /all)
ping -6 fe80::1%12

:: Test global IPv6 connectivity
ping -6 2001:4860:4860::8888

:: Test with hostname (tests DNS too)
ping -6 ipv6.google.com
```

## Step 4: Check Routing

```powershell
# Check for default IPv6 route
Get-NetRoute -AddressFamily IPv6 -DestinationPrefix "::/0"

# If no default route, add one manually (replace fe80::1 with your router's IPv6 next hop)
New-NetRoute -InterfaceAlias "Ethernet" `
    -DestinationPrefix "::/0" `
    -NextHop "fe80::1"

# Find route for a specific destination
Find-NetRoute -RemoteIPAddress "2001:4860:4860::8888"
```

## Step 5: Test DNS Resolution

```powershell
# Test IPv6 DNS resolution
Resolve-DnsName -Name "ipv6.google.com" -Type AAAA

# Test with specific DNS server
Resolve-DnsName -Name "google.com" -Server "2001:4860:4860::8888" -Type AAAA

# Check DNS server configuration
Get-DnsClientServerAddress -AddressFamily IPv6

# Flush DNS cache
Clear-DnsClientCache
```

## Step 6: Check Firewall

```powershell
# Check if firewall is blocking IPv6
Get-NetFirewallProfile | Select-Object Name, Enabled

# Check for blocking rules
Get-NetFirewallRule -Direction Inbound -Action Block -Enabled True |
    Get-NetFirewallAddressFilter |
    Where-Object {$_.RemoteAddress -like "*:*"}

# Temporarily disable firewall for testing (not for production!)
Set-NetFirewallProfile -All -Enabled False
ping -6 2001:4860:4860::8888
Set-NetFirewallProfile -All -Enabled True
```

## Step 7: Path Diagnostics

```cmd
:: Traceroute over IPv6
tracert -6 2001:4860:4860::8888

:: PathPing (combines ping and traceroute)
pathping -6 ipv6.google.com

:: Test-NetConnection with port
```

```powershell
Test-NetConnection -ComputerName "2001:4860:4860::8888" -Port 53 -InformationLevel Detailed
```

## Common Issues and Fixes

```powershell
# Issue: Only link-local address (no global)
# Fix: Check if RA is being sent by router
# Verify: netsh interface ipv6 show interfaces

# Issue: IPv6 connectivity but DNS fails
# Fix: Add IPv6 DNS server
Set-DnsClientServerAddress -InterfaceAlias "Ethernet" `
    -ServerAddresses "2001:4860:4860::8888", "2001:4860:4860::8844"

# Issue: Connection uses IPv4 instead of IPv6
# Check prefix policy
netsh interface ipv6 show prefixpolicies

# Issue: IPv6 address present but no connectivity
# Reset IPv6 stack
netsh interface ipv6 reset
netsh winsock reset
# Requires restart
```

## Summary

Troubleshoot Windows IPv6 connectivity in layers: (1) verify IPv6 enabled via `Get-NetAdapterBinding`, (2) check for a non-link-local address with `ipconfig /all`, (3) test ping to `2001:4860:4860::8888`, (4) verify default route with `Get-NetRoute -DestinationPrefix "::/0"`, (5) test DNS with `Resolve-DnsName`, (6) check firewall rules. Reset the IPv6 stack with `netsh interface ipv6 reset` as a last resort.
