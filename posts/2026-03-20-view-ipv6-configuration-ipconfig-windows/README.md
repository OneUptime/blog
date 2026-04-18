# How to View IPv6 Configuration with ipconfig on Windows

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: IPv6, Window, Ipconfig, Network Diagnostics, Command Line

Description: Learn how to use ipconfig to view IPv6 address configuration on Windows, interpret the output, and compare it with PowerShell alternatives.

## Basic ipconfig Commands

```cmd
:: Show basic IP configuration (includes IPv6 link-local)
ipconfig

:: Show detailed IPv6 information for all adapters
ipconfig /all

:: Release and renew DHCPv6 address
ipconfig /release6
ipconfig /renew6

:: Flush DNS cache
ipconfig /flushdns
```

## Understanding ipconfig /all Output for IPv6

```text
Ethernet adapter Ethernet:

   Connection-specific DNS Suffix  . : example.com
   Description . . . . . . . . . . . : Intel(R) Ethernet Connection
   Physical Address. . . . . . . . . : 00-11-22-33-44-55
   DHCP Enabled. . . . . . . . . . . : No
   Autoconfiguration Enabled . . . . : Yes
   IPv6 Address. . . . . . . . . . . : 2001:db8::10(Preferred)
   Temporary IPv6 Address. . . . . . : 2001:db8::a1b2:c3d4(Preferred)
   Link-local IPv6 Address . . . . . : fe80::1234:5678%12(Preferred)
   IPv4 Address. . . . . . . . . . . : 192.168.1.10
   Subnet Mask . . . . . . . . . . . : 255.255.255.0
   Default Gateway . . . . . . . . . : fe80::1%12
                                       192.168.1.1
   DNS Servers . . . . . . . . . . . : 2001:4860:4860::8888
                                       8.8.8.8
```

Key IPv6 fields explained:
- **IPv6 Address**: Global unicast, static or DHCPv6 assigned
- **Temporary IPv6 Address**: Privacy extension address (RFC 4941)
- **Link-local IPv6 Address**: `fe80::` address with `%12` zone ID (interface index)
- **Default Gateway**: Often shown as link-local address with zone ID

## Reading Zone IDs

```cmd
:: Zone IDs (the %12 or %eth0 part) identify the interface
:: for link-local addresses

:: fe80::1234:5678%12 means:
::   fe80::1234:5678 on interface index 12

:: Find interface index to name mapping
netsh interface ipv6 show interfaces

:: Or in PowerShell:
Get-NetAdapter | Select-Object Name, InterfaceIndex
```

## PowerShell Equivalent (More Detail)

```powershell
# Basic equivalent of ipconfig

Get-NetIPConfiguration

# Detailed equivalent of ipconfig /all
Get-NetIPConfiguration -Detailed

# Show only IPv6 addresses
Get-NetIPAddress -AddressFamily IPv6

# Show IPv6 addresses with full detail
Get-NetIPAddress -AddressFamily IPv6 | Format-List *

# Show IPv6 default gateway
Get-NetIPConfiguration | Select-Object -ExpandProperty IPv6DefaultGateway

# Show DNS servers (IPv6 and IPv4)
Get-DnsClientServerAddress
```

## Filtering IPv6 Address Types

```powershell
# Show only global (routable) IPv6 addresses
Get-NetIPAddress -AddressFamily IPv6 |
    Where-Object {$_.IPAddress -notlike "fe80*" -and $_.IPAddress -ne "::1"}

# Show only link-local addresses
Get-NetIPAddress -AddressFamily IPv6 |
    Where-Object {$_.IPAddress -like "fe80*"}

# Show temporary addresses
Get-NetIPAddress -AddressFamily IPv6 |
    Where-Object {$_.SuffixOrigin -eq "Random"}

# Show only preferred addresses
Get-NetIPAddress -AddressFamily IPv6 |
    Where-Object {$_.AddressState -eq "Preferred"}
```

## Troubleshooting with ipconfig

```cmd
:: If no IPv6 address shown (only link-local):
:: - Check if IPv6 is enabled on the adapter
:: - Verify router is sending RAs (for SLAAC)
:: - Check if DHCPv6 is available

:: Check for IPv6 address assignment issues
ipconfig /all | findstr "IPv6"

:: Release and renew the DHCPv6 lease
:: (Note: SLAAC addresses are not managed by these commands)
ipconfig /release6
ipconfig /renew6
```

## Summary

Use `ipconfig /all` to view all IPv6 configuration including global addresses, temporary (privacy) addresses, link-local addresses (with zone IDs), and DNS servers. The `%N` suffix on link-local addresses is the interface index, not a port number. For scripting and more detailed output, use PowerShell `Get-NetIPAddress -AddressFamily IPv6` and `Get-NetIPConfiguration`. Use `ipconfig /release6` and `/renew6` to release and re-acquire a DHCPv6 lease (these commands do not affect SLAAC-derived addresses).
