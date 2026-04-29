# How to Monitor IPv6 Network Activity on macOS

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: IPv6, macOS, Network Monitoring, netstat, tcpdump

Description: Learn how to monitor IPv6 network activity on macOS using netstat, tcpdump, lsof, and other built-in tools to view active connections, traffic, and statistics.

## View Active IPv6 Connections

```bash
# Show all active connections including IPv6

netstat -an | grep '\..*\[.*\]\|tcp6\|udp6'

# Show TCP/UDP sockets with IPv6 (cleaner filter)
netstat -anf inet6

# Show only established IPv6 connections
netstat -anf inet6 | grep ESTABLISHED

# Show listening IPv6 ports
netstat -anf inet6 | grep LISTEN

# macOS netstat does not show process names (BSD netstat has no -p for processes)
# Use lsof or nettop to map IPv6 sockets to processes (see below)
```

## Understanding netstat IPv6 Output on macOS

```bash
$ netstat -anf inet6 | head -20

Active Internet connections (including servers)
Proto Recv-Q Send-Q  Local Address          Foreign Address        (state)
tcp6       0      0  *.443                  *.*                    LISTEN
tcp6       0      0  2001:db8::10.443       2001:db8::20.51234     ESTABLISHED
tcp6       0      0  ::1.5432               ::1.54321              ESTABLISHED
udp6       0      0  *.5353                 *.*

# tcp6 = IPv6 TCP
# *.443 = listening on all IPv6 addresses, port 443
```

## Monitor with tcpdump

```bash
# Capture all IPv6 traffic on Wi-Fi (en0)
sudo tcpdump -i en0 ip6

# Capture IPv6 traffic to/from a specific address
sudo tcpdump -i en0 ip6 and host 2001:4860:4860::8888

# Capture ICMPv6 (NDP, RA, ping6)
sudo tcpdump -i en0 icmp6

# Capture only Router Advertisements
sudo tcpdump -i en0 'icmp6 and ip6[40] == 134'

# Save capture for analysis in Wireshark
sudo tcpdump -i en0 ip6 -w /tmp/ipv6-capture.pcap

# Capture IPv6 DNS traffic
sudo tcpdump -i en0 'ip6 and port 53'
```

## View IPv6 Statistics

```bash
# Show IPv6 protocol statistics
netstat -s -f inet6

# Show ICMPv6 statistics
netstat -s -p icmp6

# Show interface statistics with IPv6 packet counts
netstat -i

# Detailed per-interface stats
netstat -ind
```

## Monitor with lsof

```bash
# Show processes using IPv6 sockets
lsof -i 6

# Show TCP6 connections
lsof -i TCP6

# Show listening IPv6 ports
lsof -i 6 -sTCP:LISTEN

# Show connections from a specific process
lsof -i 6 -p $(pgrep nginx)
```

## Network Activity Monitor Tools

```bash
# nettop: real-time network activity monitor (macOS built-in)
# Shows per-process network usage including IPv6
nettop

# Show wifi traffic only (nettop has no built-in IP-version filter;
# pipe through grep to narrow to IPv6 addresses)
nettop -t wifi

# Use Activity Monitor (GUI)
# Open Activity Monitor → Network tab
# Shows total network usage (doesn't filter by IP version)
```

## Check NDP (Neighbor Discovery) Table

```bash
# Show NDP neighbor cache (IPv6 equivalent of ARP)
ndp -an

# Filter the cache to a specific interface (ndp -a dumps the whole cache)
ndp -an | grep en0

# Show NDP router entries
ndp -rn
```

## Summary

Monitor IPv6 activity on macOS with `netstat -anf inet6` for active connections, `sudo tcpdump -i en0 ip6` for packet captures, `lsof -i 6` for per-process connections, and `netstat -s -f inet6` for statistics. The `nettop` tool provides real-time per-process network monitoring. View NDP neighbor cache with `ndp -an`. Save packet captures to `.pcap` files with `tcpdump -w` for Wireshark analysis.
