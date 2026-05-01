# How to Detect Duplicate IP Addresses Using ARP

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Networking, ARP, IPv4, Troubleshooting

Description: Learn how to use ARP techniques including arping, Wireshark, and Python scripts to detect and resolve duplicate IP addresses.

## Why Duplicate IPs Occur

Duplicate IP addresses happen when two hosts on the same subnet share the same IP address. Common causes:

- Manual static IP assignment without checking availability
- DHCP pool overlap with static assignments
- Network device migration without updating DNS/DHCP records
- Virtual machine cloning without changing IP

## Symptoms of Duplicate IPs

- Intermittent connectivity (two hosts fight over the IP)
- "Duplicate IP address" warnings in system logs
- ARP table entries flapping between two MACs
- Applications connecting to the wrong host

## Method 1: arping Duplicate Detection Mode

```bash
# -D flag exits with code 1 if a reply is received

arping -D -I eth0 -c 2 192.168.1.50

# Check result
if [ $? -eq 0 ]; then
    echo "No duplicate: 192.168.1.50 is available"
else
    echo "DUPLICATE DETECTED: 192.168.1.50 is already in use"
fi
```

## Method 2: Python Script with Scapy

```python
from scapy.all import ARP, Ether, srp

def detect_duplicate_ip(target_ip, iface='eth0'):
    """Send an ARP request and collect replies for a target IP."""
    pkt = Ether(dst='ff:ff:ff:ff:ff:ff') / ARP(pdst=target_ip)
    results, _ = srp(pkt, timeout=2, iface=iface, verbose=False)
    
    macs = sorted({rcv[ARP].hwsrc for _, rcv in results})
    
    if len(macs) == 0:
        print(f"{target_ip}: No ARP reply received")
    elif len(macs) == 1:
        print(f"{target_ip}: Reply from {macs[0]}")
    else:
        print(f"DUPLICATE IP DETECTED: {target_ip}")
        for mac in macs:
            print(f"  Claimed by MAC: {mac}")

detect_duplicate_ip('192.168.1.50')
```

## Method 3: Monitor ARP Table for Flapping

```bash
#!/bin/bash
# Detect IP-to-MAC changes in the ARP table (possible duplicate IPs)
declare -A PREV
while true; do
    while read -r ip mac; do
        if [ -n "${PREV[$ip]}" ] && [ "${PREV[$ip]}" != "$mac" ]; then
            echo "$(date): Possible duplicate IP for $ip"
            echo "  was ${PREV[$ip]}, now $mac"
        fi
        PREV["$ip"]="$mac"
    done < <(ip neigh show | awk '/lladdr/ {print $1, $5}')
    sleep 5
done
```

## Method 4: Wireshark Detection

In Wireshark, apply the filter:

```text
arp.duplicate-address-detected
```

Wireshark automatically flags ARP packets where the same IP claims different MAC addresses across multiple packets.

## Method 5: Scan Subnet for Duplicate IP Holders

```python
from scapy.all import ARP, Ether, srp
from collections import defaultdict

def scan_for_duplicates(subnet='192.168.1.0/24', iface='eth0'):
    """ARP scan a subnet and report IPs answered by multiple MAC addresses."""
    # Broadcast ARP request to entire subnet
    pkt = Ether(dst='ff:ff:ff:ff:ff:ff') / ARP(pdst=subnet)
    results, _ = srp(pkt, timeout=3, iface=iface, verbose=False)
    
    ip_mac = defaultdict(set)
    for _, rcv in results:
        ip_mac[rcv[ARP].psrc].add(rcv[ARP].hwsrc)
    
    for ip, macs in ip_mac.items():
        if len(macs) > 1:
            print(f"DUPLICATE: {ip} claimed by: {', '.join(sorted(macs))}")
        else:
            print(f"OK: {ip} → {next(iter(macs))}")

scan_for_duplicates('192.168.1.0/24')
```

## Resolving Duplicate IP Addresses

1. Identify both hosts claiming the IP (using the methods above)
2. Determine which host should own the IP
3. On the conflicting host: change IP or enable DHCP
4. Clear ARP cache on affected hosts: `ip -4 neigh flush all`
5. Add static DHCP reservations to prevent recurrence

## Key Takeaways

- `arping -D` is the simplest tool for checking if an IP is already in use.
- Scapy can detect multiple hosts claiming the same IP.
- ARP table flapping (same IP, changing MACs) is a strong indicator of duplicate IPs.
- Wireshark's `arp.duplicate-address-detected` filter automates detection.

**Related Reading:**

- [How to Use arping to Test ARP Resolution](https://oneuptime.com/blog/post/2026-03-20-arping-test-arp-resolution/view)
- [How to Understand Gratuitous ARP and Its Uses](https://oneuptime.com/blog/post/2026-03-20-gratuitous-arp-uses/view)
