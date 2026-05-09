# How to Use nmap IPv6 Specific Options

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: nmap, IPv6, Security Scanning, Network Reconnaissance, NSE Scripts, Options

Description: A guide to nmap's IPv6-specific command-line options, NSE scripts for IPv6, and techniques for working with link-local, multicast, and global unicast addresses.

Beyond the basic `-6` flag, nmap includes IPv6-specific NSE scripts, options for working with link-local addresses, and techniques for discovering IPv6 hosts on local network segments.

## IPv6-Required Flags and Their Effects

```bash
# The -6 flag enables IPv6 mode for ALL nmap operations

# Without it, nmap defaults to IPv4 even if you specify an IPv6 address

# Correct: Enable IPv6 mode
nmap -6 2001:db8::10

# Incorrect: Without -6, nmap treats the address as a hostname
nmap 2001:db8::10   # Fails or queries DNS
```

## Working with Link-Local Addresses

Link-local addresses (`fe80::`) require specifying the interface with `%`:

```bash
# Scan a link-local address on eth0
nmap -6 fe80::1%eth0

# Discover link-local hosts using multicast
sudo nmap -6 -sn ff02::1%eth0

# Ping all-routers multicast
sudo nmap -6 -sn ff02::2%eth0
```

## IPv6 Source Address Specification

```bash
# Force nmap to use a specific IPv6 source address
nmap -6 -S 2001:db8::1 2001:db8::10

# Specify the interface to use
nmap -6 -e eth0 2001:db8::10
```

## IPv6 NSE Scripts

nmap's NSE library includes IPv6-specific scripts:

```bash
# Enumerate IPv6 node information (RFC 4620)
nmap -6 --script ipv6-node-info 2001:db8::10

# Enumerate multicast group memberships (MLD)
nmap -6 --script ipv6-multicast-mld-list 2001:db8::10

# Flood the link with Router Advertisements (DoS - dangerous)
# (Use only in authorized lab environments; can crash hosts)
nmap -6 --script ipv6-ra-flood

# DNS brute force for IPv6 subdomains
nmap -6 --script dns-brute example.com

# Check for IPv6 address exposure in HTTP headers
nmap -6 -p 80,443 --script http-server-header 2001:db8::10
```

## Advanced IPv6 Scanning Techniques

```bash
# Fragmented scan (send fragmented IPv6 packets)
# Note: IPv6 fragmentation is performed at source only
nmap -6 -f 2001:db8::10

# Specify a custom TTL/Hop Limit
nmap -6 --ttl 64 2001:db8::10

# Timing templates (important for IPv6 where ICMP rate limiting may apply)
nmap -6 -T2 2001:db8::10    # Polite (slower, less intrusive)
nmap -6 -T4 2001:db8::10    # Aggressive (faster)

# Maximum retries
nmap -6 --max-retries 3 2001:db8::10

# Host timeout
nmap -6 --host-timeout 60s 2001:db8::10
```

## Bypassing IPv6 ICMP Rate Limits

Some IPv6 hosts apply rate limiting to ICMPv6 responses. Use TCP probes instead:

```bash
# Use TCP SYN probe instead of ICMPv6 for host discovery
nmap -6 -sn -PS22,80,443 2001:db8::10

# Combine ICMP and TCP probes
nmap -6 -sn -PE -PS22,80,443 2001:db8::10
```

## IPv6 Target Input Methods

```bash
# From a file
nmap -6 -iL ipv6-targets.txt

# From the command line with multiple addresses
nmap -6 2001:db8::1 2001:db8::2 2001:db8::3

# Using DNS resolution (nmap resolves the AAAA record)
nmap -6 ipv6.google.com

# Exclude specific addresses (IPv6 supports CIDR notation, not octet ranges)
nmap -6 2001:db8::/120 --exclude 2001:db8::10
```

## Debugging IPv6 Scan Issues

```bash
# Verbose output to see what nmap is doing
nmap -6 -v 2001:db8::10

# Extra verbose (shows packet details)
nmap -6 -vv 2001:db8::10

# Debug mode (maximum verbosity)
nmap -6 -d 2001:db8::10

# Send raw packets and show debug info
sudo nmap -6 -sS -d --packet-trace 2001:db8::10
```

## IPv6 Scan with Firewall Evasion

```bash
# Randomize host order to avoid detection
nmap -6 --randomize-hosts -iL ipv6-targets.txt

# Spoof source IP (use with caution, for authorized testing only)
sudo nmap -6 -S 2001:db8::beef 2001:db8::10

# Add decoys (send scan from fake source IPs)
sudo nmap -6 -D 2001:db8::a,2001:db8::b 2001:db8::10
```

**Note**: All scanning techniques on this page should only be used on networks and systems you are authorized to test. Unauthorized scanning is illegal.

nmap's IPv6-specific features - from link-local interface binding to dedicated NSE scripts - provide a complete toolkit for authorized IPv6 network security assessments and network inventory.
