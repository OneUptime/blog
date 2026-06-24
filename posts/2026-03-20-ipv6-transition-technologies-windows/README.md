# How to Understand IPv6 Transition Technologies on Windows (Teredo, ISATAP, 6to4)

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: IPv6, Window, Teredo, ISATAP, 6to4, Transition Technologies

Description: An overview of the IPv6 transition technologies built into Windows - Teredo, ISATAP, and 6to4 - how they work, when they activate, and how to check their status.

## Overview of Windows IPv6 Transition Technologies

Windows includes three built-in IPv6-over-IPv4 tunnel mechanisms:

| Technology | Purpose | Scope |
|-----------|---------|-------|
| Teredo | IPv6 for hosts behind NAT via UDP/3544 | Global, through NAT |
| ISATAP | IPv4 enterprise network tunneling | Intranet, point-to-multipoint |
| 6to4 | IPv4 public address to IPv6 tunnel | Global, requires public IPv4 |

## Teredo

Teredo provides IPv6 connectivity for hosts behind IPv4 NAT using UDP port 3544:

```powershell
# Check Teredo state

netsh interface teredo show state

# Output:
# Type            : client
# Server Name     : teredo.ipv6.microsoft.com
# Client Refresh Interval : 30 seconds
# Client Port     : unspecified
# State           : dormant
# Error           : none

# Enable Teredo
netsh interface teredo set state type=default

# Disable Teredo
netsh interface teredo set state type=disabled
```

How Teredo works:
```text
Host (behind NAT) ←UDP/3544→ Teredo Server (setup/qualification)
Host (behind NAT) ←UDP/3544→ Teredo Relay ←→ IPv6 Internet
    IPv4: 192.168.1.5
    Teredo: 2001:0::/32 prefix
```

## ISATAP (Intra-Site Automatic Tunnel Addressing Protocol)

ISATAP tunnels IPv6 over IPv4 within an organization:

```powershell
# Check ISATAP state
netsh interface isatap show state

# Set ISATAP router name or IPv4 address
netsh interface isatap set router name=192.168.1.1

# Enable ISATAP
netsh interface isatap set state enabled

# Disable ISATAP
netsh interface isatap set state disabled

# View ISATAP interface
ipconfig /all | Select-String -Pattern "ISATAP|Tunnel"
```

ISATAP address format:
```text
Prefix: 2001:db8::/64
+ ISATAP interface ID: ::0:5efe:192.168.1.5
= 2001:db8::5efe:192.168.1.5
```

## 6to4

6to4 creates automatic tunnels using public IPv4 addresses (largely obsolete; RFC 7526 deprecated the anycast relay mechanism and recommends 6to4 be disabled by default):

```powershell
# Check 6to4 state
netsh interface 6to4 show state

# Enable 6to4 (not recommended, legacy use only)
netsh interface 6to4 set state enabled

# Disable 6to4
netsh interface 6to4 set state disabled

# Check 6to4 relay
netsh interface 6to4 show relay
```

## Direct Tunnels and IP-HTTPS

```powershell
# IP-HTTPS: IPv6 tunneled over HTTPS (used by DirectAccess)
netsh interface httpstunnel show interfaces

# View active IPv6 tunnel interfaces
Get-NetIPInterface -AddressFamily IPv6 | Where-Object {$_.InterfaceAlias -match "Teredo|ISATAP|6to4|iphttps"}
```

## Recommended: Disable Legacy Transition Technologies

On modern networks with native dual-stack, legacy tunnels can cause issues:

```powershell
# Disable all legacy IPv6 transition technologies
netsh interface teredo set state type=disabled
netsh interface 6to4 set state disabled
netsh interface isatap set state disabled

# Verify all disabled
netsh interface teredo show state
netsh interface 6to4 show state
netsh interface isatap show state
```

## Summary

Windows includes three IPv6 transition technologies: **Teredo** (IPv6 via UDP through NAT), **ISATAP** (enterprise intranet tunneling using IPv4 infrastructure), and **6to4** (legacy automatic tunneling via public IPv4). On networks with native IPv6, disable all three with `netsh interface teredo set state type=disabled`, `netsh interface 6to4 set state disabled`, and `netsh interface isatap set state disabled` to avoid unexpected tunnel traffic and potential security issues. Check status with `netsh interface <tech> show state`.
