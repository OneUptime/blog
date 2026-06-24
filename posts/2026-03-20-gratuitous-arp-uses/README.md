# How to Understand Gratuitous ARP and Its Uses

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Networking, ARP, IPv4, High Availability

Description: Learn what gratuitous ARP is, when it is used, and how it helps with failover, IP conflict detection, and cache updates.

## What Is Gratuitous ARP?

A Gratuitous ARP is an ARP request or reply where a host announces its own IP-to-MAC mapping without being asked. The key characteristic:

- In the common ARP request form, **Sender IP = Target IP** (the host is asking/announcing about itself)
- Commonly sent as an Ethernet broadcast

## Why Send a Gratuitous ARP?

1. **Address conflict signaling/defense**: A conflicting ARP seen after the announcement can reveal a duplicate IP address, but standards-based duplicate address detection uses ARP Probes before the address is assigned.
2. **ARP cache update**: Helps neighbors update stale ARP caches when a MAC address changes.
3. **Failover/HA notification**: In HA setups (VRRP, HSRP), the new active gateway announces the virtual IP-to-MAC mapping.
4. **NIC initialization**: Hosts often send gratuitous ARP when a network interface comes up.

## Gratuitous ARP Format

```text
Gratuitous ARP Request:
  Ethernet Destination: ff:ff:ff:ff:ff:ff  (broadcast)
  Sender MAC:            aa:bb:cc:dd:ee:01  (new or announcing host)
  Sender IP:             192.168.1.1
  Target MAC:            00:00:00:00:00:00  (ignored / typically zeroed)
  Target IP:             192.168.1.1        (same as sender IP)
  Operation:             1 (Request)

Some tools can also send it as an unsolicited ARP Reply:
  Ethernet Destination: ff:ff:ff:ff:ff:ff  (broadcast)
  Operation:             2 (Reply)
```

## Sending Gratuitous ARP on Linux

```bash
# Using arping (send 1 gratuitous ARP on eth0)

arping -A -c 1 -I eth0 192.168.1.10

# Using arping (update neighbors)
arping -U -c 1 -I eth0 192.168.1.10
# -A: ARP Reply mode (gratuitous reply)
# -U: Unsolicited ARP Request mode (gratuitous request)
```

## Sending Gratuitous ARP with Scapy

```python
from scapy.all import ARP, Ether, sendp

def send_gratuitous_arp(ip, iface='eth0'):
    """Send a gratuitous ARP request announcing our own IP."""
    pkt = Ether(dst='ff:ff:ff:ff:ff:ff') / ARP(
        op=1,         # ARP Request
        psrc=ip,      # Sender IP = our IP
        pdst=ip,      # Target IP = same (gratuitous)
        hwdst='00:00:00:00:00:00'
    )
    sendp(pkt, iface=iface, verbose=True)

send_gratuitous_arp('192.168.1.10')
```

## Gratuitous ARP in VRRP/HSRP Failover

When a VRRP/HSRP standby router takes over as the active gateway:

```mermaid
sequenceDiagram
    participant Active as Old Active Router
    participant Standby as New Active Router
    participant Hosts as All LAN Hosts

    Active->>Active: Fails
    Standby->>Hosts: Gratuitous ARP: "192.168.1.1 is at the virtual MAC"
    Note over Hosts: All hosts update ARP cache for gateway IP
    Hosts->>Standby: Traffic flows to new active router
```

## Detecting Gratuitous ARP with tcpdump

```bash
# Capture gratuitous ARP requests (Sender IP = Target IP)
tcpdump -n -e 'arp and arp[6:2] = 1 and arp[14:4] = arp[24:4]'
```

In Wireshark, filter with:

```text
arp.isgratuitous == true
```

## Detecting Duplicate IPs with an ARP Probe

```python
from scapy.all import ARP, Ether, srp

def check_ip_conflict(ip, iface='eth0'):
    """Send an ARP Probe and check for replies (indicates IP conflict)."""
    pkt = Ether(dst='ff:ff:ff:ff:ff:ff') / ARP(
        op=1,
        psrc='0.0.0.0',
        pdst=ip,
        hwdst='00:00:00:00:00:00'
    )
    result, _ = srp(pkt, timeout=2, iface=iface, verbose=False)
    if result:
        for _, rcv in result:
            print(f"WARNING: IP conflict! {ip} is already used by {rcv[ARP].hwsrc}")
    else:
        print(f"No conflict detected for {ip}")

check_ip_conflict('192.168.1.50')
```

## Key Takeaways

- In the common ARP-request form, gratuitous ARP has the same Sender IP and Target IP.
- Standards-based duplicate-address detection uses ARP Probes; gratuitous ARP is mainly used for announcements, ARP cache updates, and HA failover.
- `arping -U` sends gratuitous ARP requests; `arping -A` sends gratuitous ARP replies.
- VRRP and HSRP both use gratuitous ARP when a new active router takes over.

**Related Reading:**

- [How to Understand ARP Request and Reply Messages](https://oneuptime.com/blog/post/2026-03-20-arp-request-reply-messages/view)
- [How to Configure Proxy ARP on a Router](https://oneuptime.com/blog/post/2026-03-20-configure-proxy-arp-linux-ipv4/view)
- [How to Detect Duplicate IP Addresses Using ARP](https://oneuptime.com/blog/post/2026-03-20-detect-duplicate-ip-arp/view)
