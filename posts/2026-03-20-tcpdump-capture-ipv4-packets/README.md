# How to Capture IPv4 Packets with tcpdump on Linux - A Practical Guide

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: tcpdump, IPv4, Linux, Packet Capture, Networking, Diagnostic

Description: Use tcpdump to capture and analyze IPv4 network packets on Linux, with basic filters, output formatting, and saving captures for offline analysis.

tcpdump is the standard packet capture tool on Linux. It captures network packets in real time, lets you filter by IP, port, and protocol, and saves captures to PCAP files for analysis in Wireshark.

## Install and Basic Usage

```bash
# Install on Debian/Ubuntu (often pre-installed)

sudo apt install tcpdump -y

# Capture on tcpdump's automatically selected interface
sudo tcpdump

# Capture on specific interface
sudo tcpdump -i eth0

# List available interfaces
sudo tcpdump -D
```

## Essential Flags

```bash
# -n: Don't resolve addresses or port numbers to names (faster, clearer output)
sudo tcpdump -n -i eth0

# -nn: Commonly used form for numeric addresses and port numbers
sudo tcpdump -nn -i eth0

# -v: Verbose (more header details)
sudo tcpdump -v -i eth0

# -vv: Even more verbose output
sudo tcpdump -vv -i eth0

# -c: Stop after N packets
sudo tcpdump -c 100 -i eth0

# -s: Snap length (0 = default snap length, 262144 bytes in current tcpdump)
sudo tcpdump -s 0 -i eth0
```

## Reading tcpdump Output

```bash
sudo tcpdump -nn -i eth0

# Output line:
# 10:15:32.123456 IP 192.168.1.100.54321 > 8.8.8.8.53: UDP, length 32
#     ^               ^           ^         ^        ^    ^
#  timestamp      source IP    src port  dest IP  dport  protocol

# TCP example:
# 10:15:32.123456 IP 192.168.1.100.22 > 203.0.113.5.54321: Flags [P.], seq 1:100, ack 1
# Flags [P.] = PUSH + ACK
# Flags [S]  = SYN
# Flags [S.] = SYN-ACK
# Flags [F.] = FIN-ACK
# Flags [R]  = RST
```

## Filter by Host

```bash
# Capture traffic to/from a specific IP
sudo tcpdump -nn host 8.8.8.8

# Capture traffic from a source IP
sudo tcpdump -nn src 192.168.1.50

# Capture traffic to a destination IP
sudo tcpdump -nn dst 10.0.0.1

# Capture traffic between two specific hosts
sudo tcpdump -nn host 192.168.1.100 and host 10.0.0.1
```

## Filter by Port

```bash
# Capture all traffic on port 80
sudo tcpdump -nn port 80

# Capture all HTTPS traffic
sudo tcpdump -nn port 443

# Capture SSH connections
sudo tcpdump -nn port 22

# Capture a port range
sudo tcpdump -nn portrange 8000-8100
```

## Filter by Protocol

```bash
# TCP only
sudo tcpdump -nn -i eth0 tcp

# UDP only
sudo tcpdump -nn -i eth0 udp

# ICMP only (ping traffic)
sudo tcpdump -nn -i eth0 icmp

# Show only IPv4 (exclude IPv6)
sudo tcpdump -nn -i eth0 ip
```

## Save to File for Later Analysis

```bash
# Save capture to a .pcap file
sudo tcpdump -nn -i eth0 -w /tmp/capture.pcap

# Save with packet limit
sudo tcpdump -nn -i eth0 -c 1000 -w /tmp/capture.pcap

# Read and analyze a saved file
sudo tcpdump -nn -r /tmp/capture.pcap

# Read with filter
sudo tcpdump -nn -r /tmp/capture.pcap port 80
```

## Capture Only Specific Traffic

```bash
# Capture initial TCP SYN packets (new connection attempts)
sudo tcpdump -nn 'tcp[tcpflags] & (tcp-syn|tcp-ack) == tcp-syn'

# Capture DNS queries
sudo tcpdump -nn 'udp dst port 53'

# Capture HTTP GET requests
sudo tcpdump -nn -A 'tcp port 80 and tcp[((tcp[12:1] & 0xf0) >> 2):4] = 0x47455420'
```

tcpdump is indispensable for network debugging - it lets you see exactly what's on the wire when application logs and connection tools aren't giving you enough information.
