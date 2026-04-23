# How to Reassemble Fragmented IPv4 Packets in Wireshark

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: IPv4, Fragmentation, Wireshark, Packet Analysis, Reassembly, Networking

Description: Use Wireshark's automatic fragment reassembly to analyze the original unfragmented data, view complete payloads, and troubleshoot fragmentation issues in packet captures.

## Introduction

Wireshark automatically reassembles IPv4 fragments by default. When you capture fragmented traffic, Wireshark displays individual fragments as they arrive on the wire, and also shows a "reassembled" view at the last fragment with the complete original payload. Understanding how to read Wireshark's fragment display and how to work with fragment captures is essential for analyzing protocol behavior in fragmented environments.

## How Wireshark Displays Fragments

```text
In the packet list, fragmented packets appear as:

Frame 100: IP fragment (offset=0, MF=1)
  Source: 10.0.0.1
  Fragment Offset: 0
  More Fragments: Yes

Frame 101: IP fragment (offset=1480)
  Source: 10.0.0.1
  Fragment Offset: 1480
  More Fragments: Yes

Frame 102: IP fragment (offset=2960)
  Source: 10.0.0.1
  Fragment Offset: 2960
  More Fragments: No

Frame 102 (expanded in detail pane):
  [3 IPv4 Fragments (3008 bytes): #100(1480), #101(1480), #102(48)]
  [Reassembled IPv4 length: 3008]       ← Reassembly completed here
  UDP, Source Port: 5000
  Data (3000 bytes)                     ← Full original payload visible
```

## Configure Wireshark Fragment Reassembly

```text
In Wireshark:
  Edit → Preferences → Protocols → IPv4

  ☑ Reassemble fragmented IPv4 datagrams
  (This is enabled by default)

  If disabled: you see individual fragments, and the first fragment may
               still show only the transport header and partial payload
  If enabled:  you still see the fragments, and the last fragment also
               shows the reassembled packet
```

## Wireshark Display Filters for Fragments

```text
# Show all fragment frames:

ip.flags.mf == 1 or ip.frag_offset > 0

# Show first fragments only:
ip.flags.mf == 1 and ip.frag_offset == 0

# Show last fragments (where reassembly is displayed):
ip.flags.mf == 0 and ip.frag_offset > 0

# Show frames that contain a reassembled IPv4 payload:
ip.reassembled.data

# Find fragment sets with reassembly problems:
ip.fragment.error
```

## Analyze Reassembled Data

```bash
# Capture fragmented traffic:
# Generate a large UDP datagram for fragmentation testing:
python3 -c "
import socket
s = socket.socket(socket.AF_INET, socket.SOCK_DGRAM)
# Fragmentation depends on path MTU and sender settings:
s.sendto(b'X' * 3000, ('10.20.0.5', 5000))
s.close()
"

# In Wireshark:
# 1. Open capture
# 2. Find the last fragment (for example: ip.reassembled.data)
# 3. Click on it
# 4. In detail pane: see full reassembled UDP payload
# 5. Right-click → Copy → All Visible Items to export
```

## Export Reassembled Payload

```bash
# Export fragment payload from command line with tshark:

# Show reassembled IPv4 payload as hex bytes:
tshark -r capture.pcap -2 \
  -Y "ip.reassembled.data" \
  -T fields -e @ip.reassembled.data

# Export the first reassembled IPv4 payload as binary:
tshark -r capture.pcap -2 \
  -Y "ip.reassembled.data" \
  -T fields -e @ip.reassembled.data | \
  head -n 1 | tr -d ':\n' | xxd -r -p > /tmp/reassembled_payload.bin
# Note: @<field> prints the byte sequence as hex bytes

# Decode reassembled DNS (fragmented):
tshark -r capture.pcap -2 \
  -Y "dns and ip.reassembled.data" \
  -V
```

## Identify Missing Fragments

```bash
# Missing fragments prevent reassembly:
# Wireshark marks incomplete reassembly in Expert Info

# In Wireshark:
# Analyze → Expert Info
# Look for reassembly-related entries in the "Reassemble" group

# Using tshark to show fragment reassembly errors:
tshark -r capture.pcap -Y "ip.fragment.error" -V

# List fragment sets so you can verify completeness:
tshark -r capture.pcap -T fields \
  -e frame.number -e ip.src -e ip.dst -e ip.proto -e ip.id \
  -e ip.frag_offset -e ip.flags.mf \
  -Y "ip.flags.mf == 1 or ip.frag_offset > 0" | sort | head -30
# Group by ip.src, ip.dst, ip.proto, and ip.id to see which fragment sets are complete

# Check for timeout-related drops:
# If you see fragment 1 and 2 but never fragment 3: packet loss
```

## tshark Fragment Statistics

```bash
# Count fragment events in a capture:
echo "Fragment Statistics:"
echo "First fragments:"
tshark -r capture.pcap -Y "ip.flags.mf == 1 and ip.frag_offset == 0" 2>/dev/null \
  | wc -l

echo "All fragments:"
tshark -r capture.pcap -Y "ip.flags.mf == 1 or ip.frag_offset > 0" 2>/dev/null \
  | wc -l

echo "Last fragments (reassembly point):"
tshark -r capture.pcap -Y "ip.flags.mf == 0 and ip.frag_offset > 0" 2>/dev/null \
  | wc -l

echo "Unique fragment sets:"
tshark -r capture.pcap -Y "ip.flags.mf == 1 or ip.frag_offset > 0" \
  -T fields -e ip.src -e ip.dst -e ip.proto -e ip.id 2>/dev/null | \
  sort -u | wc -l
```

## Conclusion

Wireshark handles IPv4 fragment reassembly automatically, showing both the individual wire-level fragments and the reassembled payload at the last fragment. Use display filter `ip.flags.mf == 1 or ip.frag_offset > 0` to find all fragment frames. A successful reassembly exposes fields such as `ip.reassembled.data` on the last fragment frame, alongside the higher-layer protocol. Expert Info reveals reassembly failures, and `tshark -2` exposes the same reassembled fields for scripted analysis of saved captures.
