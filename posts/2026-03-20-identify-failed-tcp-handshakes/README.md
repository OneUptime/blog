# How to Identify Failed TCP Handshakes in Packet Captures

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: TCP, Wireshark, Networking, Troubleshooting, Packet Analysis

Description: Use packet captures and Wireshark filters to identify incomplete TCP handshakes, distinguish between unanswered SYNs, rejected connections, and RST-terminated handshakes.

## Introduction

A failed TCP handshake means a connection never reached the ESTABLISHED state. The failure mode - unanswered SYN, RST response, or SYN-ACK never followed by ACK - tells you where to look for the problem. Packet captures provide definitive proof of what happened at the transport layer.

## Types of Failed Handshakes

### Type 1: Unanswered SYN (Timeout)

The client sends SYN but never receives SYN-ACK. The OS retransmits SYN several times before giving up.

```bash
# Identify unanswered SYNs: SYN sent, retransmitted multiple times, no SYN-ACK

tcpdump -n 'tcp[tcpflags] & (tcp-syn|tcp-ack) == tcp-syn'

# Signs: same SYN packet is retransmitted repeatedly with no intervening SYN-ACK
# Cause: server down, firewall silently dropping SYN, routing failure
```

Wireshark filter:
```text
# Find SYN retransmissions
tcp.analysis.retransmission && tcp.flags.syn == 1 && tcp.flags.ack == 0
```

### Type 2: RST Response to SYN

Server receives SYN but sends RST instead of SYN-ACK - connection actively refused.

```bash
# Capture: SYN from client → RST from server
tcpdump -n 'host 10.20.0.5 and (tcp[tcpflags] & tcp-rst != 0 or tcp[tcpflags] & (tcp-syn|tcp-ack) == tcp-syn)'

# Cause: port closed, application not listening, or iptables REJECT rule
```

Wireshark filter:
```text
# Find RST packets; verify the preceding packet in the same stream is a SYN
tcp.flags.reset == 1
```

### Type 3: SYN-ACK Sent but No ACK

Server receives SYN and sends SYN-ACK, but the client never sends the final ACK. This leaves the server in SYN-RECEIVED until it times out, a pattern often seen during SYN flood attacks or when the final ACK is lost.

```bash
# Watch for SYN-RECEIVED connections that never complete
ss -tn state syn-recv

# Count half-open connections
ss -tn state syn-recv | wc -l
```

Wireshark filter:
```text
# Find SYN-ACK packets - check if matching ACK follows
tcp.flags.syn == 1 && tcp.flags.ack == 1
```

## Automated Detection with tcpdump

```bash
# Capture initial SYNs only
tcpdump -i eth0 -n -w /tmp/syns.pcap 'tcp[tcpflags] & (tcp-syn|tcp-ack) == tcp-syn' &
sleep 60
kill %1

# Analyze: find repeated initial SYNs with the same 4-tuple and sequence number
tshark -r /tmp/syns.pcap -Y 'tcp.flags.syn == 1 && tcp.flags.ack == 0' -T fields \
  -e ip.src -e tcp.srcport -e ip.dst -e tcp.dstport -e tcp.seq_raw \
  | sort | uniq -c | awk '$1 > 1' | sort -rn | head -20
```

## Using ss to Find Failed Handshakes

```bash
# SYN_SENT: client waiting for SYN-ACK (handshake in progress)
ss -tn state syn-sent

# SYN_RECV: server waiting for the final ACK
ss -tn state syn-recv

# If many entries persist here: incomplete handshakes are occurring
# SYN_RECV backlog growth/fullness can indicate a SYN flood or overloaded server
```

## Kernel Metrics for Failed Handshakes

```bash
# AttemptFails: transitions from SYN-SENT or SYN-RECV to CLOSED,
# plus SYN-RECV back to LISTEN
awk '$1=="Tcp:" && !seen {for (i=2;i<=NF;i++) key[i]=$i; seen=1; next} $1=="Tcp:" && seen {for (i=2;i<=NF;i++) if (key[i]=="AttemptFails") print key[i], $i; exit}' /proc/net/snmp

# Or use nstat
nstat -az TcpAttemptFails

# High AttemptFails indicates failed active or passive opens before ESTABLISHED
# Check packet captures to separate timeouts, resets, and SYN-RECV expirations
```

## Conclusion

Failed TCP handshakes leave clear traces in packet captures. Unanswered SYNs with retransmissions point to server/firewall issues. Immediate RSTs point to closed ports or REJECT firewall rules. Persistent SYN-RECEIVED states indicate incomplete handshakes from SYN floods, dropped final ACKs, or client-side bugs. Combining `ss` state filters with tcpdump captures gives you both real-time visibility and forensic analysis capability.
