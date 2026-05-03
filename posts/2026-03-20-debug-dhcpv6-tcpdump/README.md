# How to Debug DHCPv6 with tcpdump

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: DHCPv6, tcpdump, IPv6, Debugging, CLI

Description: Learn how to capture and interpret DHCPv6 traffic from the command line using tcpdump for fast, lightweight troubleshooting.

## Overview

`tcpdump` is the go-to CLI tool for capturing network packets on Linux and Unix systems. It is especially useful for debugging DHCPv6 when you don't have access to a GUI, or when you need to capture traffic on a headless server.

## Basic DHCPv6 Capture

DHCPv6 uses UDP ports 546 (client) and 547 (server):

```bash
# Capture DHCPv6 traffic on interface eth0 with verbose output

sudo tcpdump -i eth0 -n -v "udp port 546 or udp port 547"
```

The `-n` flag disables DNS resolution for faster output. The `-v` flag provides verbose decode of packet fields.

## Saving a Capture for Later Analysis

```bash
# Save DHCPv6 packets to a pcap file for analysis in Wireshark or tshark
sudo tcpdump -i eth0 -n -w /tmp/dhcpv6_capture.pcap \
  "udp port 546 or udp port 547"

# Read and decode the saved capture
sudo tcpdump -r /tmp/dhcpv6_capture.pcap -v -n
```

## Sample tcpdump Output Explained

When a DHCPv6 exchange occurs, you will see output similar to:

```text
# Solicit from client to All_DHCP_Relay_Agents_and_Servers multicast
12:00:01.001 IP6 fe80::aabb:ccff:fedd:1234.546 > ff02::1:2.547:
  dhcp6 solicit

# Advertise from server to client
12:00:01.005 IP6 fe80::1.547 > fe80::aabb:ccff:fedd:1234.546:
  dhcp6 advertise

# Request from client to server
12:00:01.010 IP6 fe80::aabb:ccff:fedd:1234.546 > fe80::1.547:
  dhcp6 request

# Reply from server granting the address
12:00:01.015 IP6 fe80::1.547 > fe80::aabb:ccff:fedd:1234.546:
  dhcp6 reply
```

## Triggering a DHCPv6 Exchange for Testing

While `tcpdump` is running, trigger a fresh DHCPv6 exchange on another terminal:

```bash
# Release current DHCPv6 lease and request a new one
sudo dhclient -6 -r eth0
sudo dhclient -6 eth0

# Or use systemd-networkd to restart the interface
sudo networkctl down eth0 && sudo networkctl up eth0
```

## Filtering by IPv6 Address

```bash
# Capture DHCPv6 traffic involving a specific client link-local address
sudo tcpdump -i eth0 -n -v \
  "ip6 and (udp port 546 or udp port 547) and host fe80::aabb:ccff:fedd:1234"
```

## Capturing on All Interfaces

```bash
# Use 'any' to capture on all interfaces (useful on routers)
sudo tcpdump -i any -n "udp port 546 or udp port 547"
```

Note: When using `-i any`, link-local addresses may appear differently since they are not bound to a specific interface.

## Reading Verbose Option Fields

For full option decoding, combine `-vvv` (triple verbose):

```bash
# Maximum verbosity - shows all DHCPv6 options decoded
sudo tcpdump -i eth0 -n -vvv "udp port 546 or udp port 547"
```

This will output details like:
- Transaction IDs
- DUID values (Client and Server Identifiers)
- IA_NA and IA_PD option contents
- Requested options list
- Status codes

## Common Troubleshooting Scenarios

| Scenario | tcpdump Observation |
|----------|---------------------|
| No server response | Only Solicit packets appear - no Advertise |
| Server unreachable for Renew | Renew sent to unicast, no Reply - try Rebind check |
| Prefix delegation failing | IA_PD in Solicit but no IA_PD in Reply |
| Wrong interface capturing | No packets seen - confirm interface with `ip link show` |

## Summary

`tcpdump` is a lightweight and powerful tool for capturing DHCPv6 traffic directly on the server or router without a GUI. By filtering on UDP ports 546 and 547, you can quickly identify whether the SARR exchange is completing, diagnose missing Advertise responses, and save captures for deeper analysis in Wireshark.
