# How to Generate Modified EUI-64 Interface Identifiers

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: IPv6, EUI-64, MAC Address, SLAAC, Interface Identifier

Description: Learn the step-by-step process of generating a Modified EUI-64 interface identifier from a MAC address for use in IPv6 SLAAC address autoconfiguration.

## Introduction

Modified EUI-64 is the algorithm defined in RFC 4291 that converts a 48-bit MAC address into a 64-bit IPv6 Interface Identifier (IID). While modern systems often use privacy-preserving alternatives, EUI-64 is still widely used for routers, network equipment, and systems where stable, hardware-derived addresses are preferred.

## The EUI-64 Algorithm Step by Step

Converting a MAC address `00:1A:2B:3C:4D:5E`:

**Step 1: Start with the 48-bit MAC address**
```text
00:1A:2B:3C:4D:5E
```

**Step 2: Split into two 24-bit halves**
```text
OUI (first 24 bits):  00:1A:2B
NIC (last 24 bits):   3C:4D:5E
```

**Step 3: Insert `FF:FE` between the two halves**
```text
00:1A:2B:FF:FE:3C:4D:5E  (now 64 bits = EUI-64)
```

**Step 4: Flip the Universal/Local (U/L) bit** - bit 1 of the first byte (0-indexed from the right)
```text
First byte: 0x00 = 0000 0000
                        ^
                  bit 1 (U/L bit)
Flip bit 1: 0000 0010 = 0x02
```

**Result IID:**
```text
02:1A:2B:FF:FE:3C:4D:5E
→ 021a:2bff:fe3c:4d5e
```

## Complete Python Implementation

```python
import ipaddress

def mac_to_modified_eui64(mac_address):
    """
    Convert a MAC address to a Modified EUI-64 Interface Identifier.

    Args:
        mac_address: MAC address string (e.g., "00:1A:2B:3C:4D:5E")

    Returns:
        EUI-64 IID as colon-separated 16-bit groups
    """
    # Step 1: Clean the MAC address (remove separators)
    mac_clean = mac_address.replace(":", "").replace("-", "").replace(".", "")

    if len(mac_clean) != 12:
        raise ValueError("MAC address must be 48 bits (12 hex chars)")

    # Step 2: Convert to integer bytes
    mac_bytes = bytes.fromhex(mac_clean)

    # Step 3: Insert 0xFF and 0xFE in the middle
    eui64_bytes = mac_bytes[:3] + b'\xff\xfe' + mac_bytes[3:]

    # Step 4: Flip the U/L bit (bit 1 of the first byte)
    eui64_list = list(eui64_bytes)
    eui64_list[0] ^= 0x02  # XOR with 0b00000010 to flip bit 1

    # Step 5: Format as IPv6 IID (four 16-bit groups)
    eui64_hex = bytes(eui64_list).hex()
    groups = [eui64_hex[i:i+4] for i in range(0, 16, 4)]

    return ":".join(groups)

def build_ipv6_address(prefix, mac_address):
    """Build a full IPv6 SLAAC address from a /64 prefix and MAC."""
    iid = mac_to_modified_eui64(mac_address)
    prefix_text = prefix if "/" in prefix else f"{prefix.rstrip(':')}::/64"
    network = ipaddress.IPv6Network(prefix_text, strict=False)

    if network.prefixlen != 64:
        raise ValueError("SLAAC requires a /64 prefix")

    iid_int = int.from_bytes(bytes.fromhex(iid.replace(":", "")), "big")
    return str(ipaddress.IPv6Address(int(network.network_address) | iid_int))

# Examples

examples = [
    "00:1A:2B:3C:4D:5E",
    "AA:BB:CC:DD:EE:FF",
    "00:50:56:AA:BB:CC",  # VMware OUI
]

for mac in examples:
    iid = mac_to_modified_eui64(mac)
    addr = build_ipv6_address("2001:db8:1:1", mac)
    print(f"MAC: {mac} → IID: {iid} → Address: {addr}")
```

## Verifying on Linux

```bash
# Check which IID your interface uses
ip -6 addr show dev eth0

# For a link-local address (typically EUI-64 on older Linux kernels)
# fe80::<eui-64-iid>/64

# Get MAC address of interface
ip link show eth0 | grep "link/ether" | awk '{print $2}'

# Manually verify by running the conversion
python3 - <<'PY'
import re
import subprocess

def mac_to_modified_eui64(mac_address):
    mac_clean = mac_address.replace(":", "").replace("-", "").replace(".", "")
    if len(mac_clean) != 12:
        raise ValueError("MAC address must be 48 bits (12 hex chars)")

    mac_bytes = bytes.fromhex(mac_clean)
    eui64_bytes = mac_bytes[:3] + b'\xff\xfe' + mac_bytes[3:]
    eui64_list = list(eui64_bytes)
    eui64_list[0] ^= 0x02

    eui64_hex = bytes(eui64_list).hex()
    groups = [eui64_hex[i:i+4] for i in range(0, 16, 4)]
    return ":".join(groups)

link_info = subprocess.check_output(["ip", "link", "show", "eth0"], text=True)
mac = re.search(r"link/ether ([0-9a-f:]{17})", link_info, re.IGNORECASE).group(1)
print(mac_to_modified_eui64(mac))
PY

# On modern Linux, link-local may use EUI-64 or RFC 7217-based generation
# Check the kernel parameter
cat /proc/sys/net/ipv6/conf/eth0/addr_gen_mode
# 0 = EUI-64
# 1 = no link-local address; EUI-64 for SLAAC addresses
# 2 = stable privacy (RFC 7217) using stable_secret
# 3 = stable privacy with a random secret if stable_secret is unset
```

## The U/L Bit Flip Explained

The U/L bit flip is the most confusing part of EUI-64:

| Bit value | MAC meaning | IID meaning |
|---|---|---|
| 0 | Universally administered (OUI from IEEE) | Locally administered |
| 1 | Locally administered (set by admin) | Universally administered |

The flip exists because IEEE 802 uses 0 for "global" (OUI-assigned) MACs, but RFC 4291 uses 0 for "local" and 1 for "global" IIDs. The flip maps global MAC OUIs to IIDs marked as globally unique.

## Disabling EUI-64 in Favor of Privacy Addresses

```bash
# Switch from EUI-64 to RFC 7217-based address generation
sudo sysctl -w net.ipv6.conf.eth0.addr_gen_mode=3

# Or enable temporary privacy addresses
sudo sysctl -w net.ipv6.conf.eth0.use_tempaddr=2

# Make permanent in sysctl.conf
echo "net.ipv6.conf.all.addr_gen_mode=3" | sudo tee -a /etc/sysctl.conf
```

## Conclusion

Modified EUI-64 provides a deterministic, hardware-derived method for generating IPv6 interface identifiers. While privacy concerns have led to its replacement by RFC 7217 stable privacy addresses on end-user devices, EUI-64 remains valuable for network infrastructure where predictable, traceable addressing is beneficial. Understanding the algorithm helps in troubleshooting address generation issues and audit compliance.
