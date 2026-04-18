# How to Understand IPv4 Fragmentation and Reassembly

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: IPv4, Fragmentation, MTU, Networking, Protocol, Linux

Description: Understand how IPv4 fragmentation works, why it occurs, the performance implications, and how the kernel reassembles fragments at the receiver.

## Introduction

IPv4 fragmentation occurs when a packet is larger than the Maximum Transmission Unit (MTU) of the network link it must traverse. The router or sender splits the packet into smaller fragments, each of which is a valid IP packet carrying a portion of the original data. The destination host reassembles the fragments into the original packet. Fragmentation is a necessary feature of IPv4 but is generally considered bad for performance and reliability.

## How Fragmentation Works

```text
Original packet: 3000 bytes payload + 20 bytes IP header = 3020 bytes
Path MTU: 1500 bytes (standard Ethernet)
Fragments:
  Fragment 1: bytes 0-1479   (1480 bytes data + 20 IP header = 1500)
              Offset=0, MF=1 (More Fragments)
  Fragment 2: bytes 1480-2959 (1480 bytes data + 20 IP header = 1500)
              Offset=185 (1480/8), MF=1
  Fragment 3: bytes 2960-2999 (40 bytes data + 20 IP header = 60)
              Offset=370 (2960/8), MF=0 (Last Fragment)

IP header fields used for fragmentation:
  - Fragment Offset: position of fragment in original packet (units of 8 bytes)
  - More Fragments (MF) bit: 1 = more fragments follow, 0 = last fragment
  - Don't Fragment (DF) bit: 1 = don't fragment this packet (see PMTUD)
  - Identification: same for all fragments of one original packet
```

## When Fragmentation Occurs

```bash
# Fragmentation happens when:

# 1. Source sends packet > MTU and DF bit is NOT set
# 2. Router receives packet > link MTU and DF bit is NOT set

# Standard MTU values:
# Ethernet: 1500 bytes
# VXLAN:    1450 bytes (50 bytes overhead)
# GRE:      1476 bytes (24 bytes overhead)
# PPPoE:    1492 bytes (8 bytes overhead)
# Loopback: 65536 bytes

# Check interface MTU:
ip link show eth0 | grep mtu
# mtu 1500 = standard Ethernet

# Check for fragmentation in kernel stats:
cat /proc/net/snmp | grep "Ip:" | head -2 | tail -1 | \
  awk '{print "Fragments created:", $20, "Reassembly required:", $15}'

# Or with nstat:
nstat | grep -E "IpFrag|IpReasm"
```

## Viewing Fragmentation in tcpdump

```bash
# Capture fragmented packets:
# Match any packet with MF bit set OR fragment offset > 0:
tcpdump -i eth0 -n '(ip[6:2] & 0x3fff) != 0'

# Show fragmentation details verbosely:
tcpdump -i eth0 -n -v '(ip[6:2] & 0x3fff) != 0'
# Output shows (format: (frag ID:length@offset+), + = MF bit set):
#   (frag 12345:1480@0+)     offset=0,    MF bit set
#   (frag 12345:1480@1480+)  offset=1480, MF bit set
#   (frag 12345:40@2960)     offset=2960, last fragment
```

## Reassembly at the Receiver

```bash
# Kernel parameters for fragment reassembly:
sysctl net.ipv4.ipfrag_time       # Seconds to wait for all fragments (default: 30)
sysctl net.ipv4.ipfrag_high_thresh # Max memory for fragment reassembly queue
sysctl net.ipv4.ipfrag_low_thresh  # Memory level to stop queueing fragments

# What happens when fragments don't all arrive:
# After ipfrag_time seconds: incomplete fragments are discarded
# Sender does NOT retransmit individual fragments (if using UDP)
# For TCP: socket-level retransmission handles this (TCP retransmits)

# Check reassembly failures:
nstat | grep -E "IpReasmFails|IpReasmOKs"
# IpReasmFails: fragments that could not be reassembled (timeout, out of memory)
# High count → fragmentation is causing packet loss
```

## Performance Impact

```bash
# Why fragmentation is bad:
# 1. Single lost fragment = entire original packet must be retransmitted
#    (probability of loss increases with more fragments)
# 2. Reassembly requires CPU and memory at receiver
# 3. Some firewalls and security appliances drop fragments
# 4. Fragment reassembly at NAT devices is error-prone
# 5. IPsec/GRE/VXLAN overhead reduces effective MTU

# Calculate optimal UDP payload size to avoid fragmentation:
python3 -c "
eth_mtu = 1500
ip_header = 20
udp_header = 8
max_udp_payload = eth_mtu - ip_header - udp_header
print(f'Max UDP payload (no fragmentation): {max_udp_payload} bytes')
# For VXLAN (50 byte overhead):
vxlan_overhead = 50
max_vxlan_udp = eth_mtu - ip_header - udp_header - vxlan_overhead
print(f'Max UDP payload (in VXLAN): {max_vxlan_udp} bytes')
"
```

## Conclusion

IPv4 fragmentation is a fallback mechanism for oversized packets, not a feature to rely on. A single lost fragment causes the entire original packet to fail, making fragmented UDP especially unreliable on lossy links. Avoid fragmentation by keeping UDP payloads under the path MTU minus IP and UDP header overhead (typically 1472 bytes for standard Ethernet). For TCP, the kernel handles MSS negotiation to avoid fragmentation automatically. Monitor `IpFragCreates` and `IpReasmFails` to detect fragmentation in production.
