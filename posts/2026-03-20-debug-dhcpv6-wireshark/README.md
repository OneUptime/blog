# How to Debug DHCPv6 with Wireshark

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: DHCPv6, Wireshark, IPv6, Debugging, Network Analysis

Description: Learn how to capture and analyze DHCPv6 traffic using Wireshark to troubleshoot address assignment and configuration issues.

## Overview

Wireshark is one of the most powerful tools for debugging DHCPv6. It lets you inspect the full contents of every DHCPv6 message - including options, identifiers, and status codes - in a readable GUI or at the command line with `tshark`.

## Capturing DHCPv6 Traffic

DHCPv6 uses UDP ports **546** (client) and **547** (server). Use this display filter in Wireshark:

```text
dhcpv6
```

To capture only DHCPv6 from the command line with `tshark`:

```bash
# Capture DHCPv6 traffic on eth0 and save to a file

tshark -i eth0 -f "udp port 546 or udp port 547" -w /tmp/dhcpv6.pcap

# Then read and display it
tshark -r /tmp/dhcpv6.pcap -V -Y dhcpv6
```

## Understanding the SARR Exchange

A successful DHCPv6 address assignment follows four messages. Here is what each looks like in Wireshark:

```text
Frame 1: DHCPv6 Solicit
  Source: fe80::1 → Destination: ff02::1:2 (All DHCPv6 servers)
  Message Type: Solicit (1)
  Transaction ID: 0x3a7f12
  Options: Client Identifier (DUID), IA_NA (IA-ID: 0x00000001)

Frame 2: DHCPv6 Advertise
  Source: fe80::server → Destination: fe80::1
  Message Type: Advertise (2)
  Options: IA_NA (Address: 2001:db8::100, T1: 1350, T2: 2160)
           Server Identifier (DUID)

Frame 3: DHCPv6 Request
  Message Type: Request (3)
  Options: Client Identifier, Server Identifier, IA_NA (requesting 2001:db8::100)

Frame 4: DHCPv6 Reply
  Message Type: Reply (7)
  Options: IA_NA (Address: 2001:db8::100, valid: 3600, preferred: 2700)
           Status Code: Success (0)
```

## Useful Wireshark Display Filters

```text
# All DHCPv6 traffic
dhcpv6

# Only Solicit messages (finding new clients)
dhcpv6.msgtype == 1

# Only Reply messages (seeing what the server granted)
dhcpv6.msgtype == 7

# Filter for a specific DUID (client identifier)
dhcpv6.duid.bytes contains 00:01:00:01

# Find messages with error status codes
dhcpv6.status_code != 0

# Find Rapid Commit exchanges
dhcpv6.option.type == 14
```

## Decoding DHCPv6 Options with tshark

```bash
# Show only message type and IA_NA address from all DHCPv6 frames
tshark -r /tmp/dhcpv6.pcap -Y dhcpv6 \
  -T fields \
  -e frame.number \
  -e dhcpv6.msgtype \
  -e dhcpv6.iaaddr.ip \
  -e dhcpv6.status_code

# Output:
# 1    1    (empty)         (empty)
# 2    2    2001:db8::100   (empty)
# 3    3    2001:db8::100   (empty)
# 4    7    2001:db8::100   0
```

## Diagnosing Common Issues

| Symptom | What to Look For in Wireshark |
|---------|-------------------------------|
| Client not getting address | No Advertise after Solicit - server unreachable or not running |
| Status code NoAddrsAvail (2) | Address pool exhausted - check IA_NA status in Reply |
| Client ignores Advertise | DUID mismatch or server preference too low |
| Constant Renew/Rebind loop | Server not responding to Renew - check unicast routing to server |

## Live Capture with Wireshark GUI

1. Open Wireshark and select your network interface.
2. In the capture filter bar, enter: `udp port 546 or udp port 547`
3. Start capture, then trigger a DHCPv6 renewal: `dhclient -6 -r eth0 && dhclient -6 eth0`
4. Apply the display filter `dhcpv6` to isolate messages.
5. Right-click any frame and select **Follow > UDP Stream** to see the full exchange.

## Summary

Wireshark makes DHCPv6 debugging visual and approachable. By filtering for `dhcpv6` and examining message types, options, and status codes, you can quickly diagnose address assignment failures, server unreachability, and pool exhaustion in your IPv6 network.
