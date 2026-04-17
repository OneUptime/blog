# How to Use Wireshark Capture Filters for IPv6

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: IPv6, Wireshark, Capture Filters, Packet Capture, Network Diagnostics, BPF

Description: Write Wireshark capture filters using BPF syntax to capture only IPv6 traffic during packet collection, reducing file size and focusing analysis on relevant packets.

## Introduction

Wireshark capture filters use Berkeley Packet Filter (BPF) syntax and are applied during capture - they determine which packets are saved to disk. Unlike display filters, capture filters cannot be changed after capture starts. For IPv6, capture filters use the `ip6` keyword and BPF primitives to selectively capture traffic.

## Basic IPv6 Capture Filters

```text
# Capture all IPv6 traffic

ip6

# Capture only ICMPv6
ip6 proto 58

# Capture IPv6 TCP
ip6 && tcp

# Capture IPv6 UDP
ip6 && udp

# Capture IPv6 on specific port
ip6 && tcp port 443

# Capture IPv6 DNS queries
ip6 && udp port 53

# Capture both IPv4 and IPv6 HTTP
tcp port 80 or tcp port 443
```

## Filtering by IPv6 Address

```text
# Capture traffic to/from a specific IPv6 address
host 2001:db8::1

# Capture traffic from a specific IPv6 source
src host 2001:db8::1

# Capture traffic to a specific IPv6 destination
dst host 2001:db8::1

# Capture between two specific hosts
host 2001:db8::1 and host 2001:db8::2

# Capture from a /64 prefix (subnet)
net 2001:db8::/64
```

## ICMPv6 Capture Filters

```text
# All ICMPv6
ip6 proto 58

# ICMPv6 Neighbor Solicitation (type 135)
ip6 proto 58 && ip6[40] == 135

# ICMPv6 Neighbor Advertisement (type 136)
ip6 proto 58 && ip6[40] == 136

# ICMPv6 Router Solicitation (type 133)
ip6 proto 58 && ip6[40] == 133

# ICMPv6 Router Advertisement (type 134)
ip6 proto 58 && ip6[40] == 134

# ICMPv6 Echo Request (type 128) - ping6
ip6 proto 58 && ip6[40] == 128

# ICMPv6 Echo Reply (type 129)
ip6 proto 58 && ip6[40] == 129
```

## Using Capture Filters with tshark

```bash
# Capture IPv6 traffic on eth0 to a file
tshark -i eth0 -f "ip6" -w /tmp/ipv6-capture.pcap

# Capture ICMPv6 only
tshark -i eth0 -f "ip6 proto 58" -w /tmp/icmpv6.pcap

# Capture IPv6 HTTPS from a specific host
tshark -i eth0 -f "ip6 && tcp port 443 && host 2001:db8::1" -w /tmp/ipv6-https.pcap

# Capture for 60 seconds then stop
tshark -i eth0 -f "ip6" -a duration:60 -w /tmp/ipv6-60s.pcap

# Capture with rotating files (10MB each, keep 5 files)
tshark -i eth0 -f "ip6" -b filesize:10240 -b files:5 -w /tmp/ipv6-rotate.pcap
```

## Using Capture Filters with tcpdump

```bash
# Capture IPv6 to stdout
tcpdump -i eth0 ip6

# Capture IPv6 with verbose output
tcpdump -i eth0 -v ip6

# Capture ICMPv6 Neighbor Discovery
tcpdump -i eth0 "ip6 proto 58 && (ip6[40] == 133 || ip6[40] == 134 || ip6[40] == 135 || ip6[40] == 136)"

# Save IPv6 capture to file
tcpdump -i eth0 -w /tmp/ipv6.pcap ip6

# Capture IPv6 traffic on port 80
tcpdump -i eth0 "ip6 && tcp port 80"

# Capture IPv6 from specific host
tcpdump -i eth0 "ip6 && host 2001:db8::1"
```

## Compound Capture Filters

```text
# IPv6 TCP SYN packets (connection initiations)
ip6 && tcp[tcpflags] & tcp-syn != 0 && tcp[tcpflags] & tcp-ack == 0

# IPv6 TCP RST packets
ip6 && tcp[tcpflags] & tcp-rst != 0

# IPv6 DNS traffic (both queries and responses)
ip6 && udp port 53

# IPv6 DHCP (DHCPv6 uses UDP ports 546 and 547)
ip6 && udp && (port 546 or port 547)

# IPv6 traffic excluding loopback
ip6 && not host ::1

# IPv6 multicast traffic
ip6 multicast
```

## Capture Filter Limitations vs Display Filters

Capture filters (BPF) have fewer features than Wireshark display filters:

| Feature | Capture Filter | Display Filter |
|---------|---------------|----------------|
| IPv6 address field | `host 2001:db8::1` | `ipv6.addr == 2001:db8::1` |
| ICMPv6 type | `ip6[40] == 135` | `icmpv6.type == 135` |
| TCP flag | `tcp[tcpflags] & tcp-syn` | `tcp.flags.syn == 1` |
| Applied when | During capture | After capture |
| Changeable | No (restart required) | Yes (anytime) |

## Conclusion

Wireshark capture filters using BPF syntax allow you to limit packet capture to only IPv6 traffic from the start, reducing storage and processing overhead. Use `ip6` for all IPv6, `ip6 proto 58` for ICMPv6, and `host 2001:db8::1` for address filtering. For analysis of already-captured traffic, switch to Wireshark display filters which offer more expressive IPv6 filtering capabilities.
