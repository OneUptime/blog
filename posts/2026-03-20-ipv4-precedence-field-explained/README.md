# How to Understand the IPv4 Precedence Field

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: IPv4, Networking, QoS, Precedence, ToS, DSCP

Description: The 3-bit Precedence field in the original IPv4 ToS byte allowed traffic prioritization from Routine to Network Control, forming the conceptual foundation for modern DSCP-based QoS.

## What Is the Precedence Field?

In the original RFC 791 definition of IPv4, the Type of Service byte was structured as follows (the Minimize Monetary Cost bit was added later by RFC 1349):

```text
Bits 0-2:  Precedence
Bit  3:    D (Minimize Delay)
Bit  4:    T (Maximize Throughput)
Bit  5:    R (Maximize Reliability)
Bits 6-7:  Reserved
```

The 3-bit Precedence field allowed 8 priority levels:

| Value | Name | Typical Use |
|-------|------|-------------|
| 0 | Routine | Normal traffic |
| 1 | Priority | Elevated-priority traffic |
| 2 | Immediate | Time-sensitive traffic |
| 3 | Flash | Urgent traffic |
| 4 | Flash Override | Higher-priority urgent traffic |
| 5 | CRITIC/ECP | Critical traffic |
| 6 | Internetwork Control | Gateway or routing control |
| 7 | Network Control | Network-local control |

## Legacy vs Modern (DSCP)

RFC 2474 (1998) redefined this octet as the Differentiated Services (DS) field. The 6-bit DSCP occupies the left-most 6 bits of the same byte, preserving the former Precedence bit positions for Class Selector codepoints (`xxx000`). The remaining two bits were later assigned to ECN by RFC 3168.

## Class Selector DSCP Values (Backward Compatibility)

| Class Selector | DSCP Value | Precedence Equivalent |
|---------------|-----------|----------------------|
| CS0 | 0 | 0 (Routine) |
| CS1 | 8 | 1 (Priority) |
| CS2 | 16 | 2 (Immediate) |
| CS3 | 24 | 3 (Flash) |
| CS4 | 32 | 4 (Flash Override) |
| CS5 | 40 | 5 (CRITIC/ECP) |
| CS6 | 48 | 6 (Internetwork Control) |
| CS7 | 56 | 7 (Network Control) |

## Setting Precedence/DSCP in Python

```python
import socket

# Set DSCP CS5 (Class Selector 5 / former Precedence 5)

DSCP_CS5 = 40          # 0b101000
tos_byte = DSCP_CS5 << 2  # Shift into the upper 6 bits; ECN stays 00 = 0xA0

sock = socket.socket(socket.AF_INET, socket.SOCK_DGRAM)
sock.setsockopt(socket.IPPROTO_IP, socket.IP_TOS, tos_byte)
sock.sendto(b"critical control message", ("10.0.0.1", 514))
sock.close()
print(f"Sent with DSCP CS5, ToS=0x{tos_byte:02X}")
```

## Marking with iptables

```bash
# Mark routing protocol traffic (OSPF, protocol 89) with CS6
iptables -t mangle -A OUTPUT -p 89 -j DSCP --set-dscp-class CS6
```

## Key Takeaways

- The original 3-bit Precedence field had 8 priority levels (Routine to Network Control).
- DSCP Class Selectors (CS0–CS7) are backward-compatible with the original Precedence values.
- Most modern networks configure QoS using DSCP, not the original Precedence bits directly.
- Routing and control traffic is typically marked CS6; RFC 4594 recommends reserving CS7 for future use.
