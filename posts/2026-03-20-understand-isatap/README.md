# How to Understand ISATAP

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: IPv6, ISATAP, Tunneling, Enterprise, RFC 5214

Description: Learn how ISATAP (Intra-Site Automatic Tunnel Addressing Protocol) works, how it was used for enterprise IPv6 deployment over IPv4 LANs, and why it is deprecated.

## Overview

ISATAP (Intra-Site Automatic Tunnel Addressing Protocol, RFC 5214) was designed to allow IPv6 hosts to communicate over IPv4 intranets without requiring IPv6-capable switches or routers. It creates an IPv6 overlay on an IPv4 LAN by embedding the host's IPv4 address in its IPv6 link-local address. ISATAP was deployed in enterprise environments during 2005-2015. It is considered legacy today - disabled by default on modern Windows and largely unused on Linux, though the underlying code still ships in both.

## How ISATAP Works

ISATAP creates a virtual link where each node's IPv6 address encodes its IPv4 address:

```text
IPv4 address: 192.0.2.10 = c000:020a (hex)

ISATAP link-local: fe80::0:5efe:c000:020a
                   ┌─────────────────────────────────────────┐
                   │ fe80  :: 0:5efe:  c000:020a             │
                   │       │  └─ ISATAP marker               │
                   │       └─ zeros                          │
                   └─────────────────────────────────────────┘

ISATAP global address (with prefix 2001:db8::/64):
  2001:db8::0:5efe:c000:020a
```

The `0:5efe:` is the ISATAP identifier - any ISATAP address contains this marker. Per RFC 5214 Section 6.1, the leading byte is `02` (u-bit set) when the embedded IPv4 address is globally unique and `00` when it is not, so globally unique IPv4 addresses produce `200:5efe:<ipv4>` IIDs.

## Architecture

```text
[ISATAP Host A]         [ISATAP Router]        [ISATAP Host B]
IPv4: 192.0.2.10        IPv4: 192.0.2.1         IPv4: 192.0.2.20
IPv6: ::5efe:c000:020a  IPv6: 2001:db8::1       IPv6: ::5efe:c000:0214

IPv4 LAN (no IPv6 switches needed)
──────────────────────────────────────

Host A wants to send IPv6 to Host B:
1. Host A queries ISATAP router for prefix via RA
2. Router sends RA with 2001:db8::/64 prefix
3. Host A auto-configures 2001:db8::5efe:c000:020a
4. Host A sends IPv6 packet to Host B, encapsulated in IPv4 (proto 41)
   IPv4 dest = extract IPv4 from Host B's IPv6 addr = 192.0.2.20
5. Host B receives proto 41 packet, decapsulates IPv6
```

## ISATAP Router Configuration (Windows)

On Windows Server acting as ISATAP router:

```powershell
# Enable ISATAP routing

Set-NetIsatapConfiguration -State Enabled -Router "192.0.2.1"

# Install routing role
Install-WindowsFeature Routing -IncludeManagementTools

# Configure ISATAP interface
netsh interface isatap set state enabled
netsh interface isatap set router 192.0.2.1

# Assign global IPv6 prefix
New-NetIPAddress -InterfaceAlias "isatap.{GUID}" `
    -IPAddress "2001:db8::5efe:192.0.2.1" `
    -PrefixLength 64

# Advertise prefix to ISATAP clients
Set-NetIPInterface -InterfaceAlias "isatap.{GUID}" -AdvertiseDefaultRoute Enabled
```

## ISATAP Client Configuration (Windows)

```cmd
:: Enable ISATAP
netsh interface isatap set state enabled

:: Set ISATAP router (normally auto-discovered via DNS)
netsh interface isatap set router isatap.example.com
:: or by IP:
netsh interface isatap set router 192.0.2.1

:: Verify ISATAP address
ipconfig | findstr "5efe"
:: Should show: fe80::5efe:192.168.1.10%18  (ISATAP link-local)
:: And possibly: 2001:db8::5efe:192.168.1.10 (global)
```

## Auto-Discovery via DNS

ISATAP clients query DNS for `isatap.<domain>` to find the router:

```bash
# DNS record for ISATAP router auto-discovery
isatap.example.com.  IN  A  192.0.2.1

# Client resolves "isatap" hostname in its domain
# Uses the IPv4 address as the ISATAP router
```

## Why ISATAP Is Deprecated

### 1. Address Predictability Risk

ISATAP embeds IPv4 addresses in IPv6 addresses. An attacker who knows the IPv4 addressing scheme can predict all ISATAP IPv6 addresses:

```text
IPv4 range: 10.0.0.0/24 → ISATAP range: ::5efe:0a00:0000/120
All 256 ISATAP addresses are predictable → trivial to scan
```

### 2. Modern Networks Don't Need It

Modern Layer 2 switches handle IPv6 natively. There is no longer a reason to overlay IPv6 on IPv4 within a LAN - just configure native dual-stack.

### 3. Removal from OS

- Windows Server 2022 / 2025: ISATAP disabled by default (cmdlets still ship in the `NetworkTransition` module)
- Windows 11: ISATAP disabled by default
- Linux: `sit` module still supports ISATAP mode (`ip tunnel ... mode sit` with ISATAP semantics) but it's not recommended for new deployments
- RFC 7059 surveys ISATAP alongside other IPv6-over-IPv4 tunnel mechanisms as a transitional technique

## Disable ISATAP

```powershell
# Windows
Set-NetIsatapConfiguration -State Disabled

# Verify
Get-NetIsatapConfiguration | Select-Object State
# State: Disabled
```

```cmd
netsh interface isatap set state disabled
```

## Detect ISATAP Addresses on the Network

```bash
# Linux - look for 5efe in addresses
ip addr show | grep "5efe"

# Network scan for ISATAP (identify hosts embedding IPv4 in IPv6)
# 5efe = 0x5efe = embedded IPv4 marker
ip -6 neighbor | grep "5efe"

# In Wireshark: display filter
# ipv6.src contains 00:00:5e:fe or ipv6.dst contains 00:00:5e:fe
```

## Summary

ISATAP embedded IPv4 addresses in IPv6 link-local and global addresses using the `0:5efe:` marker, allowing IPv6 communication over IPv4 intranets without IPv6-capable infrastructure. It was useful from 2005-2015 for enterprise IPv6 transition but is now deprecated. Key weaknesses: addresses are predictable from IPv4 (enabling scanning), and modern networks don't need it since Layer 2 supports IPv6 natively. Disable ISATAP with `Set-NetIsatapConfiguration -State Disabled` on Windows and verify with `Get-NetIsatapConfiguration`.
