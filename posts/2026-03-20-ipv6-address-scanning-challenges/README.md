# How to Understand IPv6 Address Scanning Challenges (Large Address Space)

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: IPv6, Address Scanning, Network Reconnaissance, Address Space, Security

Description: A guide to understanding why traditional sequential scanning fails for IPv6 and the practical alternative techniques for discovering IPv6 hosts in large address spaces.

IPv6's 128-bit address space is fundamentally incompatible with sequential scanning approaches that work for IPv4. Understanding why this is true - and what alternative discovery techniques actually work - is essential for both offensive security and network inventory purposes.

## Why IPv6 Sequential Scanning Fails

A typical IPv6 deployment uses a /64 subnet for each network segment. A /64 contains 2^64 = 18,446,744,073,709,551,616 addresses.

```text
IPv4 /24 = 256 addresses   → scan in <1 second
IPv4 /16 = 65,536 addresses → scan in minutes
IPv6 /64 = 18.4 quintillion → impossible to scan sequentially
```

Even at 10 billion probes per second, scanning a /64 would take 58 years.

## Why This Is Actually Good Security

IPv6's large address space provides **obscurity-based resistance to blind scanning** that doesn't exist in IPv4 - a host at a random address in a /64 is effectively hidden from brute-force address scans. However, this should never be relied upon as the sole security control.

## Practical IPv6 Host Discovery Techniques

### 1. Multicast-Based Discovery (Most Effective on LAN)

```bash
# Discover local IPv6 hosts with Nmap's IPv6 host-discovery scripts

sudo nmap -6 -n -sn --script 'targets-ipv6-multicast-*'

# Use scan6 for comprehensive local discovery
sudo scan6 -i eth0 -L -e

# Ping all-nodes multicast
ping -6 -c 3 ff02::1%eth0
```

### 2. Address Pattern Probing

Many IPv6 addresses follow predictable patterns:

```bash
# Scan low-byte patterns (::1, ::2, ::10, etc.)
sudo scan6 -d 2001:db8::/64 --tgt-low-byte

# Scan IPv4-embedded patterns
# e.g., 2001:db8::c0a8:101 embeds 192.168.1.1 in the low 32 bits
sudo scan6 -d 2001:db8::/64 -B ipv4-32 --ipv4-host 192.168.1.0/24

# Probe specific word patterns (manually configured: ::cafe, ::dead, ::1337)
sudo nmap -6 -sn 2001:db8::cafe 2001:db8::dead 2001:db8::1337
```

### 3. DNS-Based Discovery

DNS AAAA records reveal deployed IPv6 addresses:

```bash
# DNS brute force for hostnames that may have AAAA records
nmap --script dns-brute --script-args dns-brute.domain=example.com

# Zone transfer (if allowed)
dig @ns1.example.com example.com AXFR | grep ' IN AAAA '

# Reverse DNS lookups for guessed low-byte addresses
for i in $(seq 1 254); do
  dig +short -x "2001:db8::${i}"
done
```

### 4. Certificate Transparency and OSINT

```bash
# Search CT logs for IPv6 addresses in certificates
# curl https://crt.sh/?q=2001%3Adb8%3A%3A

# Use shodan for known IPv6 addresses
# shodan search "net:2001:db8::/32"

# BGP route data reveals deployed prefixes
# https://bgp.he.net/
```

### 5. Router and NDP Cache Mining

```bash
# Read NDP cache from routers (authorized access required)
show ipv6 neighbors                    # Cisco IOS
show ipv6 neighbors                    # Junos
ip -6 neigh show                       # Linux router

# Extract addresses from NDP cache and scan them
ip -6 neigh show | awk '{print $1}' > ndp-hosts.txt
nmap -6 -iL ndp-hosts.txt -sV
```

### 6. Traffic Analysis

```bash
# Capture IPv6 traffic to discover addresses passively
sudo tshark -i eth0 -f ip6 -T fields -e ipv6.src -e ipv6.dst -l | tr '\t' '\n' | sort -u > observed-ipv6.txt

# Extract from existing pcap
tshark -r capture.pcap -Y ipv6 -T fields -e ipv6.src -e ipv6.dst | tr '\t' '\n' | sort -u
```

## Address Space That Is Still Scannable

Some IPv6 address ranges are small enough to scan:

```bash
# /120 prefix = 256 addresses (same as IPv4 /24)
nmap -6 2001:db8::/120

# EUI-64 derived addresses from known MAC OUI
# MAC OUI 00:50:56 (VMware) → many addresses start with 2001:db8::250:56ff:fe...
sudo scan6 -d 2001:db8::/64 --tgt-ieee-oui 00:50:56
```

## Summary: IPv6 Host Discovery Methods

| Method | Scope | Effectiveness |
|---|---|---|
| Multicast (ff02::1) | LAN only | High for local |
| Pattern scanning | Any | Medium |
| DNS AAAA records | Global | High if DNS complete |
| NDP cache mining | Local segments | Very high |
| Traffic capture | On-path only | High over time |
| CT logs / OSINT | Global | Medium |

IPv6's large address space makes proactive host discovery more dependent on intelligence gathering and passive observation than on brute-force sequential scanning.
