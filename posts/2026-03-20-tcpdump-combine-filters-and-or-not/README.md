# How to Combine tcpdump Filters with AND, OR, NOT Operators

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: tcpdump, BPF, Linux, Filtering, Networking, Diagnostic

Description: Combine tcpdump filter primitives using AND, OR, and NOT logical operators with proper parentheses to create precise, compound packet capture filters.

Single-primitive filters (just a host or just a port) are rarely precise enough for real troubleshooting. Combining them with logical operators creates surgical filters that capture exactly the traffic you need.

## Basic Logical Operators

```bash
# AND: both conditions must be true

sudo tcpdump 'host 192.168.1.100 and port 80'

# OR: either condition is true
sudo tcpdump 'port 80 or port 443'

# NOT: negate a condition
sudo tcpdump 'not port 22'

# Equivalent keyword forms:
# and = &&
# or  = ||
# not = !

sudo tcpdump 'port 80 || port 443'
sudo tcpdump '!port 22'
```

## Using Parentheses for Grouping

```bash
# Without parentheses - easy to misread
sudo tcpdump 'host 10.0.0.1 and port 80 or port 443'
# Interpreted as: (host 10.0.0.1 AND port 80) OR port 443

# With parentheses - explicit and correct
sudo tcpdump 'host 10.0.0.1 and (port 80 or port 443)'
# Correctly: host 10.0.0.1 AND (port 80 OR port 443)

# Always use parentheses when mixing AND and OR
# AND and OR have equal precedence in libpcap filters and evaluate left-to-right
```

## Practical Filter Combinations

```bash
# Capture HTTP and HTTPS traffic
sudo tcpdump -nn '(tcp port 80 or tcp port 443) and host 10.0.0.50'

# Capture all traffic except SSH (useful to avoid capturing your own session)
sudo tcpdump -nn 'not port 22 and not host 192.168.1.1'

# Capture new connections (SYN) to web server from specific subnet
sudo tcpdump -nn \
  'tcp[tcpflags] & tcp-syn != 0 and dst port 443 and src net 10.0.0.0/8'

# Capture ICMP and failed TCP connections
sudo tcpdump -nn 'icmp or tcp[tcpflags] & tcp-rst != 0'

# Capture traffic between two specific hosts on any port
sudo tcpdump -nn 'host 192.168.1.10 and host 10.0.0.20'
```

## Excluding Multiple Hosts or Ports

```bash
# Exclude multiple ports
sudo tcpdump -nn 'not (port 22 or port 53 or port 123)'

# Capture from subnet, excluding specific host
sudo tcpdump -nn 'net 192.168.1.0/24 and not host 192.168.1.1'

# Exclude internal traffic, keep external
sudo tcpdump -nn 'not net 192.168.0.0/16 and not net 10.0.0.0/8'

# Capture only traffic not matching your monitoring system
sudo tcpdump -nn 'not host 10.0.0.200 and not host 10.0.0.201'
```

## Combining Protocol and Host Filters

```bash
# DNS queries from a specific host
sudo tcpdump -nn 'udp port 53 and src host 192.168.1.50'

# ICMP from specific source or TCP on port 443
sudo tcpdump -nn '(icmp and src 203.0.113.5) or (tcp port 443)'

# All non-ICMP traffic from external hosts
sudo tcpdump -nn 'not icmp and not src net 192.168.0.0/16'
```

## Nesting Complex Expressions

```bash
# Complex example: capture web traffic to production servers,
# excluding health check IPs and internal traffic
sudo tcpdump -nn \
  '(tcp port 80 or tcp port 443) and
   dst net 10.100.0.0/24 and
   not src host 10.0.0.10 and
   not src net 10.0.0.0/8'

# Note: use quotes around the entire filter when using shell
# to prevent shell interpretation of parentheses
```

## Test Filter Correctness

```bash
# Count packets matching a filter (verify it captures what you expect)
sudo tcpdump -c 20 -nn 'host 8.8.8.8 and udp port 53'
# If 0 packets in 20s: filter is wrong or no matching traffic

# Compare two filter approaches
sudo tcpdump -c 10 -nn 'port 80 or port 443'
sudo tcpdump -c 10 -nn 'portrange 80-443'
# portrange catches ALL ports 80-443, not just 80 and 443
```

Proper use of parentheses and logical operators in tcpdump filters is the difference between capturing exactly what you need and drowning in irrelevant packets.
