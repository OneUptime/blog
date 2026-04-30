# How to Perform IPv6 Network Enumeration

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: IPv6, Network Enumeration, Reconnaissance, Security Testing, Network Discovery

Description: A guide to enumerating IPv6 networks using passive observation, DNS, NDP, routing data, and service fingerprinting in authorized security assessments.

IPv6 network enumeration combines multiple discovery techniques to build a complete picture of hosts, services, and topology. Unlike IPv4, where subnet scanning is the primary approach, IPv6 enumeration relies more on passive observation, DNS, and NDP data.

## Phase 1: Prefix Discovery

Before finding individual hosts, identify the IPv6 prefixes in use:

```bash
# Check IRR route6 objects for the target organization's ASN

# Use public IRR data sources
whois -h whois.radb.net -- '-i origin AS12345' | grep ^route6

# Search ARIN's Whois for the target organization record
whois -h whois.arin.net 'o *Example*'

# Check DNS for IPv6 nameservers (reveals organization's prefixes)
dig NS example.com
dig AAAA ns1.example.com
```

## Phase 2: DNS Enumeration for IPv6

```bash
# Find all AAAA records for a domain
dig AAAA example.com
dig AAAA www.example.com
dig AAAA mail.example.com
dig AAAA vpn.example.com

# DNS brute force with nmap
nmap --script dns-brute example.com

# DNS zone transfer (if permitted)
dig AXFR example.com @ns1.example.com

# Enumerate subdomains using common wordlist
for sub in www mail vpn api cdn ftp ssh; do
  dig +short AAAA ${sub}.example.com
done
```

## Phase 3: Active Host Discovery

```bash
# Multicast discovery on local segment
sudo scan6 -i eth0 -L -e

# Pattern-based scanning of known prefixes
sudo scan6 -d 2001:db8::/64 \
  --tgt-low-byte

# Probe the discovered IPv6 addresses
nmap -6 -sn -iL ipv6-hosts.txt
```

## Phase 4: NDP Cache Mining

```bash
# From a device already on the segment, list currently reachable NDP entries
ip -6 neigh show | grep REACHABLE | awk '{print $1}'

# Trigger NDP resolution by pinging the all-nodes multicast address
ping -6 -c 3 ff02::1%eth0

# After pinging multicast, read the full NDP cache
ip -6 neigh show
```

## Phase 5: Service Enumeration

Once hosts are discovered, enumerate services:

```bash
# Full service scan of discovered hosts
nmap -6 -sV -sC -p- -iL ipv6-hosts.txt

# Web service enumeration
nmap -6 -p 80,443,8080,8443 --script http-title,http-server-header \
  -iL ipv6-hosts.txt

# SSL/TLS enumeration
nmap -6 -p 443 --script ssl-cert,ssl-enum-ciphers \
  -iL ipv6-hosts.txt
```

## Phase 6: Topology Mapping

```bash
# IPv6 traceroute to map network path
traceroute -6 2001:db8::10

# nmap traceroute
nmap -6 --traceroute 2001:db8::10

# mtr for continuous path monitoring
mtr -6 2001:db8::10
```

## Phase 7: OS and Version Fingerprinting

```bash
# OS detection via nmap
sudo nmap -6 -O 2001:db8::10

# Banner grabbing
nmap -6 -p 22,80,443 -sV --version-intensity 9 2001:db8::10

# HTTP headers reveal server info
curl -6 -I http://[2001:db8::10]/
```

## Building the Enumeration Database

```bash
# Create a structured enumeration output
nmap -6 -sV -O -iL ipv6-hosts.txt \
  -oX ipv6-enum.xml \
  -oN ipv6-enum.txt \
  -oG ipv6-enum.gnmap

# Parse XML output
python3 -c "
import xml.etree.ElementTree as ET
tree = ET.parse('ipv6-enum.xml')
for host in tree.findall('.//host'):
    addr = host.find(\"address[@addrtype='ipv6']\")
    if addr is None:
        continue
    addr = addr.get('addr')
    for port in host.findall('.//port'):
        portid = port.get('portid')
        service = port.find('service')
        if service is not None:
            print(f'{addr}:{portid} - {service.get(\"name\")}')
"
```

## Passive Enumeration (Zero-Traffic)

```bash
# Monitor ICMPv6 traffic to discover hosts without sending probes
sudo tcpdump -i eth0 -n icmp6 2>/dev/null | \
  awk '{gsub(/:$/, "", $3); gsub(/:$/, "", $5); print $3"\n"$5}' | \
  grep -v '^$' | sort | uniq -c | sort -rn > passive-hosts.txt
```

IPv6 network enumeration requires a multi-source approach - combining DNS intelligence, passive traffic observation, and targeted active probing to build a comprehensive host inventory for authorized security assessments.
