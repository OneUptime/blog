# How to Understand RIPng Message Format

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: RIPng, IPv6, Protocol, Message Format, RFC 2080

Description: Understand the RIPng message format including the header, Route Table Entries (RTEs), and the special next-hop RTE structure.

## Overview

RIPng messages are sent via UDP over IPv6. Understanding the message format helps diagnose routing issues and understand how prefix information is encoded and exchanged between routers.

## RIPng Message Structure

A RIPng message consists of a fixed header followed by a list of Route Table Entries (RTEs):

```text
 0                   1                   2                   3
 0 1 2 3 4 5 6 7 8 9 0 1 2 3 4 5 6 7 8 9 0 1 2 3 4 5 6 7 8 9 0 1
+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+
|  Command (1)  |  Version (1)  |       Must Be Zero (2)        |
+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+
|                                                               |
|                IPv6 Prefix (16 bytes)                         |
|                                                               |
|                                                               |
+-------------------------------+-----------+-+-+-+-+-+-+-+-+-+-+
|        Route Tag (2)          | Prefix Len |     Metric       |
+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-----------+-+-+-+-+-+-+-+-+-+-+
|                    ... more RTEs ...                          |
```

## Header Fields

| Field | Length | Description |
|-------|--------|-------------|
| Command | 1 byte | 1 = Request, 2 = Response |
| Version | 1 byte | Always 1 for RIPng |
| Must Be Zero | 2 bytes | Reserved, set to 0 |

## Route Table Entry (RTE) Fields

| Field | Length | Description |
|-------|--------|-------------|
| IPv6 Prefix | 16 bytes | The destination IPv6 network prefix |
| Route Tag | 2 bytes | Used for policy; usually 0 |
| Prefix Length | 1 byte | Length of the prefix (0-128) |
| Metric | 1 byte | 1-15 for reachable; 16 for unreachable (infinity) |

## Special Next-Hop RTE

When a router needs to specify a next hop other than the message sender, it uses a special RTE:

```text
If Metric = 0xFF (255):
  - The IPv6 Prefix field contains the next-hop address, which must be link-local
  - Route Tag and Prefix Length = 0
  - This next hop applies to all following RTEs until another next-hop RTE appears
  - If Prefix = :: with metric 0xFF, means "use the originator's address as next hop"
```

## Capturing and Decoding RIPng with tcpdump

```bash
# Capture RIPng traffic (UDP port 521)

sudo tcpdump -i eth0 -n -v "udp port 521"

# Example output:
# IP6 (hlim 255, next-header UDP (17) payload length: 32) fe80::1.521 > ff02::9.521: [udp sum ok]  ripng-resp 1: 2001:db8:1::/64 (1)
```

## Decoding with tshark

```bash
# Capture and decode RIPng messages
sudo tshark -i eth0 -Y "ripng" \
  -T fields \
  -e ipv6.src \
  -e ripng.cmd \
  -e ripng.rte.ipv6_prefix \
  -e ripng.rte.prefix_length \
  -e ripng.rte.metric

# Output:
# fe80::1   2   2001:db8:1::  64  1
# fe80::1   2   2001:db8:2::  64  2
```

## RIPng Request Messages

```bash
# A router sends a Request message when it starts up
# It asks for the full routing table from neighbors
# Command = 1 (Request)
# Single RTE with prefix ::/0 and metric 16 (asking for full table)

# Watch for Request messages when starting RIPng
sudo tcpdump -i eth0 -n "udp port 521 and ip6[48] == 1"
```

## Maximum Routes Per Message

The maximum number of RTEs in a RIPng message depends on the interface MTU and headers. For larger routing tables, multiple messages are sent:

```text
Maximum RTEs with the IPv6 minimum MTU and no extension headers:
IPv6 MTU: 1280 bytes
IPv6 header: 40 bytes
UDP header: 8 bytes
RIPng header: 4 bytes
Available for RTEs: 1280 - 40 - 8 - 4 = 1228 bytes
1228 / 20-byte RTE = 61 RTEs
```

## Summary

RIPng messages use a simple 4-byte header followed by 20-byte RTEs. The Command field (1=Request, 2=Response) identifies the message type. The Metric field uses 16 to indicate unreachable routes. Special next-hop RTEs (Metric=0xFF) redirect route resolution to a different next-hop address. The number of RTEs per message is limited by the interface MTU.
