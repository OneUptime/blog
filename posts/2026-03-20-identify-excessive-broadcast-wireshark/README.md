# How to Identify Excessive Broadcast Traffic with Wireshark

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Networking, Wireshark, Broadcast, Network Analysis, Troubleshooting, Packet Capture

Description: Use Wireshark's display filters, statistics, and IO graphs to identify excessive broadcast traffic, find the top senders, and diagnose the root protocol causing the flood.

## Introduction

Wireshark is the most powerful tool for deep-diving into broadcast traffic. Its statistics and filtering capabilities let you quantify broadcast volume, identify the noisiest senders, and decode the exact protocol generating the flood.

## Capturing Broadcast Traffic

In Wireshark's capture filter field, enter:

```text
ether broadcast
```

Or, to also include multicast group traffic:

```text
ether multicast
```

`ether broadcast` captures only Ethernet broadcasts. `ether multicast` captures Ethernet group traffic, which includes multicast and the all-ones broadcast address, reducing capture file size significantly.

## Display Filters for Broadcasts and Discovery Traffic

Once captured, use these display filters in the filter bar:

```text
# All Ethernet broadcasts

eth.dst == ff:ff:ff:ff:ff:ff

# ARP traffic sent as Ethernet broadcasts
arp && eth.dst == ff:ff:ff:ff:ff:ff

# DHCP traffic sent as Ethernet broadcasts
dhcp && eth.dst == ff:ff:ff:ff:ff:ff

# NetBIOS name service traffic sent as Ethernet broadcasts
nbns && eth.dst == ff:ff:ff:ff:ff:ff

# mDNS traffic
dns && udp.port == 5353

# SSDP discovery traffic
udp.port == 1900
```

## Finding the Top Broadcast Senders

First apply `eth.dst == ff:ff:ff:ff:ff:ff` in the packet list. Then navigate to **Statistics > Endpoints** and click the **Ethernet** tab. If you open the dialog after applying the display filter, **Limit to display filter** will be set automatically. Sort by **TX Packets** - the highest senders are your top broadcast sources.

For IP-level breakdown, check **Statistics > Conversations > IPv4** and filter for destination `255.255.255.255`.

## Using IO Graphs to Spot Storms

Navigate to **Statistics > IO Graphs**:

1. Add a trace for `eth.dst == ff:ff:ff:ff:ff:ff` with **Packets** on the Y-axis
2. Set the interval to 1 second
3. Look for sudden spikes indicating storm onset

## Protocol Breakdown with Statistics > Protocol Hierarchy

Navigate to **Statistics > Protocol Hierarchy** to see which protocols account for the most packets in the capture. In a broadcast-heavy capture, one protocol (often ARP or NetBIOS) will usually dominate the hierarchy.

## Finding the Storm Source

Apply a display filter for the top offending protocol:

```text
arp && eth.dst == ff:ff:ff:ff:ff:ff
```

Then navigate to **Statistics > Conversations > Ethernet**. The source MAC sending thousands of ARP requests is likely the culprit.

To confirm it is gratuitous or anomalous:

```text
arp.isgratuitous == 1 && arp.opcode == 1
```

This filter matches **gratuitous ARP requests** - a host announcing its own IP, which could indicate IP address conflicts or repeated address-defense traffic.

## Exporting Broadcast Statistics to CSV

For reporting, export statistics:

1. **Statistics > Endpoints** → select Ethernet → click **Copy** and choose CSV

Or use `tshark` from the command line:

```bash
# Count broadcast packets per source MAC in a pcap file
tshark -r capture.pcap \
  -Y "eth.dst == ff:ff:ff:ff:ff:ff" \
  -T fields -e eth.src \
  | sort | uniq -c | sort -rn | head -20
```

## Conclusion

Wireshark's **IO Graphs**, **Statistics > Endpoints**, and **Protocol Hierarchy** provide a complete picture of broadcast traffic. Capture with `ether broadcast` to reduce noise, then use display filters and statistics to find the top senders and the protocol generating the flood.
