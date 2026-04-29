# How to Understand IPv6 Reconnaissance Challenges with 128-Bit Address Space

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: IPv6, Security, Reconnaissance, Scanning, Attack Surface

Description: Learn why the 128-bit IPv6 address space makes traditional network scanning infeasible and how attackers use alternative methods to find IPv6 hosts.

## Overview

IPv6's 128-bit address space makes brute-force network scanning essentially impossible. A typical /64 subnet contains 18.4 quintillion addresses - scanning each at 1 million packets per second would take 580,000 years. Yet IPv6 networks are not immune to reconnaissance; attackers use smarter techniques than brute-force scanning.

## Why Traditional Scanning Fails

```text
IPv4 /24 subnet:   256 addresses     → scan in ~1 second
IPv6 /64 subnet:   18,446,744,073,709,551,616 addresses → scan in ~580,000 years at 1M pps
```

```bash
# nmap scan of an IPv4 /24 - fast and practical

nmap -sn 192.168.1.0/24

# nmap scan of an IPv6 /64 - essentially infeasible
nmap -6 -sn 2001:db8:1::/64   # Would take geological time
```

## How Attackers Actually Find IPv6 Hosts

### 1. DHCPv6 Logs and DNS Records

Many IPv6 addresses are registered in DNS (AAAA records) or DHCPv6 logs:

```bash
# Query known hostnames for AAAA records
dig example.com AAAA
host -t AAAA www.example.com

# If zone transfer is allowed (misconfiguration)
dig @ns1.example.com example.com AXFR | grep AAAA
```

### 2. Multicast Discovery

On the local link, ICMPv6 multicast groups can reveal responsive hosts without brute-force scanning:

```bash
# Ping all-nodes multicast - can discover responsive hosts on the local link
ping -6 ff02::1%eth0

# Ping all-routers multicast to discover local routers
ping -6 ff02::2%eth0

# Send Router Solicitation to find routers
rdisc6 eth0
```

### 3. NDP Cache Inspection

The NDP cache (equivalent to ARP cache) reveals recently contacted or observed neighbors on the local link:

```bash
# View NDP cache on Linux - shows cached IPv6 neighbors
ip -6 neigh show

# On older EUI-64-based networks, vendor/OUI knowledge can shrink the IID search space
# from 64 bits to roughly 2^24 candidates per likely OUI
```

### 4. Predictable Address Patterns

Many real-world deployments use predictable addresses:

```bash
# Common predictable patterns attackers target
2001:db8:1::1     # Common default gateway or first assigned host
2001:db8:1::2     # Another low-numbered assignment
2001:db8:1::dead  # Low-entropy custom address
2001:db8:1::cafe
2001:db8:1::1337
2001:db8:1::a     # Sequential allocation

# Modified EUI-64 derived from MAC in older deployments
# If the vendor OUI is known, the IID search space can shrink from 64 bits
# to roughly 2^24 candidates per likely OUI
# MAC: 00:50:56:xx:xx:xx (VMware) → IID suffix: 0250:56ff:feXX:XXXX
```

### 5. Traffic Analysis and Passive Monitoring

```bash
# Passive capture to identify active IPv6 hosts
tcpdump -i eth0 -n ip6 -l 2>/dev/null | awk '{print $3}' | sort -u

# Listen for Router Advertisements (contains prefix info)
tcpdump -i eth0 'icmp6 and ip6[40] == 134'

# Capture Neighbor Solicitations
tcpdump -i eth0 'icmp6 and ip6[40] == 135'
```

### 6. SLAAC Address Prediction

In SLAAC (Stateless Address Autoconfiguration) deployments without privacy extensions:

```text
Interface ID = Modified EUI-64 from MAC in older deployments
If you know the likely NIC vendor OUI, the IID search space shrinks dramatically
After the OUI is fixed, only the 24-bit device-specific portion remains (~16 million possibilities)
```

### 7. Privacy Extension Addresses vs Stable Addresses

RFC 8981 temporary addresses (which obsolete RFC 4941) randomize the interface ID, but server addresses are typically stable:

```bash
# Server addresses are often manually configured and predictable
# End-user devices use privacy addresses (harder to track)
ip -6 addr show
# Look for "temporary" keyword - this is the privacy extension address
```

## Defensive Measures

### Limit ICMPv6 Echo Responses to Prevent Multicast Discovery

```bash
# Keep required ICMPv6 types such as Neighbor Discovery and Packet Too Big
# Drop inbound echo requests where that matches your policy
ip6tables -A INPUT -p icmpv6 --icmpv6-type echo-request -j DROP

# Don't respond to multicast pings on the local link
ip6tables -A INPUT -d ff00::/8 -p icmpv6 --icmpv6-type echo-request -j DROP
```

### Use Privacy Extensions for End-User Devices

```bash
# Enable temporary addresses (RFC 8981, obsoleting RFC 4941) on Linux
sysctl -w net.ipv6.conf.all.use_tempaddr=2
sysctl -w net.ipv6.conf.default.use_tempaddr=2
```

### Implement RA Guard to Prevent Rogue Discovery

```bash
# Cisco switch: RA Guard blocks unauthorized router advertisements on host-facing ports
ipv6 nd raguard policy CLIENTS
  device-role host
interface GigabitEthernet0/1
  ipv6 nd raguard attach-policy CLIENTS
```

### Avoid Predictable Addressing

```text
Use random or opaque addresses (RFC 7217) instead of EUI-64
Avoid embedding IPv4 addresses or service semantics in the interface ID
Avoid sequential addressing (::1, ::2, ::3...)
```

## Summary

The 128-bit IPv6 address space defeats brute-force scanning, but attackers use DNS enumeration, multicast discovery, NDP cache inspection, traffic analysis, and legacy EUI-64 prediction to find hosts. Defend by enabling temporary addresses, filtering unnecessary ICMPv6 echo traffic, using random or opaque addressing (RFC 7217), and preventing unauthorized NDP/RA traffic on access ports.
