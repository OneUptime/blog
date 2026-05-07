# How to Analyze IPv4 Packets with Wireshark

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Wireshark, IPv4, Packet Analysis, Network Diagnostics, TCP/IP

Description: Wireshark provides a graphical interface for capturing and dissecting IPv4 packets, allowing engineers to inspect every header field and filter traffic with powerful display filters.

## Capturing IPv4 Traffic

Open Wireshark, select your interface, and start a capture. To focus on IPv4:

```text
# Wireshark Capture Filter (BPF syntax, set before capture)

ip
```

## Essential Display Filters

Display filters are applied to already-captured packets:

```text
# Show only IPv4 packets
ip

# Filter by source IP
ip.src == 192.168.1.100

# Filter by destination subnet
ip.dst == 10.0.0.0/8

# Filter by TTL less than 10
ip.ttl < 10

# Show fragmented packets
ip.flags.mf == 1 || ip.frag_offset > 0

# Show packets with DF bit set
ip.flags.df == 1

# Filter by protocol (TCP=6, UDP=17, ICMP=1)
ip.proto == 6

# Show DSCP EF traffic (voice)
ip.dsfield.dscp == 46
```

## Reading the IPv4 Header Panel

When you click a packet in Wireshark, expand "Internet Protocol Version 4" to see:

- **Version**: Should be 4
- **Header Length**: Number of 32-bit words (5 = 20 bytes, no options)
- **Differentiated Services Field**: DSCP + ECN values
- **Total Length**: Entire datagram size in bytes
- **Identification**: Fragment group ID
- **Flags**: DF and MF bits
- **Fragment Offset**: Position in original datagram (×8 bytes)
- **Time to Live**: Remaining hop count
- **Protocol**: Upper-layer protocol number
- **Header Checksum**: Header-only checksum; Wireshark may annotate it as correct or invalid when checksum validation is enabled
- **Source/Destination**: IP addresses

## Exporting Data with tshark (CLI)

```bash
# Print selected IPv4 packet fields in JSON
tshark -i eth0 -c 10 -T json -e ip.src -e ip.dst -e ip.ttl -e ip.proto \
  -e ip.flags.df -e ip.flags.mf -e ip.frag_offset \
  -Y "ip" 2>/dev/null

# Export to CSV for analysis
tshark -r capture.pcap -T fields \
  -e frame.number -e ip.src -e ip.dst -e ip.proto -e ip.ttl \
  -E header=y -E separator=, > ipv4_fields.csv
```

## Statistics: Protocol Hierarchy

Wireshark's Statistics menu provides a Protocol Hierarchy view showing what fraction of traffic is each protocol. You can generate the same report from the CLI:

```bash
# Protocol hierarchy statistics from a pcap file
tshark -r capture.pcap -q -z io,phs
```

## Finding ICMP Errors

```bash
# Find ICMP unreachable messages (may indicate routing or firewall issues)
tshark -r capture.pcap -Y "icmp.type == 3" -T fields \
  -e ip.src -e ip.dst -e icmp.code
```

## Key Takeaways

- Use capture filters (BPF) before recording; use display filters after for flexible analysis.
- The IPv4 header panel shows the IPv4 fields, and Wireshark can annotate checksum validity when validation is enabled.
- `tshark` provides Wireshark's dissection power from the command line, useful in automation.
- Protocol hierarchy statistics quickly reveal what traffic dominates a capture.
