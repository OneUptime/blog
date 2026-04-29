# How to Identify Well-Known IPv6 Multicast Addresses

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: IPv6, Multicast, NDP, DHCPv6, Networking

Description: Identify and understand the well-known IPv6 multicast addresses used by routing protocols, NDP, DHCPv6, and other core IPv6 services.

## Introduction

IPv6 relies heavily on multicast for its core protocols. Unlike IPv4 where broadcast was common, IPv6 uses targeted multicast groups to ensure only relevant hosts process control messages. Knowing the well-known multicast addresses helps with troubleshooting, firewall configuration, and understanding protocol behavior.

## Complete Reference Table

| Address | Scope | Protocol | Purpose |
|---|---|---|---|
| ff01::1 | Interface-local | NDP | All nodes on the interface |
| ff01::2 | Interface-local | NDP | All routers on the interface |
| ff02::1 | Link-local | NDP | All nodes on the link |
| ff02::2 | Link-local | NDP/RA | All routers on the link |
| ff02::4 | Link-local | DVMRP | Distance Vector Multicast |
| ff02::5 | Link-local | OSPFv3 | All OSPFv3 routers |
| ff02::6 | Link-local | OSPFv3 | OSPFv3 DR/BDR routers |
| ff02::9 | Link-local | RIPng | All RIPng routers |
| ff02::a | Link-local | EIGRP | All EIGRP routers |
| ff02::d | Link-local | PIM | All PIM routers |
| ff02::16 | Link-local | MLD | All MLDv2-capable routers |
| ff02::1:2 | Link-local | DHCPv6 | All DHCP relay agents and servers |
| ff02::1:3 | Link-local | LLMNR | Link-local Multicast Name Resolution |
| ff02::1:ff00:0/104 | Link-local | NDP | Solicited-node multicast |
| ff05::1:3 | Site-local | DHCPv6 | All DHCP servers (site scope) |
| ff0e::101 | Global | NTP | Network Time Protocol |

## Key Groups Explained

### ff02::1 - All Nodes

Every IPv6 host on a link joins this group. Used by routers to send Router Advertisements to all hosts:

```bash
# Verify your host is a member of ff02::1

ip -6 maddr show dev eth0 | grep "ff02::1$"

# Send a ping to all nodes on the link
ping6 -I eth0 ff02::1
```

### ff02::2 - All Routers

Hosts send Router Solicitation messages to this address to discover routers:

```bash
# Listen for Router Advertisements sent by routers
sudo tcpdump -i eth0 -vv "icmp6 and ip6[40] == 134"

# Send an RS to request immediate RA
rdisc6 eth0  # Requires ndisc6 package
```

### ff02::1:ff00:0/104 - Solicited-Node Multicast

Each unicast address has a corresponding solicited-node multicast address used for address resolution (NDP equivalent of ARP):

```python
import ipaddress

def solicited_node_multicast(unicast):
    """Compute the solicited-node multicast address for a unicast address."""
    addr = ipaddress.IPv6Address(unicast)
    addr_int = int(addr)
    # Take the last 24 bits
    last_24 = addr_int & 0xFFFFFF
    # Combine with ff02::1:ff00:0 prefix
    sn_prefix = int(ipaddress.IPv6Address("ff02::1:ff00:0"))
    sn_addr = ipaddress.IPv6Address(sn_prefix | last_24)
    return sn_addr

print(solicited_node_multicast("2001:db8::1"))
# Output: ff02::1:ff00:1

print(solicited_node_multicast("2001:db8::1234:5678"))
# Output: ff02::1:ff34:5678
```

### ff02::1:2 - DHCPv6 All DHCP Relay Agents and Servers

DHCPv6 clients send Solicit messages to this address. Both servers and relay agents listen on it:

```bash
# Capture DHCPv6 client/server traffic
sudo tcpdump -i eth0 -vv "udp port 546 or udp port 547"

# DHCPv6 uses:
# UDP port 546 - client port
# UDP port 547 - server/relay port
```

## Monitoring Multicast Group Membership

```bash
# List all multicast groups on all interfaces
ip -6 maddr show

# Show group membership for a specific interface
ip -6 maddr show dev eth0

# Show detailed multicast address information
ip -d -6 maddr show dev eth0

# Check which groups are solicited-node groups
ip -6 maddr show | grep "ff02::1:ff"

# Inspect IPv6 UDP listeners that may receive multicast traffic
ss -u -6 -n -l
```

## Capturing Specific Multicast Traffic

```bash
# Capture all link-local multicast
sudo tcpdump -i eth0 "ip6 dst net ff02::/16"

# Capture Router Solicitation and Router Advertisement traffic
sudo tcpdump -i eth0 "icmp6 and (ip6[40] == 133 or ip6[40] == 134)"

# Capture DHCPv6 multicast traffic
sudo tcpdump -i eth0 "ip6 dst ff02::1:2 or ip6 dst ff05::1:3"

# Capture OSPFv3 hellos
sudo tcpdump -i eth0 "ip6 dst ff02::5 or ip6 dst ff02::6"
```

## Firewall Rules for Well-Known Multicast

```bash
# Allow essential NDP multicast (REQUIRED - do not block)
sudo ip6tables -A INPUT -d ff02::1 -p ipv6-icmp -j ACCEPT
sudo ip6tables -A INPUT -d ff02::2 -p ipv6-icmp -j ACCEPT
sudo ip6tables -A INPUT -d ff02::1:ff00:0/104 -p ipv6-icmp -j ACCEPT

# Allow DHCPv6 multicast to servers and relays (if using DHCPv6)
sudo ip6tables -A INPUT -d ff02::1:2 -p udp --dport 547 -j ACCEPT
sudo ip6tables -A INPUT -d ff05::1:3 -p udp --dport 547 -j ACCEPT

# Optionally allow OSPFv3 multicast
sudo ip6tables -A INPUT -d ff02::5 -p ospf -j ACCEPT  # All OSPFv3 routers
sudo ip6tables -A INPUT -d ff02::6 -p ospf -j ACCEPT  # OSPFv3 DR/BDR routers
```

## Conclusion

Well-known IPv6 multicast addresses are the backbone of IPv6 control plane communication. Blocking them indiscriminately in firewalls will break NDP, SLAAC, DHCPv6, and routing protocols. Every network engineer working with IPv6 should have these addresses memorized or readily available for troubleshooting network connectivity issues.
