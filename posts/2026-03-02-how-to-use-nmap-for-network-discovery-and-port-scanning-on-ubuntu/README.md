# How to Use nmap for Network Discovery and Port Scanning on Ubuntu

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Ubuntu, Networking, nmap, Security, Port Scanning

Description: Use nmap on Ubuntu for network discovery, port scanning, service detection, and OS fingerprinting with practical command examples and output interpretation.

---

`nmap` (Network Mapper) is the standard tool for network exploration and security auditing. It discovers hosts on a network, enumerates open ports, identifies running services and their versions, and can detect the operating system. Security teams use it for audits; administrators use it for inventory and troubleshooting.

**Note:** Only scan networks and systems you own or have explicit written permission to scan. Unauthorized port scanning is illegal in many jurisdictions.

## Installation

```bash
sudo apt update
sudo apt install nmap
```

Verify the version:

```bash
nmap --version
```

## Host Discovery

Before scanning ports, find which hosts are alive on a network.

### Ping Scan (No Port Scan)

```bash
# Discover live hosts in a subnet without port scanning
# -sn = no port scan (formerly -sP)
sudo nmap -sn 192.168.1.0/24
```

Output:

```
Nmap scan report for 192.168.1.1
Host is up (0.001s latency).
MAC Address: AA:BB:CC:DD:EE:FF (TP-Link Technologies)

Nmap scan report for 192.168.1.100
Host is up (0.012s latency).

Nmap scan report for 192.168.1.150
Host is up (0.015s latency).
```

### ARP Scan (Most Reliable on Local Network)

```bash
# ARP-based discovery (works even on hosts that block ICMP)
# Requires root, only works on local subnets
sudo nmap -PR -sn 192.168.1.0/24
```

### Discovery Methods

```bash
# Use ICMP echo (standard ping)
sudo nmap -PE -sn 192.168.1.0/24

# TCP SYN to port 443 for discovery
sudo nmap -PS443 -sn 192.168.1.0/24

# TCP ACK to port 80 for discovery
sudo nmap -PA80 -sn 192.168.1.0/24

# Combined: try multiple methods
sudo nmap -PE -PS22,80,443 -PA80 -sn 192.168.1.0/24

# Skip discovery entirely (assume all hosts are up)
# Useful when hosts block ICMP but have open ports
nmap -Pn 192.168.1.100
```

## Port Scanning

### TCP SYN Scan (Default)

The default scan type. Requires root. Fast and relatively stealthy since it does not complete the TCP handshake:

```bash
# SYN scan of the most common 1000 ports
sudo nmap 192.168.1.100

# SYN scan with verbose output
sudo nmap -v 192.168.1.100
```

### Common Port Ranges

```bash
# Scan specific ports
nmap -p 22,80,443 192.168.1.100

# Scan a port range
nmap -p 1-1024 192.168.1.100

# Scan all 65535 ports (slow but thorough)
nmap -p- 192.168.1.100

# Scan the top N most common ports
nmap --top-ports 100 192.168.1.100
nmap --top-ports 1000 192.168.1.100

# Scan common ports on UDP
sudo nmap -sU --top-ports 100 192.168.1.100
```

### TCP Connect Scan (No Root Required)

```bash
# Full TCP connection scan - does not require root
nmap -sT 192.168.1.100
```

Slower than SYN scan and more noticeable in logs since it completes the full TCP handshake.

### UDP Scan

```bash
# UDP scan - slower than TCP, requires root
sudo nmap -sU 192.168.1.100

# Scan specific UDP ports
sudo nmap -sU -p 53,123,161 192.168.1.100

# Combine TCP and UDP scanning
sudo nmap -sS -sU -p T:80,443,U:53,161 192.168.1.100
```

## Service and Version Detection

```bash
# Detect service versions on open ports
nmap -sV 192.168.1.100

# Increase version detection intensity (0-9, higher = more probes)
nmap -sV --version-intensity 7 192.168.1.100

# Aggressive version detection
nmap -sV --version-all 192.168.1.100
```

Output with `-sV`:

```
PORT    STATE SERVICE VERSION
22/tcp  open  ssh     OpenSSH 8.9p1 Ubuntu 3ubuntu0.6 (Ubuntu Linux; protocol 2.0)
80/tcp  open  http    nginx 1.18.0 (Ubuntu)
443/tcp open  ssl/http nginx 1.18.0 (Ubuntu)
5432/tcp open postgresql PostgreSQL DB 12.0 - 14.8
```

## OS Detection

```bash
# OS fingerprinting (requires root)
sudo nmap -O 192.168.1.100

# Aggressive OS detection
sudo nmap -O --osscan-guess 192.168.1.100
```

OS detection requires at least one open and one closed port for reliable results.

## Aggressive Scan

The `-A` flag enables OS detection, version detection, script scanning, and traceroute:

```bash
# All-in-one aggressive scan
sudo nmap -A 192.168.1.100

# Same but show timing and extra verbose output
sudo nmap -A -v -T4 192.168.1.100
```

This is the most commonly used comprehensive scan for a single target.

## Nmap Scripting Engine (NSE)

NSE scripts extend nmap with specialized checks:

```bash
# Run default scripts (safe scripts)
nmap -sC 192.168.1.100

# Run a specific script
nmap --script=http-title 192.168.1.100

# Run multiple scripts
nmap --script=http-title,http-headers 192.168.1.100

# Run all scripts in a category
nmap --script=vuln 192.168.1.100     # Vulnerability scripts
nmap --script=auth 192.168.1.100     # Authentication checks
nmap --script=discovery 192.168.1.100  # Discovery scripts

# Get information about a script
nmap --script-help http-title
```

Common useful scripts:

```bash
# Check SSL certificate information
nmap --script=ssl-cert -p 443 192.168.1.100

# Check for open SMTP relay
nmap --script=smtp-open-relay -p 25 192.168.1.100

# Check HTTP methods allowed
nmap --script=http-methods 192.168.1.100

# Check for default credentials (carefully!)
nmap --script=http-default-accounts 192.168.1.100

# SSH host key fingerprints
nmap --script=ssh-hostkey -p 22 192.168.1.100

# DNS zone transfer attempt
nmap --script=dns-zone-transfer -p 53 nameserver.example.com
```

## Scanning Multiple Targets

```bash
# Scan multiple specific hosts
nmap 192.168.1.1 192.168.1.100 192.168.1.200

# Scan a subnet
nmap 192.168.1.0/24

# Scan a range
nmap 192.168.1.1-50

# Scan hosts from a file
nmap -iL targets.txt

# Exclude specific hosts from a range
nmap 192.168.1.0/24 --exclude 192.168.1.1,192.168.1.2
```

## Scan Timing and Performance

Timing templates control the scan speed (and detectability):

```bash
# -T0 Paranoid (very slow, for IDS evasion)
# -T1 Sneaky
# -T2 Polite
# -T3 Normal (default)
# -T4 Aggressive (faster, requires reliable network)
# -T5 Insane (fastest, can overwhelm target or miss results)

# Fast scan for an internal network
sudo nmap -T4 -F 192.168.1.0/24

# Aggressive single host scan
sudo nmap -T4 -A 192.168.1.100
```

## Output Formats

```bash
# Normal output (default)
nmap 192.168.1.100

# Save to a file
nmap -oN scan.txt 192.168.1.100

# Grepable output (easier to parse with grep)
nmap -oG scan.gnmap 192.168.1.100

# XML output (for import into other tools)
nmap -oX scan.xml 192.168.1.100

# All formats at once
nmap -oA scan 192.168.1.100
# Creates scan.nmap, scan.gnmap, and scan.xml
```

## Practical Use Cases

### Inventory an Unknown Network

```bash
# Quick discovery of all live hosts and their services
sudo nmap -sS -sV -T4 --open -oA network-inventory 192.168.1.0/24
```

### Check Firewall Rules

```bash
# See what's actually reachable from outside
# Run from a machine outside the network, or use a different subnet
nmap -Pn -p 1-1024 external.example.com

# Compare with what you expect to be open
```

### Check a Specific Service

```bash
# Verify SSH is running on the expected port
nmap -p 22 192.168.1.100

# Check if a web server is running
nmap -p 80,443 --open 192.168.1.0/24

# Find all machines with port 3306 (MySQL) open
nmap -p 3306 --open 192.168.1.0/24
```

### Ongoing Monitoring Script

```bash
#!/bin/bash
# Simple network change detection
NETWORK="192.168.1.0/24"
PREV_SCAN="/tmp/prev-scan.gnmap"
CURR_SCAN="/tmp/curr-scan.gnmap"

# Run scan
sudo nmap -sS -T4 --open -oG "$CURR_SCAN" "$NETWORK" > /dev/null

# Compare with previous
if [ -f "$PREV_SCAN" ]; then
    echo "Changes since last scan:"
    diff <(grep "open" "$PREV_SCAN" | sort) <(grep "open" "$CURR_SCAN" | sort)
fi

# Save current as previous
mv "$CURR_SCAN" "$PREV_SCAN"
```

## Interpreting Port States

- **open** - port accepts connections; a service is listening
- **closed** - port is reachable but no service is listening
- **filtered** - port is unreachable; likely blocked by a firewall
- **unfiltered** - port is reachable but nmap cannot determine if it is open or closed
- **open|filtered** - nmap cannot determine if open or filtered (common with UDP)

Understanding the difference between `closed` (reachable, no service) and `filtered` (unreachable, likely firewalled) helps identify firewall configuration issues.

nmap is one of those tools where depth of knowledge pays off over time. The basic scans cover 80% of use cases, but familiarity with NSE scripts and output options makes it significantly more powerful for security auditing and network troubleshooting.
