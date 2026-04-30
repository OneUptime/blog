# How to Use ip monitor to Watch Network Events in Real Time

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Linux, ip command, iproute2, Monitoring, Networking, Real-Time

Description: Monitor real-time network events including interface state changes, IP address additions and deletions, and routing table changes using ip monitor.

## Introduction

`ip monitor` watches the kernel's RTNETLINK socket and prints events as they happen - interface up/down, IP address changes, route additions/deletions, neighbor table changes, and more. Unlike polling tools, `ip monitor` is event-driven and shows changes the instant they occur.

## Monitor All Network Events

```bash
# Watch all network events

ip monitor

# Press Ctrl+C to stop

# Sample output when an interface changes:
# 2: eth0: <BROADCAST,MULTICAST,UP,LOWER_UP> mtu 1500 state UP group default
#     link/ether 52:54:00:12:34:56 brd ff:ff:ff:ff:ff:ff
# 192.168.1.100/24 dev eth0 scope global
# 192.168.1.0/24 dev eth0 proto kernel scope link src 192.168.1.100
```

## Monitor Specific Event Types

```bash
# Monitor only address changes (ip add/del)
ip monitor address

# Monitor only route changes
ip monitor route

# Monitor only link (interface) state changes
ip monitor link

# Monitor neighbor (ARP/NDP) table changes
ip monitor neigh

# Monitor all events explicitly
ip monitor all
```

## Monitor with Timestamps

```bash
# Add timestamps to each event
ip -timestamp monitor all
```

## Monitor a Specific Interface

```bash
# Watch events for eth0 only
ip monitor dev eth0
```

## Log Events to a File

```bash
# Redirect monitor output to a log file
ip -timestamp monitor all > ~/ip-monitor.log &

# Or to syslog
ip -timestamp monitor all | logger -t ip-monitor &
```

## Monitor IPv4 Events Only

```bash
# Filter to IPv4 only
ip -4 monitor address
ip -4 monitor route
```

## Typical Use Cases

```bash
# Watch what happens when a cable is plugged in
ip monitor link
# Output: carrier change, UP state

# Watch DHCP address assignment
ip monitor address
# Shows new inet address as DHCP completes

# Debug routing changes from a routing daemon
ip -timestamp monitor route

# Watch ARP learning in real time
ip monitor neigh
# Shows new MAC-IP mappings as they're learned
```

## ip monitor vs NetworkManager Events

```bash
# ip monitor: kernel-level rtnetlink events
ip monitor

# nmcli monitor: NetworkManager activity
nmcli monitor

# ip monitor shows kernel network events; nmcli monitor shows NetworkManager state changes
```

## Conclusion

`ip monitor` watches kernel RTNETLINK events in real time. Filter by type: `address`, `route`, `link`, `neigh`. Add `-timestamp` for timestamped logs. Run in background with `&` and redirect to a log file for persistent monitoring. This is a low-level network monitoring tool on Linux.
