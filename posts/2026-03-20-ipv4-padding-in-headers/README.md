# How to Understand IPv4 Padding in Headers

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: IPv4, Networking, IP Options, Packet Structure, TCP/IP

Description: IPv4 header padding uses zero bytes to align the total header length to a 32-bit boundary when IP Options do not fill a complete 32-bit word.

## Why Padding Is Needed

The IPv4 header length (IHL field) is measured in 32-bit (4-byte) words. When IP Options are present, their combined length may not be a multiple of 4 bytes. Padding bytes (value 0x00) are appended after the options to round up to the next 32-bit boundary.

## Padding Byte Value and Position

The trailing padding bytes are zero-valued, and two 1-byte option codes are relevant to alignment:
- **NOP (0x01)**: Used between options to align a subsequent option to a convenient boundary.
- **EOL (0x00)**: Marks the end of the option list; if bytes remain in the header, the rest are zero padding.

## Visualizing Header Layout with Options

```text
 0                   1                   2                   3
 0 1 2 3 4 5 6 7 8 9 0 1 2 3 4 5 6 7 8 9 0 1 2 3 4 5 6 7 8 9 0 1
+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+
| Option Type   |  Option Len   |       Option Data             |
+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+
|     Opt Data (cont)           |  EOL (0x00)   |  Pad (0x00)  |
+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+
```

In this example, the option occupies 6 bytes (2-byte header + 4-byte data), followed by EOL and one zero padding byte to reach 8 bytes (two 32-bit words).

## Python: Adding Correct Padding

```python
def pad_ip_options(options: bytes) -> bytes:
    """
    Pad IP options to the next 32-bit boundary using zero bytes (0x00).
    """
    remainder = len(options) % 4
    if remainder != 0:
        padding_needed = 4 - remainder
        options += b'\x00' * padding_needed  # zero bytes for EOL/padding
    return options

# Example: a 3-byte Record Route option (needs 1 byte of padding)

raw_option = bytes([7, 3, 4])  # Record Route: type=7, len=3, pointer=4
padded = pad_ip_options(raw_option)
print(f"Options length: {len(raw_option)} -> padded: {len(padded)}")
# Options length: 3 -> padded: 4

# IHL = (20 + len(padded)) // 4
ihl = (20 + len(padded)) // 4
print(f"IHL field value: {ihl}")  # 6 (24-byte header)
```

## Verifying IHL and Padding with Scapy

```python
from scapy.all import IP, IPOption_EOL, IPOption_RR, raw

# Build a packet with a 3-byte RR option followed by EOL
pkt = IP(dst="10.0.0.1", options=[IPOption_RR(routers=[]), IPOption_EOL()])
raw_bytes = raw(pkt)
ihl = (raw_bytes[0] & 0x0F) * 4
print(f"Header length with options: {ihl} bytes")  # 24
```

## Impact on Performance

Routers may need extra processing for packets with IP options, including their alignment bytes. On many platforms, such packets are handled more slowly than plain IPv4 headers and may be punted from hardware forwarding to software processing. This is one reason IP options are avoided in modern networks.

## Key Takeaways

- IPv4 headers must be a multiple of 32 bits (4 bytes); padding fills any gap.
- Zero bytes provide trailing padding; NOP (0x01) may align options, and EOL (0x00) marks the end of the option list.
- The IHL field reflects the total header size in 4-byte units, including padding.
- Trailing zero padding is purely structural and carries no semantic meaning.
