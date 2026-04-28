# How to Understand DHCPv6 Guard

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: DHCPv6 Guard, IPv6 Security, NDP Security, First Hop Security, DHCPv6

Description: Understand how DHCPv6 Guard prevents rogue DHCPv6 servers from hijacking address assignment on IPv6 networks, and how it integrates with RA Guard for complete first-hop protection.

## Introduction

DHCPv6 Guard is a switch-level security feature that blocks DHCPv6 server messages (ADVERTISE, REPLY, RECONFIGURE) on host-facing ports. Without DHCPv6 Guard, any host on the segment can run a rogue DHCPv6 server and hand out arbitrary addresses, DNS servers, or other configuration options. DHCPv6 Guard works alongside RA Guard to protect both the stateless (RA-based) and stateful (DHCPv6-based) address assignment paths.

## The Rogue DHCPv6 Server Problem

A rogue DHCPv6 server can assign malicious configuration to all hosts that request addresses.

```text
Rogue DHCPv6 Attack Scenario:

Legitimate DHCPv6 Server:
  [SOLICIT] → Host asks for address
  [ADVERTISE] ← Server offers 2001:db8::100/64, DNS=8.8.8.8
  [REQUEST] → Host requests the offered address
  [REPLY] ← Server confirms: address assigned

Rogue DHCPv6 Server (same link):
  [SOLICIT] → Host asks for address
  [ADVERTISE] ← Rogue offers 2001:db8::100/64, DNS=attacker's_DNS
  [REQUEST] → Host may accept rogue's offer first
  [REPLY] ← Rogue assigns: address + DNS=192.0.2.1 (attacker)

Result:
  - Host uses attacker-controlled DNS server
  - All DNS queries go to attacker
  - Perfect position for MITM or surveillance
  - Also possible: assign wrong default gateway or wrong addresses
```

## DHCPv6 Message Types Affected

DHCPv6 Guard targets the server-to-client direction messages.

```text
DHCPv6 Message Flow:

Client-to-Server (allowed on all ports):
  Type 1: SOLICIT       ← Client asks for server
  Type 3: REQUEST       ← Client requests specific address
  Type 4: CONFIRM       ← Client confirms address after move
  Type 5: RENEW         ← Client renews lease
  Type 6: REBIND        ← Client rebinds (renew failed)
  Type 8: RELEASE       ← Client releases address
  Type 9: DECLINE       ← Client declines address (DAD failed)
  Type 11: INFORMATION-REQUEST ← Client asks for config only

Server-to-Client (BLOCKED by DHCPv6 Guard on host ports):
  Type 2: ADVERTISE     ← Server responds to SOLICIT
  Type 7: REPLY         ← Server responds to REQUEST/RENEW/etc.
  Type 10: RECONFIGURE  ← Server asks client to re-request

DHCPv6 Guard drops Types 2, 7, 10 on untrusted ports.
Only the legitimate server port can send these messages.
```

## DHCPv6 Guard vs RA Guard Interaction

DHCPv6 Guard and RA Guard address different aspects of IPv6 configuration.

```text
M=0, O=0 (SLAAC only):
  RA provides prefix + gateway ← protected by RA Guard
  No DHCPv6 server needed

M=1 (Stateful DHCPv6):
  RA provides gateway only ← protected by RA Guard
  DHCPv6 provides addresses ← protected by DHCPv6 Guard

M=0, O=1 (Stateless DHCPv6):
  RA provides prefix + addresses ← protected by RA Guard
  DHCPv6 provides DNS/options ← protected by DHCPv6 Guard

Deploy both RA Guard AND DHCPv6 Guard for complete protection.
```

## How DHCPv6 Guard Classifies Ports

```text
Port Classification:

Trusted Port (DHCPv6 server port):
  - Connected to legitimate DHCPv6 server
  - DHCPv6 ADVERTISE/REPLY/RECONFIGURE allowed through
  - Typically the uplink or server port

Untrusted Port (client/host port):
  - Connected to hosts, desktops, VMs
  - DHCPv6 ADVERTISE/REPLY/RECONFIGURE DROPPED
  - DHCPv6 SOLICIT/REQUEST (client messages) still allowed
  - Host can still request addresses; rogue server responses blocked

Port State vs Role:
  All access ports → untrusted (default)
  Server/uplink port → trusted (explicitly configured)
```

## Relay Agent Interaction

DHCPv6 Guard must handle relay agents correctly in larger networks.

```text
DHCPv6 Relay Scenario:

[DHCPv6 Client] → [Access Switch] → [DHCPv6 Relay Agent] → [DHCPv6 Server]

The relay agent converts client messages to RELAY-FORW (Type 12)
and server responses to RELAY-REPL (Type 13).

DHCPv6 Guard with relays:
  - Client port: block Types 2, 7, 10 (server messages)
  - Relay/uplink port: must be trusted (allows Types 2, 7, 10, 12, 13)
  - The relay agent's port is trusted; it forwards server responses to clients

Configuration:
  - Mark relay agent's port as trusted
  - Mark all client ports as untrusted
  - Relay agent converts server responses; clients receive them through relay
```

## Deployment on Linux (iptables approach)

For Linux-based environments without managed switches, ip6tables can approximate DHCPv6 Guard.

```bash
# On a Linux host: block DHCPv6 server messages from untrusted direction

# DHCPv6 uses UDP port 546 (client) and 547 (server)

# Allow DHCPv6 client messages (outbound to server, port 547)
sudo ip6tables -A OUTPUT -p udp --dport 547 -j ACCEPT

# Allow DHCPv6 server replies to our client (inbound, port 546)
# Only from the legitimate DHCPv6 server MAC address
sudo ip6tables -A INPUT -p udp --dport 546 \
    -m mac --mac-source 00:11:22:33:44:55 -j ACCEPT

# Block DHCPv6 server messages from unknown sources
# (Types 2=ADVERTISE, 7=REPLY, 10=RECONFIGURE)
sudo ip6tables -A INPUT -p udp --dport 546 -j DROP

# This is a host-level approximation; switch-level DHCPv6 Guard
# is preferred as it protects the entire segment.
```

## What DHCPv6 Guard Does Not Protect

```text
DHCPv6 Guard Limitations:

1. Does NOT protect against rogue RAs:
   An attacker can still send rogue Router Advertisements.
   Mitigation: Deploy RA Guard alongside DHCPv6 Guard.

2. Does NOT validate address content:
   Basic DHCPv6 Guard blocks server messages on host ports
   but does not verify that the legitimate server is
   assigning correct addresses.
   Enhanced: Use binding table validation (IPv6 Source Guard).

3. Does NOT protect against client flooding:
   Attackers can send many SOLICIT messages (DHCPv6 starvation).
   Mitigation: Rate limit DHCPv6 client messages per port.

4. Bypassed by IPv4 DHCPv4:
   DHCPv6 Guard only protects IPv6 DHCPv6.
   For dual-stack: also deploy DHCP snooping for IPv4.
```

## Conclusion

DHCPv6 Guard prevents rogue DHCPv6 servers from hijacking IPv6 address assignment and configuration options like DNS servers. It works by blocking DHCPv6 server response messages (ADVERTISE, REPLY, RECONFIGURE) on host-facing ports and allowing them only on designated trusted ports. Deploy DHCPv6 Guard together with RA Guard on all managed switches to protect both SLAAC and stateful DHCPv6 assignment paths. The combination of RA Guard, DHCPv6 Guard, and IPv6 Source Guard provides comprehensive IPv6 first-hop security.
