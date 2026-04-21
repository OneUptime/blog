# How to Test IPv6 Compliance of Network Equipment

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: IPv6, Compliance Testing, Network Equipment, Router, Switch, Interoperability

Description: Test network equipment (routers, switches, firewalls) for IPv6 protocol compliance, including conformance tests, interoperability checks, and performance verification.

---

Testing network equipment for IPv6 compliance involves verifying correct implementation of IPv6 RFCs, interoperability with other vendors, and IPv6 forwarding performance against IPv4 baselines. This ensures equipment will operate correctly in production IPv6 deployments.

## IPv6 Compliance Testing Categories

```text
Testing Categories:
1. Conformance Testing - Does the device follow RFC specifications exactly?
2. Interoperability Testing - Does it work with other vendors' devices?
3. Performance Testing - Is IPv6 forwarding speed comparable to IPv4 and within expected platform limits?
4. Security Testing - Does it handle malformed IPv6 properly?
5. Feature Testing - Does it implement all required IPv6 features?
```

## Basic IPv6 Functionality Tests

```bash
# Test 1: IPv6 address configuration

# Verify router accepts and processes IPv6 addresses

# On Cisco IOS
show ipv6 interface brief
show ipv6 interface

# On Juniper JunOS
show interfaces terse | grep inet6

# On Linux router
ip -6 addr show
```

```bash
# Test 2: ICMPv6 Echo (RFC 4443)
ping6 -c 10 2001:db8::1
ping6 -c 10 -s 1400 2001:db8::1  # Test large packet handling

# Test 3: Neighbor Discovery (RFC 4861)
# Verify neighbor discovery works
sudo ndisc6 2001:db8::2 eth0

# Check NDP table after discovery
ip -6 neigh show | grep "2001:db8::2"
```

## IPv6 Routing Tests

```bash
# Test OSPFv3 (Cisco)
show ipv6 ospf neighbor
show ipv6 ospf database
show ipv6 route ospf

# Test BGP4+ with IPv6
show bgp ipv6 unicast summary
show bgp ipv6 unicast
show ipv6 route bgp

# Test route advertisement
# Device should advertise and receive IPv6 prefixes
# Verify in route table:
show ipv6 route
```

## Path MTU Discovery Testing

```bash
# Critical compliance test: PMTU Discovery (RFC 8201)

# Set up test environment
# Host A: 2001:db8::10
# Router: MTU set to 1280 (IPv6 minimum) on one link

# Test 1: Large packet is dropped and Packet Too Big is sent
ping6 -s 1500 -M do 2001:db8::20

# Expected: Receive ICMPv6 Packet Too Big (type 2)
# Device must generate and forward these messages

# Test 2: PMTU cache is maintained
tracepath -6 2001:db8::20

# Test 3: Check for PMTU black holes caused by blocked Packet Too Big messages
# RFC 8201 notes that filtering Packet Too Big prevents the source from learning PMTU
sudo tcpdump -i eth0 -nn "icmp6 and ip6[40] == 2"
```

## Extension Header Processing Tests

```bash
# Test routing header handling
# RFC 5095: RH0 with non-zero Segments Left MUST be discarded

# Send packet with RH0 and non-zero Segments Left (should be discarded)
# Using scapy:
python3 << 'EOF'
from scapy.all import *
pkt = IPv6(dst="2001:db8::30") / \
      IPv6ExtHdrRouting(type=0, segleft=1, addresses=["2001:db8::31"]) / \
      ICMPv6EchoRequest()
send(pkt)
EOF

# Device should discard this packet and send ICMPv6 Parameter Problem

# Test hop-by-hop options handling
# Device should process or forward correctly
```

## IPv6 Multicast Tests

```bash
# Test MLD (Multicast Listener Discovery)
# RFC 8504: MLDv2 support is required for nodes that join multicast groups

# Check for MLD queries
sudo tcpdump -i eth0 -nn "icmp6 and ip6[40] == 130"

# Check multicast route exists
ip -6 route show table all | grep "ff00::/8"

# Verify joined multicast groups, including solicited-node multicast
ip -6 maddr show | grep "ff02::1:ff"
```

## IPv6 Performance Testing

```bash
# Test 1: IPv6 vs IPv4 throughput comparison
iperf3 -c 203.0.113.1 -t 30 -b 1G  # IPv4
iperf3 -6 -c 2001:db8::40 -t 30 -b 1G  # IPv6

# Test 2: Latency comparison
ping -c 100 203.0.113.1 | tail -1
ping6 -c 100 2001:db8::40 | tail -1

# Results should be comparable
# If IPv6 is slower, may indicate software forwarding for IPv6

# Test 3: PPS (Packets Per Second) test
iperf3 -u -6 -c 2001:db8::40 -b 1G -l 64 -t 30
```

## Security Testing for IPv6 Equipment

```bash
# Test 1: Bogon filtering (should drop)
# Unspecified address packets
# Multicast source packets
# Link-local to non-link-local

# Test 2: Router Advertisement Guard (RA Guard)
# Switch should drop RAs from non-router ports
# Send RA from host port - should be blocked

# Test 3: IPv6 Extension Header flooding
# Equipment should handle without crashing or slowdown

# Test 4: ICMPv6 type 137 redirect handling
# Hosts should accept only from current default gateway
```

## Automated Testing with Network Test Tools

```bash
# Using ANVL/IxANVL (IPv6 conformance test suite)
# UNH-IOL provides test suites
# Commercial: Spirent, IXIA

# Open source testing
# scapy for custom packet crafting
python3 -c "from scapy.all import *; print('Scapy ready for IPv6 tests')"

# SI6 Networks IPv6 Toolkit
# sudo apt install ipv6toolkit -y
# scan6 -i eth0 -L  # Discover IPv6 hosts
# ns6 -i eth0 -s 2001:db8::/32 -t 2001:db8::2 -F 10 -e -v  # NDP NS flood test (authorized networks only)
```

Network equipment IPv6 compliance testing should verify mandatory RFC behaviors including Path MTU Discovery (especially ICMPv6 Packet Too Big generation) and Routing Header Type 0 rejection when Segments Left is non-zero, then compare IPv6 performance against IPv4 baselines to ensure production reliability.
