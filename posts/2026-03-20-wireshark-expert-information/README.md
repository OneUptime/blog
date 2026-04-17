# How to Use Wireshark Expert Information to Find Network Problems

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Wireshark, Expert Information, Networking, Diagnostic, TCP, Performance

Description: Use Wireshark's Expert Information panel to automatically identify network problems including TCP retransmissions, connection resets, malformed packets, and application errors.

The Expert Information panel is Wireshark's automated analysis engine. It scans every packet and flags anomalies by severity level - giving you an instant summary of what's wrong in a capture without manually reading thousands of packets.

## Open Expert Information

```text
Method 1: Analyze → Expert Information

Method 2: Click the colored circle in the bottom-left of Wireshark
  (the circle color reflects the highest severity in the capture)
  Green = normal, Yellow = warning, Red = error

Method 3: When a capture has errors, the bottom status bar shows
  a colored indicator - click it to open Expert Information
```

## Severity Levels

```text
Color    Level     Meaning
-------  --------  ------------------------------------------
Red      Error     Serious problems (malformed packets, dissector errors)
Yellow   Warn      Potential issues (RSTs, zero window, out-of-order)
Cyan     Note      Notable events (retransmissions, duplicate ACKs)
Blue     Chat      Informational (SYN, FIN, window updates)
```

## Common Expert Information Messages

```yaml
Message                    Severity  Meaning
-----------------------    --------  --------------------------------------
TCP Retransmission         Note      Packet resent = packet loss
Previous segment lost      Warn      Gap detected in TCP stream
TCP ACKed unseen segment   Warn      Possible capture started mid-stream
Duplicate ACK              Note      Loss signal, retransmission coming
TCP Fast Retransmission    Note      Loss: 3 dup ACKs received
Out-Of-Order               Warn      Reordering or loss
Connection reset (RST)     Warn      Unexpected RST
Window Full                Warn      Receiver buffer full (flow control)
Zero Window                Warn      Receiver buffer empty (sender paused)
TCP Window Update          Chat      Receiver reopening window
Application response time  Note      Server took too long to respond
DNS NXDOMAIN               Note      Domain not found
HTTP server error (5xx)    Note      Application error
```

## Use Expert Information as Starting Point

```text
Workflow:
1. Open capture
2. Open Expert Information
3. Sort by Severity (Error first)
4. Click on an error entry
   → Wireshark jumps to that packet in the main list
5. Examine the packet and surrounding context
   → Use "Follow TCP Stream" for full context
   → Check IO Graphs to see if errors correlate with traffic spikes

Repeat for all Error entries, then Warning entries.
```

## Filter Based on Expert Information

Click "Prepare Filter" in the Expert Information dialog to create a display filter:

```wireshark
# These filters correspond to Expert Information categories

# All TCP errors

tcp.analysis.flags

# Retransmissions
tcp.analysis.retransmission

# Connection resets
tcp.flags.reset == 1

# Window issues
tcp.analysis.zero_window or tcp.analysis.window_full

# All expert info (any flag)
expert
```

## Command-Line Expert Analysis with tshark

```bash
# Print expert information from a PCAP
tshark -r capture.pcap -q -z expert

# Output:
# === Expert Information ===
#
# Warnings (23):
#   tcp.analysis.out_of_order (8 occurrences)
#   tcp.analysis.ack_lost_segment (12 occurrences)
#   tcp.connection.rst (3 occurrences)
#
# Notes (20):
#   tcp.analysis.retransmission (5 occurrences)
#   tcp.analysis.duplicate_ack (15 occurrences)

# Filter by severity (errors, warnings, notes, or chats):
tshark -r capture.pcap -q -z expert,warn
```

## Export Expert Information

```bash
In Expert Information dialog:
  Right-click → Export to File
  → Saves as CSV or plain text for documentation or ticketing
```

Expert Information should be your first action after opening a capture - it immediately flags the most serious problems, saving you hours of manual packet-by-packet inspection.
