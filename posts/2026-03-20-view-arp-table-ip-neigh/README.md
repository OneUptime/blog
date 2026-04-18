# How to View the ARP Table with ip neigh

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Linux, ip command, iproute2, ARP, Networking, Diagnostic

Description: View and manage the ARP table on Linux using ip neigh, including filtering by interface, state, and understanding neighbor entry states.

## Introduction

The ARP table (neighbor table in iproute2 terminology) maps IP addresses to MAC addresses on the local network. `ip neigh` is the modern replacement for the deprecated `arp` command. Understanding ARP state is essential for diagnosing Layer 2 connectivity issues.

## Show the ARP Table

```bash
# Show all neighbor (ARP) entries

ip neigh show

# Sample output:
# 192.168.1.1 dev eth0 lladdr aa:bb:cc:dd:ee:ff REACHABLE
# 192.168.1.50 dev eth0 lladdr 11:22:33:44:55:66 STALE
```

## Filter by Interface

```bash
# Show ARP entries for eth0 only
ip neigh show dev eth0
```

## Filter by State

```bash
# Show only reachable entries
ip neigh show nud reachable

# Show stale entries
ip neigh show nud stale

# Show permanent entries
ip neigh show nud permanent
```

## ARP Entry States

| State | Description |
|---|---|
| `REACHABLE` | MAC confirmed recently |
| `STALE` | MAC not confirmed recently - may still be valid |
| `DELAY` | Waiting to confirm reachability |
| `PROBE` | Actively probing for MAC |
| `FAILED` | No response - host unreachable |
| `PERMANENT` | Static entry, never ages |
| `NOARP` | No ARP - direct route, no MAC needed |

## Filter by IPv4 Only

```bash
# Show IPv4 ARP entries only
ip -4 neigh show
```

## Show with Interface Details

```bash
# Print only IP, interface name, and MAC columns
ip neigh show | awk '{print $1, $3, $5}'
```

## Check if a Specific IP is in ARP Cache

```bash
# Check if 192.168.1.1 is in the cache
ip neigh show 192.168.1.1

# If empty - not in cache (force ARP with ping first)
ping -c 1 192.168.1.1
ip neigh show 192.168.1.1
```

## Show ARP in JSON

```bash
ip -json neigh show | python3 -m json.tool
```

## ip neigh vs arp (legacy)

```bash
# Modern (ip neigh)
ip neigh show

# Deprecated (arp)
arp -n

# ip neigh provides more states and IPv6 support
```

## Conclusion

`ip neigh show` displays the ARP table with IP address, interface, MAC address (lladdr), and neighbor state. Use `nud` (neighbor unreachability detection) state filters to find reachable vs stale entries. `ip -4 neigh show` limits output to IPv4. The `arp` command is deprecated in favor of `ip neigh`.
