# How to Understand IGMP Versions (v1, v2, v3) and Their Differences

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Networking, Multicast, IGMP, IPv4, Protocol

Description: Compare IGMP v1, v2, and v3, covering their key protocol differences, feature improvements, and how to identify which version is active on your network.

## Introduction

The Internet Group Management Protocol (IGMP) allows hosts to signal routers about multicast group membership. Three versions exist, each adding capabilities that improve efficiency and source filtering. Understanding the differences helps you configure routers and diagnose multicast issues.

## IGMP v1 (RFC 1112)

IGMPv1 is the baseline. Hosts send **Membership Reports** to join a group. There is no explicit leave mechanism - the router must wait for membership state to age out after queries go unanswered before pruning the group.

Key characteristics:
- No Leave message (silent departure)
- Query-Response model: router sends General Query, hosts respond
- Host report suppression: if one host reports first, others stay silent
- Queries are normally sent no more than once a minute

## IGMP v2 (RFC 2236)

IGMPv2 introduced explicit leave messages, dramatically reducing leave latency from minutes to seconds.

Key improvements over v1:
- **Leave Group** message sent to 224.0.0.2 (all routers)
- **Group-Specific Query**: router queries only the leaving group
- **Max Response Time** field in queries (configurable response window)
- **Querier Election**: lowest IP router becomes the designated querier

Typical leave sequence:

```text
Host → Router:   Leave Group  (dst 224.0.0.2)
Router → Group:  Group-Specific Query  (dst 239.1.2.3)
  [no response within Max Response Time]
Router:          Prunes group from interface
```

## IGMP v3 (RFC 9776; obsoletes RFC 3376)

IGMPv3 is the current standard, adding **source filtering** - the foundation for Source-Specific Multicast (SSM).

Key improvements over v2:
- Hosts specify **INCLUDE** or **EXCLUDE** source lists in reports
- Reports sent to 224.0.0.22 (IGMPv3-capable routers)
- Supports SSM (`232.0.0.0/8` in IPv4)
- Eliminates report suppression (all hosts send individual reports)

Example IGMPv3 Group Record types:

| Record Type | Meaning |
|---|---|
| MODE_IS_INCLUDE | Accept traffic only from listed sources |
| MODE_IS_EXCLUDE | Accept from all except listed sources |
| CHANGE_TO_INCLUDE_MODE | Filter mode changed to INCLUDE |
| CHANGE_TO_EXCLUDE_MODE | Filter mode changed to EXCLUDE |
| ALLOW_NEW_SOURCES | Add newly desired sources |
| BLOCK_OLD_SOURCES | Stop receiving listed sources |

## Version Comparison Table

| Feature | v1 | v2 | v3 |
|---|---|---|---|
| Explicit Leave | No | Yes | Yes |
| Source Filtering | No | No | Yes |
| SSM Support | No | No | Yes |
| Querier Election | No | Yes | Yes |
| Report Suppression | Yes | Yes | No |
| RFC | 1112 | 2236 | 9776 |

## Detecting the Active IGMP Version

Capture IGMP traffic and inspect message types:

```bash
# Capture IGMP and decode version from message type byte

sudo tcpdump -i eth0 -n -vv "ip proto 2"
```

Typical tcpdump labels include:
- `igmp v1 report` - IGMPv1
- `igmp v2 report` / `igmp leave` - IGMPv2
- `igmp v3 report` - IGMPv3

Check IGMP state on a Linux host:

```bash
# Show per-interface IGMP state
cat /proc/net/igmp

# Read whether eth0 is forcing a specific IGMP version (0 = automatic)
cat /proc/sys/net/ipv4/conf/eth0/force_igmp_version

# Or use ip maddr to see joined groups
ip maddr show dev eth0
```

## Configuring IGMP Version on Linux

```bash
# Force IGMPv2 on eth0 (useful for compatibility with older routers)
echo 2 | sudo tee /proc/sys/net/ipv4/conf/eth0/force_igmp_version

# Revert to automatic compatibility mode
echo 0 | sudo tee /proc/sys/net/ipv4/conf/eth0/force_igmp_version
```

## Conclusion

IGMPv3 is the preferred version for modern networks because it enables source-specific multicast while retaining low leave latency. Use IGMPv2 when legacy routers are present, and avoid IGMPv1 in all new deployments.
