# How to Use the SI6 Networks scan6 Tool for IPv6 Reconnaissance

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: SI6 Networks, Scan6, IPv6, Reconnaissance, Security Testing, Network Discovery

Description: A guide to using the SI6 Networks scan6 tool for IPv6 host discovery and reconnaissance in authorized lab and security assessment environments.

The SI6 Networks IPv6 toolkit includes `scan6`, a specialized tool for IPv6 host discovery. It leverages IPv6-specific mechanisms such as multicast, Neighbor Discovery Protocol (NDP), and address pattern generation to find hosts in ways that are unique to IPv6.

**Note**: All techniques in this post should only be used on networks and systems you are authorized to test.

## Installing the SI6 Networks Toolkit

```bash
# On Debian/Ubuntu

sudo apt-get install ipv6toolkit

# On Arch Linux (AUR)
git clone https://aur.archlinux.org/ipv6toolkit.git
cd ipv6toolkit
makepkg -si

# From source
git clone https://github.com/fgont/ipv6toolkit.git
cd ipv6toolkit
make all
sudo make install
```

## Basic scan6 Usage

```bash
# Discover hosts on the local link (sends multicast probes)
sudo scan6 -i eth0 -L

# Scan a specific /64 prefix using low-byte address patterns
sudo scan6 -i eth0 -d 2001:db8::/64 --tgt-low-byte

# Scan a specific IPv6 address
sudo scan6 -i eth0 -d 2001:db8::1
```

## Local Link Discovery (Most Effective for /64 Subnets)

IPv6 multicast makes local link discovery highly effective:

```bash
# Use all-nodes multicast to find live hosts on the local segment
sudo scan6 -i eth0 -L -e

# -L = local link scan (uses multicast)
# -e = print link-layer (MAC) addresses

# Print only global addresses discovered on the local link
sudo scan6 -i eth0 -L -P global
```

## Address Pattern-Based Scanning

Because IPv6 /64 subnets contain 2^64 addresses, scanning them sequentially is impossible. scan6 uses pattern-based probing to find likely addresses:

```bash
# Scan using low-byte patterns (::1, ::2, ::10, etc.)
sudo scan6 -i eth0 -d 2001:db8::/64 --tgt-low-byte

# Scan using embedded IPv4 32-bit patterns (e.g., ::c0a8:101 for 192.168.1.1)
sudo scan6 -i eth0 -d 2001:db8::/64 --tgt-ipv4 ipv4-32 --ipv4-host 192.168.1.0/24

# Scan using embedded IPv4 64-bit patterns (e.g., ::192:168:1:1 for 192.168.1.1)
sudo scan6 -i eth0 -d 2001:db8::/64 --tgt-ipv4 ipv4-64 --ipv4-host 192.168.1.0/24

# Scan using embedded service-port patterns
sudo scan6 -i eth0 -d 2001:db8::/64 --tgt-port

# Combine multiple pattern types
sudo scan6 -i eth0 -d 2001:db8::/64 --tgt-low-byte --tgt-ipv4 ipv4-32 --ipv4-host 192.168.1.0/24
```

## Using scan6 with a Target List

```bash
# Provide a list of addresses or prefixes from a file
sudo scan6 -i eth0 -m targets.txt

# targets.txt format:
# 2001:db8::1
# 2001:db8::2
# 2001:db8:cafe::/64
```

## Controlling Probes and Rate

```bash
# Set probe rate (packets per second)
sudo scan6 -i eth0 -d 2001:db8::/64 --tgt-low-byte --rate-limit 100pps

# Set retransmission count (default 0)
sudo scan6 -i eth0 -L --retrans 3

# Set timeout for responses (in seconds)
sudo scan6 -i eth0 -L --timeout 5
```

## Interpreting scan6 Output

scan6 outputs discovered hosts with their IPv6 addresses and optionally MAC addresses:

```text
2001:db8::1 @ 00:11:22:33:44:55
2001:db8::cafe @ aa:bb:cc:dd:ee:ff
fe80::1 @ 00:11:22:33:44:55
```

From the MAC address, you can identify the vendor (using OUI lookup) and check whether the IPv6 address appears to be EUI-64 derived. If it does not match the MAC-derived EUI-64 form, it may be randomly generated (privacy extensions) or manually configured.

## Comparing scan6 to nmap for IPv6

| Feature | scan6 | nmap -6 |
|---|---|---|
| Local link multicast | Native (-L flag) | Supported |
| EUI-64 pattern probing | Built-in | Available through NSE target scripts |
| IPv4-embedded patterns | Built-in | Available through NSE target scripts |
| Port scanning | Limited probing and port-scan options | Full support |
| OS detection | Not supported | Supported (-O) |
| Best for | IPv6 host discovery | Full assessment |

scan6 is specialized for host discovery in the IPv6 address space, while nmap excels at post-discovery port and service enumeration.

## Practical Workflow

```bash
# Step 1: Discover live hosts on local link
sudo scan6 -i eth0 -L -e > discovered-hosts.txt

# Step 2: Extract addresses only
awk 'NF {print $1}' discovered-hosts.txt > ipv6-hosts.txt

# Step 3: Pass to nmap for port scanning
nmap -6 -sV -iL ipv6-hosts.txt -oN full-scan.txt
```

scan6 is most valuable in local network segments where its multicast-based discovery and address pattern generation make host discovery practical despite IPv6's enormous address space.
