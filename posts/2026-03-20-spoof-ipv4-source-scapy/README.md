# How to Spoof IPv4 Source Addresses with Scapy

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Scapy, IPv4, Security Testing, Packet Crafting, Python, Networking

Description: Craft and send IPv4 packets with spoofed source addresses using Scapy for legitimate security testing, firewall rule validation, and network research purposes.

## Introduction

IP source address spoofing is the technique of sending packets with a forged source IP address. While malicious actors use it for DDoS amplification and reflection attacks, security professionals use it legitimately to test firewall rules, validate BCP38 enforcement, and research network protocols. This guide covers Scapy-based spoofing for authorized testing only.

> **Legal and Ethical Notice**: Only send spoofed packets on networks you own or have explicit written permission to test. Unauthorized spoofing is illegal in most jurisdictions.

## Prerequisites

```bash
pip install scapy
# Root/sudo required for raw socket access
# Install libpcap/Npcap if you use BPF capture filters with sniff()

```

## Sending a Single Spoofed ICMP Packet

```python
from scapy.all import IP, ICMP, send

# Craft a packet with a spoofed source IP
pkt = IP(
    src="192.0.2.1",      # Spoofed source IP (not your real IP)
    dst="10.0.0.1"        # Target IP
) / ICMP()

# Send the packet (requires root)
send(pkt, verbose=True)
```

## Spoofed TCP SYN Packet

Useful for testing firewall SYN filtering:

```python
from scapy.all import IP, TCP, send
import random

pkt = IP(
    src="198.51.100.50",   # Spoofed source
    dst="10.0.0.10"        # Target
) / TCP(
    sport=random.randint(1024, 65535),   # Random source port
    dport=80,                             # Target port
    flags="S"                             # SYN flag only
)

send(pkt)
```

## Testing BCP38 Enforcement (Anti-Spoofing Validation)

BCP38 (Network Ingress Filtering) recommends that ISPs and network operators filter traffic from downstream networks so packets are allowed only when their source addresses can legitimately originate there. Test whether anti-spoofing is enforced at your edge or upstream provider using an authorized remote sensor or lab target:

```python
from scapy.all import IP, ICMP, send

# Send a packet with a source IP from a completely different range
# Should be dropped by your edge router or upstream provider
pkt = IP(
    src="192.0.2.123",     # TEST-NET-1 example; use an authorized non-local source in real tests
    dst="198.51.100.10"    # Authorized remote sensor or lab target
) / ICMP()

send(pkt)
# Confirm with firewall/router logs or a packet capture at the edge/remote sensor.
# A local send() call alone cannot prove that the packet left your network.
```

## Sending Multiple Spoofed Packets

```python
from scapy.all import IP, UDP, Raw, send
import ipaddress

# Send UDP packets with rotating spoofed source IPs
network = ipaddress.ip_network("203.0.113.0/24")
hosts = list(network.hosts())

for src_ip in hosts[:10]:
    pkt = IP(src=str(src_ip), dst="10.0.0.1") / UDP(dport=53) / Raw(load=b"\x00" * 10)
    send(pkt, verbose=False)
    print(f"Sent packet from {src_ip}")
```

## Validating Firewall Rules

Test that your firewall correctly drops spoofed traffic from untrusted ranges by checking firewall logs or a target-side packet capture:

```python
from scapy.all import IP, TCP, send

# Send a SYN from a private range - it should not reach the protected target
probe = IP(src="192.168.99.1", dst="10.0.0.10") / TCP(dport=443, flags="S")
send(probe, verbose=False)

print("Check firewall logs or a target-side capture; replies go to the spoofed source.")
```

## Capturing Responses to Spoofed Packets

For testing scenarios where you want to see if responses come back to the spoofed IP (reflection), capture on the host that owns the spoofed IP or on a SPAN/mirror interface:

```python
from scapy.all import sniff, IP, ICMP, send
import threading
import time

SNIFF_IFACE = "eth1"  # Replace with the spoofed-IP host interface or SPAN/mirror interface

def send_spoofed():
    pkt = IP(src="10.0.0.99", dst="10.0.0.1") / ICMP()
    send(pkt)

# Start a sniffer looking for responses to the spoofed IP
def capture():
    pkts = sniff(iface=SNIFF_IFACE, filter="icmp and dst host 10.0.0.99", count=5, timeout=3)
    for p in pkts:
        print(f"Response: {p.summary()}")

t = threading.Thread(target=capture)
t.start()
time.sleep(0.2)
send_spoofed()
t.join()
```

## Conclusion

Scapy makes IP spoofing trivially simple, which highlights why network operators must enforce BCP38 ingress filtering. Always use these techniques only in authorized test environments, and ensure your network infrastructure drops spoofed packets at the border to protect against abuse.
