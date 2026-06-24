# How to Understand ICMPv6 Error vs Informational Messages

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: ICMPv6, Error Messages, Informational Messages, IPv6, RFC 4443

Description: Understand the distinction between ICMPv6 error messages (Types 1-127) and informational messages (Types 128-255), their different rules and behaviors, and why this classification matters for...

## Introduction

RFC 4443 divides ICMPv6 messages into two classes: error messages (Type values 0-127) and informational messages (Type values 128-255). This classification is not just organizational - it carries specific behavioral rules. Error messages must include a copy of the offending packet, are subject to rate limiting, must not be generated in response to other ICMPv6 error messages, and require different firewall treatment than informational messages.

## Error Messages (Types 0-127)

```text
ICMPv6 Error Message rules (RFC 4443):

1. Generated in response to a problem processing an IPv6 packet
2. MUST include as much of the offending packet as possible
   (without making the resulting packet exceed the IPv6 minimum MTU of 1280 bytes)
3. MUST NOT be sent in response to:
   - An ICMPv6 error message or Redirect message (prevents loops)
   - A packet sent to an IPv6 multicast address (except for Packet Too Big
     and Parameter Problem with code 2 for certain unrecognized options)
   - A packet sent as link-layer multicast or broadcast
     (the same exceptions apply)
   - A packet whose source does not uniquely identify a single node
     (e.g., the unspecified address ::)
4. MUST be rate-limited to prevent flooding
5. Type range: 0-127

Current error messages:
  Type 1: Destination Unreachable (Codes 0-9)
  Type 2: Packet Too Big (Code 0)
  Type 3: Time Exceeded (Codes 0-1)
  Type 4: Parameter Problem (Codes 0-10)
```

## Informational Messages (Types 128-255)

```text
ICMPv6 Informational Message characteristics:

1. Not generated in response to errors
2. Do not include a copy of an offending packet
3. Subject to their own specific rules
4. Type range: 128-255

Common informational messages:
  Type 128: Echo Request
  Type 129: Echo Reply
  Type 130: Multicast Listener Query (MLD)
  Type 131: Multicast Listener Report (MLD)
  Type 132: Multicast Listener Done (MLD)
  Type 133: Router Solicitation (NDP)
  Type 134: Router Advertisement (NDP)
  Type 135: Neighbor Solicitation (NDP)
  Type 136: Neighbor Advertisement (NDP)
  Type 137: Redirect
  Type 143: MLDv2 Multicast Listener Report
```

## Why the Distinction Matters for Firewalls

```text
Firewall implications of error vs informational classification:

Error messages:
  MUST allow: Destination Unreachable (Type 1) - all codes
  MUST allow: Packet Too Big (Type 2) - essential for PMTUD
  MUST allow: Time Exceeded (Type 3, Code 0) - hop limit exceeded in transit
  MUST allow: Parameter Problem (Type 4, Codes 1-2)
  SHOULD allow: Time Exceeded (Type 3, Code 1) and Parameter Problem (Type 4, Code 0)
  Blocking Type 2 breaks classical IPv6 PMTUD and can black-hole TCP connections

Informational messages:
  RS/RA/NS/NA (133-136) are local-link messages and should not be treated as transit traffic
  Redirect (137) is local-link only and should be policy-controlled
  MLD types (130-132, 143) are local-link messages required for multicast listener signaling
  Echo (128-129) are commonly allowed; blocking them can break diagnostics and some connectivity checks
```

## Classification Check in Code

```python
def classify_icmpv6(icmp_type: int) -> dict:
    """
    Classify an ICMPv6 message type and provide high-level handling notes.
    """
    if not 0 <= icmp_type <= 255:
        raise ValueError("ICMPv6 type must be in range 0..255")

    error_messages = {
        1:  ("Destination Unreachable", "allow - all codes"),
        2:  ("Packet Too Big",          "MUST allow - breaks PMTUD if blocked"),
        3:  ("Time Exceeded",           "code-specific handling"),
        4:  ("Parameter Problem",       "code-specific handling"),
    }

    informational_messages = {
        128: ("Echo Request",            "policy-dependent; commonly allowed"),
        129: ("Echo Reply",              "policy-dependent; commonly allowed"),
        130: ("MLD Query",               "local-link only"),
        131: ("MLD Report",              "local-link only"),
        132: ("MLD Done",                "local-link only"),
        133: ("Router Solicitation",     "local-link only; never transit"),
        134: ("Router Advertisement",    "local-link only; never transit"),
        135: ("Neighbor Solicitation",   "local-link only; never transit"),
        136: ("Neighbor Advertisement",  "local-link only; never transit"),
        137: ("Redirect Message",        "policy-controlled; local-link only"),
        143: ("MLDv2 Report",            "local-link only"),
    }

    if icmp_type in error_messages:
        name, guidance = error_messages[icmp_type]
        return {"class": "error", "name": name, "guidance": guidance}
    elif icmp_type in informational_messages:
        name, guidance = informational_messages[icmp_type]
        return {"class": "informational", "name": name, "guidance": guidance}
    elif icmp_type < 128:
        return {"class": "error", "name": f"Unknown error type {icmp_type}", "guidance": "evaluate"}
    else:
        return {"class": "informational", "name": f"Unknown informational type {icmp_type}", "guidance": "evaluate"}

# Test a selection of known types

for t in [1, 2, 3, 4, 128, 129, 133, 134, 135, 136]:
    r = classify_icmpv6(t)
    print(f"Type {t:3d} ({r['class']:15s}): {r['name']:<30} → {r['guidance']}")
```

## Rate Limiting Error Messages

```bash
# Linux automatically rate-limits selected ICMPv6 message types
# Check current rate limit interval
cat /proc/sys/net/ipv6/icmp/ratelimit
# Minimum spacing between rate-limited ICMPv6 messages to a given peer (milliseconds)

# Check which ICMPv6 types are rate-limited
cat /proc/sys/net/ipv6/icmp/ratemask
# Comma-separated list of ICMPv6 type ranges subject to ratelimit

# View ICMPv6 statistics
cat /proc/net/snmp6 | grep -i icmp
```

## Conclusion

The error/informational classification of ICMPv6 messages has practical implications for both firewall policy and protocol implementation. Error messages (Types 0-127) trigger specific behaviors: rate limiting, anti-loop rules, and inclusion of the offending packet. Informational messages (Types 128-255) include NDP and MLD, which are essential for IPv6 to function on a network segment. The most critical rule for firewall administrators: do not block ICMPv6 Type 2 (Packet Too Big), as it is required for classical IPv6 Path MTU Discovery and can otherwise black-hole TCP connections.
