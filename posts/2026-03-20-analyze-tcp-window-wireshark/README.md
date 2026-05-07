# How to Analyze TCP Window Size with Wireshark

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Wireshark, TCP, Networking, Packet Analysis, Performance, Troubleshooting

Description: Learn how to analyze TCP window size, window scaling, and zero-window events in Wireshark to diagnose throughput and performance issues.

---

The TCP receive window controls how much unacknowledged data can be in-flight at once. A shrinking or zero window can reduce TCP throughput. Wireshark makes it easy to spot window-related performance problems.

---

## Display Filters for TCP Window Analysis

```text
# Show all TCP traffic

tcp

# Show zero window packets (receiver advertising no available buffer space)
tcp.analysis.zero_window

# Show window update packets
tcp.analysis.window_update

# Show TCP window full packets
tcp.analysis.window_full

# Show packets with TCP analysis flags
tcp.analysis.flags
```

---

## Enable TCP Window Scaling Dissection

TCP window scaling extends the advertised window beyond 65535 bytes. Wireshark automatically applies the negotiated scale factor after the SYN/SYN-ACK exchange. The SYN and SYN/ACK window fields themselves are not scaled.

```text
# Verify window scaling options during handshake
tcp.options.wscale

# Check actual scaled window size in packet details pane:
# Transmission Control Protocol
#   Window: 1024
#   Calculated window size: 131072  ← scaled value
#   Window size scaling factor: 128
```

---

## Visualize Window Size Over Time

1. Select a TCP stream packet.
2. Right-click → **Follow** → **TCP Stream** to apply a display filter for that stream.
3. Open **Statistics** → **TCP Stream Graphs** → **Window Scaling**.
4. The graph shows window size over time - a plateau near zero indicates the receiver is advertising little or no available buffer space.

---

## Common TCP Window Problems

| Symptom                  | Wireshark Filter                  | Cause                                |
|--------------------------|-----------------------------------|--------------------------------------|
| Zero window              | `tcp.analysis.zero_window`        | Receiver buffer exhausted            |
| Window full              | `tcp.analysis.window_full`        | Sender hit the receiver window limit |
| Zero window probe        | `tcp.analysis.zero_window_probe`  | Sender probing to detect recovery    |
| Keep-alive              | `tcp.analysis.keep_alive`         | Idle connection maintenance          |

---

## Inspect Window Size in Packet Details

Click on a TCP packet and expand the **Transmission Control Protocol** section:

```text
Transmission Control Protocol
  Source Port: 443
  Destination Port: 52400
  Window: 502
  Calculated window size: 128512
  Window size scaling factor: 256
```

A `Calculated window size` near 0 means the receiver is advertising little or no available buffer space.

---

## Summary

Use `tcp.analysis.zero_window` and `tcp.analysis.window_full` filters to quickly locate TCP throughput bottlenecks in Wireshark. The TCP Stream Graph → Window Scaling view provides a visual timeline of window size changes. Correlate zero-window events with high latency or retransmissions to pinpoint whether the bottleneck is receiver-side buffer exhaustion or network congestion.
