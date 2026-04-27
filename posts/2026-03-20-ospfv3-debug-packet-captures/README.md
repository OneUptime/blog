# How to Debug OSPFv3 Issues with Packet Captures

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: OSPFv3, IPv6, Debugging, tcpdump, Wireshark

Description: Learn how to capture and analyze OSPFv3 traffic using tcpdump and Wireshark to diagnose adjacency failures and routing issues.

## Overview

When OSPFv3 adjacencies fail or routes are not being exchanged, packet captures are the most reliable diagnostic tool. OSPFv3 runs directly over IPv6 as IP protocol 89, making it straightforward to capture with tcpdump or Wireshark.

## Capturing OSPFv3 Traffic with tcpdump

```bash
# Capture all OSPFv3 packets (IP protocol 89)

sudo tcpdump -i eth0 -n "ip6 proto 89"

# With verbose decode
sudo tcpdump -i eth0 -n -v "ip6 proto 89"

# Save to file for Wireshark analysis
sudo tcpdump -i eth0 -n -w /tmp/ospfv3.pcap "ip6 proto 89"
```

## Understanding tcpdump OSPFv3 Output

```text
12:00:01.000 IP6 fe80::1 > ff02::5: OSPFv3, Hello, length 44
  Router-ID 1.1.1.1, Backup-Designated-Router 0.0.0.0
  Hello-Interval 10, Dead-Interval 40
  Priority 1, Options 0x000013 (-|R|-|E|V6)
  Neighbor List: fe80::2

12:00:01.005 IP6 fe80::2 > ff02::5: OSPFv3, Hello, length 44
  Router-ID 2.2.2.2, Designated-Router fe80::1
  Hello-Interval 10, Dead-Interval 40
  Neighbor List: fe80::1    ← Both see each other → adjacency forming
```

## Wireshark Filters for OSPFv3

Open the pcap file in Wireshark and apply these filters:

```text
# All OSPFv3 traffic
ospf

# Only Hello packets
ospf.msg == 1

# Only DBD (Database Description) - adjacency initialization
ospf.msg == 2

# Only LSR (Link State Request)
ospf.msg == 3

# Only LSU (Link State Update - contains actual LSAs)
ospf.msg == 4

# Only LSAck
ospf.msg == 5

# Filter by Router ID
ospf.srcrouter == 1.1.1.1
```

## Diagnosing Adjacency Formation

Watch the OSPFv3 message sequence to identify where adjacency fails:

```bash
# Capture and show OSPFv3 message types with timestamps
tshark -i eth0 -Y ospf \
  -T fields \
  -e frame.time_relative \
  -e ip6.src \
  -e ospf.msg \
  -e ospf.srcrouter

# Output:
# 0.000    fe80::1    1 (Hello)    1.1.1.1
# 0.005    fe80::2    1 (Hello)    2.2.2.2
# 0.010    fe80::1    2 (DBD)      1.1.1.1   ← ExStart
# 0.012    fe80::2    2 (DBD)      2.2.2.2
# 0.020    fe80::1    4 (LSU)      1.1.1.1   ← Exchange
```

## Diagnosing Hello Mismatch

```bash
# Check hello and dead interval in captured Hellos
tshark -i eth0 -Y "ospf.msg == 1" \
  -T fields \
  -e ip6.src \
  -e ospf.hello.hello_interval \
  -e ospf.hello.router_dead_interval \
  -e ospf.hello.designated_router

# If two routers show different hello intervals:
# fe80::1   10   40
# fe80::2   30   120   ← MISMATCH - adjacency will not form
```

## Checking for MTU Issues in DBD

If adjacency stalls at ExStart/Exchange, look at DBD packets for MTU mismatch:

```bash
# Check Interface MTU fields in DBD packets
tshark -r /tmp/ospfv3.pcap -Y "ospf.msg == 2" \
  -T fields \
  -e ip6.src \
  -e ospf.db.interface_mtu

# Different MTU values from each side = ExStart stall
```

## Counting LSA Retransmissions

Excessive retransmissions indicate link quality issues or asymmetric routing:

```bash
# Count LSU retransmissions per source
tshark -r /tmp/ospfv3.pcap -Y "ospf.msg == 4" \
  -T fields -e ip6.src | sort | uniq -c | sort -rn

# High counts from one source = that router is having to retransmit
```

## Live Monitoring with FRRouting Debug

```bash
# Enable verbose OSPFv3 debugging in FRRouting
vtysh
debug ospf6 neighbor
debug ospf6 flooding
debug ospf6 route

# Disable after diagnosis to avoid overwhelming logs
no debug ospf6 all
```

## Summary

OSPFv3 packet captures use the filter `ip6 proto 89` in tcpdump. The key message sequence is Hello → DBD → LSR → LSU → LSAck. Missing Hellos indicate firewall or connectivity issues. Stalling at ExStart suggests MTU mismatch. Use `tshark` fields extraction to quickly compare Hello parameters across routers and identify configuration mismatches.
