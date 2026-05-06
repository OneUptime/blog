# How to Build Raw IPv4 Packets with Scapy

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Scapy, IPv4, Networking, Packet Crafting, Python, Network Testing

Description: Scapy is a powerful Python library for building, sending, and analyzing raw network packets, allowing precise control over every IPv4 header field and payload byte.

## Installing Scapy

```bash
pip install scapy

# On Linux, raw socket operations require root privileges

sudo python3 your_script.py
```

## Building a Basic IPv4 Packet

```python
from scapy.all import IP, TCP, UDP, ICMP, Raw

# Create an IPv4/TCP packet
pkt = IP(
    src="192.168.1.100",    # Source IP (auto-fills if omitted)
    dst="93.184.216.34",    # Destination IP
    ttl=64,                 # Time to Live
    id=12345,               # Identification
    flags="DF",             # Don't Fragment
    tos=0,                  # Type of Service / DSCP
) / TCP(
    sport=54321,            # Source port
    dport=80,               # Destination port (HTTP)
    flags="S",              # SYN flag
    seq=1000,               # Initial sequence number
)

# Display the packet fields
pkt.show()

# Show the raw bytes
print(bytes(pkt).hex())
```

## Sending and Receiving

```python
from scapy.all import IP, TCP, ICMP, sr1, send, sendp, Ether

# Layer 3 send (uses routing table; fills in src IP/MAC automatically)
send(IP(dst="8.8.8.8", ttl=64) / ICMP(), verbose=False)

# Layer 3 send-and-receive (wait for reply)
reply = sr1(IP(dst="8.8.8.8") / ICMP(), timeout=2, verbose=False)
if reply:
    print(f"Reply from {reply[IP].src}, TTL={reply[IP].ttl}")

# Layer 2 send (raw Ethernet; you control everything)
sendp(Ether() / IP(dst="192.168.1.1") / ICMP(), iface="eth0", verbose=False)
```

## Crafting a UDP Datagram with Custom Payload

```python
from scapy.all import IP, UDP, Raw, send

# Build a DNS-like query packet (simplified)
payload = b'\x12\x34'                # Transaction ID
payload += b'\x01\x00'               # Flags: standard query with RD set
payload += b'\x00\x01'               # QDCOUNT: one question
payload += b'\x00\x00'               # ANCOUNT: no answers
payload += b'\x00\x00'               # NSCOUNT: no authority records
payload += b'\x00\x00'               # ARCOUNT: no additional records
payload += b'\x07example\x03com\x00' # QNAME: example.com
payload += b'\x00\x01'               # QTYPE: A
payload += b'\x00\x01'               # QCLASS: IN

pkt = IP(dst="8.8.8.8") / UDP(sport=12345, dport=53) / Raw(load=payload)
pkt.show2()  # show2() resolves fields like checksums before display
```

## Fragmented Packet Crafting

```python
from scapy.all import IP, UDP, Raw, fragment, send

# Create a large datagram and fragment it to fit 800-byte MTU
big_pkt = IP(dst="10.0.0.1") / UDP(dport=9999) / Raw(b"Z" * 3000)
frags = fragment(big_pkt, fragsize=776)  # 776-byte fragment payloads (8-byte aligned)

for frag in frags:
    print(f"ID={frag.id} offset={frag.frag*8} MF={frag.flags.MF}")
    send(frag, verbose=False)
```

## Sniffing and Replaying

```python
from scapy.all import sniff, wrpcap, rdpcap, sendp

# Capture 10 packets and save to file
pkts = sniff(iface="eth0", count=10, filter="ip")
wrpcap("/tmp/capture.pcap", pkts)

# Read and replay from file
saved = rdpcap("/tmp/capture.pcap")
sendp(saved, iface="eth0", inter=0.01, verbose=False)
```

## Key Takeaways

- Scapy uses Python operator `/` to stack protocol layers.
- `send()` uses the routing table (Layer 3); `sendp()` sends at Layer 2.
- `sr1()` sends a packet and waits for one reply; `sr()` handles multiple replies.
- Raw socket operations require root/administrator privileges.
- Use `pkt.show2()` to see resolved (computed) field values including checksums.
