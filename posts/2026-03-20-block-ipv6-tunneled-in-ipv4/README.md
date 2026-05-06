# How to Block IPv6 Tunneled in IPv4 When Not Deploying IPv6

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: IPv6, Security, Tunneling, Firewall, Ip6tables

Description: Learn how to detect and block IPv6-in-IPv4 tunneling mechanisms (6to4, Teredo, ISATAP, 6in4) to prevent unauthorized IPv6 traffic on IPv4-only networks.

## Overview

Even on networks that have not deployed IPv6, IPv6 traffic can flow through IPv4 infrastructure via tunneling mechanisms such as 6to4 (protocol 41), Teredo (UDP port 3544), ISATAP, 6rd, manual 6in4, and GRE. If these are not blocked, users or attackers can create unmonitored IPv6 channels that bypass IPv4 security controls.

## Tunneling Mechanisms to Block

| Mechanism | Transport | Identifier | RFC |
|-----------|-----------|------------|-----|
| 6in4 (manual) | IP protocol 41 | Any IPv4 pair | RFC 4213 |
| 6to4 | IP protocol 41 | 192.88.99.1 anycast relay | RFC 3056 (deprecated) |
| Teredo | UDP port 3544 | Teredo server (IPv4 address varies) | RFC 4380 |
| ISATAP | IP protocol 41 | ISATAP router / `isatap.<localdomain>` | RFC 5214 |
| 6rd | IP protocol 41 | ISP-specific relay | RFC 5969 |
| GRE | IP protocol 47 | Any IPv4 pair | RFC 2784 |

## Blocking Protocol 41 (IPv6-in-IPv4)

Protocol 41 is the most common carrier for IPv6 tunnels:

```bash
# iptables: Block all IPv6-in-IPv4 (protocol 41)

iptables -A INPUT   -p 41 -j DROP
iptables -A OUTPUT  -p 41 -j DROP
iptables -A FORWARD -p 41 -j DROP

# Save rules (Debian/Ubuntu with iptables-persistent)
iptables-save > /etc/iptables/rules.v4
```

### Target 6to4 Relay Anycast (192.88.99.0/24)

```bash
# Block traffic to/from the 6to4 relay anycast address
iptables -A INPUT   -s 192.88.99.0/24 -j DROP
iptables -A OUTPUT  -d 192.88.99.0/24 -j DROP
iptables -A FORWARD -s 192.88.99.0/24 -j DROP
iptables -A FORWARD -d 192.88.99.0/24 -j DROP
```

## Blocking Teredo (UDP Port 3544)

Teredo tunnels IPv6 over UDP, allowing IPv6 through NAT:

```bash
# iptables: Block Teredo
iptables -A INPUT   -p udp --dport 3544 -j DROP
iptables -A INPUT   -p udp --sport 3544 -j DROP
iptables -A OUTPUT  -p udp --dport 3544 -j DROP
iptables -A FORWARD -p udp --dport 3544 -j DROP
iptables -A FORWARD -p udp --sport 3544 -j DROP

# If you also block specific Teredo servers, block their current IPv4 addresses.
# iptables resolves hostnames only once when the rule is added.
```

## Blocking GRE (Protocol 47)

GRE can carry IPv6 tunnels:

```bash
# Block GRE protocol entirely if not needed
iptables -A INPUT   -p 47 -j DROP
iptables -A OUTPUT  -p 47 -j DROP
iptables -A FORWARD -p 47 -j DROP
```

## nftables Equivalent

```bash
# nftables: Block all IPv6 tunnel mechanisms
nft add table ip filter
nft 'add chain ip filter input { type filter hook input priority 0; policy accept; }'
nft 'add chain ip filter output { type filter hook output priority 0; policy accept; }'
nft 'add chain ip filter forward { type filter hook forward priority 0; policy accept; }'

# Block protocol 41 (6in4, 6to4, ISATAP, 6rd)
nft add rule ip filter input   ip protocol 41 drop
nft add rule ip filter output  ip protocol 41 drop
nft add rule ip filter forward ip protocol 41 drop

# Block Teredo (UDP 3544)
nft add rule ip filter input   udp dport 3544 drop
nft add rule ip filter input   udp sport 3544 drop
nft add rule ip filter output  udp dport 3544 drop
nft add rule ip filter forward udp dport 3544 drop
nft add rule ip filter forward udp sport 3544 drop

# Block GRE (protocol 47)
nft add rule ip filter input   ip protocol 47 drop
nft add rule ip filter output  ip protocol 47 drop
nft add rule ip filter forward ip protocol 47 drop
```

## Cisco IOS ACL

```text
! Cisco: Block IPv6 tunnel protocols
ip access-list extended BLOCK-IPV6-TUNNELS
  deny  41  any any        ! 6in4, 6to4, ISATAP (protocol 41)
  deny  47  any any        ! GRE tunnels
  deny  udp any any eq 3544 ! Teredo to server
  deny  udp any eq 3544 any ! Teredo from server
  deny  ip  any 192.88.99.0 0.0.0.255   ! 6to4 relay
  deny  ip  192.88.99.0 0.0.0.255 any   ! 6to4 relay
  permit ip any any

interface GigabitEthernet0/0
  ip access-group BLOCK-IPV6-TUNNELS in
  ip access-group BLOCK-IPV6-TUNNELS out
```

## Windows: Disable Teredo and ISATAP

On Windows endpoints, disable the built-in tunneling adapters:

```powershell
# Disable Teredo
netsh interface teredo set state disabled

# Disable ISATAP
netsh interface isatap set state disabled

# Disable 6to4
netsh interface 6to4 set state disabled

# Verify
netsh interface teredo show state
netsh interface isatap show state
```

```powershell
# PowerShell: Disable all tunnel adapters
Get-NetAdapter -IncludeHidden | Where-Object {$_.InterfaceDescription -like "*Teredo*" -or $_.InterfaceDescription -like "*ISATAP*" -or $_.InterfaceDescription -like "*6to4*"} | Disable-NetAdapter -Confirm:$false
```

## Detection: Finding Existing Tunnels

```bash
# Linux: Check for tunnel interfaces
ip link show type sit    # SIT (6in4)
ip link show type ip6tnl # IPv6-in-IPv6
ip link show type gre    # GRE
ip link show type gre6   # GRE over IPv6

# Check for Teredo traffic
tcpdump -i eth0 'udp port 3544'

# Check for protocol 41 traffic
tcpdump -i eth0 'ip[9] == 41'
```

## Network-Level Detection

```bash
# Wireshark/tshark: Find tunnel traffic
tshark -i eth0 -Y 'ip.proto == 41' -T fields -e ip.src -e ip.dst

# Check for attempted 6to4 relay traffic
tshark -i eth0 -Y 'ip.proto == 41 && ip.addr == 192.88.99.1' -T fields -e ip.src -e ip.dst
```

## Summary

IPv6 tunnels can silently carry IPv6 traffic through IPv4-only networks, bypassing IPv4-only security controls. Block protocol 41 (6in4/6to4/ISATAP), UDP port 3544 (Teredo), and GRE (protocol 47) at perimeter firewalls and host-level with iptables/nftables. On Windows endpoints, explicitly disable Teredo, ISATAP, and 6to4 with netsh commands. Audit regularly for unexpected tunnel interfaces with `ip link show type sit`.
