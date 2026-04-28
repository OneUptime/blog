# How to Scan IPv6 Networks with nmap

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: nmap, IPv6, Network Scanning, Security, Penetration Testing, Network Discovery

Description: A guide to using nmap to scan IPv6 networks and hosts, covering the -6 flag, address discovery, port scanning, and OS detection over IPv6.

nmap supports IPv6 scanning via the `-6` flag. IPv6 scanning differs from IPv4 because the address space is too large to scan sequentially - scanning /64 subnets is impractical. Instead, discovery relies on known addresses, multicast, or DNS.

## Basic IPv6 Scanning

```bash
# Scan a single IPv6 host (requires -6 flag)

nmap -6 2001:db8::10

# Ping scan a specific IPv6 host
nmap -6 -sn 2001:db8::10

# Scan common ports on an IPv6 host
nmap -6 -F 2001:db8::10  # Fast scan (top 100 ports)

# Full port scan of an IPv6 host
nmap -6 -p- 2001:db8::10

# Service version detection over IPv6
nmap -6 -sV 2001:db8::10
```

## Scanning Multiple IPv6 Hosts

```bash
# Scan multiple specific IPv6 addresses
nmap -6 2001:db8::1 2001:db8::2 2001:db8::3 2001:db8::10

# Scan a range using host list file
nmap -6 -iL ipv6-targets.txt

# ipv6-targets.txt content:
# 2001:db8::10
# 2001:db8::11
# 2001:db8::20
```

## IPv6 Subnet Scanning (Small Subnets Only)

Scanning large IPv6 subnets is impractical (/64 = 18.4 quintillion addresses). Only scan small custom ranges:

```bash
# Scan the first 256 addresses of a /64 using CIDR notation
# nmap supports CIDR for IPv6, but octet ranges (e.g. [1-254]) are not supported
nmap -6 2001:db8::/120 -sV -T4  # /120 = 256 addresses

# Or use a Python script to enumerate addresses (useful for non-contiguous ranges):
python3 -c "
import ipaddress
net = ipaddress.IPv6Network('2001:db8::/120')  # /120 = 256 addresses
for ip in net.hosts():
    print(ip)
" | nmap -6 -iL - -sV -T4
```

## IPv6 Host Discovery Techniques

```bash
# Use ping6 to find live hosts on the local segment
ping6 -c 3 ff02::1%eth0  # Ping all-nodes multicast (link-local)

# Use nmap NSE script for link-local multicast host discovery
# (sends ICMPv6 echo to ff02::1 and adds responders as targets)
sudo nmap -6 -sn -e eth0 --script targets-ipv6-multicast-echo --script-args newtargets

# Use nmap with ICMPv6 echo request
nmap -6 -sn --send-ip 2001:db8::10
```

## OS Detection Over IPv6

```bash
# OS fingerprinting over IPv6 (requires root)
sudo nmap -6 -O 2001:db8::10

# Aggressive scan with OS detection, version detection, script scanning
sudo nmap -6 -A 2001:db8::10

# Run NSE scripts for IPv6
nmap -6 --script ipv6-ra-flood 2001:db8::router  # Test RA flood (lab only)
nmap -6 --script ipv6-multicast-mld-list 2001:db8::router
```

## IPv6 Port Scanning Options

```bash
# SYN scan (stealth) over IPv6
sudo nmap -6 -sS -p 22,80,443,8080 2001:db8::10

# UDP scan over IPv6
sudo nmap -6 -sU -p 53,123,161 2001:db8::10

# TCP connect scan (no root required)
nmap -6 -sT -p 1-1000 2001:db8::10

# Scan specific ports
nmap -6 -p 22,80,443,3306,5432 2001:db8::10

# Scan all 65535 ports
nmap -6 -p 0-65535 2001:db8::10
```

## Scanning with Service and Script Detection

```bash
# Full detection scan
sudo nmap -6 -sV -sC -O 2001:db8::10

# Run specific NSE scripts for IPv6
nmap -6 --script ipv6-node-info 2001:db8::10
nmap -6 --script dns-brute --script-args dns-brute.hostlist=hosts.txt example.com
```

## Output Formats

```bash
# Normal output to file
nmap -6 -sV 2001:db8::10 -oN ipv6-scan.txt

# XML output (for parsing)
nmap -6 -sV 2001:db8::10 -oX ipv6-scan.xml

# Grepable output
nmap -6 -sV 2001:db8::10 -oG ipv6-scan.gnmap

# All formats at once
nmap -6 -sV 2001:db8::10 -oA ipv6-scan-all
```

## Important Notes

- Always obtain **written authorization** before scanning any network you do not own
- IPv6 network scanning is primarily used for **authorized security assessments**
- The `-6` flag is required for all IPv6 operations in nmap
- Link-local addresses (`fe80::`) require specifying the interface: `nmap -6 fe80::1%eth0`

nmap's IPv6 support via the `-6` flag provides all the same scanning capabilities available for IPv4, making it a complete tool for authorized IPv6 network security assessments.
