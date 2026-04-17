# How to Analyze IPv6 TCP Connections in Wireshark

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Wireshark, IPv6, TCP, Packet Analysis, Connection Tracking, Network Debugging

Description: A guide to analyzing TCP connections over IPv6 in Wireshark, including connection establishment, teardown, retransmissions, and performance analysis.

TCP over IPv6 behaves the same as over IPv4, but the underlying addressing is different. Wireshark's TCP analysis features work identically for IPv6, allowing you to track connection state, detect issues, and measure performance.

## Display Filters for IPv6 TCP

```wireshark
# All TCP traffic over IPv6

ipv6 && tcp

# IPv6 TCP to a specific server on HTTPS
ipv6.dst == 2001:db8::1 && tcp.dstport == 443

# IPv6 TCP SYN packets (connection initiations)
ipv6 && tcp.flags.syn == 1 && tcp.flags.ack == 0

# IPv6 TCP SYN-ACK (server responses)
ipv6 && tcp.flags.syn == 1 && tcp.flags.ack == 1

# IPv6 TCP RST packets (connection resets)
ipv6 && tcp.flags.reset == 1

# IPv6 TCP FIN packets (graceful close)
ipv6 && tcp.flags.fin == 1
```

## Analyzing the TCP 3-Way Handshake Over IPv6

```wireshark
# See the complete connection establishment for a specific IPv6 pair
(ipv6.src == 2001:db8::2 || ipv6.dst == 2001:db8::2) &&
tcp && (tcp.flags.syn == 1 || tcp.flags.ack == 1)
```

In the packet list you should see:
1. `SYN` from client to server
2. `SYN-ACK` from server to client
3. `ACK` from client (handshake complete)

## Follow an IPv6 TCP Stream

1. Right-click any TCP packet in an IPv6 conversation
2. Select **Follow → TCP Stream**
3. Wireshark shows the full application-layer conversation (HTTP, etc.)

Or apply the stream filter directly:
```wireshark
# Filter by TCP stream number
tcp.stream == 5

# This applies automatically when you use Follow TCP Stream
```

## Detecting TCP Issues Over IPv6

```wireshark
# Retransmissions (packet loss indicator)
ipv6 && tcp.analysis.retransmission

# Duplicate ACKs (often precedes fast retransmit)
ipv6 && tcp.analysis.duplicate_ack

# TCP zero window (receiver buffer full)
ipv6 && tcp.analysis.zero_window

# TCP connection resets
ipv6 && tcp.flags.reset == 1

# Out-of-order segments
ipv6 && tcp.analysis.out_of_order

# Reused TCP ports (new connection on a port still in TIME_WAIT)
ipv6 && tcp.analysis.reused_ports
```

## Measuring TCP Performance Over IPv6

```wireshark
# Calculate RTT using TCP timestamp-based analysis
# In Wireshark, go to Statistics → TCP Stream Graphs → Time/Sequence (Stevens)
# Apply: ipv6 && tcp.stream == <n>
```

Key metrics visible in TCP graphs:
- **Time/Sequence**: shows throughput and gaps
- **Throughput**: overall bandwidth per stream
- **RTT**: latency between SYN and SYN-ACK

## Comparing IPv4 vs IPv6 TCP Performance

```bash
# Measure average TCP connection setup time over IPv6
tshark -r capture.pcap \
  -Y "ipv6 && tcp.flags.syn == 1 && tcp.flags.ack == 1" \
  -T fields -e tcp.time_relative | \
  awk '{sum+=$1; count++} END {print "Avg SYN-ACK time:", sum/count, "s"}'
```

## Count TCP Connections Over IPv6

```bash
# Count unique IPv6 TCP connections (by SYN packets)
tshark -r capture.pcap \
  -Y "ipv6 && tcp.flags.syn == 1 && tcp.flags.ack == 0" \
  -T fields -e ipv6.src -e ipv6.dst -e tcp.dstport | \
  sort | uniq -c | sort -rn | head -20
```

## IPv6 TCP Port Scan Detection

```wireshark
# Many SYN packets from one IPv6 source to different ports (port scan)
ipv6.src == 2001:db8::bad && tcp.flags.syn == 1

# Many RST responses (ports closed, indicating scan)
ipv6.dst == 2001:db8::bad && tcp.flags.reset == 1
```

## IPv6 TCP MSS Analysis

TCP Maximum Segment Size (MSS) is negotiated during the handshake. For IPv6, the default MSS is usually 1440 bytes (1500 MTU - 40 byte IPv6 header - 20 byte TCP header):

```wireshark
# Show TCP options including MSS in SYN packets
ipv6 && tcp.flags.syn == 1 && tcp.options.mss_val

# Filter by specific MSS value
ipv6 && tcp.options.mss_val < 1440    # Possibly tunnel path
ipv6 && tcp.options.mss_val == 1440   # Standard Ethernet
```

Wireshark's comprehensive TCP analysis capabilities apply fully to IPv6 connections, making it straightforward to diagnose performance issues, connection failures, and anomalies in any IPv6 TCP-based application.
