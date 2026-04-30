# How to Understand the Recommended Order of IPv6 Extension Headers

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: IPv6, Extension Headers, RFC 8200, Networking, Protocol

Description: Learn the RFC 8200 recommended ordering of IPv6 extension headers and why this order matters for correct packet processing by routers and endpoints.

## Introduction

When multiple IPv6 extension headers are present in a packet, RFC 8200 defines a recommended order for them. The strict rule in the base specification is that the Hop-by-Hop Options header, if present, must immediately follow the IPv6 header. For the other extension headers, RFC 8200 strongly recommends the order below, while receivers are still required to accept and attempt to process them even if they arrive in a different order.

## Recommended Extension Header Order (RFC 8200)

```text
1. IPv6 base header                (always first, 40 bytes)
2. Hop-by-Hop Options              (Next Header = 0)   ← MUST be first if present
3. Destination Options             (Next Header = 60)   ← Before Routing Header
4. Routing Header                  (Next Header = 43)
5. Fragment Header                 (Next Header = 44)
6. Authentication Header (AH)      (Next Header = 51)
7. Encapsulating Security Payload (ESP) (Next Header = 50)
8. Destination Options             (Next Header = 60)   ← Before upper-layer header
9. Upper-layer header              (TCP=6, UDP=17, ICMPv6=58)
```

Note: Destination Options can appear twice - once before the Routing Header (for options processed by the destination in the IPv6 Destination Address field and by later destinations listed in the Routing Header) and once before the upper-layer header (processed only at the final destination).

## Why Order Matters

```text
1. Hop-by-Hop MUST be first:
   RFC 8200 requires the Hop-by-Hop Options header, if present,
   to appear immediately after the IPv6 header.
   A Next Header value of 0 anywhere else is an error.

2. Routing Header before Fragment:
   RFC 8200 defines the per-fragment headers as the IPv6 header
   plus any headers processed en route, up to and including the
   Routing Header if present.
   Putting Routing before Fragment ensures every fragment carries
   the routing information needed before reassembly.

3. AH before ESP:
   RFC 8200 places AH before ESP, and RFC 4302/RFC 4303 describe
   the combined AH+ESP header chain in that order.
   When both are used together, AH can authenticate the ESP header
   and the ESP-protected payload.

4. Fragment Header before AH and ESP:
   In IPv6, the Fragment Header separates the headers that must be
   examined en route from the fragmentable part of the packet.
   AH and ESP are end-to-end IPsec headers/payload and therefore
   appear after the Fragment Header in the recommended order.
```

## Visual Example

```text
Correct header chain for a fragmented, routing-specified, secured packet:

| IPv6 Base | HbH Options | Routing Header | Fragment Header | AH | ESP | TCP |
|  40 bytes |    varies   |    varies      |    8 bytes      |    |     |     |

Each arrow shows the Next Header chain:
Base → 0 (HbH) → 43 (Routing) → 44 (Fragment) → 51 (AH) → 50 (ESP) → 6 (TCP)

In transport mode, the TCP header and data are carried inside the ESP-protected payload.
```

## Python: Validate RFC 8200 Recommended Order

```python
RFC8200_FIXED_ORDER = {
    0: 0,    # Hop-by-Hop Options
    43: 2,   # Routing
    44: 3,   # Fragment
    51: 4,   # Authentication Header
    50: 5,   # Encapsulating Security Payload
}

HEADER_NAMES = {
    0: "Hop-by-Hop Options",
    43: "Routing",
    44: "Fragment",
    50: "ESP",
    51: "Authentication",
}

TERMINAL_HEADERS = {4, 6, 17, 41, 58, 59}

def validate_ext_header_order(next_headers: list[int]) -> tuple[bool, str]:
    """
    Validate whether a header chain follows RFC 8200 Section 4.1's
    recommended extension-header order.

    Args:
        next_headers: Ordered Next Header values beginning with the
                      value in the IPv6 base header.

    Returns:
        (follows_recommendation, reason)
    """
    if not next_headers or next_headers[0] in TERMINAL_HEADERS:
        return True, "No extension headers"

    # Hop-by-Hop, if present, must immediately follow the IPv6 header.
    if 0 in next_headers[1:]:
        return False, "Hop-by-Hop Options (0) must immediately follow the IPv6 header"

    if next_headers.count(0) > 1:
        return False, "RFC 8200 recommends at most one Hop-by-Hop Options header"

    # RFC 8200 recommends at most one of each header, except Destination
    # Options, which can appear twice in two distinct positions.
    for nh in (43, 44, 51, 50):
        if next_headers.count(nh) > 1:
            return False, f"RFC 8200 recommends at most one {HEADER_NAMES[nh]} header"

    if next_headers.count(60) > 2:
        return False, "RFC 8200 recommends at most two Destination Options headers"

    last_slot = -1
    destination_options_seen = 0

    for nh in next_headers:
        if nh in TERMINAL_HEADERS:
            break

        if nh == 60:
            destination_options_seen += 1
            # The first Destination Options header is the pre-routing position.
            # A second one, or one seen after Routing/Fragment/AH/ESP, is the
            # final-destination position.
            slot = 1 if destination_options_seen == 1 and last_slot < 2 else 6
        elif nh in RFC8200_FIXED_ORDER:
            slot = RFC8200_FIXED_ORDER[nh]
        else:
            return False, (
                f"This helper only validates the RFC 8200 headers used in "
                f"this post (got Next Header value {nh})"
            )

        if slot < last_slot:
            return False, (
                f"Next Header value {nh} appears out of order for the "
                "RFC 8200 recommendation"
            )

        last_slot = slot

    return True, "Extension header order follows RFC 8200's recommendation"

# Test cases
test_cases = [
    ([0, 43, 44, 6], "HbH + Routing + Fragment + TCP"),
    ([60, 43, 60, 6], "Destination Options before and after Routing (OK)"),
    ([43, 44, 51, 50, 60, 6], "Final Destination Options after ESP (OK)"),
    ([43, 0, 6], "Routing before HbH (WRONG)"),
    ([0, 44, 43, 6], "Fragment before Routing (WRONG)"),
    ([44, 6], "Fragment + TCP (OK)"),
    ([6], "TCP only (OK)"),
]

for headers, desc in test_cases:
    valid, reason = validate_ext_header_order(headers)
    status = "VALID" if valid else "INVALID"
    print(f"{status}: {desc} - {reason}")
```

## Destination Options: Two Positions

The Destination Options header (Next Header = 60) has special semantics based on its position:

```text
Position 1: Before the Routing Header
  → Processed by the destination in the IPv6 Destination Address field
  → Also processed by later destinations listed in the Routing Header

Position 2: Just before the upper-layer header
  → Processed ONLY by the final destination
  → In the RFC 8200 recommended order, this is the final extension header

Both positions use the same header format; the semantic difference
is determined by where in the chain the header appears.
```

## Conclusion

RFC 8200 defines a recommended order for the extension headers it lists. The one strict ordering rule in the base specification is that Hop-by-Hop Options must appear immediately after the IPv6 header if present. For the other headers, sources are strongly advised to use the recommended order: Destination Options (for the destination in the IPv6 header and any later routing destinations), Routing, Fragment, AH, ESP, final Destination Options, and then the upper-layer header.
