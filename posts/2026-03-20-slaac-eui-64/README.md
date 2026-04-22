# How to Understand EUI-64 Interface Identifier Generation

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: EUI-64, SLAAC, IPv6, Interface Identifier, MAC Address, RFC 4291

Description: Understand how EUI-64 derives a 64-bit interface identifier from a 48-bit MAC address for SLAAC address generation, including the universal/local bit flip and address construction.

## Introduction

EUI-64 (Extended Unique Identifier, 64-bit) is the original method for generating IPv6 interface identifiers from 48-bit MAC addresses. The process converts a 48-bit MAC into a 64-bit identifier by inserting the bytes `ff:fe` in the middle and flipping the universal/local bit (the `0x02` bit in the first byte). While privacy extensions have largely replaced EUI-64 for client hosts, it is still used for router interfaces and in understanding how IPv6 addresses relate to hardware.

## EUI-64 Generation Algorithm

```text
EUI-64 from MAC Address:

Input MAC:  00:11:22:33:44:55
            (6 bytes, 48 bits)

Step 1: Split MAC at byte 3
  First half:  00:11:22
  Second half: 33:44:55

Step 2: Insert 0xFF and 0xFE in the middle
  Result: 00:11:22:FF:FE:33:44:55
          (8 bytes, 64 bits)

Step 3: Flip the Universal/Local bit (0x02 bit of first byte)
  First byte: 00 in binary = 0000 0000
  Flip the U/L bit (second bit from right, bit 1 in least-significant-bit numbering):
  00 = 0000 0000 → bit 1 (0-indexed) is 0 → flip to 1
  Result: 0000 0010 = 0x02

  00 → 02 (flip bit 1, the "u" bit)

Final EUI-64 Interface ID: 0211:22ff:fe33:4455

SLAAC Address:
  Prefix: 2001:db8::/64
  IID:    0211:22ff:fe33:4455
  Result: 2001:db8::211:22ff:fe33:4455
```

## Universal/Local Bit Explained

```text
The Universal/Local (U/L) Bit:

In IEEE 802 MAC addresses (using least-significant-bit numbering within the first octet):
  Bit 0 of first byte: I/G bit (Individual/Group) - 0=unicast, 1=multicast
  Bit 1 of first byte: U/L bit (Universal/Local)  - 0=global, 1=local

  MAC 00:11:22:33:44:55
       ^^
       00 in binary = 0000 0000
       bit 0 (I/G): 0 = unicast ✓
       bit 1 (U/L): 0 = globally unique (assigned by IEEE)

In IPv6 modified EUI-64 interface identifiers:
  The semantics are INVERTED:
  U/L bit 0 in IPv6 = locally administered
  U/L bit 1 in IPv6 = globally unique (IEEE-assigned)

Why the flip?
  MAC U/L=0 means "globally unique from IEEE"
  IPv6 modified EUI-64 convention: bit=1 means "derived from globally unique MAC"
  So the bit is flipped when converting MAC → modified EUI-64 IID

Common MAC prefixes and their EUI-64:
  00:... (U/L=0, global) → EUI-64: 02:...  (U/L=1)
  02:... (U/L=1, local)  → EUI-64: 00:...  (U/L=0)

  Locally administered MACs (VMs, VPNs) typically start with 02:
  Their EUI-64 interface IDs start with 00:
```

## Examples with Different MAC Addresses

```python
import ipaddress

def mac_to_eui64(mac_str: str) -> str:
    """Convert 48-bit MAC to 64-bit EUI-64 interface identifier."""
    # Parse MAC address
    parts = mac_str.replace(":", "").replace("-", "")
    assert len(parts) == 12, "MAC must be 12 hex chars"

    # Split into 6 bytes
    bytes_list = [int(parts[i:i+2], 16) for i in range(0, 12, 2)]

    # Insert 0xFF and 0xFE in the middle (between byte 3 and 4)
    eui64_bytes = bytes_list[:3] + [0xFF, 0xFE] + bytes_list[3:]

    # Flip the Universal/Local bit (0x02 = bit index 1 in least-significant-bit numbering)
    eui64_bytes[0] ^= 0x02

    # Format as IPv6 interface identifier
    hex_str = "".join(f"{b:02x}" for b in eui64_bytes)
    # Format as 4 groups of 4 hex digits
    iid = ":".join(hex_str[i:i+4] for i in range(0, 16, 4))
    return iid

# Examples:

print(mac_to_eui64("00:11:22:33:44:55"))  # → 0211:22ff:fe33:4455
print(mac_to_eui64("aa:bb:cc:dd:ee:ff"))  # → a8bb:ccff:fedd:eeff
print(mac_to_eui64("f0:18:98:ab:cd:ef"))  # → f218:98ff:feab:cdef

# Construct full SLAAC address:
prefix = ipaddress.IPv6Network("2001:db8::/64")
iid_int = int(mac_to_eui64("00:11:22:33:44:55").replace(":", ""), 16)
address = ipaddress.IPv6Address(int(prefix.network_address) | iid_int)
print(address)  # → 2001:db8::211:22ff:fe33:4455 (leading zeros compressed)
```

## Verifying EUI-64 on Linux

```bash
# Show IPv6 addresses - EUI-64 addresses derived from 48-bit MACs contain ff:fe in the middle
ip -6 addr show eth0

# Look for likely EUI-64 addresses (contain ff:fe pattern):
# 2001:db8::211:22ff:fe33:4455
#                  ^^^^  These bytes are ff:fe = EUI-64 marker

# Find your MAC address
ip link show eth0
# link/ether 00:11:22:33:44:55

# Manual EUI-64 calculation check:
# MAC:   00:11:22:33:44:55
# Split: 00:11:22 | 33:44:55
# Add:   00:11:22:FF:FE:33:44:55
# Flip:  02:11:22:FF:FE:33:44:55
# IID:   0211:22ff:fe33:4455
# Addr:  2001:db8::211:22ff:fe33:4455 (leading zeros omitted)

# Verify the interface ID of your SLAAC address matches
ip -6 addr show eth0 | grep "scope global"
# inet6 2001:db8::211:22ff:fe33:4455/64 scope global
#                  ^^^^^^^^^^^^^^^^^^^^^ = EUI-64 from MAC
```

## Privacy Concern: MAC Address Exposure

EUI-64 embeds the MAC address in the IPv6 address, creating a privacy issue.

```bash
EUI-64 Privacy Issue:

Address: 2001:db8::211:22ff:fe33:4455

From the address alone, you can determine:
  1. The MAC address: 00:11:22:33:44:55
  2. The hardware manufacturer: OUI 00:11:22 = [vendor lookup]
  3. The same device across networks (if prefix changes, IID stays same)

This enables:
  - Tracking a device across different networks
  - Identifying device hardware/manufacturer
  - Correlating user activity across websites

Solution: Privacy Extensions (RFC 8981)
  - Random interface identifier, changes periodically
  - Prevents tracking across time and networks
  - Commonly enabled by default on modern client systems such as Windows, macOS, iOS, and Android
  - Optional on Linux (kernel default is disabled for most devices; distributions/network managers may enable it)

Enable privacy extensions on Linux:
  sudo sysctl -w net.ipv6.conf.eth0.use_tempaddr=2
```

## EUI-64 Use Cases Where It's Appropriate

```text
When to use EUI-64 (despite privacy concerns):

1. Router interfaces:
   - Routers need stable, predictable addresses
   - Administrators need to know router addresses
   - EUI-64 is fine for infrastructure
   Example: interface GigabitEthernet0/0 has stable EUI-64 link-local

2. Servers with static addresses:
   - Servers typically use manual static addresses, not EUI-64
   - But EUI-64 on servers is stable (no privacy concern for servers)

3. Network documentation:
   - Understanding existing EUI-64 addresses in your network
   - Mapping IPv6 addresses back to hardware during troubleshooting

4. Embedded/IoT devices:
   - IoT devices may use EUI-64 for simplicity
   - Privacy less critical in isolated IoT networks
```

## Conclusion

EUI-64 converts a 48-bit MAC address to a 64-bit IPv6 interface identifier by inserting `ff:fe` in the middle and flipping the universal/local bit. The resulting interface identifier combined with a /64 prefix from SLAAC produces a stable IPv6 address intended to be unique within the subnet and tied to the hardware MAC. While simple and collision-resistant, EUI-64 exposes the MAC address in the IPv6 address, enabling device tracking. Modern systems use privacy extensions (RFC 8981) or stable privacy addresses (RFC 7217) for client devices to address this concern.
