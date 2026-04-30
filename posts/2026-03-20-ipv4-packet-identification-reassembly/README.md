# How to Understand IPv4 Packet Identification for Reassembly

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: IPv4, Networking, Packet Fragmentation, Network Protocols, TCP/IP

Description: The IPv4 Identification field is a 16-bit value used to uniquely identify fragments belonging to the same original datagram, enabling receivers to correctly reassemble them.

## What Is the IPv4 Identification Field?

The Identification (ID) field in the IPv4 header is a 16-bit value assigned by the sender to each datagram. When a packet is fragmented during transit, all resulting fragments share the same Identification value. The receiving host uses this value-combined with the source address, destination address, and protocol-to group fragments together and reassemble the original datagram.

## IPv4 Header Layout

```text
 0                   1                   2                   3
 0 1 2 3 4 5 6 7 8 9 0 1 2 3 4 5 6 7 8 9 0 1 2 3 4 5 6 7 8 9 0 1
+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+
|Version|  IHL  |Type of Service|          Total Length         |
+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+
|         Identification        |Flags|      Fragment Offset    |
+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+
```

The Identification field occupies bits 16–31 (the first 16 bits of the second 32-bit word).

## How Fragmentation Uses the ID Field

When a router encounters a packet larger than the outgoing interface MTU and the DF bit is clear, it splits the datagram into smaller fragments. Each fragment retains the original Identification value so the destination can reconstruct them.

The following Python example uses Scapy to inspect the Identification field:

```python
from scapy.all import IP, ICMP, Raw, send, sniff

# Craft a packet with a specific Identification value

pkt = IP(dst="192.168.1.1", id=12345) / ICMP() / Raw(b"X" * 100)

# Display the Identification field
print(f"Packet ID: {pkt[IP].id}")  # Output: Packet ID: 12345

# Send the packet
send(pkt, verbose=False)
```

## Reassembly Process

The receiver tracks fragments using a reassembly buffer keyed on:
- Source IP address
- Destination IP address
- Protocol number
- Identification value

Once all fragments with matching keys and contiguous offsets arrive, the datagram is reassembled. A reassembly timer (RFC 1122 recommends 60–120 seconds) discards incomplete sets to prevent buffer exhaustion.

## Identification Field Uniqueness

RFC 6864 clarified that the ID field must be unique only for datagrams that may be fragmented. For atomic datagrams (DF=1, MF=0, and fragment offset=0), the ID value has no reassembly role. Implementations therefore focus ID uniqueness on datagrams that may be fragmented.

## Security Considerations

Because the Identification field historically incremented predictably, it was exploited for:
- **Idle scanning** (Nmap -sI): Inferring open ports by watching ID increments on a zombie host.
- **OS fingerprinting**: Different operating systems use different ID assignment strategies.

Modern stacks generally avoid a simple global counter, but the exact ID assignment strategy is implementation-specific.

## Inspecting the ID Field with tcpdump

Use the following filter to watch fragmentation in action:

```bash
# Capture all IP fragments (MF flag set or fragment offset > 0)
tcpdump -i eth0 'ip[6] & 0x20 != 0 or ip[6:2] & 0x1fff != 0'
```

## Key Takeaways

- The 16-bit Identification field groups fragments of the same original datagram.
- Receivers use ID + src/dst IP + protocol as a reassembly key.
- Incomplete fragment sets are discarded after a reassembly timeout.
- For security, prefer randomized ID assignment and avoid unnecessary fragmentation by using path MTU discovery.
