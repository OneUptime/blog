# How to Capture and Analyze Network Packets with tcpdump on RHEL

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: RHEL, Tcpdump, Packet Capture, Networking, Linux

Description: A practical guide to using tcpdump on RHEL for capturing and analyzing network traffic, covering filters, output formats, file captures, and real-world troubleshooting examples.

---

tcpdump is the Swiss army knife of network troubleshooting. When you need to see exactly what's happening on the wire, nothing else comes close. It's been around for decades, it's available on every Linux system, and once you learn the filter syntax, you can isolate any traffic pattern in seconds.

## Installing tcpdump

It's usually installed by default, but verify:

```bash
# Install tcpdump if needed
sudo dnf install -y tcpdump
```

## Basic Capture

```bash
# Capture all traffic on the default interface
sudo tcpdump -i ens192

# Capture on a specific interface
sudo tcpdump -i ens192

# Capture with more detail (show packet contents)
sudo tcpdump -i ens192 -v

# Capture with even more detail
sudo tcpdump -i ens192 -vv

# Capture on all interfaces
sudo tcpdump -i any
```

## Limiting Captures

Without limits, tcpdump runs forever. Always set boundaries.

```bash
# Capture only 100 packets
sudo tcpdump -i ens192 -c 100

# Capture for 60 seconds (use timeout)
timeout 60 sudo tcpdump -i ens192

# Don't resolve hostnames (faster output)
sudo tcpdump -i ens192 -n

# Don't resolve hostnames or ports
sudo tcpdump -i ens192 -nn
```

## Filtering by Host

```bash
# Traffic to or from a specific IP
sudo tcpdump -i ens192 -nn host 192.168.1.100

# Only traffic going TO a host
sudo tcpdump -i ens192 -nn dst host 192.168.1.100

# Only traffic coming FROM a host
sudo tcpdump -i ens192 -nn src host 192.168.1.100

# Traffic between two specific hosts
sudo tcpdump -i ens192 -nn host 192.168.1.100 and host 192.168.1.200
```

## Filtering by Port

```bash
# All HTTP traffic
sudo tcpdump -i ens192 -nn port 80

# All HTTPS traffic
sudo tcpdump -i ens192 -nn port 443

# SSH traffic
sudo tcpdump -i ens192 -nn port 22

# DNS traffic
sudo tcpdump -i ens192 -nn port 53

# Multiple ports
sudo tcpdump -i ens192 -nn port 80 or port 443
```

## Filtering by Protocol

```bash
# Only TCP packets
sudo tcpdump -i ens192 -nn tcp

# Only UDP packets
sudo tcpdump -i ens192 -nn udp

# Only ICMP (ping)
sudo tcpdump -i ens192 -nn icmp

# Only ARP
sudo tcpdump -i ens192 -nn arp
```

## Combining Filters

Filters can be combined with `and`, `or`, and `not`.

```bash
# TCP traffic to port 443 from a specific host
sudo tcpdump -i ens192 -nn 'src host 192.168.1.100 and tcp port 443'

# All traffic except SSH (useful when connected via SSH)
sudo tcpdump -i ens192 -nn 'not port 22'

# HTTP traffic not from the monitoring server
sudo tcpdump -i ens192 -nn 'port 80 and not host 10.0.0.50'
```

## Saving Captures to a File

For later analysis, save to a pcap file. You can open these in Wireshark or replay them through tcpdump.

```bash
# Save to a pcap file
sudo tcpdump -i ens192 -nn -w /tmp/capture.pcap -c 1000

# Save with a rotation (new file every 100MB)
sudo tcpdump -i ens192 -nn -w /tmp/capture.pcap -C 100

# Save with time-based rotation (new file every 3600 seconds)
sudo tcpdump -i ens192 -nn -w /tmp/capture.pcap -G 3600
```

## Reading Capture Files

```bash
# Read back a capture file
tcpdump -nn -r /tmp/capture.pcap

# Apply filters to a saved capture
tcpdump -nn -r /tmp/capture.pcap 'tcp port 80'

# Count packets in a capture
tcpdump -nn -r /tmp/capture.pcap | wc -l
```

## Showing Packet Contents

```bash
# Show packet payload in hex and ASCII
sudo tcpdump -i ens192 -nn -X -c 10 port 80

# Show only ASCII content
sudo tcpdump -i ens192 -nn -A -c 10 port 80

# Limit the amount of data captured per packet (snap length)
sudo tcpdump -i ens192 -nn -s 128 -c 10
```

## Real-World Troubleshooting Examples

**Finding who's making DNS queries:**

```bash
# Watch DNS queries
sudo tcpdump -i ens192 -nn 'udp port 53' -l | grep -i "A?"
```

**Detecting TCP connection problems:**

```bash
# Watch for TCP SYN packets without SYN-ACK (connection failures)
sudo tcpdump -i ens192 -nn 'tcp[tcpflags] & (tcp-syn) != 0'
```

**Monitoring HTTP requests:**

```bash
# Capture HTTP request headers
sudo tcpdump -i ens192 -nn -A 'tcp port 80 and (((ip[2:2] - ((ip[0]&0xf)<<2)) - ((tcp[12]&0xf0)>>2)) != 0)' | grep -E "^(GET|POST|PUT|DELETE|HEAD)"
```

**Checking for ICMP unreachable messages:**

```bash
# Watch for ICMP destination unreachable
sudo tcpdump -i ens192 -nn 'icmp[icmptype] == 3'
```

## Useful tcpdump Flags Summary

| Flag | Purpose |
|------|---------|
| `-i` | Interface to capture on |
| `-n` | Don't resolve hostnames |
| `-nn` | Don't resolve hostnames or ports |
| `-v/-vv` | Increase verbosity |
| `-c N` | Capture N packets then stop |
| `-w file` | Write to pcap file |
| `-r file` | Read from pcap file |
| `-X` | Show hex and ASCII |
| `-A` | Show ASCII only |
| `-s N` | Snap length (bytes per packet) |
| `-l` | Line-buffered output (useful for piping) |

## Wrapping Up

tcpdump is the first tool I reach for when diagnosing network issues on RHEL. The filter syntax is powerful enough to isolate exactly the traffic you need, and the pcap output format is the universal standard for packet analysis. Learn the common filters, always use `-nn` to avoid slow DNS lookups, and save captures to files when you need deeper analysis.
