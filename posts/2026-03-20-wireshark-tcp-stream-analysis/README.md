# How to Use Wireshark TCP Stream Analysis

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Wireshark, TCP, Packet Analysis, Networking, Troubleshooting

Description: Use Wireshark's TCP stream analysis features including stream following, expert analysis, and stream graphs to diagnose TCP connection problems.

## Introduction

Wireshark provides powerful built-in TCP analysis features that go beyond simple packet inspection. TCP stream following lets you see the complete conversation, expert analysis automatically identifies issues, and stream graphs visualize throughput, receive window, and round-trip time over the connection lifetime. These tools transform raw packet captures into actionable diagnostic information.

## Following a TCP Stream

```bash
# Capture traffic first

tcpdump -i eth0 -w /tmp/analysis.pcap 'tcp and port 8080'

# Open in Wireshark
wireshark /tmp/analysis.pcap
```

In Wireshark, right-click any packet → Follow → TCP Stream

```text
# Displays the full conversation as text
# Red text: client to server (requests)
# Blue text: server to client (responses)

# Very useful for:
# - Seeing HTTP requests and responses
# - Checking if application data is being transmitted
# - Identifying protocol-level errors (e.g., HTTP 503)
```

## Expert Information Analysis

```text
# Analyze → Expert Information
# Wireshark automatically categorizes issues:

# Errors (red):
#   - TCP checksum bad

# Warnings (yellow):
#   - TCP out-of-order
#   - Zero window
#   - Window full
#   - Connection reset (RST)

# Notes (cyan):
#   - TCP retransmission
#   - TCP fast retransmission
#   - TCP duplicate ACK
#   - Keep-alive
#   - Keep-alive ACK

# Chat (blue):
#   - Connection establishment
#   - Connection finish
```

## Useful Display Filters

```text
# Filter for a specific TCP stream
tcp.stream eq 5

# Show only data-carrying packets
tcp.len > 0

# Find all connection establishments
tcp.flags.syn == 1 && tcp.flags.ack == 0

# Show slow connections (RTT > 100ms)
# First note the stream number, then filter:
tcp.stream eq X && tcp.analysis.ack_rtt > 0.1

# Complete error analysis
tcp.analysis.flags && !tcp.analysis.keep_alive && !tcp.analysis.keep_alive_ack

# Find large gaps between packets (possible timeouts)
frame.time_delta > 1.0 && tcp.len > 0
```

## TCP Stream Graphs

```text
# Statistics → TCP Stream Graphs

# 1. Time-Sequence (Stevens):
#    - X axis: time
#    - Y axis: sequence number
#    - Flat = no new data (paused, window full, zero window)
#    - Backward steps = retransmissions

# 2. Throughput:
#    - Shows bitrate over time
#    - Dips = congestion events, window full, or application delays

# 3. Round-Trip Time:
#    - Shows RTT per ACK
#    - Increasing RTT = queue buildup (congestion)
#    - Sudden spikes = packet loss + timeout

# 4. Window Scaling:
#    - Shows receive window over time
#    - Drops to 0 = Zero Window events
#    - Flat maximum = window is the throughput bottleneck
```

## Exporting Stream Statistics

```bash
# Use tshark for command-line stream analysis
# List all TCP streams and their packet counts
tshark -r /tmp/analysis.pcap -T fields \
  -e tcp.stream \
  -e ip.src \
  -e ip.dst \
  -e tcp.srcport \
  -e tcp.dstport \
  2>/dev/null | sort -u | head -20

# Analyze a specific stream (stream 0)
tshark -r /tmp/analysis.pcap -Y "tcp.stream eq 0" \
  -T fields \
  -e frame.time_relative \
  -e tcp.seq \
  -e tcp.ack \
  -e tcp.len \
  -e tcp.analysis.ack_rtt \
  2>/dev/null | head -50
```

## Conclusion

Wireshark's TCP stream analysis features turn packet captures into diagnostic stories. Follow TCP Stream shows what the application actually sent. Expert Information flags all detected issues with severity ratings. Stream Graphs visualize throughput, RTT, and window size over time, making it easy to spot when performance degraded and correlate it with specific events in the packet timeline.
