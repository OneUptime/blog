# How to Calculate the IPv4 Header Checksum

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: IPv4, Networking, Checksum, Packet Header, TCP/IP

Description: Learn how the IPv4 header checksum is calculated, verified, and updated at each router hop, with step-by-step examples and Python implementation.

## Introduction

The IPv4 header checksum is a 16-bit one's complement sum of all 16-bit words in the header. Every router that forwards a packet must verify the checksum and recalculate it after modifying the TTL field. Understanding this process is essential for implementing custom network protocols, packet crafting tools, and debugging packet corruption.

## The Algorithm

The one's complement checksum algorithm:
1. Set the checksum field to 0
2. Sum all 16-bit words in the header as unsigned integers
3. Add any carry bits back into the sum (wrap around)
4. Take the bitwise complement (~) of the result

Verification uses the same algorithm: if the checksum is correct, summing all 16-bit words including the checksum field produces 0xFFFF.

## Step-by-Step Example

Given a minimal IPv4 header (hex bytes):

```text
45 00 00 3c  1c 46 40 00  40 06 00 00  ac 10 0a 63  ac 10 0a 0c
```

The checksum field at bytes 10-11 is `00 00` (zeroed for calculation).

```text
Step 1: Group into 16-bit words
  4500  003c  1c46  4000  4006  0000  ac10  0a63  ac10  0a0c

Step 2: Sum all words
  4500 + 003c + 1c46 + 4000 + 4006 + 0000 + ac10 + 0a63 + ac10 + 0a0c
= 24e17

Step 3: Add carry (0x2 from the upper bits)
  0x4e17 + 0x0002 = 0x4e19

Step 4: One's complement
  ~0x4e19 = 0xb1e6

Result: checksum = 0xb1e6
```

## Python Implementation

```python
def calculate_ipv4_checksum(header_bytes: bytes) -> int:
    """
    Calculate IPv4 header checksum.
    The checksum field in header_bytes should be set to 0x0000.
    Returns the 16-bit checksum value.
    """
    if len(header_bytes) % 2 != 0:
        header_bytes += b'\x00'  # pad to even length

    total = 0
    for i in range(0, len(header_bytes), 2):
        word = (header_bytes[i] << 8) + header_bytes[i + 1]
        total += word

    # Fold carry bits back in (one's complement addition)
    while total >> 16:
        total = (total & 0xFFFF) + (total >> 16)

    # One's complement
    checksum = ~total & 0xFFFF
    return checksum


def verify_ipv4_checksum(header_bytes: bytes) -> bool:
    """
    Verify an IPv4 header checksum.
    Sum of all 16-bit words including checksum should equal 0xFFFF.
    """
    total = 0
    for i in range(0, len(header_bytes), 2):
        word = (header_bytes[i] << 8) + header_bytes[i + 1]
        total += word

    while total >> 16:
        total = (total & 0xFFFF) + (total >> 16)

    return total == 0xFFFF


# Example: build a header and calculate its checksum

import struct, socket

def build_ipv4_header(src: str, dst: str, protocol: int, payload_len: int) -> bytes:
    version_ihl = (4 << 4) | 5          # version=4, IHL=5 (20 bytes)
    tos         = 0
    total_len   = 20 + payload_len
    ident       = 0x1234
    flags_offset = 0x4000               # DF=1, MF=0, offset=0
    ttl         = 64
    checksum    = 0                      # will be filled in

    header = struct.pack(
        '!BBHHHBBH4s4s',
        version_ihl, tos, total_len, ident,
        flags_offset, ttl, protocol, checksum,
        socket.inet_aton(src),
        socket.inet_aton(dst)
    )

    checksum = calculate_ipv4_checksum(header)

    # Repack with the correct checksum
    header = struct.pack(
        '!BBHHHBBH4s4s',
        version_ihl, tos, total_len, ident,
        flags_offset, ttl, protocol, checksum,
        socket.inet_aton(src),
        socket.inet_aton(dst)
    )

    return header

header = build_ipv4_header("172.16.10.99", "172.16.10.12", 6, 20)
print(f"Checksum valid: {verify_ipv4_checksum(header)}")
```

## Router Behavior: Updating the Checksum

Every router decrements the TTL and must update the checksum. When TTL is the only header change, a router may use an incremental update instead of recomputing from scratch (RFC 1624).

```python
def update_checksum_after_ttl_decrement(old_checksum: int, old_ttl: int) -> int:
    """
    Incrementally update checksum after TTL decrement.
    More efficient than full recalculation.
    RFC 1624 incremental checksum update specialized for a TTL decrement.
    """
    if not 1 <= old_ttl <= 255:
        raise ValueError("old_ttl must be in 1..255 before decrement")

    # TTL shares a 16-bit word with the Protocol field. Decrementing TTL by 1
    # subtracts 0x0100 from that word, so the checksum increases by 0x0100
    # with one's complement carry.
    new_checksum = old_checksum + 0x0100
    while new_checksum >> 16:
        new_checksum = (new_checksum & 0xFFFF) + (new_checksum >> 16)
    return new_checksum & 0xFFFF
```

## Why tcpdump Shows "bad cksum"

```bash
# tcpdump commonly shows "bad cksum" for locally captured outbound packets
# This is checksum offloading - the NIC computes the checksum in hardware
# The kernel passes the packet with a placeholder checksum to the NIC

# Disable checksum offloading to see real values (for debugging)
ethtool --offload eth0 tx off rx off

# Or tell tcpdump to ignore checksum errors
tcpdump -n -v --dont-verify-checksums -i eth0 'ip'
```

## Summary

The IPv4 checksum uses one's complement addition of all 16-bit header words: zero the checksum field, sum the words, fold in carry bits, then take the bitwise NOT. Verification sums all words including the checksum - a valid header produces 0xFFFF. Routers may use RFC 1624 incremental updates after TTL decrement to avoid full recalculation. On locally captured outbound traffic, a `bad cksum` message in tcpdump often indicates hardware checksum offloading rather than on-the-wire corruption.
