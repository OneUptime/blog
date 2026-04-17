# How to Use Wireshark Statistics for Protocol Hierarchy Analysis

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Wireshark, Statistics, Protocol Analysis, Networking, Traffic Analysis

Description: Use Wireshark's Protocol Hierarchy Statistics to get a breakdown of network traffic by protocol, quickly identifying what protocols dominate and how bandwidth is distributed.

Protocol Hierarchy Statistics provide an instant breakdown of what protocols are in your capture - by packet count and byte volume. This is the fastest way to understand what's happening on a network without reading individual packets.

## Open Protocol Hierarchy Statistics

```text
Statistics → Protocol Hierarchy

Shows a tree of protocols:
  Frame
    Ethernet
      Internet Protocol Version 4
        Transmission Control Protocol
          Hypertext Transfer Protocol
            MIME Multipart Media Encapsulation
          TLSv1.3
        User Datagram Protocol
          Domain Name System
          NTP
          QUIC
```

## Reading the Protocol Hierarchy

```text
Protocol         Packets  % Packets  Bytes    % Bytes
--------------   -------  ---------  -------  -------
Frame            10,000   100.0%     8,500,000 100.0%
Ethernet          9,998    99.9%     8,499,900  99.9%
IPv4              9,500    95.0%     8,400,000  98.8%
  TCP             7,000    70.0%     7,200,000  84.7%
    HTTP            300     3.0%       450,000   5.3%
    TLSv1.3       6,500    65.0%     6,700,000  78.8%
  UDP             2,500    25.0%     1,200,000  14.1%
    DNS             500     5.0%        45,000   0.5%
    NTP              50     0.5%         4,000   0.05%
ARP                 502     5.0%        30,120   0.4%
```

## Interpreting the Results

```text
High % Bytes from TCP + TLSv1.3:
  → Encrypted web/application traffic dominates
  → Normal for web servers

Unexpectedly high DNS:
  → DNS amplification attack in progress
  → Application making excessive lookups
  → DNS misconfiguration causing retries

High ARP percentage:
  → Possible ARP flood or misconfigured device
  → Should be < 1% in normal networks

Unexpected protocol at high %:
  → Possible data exfiltration
  → Unauthorized service running
  → Misconfigured application
```

## Use with Display Filters

Combine protocol hierarchy stats with display filters for targeted analysis:

```text
1. Apply display filter: ip.addr == 10.0.0.50
2. Open Statistics → Protocol Hierarchy
   → See only protocols used by that specific host

3. Apply filter: not ip.addr == 192.168.1.1
   → See protocol distribution excluding gateway traffic
```

## Command-Line Protocol Stats with tshark

```bash
# Get protocol hierarchy from command line

tshark -r /tmp/capture.pcap -q -z io,phs

# Output:
# ===================================================================
# Protocol Hierarchy Statistics
# Filter: <No filter>
#
# eth                      frames:10000 bytes:8500000
#   ip                     frames:9500  bytes:8400000
#     tcp                  frames:7000  bytes:7200000
#       tls                frames:6500  bytes:6700000
#       http               frames:300   bytes:450000
#     udp                  frames:2500  bytes:1200000
#       dns                frames:500   bytes:45000
```

## Spot Anomalies

```bash
# High ICMP percentage → ping flood or scan
tshark -r capture.pcap -q -z io,phs | grep icmp

# High ESP traffic → IPsec tunnels active
tshark -r capture.pcap -q -z io,phs | grep esp

# High ARP → broadcast storm or ARP scan
tshark -r capture.pcap -q -z io,phs | grep arp

# Unknown protocol → custom encapsulation or malware
tshark -r capture.pcap -q -z io,phs | grep "data"
# "data" means Wireshark couldn't decode the protocol
```

Protocol Hierarchy Statistics should be your first stop when analyzing an unfamiliar capture - it gives you a complete picture in seconds and guides where to focus your detailed investigation.
