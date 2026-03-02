# How to Use tshark for Command-Line Packet Analysis on Ubuntu

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Ubuntu, Networking, Security, Wireshark, Tools

Description: Learn how to use tshark, the command-line version of Wireshark, to capture and analyze network packets on Ubuntu with practical filtering and output examples.

---

tshark is the command-line counterpart to Wireshark. It can capture live network traffic, read pcap files, apply display filters, decode protocols, and produce structured output - all without a GUI. For server environments, automated analysis pipelines, and remote sessions over SSH, tshark is indispensable.

## Installation

```bash
# Install tshark (part of the Wireshark package)
sudo apt install tshark

# During installation, you'll be asked if non-root users should be able to capture
# Select "Yes" to add users to the wireshark group

# Add your user to the wireshark group (if you selected Yes)
sudo usermod -aG wireshark $USER

# Apply group membership (or log out and back in)
newgrp wireshark

# Verify
tshark -v
```

## Listing Interfaces

```bash
# List all capture interfaces
tshark -D

# Output example:
# 1. eth0
# 2. lo (Loopback)
# 3. any (Pseudo-device that captures on all interfaces)
# 4. docker0
```

## Capturing Traffic

### Basic Capture

```bash
# Capture on eth0, print to stdout
sudo tshark -i eth0

# Capture on any interface
sudo tshark -i any

# Capture specific number of packets
sudo tshark -i eth0 -c 100

# Capture for a specific duration (seconds)
sudo tshark -i eth0 -a duration:30

# Capture until file reaches specific size (KB)
sudo tshark -i eth0 -a filesize:10240 -w /tmp/capture.pcap
```

### Capture Filters (BPF Syntax)

Capture filters are applied at the capture level (before any packets are written to disk). They use Berkeley Packet Filter syntax.

```bash
# Capture only HTTP traffic
sudo tshark -i eth0 -f "tcp port 80"

# Capture traffic to/from specific IP
sudo tshark -i eth0 -f "host 192.168.1.100"

# Capture only DNS queries
sudo tshark -i eth0 -f "udp port 53"

# Capture TCP SYN packets (connection attempts)
sudo tshark -i eth0 -f "tcp[tcpflags] & tcp-syn != 0"

# Capture traffic on multiple ports
sudo tshark -i eth0 -f "tcp port 80 or tcp port 443 or tcp port 8080"

# Exclude loopback
sudo tshark -i eth0 -f "not host 127.0.0.1"
```

### Writing to and Reading from Files

```bash
# Write capture to pcap file
sudo tshark -i eth0 -w /tmp/capture.pcap

# Read from a pcap file
tshark -r /tmp/capture.pcap

# Rotating files: 10 files of 100MB each
sudo tshark -i eth0 -b filesize:102400 -b files:10 -w /tmp/capture.pcap

# Read from compressed pcap
tshark -r capture.pcap.gz
```

## Display Filters

Display filters (using Wireshark's display filter syntax) are applied after capture. They're much more expressive than BPF capture filters.

```bash
# Filter displayed packets from a pcap file
tshark -r capture.pcap -Y "http"

# Combine with live capture
sudo tshark -i eth0 -Y "tcp.port == 443"

# Filter by IP address
tshark -r capture.pcap -Y "ip.addr == 192.168.1.100"

# Filter by protocol
tshark -r capture.pcap -Y "dns"
tshark -r capture.pcap -Y "http"
tshark -r capture.pcap -Y "tls"
tshark -r capture.pcap -Y "ssh"

# Filter by HTTP method
tshark -r capture.pcap -Y "http.request.method == POST"

# Filter by HTTP status code
tshark -r capture.pcap -Y "http.response.code >= 400"

# Filter DNS queries for a specific domain
tshark -r capture.pcap -Y 'dns.qry.name contains "example.com"'

# Show only TCP retransmissions
tshark -r capture.pcap -Y "tcp.analysis.retransmission"

# Show duplicate ACKs (indicates congestion/loss)
tshark -r capture.pcap -Y "tcp.analysis.duplicate_ack"

# Large TCP windows (might indicate slow receiver)
tshark -r capture.pcap -Y "tcp.window_size < 100"
```

## Controlling Output Format

### Selecting Fields with -T fields

```bash
# Show only specific fields
tshark -r capture.pcap -T fields -e ip.src -e ip.dst -e tcp.port

# HTTP requests: method and URL
tshark -r capture.pcap -Y "http.request" -T fields \
    -e ip.src \
    -e http.request.method \
    -e http.request.uri \
    -e http.host

# DNS queries
tshark -r capture.pcap -Y "dns.flags.response == 0" -T fields \
    -e frame.time \
    -e ip.src \
    -e dns.qry.name \
    -e dns.qry.type

# TLS handshake information
tshark -r capture.pcap -Y "tls.handshake.type == 1" -T fields \
    -e ip.src \
    -e ip.dst \
    -e tls.handshake.extensions_server_name

# Field separator (default is tab)
tshark -r capture.pcap -T fields -e ip.src -e ip.dst -E separator=,
```

### JSON and Other Formats

```bash
# JSON output (good for automated processing)
tshark -r capture.pcap -T json | head -50

# JSON (compact)
tshark -r capture.pcap -T jsonraw

# EK (Elasticsearch-compatible JSON, one line per packet)
tshark -r capture.pcap -T ek

# PDML (Packet Details Markup Language XML)
tshark -r capture.pcap -T pdml | head -50
```

## Statistical Analysis

tshark has built-in statistics that save you from writing analysis scripts.

```bash
# Protocol hierarchy statistics
tshark -r capture.pcap -q -z io,phs

# Conversation statistics (who talked to whom)
tshark -r capture.pcap -q -z conv,tcp
tshark -r capture.pcap -q -z conv,udp
tshark -r capture.pcap -q -z conv,ip

# Endpoint statistics
tshark -r capture.pcap -q -z endpoints,ip

# HTTP statistics
tshark -r capture.pcap -q -z http,tree

# DNS statistics
tshark -r capture.pcap -q -z dns,tree

# Expert information (warnings, errors, notes about the capture)
tshark -r capture.pcap -q -z expert

# I/O graph (throughput over time)
tshark -r capture.pcap -q -z io,stat,1

# Per-second stats for specific filter
tshark -r capture.pcap -q -z io,stat,1,"http.request","http.response"
```

## Practical Analysis Examples

### Extract HTTP URLs from a Capture

```bash
# All HTTP GET requests
sudo tshark -i eth0 -Y "http.request.method == GET" -T fields \
    -e frame.time \
    -e ip.src \
    -e http.host \
    -e http.request.uri \
    | tee /tmp/http-requests.log

# From a file
tshark -r capture.pcap -Y "http.request" -T fields \
    -e http.host \
    -e http.request.uri | sort | uniq -c | sort -rn
```

### Find Large DNS TTL Variations

```bash
# DNS responses with their TTL values
tshark -r capture.pcap -Y "dns.flags.response == 1" -T fields \
    -e dns.qry.name \
    -e dns.resp.ttl
```

### Detect Port Scans

```bash
# Capture and look for rapid connection attempts (SYN only, no established)
sudo tshark -i eth0 -f "tcp[tcpflags] & tcp-syn != 0 and tcp[tcpflags] & tcp-ack == 0" \
    -T fields -e ip.src -e tcp.dstport | \
    awk '{count[$1]++} END {for (ip in count) if (count[ip]>50) print ip, count[ip]}' | \
    sort -rn -k2
```

### Capture and Analyze HTTPS (TLS)

```bash
# View TLS handshake metadata
sudo tshark -i eth0 -Y "tls.handshake" -T fields \
    -e ip.src \
    -e ip.dst \
    -e tls.handshake.type \
    -e tls.handshake.ciphersuite \
    -e tls.handshake.extensions_server_name

# Decrypt TLS if you have the session keys (from browser SSLKEYLOGFILE)
tshark -r capture.pcap \
    -o "tls.keylog_file:/tmp/sslkeys.log" \
    -Y "http2 or http" \
    -T fields \
    -e http2.header.name \
    -e http2.header.value
```

### Monitor ICMP (Ping) Traffic

```bash
# Capture pings
sudo tshark -i eth0 -f "icmp" -T fields \
    -e frame.time \
    -e ip.src \
    -e ip.dst \
    -e icmp.type \
    -e icmp.code
```

## Combining tshark with Other Tools

```bash
# Stream live capture to Wireshark on a remote machine (via SSH)
ssh user@server "sudo tshark -i eth0 -w -" | wireshark -k -i -

# Capture and send to a remote syslog/SIEM via socat
sudo tshark -i eth0 -Y "tcp.flags.syn == 1 and tcp.flags.ack == 0" -T fields \
    -e ip.src -e ip.dst -e tcp.dstport -l | \
    socat - TCP:siem-server:514

# Count unique source IPs over time
sudo tshark -i eth0 -Y "ip" -T fields -e ip.src -l | \
    sort | uniq -c | sort -rn | head -20

# Monitor and alert on specific traffic
sudo tshark -i eth0 -Y "tcp.dstport == 23 or tcp.dstport == 21" \
    -T fields -e ip.src -e ip.dst -e tcp.dstport -l | \
    while read line; do
        echo "ALERT: Cleartext protocol detected: $line" | mail -s "Security Alert" admin@example.com
    done
```

## Useful tshark Options Reference

| Option | Purpose |
|--------|---------|
| `-i INTERFACE` | Capture interface |
| `-r FILE` | Read from pcap file |
| `-w FILE` | Write to pcap file |
| `-f FILTER` | BPF capture filter |
| `-Y FILTER` | Display filter |
| `-T FORMAT` | Output format (fields, json, pdml, etc.) |
| `-e FIELD` | Field to output (with -T fields) |
| `-c COUNT` | Stop after N packets |
| `-a CONDITION` | Auto-stop condition (duration, filesize, files) |
| `-q` | Quiet mode (suppress packet listing) |
| `-z STAT` | Calculate statistics |
| `-V` | Verbose packet details |
| `-x` | Show hex dump |
| `-l` | Flush stdout after each packet |
| `-n` | Disable DNS resolution |
| `-N FLAGS` | Selective name resolution (d=dns, n=network) |

tshark rewards investment. Its filter syntax, statistics capabilities, and field extraction make it far more powerful than simple packet sniffers. Once you're comfortable with its flags and Wireshark display filter syntax, you can analyze network behavior and troubleshoot protocol issues entirely from the command line.
