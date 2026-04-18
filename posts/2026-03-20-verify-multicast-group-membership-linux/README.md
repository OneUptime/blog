# How to Verify Multicast Group Membership on Linux

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Networking, Multicast, Linux, IGMP, Network Diagnostics

Description: Verify which multicast groups a Linux host has joined using ip maddr, /proc/net/igmp, and netstat, and confirm IGMP reports are being sent to the network.

## Introduction

When multicast traffic is not arriving at a Linux host, the first check is whether the host has actually joined the target group. Linux exposes multicast membership through several interfaces in `/proc` and via the `ip` command.

## Using ip maddr

The `ip maddr` command shows multicast addresses joined on each interface:

```bash
# List all multicast memberships for all interfaces

ip maddr show

# List memberships for a specific interface
ip maddr show dev eth0
```

Example output:

```text
2:  eth0
    link  01:00:5e:00:00:01
    link  01:00:5e:00:00:fb
    inet  224.0.0.1
    inet  224.0.0.251
    inet6 ff02::1
```

The `inet` lines show IPv4 multicast groups the interface has joined. `224.0.0.1` is always present (all-hosts group). `224.0.0.251` indicates mDNS is active.

## Reading /proc/net/igmp

The `/proc/net/igmp` file provides a raw view of IGMP membership state:

```bash
# Display IGMP group memberships with timer info
cat /proc/net/igmp
```

Output format:

```text
Idx  Device    : Count Querier   Group    Users Timer    Reporter
1    lo        :     1      V3
                                010000E0     1 0:00000000               0
2    eth0      :     3      V3
                                010000EF     1 0:00000000               0
                                010000E0     1 0:00000000               0
                                FB0000E0     1 0:00000000               0
```

The `Group` column is the multicast address as a 32-bit integer in **host byte order** (little-endian on x86_64). Reverse the bytes to get the dotted-decimal address:

```bash
# Convert hex group address to dotted decimal
# E.g., 010000EF → bytes 01 00 00 EF reversed → EF 00 00 01 → 239.0.0.1
python3 -c "import socket; print(socket.inet_ntoa(bytes.fromhex('010000EF')[::-1]))"
```

## Reading /proc/net/mcfilter for SSM

For IGMPv3 source-specific memberships:

```bash
# Show source-specific (SSM) multicast filters
cat /proc/net/mcfilter
```

## Using netstat

```bash
# Show all multicast group memberships
netstat -g

# IPv4 only
netstat -g -n | grep -v "^$" | grep "\."
```

## Sending a Test IGMP Report

To trigger an immediate IGMP membership report (for testing querier behavior), toggle the interface down and up:

```bash
# This causes the kernel to re-send IGMP reports for all groups
sudo ip link set eth0 down && sudo ip link set eth0 up
```

Alternatively, leave and rejoin the group in your application.

## Watching IGMP Joins in Real Time

```bash
# Capture IGMP join/leave events as they happen
sudo tcpdump -i eth0 -n -v "ip proto 2" &

# In another terminal, run a quick join
python3 -c "
import socket, time
sock = socket.socket(socket.AF_INET, socket.SOCK_DGRAM)
mreq = socket.inet_aton('239.10.10.10') + socket.inet_aton('0.0.0.0')
sock.setsockopt(socket.IPPROTO_IP, socket.IP_ADD_MEMBERSHIP, mreq)
print('Joined 239.10.10.10')
time.sleep(5)
"
```

You will see an IGMP Membership Report appear in the tcpdump output immediately after the join.

## Checking Kernel Multicast Statistics

```bash
# Check multicast packet counters in the kernel network stats
# (IGMP itself has no dedicated section in /proc/net/snmp; multicast
# packet/byte counters are exposed under IpExt in /proc/net/netstat.)
cat /proc/net/netstat | grep -i mcast
```

## Conclusion

Use `ip maddr` for a quick per-interface view, `/proc/net/igmp` for raw IGMP state, and `tcpdump` to confirm reports are being transmitted. Together these tools provide a complete picture of multicast group membership on a Linux host.
