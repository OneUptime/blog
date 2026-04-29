# How to Understand RFC 7045 Extension Header Transmission Rules

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: IPv6, RFC 7045, Extension Headers, Standard, Middleboxes

Description: Understand the requirements defined in RFC 7045 for how routers and middleboxes must handle IPv6 extension headers they do not recognize.

## Introduction

RFC 7045 (November 2013) titled "Transmission and Processing of IPv6 Extension Headers" addresses the widespread problem of middleboxes dropping packets with IPv6 extension headers. It clarifies the rules for forwarding nodes (transit routers, firewalls) and updates how extension header types are registered by IANA.

## Core RFC 7045 Requirements

### For Forwarding Nodes (Routers, Firewalls)

RFC 7045 Section 2.1 states:

```text
Any forwarding node along an IPv6 packet's path ... SHOULD do so
regardless of any extension headers that are present.

If a forwarding node is designed to examine extension headers ...
it MUST recognise and deal appropriately with all standard IPv6
extension header types ...

If a forwarding node discards a packet containing a standard IPv6
extension header, it MUST be the result of a configurable policy ...

Forwarding nodes MUST be configurable to allow packets containing
unrecognised extension headers, but the default configuration MAY
drop such packets.
```

Key requirements:
1. **SHOULD forward** packets regardless of extension headers when simply forwarding
2. **MUST recognize** all standard extension header types if the node inspects them
3. **Configurable policy required** for discarding packets with standard extension headers
4. **Default configuration SHOULD allow** all standard extension headers
5. **Unrecognized extension headers MUST be configurable to allow**, but the default MAY drop them

### For IPv6 Nodes (Endpoints)

```text
RFC 8200 says destination nodes must:
  - Accept and attempt to process extension headers in any order
  - Process extension headers strictly in the order they appear
  - Treat an unrecognized Next Header value as an error

  If the node must continue to the next header but the Next Header
  value is unrecognized:
  → Discard the packet
  → Send ICMPv6 Parameter Problem, Code 1
  → Include the offset of the unrecognized value
```

## The IANA Extension Header Registry

RFC 7045 introduced the concept of an IANA registry for extension headers:

```text
IANA registry: "IPv6 Extension Header Types"
https://www.iana.org/assignments/ipv6-parameters/

Currently registered extension headers:
  0   = Hop-by-Hop Options (RFC 8200)
  43  = Routing (RFC 8200)
  44  = Fragment (RFC 8200)
  50  = Encapsulating Security Payload (RFC 4303)
  51  = Authentication Header (RFC 4302)
  60  = Destination Options (RFC 8200)
  135 = Mobility Header (RFC 6275)
  139 = Host Identity Protocol (RFC 7401)
  140 = Shim6 Protocol (RFC 5533)
  253 = Use for experimentation and testing (RFC 3692)
  254 = Use for experimentation and testing (RFC 3692)

Note: 59 ("No Next Header") is intentionally excluded from this
registry because RFC 7045 says it is not an extension header as such.
```

## RFC 7045 Policy Framework

The RFC requires configurable handling rules rather than a blanket
"block unknown headers" stance:

```text
1. Standard extension headers:
   - Discard policy MUST be individually configurable
   - Default configuration SHOULD allow all standard extension headers

2. Experimental extension headers:
   - SHOULD be treated the same way, with individually configurable policy
   - Default configuration MAY drop experimental extension headers

3. Unrecognized extension headers:
   - Forwarding nodes MUST be configurable to allow them
   - Default configuration MAY drop them

4. Routing header nuance:
   - RH0 and RH1 are deprecated
   - Undeprecated Routing Header types SHOULD still be forwarded by default
```

## Implementing RFC 7045 Compliance

```bash
#!/bin/bash
# RFC 7045-aligned extension header handling

# 1. Standard extension headers: ALLOW by default

STANDARD_HEADERS="0 43 44 50 51 60 135 139 140"
echo "Default policy: allow standard extension headers: $STANDARD_HEADERS"

# 2. Experimental extension headers: make the policy explicit
EXPERIMENTAL_HEADERS="253 254"
echo "Experimental extension headers need explicit policy: $EXPERIMENTAL_HEADERS"

# 3. Deprecated RH0: example explicit block policy
sudo ip6tables -A FORWARD -m rt --rt-type 0 \
    -j LOG --log-prefix "RFC7045-RH0-DROP: "
sudo ip6tables -A FORWARD -m rt --rt-type 0 \
    -j REJECT --reject-with icmp6-adm-prohibited
# ^ Explicit policy-based drop for Routing Header Type 0

# 4. Leave other extension headers on the normal forwarding path
# RFC 7045 says standard extension headers should be allowed by default,
# and unrecognized extension headers must be configurable to allow.

echo "RFC 7045-aligned configuration applied"
```

## Testing Your Compliance with RFC 7045

```bash
# Test 1: Does your network forward source-generated Fragment Headers?
# Use a payload larger than the egress MTU so the source fragments locally
ping -6 -s 2000 -M want <target>

# Test 2: When RH0 is blocked by explicit policy, do you return the
# configured ICMPv6 reject?
# Send a packet with RH0 using a packet-crafting tool
# You should receive the ICMPv6 reject configured by your firewall rule

# Test 3: Are your per-header drop policies explicit and individually configurable?
# Review your firewall rules - can you justify each extension header drop?

# Self-assessment checklist:
echo "RFC 7045 Self-Assessment:"
echo "[ ] We allow Fragment Headers (NH=44)"
echo "[ ] We allow IPsec ESP (NH=50) and AH (NH=51)"
echo "[ ] We do not drop Hop-by-Hop Options solely because they are present"
echo "[ ] If we block RH0, it is by explicit policy"
echo "[ ] We have individually configurable policies for any other drops"
echo "[ ] We log policy-based extension header drops"
echo "[ ] Our platform can be configured to allow unrecognized extension headers"
```

## Conclusion

RFC 7045 provides the standards basis for arguing that middleboxes should not discard standard IPv6 extension headers merely because they are extension headers or because an implementation fails to recognize them. The core principle is simple: forwarding nodes need explicit, configurable per-header policy. The default should allow standard extension headers, experimental headers should also have individually configurable handling, and implementations must be configurable to allow unrecognized headers. If your operational requirements mandate dropping certain extension headers, make that a conscious policy choice rather than an incidental parsing failure. This reduces mysterious connectivity failures and makes extension-header handling predictable.
