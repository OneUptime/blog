# How to Use ARP for Network Discovery and Host Enumeration

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Networking, ARP, Network Discovery, Security, Linux

Description: Learn how to use ARP scanning and monitoring techniques to discover active hosts on a network subnet.

## Why Use ARP for Discovery?

ARP-based host discovery is faster and more reliable than ICMP ping for local subnet scanning because:

- ARP operates at Layer 2 (MAC level) - cannot be blocked by IP firewalls
- All active IPv4 hosts on the local subnet should respond to ARP requests for their own addresses
- Works even when hosts block ICMP
- Reveals both IP and MAC addresses simultaneously

## Method 1: arp-scan Tool

```bash
# Install

sudo apt install arp-scan          # Ubuntu/Debian
sudo dnf install arp-scan          # Fedora / RHEL family (often via EPEL on RHEL)
brew install arp-scan              # macOS

# Scan local network
sudo arp-scan --localnet

# Scan a specific subnet
sudo arp-scan 192.168.1.0/24 --interface eth0

# Retry each target up to three times if you suspect packet loss
sudo arp-scan --localnet --retry=3
```

Sample output:

```text
192.168.1.1     aa:bb:cc:dd:ee:ff    Cisco Systems
192.168.1.10    00:11:22:33:44:55    Dell Inc.
192.168.1.20    ff:ee:dd:cc:bb:aa    Apple Inc.
3 packets received by filter, 0 packets dropped by kernel
```

## Method 2: nmap ARP Scan

```bash
# ARP-based host discovery (requires privileges for raw packet access)
sudo nmap -sn -PR 192.168.1.0/24

# On a local Ethernet network, ARP is already the default
sudo nmap -sn 192.168.1.0/24
```

## Method 3: Python Scapy ARP Sweep

```python
from scapy.all import ARP, Ether, srp
import ipaddress

def arp_scan(subnet, iface='eth0'):
    """Scan subnet and return IP/MAC mappings for active hosts."""
    pkt = Ether(dst='ff:ff:ff:ff:ff:ff') / ARP(pdst=subnet)
    results, _ = srp(pkt, timeout=3, iface=iface, verbose=False)
    
    hosts = []
    for _, rcv in results:
        hosts.append({
            'ip': rcv[ARP].psrc,
            'mac': rcv[ARP].hwsrc
        })
    return sorted(hosts, key=lambda x: ipaddress.ip_address(x['ip']))

hosts = arp_scan('192.168.1.0/24')
print(f"Found {len(hosts)} active hosts:")
for h in hosts:
    print(f"  {h['ip']:18} {h['mac']}")
```

## Method 4: Passive ARP Monitoring

Instead of actively sending ARP requests, passively sniff ARP traffic to learn about hosts:

```python
from scapy.all import ARP, sniff
from collections import defaultdict
from datetime import datetime

seen_hosts = defaultdict(set)

def process_arp(pkt):
    if ARP in pkt and pkt[ARP].op in (1, 2):  # ARP Request or Reply
        ip = pkt[ARP].psrc
        mac = pkt[ARP].hwsrc
        if mac not in seen_hosts[ip]:
            seen_hosts[ip].add(mac)
            print(f"[{datetime.now().strftime('%H:%M:%S')}] New host: {ip} → {mac}")

print("Passively monitoring ARP traffic (Ctrl+C to stop)...")
sniff(filter='arp', prn=process_arp, store=0)
```

## Method 5: Check ARP Cache After Ping Sweep

```bash
# Ping all hosts in subnet to populate ARP cache
for i in $(seq 1 254); do
    ping -c 1 -W 1 192.168.1.$i > /dev/null 2>&1 &
done
wait

# Now read the populated ARP cache
echo "Active hosts (from ARP cache):"
ip neigh show | awk '/REACHABLE|STALE/ {print $1, $5}'
```

## Reading Vendor from MAC Address

```python
# Use mac-vendor-lookup or oui database
def mac_vendor(mac):
    oui = mac.replace(':', '').upper()[:6]
    # In production, query a local OUI database or API
    return f"OUI: {oui}"

for host in arp_scan('192.168.1.0/24'):
    vendor = mac_vendor(host['mac'])
    print(f"{host['ip']:18} {host['mac']:20} {vendor}")
```

## Key Takeaways

- ARP scanning is faster and more reliable than ICMP ping for local network discovery.
- `arp-scan --localnet` is the simplest tool for quick subnet sweeps.
- Scapy provides programmatic ARP scanning with full packet-level control.
- Passive ARP monitoring builds a host inventory without sending any packets.
- ARP reveals both IP and MAC addresses, enabling vendor identification via OUI lookup.

**Related Reading:**

- [How to Understand How ARP Maps IP Addresses to MAC Addresses](https://oneuptime.com/blog/post/2026-03-20-how-arp-maps-ip-to-mac-addresses/view)
- [How to Understand Gratuitous ARP and Its Uses](https://oneuptime.com/blog/post/2026-03-20-gratuitous-arp-uses/view)
- [How to Use arping to Test ARP Resolution](https://oneuptime.com/blog/post/2026-03-20-arping-test-arp-resolution/view)
