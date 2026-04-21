# How to Understand Subnetting with the Magic Number Method

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: IPv4, Subnetting, Magic Number, Networking, Mental Math

Description: The magic number method simplifies subnetting by calculating 256 minus the interesting mask octet to find the block size, then using multiples of that block to quickly determine subnet boundaries.

## The Magic Number Formula

```text
Magic Number = Block Size = 256 - (interesting mask octet)
```

The "interesting octet" is the first octet in the mask that is neither 0 nor 255 - it's where the network/host boundary falls.

## Three-Step Process

1. Find the interesting octet and compute: `block = 256 - mask_octet`
2. List multiples of block in that octet: 0, block, 2×block, ...
3. The subnet containing the IP starts at the largest multiple ≤ the IP's octet

## Examples

**172.20.50.100/21**
- Mask: 255.255.248.0 → interesting octet = 3rd = 248
- Block = 256 - 248 = 8
- Multiples of 8: 0, 8, 16, ..., 48, 56, ...
- 50 falls in 48–55 → subnet = **172.20.48.0/21**
- Broadcast = 48 + 8 - 1 = 55 → **172.20.55.255**

**10.0.0.0/11**
- Mask: 255.224.0.0 → interesting octet = 2nd = 224
- Block = 256 - 224 = 32
- 0 falls in 0–31 → subnet = **10.0.0.0/11**
- Broadcast = **10.31.255.255**

## Python Validator Using Magic Number Logic

```python
def magic_number_subnet(ip: str, prefix: int) -> dict:
    """
    Determine subnet info using the magic number method.
    """
    import ipaddress, socket, struct

    # Build mask
    mask_int = (0xFFFFFFFF << (32 - prefix)) & 0xFFFFFFFF
    mask_packed = struct.pack("!I", mask_int)
    mask_octets = list(mask_packed)
    ip_octets = [int(x) for x in ip.split('.')]

    # Find interesting octet (first non-255, non-0)
    interesting_idx = None
    for i, m in enumerate(mask_octets):
        if 0 < m < 255:
            interesting_idx = i
            break

    if interesting_idx is None:
        # All 255s or all 0s - handle edge cases
        net = ipaddress.IPv4Network(f"{ip}/{prefix}", strict=False)
        return {"subnet": str(net.network_address),
                "broadcast": str(net.broadcast_address),
                "block": None, "octet_idx": None}

    block = 256 - mask_octets[interesting_idx]
    ip_in_octet = ip_octets[interesting_idx]
    subnet_octet = (ip_in_octet // block) * block
    broadcast_octet = subnet_octet + block - 1

    # Build subnet and broadcast
    subnet = ip_octets[:interesting_idx] + [subnet_octet] + [0] * (3 - interesting_idx)
    broadcast = ip_octets[:interesting_idx] + [broadcast_octet] + [255] * (3 - interesting_idx)

    return {
        "block": block,
        "octet": interesting_idx + 1,
        "subnet": '.'.join(map(str, subnet)),
        "broadcast": '.'.join(map(str, broadcast)),
    }

# Test cases

for ip, pfx in [("172.20.50.100", 21), ("192.168.1.45", 26), ("10.0.0.0", 11)]:
    r = magic_number_subnet(ip, pfx)
    print(f"{ip}/{pfx}: block={r['block']} subnet={r['subnet']} bcast={r['broadcast']}")
```

## Quick Reference Cheat Sheet

| Mask Octet | Block Size | Common Prefix (4th Octet) |
|-----------|-----------|--------------|
| 252 | 4 | /30 |
| 248 | 8 | /29 |
| 240 | 16 | /28 |
| 224 | 32 | /27 |
| 192 | 64 | /26 |
| 128 | 128 | /25 |

## Key Takeaways

- Magic number = 256 − interesting_mask_octet = block size.
- Subnet start = largest multiple of block size ≤ IP octet value.
- Broadcast = subnet_start + block − 1 (or the next multiple − 1).
- Practice with /25 through /29 until block sizes are automatic.
