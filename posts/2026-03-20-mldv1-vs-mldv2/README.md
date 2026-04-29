# How to Understand MLDv1 vs MLDv2

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: IPv6, MLD, Multicast, MLDv1, MLDv2

Description: A comparison of MLDv1 and MLDv2, explaining the differences in source-specific multicast support, message formats, and when to upgrade from MLDv1 to MLDv2.

## MLDv1 Overview

MLDv1 (RFC 2710, 1999) is the first version of the Multicast Listener Discovery protocol for IPv6. It is the IPv6 equivalent of IGMPv2 for IPv4. MLDv1 uses three message types:

- **Query** (type 130): Router asks which groups have listeners
- **Report** (type 131): Host announces group membership
- **Done** (type 132): Host announces it's leaving a group

MLDv1 uses **Any-Source Multicast (ASM)**: A host joins a group and receives traffic from any source sending to that group.

## MLDv2 Overview

MLDv2 (RFC 3810, 2004) extends MLDv1 with source-specific multicast (SSM) support. It is the IPv6 equivalent of IGMPv3 for IPv4.

MLDv2 uses only two message types:
- **Query** (type 130): Same as MLDv1, but can be source-specific
- **Version 2 Report** (type 143): A combined message replacing Report and Done

The key addition is that a host can specify **which sources** it wants to receive from (INCLUDE mode) or which sources it wants to exclude (EXCLUDE mode).

## Key Differences

| Feature | MLDv1 | MLDv2 |
|---|---|---|
| RFC | RFC 2710 | RFC 3810 |
| Source filtering | No (any-source) | Yes (SSM support) |
| Report type | Type 131 | Type 143 (Version 2 Report) |
| Done message | Type 132 (separate) | Included in Type 143 |
| Report suppression | Yes (suppress duplicates) | No (each host reports independently) |
| PIM-SSM support | No | Yes |
| INCLUDE/EXCLUDE modes | No | Yes |

## MLDv2 Source Filtering

MLDv2 allows hosts to specify source preferences:

**INCLUDE mode**: Receive multicast only from listed sources
```text
Join (S1, G): Receive multicast group G only from source S1
```

**EXCLUDE mode**: Receive multicast from all sources except listed ones
```text
Join (*,G) EXCLUDE(S1): Receive group G from any source except S1
```

This enables PIM-SSM (Source-Specific Multicast), where the complete multicast channel is identified by both a source and a group address `(S, G)`.

## MLDv2 Message Format

MLDv2 Version 2 Report (type 143) includes multiple group records:

```text
MLDv2 Report:
  Reserved
  Number of Multicast Address Records: N

  Record 1:
    Record Type: 3 (CHANGE_TO_INCLUDE_MODE) or 1 (MODE_IS_INCLUDE)
    Multicast Address: ff3e::db8:1
    Source Addresses: [2001:db8::source1, 2001:db8::source2]

  Record 2:
    Record Type: 2 (MODE_IS_EXCLUDE)
    Multicast Address: ff3e::db8:2
    Source Addresses: [] (empty = exclude nothing = any source)
```

## MLDv2 Record Types

| Type Value | Name | Meaning |
|---|---|---|
| 1 | MODE_IS_INCLUDE | Current state: receive from listed sources |
| 2 | MODE_IS_EXCLUDE | Current state: receive from all except listed |
| 3 | CHANGE_TO_INCLUDE_MODE | State change: switch to include mode |
| 4 | CHANGE_TO_EXCLUDE_MODE | State change: switch to exclude mode |
| 5 | ALLOW_NEW_SOURCES | Add sources to include list |
| 6 | BLOCK_OLD_SOURCES | Remove sources from include list |

## Compatibility Between MLDv1 and MLDv2

Routers and switches must be able to handle both versions. When a network has mixed MLDv1 and MLDv2 hosts:

- The router querier operates at the lowest common version
- If any host responds with MLDv1 messages, the router uses MLDv1 compatibility mode
- MLDv2 hosts detect MLDv1 listeners and fall back to MLDv1 mode for that group

## Checking MLD Version on Linux

```bash
# Check which MLD version the system is using

# Linux uses MLDv2 by default in modern kernels

# View MLD version setting per interface
sysctl net.ipv6.conf.eth0.force_mld_version
# 0 = no enforcement, MLDv1 fallback allowed (default)
# 1 = force MLDv1
# 2 = force MLDv2

# Force MLDv1 for compatibility testing
sysctl -w net.ipv6.conf.eth0.force_mld_version=1
```

## Capturing MLDv1 vs MLDv2 Messages

```bash
# Capture all MLD messages
tcpdump -i eth0 -n 'icmp6 and (ip6[40] == 130 or ip6[40] == 131 or ip6[40] == 132 or ip6[40] == 143)'

# Specifically capture MLDv2 reports (type 143)
tcpdump -i eth0 -n 'icmp6 and ip6[40] == 143'

# Analyze with Wireshark for detailed MLDv2 record parsing
# Filter: icmpv6.type == 143
```

## When to Use MLDv2

Use MLDv2 when:
- Deploying PIM-SSM for IPv6 multicast routing (requires SSM)
- Source filtering is needed (e.g., receive multicast video only from authorized sources)
- Building modern IPv6 multicast infrastructure

Use MLDv1 compatibility mode when:
- Supporting legacy equipment that only understands MLDv1
- Troubleshooting multicast issues by simplifying to MLDv1

## Summary

MLDv1 is the basic multicast group management protocol (any-source) while MLDv2 adds source-specific multicast (SSM) support with INCLUDE/EXCLUDE source filtering. MLDv2 uses a combined report message (type 143) that replaces the separate MLDv1 Report and Done messages. Modern Linux and routing infrastructure use MLDv2 by default, with automatic backward compatibility to MLDv1 when needed. Prefer MLDv2 for all new deployments.
