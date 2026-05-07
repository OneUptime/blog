# How to Perform ARP Spoofing Detection Using Scapy and IPv4

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Python, Scapy, ARP, Security, IPv4, Network Security, Spoofing

Description: Learn how to detect ARP spoofing attacks on an IPv4 network by monitoring ARP replies and identifying IP-to-MAC mapping conflicts using Scapy.

## What Is ARP Spoofing?

ARP (Address Resolution Protocol) maps IPv4 addresses to MAC addresses. In an ARP spoofing attack, a malicious host sends fake ARP replies to poison victims' ARP caches, redirecting traffic through the attacker for a man-in-the-middle (MITM) attack.

## How Detection Works

We maintain a legitimate ARP table (IP → MAC mapping) and alert when an ARP reply claims a known IP belongs to a different MAC address.

## ARP Spoofing Detector

```python
from scapy.all import sniff, ARP, Ether
from collections import defaultdict
import time

# Known-good ARP table: maps IP -> MAC

# Initialize with your network's gateway and critical hosts
KNOWN_HOSTS: dict[str, str] = {
    # "192.168.1.1": "aa:bb:cc:dd:ee:ff",  # Your router's real MAC
}

# Dynamic ARP table built during monitoring
arp_table: dict[str, str] = {}
alerts: list[dict] = []


def process_arp(pkt):
    """Process ARP packets and detect spoofing attempts."""
    if not pkt.haslayer(ARP):
        return

    arp = pkt[ARP]

    # op=2 means ARP reply (is-at); op=1 means ARP request (who-has)
    if arp.op != 2:
        return  # Only monitor ARP replies

    src_ip = arp.psrc    # Sender's IP address
    src_mac = arp.hwsrc  # Sender's MAC address

    # Check against known-good table
    if src_ip in KNOWN_HOSTS:
        if KNOWN_HOSTS[src_ip].lower() != src_mac.lower():
            alert = {
                "time": time.strftime("%H:%M:%S"),
                "type": "KNOWN_HOST_CONFLICT",
                "ip": src_ip,
                "expected_mac": KNOWN_HOSTS[src_ip],
                "seen_mac": src_mac,
            }
            alerts.append(alert)
            print(f"[!] ARP SPOOFING DETECTED: {src_ip}")
            print(f"    Expected MAC: {KNOWN_HOSTS[src_ip]}")
            print(f"    Received MAC: {src_mac}")
            return

    # Check against our dynamic table
    if src_ip in arp_table:
        known_mac = arp_table[src_ip]
        if known_mac.lower() != src_mac.lower():
            alert = {
                "time": time.strftime("%H:%M:%S"),
                "type": "MAC_CHANGE_DETECTED",
                "ip": src_ip,
                "old_mac": known_mac,
                "new_mac": src_mac,
            }
            alerts.append(alert)
            print(f"[!] MAC ADDRESS CHANGED: {src_ip}")
            print(f"    Previous MAC: {known_mac}")
            print(f"    New MAC:      {src_mac}")
        return

    # First time seeing this IP - add to dynamic table
    arp_table[src_ip] = src_mac
    print(f"[+] Learned: {src_ip} is at {src_mac}")


def build_known_table_from_system():
    """Build initial ARP table from the OS ARP cache."""
    import re
    import subprocess

    ipv4_re = re.compile(r"\b(?:\d{1,3}\.){3}\d{1,3}\b")
    mac_re = re.compile(r"\b(?:[0-9A-Fa-f]{2}:){5}[0-9A-Fa-f]{2}\b")

    try:
        result = subprocess.run(["arp", "-n"], capture_output=True, text=True, check=False)
    except FileNotFoundError:
        return

    for line in result.stdout.splitlines():
        ip_match = ipv4_re.search(line)
        mac_match = mac_re.search(line)
        if ip_match and mac_match:
            ip, mac = ip_match.group(0), mac_match.group(0)
            arp_table[ip] = mac
            print(f"[init] {ip} -> {mac}")


print("ARP Spoofing Detector started. Monitoring ARP traffic...")
build_known_table_from_system()

# Monitor ARP traffic indefinitely
try:
    sniff(
        filter="arp",
        prn=process_arp,
        store=False
    )
except KeyboardInterrupt:
    print(f"\nMonitoring stopped. {len(alerts)} alerts generated.")
    for a in alerts:
        print(a)
```

## Sending a Spoofed ARP Reply for Testing

```python
from scapy.all import ARP, Ether, sendp

# Send a spoofed ARP reply for testing
# WARNING: Only use on your own test network!
spoofed_arp = Ether(dst="ff:ff:ff:ff:ff:ff") / ARP(
    op=2,
    pdst="192.168.1.10",   # Target IP to poison
    psrc="192.168.1.1",    # IP we're claiming to own (gateway)
    hwsrc="de:ad:be:ef:00:01"   # Fake MAC address
)
sendp(spoofed_arp, verbose=False)
```

## Conclusion

ARP spoofing detection monitors ARP replies and compares announced IP-to-MAC mappings against a known-good table and a dynamically learned baseline. When a discrepancy is found, it indicates a potential MITM attack. For production environments, consider dedicated tools like `arpwatch` or IDS/IPS systems with ARP inspection capabilities.
