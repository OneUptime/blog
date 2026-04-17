# How to Detect ARP Spoofing with Wireshark

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Wireshark, ARP, Security, Man-in-the-Middle, Networking, Forensics

Description: Use Wireshark display filters and the ARP table to detect ARP spoofing attacks where a malicious host sends fake ARP replies to redirect network traffic.

ARP spoofing is a man-in-the-middle attack where an attacker sends forged ARP replies to associate their MAC address with another host's IP. Wireshark can reveal this by showing duplicate IP-to-MAC mappings and suspicious ARP patterns.

## How ARP Spoofing Works

```text
Normal ARP:
  Host A asks: "Who has 192.168.1.1?"
  Gateway replies: "192.168.1.1 is at aa:bb:cc:dd:ee:ff"
  Host A adds to ARP cache: 192.168.1.1 → aa:bb:cc:dd:ee:ff

ARP Spoofing attack:
  Attacker sends unsolicited: "192.168.1.1 is at 11:22:33:44:55:66"
  Host A updates ARP cache: 192.168.1.1 → 11:22:33:44:55:66
  Host A's traffic now goes to attacker (MITM)
```

## Filter for ARP Traffic

```wireshark
# Show all ARP packets

arp

# ARP replies only (the spoofed packets)
arp.opcode == 2

# ARP requests
arp.opcode == 1

# Gratuitous ARP (announcing own IP, common in spoofing)
arp.isgratuitous
# or: arp.src.proto_ipv4 == arp.dst.proto_ipv4
```

## Detect Duplicate MAC Addresses for Same IP

The key indicator of ARP spoofing is two different MAC addresses claiming the same IP:

```wireshark
# Look for ARP replies claiming an IP
arp.opcode == 2

# Sort the packet list by arp.src.proto_ipv4 (sender IP)
# If you see the same IP (e.g., 192.168.1.1) appearing in multiple ARP replies
# with different source MAC addresses → ARP spoofing detected

# In packet details for each reply, check:
# Sender MAC: 11:22:33:44:55:66  ← first claim
# Sender MAC: aa:bb:cc:dd:ee:ff  ← second claim (legitimate)
# Both claiming IP: 192.168.1.1  ← CONFLICT = spoofing
```

## Use Wireshark's Duplicate IP Detection

```wireshark
# Wireshark automatically detects ARP conflicts
# Look for:
arp.duplicate-address-detected
# or
arp.duplicate-address-frame

# Expert Information shows:
# Warning: Duplicate IP address configured
```

## Analyze → Expert Information

```text
Wireshark's ARP dissector raises warnings when it detects duplicate IPs:
  Analyze → Expert Information
    → Look for "Duplicate IP address configured" warnings
    → Each warning links to the frames claiming the same IP with different MACs
    → Two or more entries for the same IP with different MACs = potential spoofing
```

## Watch for Gratuitous ARP Flood

```wireshark
# Attacker often sends many gratuitous ARPs to poison caches
arp.isgratuitous

# Count from each source:
# In IO Graphs:
#   Filter: arp.isgratuitous
# Any IP sending > 10 gratuitous ARPs/second = suspicious
```

## Detect with tshark on Command Line

```bash
# Capture ARP and look for duplicate IPs
sudo tshark -i eth0 -Y "arp.opcode == 2" -T fields \
  -e arp.src.proto_ipv4 -e arp.src.hw_mac 2>/dev/null | awk '
{
    ip=$1; mac=$2
    if (seen[ip] && seen[ip] != mac) {
        print "ARP SPOOF DETECTED: " ip " claimed by " seen[ip] " AND " mac
    }
    seen[ip]=mac
}'
```

## Verify Current ARP Table After Detection

```bash
# Check your local ARP table for conflicts
arp -n

# If gateway IP shows wrong MAC:
# Compare to known-good gateway MAC:
ip neighbor show

# Manually correct ARP entry (temporary fix)
sudo arp -s 192.168.1.1 aa:bb:cc:dd:ee:ff
```

ARP spoofing detection should be part of any security monitoring setup - it's a classic attack that enables credential theft, session hijacking, and traffic interception on local networks.
