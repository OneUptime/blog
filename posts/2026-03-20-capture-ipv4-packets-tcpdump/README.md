# How to Capture IPv4 Packets with tcpdump on Linux

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: tcpdump, Packet Capture, Linux, IPv4, Network Analysis

Description: Learn how to use tcpdump to capture IPv4 packets on Linux, including basic captures, filtering by protocol and port, reading output, and saving captures for Wireshark analysis.

## Installing tcpdump

```bash
# Debian/Ubuntu

sudo apt-get install tcpdump

# RHEL/CentOS/Rocky
sudo yum install tcpdump

# Verify installation
tcpdump --version
# tcpdump version 4.99.1
```

## Step 1: Basic IPv4 Capture

```bash
# Capture all IPv4 traffic on eth0
sudo tcpdump -i eth0 ip

# Capture on any interface
sudo tcpdump -i any ip

# Show available interfaces
sudo tcpdump -D

# Basic output format:
# 12:05:01.234567 IP 192.168.1.10.54321 > 8.8.8.8.53: UDP, length 32
# [timestamp] [protocol] [src].[srcport] > [dst].[dstport]: [details]
```

## Step 2: Common Filter Expressions

```bash
# Filter by host (source or destination)
sudo tcpdump -i eth0 host 192.168.1.50

# Filter by source IP only
sudo tcpdump -i eth0 src 192.168.1.50

# Filter by destination IP only
sudo tcpdump -i eth0 dst 8.8.8.8

# Filter by port
sudo tcpdump -i eth0 port 80
sudo tcpdump -i eth0 port 443

# Filter by protocol
sudo tcpdump -i eth0 tcp
sudo tcpdump -i eth0 udp
sudo tcpdump -i eth0 icmp

# Combine filters with and/or/not
sudo tcpdump -i eth0 'host 192.168.1.50 and port 80'
sudo tcpdump -i eth0 'tcp and not port 22'    # Exclude SSH
sudo tcpdump -i eth0 'src net 192.168.1.0/24 and dst port 443'
```

## Step 3: Verbose Output Options

```bash
# -n: Don't resolve hostnames (faster, shows IPs)
# -v: Verbose (TTL, IP ID, checksum)
# -vv: Very verbose (full header details)
# -vvv: Maximum verbosity
# -A: Print packet content as ASCII
# -X: Print packet content as hex and ASCII
# -e: Show Ethernet headers (MAC addresses)

# Recommended for troubleshooting
sudo tcpdump -i eth0 -n -v host 192.168.1.50

# See packet content (useful for HTTP)
sudo tcpdump -i eth0 -n -A port 80 | head -50

# Show MAC addresses (useful for ARP troubleshooting)
sudo tcpdump -i eth0 -e -n arp
```

## Step 4: Limit Capture Size and Duration

```bash
# Capture only first 100 packets
sudo tcpdump -i eth0 -c 100 host 192.168.1.50

# Capture for 30 seconds
sudo timeout 30 tcpdump -i eth0 -n ip

# Limit snapshot length (bytes per packet)
# Default snaplen is 262144 bytes; -s 128 truncates each packet to 128 bytes
sudo tcpdump -i eth0 -s 128 -n tcp   # Capture only the first 128 bytes of each packet
sudo tcpdump -i eth0 -s 0 -n tcp     # Use the default snaplen
```

## Step 5: Save Capture to PCAP File

```bash
# Save to file for Wireshark analysis
sudo tcpdump -i eth0 -n -w /tmp/capture.pcap

# Save with rotation (10MB files, keep 5)
sudo tcpdump -i eth0 -w /tmp/capture.pcap -C 10 -W 5

# Read and filter a saved PCAP
tcpdump -r /tmp/capture.pcap 'host 192.168.1.50'
tcpdump -r /tmp/capture.pcap -n -v tcp port 443

# Convert to text
tcpdump -r /tmp/capture.pcap -n > /tmp/capture.txt
```

## Step 6: Advanced Filters

```bash
# Capture SYN packets only (new TCP connections)
sudo tcpdump -i eth0 'tcp[tcpflags] & tcp-syn != 0 and tcp[tcpflags] & tcp-ack == 0'

# Capture ICMP only
sudo tcpdump -i eth0 icmp

# Capture DHCP traffic (UDP ports 67/68)
sudo tcpdump -i eth0 port 67 or port 68

# Capture large packets (MTU issues)
sudo tcpdump -i eth0 'ip[2:2] > 1400'

# Capture fragmented packets
sudo tcpdump -i eth0 '(ip[6:2] & 0x3fff) != 0'

# Capture DNS queries and responses
sudo tcpdump -i eth0 -n port 53
```

## Step 7: Running tcpdump Without Root

```bash
# Option 1: Add user to pcap group (one Linux approach with file capabilities)
sudo groupadd pcap
sudo usermod -aG pcap $USER
sudo chgrp pcap "$(command -v tcpdump)"
sudo chmod 750 "$(command -v tcpdump)"
sudo setcap cap_net_raw,cap_net_admin=eip "$(command -v tcpdump)"

# Option 2: Run with sudo in scripts
# Option 3: Use dumpcap (Wireshark's capture tool, less privileged)
sudo apt-get install wireshark
sudo usermod -aG wireshark $USER
dumpcap -i eth0 -w /tmp/capture.pcapng
```

## Practical Capture Examples

```bash
# Diagnose why a server can't reach 10.20.30.1
sudo tcpdump -i eth0 -n 'host 10.20.30.1' -v

# Watch HTTP GET requests in real-time
sudo tcpdump -i eth0 -A -n 'tcp port 80 and tcp[((tcp[12:1] & 0xf0) >> 2):4] = 0x47455420'

# Monitor all traffic to/from a specific subnet
sudo tcpdump -i eth0 -n 'net 10.20.0.0/16'

# Check if SSH connections are being attempted
sudo tcpdump -i eth0 -n 'tcp and dst port 22 and tcp[tcpflags] & tcp-syn != 0'
```

## Conclusion

tcpdump is the essential first tool for IPv4 packet analysis. Start with `sudo tcpdump -i eth0 -n host [target-ip]` for basic capture, add `-v` for verbose output, and use `-w capture.pcap` to save for Wireshark. Master the BPF filter syntax: `host`, `port`, `src`, `dst`, `tcp`, `udp`, `icmp`, and combinations with `and`/`or`/`not`. Use byte-offset filters like `tcp[tcpflags]` to capture specific TCP flag patterns for detailed protocol analysis.
