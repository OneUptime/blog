# How to Decode IPv4 Header Fields in the Wireshark Packet Detail Pane

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Wireshark, IPv4, Header, Networking, Packet Analysis, Protocol

Description: Read and understand every field in the IPv4 header as displayed in Wireshark's packet detail pane, including version, TTL, protocol, flags, and checksum fields.

The IPv4 header contains 14 fields that control routing, fragmentation, QoS, and delivery. Knowing how to read them in Wireshark turns packet analysis from opaque bytes into actionable network intelligence.

## IPv4 Header Layout

```text
 0                   1                   2                   3
 0 1 2 3 4 5 6 7 8 9 0 1 2 3 4 5 6 7 8 9 0 1 2 3 4 5 6 7 8 9 0 1
+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+
|Version| IHL |   DSCP  |ECN|          Total Length            |
+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+
|         Identification        |Flags|      Fragment Offset    |
+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+
|  Time to Live |    Protocol   |         Header Checksum       |
+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+
|                       Source Address                          |
+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+
|                    Destination Address                        |
+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+
```

## Reading IP Header in Wireshark

Click on any packet, then expand "Internet Protocol Version 4" in the detail pane:

```text
Internet Protocol Version 4
  0100 .... = Version: 4
  .... 0101 = Header Length: 20 bytes (5)          ← 5 × 4 = 20 bytes (no options)
  Differentiated Services Field: 0x00 (DSCP: CS0)  ← QoS marking (0 = best-effort)
    0000 00.. = DSCP: Default (0)
    .... ..00 = ECN: Not ECT (0)
  Total Length: 84                                  ← entire IP packet size
  Identification: 0x1234                            ← fragmentation grouping ID
  Flags: 0x40, Don't fragment                       ← DF bit = no fragmentation
    0... .... = Reserved bit: Not set
    .1.. .... = Don't fragment: Set                 ← DF=1
    ..0. .... = More fragments: Not set             ← last (or only) fragment
  Fragment Offset: 0                                ← no fragmentation
  Time to Live: 64                                  ← decremented each hop
  Protocol: ICMP (1)                                ← payload protocol
  Header Checksum: 0xabcd [correct]                 ← integrity check
  Source Address: 192.168.1.100
  Destination Address: 8.8.8.8
```

## Key Fields and What They Mean

```text
Field              Value        Interpretation
-----------------  ----------   ----------------------------------------
Version            4            IPv4 (6 = IPv6)
Header Length      20 bytes     No IP options (standard)
                   > 20 bytes   IP options present
DSCP               0x00         Best effort, no QoS
                   0x2E = 46    EF (VoIP/realtime priority)
                   0x22 = 34    AF41 (video conferencing)
Total Length       84           20-byte header + 64-byte payload
TTL                64           Linux default (128 = Windows, 255 = routers)
                   <10          Packet has traveled many hops
Protocol           1  = ICMP
                   6  = TCP
                   17 = UDP
                   50 = ESP (IPsec)
DF flag            Set          Don't fragment (TCP usually sets this)
MF flag            Set          More fragments coming (fragmented packet)
Fragment Offset    > 0          This is a non-first fragment
```

## Diagnose Issues from IP Header

```wireshark
# Find fragmented packets (DF=0 and MF=1 or offset > 0)

ip.flags.mf == 1 or ip.frag_offset > 0

# Find packets with IP options
ip.hdr_len > 20

# Find packets with low TTL (many hops or TTL manipulation)
ip.ttl < 5

# Find packets with DF bit set
ip.flags.df == 1

# Find DSCP-marked packets
ip.dsfield.dscp != 0
```

## IP Checksum Errors

```wireshark
# Find packets with bad IP checksum
ip.checksum.status == "Bad"

# Note: many NIC offload features calculate checksums in hardware
# Wireshark sees packets before offload → may show "incorrect" checksums
# for outbound traffic even when they're actually correct on the wire
```

Understanding IPv4 header fields lets you verify that routing, fragmentation, QoS marking, and protocol encapsulation are all working as expected.
