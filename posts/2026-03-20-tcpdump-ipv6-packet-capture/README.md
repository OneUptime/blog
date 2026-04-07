# How to Use tcpdump for IPv6 Packet Capture

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: IPv6, tcpdump, Packet Capture, Network Diagnostics, Linux, BPF

Description: Capture and analyze IPv6 packets using tcpdump with BPF filters, decode ICMPv6 messages, and save captures for offline Wireshark analysis.

## Introduction

`tcpdump` is the standard command-line packet capture tool on Linux and macOS. It fully supports IPv6 with simple filter expressions. Capturing IPv6 traffic with tcpdump is essential for diagnosing NDP issues, testing IPv6 connectivity, and verifying that applications are using the correct protocol.

## Basic IPv6 Capture Commands

```bash
# Capture all IPv6 traffic on eth0

tcpdump -i eth0 ip6

# Show all IPv6 with verbose output
tcpdump -i eth0 -v ip6

# Show IPv6 with hex dump
tcpdump -i eth0 -X ip6

# Show full packet contents
tcpdump -i eth0 -XX ip6

# Suppress hostname resolution (faster, shows IP addresses)
tcpdump -i eth0 -n ip6

# Capture on all interfaces
tcpdump -i any ip6
```

## Filtering IPv6 by Address

```bash
# Traffic to or from a specific IPv6 address
tcpdump -i eth0 -n "ip6 and host 2001:db8::1"

# Traffic from a specific source
tcpdump -i eth0 -n "ip6 and src host 2001:db8::1"

# Traffic to a specific destination
tcpdump -i eth0 -n "ip6 and dst host 2001:db8::1"

# Traffic between two hosts
tcpdump -i eth0 -n "ip6 and host 2001:db8::1 and host 2001:db8::2"

# Exclude loopback
tcpdump -i eth0 -n "ip6 and not host ::1"
```

## Capturing ICMPv6 Traffic

```bash
# All ICMPv6
tcpdump -i eth0 -n "ip6 proto 58"

# ICMPv6 with verbose decode
tcpdump -i eth0 -n -v "ip6 proto 58"

# Neighbor Discovery only (types 133-137)
# Router Solicitation (133) and Advertisement (134)
tcpdump -i eth0 -n -v "ip6 proto 58 and (ip6[40] == 133 or ip6[40] == 134)"

# Neighbor Solicitation (135) and Advertisement (136)
tcpdump -i eth0 -n -v "ip6 proto 58 and (ip6[40] == 135 or ip6[40] == 136)"

# Echo request/reply (ping6)
tcpdump -i eth0 -n "ip6 proto 58 and (ip6[40] == 128 or ip6[40] == 129)"

# All NDP traffic
tcpdump -i eth0 -n "ip6 proto 58 and ip6[40] >= 133 and ip6[40] <= 137"
```

## Capturing IPv6 by Port

```bash
# IPv6 HTTP traffic
tcpdump -i eth0 -n "ip6 and tcp port 80"

# IPv6 HTTPS
tcpdump -i eth0 -n "ip6 and tcp port 443"

# IPv6 DNS (UDP)
tcpdump -i eth0 -n "ip6 and udp port 53"

# IPv6 SSH
tcpdump -i eth0 -n "ip6 and tcp port 22"

# DHCPv6 (client 546, server 547)
tcpdump -i eth0 -n "ip6 and udp and (port 546 or port 547)"

# Multiple ports
tcpdump -i eth0 -n "ip6 and tcp and (port 80 or port 443 or port 8080)"
```

## Saving and Reading Captures

```bash
# Save capture to file
tcpdump -i eth0 -n -w /tmp/ipv6-capture.pcap ip6

# Save with timestamps
tcpdump -i eth0 -n -tttt -w /tmp/ipv6.pcap ip6

# Read capture file
tcpdump -r /tmp/ipv6-capture.pcap

# Read and filter capture file
tcpdump -r /tmp/ipv6-capture.pcap -n "host 2001:db8::1"

# Rotate capture files (100MB each, keep 10)
tcpdump -i eth0 -n -w /tmp/ipv6-%Y%m%d-%H%M%S.pcap -C 100 -W 10 ip6

# Save first 1000 packets
tcpdump -i eth0 -n -c 1000 -w /tmp/ipv6-sample.pcap ip6
```

## Reading ICMPv6 Output

Example tcpdump output for NDP:

```text
# Neighbor Solicitation
14:23:01.123456 IP6 fe80::1 > ff02::1:ff00:1: ICMP6, neighbor solicitation,
   who has 2001:db8::1, length 32

# Neighbor Advertisement
14:23:01.124567 IP6 2001:db8::1 > fe80::1: ICMP6, neighbor advertisement,
   tgt is 2001:db8::1, length 32

# Router Advertisement
14:23:05.000000 IP6 fe80::1 > ff02::1: ICMP6, router advertisement,
   length 64

# ping6 request
14:23:10.001234 IP6 2001:db8::100 > 2001:db8::1: ICMP6, echo request,
   seq 1, length 64
```

## Practical Diagnostic Scripts

```bash
#!/bin/bash
# capture-ipv6-diagnostics.sh

IFACE="${1:-eth0}"
DURATION="${2:-30}"
OUTPUT="/tmp/ipv6-diag-$(date +%Y%m%d-%H%M%S).pcap"

echo "Capturing IPv6 diagnostics on $IFACE for ${DURATION}s..."
echo "Output: $OUTPUT"

# Capture all IPv6 including NDP, DHCP, and data
tcpdump -i "$IFACE" -n -w "$OUTPUT" \
    "ip6" &

TCPDUMP_PID=$!
sleep "$DURATION"
kill $TCPDUMP_PID 2>/dev/null

echo "Capture complete. Analyzing..."

# Show NDP summary
echo ""
echo "=== NDP Traffic ==="
tcpdump -r "$OUTPUT" -n -v "ip6 proto 58" 2>/dev/null | \
    grep "ICMP6" | sort | uniq -c | sort -rn

# Show unique IPv6 hosts seen
echo ""
echo "=== Unique IPv6 Hosts ==="
tcpdump -r "$OUTPUT" -n "ip6" 2>/dev/null | \
    awk '{print $3}' | sort | uniq
```

## Conclusion

`tcpdump` with the `ip6` filter captures all IPv6 traffic efficiently. Use `ip6 proto 58` for ICMPv6/NDP capture, `host` for address filtering, and `port` for service-level filtering. Save captures with `-w` for later analysis in Wireshark. The combination of tcpdump's live capture with Wireshark's graphical analysis provides comprehensive IPv6 troubleshooting capability.
