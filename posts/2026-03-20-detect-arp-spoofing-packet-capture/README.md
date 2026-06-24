# How to Detect ARP Spoofing Attacks Using Packet Capture

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: ARP Spoofing, Security, Scapy, Packet Capture, IPv4, Network Security, Python

Description: Detect ARP spoofing (ARP poisoning) attacks on your IPv4 network by monitoring ARP traffic with Scapy and identifying conflicting MAC-to-IP mappings.

## Introduction

ARP spoofing (also called ARP poisoning) is a man-in-the-middle attack where an attacker sends fake ARP packets to associate their MAC address with a legitimate IP address. This redirects traffic through the attacker's machine. Detecting it requires monitoring the network for conflicting IP-to-MAC mappings.

## How ARP Spoofing Works

```text
Normal:  Gateway (192.168.1.1) → MAC: aa:bb:cc:dd:ee:ff
Attack:  Attacker broadcasts: "192.168.1.1 is at 11:22:33:44:55:66"
Result:  Hosts send traffic for 192.168.1.1 to the attacker's MAC
```

## ARP Spoof Detector with Scapy

```python
from scapy.all import sniff, ARP, Ether
from collections import defaultdict
from datetime import datetime
import sys

class ARPSpoofDetector:
    def __init__(self):
        # Known good IP-to-MAC mappings
        # ip_to_mac[ip] = set of MAC addresses seen
        self.ip_to_mac = defaultdict(set)
        
        # Optional: pre-seed with known good entries from your network
        self.trusted = {
            "192.168.1.1": "aa:bb:cc:dd:ee:ff",   # Gateway
            "192.168.1.254": "11:22:33:44:55:66",  # Second gateway
        }
        
        # Seed the known-good map
        for ip, mac in self.trusted.items():
            self.ip_to_mac[ip].add(mac.lower())
        
        self.alerts = 0
    
    def process_packet(self, pkt):
        """Analyze each captured packet for ARP spoofing indicators."""
        if not pkt.haslayer(ARP):
            return
        
        arp = pkt[ARP]
        
        # Monitor ARP requests and replies. ARP requests also assert
        # sender IP-to-MAC mappings, and gratuitous ARP announcements
        # are commonly sent as requests.
        # op=1 = request, op=2 = reply
        if arp.op not in (1, 2):
            return
        
        sender_ip = arp.psrc
        sender_mac = arp.hwsrc.lower()
        
        # Ignore empty or broadcast addresses
        if not sender_ip or sender_ip == "0.0.0.0":
            return
        if sender_mac in ("ff:ff:ff:ff:ff:ff", "00:00:00:00:00:00"):
            return
        
        # Check for conflicting MAC
        known_macs = self.ip_to_mac[sender_ip]
        
        if known_macs and sender_mac not in known_macs:
            self.alert(sender_ip, known_macs, sender_mac, pkt)
        else:
            # First time seeing this IP or consistent MAC
            self.ip_to_mac[sender_ip].add(sender_mac)
    
    def alert(self, ip, known_macs, new_mac, pkt):
        """Generate an alert for a suspected ARP spoof."""
        self.alerts += 1
        timestamp = datetime.now().strftime("%Y-%m-%d %H:%M:%S")
        
        print(f"\n{'='*60}")
        print(f"[ALERT #{self.alerts}] Possible ARP Spoofing Detected! {timestamp}")
        print(f"  IP Address:    {ip}")
        print(f"  Known MAC(s):  {', '.join(known_macs)}")
        print(f"  New MAC:       {new_mac}")
        
        # Check if a trusted IP is being spoofed
        if ip in self.trusted:
            trusted_mac = self.trusted[ip]
            if new_mac != trusted_mac.lower():
                print(f"  [!] CRITICAL: Trusted gateway {ip} is being spoofed!")
                print(f"      Expected: {trusted_mac}")
                print(f"      Got:      {new_mac}")
        
        print(f"  Packet: {pkt.summary()}")
        print(f"{'='*60}")
    
    def print_stats(self):
        print(f"\nARP Table ({len(self.ip_to_mac)} entries):")
        for ip, macs in sorted(self.ip_to_mac.items()):
            status = "[TRUSTED]" if ip in self.trusted else ""
            if len(macs) > 1:
                status = "[CONFLICT!]"
            print(f"  {ip:<18} -> {', '.join(macs)} {status}")
        print(f"\nTotal alerts: {self.alerts}")

def main():
    interface = sys.argv[1] if len(sys.argv) > 1 else None
    
    detector = ARPSpoofDetector()
    
    print("ARP Spoof Detector started")
    print("Press Ctrl+C to stop\n")
    
    try:
        sniff(
            iface=interface,
            filter="arp",                    # Only capture ARP packets
            prn=detector.process_packet,
            store=False                      # Don't store packets in memory
        )
    except KeyboardInterrupt:
        print("\nStopped.")
        detector.print_stats()

if __name__ == "__main__":
    main()
```

## Running the Detector

```bash
# Run on a specific interface

sudo python3 arp_detect.py eth0

# Run on default interface
sudo python3 arp_detect.py
```

## Automated Response

When spoofing is detected, you can automatically:

```python
def respond_to_spoof(self, legitimate_ip, legitimate_mac):
    """Broadcast an ARP announcement with the correct mapping."""
    from scapy.all import sendp, ARP, Ether
    
    # Broadcast the correct mapping so peers on the local link can
    # refresh their ARP caches.
    correction = Ether(dst="ff:ff:ff:ff:ff:ff") / ARP(
        op=1,
        pdst=legitimate_ip,
        hwdst="00:00:00:00:00:00",
        psrc=legitimate_ip,
        hwsrc=legitimate_mac
    )
    
    # Send correction several times to overcome poisoning
    sendp(correction, count=5, inter=0.2, verbose=False)
    print(f"Sent ARP correction for {legitimate_ip} -> {legitimate_mac}")
```

## Conclusion

ARP spoofing detection by monitoring for IP-MAC conflicts is effective for spotting suspicious changes, but deciding which mapping is legitimate is more reliable when you maintain trusted MACs for critical IPs. For production environments, combine this script with Dynamic ARP Inspection (DAI) on managed switches, which validates ARP packets against DHCP snooping bindings at the switch.
