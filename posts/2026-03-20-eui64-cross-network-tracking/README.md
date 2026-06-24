# How to Understand How EUI-64 Enables Cross-Network Tracking

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: IPv6, EUI-64, Privacy, Tracking, Security, Networking

Description: Understand how IPv6 EUI-64 address generation embeds your device's MAC address into every packet, enabling persistent cross-network device tracking and how to mitigate it.

## Introduction

One of the earliest IPv6 Stateless Address Autoconfiguration (SLAAC) mechanisms generated interface identifiers from a device's MAC address using Modified EUI-64 (Extended Unique Identifier - 64 bit). While this made address generation simple and leveraged link-layer uniqueness, it created a serious privacy problem: any observer who sees an EUI-64-derived IPv6 address can often recover the underlying MAC address and correlate the device across networks.

## How EUI-64 Address Construction Works

EUI-64 converts a 48-bit MAC address into a 64-bit Interface Identifier by:

1. Splitting the MAC into two 24-bit halves
2. Inserting `ff:fe` in the middle
3. Flipping the universal/local (U/L) bit of the first byte

```mermaid
flowchart LR
    A["MAC: 00:1A:2B:3C:4D:5E"] --> B["Split: 00:1A:2B | 3C:4D:5E"]
    B --> C["Insert FF:FE: 00:1A:2B:FF:FE:3C:4D:5E"]
    C --> D["Flip U/L bit: 02:1A:2B:FF:FE:3C:4D:5E"]
    D --> E["IID: 021a:2bff:fe3c:4d5e"]
    E --> F["Full addr: 2001:db8::021a:2bff:fe3c:4d5e"]
```

## The Tracking Problem

For stable addresses derived via EUI-64, the IID portion remains constant even when the network prefix changes, so any party that can observe those IPv6 addresses can:

1. **Correlate sessions across networks** - the same IID can appear at home, at a coffee shop, and at the office
2. **Recover the MAC address used to form the IID** - trivially by reversing the EUI-64 transform
3. **Identify device manufacturer** - if the MAC uses a globally assigned OUI (Organizationally Unique Identifier), the first three bytes identify the hardware vendor

```bash
# Demonstration: reverse EUI-64 to recover MAC address

# Given IPv6 address: 2001:db8::021a:2bff:fe3c:4d5e
# IID: 021a:2bff:fe3c:4d5e

# Step 1: Remove ff:fe from the middle
# 02:1a:2b | 3c:4d:5e

# Step 2: Flip the U/L bit of the first byte (02 -> 00)
# Result MAC: 00:1a:2b:3c:4d:5e

echo "Recovered MAC: 00:1a:2b:3c:4d:5e"
```

## Real-World Tracking Scenarios

**Scenario 1: Advertising and Analytics**
Websites that receive direct IPv6 connections can correlate users across prefix changes using a stable EUI-64-based IID, even if cookies are cleared or browsers are changed.

**Scenario 2: Network Forensics / Surveillance**
An entity with access to logs from multiple networks (ISP, public Wi-Fi operator) can build a movement history of a specific device.

**Scenario 3: IoT Device Fingerprinting**
Industrial IoT devices that move between test labs, staging, and production networks can retain the same address suffix when they use EUI-64-derived stable addresses, making them trivially identifiable.

## Checking if Your System Uses EUI-64

```bash
# Display your current IPv6 address
ip -6 addr show | grep "scope global"

# Get your MAC address for comparison
ip link show | grep "link/ether"

# Manually verify EUI-64:
# MAC = AA:BB:CC:DD:EE:FF
# EUI-64 IID = A8BB:CCFF:FEDD:EEFF  (U/L bit flipped: AA->A8)
# If your IID matches this pattern, you are likely using EUI-64
```

## Verifying via Python

```python
def mac_to_eui64_iid(mac: str) -> str:
    """Convert a MAC address to its EUI-64 Interface Identifier."""
    parts = mac.split(":")
    # Insert ff:fe between bytes 3 and 4
    parts.insert(3, "ff")
    parts.insert(4, "fe")
    # Flip the U/L bit of the first byte
    parts[0] = format(int(parts[0], 16) ^ 0x02, "02x")
    # Group into 16-bit chunks
    groups = [parts[i] + parts[i+1] for i in range(0, 8, 2)]
    return ":".join(groups)

mac = "00:1a:2b:3c:4d:5e"
iid = mac_to_eui64_iid(mac)
print(f"MAC {mac} -> EUI-64 IID {iid}")
# Output: MAC 00:1a:2b:3c:4d:5e -> EUI-64 IID 021a:2bff:fe3c:4d5e
```

## Mitigations

| Method | RFC | Stability | Privacy |
|---|---|---|---|
| EUI-64 | RFC 4291 | Constant per interface | None |
| Temporary Addresses | RFC 8981 | Changes periodically | Good |
| Stable Privacy | RFC 7217 | Stable per-network | Good |
| DHCPv6 assigned | RFC 9915 | Server-controlled | Depends |

The modern recommendation is to use **RFC 7217 stable privacy addresses** for stable SLAAC IIDs, often alongside **RFC 8981 temporary addresses** for outbound client traffic.

## Conclusion

EUI-64 was a pragmatic design choice for early IPv6 that has since been recognized as a privacy hazard. Any device that uses EUI-64-derived stable addresses exposes a MAC-derived identifier, and often the vendor OUI, in its IPv6 address, enabling persistent cross-network tracking. Understanding how this works is the first step toward deploying RFC 7217 or RFC 8981 privacy mechanisms to protect your users and devices.
