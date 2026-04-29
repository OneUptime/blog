# How to Monitor UDP Traffic with tcpdump

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: UDP, tcpdump, Monitoring, Packet Analysis, Linux, Networking

Description: Capture and analyze UDP traffic with tcpdump to monitor packet rates, troubleshoot UDP services, and examine UDP payload contents.

## Introduction

UDP traffic is stateless from the network perspective, making monitoring different from TCP. There is no connection establishment to observe - packets simply appear. `tcpdump` captures UDP at the packet level, letting you see the source, destination, ports, payload size, and timing of every datagram. This guide covers the essential tcpdump filters and analysis techniques for UDP traffic.

## Basic UDP Capture

```bash
# Capture all UDP traffic

tcpdump -i eth0 -n udp

# Capture UDP on a specific port
tcpdump -i eth0 -n 'udp port 5000'

# Capture UDP to/from a specific host
tcpdump -i eth0 -n 'udp and host 10.20.0.5'

# Capture UDP on a port range
tcpdump -i eth0 -n 'udp portrange 5000-5100'

# Capture UDP excluding common background noise (DNS, NTP)
tcpdump -i eth0 -n 'udp and not port 53 and not port 123'
```

## Analyzing UDP Packet Contents

```bash
# Show packet content in ASCII
tcpdump -i eth0 -n -A 'udp port 5000'

# Show packet content in hex and ASCII
tcpdump -i eth0 -n -X 'udp port 5000'

# Show verbose header info (including UDP length, checksum)
tcpdump -i eth0 -n -v 'udp port 5000'

# Example output:
# 10:23:45.123456 IP 10.20.0.1.54321 > 10.20.0.5.5000: UDP, length 12
#     Source: 10.20.0.1:54321
#     Dest:   10.20.0.5:5000
#     UDP payload length: 12 bytes (tcpdump's "length" reports the UDP data size, not including the 8-byte UDP header)
#     Total UDP datagram on the wire: payload + 8 bytes UDP header
```

## Monitoring UDP Packet Rates

```bash
# Count UDP packets per second (pps)
tcpdump -i eth0 -n udp -ttt 2>/dev/null | \
  awk 'BEGIN{count=0; last=0} {count++; if(NR%100==0) print count " packets"}'

# Monitor UDP throughput to a specific service
tcpdump -i eth0 -n 'udp and dst port 5004' -q | \
  awk '{match($0, /length ([0-9]+)/, m); bytes+=m[1]+28}
       NR%1000==0{print NR/1000 "k pkts, " bytes/1048576 " MB"}'
# +28 = 20 bytes IP + 8 bytes UDP header

# Better approach: use nload or iftop for rate monitoring
nload -u M eth0
iftop -i eth0 -f 'udp port 5004'
```

## Capturing Specific UDP Protocols

```bash
# DNS queries (UDP port 53)
tcpdump -i eth0 -n 'udp port 53'
# With DNS-specific display (use -v for more detail):
tcpdump -i eth0 -n -v 'udp port 53' 2>/dev/null | grep -E "A\?|AAAA|response"

# DHCP traffic (broadcast)
tcpdump -i eth0 -n 'udp port 67 or udp port 68'

# NTP traffic
tcpdump -i eth0 -n 'udp port 123'

# Syslog
tcpdump -i eth0 -n 'udp port 514'

# RTP/media streams (common ports 5004, 5005, dynamically assigned >1024)
tcpdump -i eth0 -n 'udp portrange 5000-6000'
```

## Detecting UDP Issues

```bash
# High-rate UDP (potential UDP flood)
# Count packets to each destination per second:
tcpdump -i eth0 -n udp -l 2>/dev/null | \
  awk '{dst=$5; count[dst]++} NR%1000==0 {
    for (d in count) if (count[d] > 100) print count[d], d;
    delete count
  }'

# Large UDP packets (potential fragmentation)
tcpdump -i eth0 -n 'udp and greater 1400'
# UDP payloads > ~1472 bytes will be fragmented on standard Ethernet

# UDP packets with ICMP responses (port unreachable = closed port)
# These appear as ICMP, not UDP:
tcpdump -i eth0 -n 'icmp and icmp[0] = 3 and icmp[1] = 3'
# ICMP type 3 code 3 = port unreachable (sent in response to UDP to closed port)
```

## Write and Analyze Captures

```bash
# Capture to file for later analysis
tcpdump -i eth0 -n 'udp port 5000' -w /tmp/udp_capture.pcap

# Read and analyze
tcpdump -r /tmp/udp_capture.pcap -n

# Count packets and total bytes in capture:
tcpdump -r /tmp/udp_capture.pcap -n -q | \
  awk '{match($0, /length ([0-9]+)/, m); bytes+=m[1]; count++}
       END{print count " packets,", bytes/1024 " KB total payload"}'

# Extract unique source:port pairs (who is sending)
tcpdump -r /tmp/udp_capture.pcap -n | awk '{print $3}' | sort -u
```

## Conclusion

`tcpdump` provides complete visibility into UDP traffic at the packet level. Use `udp port N` to filter specific services, `-A` or `-X` to examine payload content, and redirect to files for post-mortem analysis. Combine with ICMP capture to catch port unreachable responses that indicate failed UDP deliveries. For rate monitoring, dedicated tools like `iftop` or `nethogs` complement tcpdump's per-packet visibility with real-time aggregate statistics.
