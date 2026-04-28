# How to Use netsh interface ipv6 Commands on Windows

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: IPv6, Window, Netsh, Network Configuration, Command Line

Description: A comprehensive reference for netsh interface ipv6 commands on Windows, covering viewing addresses, routes, DNS configuration, and advanced IPv6 settings.

## Basic netsh IPv6 Commands

```cmd
:: Show all IPv6 interface information
netsh interface ipv6 show interfaces

:: Show IPv6 addresses on all interfaces
netsh interface ipv6 show addresses

:: Show IPv6 addresses on a specific interface
netsh interface ipv6 show addresses "Ethernet"

:: Show IPv6 routes
netsh interface ipv6 show routes

:: Show DNS servers
netsh interface ipv6 show dnsservers
```

## Managing IPv6 Addresses

```cmd
:: Add a static IPv6 address
netsh interface ipv6 add address "Ethernet" 2001:db8::10/64

:: Add an address with lifetime
netsh interface ipv6 add address "Ethernet" 2001:db8::10/64 type=unicast

:: Delete a static IPv6 address
netsh interface ipv6 delete address "Ethernet" 2001:db8::10

:: Show all IPv6 addresses (including link-local)
netsh interface ipv6 show addresses level=verbose
```

## Managing IPv6 Routes

```cmd
:: Show all IPv6 routes
netsh interface ipv6 show routes

:: Add a default IPv6 route
netsh interface ipv6 add route ::/0 "Ethernet" 2001:db8::1

:: Add a specific route
netsh interface ipv6 add route 2001:db8:1::/48 "Ethernet" 2001:db8::1

:: Add a route with metric
netsh interface ipv6 add route ::/0 "Ethernet" 2001:db8::1 metric=10

:: Delete a route
netsh interface ipv6 delete route ::/0 "Ethernet"

:: Show routes with details
netsh interface ipv6 show routes level=verbose
```

## DNS Configuration

```cmd
:: Set primary IPv6 DNS server
netsh interface ipv6 add dnsserver "Ethernet" 2001:4860:4860::8888 index=1

:: Set secondary IPv6 DNS server
netsh interface ipv6 add dnsserver "Ethernet" 2001:4860:4860::8844 index=2

:: Set DNS to automatic
netsh interface ipv6 set dnsservers "Ethernet" source=dhcp

:: Delete a DNS server
netsh interface ipv6 delete dnsserver "Ethernet" 2001:4860:4860::8888

:: Show DNS servers for all interfaces
netsh interface ipv6 show dnsservers
```

## Interface-Level Settings

```cmd
:: Show interface details
netsh interface ipv6 show interface "Ethernet"

:: Enable/disable router discovery (RA processing)
netsh interface ipv6 set interface "Ethernet" routerdiscovery=enabled
netsh interface ipv6 set interface "Ethernet" routerdiscovery=disabled

:: Set interface forwarding
netsh interface ipv6 set interface "Ethernet" forwarding=enabled

:: Set interface MTU
netsh interface ipv6 set interface "Ethernet" mtu=1500
```

## Neighbor Cache (IPv6 ARP equivalent)

```cmd
:: Show neighbor cache
netsh interface ipv6 show neighbors

:: Show neighbors for a specific interface
netsh interface ipv6 show neighbors "Ethernet"

:: Delete neighbor cache entry
netsh interface ipv6 delete neighbors "Ethernet"
```

## IPv6 Global Settings

```cmd
:: Show global IPv6 configuration
netsh interface ipv6 show global

:: Set privacy extensions (temporary addresses)
netsh interface ipv6 set privacy state=enabled
netsh interface ipv6 set privacy state=disabled

:: Set random identifier for privacy
netsh interface ipv6 set global randomizeidentifiers=enabled

:: Show teredo/6to4/ISATAP status
netsh interface teredo show state
netsh interface 6to4 show state
netsh interface isatap show state
```

## Resetting IPv6 Configuration

```cmd
:: Reset entire IPv6 stack to defaults
netsh interface ipv6 reset

:: Note: This resets all IPv6 settings and requires restart
:: Use with caution in production environments
```

## Summary

`netsh interface ipv6` is the command-line tool for managing all IPv6 settings on Windows. Use `show addresses`, `show routes`, `show dnsservers` for viewing configuration, and `add`/`delete`/`set` subcommands for making changes. Key operations: add static addresses with `add address`, manage routes with `add route`/`delete route`, configure DNS with `add dnsserver`. Modern PowerShell cmdlets (`Get-NetIPAddress`, `New-NetIPAddress`) offer similar functionality with better scripting support.
