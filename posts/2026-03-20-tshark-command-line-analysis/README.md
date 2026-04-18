# How to Use tshark for Command-Line Packet Analysis

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: tshark, Wireshark, Command Line, Packet Analysis, Network

Description: Learn how to use tshark, Wireshark's command-line interface, to capture and analyze network packets without a GUI, extract specific fields, generate statistics, and automate packet analysis in...

## Installing tshark

```bash
# Debian/Ubuntu

sudo apt-get install tshark wireshark-common

# RHEL/CentOS/Rocky
sudo yum install wireshark

# Allow non-root capture
sudo usermod -aG wireshark $USER
newgrp wireshark

# Verify
tshark --version
```

## Step 1: Basic Live Capture

```bash
# List available interfaces
tshark -D

# Capture on eth0 (like tcpdump -i eth0)
sudo tshark -i eth0

# Capture with filter
sudo tshark -i eth0 -f 'port 80 or port 443'

# Capture and display verbose details
sudo tshark -i eth0 -V host 192.168.1.50

# Capture N packets then stop
sudo tshark -i eth0 -c 100 -n

# Capture to PCAP file
sudo tshark -i eth0 -w /tmp/capture.pcap
```

## Step 2: Read and Filter PCAP Files

```bash
# Read existing PCAP
tshark -r /tmp/capture.pcap

# Apply display filter
tshark -r /tmp/capture.pcap -Y 'http'
tshark -r /tmp/capture.pcap -Y 'ip.addr == 192.168.1.50'
tshark -r /tmp/capture.pcap -Y 'tcp.flags.reset == 1'

# Two-pass read filter (requires -2, uses display filter syntax)
tshark -r /tmp/capture.pcap -2 -R 'ip.addr == 192.168.1.50'

# Save filtered subset to new PCAP
tshark -r /tmp/capture.pcap -Y 'http' -w /tmp/http-only.pcap
```

## Step 3: Extract Specific Fields

```bash
# -T fields: output as fields (great for scripts)
# -e field: specify which field(s) to extract

# Extract source/destination IPs
tshark -r /tmp/capture.pcap -T fields -e ip.src -e ip.dst -E header=y

# Extract HTTP method, URL, and response code
tshark -r /tmp/capture.pcap -Y 'http' \
    -T fields \
    -e http.request.method \
    -e http.request.uri \
    -e http.response.code \
    -E separator=","

# Extract DNS queries
tshark -r /tmp/capture.pcap -Y 'dns.flags.response == 0' \
    -T fields -e dns.qry.name

# Extract TCP RTT
tshark -r /tmp/capture.pcap -Y 'tcp.analysis.ack_rtt' \
    -T fields -e ip.dst -e tcp.analysis.ack_rtt
```

## Step 4: Generate Statistics

```bash
# Protocol hierarchy (traffic breakdown)
tshark -r /tmp/capture.pcap -q -z io,phs

# Conversation statistics (who talked to whom)
tshark -r /tmp/capture.pcap -q -z conv,tcp

# HTTP request stats
tshark -r /tmp/capture.pcap -q -z http,tree

# Endpoint statistics (top talkers)
tshark -r /tmp/capture.pcap -q -z endpoints,ip

# Expert information (warnings and errors)
tshark -r /tmp/capture.pcap -q -z expert

# I/O graph data (packets per second over time)
tshark -r /tmp/capture.pcap -q -z io,stat,1,"COUNT(frame) frame"
```

## Step 5: Live Capture to Pipeline

```bash
# tshark output can be piped to other tools

# Count HTTP requests per second
sudo tshark -i eth0 -T fields -e frame.time_epoch -Y 'http.request' 2>/dev/null | \
    awk '{t=int($1); count[t]++} END {for(t in count) print t, count[t]}' | sort

# Extract all DNS queries in real-time
sudo tshark -i eth0 -Y 'dns.flags.response == 0' \
    -T fields -e dns.qry.name 2>/dev/null | sort | uniq -c | sort -rn

# Monitor for TCP RST packets
sudo tshark -i eth0 -Y 'tcp.flags.reset == 1' \
    -T fields -e frame.time -e ip.src -e ip.dst -e tcp.srcport -e tcp.dstport
```

## Step 6: Decode Specific Protocols

```bash
# Force decode on non-standard port
# HTTP on port 8080
sudo tshark -i eth0 -d tcp.port==8080,http -Y 'http' port 8080

# Decode inner VLAN traffic
tshark -r /tmp/capture.pcap -Y 'vlan.id == 100 and ip'

# Decode ICMP with details
tshark -r /tmp/capture.pcap -Y 'icmp' -T fields \
    -e ip.src -e ip.dst -e icmp.type -e icmp.code
```

## Step 7: Script Examples

```bash
#!/bin/bash
# Analyze HTTP response times from PCAP

PCAP=$1

echo "=== HTTP Response Time Analysis ==="
tshark -r "$PCAP" -q -z http,tree

echo ""
echo "=== Top 10 Slowest Requests ==="
tshark -r "$PCAP" -Y 'http.response' \
    -T fields \
    -e http.request.method \
    -e http.request.full_uri \
    -e http.response.code \
    -e http.time \
    2>/dev/null | \
    sort -t$'\t' -k4 -rn | \
    head -10 | \
    awk -F'\t' '{printf "%-6s %-50s %s %ss\n", $1, $2, $3, $4}'

echo ""
echo "=== Top 10 Source IPs by Volume ==="
tshark -r "$PCAP" -q -z endpoints,ip 2>/dev/null | \
    tail -n +5 | \
    sort -k2 -rn | \
    head -10
```

```bash
# Usage
tshark -r /tmp/capture.pcap -Y 'dns.flags.response == 1 and dns.flags.rcode != 0' \
    -T fields -e dns.qry.name -e dns.flags.rcode | \
    awk '{print "FAILED DNS: "$1" (rcode="$2")"}'
```

## Conclusion

tshark provides Wireshark's protocol dissection engine in CLI form. Key operations: read PCAP with `-r`, apply display filters with `-Y 'filter'`, extract fields with `-T fields -e field.name`, and generate statistics with `-q -z statistics_name`. For scripting, combine `-T fields` output with standard Unix tools (`awk`, `sort`, `uniq`) to build custom analytics. Use `-q -z io,phs` for a quick protocol breakdown of any capture file.
