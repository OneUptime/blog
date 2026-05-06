# How to Calculate Fragment Offset in IPv4 Packets

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: IPv4, Networking, Fragmentation, Packet Analysis, TCP/IP

Description: The Fragment Offset field in IPv4 specifies where in the original datagram a given fragment belongs, measured in 8-byte units, enabling correct reassembly at the destination.

## What Is Fragment Offset?

The Fragment Offset field is a 13-bit value in the IPv4 header that indicates where in the original datagram this fragment's data begins. It is measured in units of 8 bytes (64 bits). The first fragment always has an offset of 0.

## Why 8-Byte Units?

A 13-bit field can represent values from 0 to 8191. Measuring in 8-byte units means the maximum byte offset is 8191 × 8 = 65,528 bytes, which covers the maximum IPv4 datagram size of 65,535 bytes (minus the minimum 20-byte header = 65,515 bytes of payload). This also means fragment payloads (except the last) must be multiples of 8 bytes.

## Calculating Offsets

Given a datagram with 3800 bytes of payload over a 1500-byte MTU path:
- Max payload per fragment = 1500 − 20 (IP header) = 1480 bytes
- Fragment 1: bytes 0–1479 → offset = 0 ÷ 8 = **0**
- Fragment 2: bytes 1480–2959 → offset = 1480 ÷ 8 = **185**
- Fragment 3: bytes 2960–3799 → offset = 2960 ÷ 8 = **370**

## Python Example: Computing Offsets

```python
def fragment_offsets(total_payload: int, mtu: int, ip_header: int = 20):
    """
    Calculate fragment offsets for a given payload size and MTU.
    Returns a list of (start_byte, offset_field, is_last) tuples.
    """
    max_frag_payload = mtu - ip_header
    # Payload per fragment must be multiple of 8 (except last)
    max_frag_payload = (max_frag_payload // 8) * 8

    fragments = []
    pos = 0
    while pos < total_payload:
        end = min(pos + max_frag_payload, total_payload)
        is_last = (end == total_payload)
        offset_field = pos // 8
        fragments.append((pos, offset_field, is_last))
        pos = end
    return fragments

for start, offset_field, last in fragment_offsets(3800, 1500):
    print(f"Start byte: {start:4d}  Offset field: {offset_field:4d}  Last: {last}")
```

Expected output:
```text
Start byte:    0  Offset field:    0  Last: False
Start byte: 1480  Offset field:  185  Last: False
Start byte: 2960  Offset field:  370  Last: True
```

## Reading Fragment Offset with Scapy

```python
from scapy.all import IP, UDP, Raw, fragment

# 3792 bytes of UDP data + 8-byte UDP header = 3800 bytes of IP payload
pkt = IP(dst="10.0.0.1") / UDP(dport=514) / Raw(b"X" * 3792)
frags = fragment(pkt, fragsize=1480)

for i, f in enumerate(frags):
    # frag field stores the offset in 8-byte units
    print(f"Fragment {i+1}: offset_field={f[IP].frag}  byte_pos={f[IP].frag * 8}")
```

## Validating Offset Alignment

Fragment payloads (except the last) must be multiples of 8 bytes. If they are not, a following fragment's offset cannot exactly identify the next byte position in 8-byte units. In custom fragmentation code, a common bug is using a fragment size that is not divisible by 8.

```python
# Verify fragment sizes are multiples of 8

for i, f in enumerate(frags[:-1]):  # All but the last fragment
    payload_len = len(f[IP].payload)
    assert payload_len % 8 == 0, f"Fragment {i+1} payload {payload_len} not aligned!"
```

## Key Takeaways

- Fragment Offset is a 13-bit field measured in 8-byte units.
- First fragment has offset 0; subsequent fragments carry the byte position ÷ 8.
- All fragment payloads except the last must be multiples of 8 bytes.
- Receivers sort incoming fragments by offset to reconstruct the original datagram.
