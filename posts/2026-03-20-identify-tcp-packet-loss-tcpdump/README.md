# How to Identify TCP Packet Loss with tcpdump

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: TCP, tcpdump, Packet Loss, Networking, Troubleshooting, Analysis

Description: Use tcpdump to capture TCP traffic and identify packet loss through sequence number gaps, duplicate ACKs, and retransmission patterns.

## Introduction

tcpdump gives you packet-level visibility into a TCP flow. By examining sequence numbers, ACK numbers, retransmissions, and duplicate ACKs in a capture, you can infer likely loss on a connection, see when recovery started, and distinguish fast retransmission from timer-based retransmission. This is one of the most precise ways to confirm suspected loss from a capture point, but the result still depends on where the trace was taken and whether the capture itself missed packets.

## Basic Capture for Loss Analysis

```bash
# Capture TCP traffic with a specific host

tcpdump -i eth0 -n -w /tmp/loss_analysis.pcap 'tcp and host 10.20.0.5'

# Run during a period when loss is occurring
# Then analyze the capture

# Quick capture and analysis (no file)
tcpdump -i eth0 -n -S 'tcp and port 8080 and host 10.20.0.5' | head -50
# -S = absolute sequence numbers (easier to inspect sequence progression)
```

## Using Sequence Numbers with TCP Analysis Flags

```bash
# Show sequence numbers together with TCP analysis flags
tshark -r /tmp/loss_analysis.pcap \
  -Y "tcp && ip.dst == 10.20.0.5" \
  -T fields \
  -e frame.number \
  -e ip.src \
  -e tcp.seq \
  -e tcp.len \
  -e tcp.ack \
  -e tcp.analysis.lost_segment \
  -e tcp.analysis.retransmission \
  -e tcp.analysis.fast_retransmission \
  -e tcp.analysis.spurious_retransmission

# Read this as a timeline. Sequence numbers show what data was sent,
# while the TCP analysis flags show where Wireshark suspects missing
# segments or retransmissions in this capture.
```

## Detecting Duplicate ACKs (Loss Signals)

```bash
# Duplicate ACKs suggest a gap ahead of the receiver, although reordering can
# also produce them
tshark -r /tmp/loss_analysis.pcap \
  -Y "tcp.analysis.duplicate_ack" \
  -T fields \
  -e frame.number \
  -e ip.src \
  -e tcp.ack \
  -e tcp.analysis.duplicate_ack_num

# Duplicate ACK #3 is the traditional fast retransmit threshold
```

## Wireshark Packet Loss Filters

```text
# In Wireshark:

# Find suspected retransmissions
tcp.analysis.retransmission or tcp.analysis.fast_retransmission or tcp.analysis.spurious_retransmission

# Find the duplicate ACKs at or beyond the traditional fast retransmit threshold
tcp.analysis.duplicate_ack_num >= 3

# Find packets where previous segment(s) were not captured at this capture point
tcp.analysis.lost_segment

# Combined retransmission and capture-gap view
tcp.analysis.lost_segment or tcp.analysis.fast_retransmission or tcp.analysis.retransmission or tcp.analysis.spurious_retransmission
```

## Automated Loss Detection Script

```bash
#!/bin/bash
# Capture and report retransmission statistics for a connection

TARGET="10.20.0.5"
PORT="8080"
DURATION=30

echo "Capturing $DURATION seconds of traffic to $TARGET:$PORT..."
tcpdump -i eth0 -n -w /tmp/loss_test.pcap \
  "tcp and host $TARGET and port $PORT" &
TCPDUMP_PID=$!

sleep $DURATION
kill $TCPDUMP_PID 2>/dev/null
wait $TCPDUMP_PID 2>/dev/null

echo "Analyzing capture..."
tshark -r /tmp/loss_test.pcap -q -z io,stat,1 2>/dev/null | head -20

# Count retransmitted packets seen in the capture
RETRANS=$(tshark -r /tmp/loss_test.pcap \
  -Y "tcp.analysis.retransmission or tcp.analysis.fast_retransmission or tcp.analysis.spurious_retransmission" \
  2>/dev/null | wc -l)

TOTAL=$(tshark -r /tmp/loss_test.pcap 2>/dev/null | wc -l)

echo "Total packets: $TOTAL"
echo "Retransmitted packets: $RETRANS"
if [ $TOTAL -gt 0 ]; then
    echo "Retransmission rate: $(echo "scale=2; $RETRANS * 100 / $TOTAL" | bc)%"
fi
```

## Conclusion

tcpdump and tshark provide strong evidence of TCP loss when you correlate sequence numbers with retransmissions and duplicate ACK patterns. A command such as `tshark -Y "tcp.analysis.retransmission or tcp.analysis.fast_retransmission or tcp.analysis.spurious_retransmission"` counts retransmitted packets seen in a capture, not distinct loss events. Combined with the sequence number timeline and duplicate ACKs, you can determine when recovery started and whether the TCP connection recovered via fast retransmission or a later timeout. Interpret `tcp.analysis.lost_segment` carefully: it means packets were not seen in the capture, which can also happen because the trace started late or the capture point missed traffic.
