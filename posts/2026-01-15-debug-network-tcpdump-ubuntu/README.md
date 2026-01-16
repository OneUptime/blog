# How to Debug Network Issues with tcpdump on Ubuntu

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Ubuntu, tcpdump, Network, Debugging, Packet Capture, Tutorial

Description: Complete guide to using tcpdump for network troubleshooting and packet analysis on Ubuntu.

---

Network issues can be some of the most challenging problems to diagnose. Whether you're dealing with slow connections, dropped packets, mysterious timeouts, or application failures, understanding what's happening at the packet level is essential. tcpdump is one of the most powerful command-line tools for capturing and analyzing network traffic on Linux systems. This comprehensive guide will teach you how to effectively use tcpdump on Ubuntu to debug network issues.

## What is tcpdump?

tcpdump is a packet analyzer that runs from the command line. It allows you to capture and display TCP/IP and other packets being transmitted or received over a network. Originally developed in 1988, it remains one of the most widely used network analysis tools due to its power, flexibility, and availability on virtually all Unix-like systems.

## Installing tcpdump on Ubuntu

tcpdump is often pre-installed on Ubuntu systems, but if it's not available, you can easily install it using apt.

```bash
# Update package lists
sudo apt update

# Install tcpdump
sudo apt install tcpdump -y

# Verify installation
tcpdump --version
```

You should see output similar to:

```
tcpdump version 4.99.4
libpcap version 1.10.4 (with TPACKET_V3)
OpenSSL 3.0.13 30 Jan 2024
```

### Setting Up Permissions

By default, tcpdump requires root privileges to capture packets. However, you can configure it to allow non-root users to capture traffic:

```bash
# Create a group for packet capture (if it doesn't exist)
sudo groupadd pcap

# Add your user to the pcap group
sudo usermod -aG pcap $USER

# Set capabilities on tcpdump binary
sudo setcap cap_net_raw,cap_net_admin=eip $(which tcpdump)

# Log out and log back in for group changes to take effect
```

## Basic Capture Syntax

The basic syntax for tcpdump is:

```bash
tcpdump [options] [expression]
```

### Your First Capture

Let's start with a simple capture on all interfaces:

```bash
# Capture all traffic (requires sudo if capabilities not set)
sudo tcpdump

# Capture traffic on a specific interface
sudo tcpdump -i eth0

# List all available interfaces
tcpdump -D
```

### Essential Options

```bash
# -i : Specify interface
# -n : Don't resolve hostnames (faster output)
# -nn : Don't resolve hostnames or port names
# -v : Verbose output
# -vv : More verbose
# -vvv : Even more verbose
# -c : Capture only N packets
# -s : Snap length (bytes to capture per packet)
# -w : Write to file
# -r : Read from file

# Example: Capture 100 packets on eth0 with verbose output, no DNS resolution
sudo tcpdump -i eth0 -nn -v -c 100
```

## Understanding tcpdump Output

A typical tcpdump output line looks like this:

```
14:32:15.123456 IP 192.168.1.100.54321 > 93.184.216.34.443: Flags [S], seq 1234567890, win 65535, options [mss 1460,sackOK,TS val 123456789 ecr 0,nop,wscale 7], length 0
```

Let's break this down:

```bash
# 14:32:15.123456     - Timestamp (hour:minute:second.microsecond)
# IP                  - Protocol (IPv4)
# 192.168.1.100.54321 - Source IP and port
# >                   - Direction of traffic
# 93.184.216.34.443   - Destination IP and port
# Flags [S]           - TCP flags (S = SYN)
# seq 1234567890      - Sequence number
# win 65535           - Window size
# options [...]       - TCP options
# length 0            - Payload length
```

## Filtering by Host, Port, and Protocol

One of tcpdump's most powerful features is its filtering capability using Berkeley Packet Filter (BPF) syntax.

### Filtering by Host

```bash
# Capture traffic to/from a specific host
sudo tcpdump -i eth0 host 192.168.1.100

# Capture traffic FROM a specific source
sudo tcpdump -i eth0 src host 192.168.1.100

# Capture traffic TO a specific destination
sudo tcpdump -i eth0 dst host 192.168.1.100

# Capture traffic to/from a hostname (DNS lookup performed)
sudo tcpdump -i eth0 host example.com

# Capture traffic to/from a network range (CIDR notation)
sudo tcpdump -i eth0 net 192.168.1.0/24

# Exclude traffic from a specific host
sudo tcpdump -i eth0 not host 192.168.1.1
```

### Filtering by Port

```bash
# Capture traffic on a specific port
sudo tcpdump -i eth0 port 80

# Capture traffic from a source port
sudo tcpdump -i eth0 src port 443

# Capture traffic to a destination port
sudo tcpdump -i eth0 dst port 22

# Capture traffic on a range of ports
sudo tcpdump -i eth0 portrange 8000-9000

# Capture traffic on multiple specific ports
sudo tcpdump -i eth0 port 80 or port 443 or port 8080
```

### Filtering by Protocol

```bash
# Capture only TCP traffic
sudo tcpdump -i eth0 tcp

# Capture only UDP traffic
sudo tcpdump -i eth0 udp

# Capture only ICMP traffic (useful for ping troubleshooting)
sudo tcpdump -i eth0 icmp

# Capture only ARP traffic
sudo tcpdump -i eth0 arp

# Capture IPv6 traffic
sudo tcpdump -i eth0 ip6
```

## Capturing Specific Traffic Types

### HTTP Traffic (Port 80)

```bash
# Capture HTTP traffic with packet contents displayed in ASCII
sudo tcpdump -i eth0 -A -s 0 'tcp port 80'

# Capture HTTP GET requests
sudo tcpdump -i eth0 -A -s 0 'tcp port 80 and (((ip[2:2] - ((ip[0]&0xf)<<2)) - ((tcp[12]&0xf0)>>2)) != 0)'

# Capture HTTP traffic and show hex + ASCII
sudo tcpdump -i eth0 -XX -s 0 'tcp port 80'
```

### HTTPS/TLS Traffic (Port 443)

```bash
# Capture HTTPS traffic (you'll see encrypted data)
sudo tcpdump -i eth0 -nn 'tcp port 443'

# Capture TLS handshake only (Client Hello)
sudo tcpdump -i eth0 -nn 'tcp port 443 and (tcp[((tcp[12] & 0xf0) >> 2)] = 0x16)'
```

### DNS Traffic (Port 53)

```bash
# Capture all DNS traffic
sudo tcpdump -i eth0 -nn 'port 53'

# Capture DNS queries and responses with details
sudo tcpdump -i eth0 -nn -vvv 'port 53'

# Capture only DNS queries (to server)
sudo tcpdump -i eth0 -nn 'dst port 53'

# Capture only DNS responses (from server)
sudo tcpdump -i eth0 -nn 'src port 53'
```

### SSH Traffic (Port 22)

```bash
# Capture SSH traffic
sudo tcpdump -i eth0 -nn 'tcp port 22'

# Capture SSH connection attempts (SYN packets)
sudo tcpdump -i eth0 -nn 'tcp port 22 and tcp[tcpflags] & tcp-syn != 0'
```

### SMTP/Email Traffic

```bash
# Capture SMTP traffic
sudo tcpdump -i eth0 -nn 'tcp port 25 or tcp port 587 or tcp port 465'

# Capture IMAP traffic
sudo tcpdump -i eth0 -nn 'tcp port 143 or tcp port 993'

# Capture POP3 traffic
sudo tcpdump -i eth0 -nn 'tcp port 110 or tcp port 995'
```

## Writing Captures to Files (pcap)

Saving captures to files is essential for later analysis or sharing with colleagues.

```bash
# Write capture to a pcap file
sudo tcpdump -i eth0 -w capture.pcap

# Write with a packet count limit
sudo tcpdump -i eth0 -c 1000 -w capture.pcap

# Write with time-based rotation (new file every hour)
sudo tcpdump -i eth0 -w capture_%Y%m%d_%H%M%S.pcap -G 3600

# Write with size-based rotation (new file every 100MB)
sudo tcpdump -i eth0 -w capture.pcap -C 100

# Write with both rotation and file count limit
# Creates capture0.pcap, capture1.pcap, etc., keeping only 5 files
sudo tcpdump -i eth0 -w capture.pcap -C 100 -W 5

# Capture with a filter and write to file
sudo tcpdump -i eth0 'tcp port 443' -w https_traffic.pcap
```

### Best Practices for Capture Files

```bash
# Use descriptive filenames with timestamps
sudo tcpdump -i eth0 -w "$(date +%Y%m%d_%H%M%S)_network_issue.pcap"

# Capture full packets (default snap length may truncate)
sudo tcpdump -i eth0 -s 0 -w full_capture.pcap

# Add verbose output while writing (shows packet count)
sudo tcpdump -i eth0 -v -w capture.pcap
```

## Reading pcap Files

```bash
# Read and display a pcap file
tcpdump -r capture.pcap

# Read with filters applied
tcpdump -r capture.pcap 'tcp port 80'

# Read with no DNS resolution (faster)
tcpdump -nn -r capture.pcap

# Read with verbose output
tcpdump -vvv -r capture.pcap

# Read and show packet contents in ASCII
tcpdump -A -r capture.pcap

# Read and show packet contents in hex and ASCII
tcpdump -XX -r capture.pcap

# Count packets matching a filter
tcpdump -r capture.pcap 'tcp port 443' | wc -l

# Extract specific information from capture
tcpdump -nn -r capture.pcap | awk '{print $3}' | sort | uniq -c | sort -rn
```

## Advanced BPF Filters

Berkeley Packet Filters (BPF) allow for sophisticated packet matching. Here are advanced examples:

### Combining Filters with Logical Operators

```bash
# AND operator (and, &&)
sudo tcpdump -i eth0 'host 192.168.1.100 and port 80'

# OR operator (or, ||)
sudo tcpdump -i eth0 'port 80 or port 443'

# NOT operator (not, !)
sudo tcpdump -i eth0 'not port 22'

# Complex combinations with parentheses
sudo tcpdump -i eth0 '(host 192.168.1.100 or host 192.168.1.101) and (port 80 or port 443)'

# Multiple exclusions
sudo tcpdump -i eth0 'not (port 22 or port 53 or arp)'
```

### Packet Size Filters

```bash
# Capture packets greater than 1000 bytes
sudo tcpdump -i eth0 'greater 1000'

# Capture packets less than 100 bytes
sudo tcpdump -i eth0 'less 100'

# Capture packets of exact size
sudo tcpdump -i eth0 'len == 64'
```

### Byte-Level Filtering

```bash
# Filter by specific byte values in IP header
# ip[0] is first byte (version + header length)
# ip[8] is TTL
# ip[9] is protocol

# Capture packets with TTL less than 10 (might indicate routing issues)
sudo tcpdump -i eth0 'ip[8] < 10'

# Capture TCP packets (protocol 6)
sudo tcpdump -i eth0 'ip[9] = 6'

# Capture UDP packets (protocol 17)
sudo tcpdump -i eth0 'ip[9] = 17'

# Capture ICMP packets (protocol 1)
sudo tcpdump -i eth0 'ip[9] = 1'
```

### VLAN Traffic

```bash
# Capture VLAN-tagged traffic
sudo tcpdump -i eth0 vlan

# Capture traffic on specific VLAN
sudo tcpdump -i eth0 'vlan 100'

# Capture traffic on VLAN with additional filters
sudo tcpdump -i eth0 'vlan 100 and tcp port 80'
```

## TCP Flags Analysis

Understanding TCP flags is crucial for diagnosing connection issues. The TCP flags are:

- **S (SYN)**: Synchronize - initiates connection
- **A (ACK)**: Acknowledge - acknowledges received data
- **F (FIN)**: Finish - closes connection
- **R (RST)**: Reset - aborts connection
- **P (PSH)**: Push - sends data immediately
- **U (URG)**: Urgent - urgent data

### Filtering by TCP Flags

```bash
# Capture SYN packets (connection initiations)
sudo tcpdump -i eth0 'tcp[tcpflags] & tcp-syn != 0'

# Capture SYN-ACK packets (connection responses)
sudo tcpdump -i eth0 'tcp[tcpflags] & (tcp-syn|tcp-ack) == (tcp-syn|tcp-ack)'

# Capture FIN packets (connection terminations)
sudo tcpdump -i eth0 'tcp[tcpflags] & tcp-fin != 0'

# Capture RST packets (connection resets - often indicates problems)
sudo tcpdump -i eth0 'tcp[tcpflags] & tcp-rst != 0'

# Capture only SYN packets (not SYN-ACK)
sudo tcpdump -i eth0 'tcp[tcpflags] == tcp-syn'

# Capture packets with PSH flag (data being pushed)
sudo tcpdump -i eth0 'tcp[tcpflags] & tcp-push != 0'
```

### Detecting Connection Problems

```bash
# Find connection timeouts (multiple SYN without SYN-ACK)
sudo tcpdump -i eth0 -nn 'tcp[tcpflags] == tcp-syn' | \
    awk '{print $5}' | sort | uniq -c | sort -rn

# Find connection resets (potential application errors)
sudo tcpdump -i eth0 -nn 'tcp[tcpflags] & tcp-rst != 0'

# Monitor the three-way handshake
sudo tcpdump -i eth0 -nn 'tcp[tcpflags] & (tcp-syn|tcp-fin) != 0'
```

### TCP State Analysis Script

```bash
#!/bin/bash
# tcp_analysis.sh - Analyze TCP connection states in a capture

PCAP_FILE=$1

if [ -z "$PCAP_FILE" ]; then
    echo "Usage: $0 <pcap_file>"
    exit 1
fi

echo "=== TCP Flag Analysis ==="
echo ""
echo "SYN packets (connection attempts):"
tcpdump -nn -r "$PCAP_FILE" 'tcp[tcpflags] == tcp-syn' 2>/dev/null | wc -l

echo "SYN-ACK packets (connection responses):"
tcpdump -nn -r "$PCAP_FILE" 'tcp[tcpflags] == (tcp-syn|tcp-ack)' 2>/dev/null | wc -l

echo "RST packets (connection resets):"
tcpdump -nn -r "$PCAP_FILE" 'tcp[tcpflags] & tcp-rst != 0' 2>/dev/null | wc -l

echo "FIN packets (connection closures):"
tcpdump -nn -r "$PCAP_FILE" 'tcp[tcpflags] & tcp-fin != 0' 2>/dev/null | wc -l

echo ""
echo "=== Top Talkers ==="
tcpdump -nn -r "$PCAP_FILE" 2>/dev/null | \
    awk '{print $3}' | cut -d. -f1-4 | sort | uniq -c | sort -rn | head -10
```

## HTTP Traffic Inspection

### Capturing HTTP Requests and Responses

```bash
# Capture HTTP traffic with full payload
sudo tcpdump -i eth0 -A -s 0 'tcp port 80 and (((ip[2:2] - ((ip[0]&0xf)<<2)) - ((tcp[12]&0xf0)>>2)) != 0)'

# Filter for HTTP GET requests
sudo tcpdump -i eth0 -A -s 0 'tcp dst port 80 and tcp[((tcp[12:1] & 0xf0) >> 2):4] = 0x47455420'

# Filter for HTTP POST requests
sudo tcpdump -i eth0 -A -s 0 'tcp dst port 80 and tcp[((tcp[12:1] & 0xf0) >> 2):4] = 0x504f5354'

# Filter for HTTP responses (HTTP/1.1)
sudo tcpdump -i eth0 -A -s 0 'tcp src port 80 and tcp[((tcp[12:1] & 0xf0) >> 2):4] = 0x48545450'
```

### Extracting HTTP Headers

```bash
# Capture and display HTTP headers only
sudo tcpdump -i eth0 -A -s 0 'tcp port 80' 2>/dev/null | \
    grep -E '^(GET|POST|PUT|DELETE|HEAD|OPTIONS|HTTP|Host:|Content-|User-Agent:|Accept|Location:)'
```

### HTTP Analysis Script

```bash
#!/bin/bash
# http_analysis.sh - Analyze HTTP traffic in a capture

PCAP_FILE=$1

if [ -z "$PCAP_FILE" ]; then
    echo "Usage: $0 <pcap_file>"
    exit 1
fi

echo "=== HTTP Methods Distribution ==="
tcpdump -A -r "$PCAP_FILE" 'tcp port 80' 2>/dev/null | \
    grep -oE '^(GET|POST|PUT|DELETE|HEAD|OPTIONS|PATCH)' | \
    sort | uniq -c | sort -rn

echo ""
echo "=== HTTP Response Codes ==="
tcpdump -A -r "$PCAP_FILE" 'tcp src port 80' 2>/dev/null | \
    grep -oE 'HTTP/1\.[01] [0-9]{3}' | \
    awk '{print $2}' | sort | uniq -c | sort -rn

echo ""
echo "=== Top Requested Hosts ==="
tcpdump -A -r "$PCAP_FILE" 'tcp dst port 80' 2>/dev/null | \
    grep -oE 'Host: [^ ]+' | cut -d' ' -f2 | sort | uniq -c | sort -rn | head -10
```

## DNS Troubleshooting

DNS issues are among the most common network problems. tcpdump is invaluable for diagnosing them.

### Basic DNS Capture

```bash
# Capture all DNS traffic
sudo tcpdump -i eth0 -nn port 53

# Capture DNS with full details
sudo tcpdump -i eth0 -nn -vvv port 53

# Capture DNS and display in hex (useful for debugging)
sudo tcpdump -i eth0 -XX port 53
```

### Analyzing DNS Queries and Responses

```bash
# Show DNS query names
sudo tcpdump -i eth0 -nn port 53 2>/dev/null | grep -oE '\? [^ ]+' | cut -d' ' -f2 | sort | uniq -c

# Capture DNS queries only (to server)
sudo tcpdump -i eth0 -nn 'udp dst port 53'

# Capture DNS responses only (from server)
sudo tcpdump -i eth0 -nn 'udp src port 53'

# Filter for NXDOMAIN responses (domain not found)
sudo tcpdump -i eth0 -nn -vvv 'port 53' 2>/dev/null | grep -i 'nxdomain'
```

### DNS Troubleshooting Scenarios

```bash
# Check if DNS queries are being sent
sudo tcpdump -i eth0 -nn 'udp dst port 53' -c 10

# Check if DNS responses are being received
sudo tcpdump -i eth0 -nn 'udp src port 53' -c 10

# Monitor DNS to a specific server
sudo tcpdump -i eth0 -nn 'host 8.8.8.8 and port 53'

# Capture slow DNS responses (responses taking time)
# First capture to file, then analyze timestamps
sudo tcpdump -i eth0 -nn -tt 'port 53' -w dns_capture.pcap

# Analyze DNS response times
tcpdump -nn -tt -r dns_capture.pcap 'udp' | \
    awk '/\?/{query[$3]=$1} /[0-9]+\/[0-9]+\/[0-9]+/{
        if(query[$3]){
            diff=$1-query[$3];
            if(diff>0.1) print "Slow DNS:", $3, diff"s"
        }
    }'
```

### DNS Analysis Script

```bash
#!/bin/bash
# dns_analysis.sh - Comprehensive DNS traffic analysis

INTERFACE=${1:-eth0}
DURATION=${2:-30}

echo "Capturing DNS traffic on $INTERFACE for $DURATION seconds..."
sudo tcpdump -i $INTERFACE -nn -w /tmp/dns_capture.pcap 'port 53' &
TCPDUMP_PID=$!

sleep $DURATION
sudo kill $TCPDUMP_PID 2>/dev/null

echo ""
echo "=== DNS Query Analysis ==="
echo ""
echo "Total DNS packets:"
tcpdump -r /tmp/dns_capture.pcap 2>/dev/null | wc -l

echo ""
echo "Queries vs Responses:"
echo "Queries (dst port 53):"
tcpdump -nn -r /tmp/dns_capture.pcap 'dst port 53' 2>/dev/null | wc -l
echo "Responses (src port 53):"
tcpdump -nn -r /tmp/dns_capture.pcap 'src port 53' 2>/dev/null | wc -l

echo ""
echo "Top Queried Domains:"
tcpdump -nn -r /tmp/dns_capture.pcap 'dst port 53' 2>/dev/null | \
    grep -oE 'A\? [^ ]+|AAAA\? [^ ]+' | sort | uniq -c | sort -rn | head -10

echo ""
echo "DNS Servers Used:"
tcpdump -nn -r /tmp/dns_capture.pcap 'dst port 53' 2>/dev/null | \
    awk '{print $5}' | cut -d. -f1-4 | sort | uniq -c | sort -rn

rm -f /tmp/dns_capture.pcap
```

## SSL/TLS Debugging

While tcpdump cannot decrypt TLS traffic, it can help diagnose TLS connection issues.

### Capturing TLS Handshakes

```bash
# Capture TLS/SSL traffic
sudo tcpdump -i eth0 -nn 'tcp port 443'

# Capture TLS Client Hello (connection initiation)
# Record type 22 (0x16) = Handshake, Handshake type 1 = Client Hello
sudo tcpdump -i eth0 -nn 'tcp port 443 and (tcp[((tcp[12] & 0xf0) >> 2)] = 0x16) and (tcp[((tcp[12] & 0xf0) >> 2) + 5] = 0x01)'

# Capture TLS Server Hello
sudo tcpdump -i eth0 -nn 'tcp port 443 and (tcp[((tcp[12] & 0xf0) >> 2)] = 0x16) and (tcp[((tcp[12] & 0xf0) >> 2) + 5] = 0x02)'
```

### TLS Alert Detection

```bash
# Capture TLS alerts (potential errors)
# Record type 21 (0x15) = Alert
sudo tcpdump -i eth0 -nn 'tcp port 443 and (tcp[((tcp[12] & 0xf0) >> 2)] = 0x15)'

# Capture with hex output to see alert details
sudo tcpdump -i eth0 -nn -X 'tcp port 443 and (tcp[((tcp[12] & 0xf0) >> 2)] = 0x15)'
```

### Analyzing TLS Version

```bash
# Capture TLS handshakes and extract version info
sudo tcpdump -i eth0 -nn -X 'tcp port 443 and (tcp[((tcp[12] & 0xf0) >> 2)] = 0x16)' 2>/dev/null | \
    grep -E '0x[0-9a-f]+:.*03 0[0-3]' | head -20

# TLS versions in hex:
# 0x0301 = TLS 1.0
# 0x0302 = TLS 1.1
# 0x0303 = TLS 1.2
# 0x0304 = TLS 1.3
```

### TLS Troubleshooting Script

```bash
#!/bin/bash
# tls_analysis.sh - Analyze TLS handshakes

INTERFACE=${1:-eth0}
HOST=${2:-""}

FILTER="tcp port 443"
if [ -n "$HOST" ]; then
    FILTER="host $HOST and tcp port 443"
fi

echo "Monitoring TLS connections..."
echo "Press Ctrl+C to stop"
echo ""

sudo tcpdump -i $INTERFACE -nn "$FILTER" 2>/dev/null | while read line; do
    if echo "$line" | grep -q "Flags \[S\]"; then
        echo "[$(date +%H:%M:%S)] TLS Connection attempt: $line"
    elif echo "$line" | grep -q "Flags \[R\]"; then
        echo "[$(date +%H:%M:%S)] Connection RESET: $line"
    elif echo "$line" | grep -q "Flags \[F\]"; then
        echo "[$(date +%H:%M:%S)] Connection closed: $line"
    fi
done
```

## Common Troubleshooting Scenarios

### Scenario 1: Connection Timeouts

```bash
#!/bin/bash
# timeout_debug.sh - Debug connection timeout issues

TARGET_HOST=$1
TARGET_PORT=${2:-80}

if [ -z "$TARGET_HOST" ]; then
    echo "Usage: $0 <target_host> [port]"
    exit 1
fi

echo "Debugging connection timeouts to $TARGET_HOST:$TARGET_PORT"
echo ""

# Start tcpdump in background
sudo tcpdump -i any -nn "host $TARGET_HOST and port $TARGET_PORT" -w /tmp/timeout_debug.pcap &
TCPDUMP_PID=$!

# Give tcpdump time to start
sleep 2

# Attempt connection
echo "Attempting connection..."
timeout 10 bash -c "echo > /dev/tcp/$TARGET_HOST/$TARGET_PORT" 2>/dev/null
RESULT=$?

# Stop tcpdump
sleep 2
sudo kill $TCPDUMP_PID 2>/dev/null

echo ""
echo "=== Analysis ==="

SYN_COUNT=$(tcpdump -nn -r /tmp/timeout_debug.pcap 'tcp[tcpflags] == tcp-syn' 2>/dev/null | wc -l)
SYNACK_COUNT=$(tcpdump -nn -r /tmp/timeout_debug.pcap 'tcp[tcpflags] == (tcp-syn|tcp-ack)' 2>/dev/null | wc -l)
RST_COUNT=$(tcpdump -nn -r /tmp/timeout_debug.pcap 'tcp[tcpflags] & tcp-rst != 0' 2>/dev/null | wc -l)

echo "SYN packets sent: $SYN_COUNT"
echo "SYN-ACK received: $SYNACK_COUNT"
echo "RST packets: $RST_COUNT"

if [ $SYN_COUNT -gt 0 ] && [ $SYNACK_COUNT -eq 0 ]; then
    echo ""
    echo "DIAGNOSIS: SYN packets sent but no SYN-ACK received"
    echo "Possible causes:"
    echo "  - Firewall blocking traffic"
    echo "  - Target host not listening on port"
    echo "  - Network routing issue"
elif [ $RST_COUNT -gt 0 ]; then
    echo ""
    echo "DIAGNOSIS: Connection reset received"
    echo "Possible causes:"
    echo "  - Port not open on target"
    echo "  - Firewall rejecting connection"
    echo "  - Application crashed"
fi

rm -f /tmp/timeout_debug.pcap
```

### Scenario 2: Slow Network Performance

```bash
#!/bin/bash
# performance_debug.sh - Debug slow network performance

INTERFACE=${1:-eth0}
DURATION=${2:-60}

echo "Capturing network traffic for $DURATION seconds..."
sudo tcpdump -i $INTERFACE -nn -w /tmp/perf_capture.pcap &
TCPDUMP_PID=$!

sleep $DURATION
sudo kill $TCPDUMP_PID 2>/dev/null

echo ""
echo "=== Performance Analysis ==="

# Total packets and bytes
echo ""
echo "Total packets captured:"
tcpdump -r /tmp/perf_capture.pcap 2>/dev/null | wc -l

# Retransmissions (duplicate ACKs)
echo ""
echo "Potential retransmissions (RST packets):"
tcpdump -nn -r /tmp/perf_capture.pcap 'tcp[tcpflags] & tcp-rst != 0' 2>/dev/null | wc -l

# Large packets
echo ""
echo "Packets over 1400 bytes:"
tcpdump -nn -r /tmp/perf_capture.pcap 'greater 1400' 2>/dev/null | wc -l

# Top bandwidth consumers
echo ""
echo "Top 10 IP addresses by packet count:"
tcpdump -nn -r /tmp/perf_capture.pcap 2>/dev/null | \
    awk '{print $3}' | cut -d. -f1-4 | sort | uniq -c | sort -rn | head -10

rm -f /tmp/perf_capture.pcap
```

### Scenario 3: Service Unreachable

```bash
#!/bin/bash
# service_debug.sh - Debug service unreachable issues

SERVICE_IP=$1
SERVICE_PORT=$2

if [ -z "$SERVICE_IP" ] || [ -z "$SERVICE_PORT" ]; then
    echo "Usage: $0 <service_ip> <service_port>"
    exit 1
fi

echo "Debugging connectivity to $SERVICE_IP:$SERVICE_PORT"
echo ""

# Check ARP resolution
echo "=== ARP Check ==="
sudo tcpdump -i any -nn -c 5 "arp and host $SERVICE_IP" -w /tmp/arp_check.pcap &
ARP_PID=$!
ping -c 1 $SERVICE_IP > /dev/null 2>&1
sleep 2
sudo kill $ARP_PID 2>/dev/null

ARP_COUNT=$(tcpdump -nn -r /tmp/arp_check.pcap 2>/dev/null | wc -l)
if [ $ARP_COUNT -eq 0 ]; then
    echo "No ARP traffic - host may be on different subnet"
else
    echo "ARP resolution:"
    tcpdump -nn -r /tmp/arp_check.pcap 2>/dev/null
fi

# Check ICMP
echo ""
echo "=== ICMP Check ==="
sudo tcpdump -i any -nn -c 5 "icmp and host $SERVICE_IP" -w /tmp/icmp_check.pcap &
ICMP_PID=$!
ping -c 2 $SERVICE_IP > /dev/null 2>&1
sleep 3
sudo kill $ICMP_PID 2>/dev/null

echo "ICMP traffic:"
tcpdump -nn -r /tmp/icmp_check.pcap 2>/dev/null

# Check TCP
echo ""
echo "=== TCP Check ==="
sudo tcpdump -i any -nn -c 10 "host $SERVICE_IP and port $SERVICE_PORT" -w /tmp/tcp_check.pcap &
TCP_PID=$!
timeout 5 bash -c "echo > /dev/tcp/$SERVICE_IP/$SERVICE_PORT" 2>/dev/null
sleep 2
sudo kill $TCP_PID 2>/dev/null

echo "TCP traffic:"
tcpdump -nn -r /tmp/tcp_check.pcap 2>/dev/null

# Cleanup
rm -f /tmp/arp_check.pcap /tmp/icmp_check.pcap /tmp/tcp_check.pcap
```

### Scenario 4: Intermittent Connectivity Issues

```bash
#!/bin/bash
# intermittent_debug.sh - Capture traffic during intermittent issues

TARGET=$1
INTERFACE=${2:-eth0}

if [ -z "$TARGET" ]; then
    echo "Usage: $0 <target_host> [interface]"
    exit 1
fi

CAPTURE_DIR="/tmp/captures"
mkdir -p $CAPTURE_DIR

echo "Monitoring connectivity to $TARGET"
echo "Captures will be saved to $CAPTURE_DIR"
echo "Press Ctrl+C to stop"
echo ""

# Start continuous capture with rotation
sudo tcpdump -i $INTERFACE -nn "host $TARGET" \
    -w "$CAPTURE_DIR/capture_%Y%m%d_%H%M%S.pcap" \
    -G 300 -W 12 &  # Rotate every 5 minutes, keep 12 files (1 hour)

TCPDUMP_PID=$!

# Monitor and log status
while true; do
    if ping -c 1 -W 2 $TARGET > /dev/null 2>&1; then
        echo "[$(date)] Connection OK"
    else
        echo "[$(date)] CONNECTION FAILED - Check recent captures"
    fi
    sleep 10
done
```

### Scenario 5: Debugging Load Balancer Issues

```bash
#!/bin/bash
# loadbalancer_debug.sh - Debug load balancer behavior

LB_IP=$1
SERVICE_PORT=${2:-80}

if [ -z "$LB_IP" ]; then
    echo "Usage: $0 <loadbalancer_ip> [port]"
    exit 1
fi

echo "Analyzing load balancer behavior for $LB_IP:$SERVICE_PORT"
echo ""

# Capture traffic
sudo tcpdump -i any -nn "host $LB_IP and port $SERVICE_PORT" -c 100 -w /tmp/lb_capture.pcap &
TCPDUMP_PID=$!

# Generate some test traffic
for i in {1..10}; do
    curl -s -o /dev/null "http://$LB_IP:$SERVICE_PORT/" &
done
wait

sleep 5
sudo kill $TCPDUMP_PID 2>/dev/null

echo "=== Load Balancer Analysis ==="

# Check for backend server IPs (source of responses)
echo ""
echo "Response sources (backend servers):"
tcpdump -nn -r /tmp/lb_capture.pcap "src host $LB_IP" 2>/dev/null | \
    awk '{print $3}' | cut -d. -f1-4 | sort | uniq -c

# Check connection distribution
echo ""
echo "Connection states:"
echo "SYN packets (new connections):"
tcpdump -nn -r /tmp/lb_capture.pcap 'tcp[tcpflags] == tcp-syn' 2>/dev/null | wc -l
echo "RST packets (resets):"
tcpdump -nn -r /tmp/lb_capture.pcap 'tcp[tcpflags] & tcp-rst != 0' 2>/dev/null | wc -l

rm -f /tmp/lb_capture.pcap
```

## Additional Tips and Best Practices

### Performance Considerations

```bash
# Use BPF filters at capture time (more efficient than post-filtering)
# GOOD: Filter during capture
sudo tcpdump -i eth0 'tcp port 80' -w http.pcap

# LESS EFFICIENT: Capture all, filter later
sudo tcpdump -i eth0 -w all.pcap
tcpdump -r all.pcap 'tcp port 80'

# Use -nn to disable DNS resolution (faster output)
sudo tcpdump -i eth0 -nn

# Increase buffer size for high-traffic captures
sudo tcpdump -i eth0 -B 4096 -w capture.pcap

# Use ring buffer for long-running captures
sudo tcpdump -i eth0 -w capture.pcap -C 100 -W 10
```

### Security Considerations

```bash
# Be aware that tcpdump captures sensitive data
# Always secure your capture files
chmod 600 capture.pcap

# Delete captures when analysis is complete
rm -f capture.pcap

# Consider filtering out sensitive traffic
sudo tcpdump -i eth0 'not port 22 and not port 3306'

# Use secure storage for captures
sudo tcpdump -i eth0 -w /secure/location/capture.pcap
```

### Integration with Other Tools

```bash
# Convert pcap for Wireshark analysis
# (pcap files from tcpdump are directly compatible)
wireshark capture.pcap

# Use tshark for command-line Wireshark analysis
tshark -r capture.pcap -Y "http.request"

# Extract files from capture using tcpflow
tcpflow -r capture.pcap

# Analyze with ngrep for pattern matching
ngrep -I capture.pcap "password"
```

### Quick Reference Card

```bash
# === ESSENTIAL COMMANDS ===

# List interfaces
tcpdump -D

# Basic capture
sudo tcpdump -i eth0 -nn

# Capture to file
sudo tcpdump -i eth0 -w capture.pcap

# Read from file
tcpdump -r capture.pcap

# === COMMON FILTERS ===

# By host
sudo tcpdump -i eth0 host 192.168.1.100

# By port
sudo tcpdump -i eth0 port 80

# By protocol
sudo tcpdump -i eth0 tcp

# Combined
sudo tcpdump -i eth0 'host 192.168.1.100 and port 80 and tcp'

# === OUTPUT OPTIONS ===

# ASCII payload
sudo tcpdump -A -i eth0

# Hex and ASCII
sudo tcpdump -XX -i eth0

# Verbose
sudo tcpdump -vvv -i eth0

# === TCP FLAGS ===

# SYN packets
sudo tcpdump -i eth0 'tcp[tcpflags] & tcp-syn != 0'

# RST packets
sudo tcpdump -i eth0 'tcp[tcpflags] & tcp-rst != 0'

# FIN packets
sudo tcpdump -i eth0 'tcp[tcpflags] & tcp-fin != 0'
```

## Conclusion

tcpdump is an indispensable tool for network troubleshooting on Ubuntu and other Linux systems. Its power lies in its flexibility and the depth of analysis it enables. From simple packet captures to complex BPF filters, tcpdump can help you diagnose virtually any network issue.

Key takeaways from this guide:

1. **Start simple**: Begin with basic captures and add filters as needed
2. **Use BPF filters**: Filter at capture time for efficiency
3. **Save captures**: Write to pcap files for detailed analysis
4. **Understand TCP flags**: They reveal the state of connections
5. **Combine with other tools**: Use Wireshark for visual analysis
6. **Practice**: The more you use tcpdump, the more intuitive it becomes

Remember that while tcpdump is powerful for debugging, it's a reactive tool - you use it after problems occur. For proactive monitoring and alerting, you need a comprehensive monitoring solution.

## Proactive Monitoring with OneUptime

While tcpdump excels at deep packet-level debugging, catching network issues before they impact users requires proactive monitoring. [OneUptime](https://oneuptime.com) provides comprehensive infrastructure monitoring that complements your tcpdump debugging workflow:

- **Uptime Monitoring**: Continuously check if your services are responding and alert you before users notice issues
- **Performance Metrics**: Track response times, throughput, and error rates to identify degradation early
- **Log Management**: Aggregate and search logs from all your systems to correlate network issues with application events
- **Alerting**: Get notified via email, SMS, Slack, or PagerDuty when problems arise
- **Status Pages**: Keep your users informed during incidents with branded status pages
- **Incident Management**: Coordinate response and track resolution with built-in incident workflows

By combining the deep debugging capabilities of tcpdump with OneUptime's proactive monitoring, you can both prevent issues and quickly resolve them when they occur. Start monitoring your infrastructure today at [oneuptime.com](https://oneuptime.com).
