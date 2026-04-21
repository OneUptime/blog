# How to Capture Traffic on a Specific VLAN with tcpdump

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Linux, Networking, tcpdump, VLAN, Packet Capture, Troubleshooting

Description: Learn how to use tcpdump to capture and filter traffic on specific VLANs, including filtering by VLAN ID and capturing on VLAN sub-interfaces.

## Introduction

`tcpdump` is the standard packet capture tool on Linux. When working with VLANs (IEEE 802.1Q), you can capture traffic on VLAN-tagged interfaces or filter by VLAN ID using tcpdump's expression language.

## Prerequisites

- `tcpdump` installed (`sudo apt install tcpdump` or `sudo yum install tcpdump`)
- Root privileges, or `CAP_NET_RAW` plus `CAP_NET_ADMIN` when capturing in promiscuous mode
- A VLAN-tagged interface or a trunk interface

## Listing Available Interfaces

```bash
ip link show
tcpdump -D
```

## Capturing on a VLAN Sub-Interface

If your system has a VLAN sub-interface (e.g., `eth0.100` for VLAN 100):

```bash
sudo tcpdump -i eth0.100
```

This captures traffic delivered through VLAN 100. On Linux VLAN devices, the 802.1Q tag is normally hidden from the capture on the sub-interface.

## Filtering by VLAN ID on a Trunk Interface

Capture tagged frames with VLAN ID 100 on the trunk interface `eth0`:

```bash
sudo tcpdump -i eth0 'vlan 100'
```

Capture VLAN 100 AND port 80 traffic:

```bash
sudo tcpdump -i eth0 'vlan 100 and tcp port 80'
```

## Capturing All VLAN-Tagged Traffic

```bash
sudo tcpdump -i eth0 'vlan'
```

## Writing Captures to a File

Save to a `.pcap` file for analysis in Wireshark:

```bash
sudo tcpdump -i eth0 -w /tmp/vlan100.pcap 'vlan 100'
```

Read back:

```bash
tcpdump -r /tmp/vlan100.pcap
```

## Verbose VLAN Output

Show the VLAN tag details in the output:

```bash
sudo tcpdump -i eth0 -e 'vlan 100'
```

The `-e` flag displays the Ethernet header including VLAN information.

## Filtering by Both VLAN and Protocol

```bash
# Only ICMP on VLAN 200

sudo tcpdump -i eth0 'vlan 200 and icmp'

# DNS traffic on VLAN 10
sudo tcpdump -i eth0 'vlan 10 and udp port 53'

# All traffic between two hosts on VLAN 100
sudo tcpdump -i eth0 'vlan 100 and host 10.10.100.5'
```

## Limiting Capture Size

```bash
# Capture 1000 packets then stop
sudo tcpdump -i eth0 -c 1000 'vlan 100'

# Capture for 60 seconds
sudo timeout 60 tcpdump -i eth0 -w /tmp/vlan100.pcap 'vlan 100'
```

## Conclusion

`tcpdump` provides flexible VLAN filtering capabilities that make it invaluable for troubleshooting inter-VLAN routing issues, capturing traffic for security analysis, and verifying VLAN segmentation. Use VLAN sub-interfaces for captures as delivered to a VLAN device, or trunk interface filtering when VLAN tags are visible to tcpdump.
