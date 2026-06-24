# How to Configure IPv6 MTU on Windows Interfaces

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: IPv6, MTU, Window, Network Configuration, Netsh

Description: Configure and verify IPv6 MTU settings on Windows network interfaces using netsh and PowerShell, understand MTU inheritance, and troubleshoot MTU-related issues.

## Introduction

Windows manages IPv6 MTU settings through the `netsh` command and PowerShell's `NetIPInterface` cmdlets. Unlike Linux where MTU is a single per-interface value, Windows tracks MTU separately for IPv4 and IPv6. The IPv6 network-layer MTU (`NlMtu`) defaults to the link's natural MTU unless you override it, which can be useful on interfaces used with VPNs or tunnels.

## Viewing Current MTU Settings

```powershell
# PowerShell: View MTU for all IPv6 interfaces

Get-NetIPInterface -AddressFamily IPv6 | Select-Object InterfaceAlias, NlMtu, ConnectionState

# View a specific interface
Get-NetIPInterface -InterfaceAlias "Ethernet" -AddressFamily IPv6

# View adapter properties including MTU
Get-NetAdapter | Select-Object Name, InterfaceDescription, InterfaceName, MtuSize

# Check MTU from the command line using netsh
netsh interface ipv6 show subinterfaces

# Detailed interface information
netsh interface ipv6 show interfaces interface="Ethernet" level=verbose

# Show all IPv6 interfaces and their MTU
netsh interface ipv6 show interfaces
```

## Setting IPv6 MTU on Windows

```powershell
# PowerShell: Set IPv6 MTU on an interface
Set-NetIPInterface -InterfaceAlias "Ethernet" -AddressFamily IPv6 -NlMtuBytes 1480

# Using netsh (works on older Windows versions too)
netsh interface ipv6 set subinterface interface="Ethernet" mtu=1480

# For a tunnel adapter
netsh interface ipv6 set subinterface interface="Teredo Tunneling Pseudo-Interface" mtu=1280

# Verify the change
Get-NetIPInterface -InterfaceAlias "Ethernet" -AddressFamily IPv6 | Select-Object NlMtu

# List interfaces by index (useful when alias names have spaces)
Get-NetIPInterface -AddressFamily IPv6 | Select-Object InterfaceIndex, InterfaceAlias, NlMtu

# Set by interface index
Set-NetIPInterface -InterfaceIndex 12 -AddressFamily IPv6 -NlMtuBytes 1480
```

## Checking MTU for PMTU Discovery

```powershell
# Check the PMTU cache (destination cache) in Windows
netsh interface ipv6 show destinationcache

# Show entries for a specific destination
netsh interface ipv6 show destinationcache | Where-Object { $_ -match "2001:db8" }

# Flush the destination (PMTU) cache
netsh interface ipv6 delete destinationcache

# Test connectivity with ping (Windows uses 'ping /6' rather than a separate ping6 command)
# Test with a large IPv6 payload (1452 = 1500 - 40 IPv6 - 8 ICMPv6)
ping /6 /l 1452 2001:db8::1
# /l = packet data size
```

## MTU for VPN and Tunnel Interfaces

```powershell
# WireGuard MTU configuration (set in WireGuard config file)
# Usually auto-detected; can be set in [Interface] section:
# MTU = 1420

# Check WireGuard interface MTU after connection
Get-NetIPInterface -InterfaceAlias "WireGuard Tunnel" -AddressFamily IPv6

# OpenVPN: Set MTU in the .ovpn config file
# tun-mtu 1500
# mssfix 1420

# For Windows built-in VPN (PPTP/L2TP/IKEv2):
# MTU is typically set automatically; override if needed:
$vpnAdapter = Get-NetAdapter -IncludeHidden | Where-Object { $_.InterfaceDescription -like "*WAN Miniport*" }
Set-NetIPInterface -InterfaceIndex $vpnAdapter.InterfaceIndex -AddressFamily IPv6 -NlMtuBytes 1280
```

## Scripted MTU Audit

```powershell
# Audit all IPv6 interfaces for proper MTU
$interfaces = Get-NetIPInterface -AddressFamily IPv6

foreach ($iface in $interfaces) {
    $status = if ($iface.NlMtu -ge 1280) { "OK" } else { "BROKEN (< 1280)" }
    $connected = if ($iface.ConnectionState -eq "Connected") { "Connected" } else { "Disconnected" }

    Write-Output ("{0,-40} MTU={1,-6} [{2}] {3}" -f `
        $iface.InterfaceAlias, `
        $iface.NlMtu, `
        $status, `
        $connected)
}
```

## Conclusion

Windows IPv6 MTU configuration uses either `Set-NetIPInterface` in PowerShell or `netsh interface ipv6 set subinterface` in the command prompt. Windows won't let you set an IPv6 MTU below 1280 bytes, which matches IPv6's minimum link MTU. When using VPNs or tunnels, calculate the overhead and reduce the interface MTU accordingly. The destination cache (`netsh interface ipv6 show destinationcache`) shows cached destination information for specific destinations.
