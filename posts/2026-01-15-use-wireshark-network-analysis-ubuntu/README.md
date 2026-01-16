# How to Use Wireshark for Network Analysis on Ubuntu

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Wireshark, Network Analysis, Ubuntu, Linux, Packet Capture, Security, Troubleshooting, tshark, Protocol Analysis

Description: A comprehensive guide to installing, configuring, and using Wireshark for deep network packet analysis and troubleshooting on Ubuntu Linux systems.

---

Network troubleshooting without visibility into actual packets is like debugging code without logs. Wireshark is the de facto standard for network protocol analysis, letting you capture and inspect every byte flowing through your interfaces. This guide covers everything from installation to advanced filtering, helping you transform raw packet data into actionable insights on Ubuntu.

## What is Wireshark and Why Use It

Wireshark is an open-source network protocol analyzer that captures packets in real-time and displays them in a human-readable format. Originally named Ethereal, it has become the industry standard for network troubleshooting, security analysis, and protocol development.

### Common Use Cases

- **Network troubleshooting**: Diagnose connectivity issues, latency problems, and packet loss
- **Security analysis**: Detect suspicious traffic patterns, malware communication, and unauthorized access
- **Protocol debugging**: Verify that applications implement protocols correctly
- **Performance optimization**: Identify bottlenecks, retransmissions, and inefficient patterns
- **Learning**: Understand how network protocols actually work at the packet level
- **Compliance verification**: Ensure encrypted connections and proper security configurations

## Prerequisites

Before installing Wireshark, ensure your Ubuntu system meets these requirements.

The following commands verify your system is ready for Wireshark installation.

```bash
# Check Ubuntu version (18.04 LTS or newer recommended)
lsb_release -a

# Verify you have sudo privileges for installation
sudo -v

# Check available network interfaces you might want to capture from
ip link show

# Ensure your system is updated
sudo apt update && sudo apt upgrade -y
```

You need at least 200MB of disk space and sufficient RAM to handle packet captures. For large captures, plan for additional storage since PCAP files can grow quickly.

## Installation Methods

### Method 1: Install via APT (Recommended)

The simplest installation method uses Ubuntu's package manager. This installs both the GUI and command-line tools.

```bash
# Install Wireshark with all recommended components
# This includes the GUI (wireshark-qt), CLI tools (tshark), and capture utilities
sudo apt install wireshark -y

# During installation, you will be prompted about non-superuser capture
# Select "Yes" to allow members of the 'wireshark' group to capture packets
```

If you missed the configuration prompt during installation, reconfigure the package.

```bash
# Reconfigure Wireshark to enable non-root capture
# A dialog will appear - select "Yes" to allow non-superusers
sudo dpkg-reconfigure wireshark-common
```

### Method 2: Install tshark Only (CLI-Only Systems)

For servers or headless systems where you only need command-line capture and analysis.

```bash
# Install only the command-line interface (smaller footprint)
# tshark provides full capture and filtering capabilities without GUI
sudo apt install tshark -y
```

### Method 3: Install from Official PPA (Latest Version)

The official Wireshark PPA provides the most recent stable release with newer features.

```bash
# Add the official Wireshark stable PPA
sudo add-apt-repository ppa:wireshark-dev/stable -y

# Update package lists to include new repository
sudo apt update

# Install the latest Wireshark version
sudo apt install wireshark -y
```

### Verify Installation

Confirm Wireshark installed correctly by checking versions of all components.

```bash
# Check GUI version
wireshark --version

# Check CLI version (should match GUI version)
tshark --version

# Check capture utility version
dumpcap --version

# List available capture interfaces
tshark -D
```

## Configuring Capture Permissions

By default, raw packet capture requires root privileges for security reasons. Wireshark provides a safer alternative using Linux capabilities.

### Add Your User to the Wireshark Group

This grants capture privileges without running Wireshark as root.

```bash
# Add your current user to the wireshark group
# Replace $USER with a specific username if configuring for another user
sudo usermod -aG wireshark $USER

# Apply the group change immediately without logging out
# Alternatively, log out and back in for the change to take effect
newgrp wireshark

# Verify your user is now in the wireshark group
groups $USER
```

### Verify Capabilities on dumpcap

The dumpcap binary needs special capabilities to capture packets as non-root.

```bash
# Check current capabilities on dumpcap
getcap /usr/bin/dumpcap

# Expected output: /usr/bin/dumpcap cap_net_admin,cap_net_raw=eip
# If missing, set the capabilities manually
sudo setcap cap_net_admin,cap_net_raw=eip /usr/bin/dumpcap
```

### Test Capture Permissions

Verify you can capture packets without sudo.

```bash
# List interfaces accessible for capture (should work without sudo)
dumpcap -D

# Start a brief test capture on the first interface
# Press Ctrl+C after a few seconds to stop
dumpcap -i 1 -c 10 -w /tmp/test.pcap

# If successful, remove the test file
rm /tmp/test.pcap
```

## Basic Capture Operations

### Starting a Capture from the GUI

Launch Wireshark and begin capturing traffic.

```bash
# Start Wireshark GUI
wireshark &
```

In the GUI:
1. Select your network interface from the welcome screen (commonly `eth0`, `ens33`, or `wlan0`)
2. Double-click the interface to start capturing immediately
3. Alternatively, click the blue shark fin icon in the toolbar

### Starting a Capture from Command Line

Use tshark for scriptable, automated captures.

```bash
# Capture 100 packets from eth0 and display summary on screen
# -i: interface to capture from
# -c: number of packets to capture before stopping
tshark -i eth0 -c 100

# Capture traffic and save to a file for later analysis
# -w: output file path (pcap format)
tshark -i eth0 -w /tmp/capture.pcap

# Capture with a time limit instead of packet count
# -a duration:60: stop after 60 seconds
tshark -i eth0 -a duration:60 -w /tmp/timed_capture.pcap
```

### Ring Buffer Captures for Long-Term Monitoring

For extended monitoring without filling disk space, use ring buffer mode.

```bash
# Capture continuously with rotating files
# -b filesize:10000: Create new file every 10MB
# -b files:5: Keep only 5 files (50MB total maximum)
# Old files are automatically deleted when new ones are created
tshark -i eth0 -b filesize:10000 -b files:5 -w /var/log/capture/network.pcap

# Alternative: rotate based on time
# -b duration:3600: New file every hour
# -b files:24: Keep 24 hours of captures
tshark -i eth0 -b duration:3600 -b files:24 -w /var/log/capture/hourly.pcap
```

### Stopping and Saving Captures

In the GUI, click the red square stop button. From command line, press `Ctrl+C` or use the defined limits.

```bash
# Gracefully stop a running tshark by sending SIGINT
# Find the process ID first
pgrep -f "tshark -i eth0"

# Send interrupt signal to stop capture cleanly
kill -INT $(pgrep -f "tshark -i eth0")
```

## Display Filters Syntax and Examples

Display filters are applied after capture to show only packets matching your criteria. They use a powerful expression language.

### Basic Filter Syntax

Display filters use field names, comparison operators, and logical operators.

```text
# Basic syntax structure:
# field_name comparison_operator value

# Field names follow the protocol hierarchy
# Examples: ip.addr, tcp.port, http.host, dns.qry.name

# Comparison operators:
# == (equals), != (not equals)
# > (greater than), < (less than)
# >= (greater or equal), <= (less or equal)
# contains (substring match)
# matches (regex match)

# Logical operators:
# and, or, not (can also use &&, ||, !)
# Parentheses for grouping: (filter1) and (filter2)
```

### IP Address Filters

Filter traffic by source, destination, or any IP address.

```text
# Show only traffic to or from a specific IP
ip.addr == 192.168.1.100

# Show only traffic FROM a specific source IP
ip.src == 192.168.1.100

# Show only traffic TO a specific destination IP
ip.dst == 10.0.0.1

# Show traffic within a subnet (CIDR notation)
ip.addr == 192.168.1.0/24

# Exclude traffic from a specific IP
!(ip.addr == 192.168.1.1)

# Show traffic between two specific hosts
ip.addr == 192.168.1.100 and ip.addr == 10.0.0.1
```

### Port and Protocol Filters

Filter by transport layer ports and protocols.

```text
# Show only TCP traffic
tcp

# Show only UDP traffic
udp

# Show traffic on a specific port (source or destination)
tcp.port == 443

# Show traffic from a specific source port
tcp.srcport == 8080

# Show traffic to a specific destination port
tcp.dstport == 22

# Show traffic on multiple ports
tcp.port == 80 or tcp.port == 443

# Show HTTP traffic (port 80) or HTTPS (port 443)
tcp.port in {80, 443, 8080, 8443}

# Show DNS traffic (UDP port 53)
udp.port == 53
```

### Application Protocol Filters

Filter by application-layer protocols.

```text
# Show only HTTP traffic (dissected as HTTP)
http

# Show only DNS traffic
dns

# Show only TLS/SSL traffic
tls

# Show DHCP traffic
dhcp

# Show ARP requests and replies
arp

# Show ICMP (ping) traffic
icmp

# Show SSH traffic
ssh

# Show FTP traffic (control and data)
ftp or ftp-data
```

### Advanced Filter Examples

Combine filters for precise traffic isolation.

```text
# HTTP GET requests only
http.request.method == "GET"

# HTTP POST requests to a specific host
http.request.method == "POST" and http.host contains "api.example.com"

# DNS queries for a specific domain
dns.qry.name contains "example.com"

# TLS traffic with a specific SNI (Server Name Indication)
tls.handshake.extensions_server_name == "secure.example.com"

# TCP packets with SYN flag set (connection initiations)
tcp.flags.syn == 1 and tcp.flags.ack == 0

# TCP retransmissions (indicates packet loss)
tcp.analysis.retransmission

# Large packets (potential fragmentation or MTU issues)
frame.len > 1400

# Packets with TCP errors (resets, zero windows)
tcp.flags.reset == 1 or tcp.analysis.zero_window

# HTTP response codes in 4xx or 5xx range (errors)
http.response.code >= 400
```

## Capture Filters

Capture filters are applied during capture to reduce file size and focus on relevant traffic. They use BPF (Berkeley Packet Filter) syntax, which differs from display filters.

### Capture Filter Syntax

BPF filters are more limited but execute at the kernel level for efficiency.

```bash
# Basic capture filter syntax in tshark
# -f: specify the capture filter
tshark -i eth0 -f "capture_filter_expression"

# In Wireshark GUI: Enter filter in the capture options dialog
# before starting the capture
```

### Common Capture Filters

These filters determine what packets are captured (not just displayed).

```bash
# Capture only traffic to/from a specific host
tshark -i eth0 -f "host 192.168.1.100"

# Capture only traffic from a specific source
tshark -i eth0 -f "src host 192.168.1.100"

# Capture only traffic to a specific destination
tshark -i eth0 -f "dst host 192.168.1.100"

# Capture traffic on a specific port
tshark -i eth0 -f "port 443"

# Capture only TCP traffic
tshark -i eth0 -f "tcp"

# Capture only UDP traffic
tshark -i eth0 -f "udp"

# Capture traffic on a subnet
tshark -i eth0 -f "net 192.168.1.0/24"

# Capture HTTP and HTTPS traffic
tshark -i eth0 -f "tcp port 80 or tcp port 443"

# Capture DNS traffic
tshark -i eth0 -f "udp port 53"

# Exclude SSH traffic (useful when capturing over SSH)
tshark -i eth0 -f "not port 22"

# Capture ICMP (ping) traffic
tshark -i eth0 -f "icmp"

# Capture traffic between two hosts
tshark -i eth0 -f "host 192.168.1.100 and host 10.0.0.1"

# Complex filter: HTTP from specific subnet, excluding internal traffic
tshark -i eth0 -f "tcp port 80 and src net 10.0.0.0/8 and not dst net 10.0.0.0/8"
```

## Protocol Analysis

### Analyzing HTTP Traffic

HTTP analysis reveals application behavior, API calls, and potential issues.

```bash
# Capture HTTP traffic and show detailed request/response info
# -Y: display filter (applied after capture)
# -V: verbose output showing all protocol layers
tshark -i eth0 -f "tcp port 80" -Y "http" -V

# Extract HTTP requests with method, host, and URI
# -T fields: output specific fields only
# -e: specify which fields to extract
tshark -i eth0 -Y "http.request" \
  -T fields \
  -e http.request.method \
  -e http.host \
  -e http.request.uri

# Show HTTP response codes and content types
tshark -i eth0 -Y "http.response" \
  -T fields \
  -e http.response.code \
  -e http.content_type \
  -e http.content_length

# Find slow HTTP responses (useful for performance analysis)
# Filter responses where time since request > 1 second
tshark -r capture.pcap -Y "http.time > 1"
```

### Analyzing DNS Traffic

DNS analysis helps troubleshoot resolution issues and detect suspicious queries.

```bash
# Capture and display DNS queries and responses
tshark -i eth0 -f "udp port 53" -Y "dns"

# Extract DNS query names and response addresses
tshark -i eth0 -Y "dns" \
  -T fields \
  -e dns.qry.name \
  -e dns.a \
  -e dns.aaaa

# Show only DNS queries (not responses)
tshark -i eth0 -Y "dns.flags.response == 0" \
  -T fields \
  -e dns.qry.name \
  -e dns.qry.type

# Show DNS errors (NXDOMAIN, SERVFAIL, etc.)
# dns.flags.rcode != 0 means non-successful response
tshark -i eth0 -Y "dns.flags.rcode != 0" \
  -T fields \
  -e dns.qry.name \
  -e dns.flags.rcode

# Calculate DNS response times
tshark -r capture.pcap -Y "dns.time" \
  -T fields \
  -e dns.qry.name \
  -e dns.time
```

### Analyzing TCP Connections

TCP analysis reveals connection behavior, handshakes, and problems.

```bash
# Show TCP connection establishments (SYN packets)
tshark -i eth0 -Y "tcp.flags.syn == 1 and tcp.flags.ack == 0" \
  -T fields \
  -e ip.src \
  -e ip.dst \
  -e tcp.dstport

# Show TCP connection terminations (FIN or RST)
tshark -i eth0 -Y "tcp.flags.fin == 1 or tcp.flags.reset == 1"

# Identify TCP retransmissions (indicates packet loss)
tshark -r capture.pcap -Y "tcp.analysis.retransmission" \
  -T fields \
  -e frame.number \
  -e ip.src \
  -e ip.dst \
  -e tcp.analysis.retransmission

# Show TCP zero window events (receiver buffer full)
tshark -r capture.pcap -Y "tcp.analysis.zero_window"

# Show TCP duplicate ACKs (potential congestion or loss)
tshark -r capture.pcap -Y "tcp.analysis.duplicate_ack"

# Calculate TCP round-trip times
tshark -r capture.pcap -Y "tcp.analysis.ack_rtt" \
  -T fields \
  -e tcp.stream \
  -e tcp.analysis.ack_rtt
```

### Analyzing TLS/SSL Traffic

TLS analysis helps verify encryption configuration without decrypting content.

```bash
# Show TLS Client Hello messages (connection initiations)
tshark -i eth0 -Y "tls.handshake.type == 1" \
  -T fields \
  -e ip.src \
  -e tls.handshake.extensions_server_name

# Show TLS versions being used
tshark -r capture.pcap -Y "tls.handshake.type == 2" \
  -T fields \
  -e ip.dst \
  -e tls.handshake.version

# Show cipher suites offered by clients
tshark -r capture.pcap -Y "tls.handshake.type == 1" \
  -T fields \
  -e tls.handshake.ciphersuite

# Show selected cipher suite from server
tshark -r capture.pcap -Y "tls.handshake.type == 2" \
  -T fields \
  -e tls.handshake.ciphersuite

# Detect TLS certificate information
tshark -r capture.pcap -Y "tls.handshake.certificate" \
  -T fields \
  -e x509sat.printableString

# Find TLS handshake failures
tshark -r capture.pcap -Y "tls.alert_message"
```

## Following TCP Streams

TCP stream following reconstructs the complete conversation between two endpoints, making it easy to read application data.

### Following Streams in GUI

1. Right-click on any packet in the conversation
2. Select "Follow" then "TCP Stream"
3. The stream window shows the complete conversation
4. Client data appears in one color, server responses in another

### Following Streams in Command Line

Use tshark to extract and follow streams.

```bash
# List all TCP streams in a capture file
tshark -r capture.pcap -T fields -e tcp.stream | sort -n | uniq

# Follow a specific TCP stream (stream number 5)
# -z follow,tcp,ascii,5: Follow TCP stream 5, output as ASCII
tshark -r capture.pcap -z follow,tcp,ascii,5 -q

# Follow stream and output as hex dump
tshark -r capture.pcap -z follow,tcp,hex,5 -q

# Follow stream and output raw bytes (useful for binary protocols)
tshark -r capture.pcap -z follow,tcp,raw,5 -q

# Follow HTTP stream (for HTTP/1.x traffic)
tshark -r capture.pcap -z follow,http,ascii,0 -q

# Export stream data to a file
tshark -r capture.pcap -z follow,tcp,raw,5 -q | xxd -r -p > stream_data.bin
```

### Filtering and Following Specific Conversations

Isolate specific conversations before following.

```bash
# Find the stream number for a specific conversation
tshark -r capture.pcap \
  -Y "ip.addr == 192.168.1.100 and tcp.port == 443" \
  -T fields -e tcp.stream | head -1

# Follow all streams for a specific host (outputs multiple streams)
for stream in $(tshark -r capture.pcap -Y "ip.addr == 192.168.1.100" \
  -T fields -e tcp.stream | sort -n | uniq); do
    echo "=== Stream $stream ==="
    tshark -r capture.pcap -z follow,tcp,ascii,$stream -q
done
```

## Statistics and IO Graphs

Wireshark provides powerful statistical analysis tools for understanding traffic patterns.

### Protocol Hierarchy Statistics

See the breakdown of protocols in your capture.

```bash
# Display protocol hierarchy statistics
# Shows percentage of bytes/packets for each protocol layer
tshark -r capture.pcap -z io,phs -q

# Example output:
# Protocol Hierarchy Statistics
# eth                       frames:1000 bytes:150000
#   ip                      frames:950  bytes:142500
#     tcp                   frames:800  bytes:120000
#       http                frames:200  bytes:50000
#       tls                 frames:500  bytes:60000
#     udp                   frames:150  bytes:22500
#       dns                 frames:100  bytes:10000
```

### Conversation Statistics

Analyze traffic between endpoint pairs.

```bash
# Show IP conversations (who is talking to whom)
# Sorted by bytes transferred
tshark -r capture.pcap -z conv,ip -q

# Show TCP conversations with ports
tshark -r capture.pcap -z conv,tcp -q

# Show Ethernet conversations (MAC addresses)
tshark -r capture.pcap -z conv,eth -q

# Show conversations for a specific IP only
tshark -r capture.pcap -z conv,ip,ip.addr==192.168.1.100 -q
```

### Endpoint Statistics

See which hosts generated the most traffic.

```bash
# Show IP endpoint statistics
tshark -r capture.pcap -z endpoints,ip -q

# Show TCP endpoint statistics
tshark -r capture.pcap -z endpoints,tcp -q

# Sort endpoints by packet count
tshark -r capture.pcap -z endpoints,ip -q | sort -t',' -k2 -n -r
```

### IO Statistics Over Time

Analyze traffic patterns over time intervals.

```bash
# Show IO statistics with 1-second intervals
# Useful for identifying traffic spikes
tshark -r capture.pcap -z io,stat,1 -q

# Show IO statistics with 10-second intervals
tshark -r capture.pcap -z io,stat,10 -q

# Show IO statistics for specific traffic
# Compare HTTP vs HTTPS traffic over time
tshark -r capture.pcap -z io,stat,1,"http","tls" -q

# Show IO statistics for specific hosts
tshark -r capture.pcap -z io,stat,1,"ip.addr==192.168.1.100" -q
```

### Response Time Statistics

Measure service response times.

```bash
# HTTP response time statistics
tshark -r capture.pcap -z http,stat -q

# DNS response time statistics
tshark -r capture.pcap -z dns,tree -q

# SMB response time statistics (for file share analysis)
tshark -r capture.pcap -z smb,srt -q
```

### Expert Information

Get automatic problem detection and analysis tips.

```bash
# Show expert information (warnings, errors, notes)
tshark -r capture.pcap -z expert -q

# Show only errors (severe issues)
tshark -r capture.pcap -z expert,error -q

# Show warnings and errors
tshark -r capture.pcap -z expert,warn -q
```

## Exporting Data

Wireshark can export packet data in various formats for further analysis.

### Export to Different Capture Formats

```bash
# Convert pcapng to pcap (compatibility with older tools)
editcap -F pcap input.pcapng output.pcap

# Convert pcap to pcapng (newer format with more features)
editcap -F pcapng input.pcap output.pcapng

# Split a large capture into smaller files
# -c 10000: 10000 packets per file
editcap -c 10000 large_capture.pcap split_capture.pcap

# Extract specific time range from capture
# -A: start time, -B: end time
editcap -A "2024-01-15 10:00:00" -B "2024-01-15 11:00:00" \
  capture.pcap filtered.pcap
```

### Export Specific Fields to CSV

```bash
# Export HTTP requests to CSV
tshark -r capture.pcap -Y "http.request" \
  -T fields \
  -E header=y \
  -E separator=, \
  -E quote=d \
  -e frame.time \
  -e ip.src \
  -e http.host \
  -e http.request.method \
  -e http.request.uri \
  > http_requests.csv

# Export DNS queries to CSV
tshark -r capture.pcap -Y "dns.flags.response == 0" \
  -T fields \
  -E header=y \
  -E separator=, \
  -e frame.time \
  -e ip.src \
  -e dns.qry.name \
  -e dns.qry.type \
  > dns_queries.csv

# Export connection summary to CSV
tshark -r capture.pcap -Y "tcp.flags.syn==1 and tcp.flags.ack==0" \
  -T fields \
  -E header=y \
  -E separator=, \
  -e frame.time \
  -e ip.src \
  -e ip.dst \
  -e tcp.dstport \
  > connections.csv
```

### Export Objects (Files) from Traffic

Extract files transferred over HTTP, SMB, or other protocols.

```bash
# Export HTTP objects (downloaded files, images, etc.)
# --export-objects: protocol,destination_directory
tshark -r capture.pcap --export-objects http,/tmp/http_objects

# Export SMB objects (files from Windows shares)
tshark -r capture.pcap --export-objects smb,/tmp/smb_objects

# Export DICOM objects (medical imaging)
tshark -r capture.pcap --export-objects dicom,/tmp/dicom_objects

# Export IMF objects (email messages)
tshark -r capture.pcap --export-objects imf,/tmp/email_objects
```

### Export to JSON for Programmatic Analysis

```bash
# Export packets as JSON (full packet details)
tshark -r capture.pcap -T json > packets.json

# Export specific fields as JSON
tshark -r capture.pcap -Y "http" \
  -T json \
  -e frame.time \
  -e ip.src \
  -e http.host \
  > http_json.json

# Export with Elasticsearch-compatible format
tshark -r capture.pcap -T ek > packets.ndjson
```

## Command-Line Usage with tshark

tshark provides full Wireshark functionality for scripting, automation, and headless systems.

### Basic tshark Operations

```bash
# Live capture with real-time display
tshark -i eth0

# Capture specific number of packets
tshark -i eth0 -c 100

# Capture for specific duration (seconds)
tshark -i eth0 -a duration:60

# Capture with both capture and display filters
tshark -i eth0 -f "tcp port 80" -Y "http.request"

# Read from existing capture file
tshark -r capture.pcap

# Write capture to file
tshark -i eth0 -w output.pcap
```

### Advanced tshark Output Formatting

```bash
# Show only specific fields (custom output)
tshark -r capture.pcap \
  -T fields \
  -e frame.number \
  -e frame.time_relative \
  -e ip.src \
  -e ip.dst \
  -e _ws.col.Protocol \
  -e _ws.col.Info

# Show packet summary (one line per packet)
tshark -r capture.pcap -T tabs

# Show full packet details (verbose)
tshark -r capture.pcap -V

# Show hex dump of packets
tshark -r capture.pcap -x

# Show only packet count matching filter
tshark -r capture.pcap -Y "http" | wc -l
```

### Scripting with tshark

Automate network analysis tasks.

```bash
#!/bin/bash
# Script: analyze_capture.sh
# Analyzes a capture file and generates a summary report

PCAP_FILE=$1
REPORT_FILE="${PCAP_FILE%.pcap}_report.txt"

echo "Network Capture Analysis Report" > "$REPORT_FILE"
echo "================================" >> "$REPORT_FILE"
echo "File: $PCAP_FILE" >> "$REPORT_FILE"
echo "Date: $(date)" >> "$REPORT_FILE"
echo "" >> "$REPORT_FILE"

# Total packets
echo "Total Packets: $(tshark -r "$PCAP_FILE" | wc -l)" >> "$REPORT_FILE"

# Protocol breakdown
echo "" >> "$REPORT_FILE"
echo "Protocol Hierarchy:" >> "$REPORT_FILE"
tshark -r "$PCAP_FILE" -z io,phs -q >> "$REPORT_FILE"

# Top talkers
echo "" >> "$REPORT_FILE"
echo "Top 10 Source IPs:" >> "$REPORT_FILE"
tshark -r "$PCAP_FILE" -T fields -e ip.src | sort | uniq -c | sort -rn | head -10 >> "$REPORT_FILE"

# HTTP hosts accessed
echo "" >> "$REPORT_FILE"
echo "HTTP Hosts Accessed:" >> "$REPORT_FILE"
tshark -r "$PCAP_FILE" -Y "http.request" -T fields -e http.host | sort | uniq -c | sort -rn >> "$REPORT_FILE"

# DNS queries
echo "" >> "$REPORT_FILE"
echo "Top DNS Queries:" >> "$REPORT_FILE"
tshark -r "$PCAP_FILE" -Y "dns.flags.response==0" -T fields -e dns.qry.name | sort | uniq -c | sort -rn | head -20 >> "$REPORT_FILE"

# TCP issues
echo "" >> "$REPORT_FILE"
echo "TCP Retransmissions: $(tshark -r "$PCAP_FILE" -Y "tcp.analysis.retransmission" | wc -l)" >> "$REPORT_FILE"
echo "TCP Reset Packets: $(tshark -r "$PCAP_FILE" -Y "tcp.flags.reset==1" | wc -l)" >> "$REPORT_FILE"

echo "Report saved to $REPORT_FILE"
```

### Real-Time Monitoring with tshark

Monitor network traffic patterns in real-time.

```bash
# Monitor HTTP requests in real-time
tshark -i eth0 -Y "http.request" \
  -T fields \
  -e frame.time \
  -e ip.src \
  -e http.host \
  -e http.request.uri

# Monitor DNS queries in real-time
tshark -i eth0 -Y "dns.flags.response==0" \
  -T fields \
  -e frame.time \
  -e ip.src \
  -e dns.qry.name

# Monitor new TCP connections
tshark -i eth0 -Y "tcp.flags.syn==1 and tcp.flags.ack==0" \
  -T fields \
  -e frame.time \
  -e ip.src \
  -e ip.dst \
  -e tcp.dstport

# Monitor with statistics updates every 5 seconds
tshark -i eth0 -z io,stat,5 -q
```

## Remote Capture with dumpcap

dumpcap is a lightweight capture tool ideal for remote packet capture scenarios.

### Basic Remote Capture

Capture on a remote server and transfer files for analysis.

```bash
# On the remote server: Start capture with dumpcap
# dumpcap has smaller memory footprint than tshark
ssh user@remote-server "dumpcap -i eth0 -w /tmp/remote_capture.pcap -b filesize:10000 -b files:5"

# Transfer capture file to local machine for analysis
scp user@remote-server:/tmp/remote_capture.pcap ./

# Analyze locally with full Wireshark capabilities
wireshark remote_capture.pcap
```

### Streaming Remote Capture

Stream packets from remote machine for real-time analysis.

```bash
# Stream remote capture through SSH pipe to local tshark
# Remote: dumpcap outputs to stdout (-w -)
# Local: tshark reads from stdin (-i -)
ssh user@remote-server "dumpcap -i eth0 -w - -f 'tcp port 80'" | tshark -i -

# Stream to local Wireshark GUI
ssh user@remote-server "dumpcap -i eth0 -w - -f 'tcp port 80'" | wireshark -k -i -

# Stream with compression for bandwidth efficiency
ssh user@remote-server "dumpcap -i eth0 -w - | gzip" | gunzip | tshark -i -
```

### Capture on Multiple Remote Hosts

Coordinate captures across multiple servers.

```bash
#!/bin/bash
# Script: distributed_capture.sh
# Start synchronized captures on multiple servers

SERVERS="server1 server2 server3"
DURATION=300
CAPTURE_FILTER="tcp port 443"
OUTPUT_DIR="/tmp/captures"

mkdir -p "$OUTPUT_DIR"

# Start captures on all servers simultaneously
for server in $SERVERS; do
    echo "Starting capture on $server..."
    ssh "$server" "dumpcap -i eth0 -a duration:$DURATION -f '$CAPTURE_FILTER' -w /tmp/capture_\$(hostname).pcap" &
done

# Wait for all captures to complete
wait

# Collect capture files
for server in $SERVERS; do
    echo "Collecting capture from $server..."
    scp "$server:/tmp/capture_*.pcap" "$OUTPUT_DIR/"
done

echo "All captures collected in $OUTPUT_DIR"
```

### Secure Remote Capture Setup

Configure secure remote capture access.

```bash
# Create a dedicated capture user with limited privileges
sudo useradd -r -s /bin/false capture_user
sudo usermod -aG wireshark capture_user

# Create SSH key for automated capture
ssh-keygen -t ed25519 -f ~/.ssh/capture_key -N "" -C "capture automation"

# Copy key to remote servers
ssh-copy-id -i ~/.ssh/capture_key.pub capture_user@remote-server

# Set up SSH config for easy access
cat >> ~/.ssh/config << 'EOF'
Host capture-*
    User capture_user
    IdentityFile ~/.ssh/capture_key
    StrictHostKeyChecking accept-new
EOF

# Now use simplified commands
ssh capture-server1 "dumpcap -i eth0 -c 1000 -w /tmp/capture.pcap"
```

## Troubleshooting Common Network Issues

### Diagnosing Connectivity Problems

```bash
# Check for ICMP unreachable messages
tshark -i eth0 -Y "icmp.type == 3" -T fields \
  -e ip.src -e ip.dst -e icmp.code

# ICMP codes: 0=net unreachable, 1=host unreachable, 3=port unreachable

# Check for TCP connection failures (SYN without SYN-ACK)
tshark -r capture.pcap -Y "tcp.flags.syn==1 and tcp.flags.ack==0" \
  -T fields -e ip.dst -e tcp.dstport | sort | uniq -c

# Compare with successful connections
tshark -r capture.pcap -Y "tcp.flags.syn==1 and tcp.flags.ack==1" \
  -T fields -e ip.dst -e tcp.dstport | sort | uniq -c

# Check for TCP RST (connection rejected)
tshark -r capture.pcap -Y "tcp.flags.reset==1" \
  -T fields -e ip.src -e ip.dst -e tcp.dstport
```

### Diagnosing Latency Issues

```bash
# Measure TCP handshake times
tshark -r capture.pcap -Y "tcp.flags.syn==1 and tcp.flags.ack==1" \
  -T fields \
  -e ip.src \
  -e ip.dst \
  -e tcp.analysis.initial_rtt

# Identify slow DNS responses (over 100ms)
tshark -r capture.pcap -Y "dns.time > 0.1" \
  -T fields \
  -e dns.qry.name \
  -e dns.time

# Find high TCP RTT (round-trip time)
tshark -r capture.pcap -Y "tcp.analysis.ack_rtt > 0.5" \
  -T fields \
  -e tcp.stream \
  -e ip.src \
  -e ip.dst \
  -e tcp.analysis.ack_rtt

# Identify time gaps between packets (stalls)
tshark -r capture.pcap -T fields \
  -e frame.number \
  -e frame.time_delta \
  | awk -F'\t' '$2 > 1 {print "Gap at frame " $1 ": " $2 "s"}'
```

### Diagnosing Packet Loss

```bash
# Count TCP retransmissions by destination
tshark -r capture.pcap -Y "tcp.analysis.retransmission" \
  -T fields -e ip.dst | sort | uniq -c | sort -rn

# Show duplicate ACKs (indicates receiver detected loss)
tshark -r capture.pcap -Y "tcp.analysis.duplicate_ack" \
  -T fields -e frame.number -e ip.src -e tcp.analysis.duplicate_ack_num

# Check for out-of-order packets
tshark -r capture.pcap -Y "tcp.analysis.out_of_order"

# Calculate retransmission rate
TOTAL=$(tshark -r capture.pcap -Y "tcp" | wc -l)
RETRANS=$(tshark -r capture.pcap -Y "tcp.analysis.retransmission" | wc -l)
echo "Retransmission rate: $(echo "scale=2; $RETRANS * 100 / $TOTAL" | bc)%"
```

### Diagnosing DNS Issues

```bash
# Find DNS queries without responses
# First, get all query IDs
tshark -r capture.pcap -Y "dns.flags.response==0" \
  -T fields -e dns.id -e dns.qry.name > /tmp/queries.txt

# Then check which have responses
tshark -r capture.pcap -Y "dns.flags.response==1" \
  -T fields -e dns.id > /tmp/responses.txt

# Find unanswered queries
comm -23 <(cut -f1 /tmp/queries.txt | sort) <(sort /tmp/responses.txt)

# Check for DNS NXDOMAIN responses (domain not found)
tshark -r capture.pcap -Y "dns.flags.rcode == 3" \
  -T fields -e dns.qry.name | sort | uniq -c

# Check for SERVFAIL responses (server failure)
tshark -r capture.pcap -Y "dns.flags.rcode == 2" \
  -T fields -e dns.qry.name | sort | uniq -c
```

### Diagnosing TLS/SSL Issues

```bash
# Check for TLS handshake failures
tshark -r capture.pcap -Y "tls.alert_message" \
  -T fields \
  -e ip.src \
  -e ip.dst \
  -e tls.alert_message.desc

# Check TLS versions in use
tshark -r capture.pcap -Y "tls.handshake.type == 2" \
  -T fields -e tls.handshake.version | sort | uniq -c

# Identify certificate issues
tshark -r capture.pcap -Y "tls.alert_message.desc == 42" # Bad certificate
tshark -r capture.pcap -Y "tls.alert_message.desc == 43" # Unsupported certificate
tshark -r capture.pcap -Y "tls.alert_message.desc == 44" # Certificate revoked
tshark -r capture.pcap -Y "tls.alert_message.desc == 45" # Certificate expired

# Check cipher suite mismatches
tshark -r capture.pcap -Y "tls.alert_message.desc == 40" # Handshake failure
```

### Diagnosing Application-Level Issues

```bash
# Find HTTP errors (4xx and 5xx responses)
tshark -r capture.pcap -Y "http.response.code >= 400" \
  -T fields \
  -e http.request.uri \
  -e http.response.code \
  -e http.response.phrase

# Check for slow HTTP responses (over 2 seconds)
tshark -r capture.pcap -Y "http.time > 2" \
  -T fields \
  -e http.request.uri \
  -e http.time

# Monitor for connection timeouts (incomplete TCP streams)
tshark -r capture.pcap -z conv,tcp -q | grep -v "complete"

# Check for application keepalive issues
tshark -r capture.pcap -Y "tcp.analysis.keep_alive"
```

## Wireshark Best Practices

### Performance Optimization

```bash
# Use capture filters to reduce data volume at capture time
# This is more efficient than capturing everything and filtering later
tshark -i eth0 -f "tcp port 443 and host 10.0.0.0/8" -w filtered.pcap

# Disable name resolution for faster processing
tshark -r capture.pcap -n -Y "http"

# Use ring buffers for continuous capture
tshark -i eth0 -b filesize:100000 -b files:10 -w /var/log/captures/net.pcap

# For large files, use editcap to extract relevant portions first
editcap -A "2024-01-15 10:00:00" -B "2024-01-15 10:05:00" large.pcap small.pcap
```

### Security Considerations

```bash
# Capture files may contain sensitive data
# Set appropriate permissions
chmod 600 capture.pcap

# Encrypt capture files at rest
gpg --symmetric --cipher-algo AES256 capture.pcap

# Sanitize captures before sharing (remove payload data)
# Keep only headers for troubleshooting
editcap -s 96 capture.pcap headers_only.pcap

# Remove specific packets (e.g., containing passwords)
editcap -r capture.pcap sanitized.pcap 1-100 150-500  # Keep only specified ranges
```

### Automation and Integration

```bash
# Integrate with cron for scheduled captures
# Add to /etc/cron.d/network-capture
0 */4 * * * root dumpcap -i eth0 -a duration:300 -w /var/log/captures/scheduled_$(date +\%Y\%m\%d_\%H\%M).pcap

# Send alerts on specific traffic patterns
#!/bin/bash
# alert_on_pattern.sh
while true; do
    COUNT=$(tshark -i eth0 -a duration:60 -Y "tcp.flags.reset==1" -q 2>/dev/null | wc -l)
    if [ "$COUNT" -gt 100 ]; then
        echo "High TCP reset count: $COUNT" | mail -s "Network Alert" admin@example.com
    fi
done

# Export metrics for monitoring systems
tshark -r capture.pcap -z io,stat,60 -q | \
  awk '/Interval/ {print "network.packets.count " $4 " " systime()}' | \
  nc graphite.example.com 2003
```

---

Network analysis with Wireshark gives you unprecedented visibility into what is actually happening on the wire. Whether you are debugging a subtle TCP issue, verifying TLS configuration, or investigating suspicious traffic, the techniques in this guide provide a solid foundation for thorough packet-level analysis.

For ongoing network monitoring and alerting beyond packet capture, consider [OneUptime](https://oneuptime.com). OneUptime provides comprehensive infrastructure monitoring that complements packet analysis with real-time uptime monitoring, synthetic monitoring, log management, and incident response workflows. While Wireshark helps you diagnose specific network issues, OneUptime ensures you are immediately alerted when problems occur, helping you maintain reliable network services around the clock.
