# How to Understand SRv6 Security Considerations

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: SRv6, Security, RFC 8754, HMAC, ACL, Networking

Description: Understand SRv6 security threats and mitigations including SRH spoofing, unauthorized SID invocation, HMAC authentication, and perimeter filtering.

## Introduction

SRv6's source routing capability introduces security concerns: a malicious source can craft SRH packets to invoke internal SIDs, potentially bypassing firewall rules or accessing private services. RFC 8754 and operational best practices address these threats.

## Key Security Threats

### 1. Unauthorized SID Invocation

An external host crafts a packet with a crafted SRH pointing to internal End.DX4 or End.DT6 SIDs:

```text
Attack:
  External packet:
    dst=5f00:1:1:0:e000::  (End.DT6 for internal VPN)
    SRH: [5f00:1:2::10]

Impact: Traffic bypasses perimeter security controls
```

### 2. SRH Processing Overhead

A packet with a large SRH (many SIDs) consumes more processing than a plain IPv6 packet.

### 3. Topology Disclosure

SRH segment lists can expose network topology because SID locators can identify SR nodes.

## Mitigation 1: Perimeter Filtering (Most Important)

```bash
# Block SRv6 packets from external sources at the network boundary

# Only allow SRH packets from trusted internal sources

# ip6tables on edge router
# Drop any packet with Routing Header from external sources
# External interface: eth0
ip6tables -A FORWARD \
  -i eth0 \
  -m ipv6header --soft --header route \
  -j DROP

# Or use a more specific match for RH Type 4 (SRH)
ip6tables -A INPUT \
  -m ipv6header --soft --header route \
  -m rt --rt-type 4 \
  -j DROP

# Cisco: ACL to block SRH from external
# ipv6 access-list BLOCK_SRH_EXTERNAL
#   deny ipv6 any any routing-type 4
#   permit ipv6 any any
```

## Mitigation 2: HMAC Authentication (SRH Integrity)

RFC 8754 defines an optional HMAC TLV for the SRH that verifies the SRH was authorized and that the segment list was not modified.

```bash
# Linux: configure HMAC key ID 1.
# This command prompts for the shared HMAC secret.
ip sr hmac set 1 sha256

# Require HMAC on incoming SRv6 packets
sysctl net.ipv6.conf.eth0.seg6_enabled=1
sysctl net.ipv6.conf.eth0.seg6_require_hmac=1

# Packets without valid HMAC are dropped
# Legitimate sources must include the correct HMAC TLV
```

```python
def compute_srh_hmac(
    source_address: str,
    segment_list: list[str],
    key: bytes,
    key_id: int,
    flags: int = 0,
    d_bit: bool = False,
) -> bytes:
    """
    Compute the RFC 8754 SRH HMAC-SHA256 value.
    RFC 8754 §2.1.2.1
    """
    import hmac
    import hashlib
    import socket
    import struct

    if not segment_list:
        raise ValueError("segment_list must contain at least one SID")

    last_entry = len(segment_list) - 1
    hmac_flags_reserved = 0x8000 if d_bit else 0

    message = socket.inet_pton(socket.AF_INET6, source_address)
    message += struct.pack("!BBHI", last_entry, flags, hmac_flags_reserved, key_id)
    for sid in segment_list:
        message += socket.inet_pton(socket.AF_INET6, sid)

    mac = hmac.new(key, message, hashlib.sha256).digest()
    return mac[:32]  # RFC 8754 truncates the HMAC field to at most 32 octets.
```

## Mitigation 3: SID Access Control Lists

Restrict which sources can invoke each SID.

```bash
# Only allow packets from the SRv6 controller to invoke TE SIDs
# On the router owning 5f00:1:1::/48

ip6tables -A INPUT \
  -d 5f00:1:1:0:e001:: \
  ! -s 5f00:100::/32 \
  -j DROP

ip6tables -A INPUT \
  -d 5f00:1:1:0:e001:: \
  -s 5f00:100::/32 \
  -j ACCEPT
```

## Mitigation 4: Infrastructure ACL (iACL)

```text
! Cisco IOS-XR infrastructure ACL
ipv6 access-list INFRA_ACL
  remark Block SRH to internal infrastructure SIDs from external
  deny ipv6 any 5f00::/16 routing
  permit ipv6 any any
!
interface GigabitEthernet0/0/0/0
 description EXTERNAL FACING
 ipv6 access-group INFRA_ACL ingress
```

## Mitigation 5: Topology Hiding

```bash
# Use 5f00::/16 or your own allocated SRv6 space
# (do not use public addresses for internal SIDs)

# Summarize SRv6 locators at the border
# Advertise only an aggregate, not individual /48 locators
ip -6 route add blackhole 5f00:1::/32  # Aggregate black hole at border
# Only /128 routes to actual SIDs installed on the node

# For BGP: apply a route policy to filter SRv6 SIDs from external BGP
# Only accept SID advertisements from trusted internal ASes
```

## Security Checklist

```yaml
srv6_security_checklist:
  perimeter:
    - [ ] Block SRH (RH Type 4) from external sources at all edges
    - [ ] Block SRv6 SID prefixes in ingress ACLs

  authentication:
    - [ ] Enable HMAC on all SRv6-capable interfaces
    - [ ] Rotate HMAC keys regularly

  access_control:
    - [ ] ACLs on End.X and End.DT SIDs restrict to authorized sources
    - [ ] Controller-to-PE authentication (BGP MD5 or TCP-AO)

  monitoring:
    - [ ] Alert on unexpected SRH packets at edge
    - [ ] Log HMAC validation failures
    - [ ] Monitor for SRH processing overhead (high SRH packet rate)
```

## Conclusion

SRv6 security requires treating SIDs as network resources that need access control, just like MPLS labels. Perimeter filtering is the most critical control. HMAC provides cryptographic SRH integrity. Use OneUptime to monitor for anomalous traffic patterns that may indicate SRv6 abuse attempts.
