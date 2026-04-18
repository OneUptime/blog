# How to Verify VLAN Tagging with tcpdump

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Linux, VLAN, tcpdump, Packet Capture, 802.1Q, Networking, Troubleshooting

Description: Use tcpdump to capture and verify 802.1Q VLAN-tagged frames on a Linux interface, confirming that VLAN tags are present and correct.

## Introduction

When troubleshooting VLAN connectivity, it is essential to verify that frames are actually being tagged with the correct VLAN ID. tcpdump can display 802.1Q tag information when capturing on the physical parent interface. This guide shows how to interpret VLAN tags in tcpdump output.

## Prerequisites

- tcpdump installed
- A physical interface with VLAN subinterfaces configured
- Root access

## Capture Tagged Frames on the Parent Interface

Always capture on the **parent interface** (e.g., `eth0`), not the VLAN subinterface. Capturing on `eth0.100` shows untagged traffic because the kernel strips the tag before delivering to the subinterface.

```bash
# Capture all 802.1Q-tagged frames on eth0

tcpdump -i eth0 -e vlan

# The -e flag shows Ethernet link-level headers including the 802.1Q tag
```

## Filter by Specific VLAN ID

```bash
# Capture only frames tagged with VLAN 100
tcpdump -i eth0 vlan 100

# Capture VLAN 100 traffic with verbose output
tcpdump -i eth0 -v vlan 100

# Capture VLAN 100 traffic showing Ethernet headers
tcpdump -i eth0 -e vlan 100
```

## Interpret tcpdump VLAN Output

When tcpdump shows a tagged frame:

```text
14:22:31.123456 aa:bb:cc:dd:ee:ff > 11:22:33:44:55:66, ethertype 802.1Q (0x8100),
length 102: vlan 100, p 0, ethertype IPv4 (0x0800),
10.100.0.1 > 10.100.0.2: ICMP echo request, id 1, seq 1, length 64
```

Key fields:
- `vlan 100` - the VLAN ID in the 802.1Q tag
- `p 0` - priority (0-7 in the 3-bit PCP field)
- `ethertype IPv4` - the inner protocol carried by the tagged frame

## Generate Test Traffic to Verify

```bash
# Terminal 1: Start capture on parent interface
tcpdump -i eth0 -e vlan 100 -n

# Terminal 2: Generate traffic from the VLAN subinterface
ping -I eth0.100 -c 5 192.168.100.254
```

If you see `vlan 100` in the capture output, tagging is working correctly.

## Capture to File for Analysis

```bash
# Save tagged frames to a pcap file (open in Wireshark for detailed analysis)
tcpdump -i eth0 vlan -w /tmp/vlan-capture.pcap

# Generate traffic, then stop capture
# Open in Wireshark: Filter by "vlan.id == 100"
```

## Verify No Tag on VLAN Subinterface (Expected Behavior)

```bash
# Capture on the VLAN subinterface - tags are stripped by the kernel
tcpdump -i eth0.100 -e

# You will NOT see 802.1Q tags here - the kernel removes them
# This is normal and expected behavior
```

## Capture Both Tagged and Untagged on Parent

```bash
# Capture all Ethernet frames on the parent interface
tcpdump -i eth0 -e -n

# Frames for VLAN subinterfaces show 802.1Q tags
# Native (untagged) frames show no VLAN tag
```

## Conclusion

To verify 802.1Q VLAN tagging, capture on the **parent physical interface** (not the VLAN subinterface) and use the `vlan` BPF filter or the `-e` flag to display Ethernet header details. The `vlan <ID>` string in tcpdump output confirms that tags are being correctly applied. Capturing on the VLAN subinterface will not show tags because the kernel strips them before delivery.
