# How to Understand the SRv6 SID Format (5f00::/16)

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: SRv6, SID, 5f00, RFC 9602, IPv6, Segment Routing

Description: Understand the SRv6 SID address format using the 5f00::/16 prefix, locator structure, function encoding, and how SIDs are constructed and allocated.

## Introduction

RFC 9602 allocates `5f00::/16` as a dedicated IPv6 special-purpose address space for SRv6 Segment Identifiers (SIDs). IANA marks this block as forwardable but not globally reachable, so it should be routed within the intended SR domain or between collaborating SR domains. A SID is a 128-bit IPv6 address that encodes both a locator (identifying the node) and a function (the local behavior bound to that SID). Understanding the SID format is essential for planning, configuring, and troubleshooting SRv6 deployments.

## SID Structure

```text
 | <--- Locator (N bits) ---> | <-- Function (F bits) --> | <- Args (A bits) -> |
 |                            |                           |                     |
 |  Block  |   Node ID        |  Function Value           |    Arguments        |
 | 16 bits |  variable        |  variable                 |    variable         |

 Total = 128 bits = Locator + Function + Arguments

 Typical allocation:
   Block:    16 bits  (5f00::/16 from RFC 9602)
   Node ID:  32 bits  (identifies specific router)
   Function: 16 bits  (local behavior binding at that node)
   Args:     64 bits  (optional, for stateless parameters)

 Example:
   5f00:0001:0000:e001:0000:0000:0000:0000/128
   Block=5f00, Node=0001:0000, Function=e001, Args=0000:...
   Written compressed: 5f00:1:0:e001::
```

## Locator Structure and Allocation

```bash
# Example locator plan for a 3-node network

# Each node gets a /48 locator within 5f00::/16

NODE_R1_LOCATOR="5f00:1::/48"
NODE_R2_LOCATOR="5f00:2::/48"
NODE_R3_LOCATOR="5f00:3::/48"

# Enable IPv6 forwarding and SRv6 on the ingress interface
sysctl -w net.ipv6.conf.all.forwarding=1
sysctl -w net.ipv6.conf.eth0.seg6_enabled=1
sysctl -w net.ipv6.conf.all.seg6_enabled=1

# Install local SID behaviors in the Linux data plane
ip -6 route add 5f00:1:0:1::/128 encap seg6local action End dev lo
ip -6 route add 5f00:1:0:e001::/128 encap seg6local action End.X nh6 fe80::2 dev eth0
ip -6 route add 5f00:1:0:e002::/128 encap seg6local action End.X nh6 fe80::3 dev eth0
```

## Endpoint Behavior Codepoints

```text
Endpoint Behavior 0x0001 = End
Endpoint Behavior 0x0005 = End.X
Endpoint Behavior 0x0009 = End.T
Endpoint Behavior 0x0015 = End.DX2
Endpoint Behavior 0x0016 = End.DX2V
Endpoint Behavior 0x0017 = End.DT2U
Endpoint Behavior 0x0018 = End.DT2M
Endpoint Behavior 0x0010 = End.DX6
Endpoint Behavior 0x0011 = End.DX4
Endpoint Behavior 0x0012 = End.DT6
Endpoint Behavior 0x0013 = End.DT4
Endpoint Behavior 0x0014 = End.DT46
Endpoint Behavior 0x000E = End.B6.Encaps
Endpoint Behavior 0x000F = End.BM

Note: These are IANA SRv6 Endpoint Behavior codepoints for control-plane signaling,
      not the values encoded in the SID's Function field. The Function bits are
      locally assigned and opaque; an SR source cannot infer the behavior by
      looking at the Function value alone.

      IANA behavior-codepoint ranges:
      0x0001-0x7FFF = First Come First Served
      0x8000-0x87FF = Private Use
      0x8800-0xFFFE = Reserved
      0xFFFF        = Reserved Opaque
```

## SID Construction in Python

```python
import ipaddress

def build_srv6_sid(block: str, node_id: int, function: int, args: int = 0) -> str:
    """
    Build an SRv6 SID from components.
    block: e.g. "5f00"
    node_id: 32-bit node identifier
    function: 16-bit function code
    args: 64-bit arguments (default 0)
    """
    # Pack into 128-bit integer
    # Layout: block(16) | node(32) | function(16) | args(64)
    block_int = int(block, 16)
    sid_int = (
        (block_int << 112) |
        (node_id << 80) |
        (function << 64) |
        args
    )
    return str(ipaddress.IPv6Address(sid_int))

# Examples
print(build_srv6_sid("5f00", 0x00010000, 0xe001))   # 5f00:1:0:e001::
print(build_srv6_sid("5f00", 0x00020000, 0xe000))   # 5f00:2:0:e000::
print(build_srv6_sid("5f00", 0x00030000, 0x0001))   # 5f00:3:0:1::  (local function bound to End)

def parse_srv6_sid(sid: str) -> dict:
    """Parse an SRv6 SID into components."""
    addr_int = int(ipaddress.IPv6Address(sid))
    return {
        "block":    hex((addr_int >> 112) & 0xFFFF),
        "node_id":  hex((addr_int >> 80) & 0xFFFFFFFF),
        "function": hex((addr_int >> 64) & 0xFFFF),
        "args":     hex(addr_int & 0xFFFFFFFFFFFFFFFF),
    }

print(parse_srv6_sid("5f00:1:0:e001::"))
# {'block': '0x5f00', 'node_id': '0x10000', 'function': '0xe001', 'args': '0x0'}
```

## Advertising SIDs via IS-IS or BGP

```bash
# FRR: define the locator in Zebra, then let IS-IS use it
# /etc/frr/frr.conf
# segment-routing
#  srv6
#   locators
#    locator MAIN
#     prefix 5f00:1::/48 block-len 16 node-len 32 func-bits 16
# !
# router isis CORE
#   segment-routing srv6
#    locator MAIN
```

## Conclusion

The `5f00::/16` address space provides dedicated SRv6 SID space for SR domains. Each SID encodes a locator (node identity) and function (local behavior binding). Plan your SID allocation with a clear locator hierarchy. Use the Python parsing functions above to validate SIDs in automation scripts. Monitor SID reachability with OneUptime to ensure the control plane is advertising all required segments.
