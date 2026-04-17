# How to Analyze IPv6 Router Advertisements in Wireshark

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Wireshark, IPv6, Router Advertisement, NDP, SLAAC, ICMPv6

Description: A guide to capturing and analyzing IPv6 Router Advertisement (RA) messages in Wireshark to verify SLAAC configuration, prefix distribution, and router settings.

Router Advertisements (RAs) are ICMPv6 type 134 messages sent by routers to announce IPv6 prefixes, default gateways, and configuration flags to hosts. Analyzing them in Wireshark reveals exactly what prefix and configuration information clients receive.

## Display Filters for Router Advertisements

```wireshark
# Show ALL Router Advertisement messages

icmpv6.type == 134

# Show Router Solicitations (sent by clients to request RAs)
icmpv6.type == 133

# Show both RS and RA together (full RA exchange)
icmpv6.type == 133 || icmpv6.type == 134

# Show only RAs from a specific router
icmpv6.type == 134 && ipv6.src == fe80::1

# Show RAs advertising a specific prefix
icmpv6.type == 134 && icmpv6.opt.prefix == 2001:db8:1::
```

## RA Flag Analysis

The M and O flags in Router Advertisements control how clients get IPv6 configuration:

```wireshark
# RA with M=1 (Managed: use DHCPv6 for addresses)
icmpv6.type == 134 && icmpv6.nd.ra.flag.m == 1

# RA with O=1 (Other: use DHCPv6 for DNS/other config)
icmpv6.type == 134 && icmpv6.nd.ra.flag.o == 1

# RA with M=0, O=0 (pure SLAAC mode)
icmpv6.type == 134 && icmpv6.nd.ra.flag.m == 0 && icmpv6.nd.ra.flag.o == 0
```

## Analyzing RA Content in Wireshark

Click on any RA packet and expand the **ICMPv6** tree to see:

```text
Internet Control Message Protocol v6
  Type: Router Advertisement (134)
  Code: 0
  Hop Limit: 64  <- Max hops for packets sent by this router
  Flags: 0x00
    M flag: 0 (SLAAC mode - clients configure their own addresses)
    O flag: 0 (No DHCPv6 for other info)
  Router Lifetime: 1800 seconds  <- How long this is the default router
  Reachable Time: 0 (unspecified)
  Retrans Timer: 0 (unspecified)
  ICMPv6 Option (Prefix Information):
    Type: Prefix Information (3)
    Prefix Length: 64  <- Clients will use this prefix for SLAAC
    L flag: 1 (On-Link prefix)
    A flag: 1 (Use for Autonomous (SLAAC) address config)
    Valid Lifetime: 2592000 seconds (30 days)
    Preferred Lifetime: 604800 seconds (7 days)
    Prefix: 2001:db8:1::  <- The advertised prefix
  ICMPv6 Option (Recursive DNS Server):
    Type: Recursive DNS Server (25)
    Lifetime: 3600 seconds
    IPv6 Address: 2001:4860:4860::8888
```

## Diagnosing Common RA Issues

### Clients Not Getting IPv6 via SLAAC

```wireshark
# Check if any RAs are being sent at all
icmpv6.type == 134

# If no RAs, check if RS is being sent
icmpv6.type == 133

# Verify the prefix A-flag is set (SLAAC-enabled)
icmpv6.type == 134 && icmpv6.opt.prefix.flag.a == 1
```

### Rogue Router Advertisement Detection

```wireshark
# Look for RAs from unexpected source addresses
# Normal RAs come from link-local (fe80::) addresses
icmpv6.type == 134 && !(ipv6.src == fe80::/10)

# Multiple routers sending conflicting RAs
icmpv6.type == 134
# Then check if there are multiple different source IPs sending RAs
```

### Short Router Lifetime (Router Going Away)

```wireshark
# RA with Router Lifetime = 0 means router is withdrawing
icmpv6.type == 134 && icmpv6.nd.ra.router_lifetime == 0
```

## Capture and Count RAs

```bash
# Capture RA traffic
sudo tcpdump -i eth0 'icmp6[0] == 134' -w ra-capture.pcap

# Count RAs per source (identify all routers on the segment)
tshark -r ra-capture.pcap -Y "icmpv6.type == 134" \
  -T fields -e ipv6.src | sort | uniq -c | sort -rn
```

## Verify RA Interval

Default RA interval is 200-600 seconds. Monitoring RAs reveals the actual interval:

```bash
# Watch for RAs in real time
sudo tcpdump -i eth0 'icmp6[0] == 134' -n -l 2>/dev/null | \
  awk '{print $1, $3, $NF}'
```

Router Advertisement analysis in Wireshark provides a complete picture of what prefix information, flags, and DNS server addresses are being sent to IPv6 clients - making it the definitive tool for verifying SLAAC configuration.
