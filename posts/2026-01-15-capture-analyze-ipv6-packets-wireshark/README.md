# How to Capture and Analyze IPv6 Packets with Wireshark

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: IPv6, Wireshark, Networking, Troubleshooting, Security, Analysis

Description: A comprehensive guide to capturing, filtering, and analyzing IPv6 network traffic using Wireshark for effective network troubleshooting and security analysis.

---

IPv6 adoption has crossed the tipping point. Google reports over 45% of their traffic now arrives via IPv6. Major cloud providers, CDNs, and mobile networks have gone dual-stack or IPv6-only. Yet when something breaks, most engineers still reach for their IPv4 muscle memory.

The result? Blind spots. Misconfigurations. Security gaps hiding in plain sight.

This guide teaches you to capture and analyze IPv6 traffic with Wireshark- the same tool you use for IPv4, but with the filters, techniques, and mental models specific to the next-generation protocol. Whether you are debugging connectivity issues, investigating security incidents, or simply learning how IPv6 works at the packet level, this post has you covered.

---

## Why IPv6 Analysis Matters Now

IPv6 is not just "IPv4 with longer addresses." It introduces fundamental changes:

- **No NAT by default**: Every device gets a globally routable address
- **No ARP**: Replaced by Neighbor Discovery Protocol (NDP)
- **No broadcast**: Only multicast and anycast
- **Extension headers**: Flexible but complex packet structure
- **ICMPv6**: Critical for basic operations (not optional like ICMP in IPv4)
- **Privacy extensions**: Randomized interface identifiers

These differences mean your IPv4 analysis skills need recalibration. A misconfigured firewall blocking ICMPv6 can break connectivity entirely. A rogue Router Advertisement can hijack your network. Extension headers can hide malicious payloads.

Understanding IPv6 at the packet level is no longer optional for network engineers, security analysts, and SREs.

---

## Setting Up Wireshark for IPv6 Capture

### Installation and Prerequisites

Wireshark runs on Windows, macOS, and Linux. Install the latest version from [wireshark.org](https://www.wireshark.org/) or your package manager:

```bash
# Ubuntu/Debian
sudo apt install wireshark

# macOS (Homebrew)
brew install wireshark

# Fedora/RHEL
sudo dnf install wireshark
```

On Linux, add your user to the `wireshark` group to capture without root:

```bash
sudo usermod -aG wireshark $USER
# Log out and back in for changes to take effect
```

### Verifying IPv6 Connectivity

Before capturing, confirm your system has IPv6 connectivity:

```bash
# Check IPv6 addresses
ip -6 addr show           # Linux
ifconfig | grep inet6     # macOS

# Test connectivity
ping6 ipv6.google.com
ping6 2001:4860:4860::8888

# View IPv6 routing table
ip -6 route show          # Linux
netstat -rn -f inet6      # macOS
```

### Capture Interface Selection

Launch Wireshark and select your network interface. Look for interfaces showing IPv6 traffic in the sparkline graphs. Common interfaces:

- `eth0` / `enp0s3`: Wired Ethernet
- `wlan0` / `wlp2s0`: Wireless
- `lo` / `lo0`: Loopback (for local testing)
- `docker0`: Docker bridge network
- `any`: Capture on all interfaces (Linux)

---

## Essential IPv6 Display Filters

Wireshark display filters let you narrow down captured traffic to exactly what you need. Here are the essential IPv6 filters:

### Basic IPv6 Filters

```
# All IPv6 traffic
ipv6

# Specific source address
ipv6.src == 2001:db8::1

# Specific destination address
ipv6.dst == 2001:db8::2

# Either source or destination
ipv6.addr == 2001:db8::1

# IPv6 traffic to/from a subnet (prefix match)
ipv6.addr == 2001:db8::/32

# Link-local addresses only
ipv6.src == fe80::/10

# Global unicast addresses
ipv6.src == 2000::/3
```

### Protocol-Specific Filters

```
# ICMPv6 (critical for IPv6 operations)
icmpv6

# ICMPv6 by type
icmpv6.type == 128    # Echo Request (ping)
icmpv6.type == 129    # Echo Reply
icmpv6.type == 133    # Router Solicitation
icmpv6.type == 134    # Router Advertisement
icmpv6.type == 135    # Neighbor Solicitation
icmpv6.type == 136    # Neighbor Advertisement
icmpv6.type == 137    # Redirect

# TCP over IPv6
ipv6 and tcp

# UDP over IPv6
ipv6 and udp

# DNS over IPv6
ipv6 and dns

# HTTP over IPv6
ipv6 and http

# DHCPv6
dhcpv6
```

### Advanced Combination Filters

```
# IPv6 TCP traffic on port 443 (HTTPS)
ipv6 and tcp.port == 443

# IPv6 traffic excluding ICMPv6
ipv6 and not icmpv6

# Neighbor Discovery Protocol only
icmpv6.type >= 133 and icmpv6.type <= 137

# Duplicate Address Detection (DAD)
icmpv6.type == 135 and ipv6.src == ::

# IPv6 fragments
ipv6.nxt == 44

# IPv6 with hop-by-hop options
ipv6.nxt == 0

# IPv6 with routing header
ipv6.nxt == 43

# Traffic class (QoS/DSCP analysis)
ipv6.tclass != 0

# Flow label analysis
ipv6.flow != 0

# Packets with specific hop limit
ipv6.hlim == 64
ipv6.hlim < 64
```

---

## Capture Filters for IPv6

Capture filters (BPF syntax) are applied during capture, reducing file size and CPU load. They use different syntax than display filters:

```
# Capture only IPv6 traffic
ip6

# IPv6 to/from specific host
ip6 host 2001:db8::1

# IPv6 subnet
ip6 net 2001:db8::/32

# IPv6 and TCP
ip6 and tcp

# IPv6 and specific port
ip6 and port 80

# ICMPv6 only
icmp6

# Exclude ICMPv6
ip6 and not icmp6

# IPv6 multicast
ip6 multicast

# Link-local traffic
ip6 net fe80::/10
```

### Recommended Capture Filter Combinations

For targeted troubleshooting, combine filters:

```
# Web traffic over IPv6
ip6 and (port 80 or port 443)

# DNS over IPv6
ip6 and port 53

# SSH over IPv6
ip6 and port 22

# Email protocols over IPv6
ip6 and (port 25 or port 465 or port 587 or port 993)
```

---

## Understanding IPv6 Packet Structure

### IPv6 Header Fields in Wireshark

When you expand an IPv6 packet in Wireshark, you see:

```
Internet Protocol Version 6
    0110 .... = Version: 6
    .... 0000 0000 .... .... .... .... .... = Traffic Class: 0x00
    .... .... .... 0000 0000 0000 0000 0000 = Flow Label: 0x00000
    Payload Length: 40
    Next Header: TCP (6)
    Hop Limit: 64
    Source Address: 2001:db8::1
    Destination Address: 2001:db8::2
```

Key fields to understand:

| Field | Size | Purpose |
|-------|------|---------|
| Version | 4 bits | Always 6 for IPv6 |
| Traffic Class | 8 bits | QoS/DSCP marking |
| Flow Label | 20 bits | Flow identification for QoS |
| Payload Length | 16 bits | Size of payload (excluding IPv6 header) |
| Next Header | 8 bits | Type of next header (TCP=6, UDP=17, ICMPv6=58) |
| Hop Limit | 8 bits | TTL equivalent, decremented at each hop |
| Source Address | 128 bits | Sender's IPv6 address |
| Destination Address | 128 bits | Recipient's IPv6 address |

### Extension Headers

IPv6 uses extension headers for optional features. The `Next Header` field chains them together:

```
IPv6 Header (Next Header: 0)
    -> Hop-by-Hop Options (Next Header: 43)
        -> Routing Header (Next Header: 44)
            -> Fragment Header (Next Header: 6)
                -> TCP Header
```

Common extension headers:

| Next Header Value | Name | Purpose |
|-------------------|------|---------|
| 0 | Hop-by-Hop Options | Router Alert, Jumbograms |
| 43 | Routing | Source routing (deprecated in Type 0) |
| 44 | Fragment | Fragmentation (source only) |
| 50 | ESP | IPsec encryption |
| 51 | AH | IPsec authentication |
| 60 | Destination Options | Options for destination node |
| 58 | ICMPv6 | Control messages |
| 6 | TCP | TCP payload |
| 17 | UDP | UDP payload |

Filter for extension headers:

```
# Packets with any extension header
ipv6.nxt == 0 or ipv6.nxt == 43 or ipv6.nxt == 44 or ipv6.nxt == 60

# Fragment headers specifically
ipv6.nxt == 44

# IPsec traffic
ipv6.nxt == 50 or ipv6.nxt == 51
```

---

## Analyzing ICMPv6 and Neighbor Discovery

ICMPv6 is the backbone of IPv6 operations. Unlike ICMP in IPv4, blocking ICMPv6 breaks fundamental functionality.

### ICMPv6 Message Types

```
# All ICMPv6 messages
icmpv6

# Error messages (types 1-4)
icmpv6.type >= 1 and icmpv6.type <= 4

# Destination Unreachable
icmpv6.type == 1

# Packet Too Big (critical for Path MTU Discovery)
icmpv6.type == 2

# Time Exceeded
icmpv6.type == 3

# Parameter Problem
icmpv6.type == 4
```

### Neighbor Discovery Protocol (NDP)

NDP replaces ARP and provides additional functionality:

```
# Router Solicitation (RS)
# Hosts ask "Any routers out there?"
icmpv6.type == 133

# Router Advertisement (RA)
# Routers respond with prefix info, default route, etc.
icmpv6.type == 134

# Neighbor Solicitation (NS)
# "Who has this IPv6 address?" (like ARP request)
icmpv6.type == 135

# Neighbor Advertisement (NA)
# "I have this address" (like ARP reply)
icmpv6.type == 136

# Redirect
# Router tells host of a better next hop
icmpv6.type == 137
```

### Analyzing Router Advertisements

Router Advertisements contain critical network configuration:

```
ICMPv6 Router Advertisement
    Type: 134
    Cur Hop Limit: 64
    Flags: 0x00
        0... .... = Managed: Not set
        .0.. .... = Other: Not set
    Router Lifetime: 1800
    Reachable Time: 0
    Retrans Timer: 0
    ICMPv6 Option (Prefix Information)
        Type: 3
        Prefix Length: 64
        Flags: 0xc0
            1... .... = On-link: Set
            .1.. .... = Autonomous: Set
        Valid Lifetime: 2592000
        Preferred Lifetime: 604800
        Prefix: 2001:db8:1234::/64
```

Filter for specific RA options:

```
# RAs with prefix information
icmpv6.type == 134 and icmpv6.opt.type == 3

# RAs with DNS server option (RDNSS)
icmpv6.type == 134 and icmpv6.opt.type == 25

# RAs advertising specific prefix
icmpv6.nd.ra.prefix == 2001:db8::/64
```

### Duplicate Address Detection (DAD)

Before using an address, hosts verify it is unique:

```
# DAD Neighbor Solicitation (source is ::)
icmpv6.type == 135 and ipv6.src == ::

# DAD targeting specific address
icmpv6.type == 135 and ipv6.src == :: and icmpv6.nd.ns.target_address == 2001:db8::1
```

---

## Troubleshooting Common IPv6 Issues

### Issue 1: No IPv6 Connectivity

**Symptoms**: `ping6` fails, no global IPv6 address assigned

**Capture and analyze**:

```
# Capture NDP traffic
icmpv6.type >= 133 and icmpv6.type <= 136

# Check for Router Solicitations from your host
icmpv6.type == 133 and ipv6.src == fe80::your:link:local:addr

# Check for Router Advertisements
icmpv6.type == 134
```

**What to look for**:
- RS sent but no RA received -> Router not advertising
- RA received but no prefix -> Router misconfigured
- RA received with wrong flags -> Check M/O flags
- No RS sent -> Check if IPv6 is enabled on interface

### Issue 2: Intermittent Connectivity

**Symptoms**: IPv6 works sometimes, fails randomly

**Capture and analyze**:

```
# Look for ICMPv6 errors
icmpv6.type >= 1 and icmpv6.type <= 4

# Packet Too Big (MTU issues)
icmpv6.type == 2

# Destination Unreachable
icmpv6.type == 1

# Time Exceeded (routing loops)
icmpv6.type == 3
```

**Common causes**:
- MTU issues (check Packet Too Big messages)
- Firewall blocking ICMPv6
- Asymmetric routing
- DAD failures

### Issue 3: Slow IPv6 Performance

**Symptoms**: IPv6 connections slower than IPv4

**Capture and analyze**:

```
# TCP retransmissions over IPv6
ipv6 and tcp.analysis.retransmission

# TCP duplicate ACKs
ipv6 and tcp.analysis.duplicate_ack

# TCP window size issues
ipv6 and tcp.window_size < 1000

# Check round-trip times
# Use Statistics -> TCP Stream Graphs -> Round Trip Time
```

**Analysis steps**:
1. Compare TCP handshake times for IPv4 vs IPv6
2. Check for retransmissions (packet loss)
3. Verify Path MTU is correct (no fragmentation)
4. Look for asymmetric paths

### Issue 4: DNS Resolution Failures

**Symptoms**: AAAA queries fail or return wrong results

**Capture and analyze**:

```
# DNS AAAA queries
dns.qry.type == 28

# DNS AAAA responses
dns.resp.type == 28

# Failed DNS queries
dns.flags.rcode != 0

# DNS over IPv6 transport
ipv6 and dns
```

**What to check**:
- AAAA records present in responses
- DNS server reachable over IPv6
- Response codes (NXDOMAIN, SERVFAIL)

---

## Security Analysis with IPv6

### Detecting Rogue Router Advertisements

Rogue RAs can redirect traffic or cause denial of service:

```
# All Router Advertisements
icmpv6.type == 134

# RAs from unexpected sources
icmpv6.type == 134 and not ipv6.src == fe80::expected:router:addr

# RAs advertising unexpected prefixes
icmpv6.type == 134 and icmpv6.opt.type == 3
```

Create a baseline of legitimate routers, then alert on deviations.

### Detecting IPv6 Scanning

```
# Neighbor Solicitations (address probing)
icmpv6.type == 135

# High volume of NS from single source (scanning)
# Use Statistics -> Conversations -> IPv6

# TCP SYN scans over IPv6
ipv6 and tcp.flags.syn == 1 and tcp.flags.ack == 0

# Port scans (many destination ports, same source)
# Use Statistics -> Endpoints -> TCP
```

### Analyzing IPv6 Extension Header Attacks

Extension headers can be used to evade security controls:

```
# Fragmented traffic (can hide payloads)
ipv6.nxt == 44

# Routing headers (potential for reflection attacks)
ipv6.nxt == 43

# Unusually long extension header chains
# Look for packets with multiple extension headers

# Tiny fragments (evasion technique)
ipv6.nxt == 44 and ipv6.fraghdr.offset == 0
```

### Detecting IPv6 Tunneling

IPv6 can be tunneled over IPv4 (6in4, Teredo, ISATAP):

```
# 6in4 tunnels (protocol 41)
ip.proto == 41

# Teredo (UDP port 3544)
udp.port == 3544

# ISATAP addresses
ipv6.addr contains ::0:5efe:
```

Tunneled IPv6 can bypass IPv4 security controls.

---

## Advanced Analysis Techniques

### Following IPv6 Streams

Right-click on a packet and select "Follow -> TCP Stream" or "Follow -> UDP Stream" to see the complete conversation:

```
# Filter the specific stream afterward
tcp.stream == 5
udp.stream == 3
```

### Statistics and Graphing

Wireshark provides powerful statistics for IPv6:

1. **Statistics -> IPv6 Statistics -> All Addresses**: See all IPv6 addresses in capture
2. **Statistics -> Conversations -> IPv6**: Analyze traffic between address pairs
3. **Statistics -> Protocol Hierarchy**: Percentage of IPv6 traffic
4. **Statistics -> IO Graph**: Plot IPv6 traffic over time

Create an IO Graph with filter `ipv6` to visualize IPv6 traffic patterns.

### Exporting IPv6 Analysis

Export filtered packets for further analysis:

1. Apply your display filter
2. File -> Export Specified Packets
3. Choose format (pcapng, pcap, CSV, JSON, etc.)

For reporting:

1. Statistics -> Capture File Properties
2. Statistics -> Protocol Hierarchy -> Export

### Coloring Rules for IPv6

Create custom coloring rules (View -> Coloring Rules):

```
# Highlight ICMPv6 errors in red
Filter: icmpv6.type >= 1 and icmpv6.type <= 4
Color: Red background

# Highlight Router Advertisements in blue
Filter: icmpv6.type == 134
Color: Blue background

# Highlight DAD in yellow
Filter: icmpv6.type == 135 and ipv6.src == ::
Color: Yellow background
```

---

## IPv6 Wireshark Filter Quick Reference

### Address Filters

| Filter | Description |
|--------|-------------|
| `ipv6` | All IPv6 traffic |
| `ipv6.src == addr` | Specific source |
| `ipv6.dst == addr` | Specific destination |
| `ipv6.addr == addr` | Source or destination |
| `ipv6.src == fe80::/10` | Link-local sources |
| `ipv6.src == 2000::/3` | Global unicast sources |
| `ipv6.dst == ff00::/8` | Multicast destinations |

### ICMPv6 Filters

| Filter | Description |
|--------|-------------|
| `icmpv6` | All ICMPv6 |
| `icmpv6.type == 128` | Echo Request (ping) |
| `icmpv6.type == 129` | Echo Reply |
| `icmpv6.type == 1` | Destination Unreachable |
| `icmpv6.type == 2` | Packet Too Big |
| `icmpv6.type == 133` | Router Solicitation |
| `icmpv6.type == 134` | Router Advertisement |
| `icmpv6.type == 135` | Neighbor Solicitation |
| `icmpv6.type == 136` | Neighbor Advertisement |

### Protocol Filters

| Filter | Description |
|--------|-------------|
| `ipv6 and tcp` | TCP over IPv6 |
| `ipv6 and udp` | UDP over IPv6 |
| `ipv6 and tcp.port == 80` | HTTP over IPv6 |
| `ipv6 and tcp.port == 443` | HTTPS over IPv6 |
| `ipv6 and dns` | DNS over IPv6 |
| `dhcpv6` | DHCPv6 traffic |

### Header Filters

| Filter | Description |
|--------|-------------|
| `ipv6.hlim == 64` | Specific hop limit |
| `ipv6.hlim < 64` | Decremented hop limit |
| `ipv6.tclass != 0` | Non-zero traffic class |
| `ipv6.flow != 0` | Non-zero flow label |
| `ipv6.nxt == 44` | Fragment header present |
| `ipv6.nxt == 50` | ESP (IPsec) |
| `ipv6.nxt == 51` | AH (IPsec) |

### Analysis Filters

| Filter | Description |
|--------|-------------|
| `ipv6 and tcp.analysis.retransmission` | TCP retransmissions |
| `ipv6 and tcp.analysis.duplicate_ack` | Duplicate ACKs |
| `ipv6 and tcp.analysis.zero_window` | Zero window |
| `ipv6 and tcp.analysis.lost_segment` | Lost segments |
| `ipv6 and tcp.flags.syn == 1` | SYN packets |
| `ipv6 and tcp.flags.reset == 1` | RST packets |

---

## Best Practices for IPv6 Packet Analysis

### 1. Establish a Baseline

Before troubleshooting, capture normal IPv6 traffic:
- Expected Router Advertisements
- Normal NDP traffic patterns
- Typical ICMPv6 message types
- Standard traffic class values

### 2. Use Capture Filters for Long Sessions

For extended captures, use BPF capture filters to limit file size:

```
# Capture only problematic subnet
ip6 net 2001:db8:1234::/48

# Exclude known-good traffic
ip6 and not host 2001:db8::dns
```

### 3. Save Filter Sets

Create filter buttons (Edit -> Preferences -> Filter Buttons) for common scenarios:

- "IPv6 Errors": `icmpv6.type >= 1 and icmpv6.type <= 4`
- "NDP": `icmpv6.type >= 133 and icmpv6.type <= 137`
- "IPv6 TCP Issues": `ipv6 and tcp.analysis.flags`

### 4. Correlate with Logs

When you find interesting packets, note the timestamp and correlate with:
- System logs
- Application logs
- Firewall logs
- Router/switch logs

### 5. Document Your Findings

Export relevant packets and annotate them:
- Right-click packet -> Add Comment
- File -> Export Packet Dissections -> As Plain Text

---

## Integration with Monitoring Systems

When you identify IPv6 issues through Wireshark analysis, feed that knowledge back into your monitoring:

**Create alerts for**:
- ICMPv6 error rates exceeding baseline
- Unexpected Router Advertisements
- IPv6 fragmentation (potential MTU issues)
- TCP retransmission rates over IPv6

**Monitor with OneUptime**:
- Set up IPv6 endpoint monitors
- Create SLOs for IPv6 service availability
- Track IPv6 vs IPv4 performance metrics
- Alert on IPv6 connectivity failures

A single Wireshark session reveals the problem. Continuous monitoring prevents it from recurring.

---

## Summary: IPv6 Analysis Workflow

1. **Identify the symptom**: Connectivity failure? Slow performance? Security concern?

2. **Start capture**: Use appropriate capture filter to limit scope

3. **Apply display filters**: Narrow down to relevant traffic

4. **Analyze packets**: Check headers, ICMPv6 messages, TCP behavior

5. **Use statistics**: Conversations, protocol hierarchy, IO graphs

6. **Document findings**: Export filtered packets, add comments

7. **Implement fixes**: Update firewall rules, fix configurations

8. **Monitor continuously**: Feed findings into monitoring systems

---

## Conclusion

IPv6 packet analysis with Wireshark is not fundamentally different from IPv4 analysis- but it requires understanding IPv6-specific protocols and behaviors. ICMPv6 is critical infrastructure, not optional. Neighbor Discovery replaces ARP. Extension headers add complexity.

Master the filters in this guide, and you will be equipped to troubleshoot IPv6 connectivity issues, investigate security incidents, and optimize network performance. Start with a baseline capture of your normal IPv6 traffic, then use targeted filters when problems arise.

The transition to IPv6 is inevitable. The engineers who understand it at the packet level will be the ones solving problems while others are still wondering why their IPv4 tools are not working.

---

**Related Reading**:

- [Why Software Engineers Don't Understand Networking](https://oneuptime.com/blog/post/2025-12-12-why-software-engineers-dont-understand-networking/view)
- [Kubernetes Network Policies for Zero Trust Security](https://oneuptime.com/blog/post/2026-01-06-kubernetes-network-policies-zero-trust/view)
- [Monitor IP Addresses with OneUptime](https://oneuptime.com/blog/post/2025-10-27-monitor-ip-addresses-with-oneuptime/view)
