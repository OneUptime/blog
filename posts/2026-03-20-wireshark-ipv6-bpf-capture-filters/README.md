# How to Create IPv6 Capture Filters (BPF) in Wireshark

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Wireshark, IPv6, BPF, Capture Filters, Packet Analysis, Network Debugging

Description: A guide to writing Berkeley Packet Filter (BPF) capture filters for IPv6 traffic in Wireshark and tcpdump to reduce capture buffer size and focus on relevant traffic.

Capture filters (BPF) are applied before packets are stored in Wireshark's buffer, reducing memory usage and making captures more manageable. Unlike display filters, BPF filters use a different syntax and are applied at the OS network layer.

## Why Use Capture Filters vs Display Filters

| Feature | Capture Filter (BPF) | Display Filter |
|---|---|---|
| Applied | Before buffering | After capture |
| Performance | Reduces memory/CPU | No impact on capture |
| Syntax | BPF (tcpdump-like) | Wireshark DSL |
| Logical operators | and, or, not | and, or, not |

## Basic IPv6 BPF Capture Filters

```bpf
# Capture all IPv6 traffic

ip6

# Capture only IPv6 traffic (no IPv4)
ip6

# Capture both IPv4 and IPv6
ip or ip6
```

## Capture by IPv6 Address

```bpf
# Capture traffic to/from a specific IPv6 host
ip6 host 2001:db8::10

# Capture traffic from a specific IPv6 source
ip6 src host 2001:db8::10

# Capture traffic to a specific IPv6 destination
ip6 dst host 2001:db8::10

# Capture traffic to/from multiple IPv6 hosts
ip6 host 2001:db8::10 or ip6 host 2001:db8::11
```

## Capture by IPv6 Network/Subnet

```bpf
# Capture traffic from an IPv6 subnet
ip6 src net 2001:db8:1::/64

# Capture traffic to an IPv6 subnet
ip6 dst net 2001:db8:5::/64

# Capture traffic within a /48 site prefix
ip6 net 2001:db8:1::/48
```

## Capture by Protocol over IPv6

```bpf
# Capture IPv6 TCP traffic
ip6 and tcp

# Capture IPv6 UDP traffic
ip6 and udp

# Capture IPv6 ICMPv6 traffic
ip6 and icmp6

# Capture IPv6 TCP on specific port
ip6 and tcp port 443

# Capture IPv6 TCP source port (client connections)
ip6 and tcp src port 443

# Capture IPv6 TCP destination port
ip6 and tcp dst port 80
```

## Capture IPv6 NDP/ICMPv6 Messages

```bpf
# Capture all ICMPv6 (includes NDP, Router Advertisements, etc.)
ip6 and icmp6

# Capture only Router Advertisements (ICMPv6 type 134)
ip6 and icmp6[0] == 134

# Capture Router Solicitations (type 133)
ip6 and icmp6[0] == 133

# Capture Neighbor Solicitations (type 135)
ip6 and icmp6[0] == 135

# Capture Neighbor Advertisements (type 136)
ip6 and icmp6[0] == 136

# Capture all NDP messages (types 133-137)
ip6 and icmp6[0] >= 133 and icmp6[0] <= 137
```

## Capture IPv6 Multicast

```bpf
# Capture all IPv6 multicast traffic
ip6 multicast

# Capture link-local multicast (ff02::/16)
ip6 dst net ff02::/16
```

## Complex Capture Filters

```bpf
# Capture HTTPS from a specific IPv6 subnet
ip6 src net 2001:db8:c1e::/64 and tcp dst port 443

# Capture IPv6 traffic excluding DNS and NTP
ip6 and not (udp port 53 or udp port 123)

# Capture high-port IPv6 TCP (application traffic, excluding well-known ports)
ip6 and tcp and portrange 1024-65535

# Capture IPv6 traffic larger than 1200 bytes (look for large packets)
ip6 and greater 1200
```

## Using BPF Filters with tcpdump

```bash
# Capture IPv6 traffic on eth0
sudo tcpdump -i eth0 'ip6' -w ipv6-capture.pcap

# Capture IPv6 HTTPS to a specific host
sudo tcpdump -i eth0 'ip6 dst host 2001:db8::10 and tcp port 443' \
  -w https-ipv6.pcap

# Capture ICMPv6 NDP messages
sudo tcpdump -i eth0 'ip6 and icmp6[0] >= 133 and icmp6[0] <= 136' \
  -w ndp-capture.pcap
```

## Setting a Capture Filter in Wireshark GUI

1. Open Wireshark
2. Double-click the interface (or click the capture filter icon)
3. Enter the BPF expression in **Capture filter for selected interfaces**
4. Click **Start**

Or save frequently used filters:
1. Click the **Bookmark** icon in the capture filter field
2. Select **Manage Capture Filters**
3. Add entries with names like "IPv6 HTTPS" and filter `ip6 and tcp port 443`

BPF capture filters are the most efficient tool for focusing Wireshark on IPv6 traffic of interest - they prevent buffer overflows during long captures and dramatically reduce the amount of irrelevant data to analyze.
