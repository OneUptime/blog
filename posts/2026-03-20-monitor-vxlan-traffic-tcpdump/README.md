# How to Monitor VXLAN Traffic with tcpdump

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Linux, VXLAN, tcpdump, Traffic Analysis, Networking, Monitoring, Packet Capture

Description: Capture and analyze VXLAN-encapsulated traffic using tcpdump to inspect both the outer UDP headers and inner Ethernet frames of the overlay network.

## Introduction

Monitoring VXLAN traffic with tcpdump lets you verify encapsulation, troubleshoot connectivity, and analyze traffic at both the overlay and underlay levels. VXLAN encapsulates Ethernet frames inside UDP/4789 packets, so you can capture at the physical interface for the outer view or at the VXLAN/bridge interface for the inner view.

## Capture Outer VXLAN Traffic (UDP Level)

```bash
# Capture all VXLAN UDP traffic on the physical interface

tcpdump -i eth0 udp port 4789 -n

# Verbose output showing VXLAN headers
tcpdump -i eth0 udp port 4789 -n -v

# Capture and decode VXLAN content
tcpdump -i eth0 udp port 4789 -n -vv
```

## Filter by Remote VTEP

```bash
# Capture VXLAN traffic to/from a specific remote VTEP
tcpdump -i eth0 udp port 4789 and host 10.0.0.2 -n

# Capture only VXLAN traffic FROM remote VTEP
tcpdump -i eth0 udp port 4789 and src 10.0.0.2 -n
```

## Capture Inner Overlay Traffic (Bridge Level)

Capturing on the bridge shows the decapsulated inner traffic:

```bash
# Capture inner traffic (after VXLAN decapsulation)
tcpdump -i br-vxlan -n

# Filter inner traffic
tcpdump -i br-vxlan icmp -n
tcpdump -i br-vxlan tcp port 80 -n
```

## Decode VXLAN Frames

tcpdump automatically decodes VXLAN inner frames when capturing on UDP port 4789:

```bash
# Show outer Ethernet headers (inner frame is decoded by the VXLAN dissector)
tcpdump -i eth0 udp port 4789 -e -n

# Sample output:
# 14:30:45 IP 10.0.0.1.12345 > 10.0.0.2.4789: VXLAN, flags [I] (0x08), vni 100
#     IP 10.200.0.1 > 10.200.0.2: ICMP echo request
```

## Save VXLAN Capture to File

```bash
# Save to pcap for Wireshark analysis
tcpdump -i eth0 udp port 4789 -w /tmp/vxlan-capture.pcap

# Open in Wireshark: filter by vxlan.vni == 100
# Wireshark can fully decode VXLAN and show inner frames
```

## Monitor VXLAN Statistics

```bash
# Track packet rates on VXLAN interface
ip -s link show vxlan0

# Watch in real time
watch -n 1 "ip -s link show vxlan0 | grep -A 2 RX"
```

## Capture BUM Flooding Traffic

```bash
# Capture broadcast/unknown unicast traffic (BUM flooding via zero-MAC)
tcpdump -i eth0 udp port 4789 and dst 10.0.0.2 -n

# High rate of BUM traffic indicates missing FDB entries or ARP issues
# Monitor rate
tcpdump -i eth0 udp port 4789 -q | pv -r > /dev/null
```

## Identify VXLAN Packet Loss

```bash
# Ping with VXLAN and capture simultaneously
ping -c 100 10.200.0.2 &
tcpdump -i eth0 udp port 4789 -c 200 -w /tmp/vxlan-loss.pcap

# Analyze: count packets sent vs received
tcpdump -r /tmp/vxlan-loss.pcap | wc -l
```

## Conclusion

tcpdump is the primary tool for monitoring VXLAN traffic. Capture on the physical interface to see VXLAN UDP packets, or on the bridge for inner decapsulated frames. The `udp port 4789` filter isolates VXLAN traffic. Save captures to pcap files for detailed analysis in Wireshark, which can fully decode VXLAN headers and display inner Ethernet frames with their MAC addresses and payloads.
