# How to Understand IPv6 Node Requirements (RFC 6434)

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: IPv6, RFC 6434, Compliance, Standard, Node Requirements, Networking

Description: Understand the IPv6 node requirements defined in RFC 6434, which specifies mandatory and recommended features that IPv6-capable devices must implement.

---

RFC 6434 ("IPv6 Node Requirements") defines a baseline set of IPv6 features for interoperability across IPv6 nodes (hosts and routers). RFC 6434 obsoleted RFC 4294 and was later obsoleted by RFC 8504, but it remains useful when reviewing older IPv6 compliance targets and deployment guidance.

## RFC 6434 Key Requirements Overview

```text
RFC 6434 (obsoletes RFC 4294) defines requirements for:
- IPv6 addressing
- ICMPv6 (RFC 4443)
- Neighbor Discovery (RFC 4861)
- Stateless Address Autoconfiguration - SLAAC (RFC 4862)
- Path MTU Discovery (RFC 1981, obsoleted by RFC 8201)
- IPv6 fragmentation and reassembly
- DNS support (RFC 3596 - AAAA records)
- Privacy Extensions (RFC 4941) - recommended
- Multicast Listener Discovery (MLDv1 - RFC 2710; MLDv2 or Lightweight MLDv2 recommended)
```

## Core IPv6 Addressing Requirements (MUST implement)

```bash
# RFC 6434 §5.9 - Addressing:

# - MUST support link-local addresses (FE80::/10)
# - MUST support loopback address (::1)
# - MUST support multicast addresses
# - MUST support unicast addresses

# Inspect IPv6 addressing on Linux
ip -6 addr show

# Link-local should always be present
ip -6 addr show | grep "fe80"

# Loopback should be present
ip -6 addr show lo | grep "::1"
```

## ICMPv6 Requirements (MUST implement)

```bash
# RFC 6434 requires ICMPv6 (RFC 4443)
# Nodes MUST support ICMPv6, including:
# - Echo Reply in response to Echo Request (types 128/129)
# - Neighbor Solicitation (type 135) / Advertisement (type 136)
# - Hosts: Router Solicitation (type 133); Routers: Router Advertisement (type 134)
# - Packet Too Big (type 2), which Path MTU Discovery relies on

# Test ICMPv6 echo
ping -6 ::1
ping -6 fe80::1%eth0

# Probe PMTU with a 1500-byte IPv6 packet
ping -6 -s 1452 -M do 2001:4860:4860::8888  # 1452-byte payload + 48-byte IPv6/ICMPv6 header = 1500 bytes

# Do NOT block ICMPv6 (unlike IPv4 ICMP, ICMPv6 is mandatory for IPv6)
# Simple rule that avoids breaking ICMPv6
sudo ip6tables -A INPUT -p ipv6-icmp -j ACCEPT
```

## Neighbor Discovery Requirements

```bash
# RFC 6434 §5.2 - Neighbor Discovery (RFC 4861) requirements include:
# - Hosts MUST support sending Router Solicitations and receiving Router Advertisements
# - All nodes MUST support sending and receiving Neighbor Solicitations/Advertisements
# - Duplicate Address Detection (DAD)
# - Address resolution (replaces ARP)

# Check Neighbor Discovery is working
ip -6 neigh show

# Verify DAD is running on new addresses
# (tentative state appears briefly)
ip -6 addr show | grep "tentative"

# Test NDP
ping -6 -c 1 fe80::1%eth0
ip -6 neigh show dev eth0
```

## Path MTU Discovery Requirements

```bash
# RFC 6434 says Path MTU Discovery (RFC 1981, obsoleted by RFC 8201) SHOULD be supported
# - Nodes implementing PMTU Discovery rely on ICMPv6 "Packet Too Big" messages
# - Nodes that do not implement PMTU Discovery must limit packets to the IPv6 minimum MTU (1280 bytes)

# Inspect the route selected for a destination
ip -6 route get 2001:4860:4860::8888

# Discover PMTU
tracepath -6 2001:4860:4860::8888

# Ensure PMTU ICMPv6 is not filtered
sudo ip6tables -A INPUT -p ipv6-icmp --icmpv6-type packet-too-big -j ACCEPT
sudo ip6tables -A OUTPUT -p ipv6-icmp --icmpv6-type packet-too-big -j ACCEPT
```

## DNS Requirements (RFC 6434)

```bash
# RFC 6434 says nodes that implement DNS resolution SHOULD support:
# - AAAA records
# - Reverse lookups in ip6.arpa using PTR records
# - EDNS(0) for DNS packet sizes larger than 512 bytes

# Test AAAA record resolution
dig AAAA ipv6.google.com +short
nslookup -type=AAAA google.com

# Test reverse DNS (PTR) for IPv6
dig -x 2001:4860:4860::8888 +short

# Inspect resolver configuration
cat /etc/resolv.conf
```

## Privacy Extensions (Recommended)

```bash
# RFC 6434 recommends RFC 4941 Privacy Extensions when tracking is a concern
# Generates temporary addresses to prevent tracking

# Check if privacy extensions are enabled
cat /proc/sys/net/ipv6/conf/eth0/use_tempaddr

# Enable privacy extensions
sudo sysctl -w net.ipv6.conf.all.use_tempaddr=2
sudo sysctl -w net.ipv6.conf.default.use_tempaddr=2

# Make permanent
echo "net.ipv6.conf.all.use_tempaddr=2" | sudo tee -a /etc/sysctl.conf
echo "net.ipv6.conf.default.use_tempaddr=2" | sudo tee -a /etc/sysctl.conf
```

## Compliance Checklist

```text
RFC 6434 Compliance Checklist:
[ ] Link-local address assigned on all IPv6 interfaces
[ ] Loopback address ::1 configured
[ ] ICMPv6 type 128/129 (Echo) enabled
[ ] Neighbor Discovery (NDP) operational
[ ] SLAAC working (if applicable)
[ ] DAD implemented and functional
[ ] Path MTU Discovery implemented, or packets limited to the IPv6 minimum MTU (1280 bytes)
[ ] Packet Too Big handling working
[ ] Stub resolver supports AAAA/PTR lookups and EDNS(0) (if the node resolves DNS)
[ ] MLDv1 supported for multicast reception; MLDv2 or Lightweight MLDv2 preferred
[ ] No blocking of mandatory ICMPv6 types
[ ] Privacy Extensions enabled when client privacy is a concern
```

RFC 6434 compliance ensures baseline interoperability across IPv6 networks, with the most common compliance gaps being firewall policies that block required ICMPv6 messages (particularly Packet Too Big for PMTU discovery) and missing DAD implementation on embedded systems.
