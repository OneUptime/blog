# How to Use the SI6 Networks IPv6 Toolkit

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: IPv6, SI6 Networks, Security, Network Analysis, Toolkit, Diagnostic

Description: Use the SI6 Networks IPv6 Toolkit for advanced IPv6 security auditing, protocol analysis, and network reconnaissance including address scanning and NDP testing.

## Introduction

The SI6 Networks IPv6 Toolkit is a comprehensive set of tools for IPv6 security assessment and network analysis. It includes tools for address scanning, header manipulation, Neighbor Discovery Protocol (NDP) analysis, and path/fragmentation testing. Unlike standard tools, the SI6 toolkit operates at the packet level for deep protocol analysis.

## Installation

```bash
# Install on Ubuntu/Debian

sudo apt install -y ipv6toolkit

# Or build from source
git clone https://github.com/fgont/ipv6toolkit.git
cd ipv6toolkit
make
sudo make install

# Verify installation
addr6 --help
scan6 --help
```

## addr6: IPv6 Address Analysis

`addr6` analyzes and manipulates IPv6 addresses:

```bash
# Analyze a single IPv6 address
addr6 -a 2001:db8::1
# Output shows: address type, scope, interface ID analysis

# Check if address is SLAAC-generated (based on MAC)
addr6 -a fe80::1234:56ff:fe78:9abc

# Accept only addresses in a prefix from stdin
printf '%s\n' 2001:db8::1 2001:db8:1::1 | addr6 -i -j 2001:db8::/32

# Convert between different address formats
addr6 -a 2001:0db8:0000:0000:0000:0000:0000:0001 -c
# Outputs compressed form: 2001:db8::1

# Check if address is in a specific type (multicast, link-local, etc.)
addr6 -a ff02::1 -d
```

## scan6: IPv6 Network Scanning

`scan6` discovers live IPv6 hosts on a network:

```bash
# Scan the local link for live hosts
sudo scan6 -i eth0 -L

# Scan a specific prefix
sudo scan6 -i eth0 -d 2001:db8::/64

# Scan with verbose output
sudo scan6 -i eth0 -L -v

# Use multiple probing techniques
sudo scan6 -i eth0 -L --probe-type all

# Scan for specific port (TCP)
sudo scan6 -i eth0 -d 2001:db8::/64 --port-scan tcp:443 --tcp-scan-type syn

# Save results to file
sudo scan6 -i eth0 -L > /tmp/ipv6-hosts.txt
```

## na6/ns6: Neighbor Advertisement/Solicitation

Tools for NDP protocol manipulation and testing:

```bash
# Send a Neighbor Solicitation to discover a host
sudo ns6 -i eth0 -d ff02::1:ff00:1 -t 2001:db8::1 -e

# Send a Neighbor Advertisement
sudo na6 -i eth0 -d ff02::1 -t 2001:db8::10 \
    -E 00:11:22:33:44:55

# Flood with Neighbor Advertisements (security testing)
sudo na6 -i eth0 -d ff02::1 --flood-sources 100 \
    -t 2001:db8::10 -E 00:11:22:33:44:55 -l

# Test NDP cache exhaustion resistance
sudo na6 -i eth0 -d fe80::1 -t fe80::/64 --flood-targets 200 \
    -E 00:11:22:33:44:55
```

## ra6: Router Advertisement Testing

```bash
# Send a Router Advertisement
sudo ra6 -i eth0 -d ff02::1 \
    -P '2001:db8:1::/64#LA#3600#1800' \
    -l

# Send repeated Router Advertisements for RA handling tests
sudo ra6 -i eth0 -d ff02::1 --loop \
    -P '2001:db8:bad::/64#LA#3600#1800'

# Send RA to suppress existing prefixes (lifetime=0)
sudo ra6 -i eth0 -d ff02::1 \
    -P '2001:db8::/64#LA#0#0'
```

## frag6: IPv6 Fragmentation Testing

```bash
# Send fragmented IPv6 packets for firewall testing
sudo frag6 -i eth0 -s 2001:db8::10 -d 2001:db8::1 \
    --frag-size 512 --frag-type first

# Test minimum fragment size handling
sudo frag6 -i eth0 -s 2001:db8::10 -d 2001:db8::1 \
    --frag-size 8 --frag-type middle

# Assess fragment handling behavior
sudo frag6 -i eth0 -d 2001:db8::1 --frag-reass-policy
```

## flow6: IPv6 Flow Label Analysis

```bash
# Assess flow label generation policy
sudo flow6 -i eth0 -d 2001:db8::1 --flow-label-policy

# Test flow label policy with TCP/443 probes
sudo flow6 -i eth0 -d 2001:db8::1 --flow-label-policy -P TCP -p 443
```

## path6: IPv6 Path Testing

```bash
# Trace an IPv6 path
sudo path6 -i eth0 -d 2001:db8::1

# Probe path behavior with larger payloads
sudo path6 -i eth0 -d 2001:db8::1 --payload-size 1200
```

## Real-World Security Audit Use Cases

```bash
# 1. Discover all IPv6 hosts on your network segment
sudo scan6 -i eth0 -L -v 2>/dev/null

# 2. Check for rogue Router Advertisements
sudo timeout 10 tcpdump -n -i eth0 'icmp6 and ip6[40] == 134' 2>/dev/null
# Type 134 = Router Advertisement

# 3. Scan for IPv6 hosts that don't appear in your inventory
sudo scan6 -i eth0 -L > /tmp/ipv6-actual.txt
diff /tmp/ipv6-expected.txt /tmp/ipv6-actual.txt

# 4. Test NDP cache sizes (DoS resistance)
echo "Testing NDP cache with 100 fake entries..."
sudo na6 -i eth0 -d fe80::1 \
    --flood-targets 100 \
    -t fe80::/64 \
    -E 00:00:00:00:00:00 \
    --loop --sleep 10
```

## Conclusion

The SI6 Networks IPv6 Toolkit provides tools that go far beyond standard system utilities for IPv6 analysis and security auditing. `scan6` discovers hosts using multiple IPv6 probing techniques, `addr6` analyzes address properties, and tools like `ra6` and `na6` enable deep testing of NDP protocol behavior. These tools are valuable for security auditing, network inventory, and IPv6 protocol research. Always use these tools only on networks you own or have explicit permission to test.
