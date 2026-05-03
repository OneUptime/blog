# How to Deploy MAP-T at ISP Scale

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: IPv6, MAP-T, ISP, IPv4 Transition, Stateless NAT, Translation

Description: Deploy MAP-T (Mapping of Address and Port - Translation) at ISP scale for stateless IPv4/IPv6 translation without per-session state.

## What is MAP-T?

MAP-T (RFC 7599) is a stateless IPv4/IPv6 translation mechanism. Unlike DS-Lite or NAT64, MAP-T uses algorithmic address mapping - no per-session state is needed on the ISP side, making it highly scalable.

MAP-T uses a mathematical formula to map an IPv6 subscriber prefix to a shared IPv4 address and port range. Every customer router (CE) derives its IPv4 address and allowed port range from its IPv6 prefix.

## MAP-T Parameters

- **Basic Mapping Rule (BMR)**: Defines how an IPv6 prefix maps to IPv4
- **End-User IPv6 Prefix (EUI6P)**: The /56 or /64 delegated to the customer
- **IPv4 Prefix**: The shared public IPv4 block
- **PSID (Port Set ID)**: Identifies which port range the subscriber uses

## MAP-T Rule Configuration Example

```text
MAP-T Domain Parameters:
  IPv4 Prefix: 203.0.113.0/24  (256 IPv4 addresses)
  IPv6 Prefix: 2001:db8:map::/48
  PSID length: 8 bits (256 subscribers share each IPv4 address)
  Offset: 6 bits

Subscriber 1:
  IPv6 Prefix: 2001:db8:map:0001::/56
  IPv4 address: 203.0.113.1
  PSID: 0 (one of 256 PSIDs sharing 203.0.113.1)
  Port ranges: 63 disjoint 4-port ranges (e.g., 1024-1027, 2048-2051, 3072-3075, ...)
  (A=0 excluded so well-known ports 0-1023 are never allocated)
```

## Deploying MAP-T Border Relay (BR)

The BR handles translation between the MAP-T IPv6 domain and the IPv4 internet. Jool (RFC 7915 SIIT + RFC 6146 NAT64) does not implement MAP-T (RFC 7599) and has no PSID-based port-sharing logic, so production BRs use VPP's MAP-T plugin or vendor hardware (Cisco, Juniper). VPP example:

```bash
# Install VPP and load the map plugin
apt install vpp vpp-plugin-core

# In vppctl: configure the MAP-T domain matching the parameters above
vppctl <<'EOF'
map add domain ip4-pfx 203.0.113.0/24 ip6-pfx 2001:db8:map::/48 \
    ip6-src 2001:db8:br::1/128 ea-bits-len 16 psid-offset 6 psid-len 8 mapt
EOF
```

## CE (Customer Edge) Configuration on Linux

The CE translates private IPv4 to public IPv4+port via IPv6. MAP-T is stateless translation (not encapsulation), so iproute2's `ip tunnel` modes do not configure it; mainline Linux has no native MAP-T mode. Production CEs typically run OpenWRT (or vendor firmware) with the `map` package:

```text
opkg install map

# /etc/config/map
config rule
    option type 'map-t'
    option peeraddr '2001:db8:br::1'
    option ipaddr '203.0.113.0'
    option ip4prefixlen '24'
    option ip6prefix '2001:db8:map::'
    option ip6prefixlen '48'
    option ealen '16'
    option offset '6'
```

## PSID Port Assignment Verification

Verify that a subscriber's port range is correctly computed:

```python
# Calculate MAP-T port ranges from PSID (RFC 7597 section 5.1)
# Port = [A bits | PSID bits | M bits], where a + psid_len + m = 16
def calculate_map_t_ports(psid: int, psid_len: int, offset: int = 6) -> list:
    """
    Calculate allowed port ranges for a given PSID.
    offset: number of high-order A bits (typically 6, so A=0 covers ports
    0-1023 and is excluded to keep well-known ports off the subscriber).
    """
    ports = []
    m_bits = 16 - offset - psid_len  # bits per contiguous port range
    for a in range(1, 2**offset):  # A=0 excluded (well-known ports)
        port_start = (a << (psid_len + m_bits)) | (psid << m_bits)
        ports.append((port_start, port_start + (2**m_bits) - 1))
    return ports

# Subscriber with PSID=5, psid_len=8 (so a=6, m=2 -> 4-port ranges)
ranges = calculate_map_t_ports(psid=5, psid_len=8)
for start, end in ranges[:5]:
    print(f"Port range: {start}-{end}")
```

## Advantages of MAP-T vs DS-Lite

| Feature | MAP-T | DS-Lite |
|---------|-------|---------|
| State on ISP | None (stateless) | Per-session NAPT state |
| Scale | Very high | Limited by AFTR capacity |
| Troubleshooting | Complex (algorithmic) | Easier (explicit mapping) |
| CPE support | Growing | Widely supported |

## Conclusion

MAP-T provides stateless IPv4/IPv6 translation for ISPs, eliminating the need for per-session NAT state at scale. The algorithmic mapping between IPv6 prefixes and IPv4 addresses makes the BR (Border Relay) simple and highly scalable. MAP-T is particularly suited for large ISPs managing millions of subscribers and concurrent sessions.
