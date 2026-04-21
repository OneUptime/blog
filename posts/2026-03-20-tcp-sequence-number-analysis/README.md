# How to Use TCP Sequence Number Analysis for Debugging

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: TCP, Sequence Numbers, Debugging, Wireshark, Packet Analysis, Networking

Description: Use TCP sequence number analysis in Wireshark and tcpdump to identify retransmissions, reordering, gaps, and duplicate data in captured network traffic.

## Introduction

TCP sequence numbers track every byte sent on a connection. When something goes wrong - lost packets, reordering, retransmissions - the sequence number timeline reveals exactly what happened. Wireshark builds time-sequence graphs automatically; tcpdump lets you trace sequence numbers in the terminal. Both approaches turn raw packet captures into a clear narrative of connection behavior.

## Understanding Sequence Number Basics

```text
Initial Sequence Number (ISN): generated 32-bit value, carried in SYN
First data byte after SYN: ISN + 1
Subsequent data segments: previous data sequence + payload bytes sent
ACK number N: "I've received bytes before N, send me byte N next"

Example flow:
SYN:        seq=1000, len=0    → ISN is 1000
SYN-ACK:    seq=5000, ack=1001 → server ISN=5000, ACKs client's SYN
Data:       seq=1001, len=500  → bytes 1001-1500
ACK:        ack=1501           → "received through byte 1500"
Data:       seq=1001, len=500  → RETRANSMIT! Same seq sent again
```

## tcpdump Sequence Number Analysis

```bash
# Capture with sequence numbers shown

tcpdump -i eth0 -n -S host 10.20.0.5 and port 80
# -S shows absolute sequence numbers (easier for correlation)

# Show relative sequence numbers (default, easier to read)
tcpdump -i eth0 -n host 10.20.0.5 and port 80

# With default relative sequence numbers, output shows:
# Flags [S], seq 3232323, win 65535
# Flags [S.], seq 1234567, ack 3232324, win 65535
# Flags [.], ack 1
# Flags [P.], seq 1:501, ack 1, length 500   ← data: bytes 1-500

# Spot possible retransmissions in one direction: same data seq range appearing twice
tcpdump -tt -r capture.pcap -n 'tcp and src host 10.20.0.5 and src port 80' | \
  sed -n 's/.* seq \([0-9][0-9]*:[0-9][0-9]*\),.*/\1/p' | sort | uniq -d
# Duplicate data sequence ranges are retransmission candidates; confirm with ACKs/timing
```

## Wireshark Time-Sequence Graph

```text
In Wireshark:
1. Open capture file
2. Select a packet in the TCP stream
3. Statistics → TCP Stream Graphs → Time-Sequence (Stevens)

What to look for:
- Normal: smooth upward diagonal line (bytes increasing over time)
- Retransmission: backtrack to an earlier sequence value (same data resent)
- Stall or zero window: flat line or repeated same sequence values (no forward progress)
- Slow start: visible exponential growth at start
- Congestion event: sudden slope reduction after loss
```

## Identifying Problems from Sequence Numbers

```bash
# In Wireshark display filters:

# Show all retransmissions
tcp.analysis.retransmission

# Show out-of-order segments (receiver got higher seq before lower)
tcp.analysis.out_of_order

# Previous segment(s) not captured; a sequence gap in the trace
tcp.analysis.lost_segment

# Duplicate ACKs (often caused by a gap or out-of-order data)
tcp.analysis.duplicate_ack

# Combined: all TCP analysis events
tcp.analysis.flags
```

## Sequence Number Gaps and Reordering

```bash
# A gap in sequence numbers means:
# - Segment was lost (most common)
# - Segment arrived out of order (reordering)
# - Segment is still in transit
# - Segment was not captured by your capture point

# Distinguish loss from reordering:
# Loss: gap is not filled by the original segment → sender retransmits after duplicate ACKs or RTO
# Reorder: gap fills later without retransmission, often quickly

# Check for out-of-order or retransmitted data in one direction:
tcpdump -tt -r capture.pcap -n 'tcp and src host 10.20.0.5 and src port 80' | \
  sed -n 's/^\([^ ]*\).* seq \([0-9][0-9]*\):\([0-9][0-9]*\),.*/\1 \2 \3/p' | \
  awk 'NR > 1 && $2 < last_end { print "earlier seq after later data:", "time=" $1, "seq=" $2 ":" $3, "previous_end=" last_end } { if ($3 > last_end) last_end=$3 }'
# Lower sequence ranges arriving after later bytes can indicate reordering or retransmission
```

## Calculating Throughput from Sequence Numbers

```bash
# From one direction in a tcpdump capture, calculate sequence-byte throughput:
tcpdump -tt -r capture.pcap -n 'tcp and src host 10.20.0.5 and src port 80' | \
  sed -n 's/^\([^ ]*\).* seq \([0-9][0-9]*\):\([0-9][0-9]*\),.*/\1 \2 \3/p' | \
  awk 'NR==1{first=$1; start_seq=$2}
       {last=$1; if ($3 > end_seq) end_seq=$3}
       END{
         duration=last-first
         if (duration <= 0) { print "Need at least two data packets"; exit }
         bytes=end_seq-start_seq
         mbps=bytes*8/duration/1e6
         printf "Duration: %.2f sec, Bytes: %d, Throughput: %.2f Mbps\n",
           duration, bytes, mbps
       }'
```

## Conclusion

TCP sequence number analysis transforms "something is slow" into "packet at byte offset X was retransmitted at time T." Use `tcpdump -S` to trace absolute sequences in terminal. Use Wireshark's time-sequence graph for visual analysis. Duplicate data sequence ranges are retransmission candidates; gaps with subsequent fill-in often mean reordering; gaps that stay open usually mean loss or missing capture data. This level of analysis makes it possible to pinpoint exactly which packets are being lost and when.
