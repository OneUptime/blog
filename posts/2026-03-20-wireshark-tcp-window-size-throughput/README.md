# How to Analyze TCP Window Size and Throughput in Wireshark

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Wireshark, TCP, Window Size, Throughput, Network Analysis, Performance

Description: Use Wireshark's TCP stream analysis, IO graphs, and expert analyzer to diagnose TCP window size limitations and identify throughput bottlenecks in IPv4 connections.

## Introduction

TCP throughput is limited by three factors: bandwidth, latency (RTT), and the TCP window size. A small receive window caps throughput to `window_size / RTT` bytes/second, regardless of available bandwidth. Wireshark provides powerful tools to visualize these metrics and identify bottlenecks.

## Capturing the Right Traffic

```bash
# Capture TCP traffic from a specific host with tcpdump

sudo tcpdump -i eth0 -w capture.pcap host 10.0.0.5 and tcp

# Or specify a port
sudo tcpdump -i eth0 -w capture.pcap tcp port 443
```

## TCP Stream Analysis in Wireshark

1. Open the capture file in Wireshark
2. Right-click any packet in the target TCP flow
3. Select **Follow > TCP Stream** to see the reassembled stream
4. Or go to **Statistics > TCP Stream Graphs > Time-Sequence (tcptrace)**

## Key Display Filters

```wireshark
# Filter for a specific TCP connection
tcp.stream eq 0

# Show only window update packets (zero window updates = bottleneck)
tcp.flags.ack == 1 and tcp.window_size == 0

# Show TCP window size issues
tcp.analysis.window_full or tcp.analysis.zero_window

# Show TCP retransmissions
tcp.analysis.retransmission or tcp.analysis.fast_retransmission

# Show packets with zero window (receiver buffer full)
tcp.window_size_value == 0
```

## Analyzing Window Size Over Time

1. Click **Statistics > TCP Stream Graphs > Window Scaling**
2. Select the TCP stream to analyze
3. The graph shows:
   - Blue line: Sequence numbers sent (throughput)
   - Red line: Window size advertised by receiver

A flat blue line with a declining red line indicates the receiver's window is the bottleneck.

## IO Graph for Throughput

1. Go to **Statistics > IO Graph**
2. Set the Y-axis to **Bytes/Tick** for throughput view
3. Add a filter line for your TCP stream:
   ```text
   tcp.stream eq 0
   ```
4. Set the tick interval to 100ms or 1s
5. The resulting graph shows throughput over time

## Identifying Window Size Bottleneck with tshark

```bash
# Extract TCP window sizes for a specific stream
tshark -r capture.pcap \
  -Y "tcp.stream==0" \
  -T fields \
  -e frame.time_relative \
  -e ip.src \
  -e tcp.window_size \
  -e tcp.len \
  | head -50

# Calculate theoretical max throughput
# For window=65535 bytes and RTT=10ms:
# Max throughput = 65535 / 0.010 = 6,553,500 bytes/s
#                = ~6.5 MB/s = ~52.4 Mbit/s
# (use Wireshark's measured RTT from TCP stream stats)
```

## Checking for Window Scaling

TCP Window Scaling (RFC 7323, which obsoletes RFC 1323) allows window sizes larger than 65535 bytes:

```wireshark
# Find TCP SYN packets to check if window scaling is negotiated
tcp.flags.syn == 1 and tcp.options.wscale
```

```bash
# With tshark
tshark -r capture.pcap \
  -Y "tcp.flags.syn==1" \
  -T fields \
  -e ip.src \
  -e tcp.window_size \
  -e tcp.options.wscale_val
```

## TCP Stream Statistics

1. Right-click a packet in the stream
2. **Follow > TCP Stream**
3. Click **TCP Stream Statistics** button (or **Statistics > TCP Stream Graphs > Round-Trip Time**)

Key metrics:
- **Bytes in flight**: Data sent but not yet acknowledged (should be close to window size for good throughput)
- **RTT**: Round-trip time
- **Throughput**: Statistics > TCP Stream Graphs > Throughput

## Diagnosing Common Problems

| Symptom | Wireshark Indicator | Cause |
|---------|---------------------|-------|
| Low throughput | Window size not growing | Window scaling not negotiated |
| Sudden throughput drop | `tcp.analysis.zero_window` | Receiver buffer full |
| Intermittent slowness | `tcp.analysis.retransmission` | Packet loss causing retransmit |
| High latency spikes | RTT graph spikes | Network congestion |

## Conclusion

Wireshark's TCP stream analysis tools turn raw packet captures into actionable performance insights. The combination of window size graphs, IO throughput graphs, and expert analyzer messages lets you pinpoint whether a throughput problem is caused by the receiver window, network congestion, or packet loss.
