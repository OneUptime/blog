# How to Use Flow Labels for ECMP Hashing

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: IPv6, ECMP, Flow Label, BGP, Routing

Description: Use IPv6 Flow Labels in Equal-Cost Multi-Path routing to ensure consistent per-flow path selection without deep packet inspection of encrypted traffic.

## Introduction

ECMP (Equal-Cost Multi-Path) routing allows traffic to be distributed across multiple equal-cost paths. The challenge is ensuring that packets belonging to the same TCP flow always take the same path - otherwise, out-of-order delivery causes performance problems. IPv6 Flow Labels help solve this elegantly: by hashing on the source and destination addresses plus the Flow Label (which is constant for a given flow), ECMP routers can make consistent path decisions without inspecting TCP ports or payloads.

## The ECMP Problem

```text
Without consistent hashing:
Flow A: Packet 1 → Path 1, Packet 2 → Path 2 (different latencies)
Result: TCP out-of-order → retransmissions → degraded throughput

With Flow Label ECMP hashing:
Flow A: Flow Label = 0x2A3B4
→ hash(src, dst, 0x2A3B4) → always maps to Path 1
Result: All packets take same path → in-order delivery
```

## Linux Kernel ECMP Configuration

```bash
# Linux IPv6 ECMP can use src/dst/flow-label for Layer 3 hashing

# Check current IPv6 ECMP hash policy
sysctl net.ipv6.fib_multipath_hash_policy

# Make the hash fields explicit: src + dst + flow label
sudo sysctl -w net.ipv6.fib_multipath_hash_policy=3
sudo sysctl -w net.ipv6.fib_multipath_hash_fields=0x000B

# Set up ECMP routes
ip -6 route add 2001:db8:100::/48 \
    nexthop via 2001:db8:1::1 dev eth0 weight 1 \
    nexthop via 2001:db8:2::1 dev eth1 weight 1 \
    nexthop via 2001:db8:3::1 dev eth2 weight 1

# Verify ECMP is active
ip -6 route show match 2001:db8:100::/48
# Should show 3 nexthops
```

## ECMP Hash Algorithms

```python
import hashlib
import socket
import struct

def ecmp_hash(src_addr: str, dst_addr: str, flow_label: int,
              num_paths: int, src_port: int, dst_port: int,
              protocol: int) -> int:
    """
    Compute the ECMP path selection for an IPv6 flow.

    Uses (src, dst, flow_label) when a non-zero flow label is present.
    Falls back to a 5-tuple-style hash when flow_label=0.

    Returns: path index (0 to num_paths-1)
    """
    src = socket.inet_pton(socket.AF_INET6, src_addr)
    dst = socket.inet_pton(socket.AF_INET6, dst_addr)

    if flow_label != 0:
        # Use 3-tuple hash when flow label is set
        hash_input = src + dst + struct.pack("!I", flow_label & 0xFFFFF)
        method = "3-tuple (src, dst, flow label)"
    else:
        # Fall back to the transport 5-tuple when no flow label is set
        hash_input = src + dst + struct.pack("!HHB", src_port, dst_port, protocol)
        method = "5-tuple-style fallback"

    hash_val = int(hashlib.sha256(hash_input).hexdigest(), 16)
    path = hash_val % num_paths

    print(f"  Hash method: {method}")
    print(f"  Path selected: {path} of {num_paths}")
    return path

# Simulate ECMP path selection for multiple flows
print("ECMP Path Selection Simulation")
print("="*50)

flows = [
    ("2001:db8:10::1", "2001:db8:100::1", 0x12345, 50000, 443, 6),
    ("2001:db8:10::1", "2001:db8:100::1", 0x67890, 50001, 443, 6),  # Same src/dst, diff flow
    ("2001:db8:10::2", "2001:db8:100::1", 0x12345, 50000, 443, 6),  # Diff src, same flow label
    ("2001:db8:10::1", "2001:db8:100::1", 0, 50000, 443, 6),        # No flow label
]

for src, dst, fl, sport, dport, proto in flows:
    print(f"\nFlow: {src} → {dst} (FL: 0x{fl:05X})")
    path = ecmp_hash(src, dst, fl, num_paths=3,
                     src_port=sport, dst_port=dport, protocol=proto)
```

## Cisco IOS-XR ECMP with Flow Label

```text
# On supported Cisco IOS XR platforms, enable the IPv6 flow label
# as an additional CEF hash input:
cef load-balancing fields ipv6 flow-label
```

## Juniper Junos ECMP Configuration

```text
# On Junos platforms that use the hash-key hierarchy:
set forwarding-options hash-key family inet6 layer-3 source-address
set forwarding-options hash-key family inet6 layer-3 destination-address
set forwarding-options hash-key family inet6 layer-3 ipv6-flow-label

# This ensures (src, dst, flow_label) are all included in the ECMP hash
```

## Generating Good Flow Labels for ECMP

Sources should generate diverse, pseudo-random Flow Labels to ensure good load distribution:

```python
import os
import hashlib
import struct
import socket

# RFC 6437-compatible approach: hash the 5-tuple with a local secret
class FlowLabelGenerator:
    def __init__(self):
        # A local secret makes labels hard to predict off-path
        self._secret = os.urandom(16)

    def generate(self, src: str, dst: str, src_port: int,
                 dst_port: int, protocol: int) -> int:
        """Generate a flow label for a given 5-tuple."""
        src_bytes = socket.inet_pton(socket.AF_INET6, src)
        dst_bytes = socket.inet_pton(socket.AF_INET6, dst)
        ports = struct.pack("!HHB", src_port, dst_port, protocol)

        digest = hashlib.sha256(self._secret + src_bytes + dst_bytes + ports).digest()
        flow_label = struct.unpack("!I", digest[:4])[0] & 0xFFFFF
        return flow_label if flow_label != 0 else 1

gen = FlowLabelGenerator()

# Show generated flow-label distribution across 3 buckets
from collections import Counter
buckets = []
for i in range(10000):
    fl = gen.generate("2001:db8::1", "2001:db8::2", i, 443, 6)
    bucket = fl % 3
    buckets.append(bucket)

distribution = Counter(buckets)
for bucket, count in sorted(distribution.items()):
    print(f"Bucket {bucket}: {count} flows ({count/100:.1f}%)")
```

## Conclusion

IPv6 Flow Labels improve ECMP implementations by providing a stable, per-flow identifier at Layer 3. Network devices can hash on (src, dst, flow_label) without inspecting TCP ports or payloads, enabling efficient ECMP even for IPsec-encrypted traffic. Sources should generate pseudo-random Flow Labels using an RFC 6437-compatible method to ensure even load distribution across ECMP paths.
