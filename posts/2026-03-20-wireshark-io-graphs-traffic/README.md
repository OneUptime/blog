# How to Use Wireshark IO Graphs for Traffic Analysis

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Wireshark, IO Graphs, Networking, Traffic Analysis, Performance

Description: Use Wireshark's IO Graphs to visualize traffic rates over time, overlay multiple protocol filters, and identify traffic spikes, drops, and retransmission events.

IO Graphs transform packet lists into time-series charts, making it easy to see traffic patterns, correlate events with timestamps, and visualize the relationship between normal traffic and anomalies like retransmissions.

## Open IO Graphs

```text
Statistics → I/O Graph

The graph window shows:
  - X axis: Time (seconds from capture start)
  - Y axis: Packets/second or bits/second
  - Default: all traffic as one line

Controls:
  Interval: time bucket size (1ms to 10min)
  Scale: Y-axis scale
  Filter: Wireshark display filter for each graph line
```

## Add Custom Graph Lines

The power of IO Graphs comes from overlaying filtered views:

```text
In the IO Graph window, bottom panel shows graph lines:

Line 1 (default): [Enabled] [Color] [Filter: empty] → all traffic
Add Line 2:       [Enabled] [Color] [Filter: tcp.analysis.retransmission]
Add Line 3:       [Enabled] [Color] [Filter: tcp.port == 443]
Add Line 4:       [Enabled] [Color] [Filter: dns]

Each line shows the rate of packets matching that filter over time.
```

## Common Graph Combinations

```wireshark
# Graph 1: Total TCP traffic

tcp

# Graph 2: Retransmissions (should be near zero)
tcp.analysis.retransmission

# Graph 3: HTTP traffic
http

# Graph 4: DNS traffic
dns

# Overlay retransmissions against total traffic to see correlation
# When total traffic spikes → do retransmissions spike too?
# Yes = congestion causing loss
```

## Analyze Bandwidth Over Time

```text
In IO Graphs:
  Y Axis → Bits/s (instead of Packets/s)
  Interval → 1 second

This shows bandwidth usage over time:
  - Sustained high bandwidth = normal transfer
  - Bursty pattern = bursty application
  - Drops to zero = connection interrupted
  - Spikes + retransmissions = congestion events
```

## Identify Traffic Spikes and Drops

```text
Steps:
1. Open IO Graph
2. Set interval to 0.1s (100ms) for high resolution
3. Look for:
   - Sudden spike: burst of traffic (DDoS, scan, large transfer start)
   - Gap/zero: connection dropped or traffic stopped
   - Regular pattern: periodic application behavior
   - Irregular retransmission spikes: lossy link

Click on the graph at the spike time
  → Wireshark jumps to that time in the packet list
  → Inspect specific packets causing the spike
```

## Export Graph Data

```bash
In the IO Graph window:
  Copy → Copies the graph image to clipboard
  Save As → Saves as PNG or SVG

Or export underlying data using tshark:
```

```bash
# Export packet rates per second using tshark
tshark -r capture.pcap -q -z io,stat,1

# Export with filter
tshark -r capture.pcap -q -z io,stat,1,"tcp.analysis.retransmission"

# Output (formatted with ASCII borders):
# =====================================================
# | IO Statistics                                     |
# |                                                   |
# | Duration: 60.000 secs                             |
# | Interval:  1.000 secs                             |
# |                                                   |
# | Col 1: tcp.analysis.retransmission                |
# |                     |1           |                |
# | Interval            | Frames     |                |
# |--------------------------------------------       |
# | 0.000 <>  1.000     |      0     |                |
# | 1.000 <>  2.000     |      2     |                |
# | 2.000 <>  3.000     |      0     |                |
# | 3.000 <>  4.000     |     15     | ← spike at 3s  |
# =====================================================
```

IO Graphs reveal the temporal relationship between events - showing not just that retransmissions occurred, but exactly when and whether they correlate with traffic changes.
