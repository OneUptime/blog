# How to Understand IPv6 Interface Identifiers

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: IPv6, Networking, Interface Identifier, EUI-64, Privacy Extensions

Description: Understand the role and types of IPv6 interface identifiers - the lower 64 bits of an IPv6 address - including EUI-64, stable privacy, and temporary addresses.

## Introduction

On a typical /64 IPv6 subnet, the lower 64 bits of a unicast address are the **Interface Identifier (IID)**. The IID uniquely identifies an interface within a subnet. Unlike IPv4 where the host portion is manually assigned or assigned by DHCP, IPv6 offers multiple ways to generate interface identifiers automatically.

## Types of Interface Identifiers

### 1. EUI-64 (IEEE Extended Unique Identifier)

Derived from the 48-bit MAC address by inserting `ff:fe` in the middle and flipping the Universal/Local (U/L) bit:

```text
MAC address:   00:1A:2B:3C:4D:5E
               ↓
Insert ff:fe:  00:1A:2B:FF:FE:3C:4D:5E
               ↓
Flip U/L bit:  02:1A:2B:FF:FE:3C:4D:5E
               ↓
IID:           021a:2bff:fe3c:4d5e
```

```python
# Python: compute EUI-64 IID from MAC address

def mac_to_eui64_iid(mac):
    # Remove separators and split into bytes
    mac_bytes = mac.replace(":", "").replace("-", "").lower()
    # Split into two halves
    first_half = mac_bytes[:6]
    second_half = mac_bytes[6:]
    # Insert ff:fe between the halves
    expanded = first_half + "fffe" + second_half
    # Flip the U/L bit (0x02 in the first byte)
    first_byte = int(expanded[:2], 16) ^ 0x02
    expanded = f"{first_byte:02x}" + expanded[2:]
    # Format as IPv6 IID groups
    return ":".join([expanded[i:i+4] for i in range(0, 16, 4)])

print(mac_to_eui64_iid("00:1A:2B:3C:4D:5E"))
# Output: 021a:2bff:fe3c:4d5e
```

### 2. Stable Privacy Addresses (RFC 7217)

Generates a consistent but non-traceable IID by hashing the prefix, a stable interface identifier, network-specific data, a DAD counter, and a secret key:

```text
IID = F(Prefix, Net_Iface, Network_ID, DAD_Counter, secret_key)
```

This gives you the same address on the same network every time (no privacy leakage across networks), but the address is not derived from your MAC address.

### 3. Temporary/Random Addresses (RFC 8981)

Generates a new random IID periodically, and hosts typically prefer it for outgoing connections to prevent tracking:

```bash
# Enable privacy extensions on Linux (temporary addresses)
sudo sysctl -w net.ipv6.conf.eth0.use_tempaddr=2

# Values:
# 0 = disabled
# 1 = generate temporary addresses but prefer public
# 2 = generate and prefer temporary addresses

# Make permanent
echo "net.ipv6.conf.eth0.use_tempaddr=2" | sudo tee -a /etc/sysctl.conf
```

### 4. Manual/Static IIDs

Manually configured for servers and network equipment:

```bash
# Common readable static IIDs for infrastructure
2001:db8:1:1::1      # Router (IID = ::1)
2001:db8:1:1::2      # Gateway (IID = ::2)
2001:db8:1:1::53     # DNS server (IID = ::53, port 53)
2001:db8:1:1::80     # Web server (IID = ::80)
```

## The U/L and I/G Bits

In Modified EUI-64-derived IIDs, the first byte preserves two IEEE-derived bits:

```text
U/L bit (0x02 in the first byte):
  0 = local scope
  1 = universal scope

I/G bit (0x01 in the first byte):
  Preserved from the MAC address
```

For EUI-64, the U/L bit is **inverted** (flipped) relative to the MAC address convention, so a MAC with the U/L bit=0 (OUI-assigned) becomes an IID with U/L bit=1. For RFC 7217 and RFC 8981 addresses, these bits are not generally treated as semantically meaningful.

## Viewing Interface Identifiers on Your System

```bash
# Show all IPv6 addresses with their scope
ip -6 addr show

# See which address type each is (temporary vs permanent)
ip -6 addr show | grep -E "inet6|scope"

# Example output:
# inet6 2001:db8::1a2b:3cff:fe4d:5e6f/64 scope global dynamic mngtmpaddr  ← stable address with EUI-64 pattern
# inet6 2001:db8::a1b2:c3d4:e5f6:7890/64 scope global temporary dynamic   ← temporary
# inet6 fe80::1a2b:3cff:fe4d:5e6f/64 scope link                           ← link-local address
```

## Choosing the Right IID Type

| Scenario | Recommended IID Type |
|---|---|
| Servers and infrastructure | Static manual IID |
| Workstations (privacy focus) | Stable privacy + temporary |
| IoT devices | EUI-64 or stable privacy |
| Mobile clients | Stable privacy + temporary |
| Routers and switches | Static manual IID |

## Conclusion

IPv6 interface identifiers provide flexibility in how addresses are assigned and managed. EUI-64 offers hardware traceability, stable privacy addresses balance consistency with privacy, and temporary addresses protect user privacy for outbound connections. Choose the appropriate IID generation method based on your security and operational requirements.
