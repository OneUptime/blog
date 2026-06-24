# How to Understand DHCPv6 Multicast Addresses (ff02::1:2, ff05::1:3)

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: DHCPv6, IPv6, Multicast, Networking, RFC 8415

Description: Understand the roles of the two DHCPv6 multicast addresses - ff02::1:2 (link-scoped) and ff05::1:3 (site-scoped) - and when each is used.

## Overview

DHCPv6 clients and relay agents use well-known multicast addresses to reach servers without needing to know the server's unicast address in advance. There are two key multicast addresses defined in RFC 9915, which obsoletes RFC 8415.

## The Two DHCPv6 Multicast Addresses

| Address | Name | Scope | Used By |
|---------|------|-------|---------|
| `ff02::1:2` | All_DHCP_Relay_Agents_and_Servers | Link-local | Clients sending DHCPv6 messages to on-link servers and relay agents |
| `ff05::1:3` | All_DHCP_Servers | Site-local | Relay agents forwarding messages to servers beyond the local link |

## ff02::1:2 - Link-Local Scope

The address `ff02::1:2` is the most commonly used DHCPv6 multicast address. A DHCPv6 client sends its messages to this address because it is reachable on the local link without any routing, and all servers and relay agents on the link listen on it.

```bash
# On a host running a DHCPv6 server or relay agent, verify the interface
# has joined the DHCPv6 multicast group

ip -6 maddr show dev eth0

# You should see a line similar to:
# inet6 ff02::1:2
```

The `ff02` prefix means **link-local scope** - the packet never crosses a router. This is why a relay agent is needed when the DHCPv6 server is on a different subnet. Clients send to this group, but they are not required to join it.

## ff05::1:3 - Site-Local Scope

The address `ff05::1:3` is used by **relay agents** when they need to forward a client's message to all DHCPv6 servers within a site. This address has site-local scope, meaning it can cross routers within an organization's network.

```mermaid
graph LR
    Client -->|ff02::1:2| RelayAgent
    RelayAgent -->|ff05::1:3 or unicast| DHCPv6_Server
```

RFC 9915 recommends that relay agents be configured with a destination list that includes unicast addresses, so many deployments forward to a specific unicast server address rather than using `ff05::1:3`.

## Relay Agent Configuration Example

On a Cisco router acting as a DHCPv6 relay:

```text
! Configure DHCPv6 relay on the client-facing interface
interface GigabitEthernet0/0
  ipv6 dhcp relay destination 2001:db8::1
```

This sends the relayed Relay-Forward message to the server's unicast address rather than `ff05::1:3`.

On Linux using `dhcrelay` from ISC DHCP:

```bash
# Relay DHCPv6 messages received on eth0 to the server at 2001:db8::1
# via interface eth1
dhcrelay -6 -l eth0 -u 2001:db8::1%eth1
```

## Firewall Considerations

When deploying ip6tables or nftables, you must allow traffic to and from these multicast addresses, or DHCPv6 will silently fail.

```bash
# ip6tables: Allow DHCPv6 client traffic to the link-local multicast address
ip6tables -A OUTPUT -p udp --dport 547 -d ff02::1:2 -j ACCEPT
ip6tables -A INPUT  -p udp --sport 547 --dport 546 -j ACCEPT

# ip6tables: Allow a relay agent or server to receive client multicasts
ip6tables -A INPUT -p udp --dport 547 -d ff02::1:2 -j ACCEPT
```

## Verifying Multicast Group Membership

```bash
# Check all IPv6 multicast groups joined on the system
ip -6 maddr show

# Filter for DHCPv6 groups specifically
ip -6 maddr show | grep "ff02::1:2\|ff05::1:3"
```

On a system running a DHCPv6 server or relay agent, `ff02::1:2` should be listed. A client host is not required to show `ff02::1:2`, because clients send to that group but do not have to join it.

## Summary

DHCPv6 uses `ff02::1:2` for link-local client-to-server communication and `ff05::1:3` for relay agent forwarding within a site. Understanding these addresses is essential for configuring firewalls, relay agents, and multicast routing in IPv6 networks.
