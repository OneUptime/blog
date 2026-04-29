# How to Understand IPv6 Unique Local Addresses (fc00::/7)

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: IPv6, Networking, Addressing, RFC 4193, Subnetting

Description: Understand IPv6 Unique Local Addresses (ULA) in the fc00::/7 range, their structure, use cases, and how they compare to IPv4 private addresses.

## Introduction

IPv6 Unique Local Addresses (ULA) serve a similar purpose to IPv4 private addresses (10.0.0.0/8, 172.16.0.0/12, 192.168.0.0/16) - they are used for local communications within a site or organization and are not routable on the public internet. Defined in RFC 4193, ULAs occupy the `fc00::/7` prefix range.

## ULA Address Structure

The `fc00::/7` block encompasses two halves:

- `fc00::/8` - Reserved but not yet defined
- `fd00::/8` - Currently allocated for use (the practical ULA range)

In practice, all deployed ULAs use the `fd00::/8` range. A ULA address has this structure:

```text
| 7 bits  | 1 bit | 40 bits  | 16 bits  | 64 bits          |
| fc00::/7| L bit | Global ID| Subnet ID| Interface ID     |
```

- **L bit = 1** (locally assigned) gives you `fd00::/8`
- **Global ID**: 40 pseudo-random bits, making collisions with other organizations' prefixes highly unlikely
- **Subnet ID**: 16 bits for subnetting within your organization
- **Interface ID**: Standard 64-bit interface identifier

## Generating a ULA Prefix

RFC 4193 includes a sample algorithm for generating a pseudo-random Global ID from the current time and a system-specific identifier such as an EUI-64. You can generate one using standard tools:

```bash
# Generate a random ULA prefix using Python

python3 -c "
import os
import binascii

# Generate 5 random bytes for the Global ID (40 bits)
global_id = os.urandom(5)
hex_id = binascii.hexlify(global_id).decode()

# Format as a ULA prefix
# fdXX:XXXX:XXXX::/48
b = [hex_id[i:i+2] for i in range(0, 10, 2)]
prefix = f'fd{b[0]}:{b[1]}{b[2]}:{b[3]}{b[4]}::/48'
print(f'Your ULA prefix: {prefix}')
"
```

Example output:
```text
Your ULA prefix: fdb4:a3c1:82ef::/48
```

## Configuring a ULA on Linux

Once you have a ULA prefix, you can assign addresses to interfaces:

```bash
# Assign a ULA address to eth0
# Replace with your generated prefix
sudo ip -6 addr add fdb4:a3c1:82ef:0001::1/64 dev eth0

# Verify the address was added
ip -6 addr show dev eth0

# Add a static route for another ULA subnet if needed
sudo ip -6 route add fdb4:a3c1:82ef:0002::/64 via fdb4:a3c1:82ef:0001::2 dev eth0
```

## ULA vs. GUA (Global Unicast Addresses)

| Property | ULA (fd00::/8) | GUA (2000::/3) |
|---|---|---|
| Routable on internet | No | Yes |
| Globally unique | High probability | Yes |
| Stable without ISP | Yes | Depends on ISP |
| Requires registration | No | Yes (via ISP/RIR allocation) |

## Common Use Cases

ULAs are ideal for:

1. **Internal services** that should never be reachable from the internet (databases, internal APIs)
2. **Lab and test environments** where you need stable addressing
3. **Fallback communication** when a GUA is unavailable
4. **Site-to-site VPNs** with predictable address ranges

## Key Differences from IPv4 Private Addresses

Unlike IPv4 RFC 1918 addresses, ULAs are designed to be globally unique (with high probability due to the random Global ID). This means:

- No address conflicts when merging networks
- No NAT required for communication between ULA networks that can reach each other
- Each organization can self-assign a /48 that is theirs to subnet freely

## Configuring ULA in Router Advertisements

To advertise a ULA prefix via SLAAC (using `radvd`):

```conf
# /etc/radvd.conf - advertise ULA prefix alongside GUA
interface eth0 {
    AdvSendAdvert on;
    prefix fdb4:a3c1:82ef:0001::/64 {
        AdvOnLink on;
        AdvAutonomous on;
        AdvPreferredLifetime 604800;   # 7 days
        AdvValidLifetime 2592000;       # 30 days
    };
};
```

## Conclusion

IPv6 Unique Local Addresses provide stable, private addressing for internal networks without the complexity of NAT. The pseudo-random Global ID makes it highly unlikely that ULA prefixes from different organizations will collide, making ULAs a reliable choice for internal infrastructure, VPNs, and environments where GUA availability cannot be guaranteed.
