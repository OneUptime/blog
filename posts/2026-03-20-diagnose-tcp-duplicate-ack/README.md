# How to Diagnose TCP Duplicate ACK Issues

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: TCP, Duplicate ACK, Networking, Troubleshooting, Wireshark, SACK

Description: Understand why TCP duplicate ACKs are generated, how they signal packet loss or reordering, and how to use them to diagnose network problems.

## Introduction

A TCP duplicate ACK is sent when the receiver gets a packet that is out of order - the expected sequence number hasn't arrived yet, but a later one has. The receiver repeats the cumulative ACK for the next sequence number it is still waiting for. Three consecutive duplicate ACKs trigger fast retransmit. While normal in small quantities, excessive duplicate ACKs signal consistent packet loss or reordering that needs investigation.

## When Duplicate ACKs are Generated

```text
Normal:
Sender: 1, 2, 3, 4, 5 (in order)
ACK:    2, 3, 4, 5, 6 (no duplicates)

Packet 3 lost:
Sender: 1, 2,    4, 5, 6
ACK:    2, 3, 3, 3, 3  ← dup ACKs for 3 (receiver waiting for 3)
                       ^^ 3 dup ACKs trigger fast retransmit of packet 3
```

## Capturing Duplicate ACKs

```bash
# Capture to file for analysis

tcpdump -i eth0 -n -w /tmp/dupacks.pcap 'tcp and host 10.20.0.5'

# Real-time detection of dup ACK sequences
tcpdump -i eth0 -n -l 'tcp and host 10.20.0.5' | \
  awk '
    /Flags \[\.\]/ && / ack [0-9]+,/ {
      ack = $0
      sub(/.* ack /, "", ack)
      sub(/,.*/, "", ack)
      if (ack == last_ack) {
        count++
        printf "Dup ACK %d for ack=%s\n", count, ack
      } else {
        count = 0
        last_ack = ack
      }
    }
  '
```

## Wireshark Analysis

```text
# Show all duplicate ACKs
tcp.analysis.duplicate_ack

# Show duplicate ACKs at or beyond the fast-retransmit threshold
tcp.analysis.duplicate_ack_num >= 3

# Combined view: dup ACKs and the retransmit they triggered
tcp.analysis.duplicate_ack or tcp.analysis.fast_retransmission

# Expert Information provides automatic analysis:
# Analyze → Expert Information
# Look for "Duplicate ACK" entries
```

## Counting Dup ACKs in a Capture

```bash
# Count all duplicate ACK events
tshark -r /tmp/dupacks.pcap \
  -Y "tcp.analysis.duplicate_ack" \
  -T fields -e frame.number -e tcp.ack 2>/dev/null | wc -l

# Show the most common stream/ACK pairs for dup ACKs
tshark -r /tmp/dupacks.pcap \
  -Y "tcp.analysis.duplicate_ack" \
  -T fields -e tcp.stream -e tcp.ack 2>/dev/null | sort | uniq -c | sort -rn | head -10
```

## Differentiating Loss from Reordering

```bash
# Loss: dup ACKs followed by a fast retransmit
# Reordering: dup ACKs followed by the expected packet arriving without retransmit

# In Wireshark:
# If dup ACK sequence is followed by tcp.analysis.fast_retransmission: sender inferred loss
# If dup ACK sequence ends when the missing packet arrives without retransmission: reordering

# Check kernel counters
nstat | grep -E "TCPSACKReorder|TCPTSReorder|TCPFastRetrans"
# High reorder counters with comparatively low FastRetrans suggests reordering
# High FastRetrans means the sender is inferring loss and retransmitting
```

## Kernel Duplicate ACK Statistics

```bash
# Linux doesn't expose dup ACK count directly via nstat
nstat | grep TcpOutSegs   # total outgoing TCP segments, not dup ACKs

# Proxy metric: sender-side fast retransmits
nstat | grep TcpExtTCPFastRetrans
# High FastRetrans = many sender-side fast retransmits

# Watch for change rate
watch -n 2 "nstat -z | grep TcpExtTCPFastRetrans"
```

## Conclusion

Duplicate ACKs are the TCP receiver's way of saying "something arrived out of order." Three consecutive dup ACKs trigger fast retransmit - this is a classic TCP loss detection mechanism. Occasional dup ACKs are normal in any network with slight reordering. Consistent 3-dup-ACK sequences followed by retransmissions show that the sender inferred loss, while a gap closing without retransmission points to reordering. Use Wireshark's `tcp.analysis.duplicate_ack_num >= 3` filter to highlight duplicate ACKs at or beyond the fast-retransmit threshold, and distinguish them from simple reordering by checking whether a retransmission follows.
