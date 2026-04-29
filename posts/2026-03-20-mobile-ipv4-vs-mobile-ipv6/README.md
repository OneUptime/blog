# How to Understand the Differences Between Mobile IPv4 and Mobile IPv6

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: IPv6, Mobile IPv6, Mobile IPv4, RFC 5944, RFC 6275, Comparison

Description: Compare Mobile IPv4 (RFC 5944) and Mobile IPv6 (RFC 6275), their architectural differences, triangle routing, route optimization, and security models.

## Introduction

Mobile IPv4 (MIPv4, RFC 5944) and Mobile IPv6 (MIPv6, RFC 6275) both allow nodes to maintain a stable IP address while moving between networks. However, they differ significantly in efficiency, security, and integration with the underlying IP protocol.

## Architecture Comparison

| Feature | Mobile IPv4 | Mobile IPv6 |
|---|---|---|
| Defining RFC | RFC 5944 | RFC 6275 |
| Foreign Agent | Required for many deployments | Not required (CoA assigned directly) |
| Triangle Routing | Always present | Present, but route optimization available |
| Route Optimization | Not standardized (expired drafts) | Built-in via Return Routability (RFC 4651 surveys enhancements) |
| IPsec requirement | Optional | Mandatory for BU to HA (RFC 3776) |
| NAT traversal | Requires UDP encapsulation | Less common due to IPv6 deployment |
| Header overhead | IP-in-IP tunnel | Type 2 Routing Header (RO mode) |

## Triangle Routing Problem

```javascript
Mobile IPv4 (triangular by default):
  CN ------> HA ------> MN  (downstream tunneled via HA)
  MN ------------------> CN (upstream direct, unless reverse-tunneled)
  (asymmetric paths form the "triangle")

Mobile IPv6 with Route Optimization:
  MN <===================> CN  (direct path after RO)
  (Routing Header Type 2 carries Home Address)
```

## Mobile IPv4 Collocated CoA vs Foreign Agent CoA

```text
MIPv4 Foreign Agent mode:
  MN uses FA's address as CoA
  Packets: src=CN → dst=HA → tunnel → dst=FA → decap → MN

MIPv4 Collocated CoA mode:
  MN obtains its own CoA via DHCP
  Packets: src=CN → dst=HA → tunnel → dst=CoA(MN) → decap → MN
```

## Mobile IPv6 Care-of Address Assignment

```bash
# MIPv6: MN obtains CoA via SLAAC on foreign link

# No Foreign Agent needed

# When MN attaches to foreign link fd00:foreign::/64:
# 1. SLAAC generates CoA: fd00:foreign::MN-EUI64
# 2. MN sends Binding Update to HA with CoA
# 3. MN sends BU to CNs (with RO) after Return Routability

# Verify CoA and Home Address on a Linux MIPv6 node
ip -6 addr show
# inet6 2001:db8:home::1/64 scope global  ← Home Address (maintained)
# inet6 fd00:foreign::1/64 scope global   ← Care-of Address (current)
```

## Return Routability (MIPv6 Route Optimization)

```python
# Simplified RO handshake
steps = [
    "MN sends HoTI to CN via HA tunnel (tests Home Address reachability)",
    "MN sends CoTI to CN directly (tests CoA reachability)",
    "CN responds with HoT (Home Keygen Token)",
    "CN responds with CoT (Care-of Keygen Token)",
    "MN computes Kbm = SHA1(HoT_token | CoT_token)",
    "MN sends BU to CN, signed with Kbm",
    "CN validates BU and creates Binding Cache Entry",
    "Direct communication: CN uses Type 2 RH with MN's Home Address",
]

for i, step in enumerate(steps, 1):
    print(f"{i}. {step}")
```

## Security Differences

```text
Mobile IPv4:
  - Registration Request authenticated via Mobile-Home Authentication Extension (HMAC-MD5 by default)
  - MN-FA and FA-HA authentication via additional mobility extensions
  - Replay protection via Identification field (timestamp or nonce)
  - IPsec optional (RFC 4877)

Mobile IPv6:
  - BU to HA: MUST use IPsec ESP (RFC 3776)
  - BU to CN: Return Routability (cryptographic proof of reachability)
  - Replay protection via sequence numbers in BU
```

## Conclusion

Mobile IPv6 eliminates the Foreign Agent requirement, provides built-in route optimization, and mandates IPsec for HA communication. These improvements make MIPv6 more efficient and secure than MIPv4, though MIPv4 remains in use in 3G/4G evolved packet core deployments. Monitor binding updates and tunnel traffic with OneUptime to ensure mobile node sessions remain healthy.
