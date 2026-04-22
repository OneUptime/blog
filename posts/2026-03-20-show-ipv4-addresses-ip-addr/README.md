# How to Show All IPv4 Addresses with ip -4 addr

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Linux, ip command, iproute2, IPv4, Networking, Diagnostic

Description: Show all IPv4 addresses on Linux interfaces using the ip command with -4 filter, including address details, interface state, and specific interface queries.

## Introduction

The `ip addr` command displays address information for network interfaces. The `-4` flag filters output to IPv4 addresses only, removing IPv6 clutter. This is the modern replacement for the deprecated `ifconfig`.

## Show All IPv4 Addresses

```bash
# Show IPv4 addresses on all interfaces

ip -4 addr show

# Sample output:
# 1: lo: <LOOPBACK,UP,LOWER_UP> mtu 65536 qdisc noqueue state UNKNOWN group default qlen 1000
#     inet 127.0.0.1/8 scope host lo
#        valid_lft forever preferred_lft forever
# 2: eth0: <BROADCAST,MULTICAST,UP,LOWER_UP> mtu 1500 qdisc mq state UP group default qlen 1000
#     inet 192.168.1.100/24 brd 192.168.1.255 scope global eth0
#        valid_lft forever preferred_lft forever
```

## Show IPv4 for a Specific Interface

```bash
# Show IPv4 addresses for eth0 only
ip -4 addr show eth0

# Shorthand
ip -4 a show eth0
```

## Show Only the IP Address (No Interface Details)

```bash
# Extract just the IP/prefix
ip -4 addr show eth0 | grep -oP '(?<=inet )\S+'

# Example: 192.168.1.100/24

# Just the IP address (no prefix)
ip -4 addr show eth0 | grep -oP '(?<=inet )\d+\.\d+\.\d+\.\d+'
```

## Show Brief Output

```bash
# Compact one-line-per-address output
ip -4 -brief addr show

# Sample output:
# lo               UNKNOWN        127.0.0.1/8
# eth0             UP             192.168.1.100/24
```

## Show Address Details

```bash
# Full verbose output
ip -4 -detail addr show eth0

# Includes: scope, valid_lft, preferred_lft, label
```

## Show Addresses by Scope

```bash
# Show only global scope addresses (not loopback, link-local)
ip -4 addr show scope global

# Show only loopback scope
ip -4 addr show scope host
```

## Show Addresses as JSON

```bash
# Machine-readable JSON output
ip -4 -json addr show

# Pretty-print with Python
ip -4 -json addr show | python3 -m json.tool
```

## Count IP Addresses

```bash
# How many IPv4 addresses are configured?
ip -4 addr show | grep -c "inet "

# List all IPs only
ip -4 addr show | awk '/inet /{print $2}'
```

## ip addr vs ifconfig

```bash
# Modern (ip addr)
ip -4 addr show eth0

# Deprecated (ifconfig)
ifconfig eth0

# ip addr is more feature-rich and scriptable
```

## Conclusion

`ip -4 addr show` is the primary tool for listing IPv4 addresses on Linux. Use `-4` to filter IPv4-only output, `show <interface>` to target a specific interface, and `-brief` for compact output. The `-json` flag enables machine-readable output for automation.
