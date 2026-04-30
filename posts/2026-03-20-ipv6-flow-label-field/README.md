# How to Use the IPv6 Flow Label Field

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: IPv6, Flow Label, QoS, Load Balancing, ECMP

Description: Understand the 20-bit IPv6 Flow Label field, how it enables per-flow QoS and stateless load balancing without deep packet inspection.

## Introduction

The IPv6 Flow Label is a 20-bit field unique to IPv6 with no IPv4 equivalent. RFC 8200 defines the header field, and RFC 6437 specifies how it should be used. It allows a source to label packets belonging to the same flow, enabling routers and load balancers to provide special handling for that flow without inspecting upper-layer headers. While not yet universally used, the Flow Label is important for ECMP load balancing and flow-aware QoS in high-speed networks.

## Flow Label Specification (RFC 6437)

```text
Flow Label field: bits 12-31 of the first 32 bits of the IPv6 header
  Value 0x00000: not used / no specific flow request
  Non-zero:      identifies a specific flow (source-generated)

Requirements:
  - Source SHOULD use a consistent Flow Label for all packets in a flow
  - Packet classifiers can identify a flow using (Source Address, Destination Address, Flow Label)
  - For stateless labeling, a typical flow definition is the 5-tuple (src, dst, protocol, src port, dst port)
  - Flow Label values should be pseudo-random (not sequential)
  - Forwarding nodes MUST NOT change a non-zero Flow Label except for compelling operational security reasons
```

## Generating Flow Labels

Sources should generate pseudo-random Flow Labels per flow:

```python
import hmac
import struct
import socket

def generate_flow_label(src_addr: str, dst_addr: str,
                         src_port: int, dst_port: int,
                         protocol: int, secret: bytes = b"secret") -> int:
    """
    Generate a pseudo-random Flow Label for an IPv6 flow.
    Uses a secret-keyed hash so labels are stable per flow but hard to predict.

    Args:
        src_addr:  Source IPv6 address
        dst_addr:  Destination IPv6 address
        src_port:  Source port number
        dst_port:  Destination port number
        protocol:  IP protocol number (6=TCP, 17=UDP)
        secret:    Per-node secret key (rotated periodically)

    Returns:
        20-bit flow label (1 to 0xFFFFF)
    """
    # Build the 5-tuple
    src_bytes = socket.inet_pton(socket.AF_INET6, src_addr)
    dst_bytes = socket.inet_pton(socket.AF_INET6, dst_addr)
    ports = struct.pack("!HHB", src_port, dst_port, protocol)

    # Hash the 5-tuple with a secret to make labels hard to predict
    data = src_bytes + dst_bytes + ports
    digest = hmac.digest(secret, data, "sha256")

    # Extract 20 bits from the hash
    flow_label = struct.unpack("!I", digest[:4])[0] & 0xFFFFF

    # RFC 6437: if result is 0, use 1 instead
    return flow_label if flow_label != 0 else 1

# Example

label = generate_flow_label(
    "2001:db8::1", "2001:db8::2",
    src_port=54321, dst_port=443, protocol=6
)
print(f"Flow Label: 0x{label:05X} ({label})")
```

## Setting Flow Label in Python Sockets

```python
import socket

def connect_with_flow_label(dst_addr: str, dst_port: int,
                            flow_label: int = 0) -> socket.socket:
    """Connect an IPv6 socket using the AF_INET6 flowinfo field."""
    sock = socket.socket(socket.AF_INET6, socket.SOCK_STREAM)

    # AF_INET6 addresses use (host, port, flowinfo, scope_id).
    # The low 20 bits of flowinfo carry the IPv6 Flow Label.
    flowinfo = flow_label & 0xFFFFF

    sock.connect((dst_addr, dst_port, flowinfo, 0))
    return sock
```

## Flow Label for ECMP Load Balancing

The primary production use of Flow Labels is in ECMP (Equal-Cost Multi-Path) routing. Routers can use the 3-tuple (source address, destination address, Flow Label) instead of parsing the full 5-tuple:

```bash
# Linux IPv6 ECMP uses a Layer 3 hash by default:
# source address + destination address + Flow Label
cat /proc/sys/net/ipv6/fib_multipath_hash_policy

# Enable automatic Flow Label generation for locally originated traffic
sudo sysctl -w net.ipv6.auto_flowlabels=1

# Optional: use a custom ECMP hash and explicitly include the Flow Label
sudo sysctl -w net.ipv6.fib_multipath_hash_policy=3
sudo sysctl -w net.ipv6.fib_multipath_hash_fields=0x000f

# Check current Flow Label settings
cat /proc/sys/net/ipv6/auto_flowlabels
cat /proc/sys/net/ipv6/flowlabel_consistency
cat /proc/sys/net/ipv6/flowlabel_reflect
```

```text
ECMP hash computation with Flow Label:

IPv4 typical ECMP hash: hash(src_ip, dst_ip, src_port, dst_port, protocol)
  → Requires parsing up to Layer 4

IPv6 with Flow Label: hash(src_ip, dst_ip, flow_label)
  → Only Layer 3 parsing needed
  → Works even with encrypted payloads (IPsec ESP)
  → Works with all protocols (not just TCP/UDP)
```

## Observing Flow Labels with tcpdump

```bash
# Display Flow Label for each captured IPv6 packet
sudo tcpdump -i eth0 -vv ip6 | grep -i "flowlabel"

# Example output:
# 20:15:32.123456 IP6 (flowlabel 0x2a3b4, hlim 64, next-header TCP (6), payload length: 40)
#   2001:db8::1.54321 > 2001:db8::2.443: Flags [S], seq 0, win 65535, length 0

# Filter packets with non-zero flow labels
sudo tcpdump -i eth0 "ip6 and ((ip6[1] & 0x0f) != 0 or ip6[2:2] != 0)"
```

## Conclusion

The IPv6 Flow Label field enables routers and load balancers to identify and consistently handle flows without deep packet inspection. While its use is still evolving, its value in ECMP hashing (where it provides flow consistency even for encrypted traffic) and QoS (where it identifies flows that need special treatment) makes it an important tool for high-performance IPv6 network design. Sources should generate pseudo-random, per-flow labels using the 5-tuple hash approach recommended by RFC 6437.
