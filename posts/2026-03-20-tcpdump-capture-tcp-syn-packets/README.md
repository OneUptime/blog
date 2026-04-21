# How to Use tcpdump to Capture Only TCP SYN Packets

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: tcpdump, TCP, SYN, Linux, Networking, Security

Description: Capture only TCP SYN packets with tcpdump using BPF bit-matching filters to monitor new connection attempts and detect SYN flood attacks.

Capturing initial SYN packets gives you a view of new IPv4 TCP connection attempts without the noise of ongoing conversation packets. This is useful for monitoring connection rates, detecting port scans, and identifying SYN flood attacks.

## Capture SYN Packets Using BPF

```bash
# Capture TCP SYN packets (new connection initiation)

sudo tcpdump -nn 'tcp[tcpflags] & tcp-syn != 0'

# SYN packets on a specific interface
sudo tcpdump -nn -i eth0 'tcp[tcpflags] & tcp-syn != 0'

# Initial SYN only (not SYN-ACK)
# SYN flag set AND ACK flag not set
sudo tcpdump -nn 'tcp[tcpflags] & (tcp-syn|tcp-ack) == tcp-syn'
```

## Explain the BPF Syntax

The TCP flags are at byte 13 of the TCP header. In tcpdump/libpcap, `tcp[...]` arithmetic filters like these apply to IPv4 TCP packets; they do not match IPv6 TCP packets.

```text
tcp[13] byte layout:
  Bit 7: CWR
  Bit 6: ECE
  Bit 5: URG
  Bit 4: ACK  (0x10)
  Bit 3: PSH
  Bit 2: RST  (0x04)
  Bit 1: SYN  (0x02)
  Bit 0: FIN  (0x01)

'tcp[tcpflags] & tcp-syn != 0'
  → test if the SYN bit (0x02) is set in the flags byte
  → matches SYN and SYN-ACK

'tcp[tcpflags] & (tcp-syn|tcp-ack) == tcp-syn'
  → both SYN and ACK bits evaluated
  → only matches when SYN=1 and ACK=0 (initial SYN)
```

## Monitor New Connections in Real Time

```bash
# Watch new connection attempts to your web server
sudo tcpdump -nn -i eth0 \
  'tcp[tcpflags] & (tcp-syn|tcp-ack) == tcp-syn and dst port 80'

# Output:
# 10:15:32 IP 203.0.113.5.54321 > 192.168.1.100.80: Flags [S], seq 123456789
# Each line = one initial SYN packet

# Monitor SSH connection attempts (potential brute force)
sudo tcpdump -nn \
  'tcp[tcpflags] & (tcp-syn|tcp-ack) == tcp-syn and dst port 22'
```

## Count SYN Rate for SYN Flood Detection

```bash
# Count SYN packets per second
sudo tcpdump -l -nn -q -tt 'tcp[tcpflags] & (tcp-syn|tcp-ack) == tcp-syn' 2>/dev/null \
  | awk 'NR==1 {last=int($1)} {sec=int($1); if (sec != last) {print count " SYNs/sec"; count=0; last=sec} count++} END {if (NR) print count " SYNs/sec"}'

# Quick flood check: count SYNs in 10 seconds
SYN_COUNT=$(sudo timeout 10 tcpdump -nn -q \
  'tcp[tcpflags] & (tcp-syn|tcp-ack) == tcp-syn' 2>/dev/null | wc -l)
echo "SYN packets in 10 seconds: $SYN_COUNT"
# > 500 in 10 seconds = potential SYN flood
```

## Find Top SYN Sources

```bash
# Capture 1000 SYN packets and find top source IPs
sudo tcpdump -nn -c 1000 'tcp[tcpflags] & (tcp-syn|tcp-ack) == tcp-syn' 2>/dev/null \
  | grep -oP '\b\d+\.\d+\.\d+\.\d+(?=\.\d+ >)' \
  | sort | uniq -c | sort -rn | head -10

# High count from single IP = SYN flood source
# Many different IPs = distributed SYN flood (DDoS)
```

## Capture SYN-RST Pairs (Connection Refused)

```bash
# SYN packets followed by RST/RST-ACK = port is closed
# Capture both SYN and RST to see refused connections
sudo tcpdump -nn 'tcp[tcpflags] & (tcp-syn|tcp-rst) != 0 and port 22'

# SYN with no corresponding ACK = port filtered (firewalled)
# To detect: compare SYN count with ESTABLISHED count in ss
```

## Save SYN Capture for Analysis

```bash
# Save 5 minutes of SYN traffic
sudo timeout 300 tcpdump -nn -i eth0 \
  'tcp[tcpflags] & (tcp-syn|tcp-ack) == tcp-syn' \
  -w /tmp/syn-capture.pcap

# Analyze: connections per destination port
tcpdump -nn -r /tmp/syn-capture.pcap \
  | awk '{print $5}' \
  | grep -oP '\.\d+:$' | tr -d ':.' | sort | uniq -c | sort -rn | head -10
```

Filtering for initial SYN packets often reduces capture volume dramatically for established connections, giving you a clean view of exactly what's trying to connect to your server.
