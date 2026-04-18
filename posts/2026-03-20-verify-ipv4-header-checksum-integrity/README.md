# How to Verify IPv4 Header Checksum Integrity

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: IPv4, Networking, Checksum, Packet Integrity, TCP/IP, Network Security

Description: The IPv4 header checksum is a 16-bit one's complement sum that allows routers to detect corruption in the IP header, and computing or verifying it is essential for low-level packet analysis.

## What Is the IPv4 Header Checksum?

The Header Checksum field is a 16-bit value at byte offset 10 in the IPv4 header. It covers only the IP header, not the payload. Every router that forwards the packet must recalculate the checksum because the TTL field changes at each hop. If a router receives a packet with an invalid checksum, it silently discards it.

## How the Checksum Is Calculated

1. Set the checksum field to zero.
2. Split the header into 16-bit words.
3. Sum all words using one's complement addition (wrapping carries back into the sum).
4. Take the one's complement of the result (invert all bits).

## Python: Calculating the Header Checksum

```python
import struct

def ones_complement_sum(data: bytes) -> int:
    """Compute the one's complement sum of 16-bit words."""
    if len(data) % 2 != 0:
        data += b'\x00'  # Pad to even length

    total = 0
    for i in range(0, len(data), 2):
        word = (data[i] << 8) + data[i + 1]
        total += word
        # Fold carries back into lower 16 bits
        total = (total & 0xFFFF) + (total >> 16)
    return total

def calculate_ipv4_checksum(header: bytes) -> int:
    """
    Calculate the IPv4 header checksum.
    The header must have the checksum field zeroed before calling this.
    """
    checksum = ones_complement_sum(header)
    return ~checksum & 0xFFFF  # One's complement

# Build a minimal IPv4 header (20 bytes) with checksum=0

# Ver/IHL, TOS, Total Len, ID, Flags/Frag, TTL, Proto, Checksum, Src, Dst
header = struct.pack("!BBHHHBBH4s4s",
    0x45,          # Version=4, IHL=5
    0,             # TOS
    40,            # Total Length (header only for this example)
    1234,          # Identification
    0,             # Flags/Fragment Offset
    64,            # TTL
    6,             # Protocol (TCP)
    0,             # Checksum (zeroed)
    bytes([10,0,0,1]),   # Source IP 10.0.0.1
    bytes([10,0,0,2]),   # Destination IP 10.0.0.2
)

checksum = calculate_ipv4_checksum(header)
print(f"Computed checksum: 0x{checksum:04X}")
```

## Verifying a Received Checksum

To verify, sum all 16-bit words of the header including the checksum field. If the result is 0xFFFF, the header is valid.

```python
def verify_ipv4_checksum(header_with_checksum: bytes) -> bool:
    """Returns True if the checksum is valid."""
    result = ones_complement_sum(header_with_checksum)
    return result == 0xFFFF

# Inject the computed checksum back into the header
header_list = bytearray(header)
header_list[10] = (checksum >> 8) & 0xFF
header_list[11] = checksum & 0xFF

is_valid = verify_ipv4_checksum(bytes(header_list))
print(f"Checksum valid: {is_valid}")  # True
```

## Checksum Offloading

Modern NICs often handle checksum computation in hardware (checksum offloading). When capturing packets with Wireshark or tcpdump on the sending host, the checksum field may appear as zero or incorrect because the kernel hands the packet to the NIC before filling in the checksum. Recent Wireshark versions disable IP/TCP/UDP checksum validation by default; if yours flags these packets as bad, uncheck "Validate the IPv4 checksum if possible" under Edit → Preferences → Protocols → IPv4 (or pass `-o ip.check_checksum:FALSE` to `tshark`). For accurate captures, disable offloading on the NIC.

```bash
# Disable TX checksum offloading on eth0 for accurate captures
sudo ethtool -K eth0 tx-checksumming off
```

## Key Takeaways

- The IPv4 header checksum uses one's complement arithmetic over all 16-bit header words.
- It is recalculated at every router because TTL changes.
- Verification involves summing all words (including checksum); a result of 0xFFFF indicates a valid header.
- NIC checksum offloading can make captured checksums appear incorrect on the sending machine.
