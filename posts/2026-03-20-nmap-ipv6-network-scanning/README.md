# How to Use nmap for IPv6 Network Scanning

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: IPv6, nmap, Network Scanning, Security, Port Scanning, Network Discovery

Description: Use nmap with IPv6 support to scan hosts, discover open ports, detect services, and inventory your IPv6 network infrastructure.

## Introduction

nmap is the industry-standard network scanner that fully supports IPv6 with the `-6` flag. IPv6 scanning differs from IPv4 scanning because `/64` subnets contain billions of addresses - making subnet sweeps impractical. Effective IPv6 scanning uses targeted lists, multicast probes, and NDP-based discovery instead.

## Basic IPv6 Host Scanning

```bash
# Scan a specific IPv6 address

nmap -6 2001:db8::1

# Scan with verbose output
nmap -6 -v 2001:db8::1

# Scan a hostname (uses AAAA record)
nmap -6 ipv6.example.com

# Fast scan (100 most common ports)
nmap -6 -F 2001:db8::1

# Top 1000 ports with service detection
nmap -6 -sV 2001:db8::1

# Scan all 65535 ports
nmap -6 -p- 2001:db8::1
```

## Scanning IPv6 Ranges

```bash
# Scan a /120 range (256 addresses - feasible)
nmap -6 2001:db8::0/120

# Scan a list of specific addresses
cat << 'EOF' > /tmp/ipv6-targets.txt
2001:db8::1
2001:db8::2
2001:db8::10
2001:db8::100
EOF
nmap -6 -iL /tmp/ipv6-targets.txt

# Scan a smaller CIDR range (16 addresses)
nmap -6 2001:db8::/124
```

## IPv6 Host Discovery

Since broadcast doesn't exist in IPv6, use these alternatives:

```bash
# Ping scan using ICMPv6 Echo Request
nmap -6 -sn --send-ip 2001:db8::1/64

# Use NDP (Neighbor Discovery) for local link discovery
# nmap uses multicast ping to ff02::1
nmap -6 -sn ff02::1%eth0

# Combine with NDP cache to find hosts
ip -6 neigh show | grep REACHABLE | awk '{print $1}' > /tmp/ipv6-discovered.txt
nmap -6 -iL /tmp/ipv6-discovered.txt

# Discover via DNS zone transfer (if allowed)
dig AXFR example.com @ns1.example.com | grep AAAA | awk '{print $NF}'
```

## Service Detection on IPv6

```bash
# Detect services and versions on IPv6
nmap -6 -sV 2001:db8::1

# OS detection over IPv6
sudo nmap -6 -O 2001:db8::1

# Aggressive scan (OS + version + scripts)
sudo nmap -6 -A 2001:db8::1

# Specific port scan with service detection
nmap -6 -sV -p 22,80,443,8080 2001:db8::1
```

## nmap NSE Scripts for IPv6

```bash
# Run all IPv6-related scripts (note: includes intrusive ones like ipv6-ra-flood)
nmap -6 --script 'ipv6*' 2001:db8::1

# List multicast listeners on the local link via MLD
nmap -6 --script ipv6-multicast-mld-list -e eth0

# Router Advertisement flood (DANGEROUS: DoS - lab/authorized use only)
sudo nmap -6 --script ipv6-ra-flood -e eth0

# Query IPv6 Node Information (RFC 4620) for hostnames and addresses
nmap -6 --script ipv6-node-info 2001:db8::1
```

## Scanning IPv6 Web Services

```bash
# Test HTTP/HTTPS on IPv6
nmap -6 -p 80,443,8080,8443 --open 2001:db8::1

# Full web service audit
nmap -6 -sV -p 80,443 \
    --script http-title,http-headers,http-methods \
    2001:db8::1

# Test for common web vulnerabilities
nmap -6 -p 443 --script ssl-enum-ciphers 2001:db8::1
```

## IPv6 Infrastructure Discovery

```bash
#!/bin/bash
# ipv6-infrastructure-scan.sh

# Combine NDP, DNS, and active scanning
echo "=== IPv6 Infrastructure Discovery ==="

# Step 1: Get known addresses from NDP cache
echo "Step 1: NDP cache..."
ip -6 neigh show | grep REACHABLE | awk '{print $1}' | tee /tmp/step1.txt

# Step 2: DNS forward lookup for hostnames
echo "Step 2: DNS AAAA lookups..."
for hostname in $(cat /etc/hosts | grep -v '#' | awk '{print $2}'); do
    addr=$(dig AAAA "$hostname" +short 2>/dev/null | grep ':')
    [ -n "$addr" ] && echo "$addr" >> /tmp/step2.txt
done

# Step 3: Combine and deduplicate
cat /tmp/step1.txt /tmp/step2.txt | sort -u > /tmp/all-targets.txt
echo "Found $(wc -l < /tmp/all-targets.txt) unique IPv6 addresses"

# Step 4: Scan discovered hosts
nmap -6 -sV -p 22,80,443,8080 --open -iL /tmp/all-targets.txt

rm -f /tmp/step1.txt /tmp/step2.txt /tmp/all-targets.txt
```

## Firewall Testing with nmap

```bash
# Test if ICMPv6 is properly filtered
sudo nmap -6 -sn --send-ip 2001:db8::1

# Test TCP vs UDP differences in IPv6 firewall
nmap -6 -sU -p 53,123,500 2001:db8::1   # UDP services
nmap -6 -sT -p 22,25,80,443 2001:db8::1  # TCP services

# Check for firewall rules blocking specific ports
nmap -6 -p 25 --open 2001:db8::25
```

## Conclusion

nmap IPv6 scanning with `-6` works for targeted scans of known addresses and small ranges. For network-wide discovery, combine NDP cache analysis, DNS AAAA lookups, and link-local multicast probes since scanning full `/64` subnets is computationally infeasible. Use service detection (`-sV`) and NSE scripts to build a comprehensive inventory of IPv6-accessible services.
