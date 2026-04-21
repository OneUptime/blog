# How to Filter tcpdump Captures by Source or Destination IP Address

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: tcpdump, BPF Filter, Source IP, Destination IP, Packet Analysis

Description: Learn how to use tcpdump BPF filter expressions to precisely filter network captures by source IP, destination IP, subnet ranges, and combinations for targeted troubleshooting.

## Basic IP Filtering Syntax

tcpdump uses Berkeley Packet Filter (BPF) expressions for filtering. The key primitives are:

```bash
# Match packets to or from a specific host

sudo tcpdump -i eth0 host 192.168.1.50

# Match packets FROM a specific source IP only
sudo tcpdump -i eth0 src host 192.168.1.50
# or shorter:
sudo tcpdump -i eth0 src 192.168.1.50

# Match packets TO a specific destination IP only
sudo tcpdump -i eth0 dst host 192.168.1.50
# or shorter:
sudo tcpdump -i eth0 dst 192.168.1.50
```

## Step 1: Filter by Single IP

```bash
# All traffic involving 192.168.1.100 (source OR destination)
sudo tcpdump -i eth0 -n host 192.168.1.100

# Only traffic leaving from 192.168.1.100
sudo tcpdump -i eth0 -n src 192.168.1.100

# Only traffic arriving at 192.168.1.100
sudo tcpdump -i eth0 -n dst 192.168.1.100

# Watch what a specific device is doing in real-time
sudo tcpdump -i eth0 -n -v host 192.168.1.100
```

## Step 2: Filter by Subnet/Network Range

```bash
# All traffic involving the 192.168.1.0/24 subnet
sudo tcpdump -i eth0 -n 'net 192.168.1.0/24'
# or
sudo tcpdump -i eth0 -n 'net 192.168.1.0 mask 255.255.255.0'

# Traffic FROM a subnet
sudo tcpdump -i eth0 -n 'src net 10.0.0.0/8'

# Traffic TO a subnet
sudo tcpdump -i eth0 -n 'dst net 172.16.0.0/12'

# Traffic between two subnets
sudo tcpdump -i eth0 -n 'net 10.0.0.0/8 and net 192.168.0.0/16'
```

## Step 3: Combine IP and Port Filters

```bash
# Traffic from specific IP on port 80
sudo tcpdump -i eth0 -n 'src 192.168.1.100 and port 80'

# Traffic from specific IP to specific destination port
sudo tcpdump -i eth0 -n 'src 192.168.1.100 and dst port 443'

# Traffic between two specific hosts on a specific port
sudo tcpdump -i eth0 -n 'host 192.168.1.100 and host 10.0.0.50 and port 8080'

# Traffic involving an IP but NOT on SSH port (exclude SSH noise)
sudo tcpdump -i eth0 -n 'host 192.168.1.100 and not port 22'
```

## Step 4: Filter by IP and Protocol

```bash
# TCP traffic from a specific host
sudo tcpdump -i eth0 -n 'src 192.168.1.100 and tcp'

# ICMP from/to a specific host
sudo tcpdump -i eth0 -n 'host 192.168.1.100 and icmp'

# DNS queries from a subnet (UDP destination port 53)
sudo tcpdump -i eth0 -n 'src net 192.168.1.0/24 and udp dst port 53'

# HTTP/HTTPS traffic from specific source
sudo tcpdump -i eth0 -n 'src 192.168.1.100 and (port 80 or port 443)'
```

## Step 5: Multiple Hosts

```bash
# Traffic involving either of two hosts
sudo tcpdump -i eth0 -n 'host 192.168.1.100 or host 192.168.1.200'

# Traffic between exactly these two hosts
sudo tcpdump -i eth0 -n '(src 192.168.1.100 and dst 192.168.1.200) or (src 192.168.1.200 and dst 192.168.1.100)'

# Exclude traffic from management hosts (reduce noise)
sudo tcpdump -i eth0 -n 'not host 192.168.1.1 and not host 192.168.1.2'
```

## Step 6: Save Filtered Capture

```bash
# Capture filtered by source IP to PCAP file
sudo tcpdump -i eth0 -n -w /tmp/host-capture.pcap 'src 192.168.1.100'

# Capture then filter when reading (more flexible)
sudo tcpdump -i eth0 -n -w /tmp/all-capture.pcap    # Capture everything
tcpdump -r /tmp/all-capture.pcap 'src 192.168.1.100' # Filter offline

# Offline filtering is more flexible - you can apply different filters
# to the same capture file without recapturing
tcpdump -r /tmp/all-capture.pcap 'dst 192.168.1.100 and port 443'
```

## Step 7: Use Raw IP Byte Filters

```bash
# Filter by specific bytes in the IP header
# IP source address is at bytes 12-15 of the IP header

# Match traffic from 192.168.1.x (first three octets)
# 192=0xc0, 168=0xa8, 1=0x01
sudo tcpdump -i eth0 'ip[12:4] & 0xffffff00 = 0xc0a80100'

# More commonly, just use the 'src net' syntax which is cleaner:
sudo tcpdump -i eth0 'src net 192.168.1.0/24'

# Filter by TTL (e.g., only packets observed with TTL=64)
sudo tcpdump -i eth0 'ip[8] = 64 and src 192.168.1.100'
```

## Practical Scenarios

```bash
# Scenario 1: Why can't server-1 reach database-2?
sudo tcpdump -i eth0 -n -v '(src 10.0.1.10 and dst 10.0.2.20) or (src 10.0.2.20 and dst 10.0.1.10)'

# Scenario 2: Is a client actually sending requests to the API?
sudo tcpdump -i eth0 -n -A 'src 192.168.1.50 and dst port 8080'

# Scenario 3: Track all connections a suspect device is making
sudo tcpdump -i eth0 -n -c 100 'src 192.168.1.99' | awk '{print $5}' | sort | uniq -c | sort -rn

# Scenario 4: Verify firewall is blocking traffic correctly
sudo tcpdump -i eth0 -n 'net 10.0.0.0/8 and host 192.168.1.50 and tcp'
# If blocked: you'll see SYN packets but no SYN-ACK responses
```

## Conclusion

tcpdump BPF filters for IP addresses use `host`, `src`, `dst`, and `net` primitives. Combine with `and`, `or`, `not` for precision filtering. Always use `-n` to prevent slow DNS lookups during captures. For complex multi-condition filters, use quotes: `'src 192.168.1.100 and dst port 443 and not port 22'`. Save raw captures with `-w` and apply filters offline with `-r` to analyze the same traffic multiple ways.
