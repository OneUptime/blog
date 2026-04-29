# How to Implement MAP-T for Stateless IPv4 to IPv6 Translation

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: MAP-T, IPv6, IPv4, Stateless, Translation, ISP, Transition

Description: Configure MAP-T (Mapping of Address and Port with Translation) for stateless IPv4-to-IPv6 translation in ISP networks, enabling IPv4 connectivity over IPv6-only infrastructure without state...

## Introduction

MAP-T (RFC 7599) is a stateless IPv4-to-IPv6 translation mechanism for ISP deployments. Unlike DS-Lite (which uses tunneling), MAP-T translates IPv4 packets directly into IPv6. This eliminates per-connection state on the Border Relay (BR), enabling massive scalability. Each CE (Customer Edge) gets a deterministic IPv4 address and port range derived from its MAP provisioning and, in embedded-address mode, its IPv6 prefix.

## How MAP-T Works

```text
IPv4 Client → CE (CPE) →[IPv4→IPv6 translation]→ IPv6 Network →[IPv6→IPv4]→ BR → IPv4 Internet
             [stateless]                                         [stateless]
```

Key elements:
- **CE (Customer Edge)**: CPE whose MAP-T translation function is stateless; in shared-address deployments it typically also runs NAPT44 on the LAN side.
- **BR (Border Relay)**: ISP device that translates between IPv6 MAP-T domain and IPv4 internet. Stateless.
- **MAP domain**: Defines the IPv4 prefix, IPv6 prefix, DMR, and port-mapping parameters

## MAP-T Rule Example

```text
# MAP domain parameters:

# IPv6 prefix: 2001:db8::/40 (End-user prefix length: 56)
# IPv4 prefix: 192.0.2.0/24
# EA bits: 16 (Embedded Address bits)
# PSID offset: 6 (default)
# PSID length: 8 (256 port sets)

# A CE with IPv6 prefix 2001:db8:0012:3400::/56 maps to:
# IPv4: 192.0.2.18
# PSID: 0x34
# Available ports: 1232-1235, 2256-2259, ..., 63696-63699, 64720-64723
```

## CE Configuration on Linux

```bash
# Linux does not configure MAP-T with ip6tnl; ip6tnl creates an IPv4/IPv6-over-IPv6 tunnel.
# Use a MAP-T translator implementation such as Jool.

sudo sysctl -w net.ipv4.conf.all.forwarding=1
sudo sysctl -w net.ipv6.conf.all.forwarding=1

sudo modprobe jool_mapt
sudo jool_mapt instance add --netfilter --dmr 64:ff9b:1::/96
sudo jool_mapt global update end-user-ipv6-prefix 2001:db8:0012:3400::/56
sudo jool_mapt global update bmr 2001:db8::/40 192.0.2.0/24 16 6
sudo jool_mapt global update map-t-type CE

# In shared-address deployments, the CE also needs NAPT44 on the LAN side,
# constrained to the source IPv4 address and PSID-derived port set assigned by MAP.
# Ordinary IPv6 routing toward the BR is still required on the WAN side.
```

## BR Configuration on Linux

```bash
sudo sysctl -w net.ipv4.ip_forward=1
sudo sysctl -w net.ipv6.conf.all.forwarding=1

sudo modprobe jool_mapt
sudo jool_mapt instance add --netfilter --dmr 64:ff9b:1::/96
sudo jool_mapt fmrt add 2001:db8::/40 192.0.2.0/24 16 6
sudo jool_mapt global update map-t-type BR

# The BR still needs regular IPv6 routing toward the MAP domain and native IPv4 routing
# toward the public IPv4 internet.
```

## Port Sharing (PSID)

MAP-T uses Port Set IDs to share IPv4 addresses:

```python
# Port sharing algorithm using the RFC example
# Given: PSID offset=6, PSID length=8, PSID=0x34

psid = 0x34
psid_offset = 6
psid_length = 8
ports_per_psid = 2 ** (16 - psid_offset - psid_length)  # = 4 ports per block

# Excluded ports: 0-1023 (well-known ports)
for port_start in range(2 ** (16 - psid_offset), 65536, 2 ** (16 - psid_offset)):
    port_range = range(port_start + psid * ports_per_psid,
                       port_start + (psid + 1) * ports_per_psid)
    print(f"Port block: {port_range.start}-{port_range.stop - 1}")
```

## Verifying MAP-T

```bash
# On CE or BR:
# Confirm the MAP-T module is loaded
lsmod | grep jool_mapt

# Test IPv4 connectivity from a host behind the CE
ping 8.8.8.8

# Verify source port is within allowed PSID range
# Inspect packets on the WAN side or BR and confirm the source port is in the CE's PSID set
curl -4 http://example.com

# Packet capture to verify translation
sudo tcpdump -ni any 'ip or ip6'
```

## Comparison: MAP-T vs DS-Lite vs MAP-E

| Feature | MAP-T | DS-Lite | MAP-E |
|---|---|---|---|
| Mechanism | Stateless translation | IPv4-in-IPv6 tunneling + AFTR NAT44 | Stateless encapsulation |
| BR state | None | Per-connection | None |
| Customer NAT | CE typically does stateful NAPT44 | AFTR does NAT44 | CE typically does stateful NAPT44 |
| Protocol overhead | No encapsulation, but translation typically adds 20 bytes | IPv6 header (40 bytes) | IPv6 header (40 bytes) |
| IPv4 fragmentation | Supported, with RFC 6145 handling | Supported | More operationally complex |

## DHCPv6 MAP-T Rule Distribution

```text
# MAP-T rules are distributed in DHCPv6 OPTION_S46_CONT_MAPT (95).
# That container carries:
# - one or more OPTION_S46_RULE values (89)
# - exactly one OPTION_S46_DMR value (91)
# Optional port parameters are carried with OPTION_S46_PORTPARAMS (93).
# Server syntax is implementation-specific, but RFC 7598 requires these
# options to be encapsulated in the MAP-T container rather than sent bare.
```

## Conclusion

MAP-T provides stateless IPv4-to-IPv6 translation for ISP networks. Unlike DS-Lite, there is no per-connection state on the Border Relay - each CE has a deterministic IPv4 address and port range derived from its MAP rules and delegated IPv6 prefix, or provisioned separately when no address bits are embedded. This enables horizontal scaling of the BR without state synchronization. The CE translates IPv4 packets from LAN clients directly to IPv6 using the MAP-T algorithm, and in shared-address deployments typically performs NAPT44 before translation. ISPs commonly distribute MAP-T rules to CEs via DHCPv6 OPTION_S46_CONT_MAPT (95), which encapsulates OPTION_S46_RULE (89) and OPTION_S46_DMR (91). MAP-T is particularly suited to large-scale deployments where DS-Lite's stateful NAT becomes a bottleneck.
