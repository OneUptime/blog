# How to Understand IPv6 Extension Header-Based Evasion Attacks

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: IPv6, Security, Extension Headers, Evasion, Firewall

Description: Understand how attackers use IPv6 extension headers to evade security devices, and learn defensive measures to detect and block extension header-based attacks.

## Overview

IPv6 extension headers are a fundamental protocol feature that can also be abused to evade firewalls, IDS, and deep packet inspection tools. RFC 7045 and RFC 7112 document these concerns and define expected router and firewall behavior.

## IPv6 Extension Header Chain

IPv6 uses a chain of headers, each pointing to the next via the "Next Header" field:

```text
IPv6 Header → Hop-by-Hop Options → Destination Options → Routing Header
           → Fragment Header → Authentication Header → ESP
           → Destination Options → Upper-Layer Header
```

Each header has a fixed or variable length, making offset computation complex for security devices.

## How Extension Headers Enable Evasion

### 1. Non-Initial Fragment Attack

If a firewall only inspects the first fragment, and that fragment does not contain the complete IPv6 header chain, it may never see the transport-layer header. Attackers can abuse a very large Routing Header or Destination Options header to push the TCP/UDP header beyond what the firewall inspects.

### 2. Hop-by-Hop Options Header DoS

On devices that inspect Hop-by-Hop Options, packets are often punted to a slow path or special processing:

```text
An attacker sends packets with crafted Hop-by-Hop Options headers
→ Routers/firewalls slow-path or inspect them → CPU exhaustion
```

```bash
# Detect and filter Hop-by-Hop headers

ip6tables -A INPUT -m ipv6header --soft --header hop-by-hop -j DROP
# This drops packets that contain a Hop-by-Hop header; use only if your policy permits it
```

### 3. Routing Header Type 0 (RH0) - Deprecated

Type 0 Routing Headers allowed attackers to amplify traffic (packet magnification):

```bash
# Block deprecated Type 0 Routing Headers
ip6tables -A INPUT  -m rt --rt-type 0 -j DROP
ip6tables -A FORWARD -m rt --rt-type 0 -j DROP
```

RH0 is deprecated by RFC 5095 and should be blocked by policy without blocking other Routing Header types.

### 4. Unexpected Extension Header Evasion

Some security devices skip extension headers they do not recognize, or fail to walk the full Next Header chain, allowing the payload to bypass inspection:

```bash
# nftables: Drop packets with extension headers your policy does not permit
nft add rule ip6 filter input exthdr hbh exists drop
nft add rule ip6 filter input exthdr rt exists drop
```

## RFC 7045 and RFC 7112 Guidance

**RFC 7045** defines expected behavior when processing extension headers:
- Forwarding nodes that inspect packets must recognize and handle all standard IPv6 extension header types; dropping a standard header must be the result of an explicit, configurable policy
- Forwarding nodes must be configurable to allow packets with unrecognized extension headers, though the default policy may drop unrecognized or experimental headers

**RFC 7112** requires that the first fragment of an IPv6 packet must contain the complete IPv6 header chain up to and including the first upper-layer header. This prevents the split-header fragmentation attack.

## Firewall Rules to Mitigate Extension Header Attacks

```bash
# ip6tables: Block known abused extension headers

# Block Routing Header Type 0 (deprecated, enables amplification)
ip6tables -A FORWARD -m rt --rt-type 0 -j DROP

# Block Hop-by-Hop headers on transit traffic when your policy does not permit them
ip6tables -A FORWARD -m ipv6header --soft --header hop-by-hop -j DROP

# Block IPv6 atomic fragments (Fragment Offset = 0, M flag = 0)
ip6tables -A INPUT -m frag --fragfirst --fraglast -j DROP

# RFC 7112 compliance must be enforced by the IPv6 stack or device:
# the first fragment should contain the complete IPv6 header chain
```

## Intrusion Detection for Extension Headers

```bash
# Use Snort/Suricata rules to detect suspicious extension header usage
# Suricata rule: alert when the IPv6 Next Header value is Routing Header (43)
alert ip any any -> any any (
    msg:"IPv6 packet with Routing Header as Next Header";
    ipv6.hdr; content:"|2b|"; offset:6; depth:1;
    sid:9000001;
    rev:1;
)
```

## Summary

IPv6 extension headers can be abused to evade security devices by: splitting transport headers across fragments, exhausting router CPU with Hop-by-Hop headers, or using deprecated Routing Header Type 0 for amplification. Mitigate by blocking RH0, filtering Hop-by-Hop on transit, enforcing RFC 7112 fragment rules, and ensuring your security devices process the full extension header chain before inspecting payloads.
