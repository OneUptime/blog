# How to Test IPv6 Firewall Rules with Packet Crafting

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: IPv6, Firewall Testing, Packet Crafting, Security Testing, Ip6tables, Scapy

Description: A guide to testing IPv6 firewall rules using packet crafting tools to verify that ip6tables, pf, and hardware firewalls correctly filter IPv6 traffic.

Testing firewall rules with crafted packets verifies that your IPv6 firewall actually blocks what it should block - and permits what it should permit. This is especially important for IPv6 where firewalls may have incomplete rule sets compared to their IPv4 counterparts.

## Testing Methodology

```text
Blocked:  Crafted packet → Firewall → DROP/REJECT (often no response)
Permitted: Crafted packet → Firewall → Passes through
```

## Checking Existing ip6tables Rules

```bash
# View all IPv6 firewall rules

sudo ip6tables -L -n -v --line-numbers

# View specific table
sudo ip6tables -t filter -L -n -v
sudo ip6tables -t mangle -L -n -v

# Check if rules exist (common issue: IPv6 rules missing when IPv4 rules present)
sudo ip6tables -S | wc -l   # Compare IPv6 and IPv4 rule counts; a near-empty IPv6 ruleset is a red flag
sudo iptables -S | wc -l    # Compare IPv4 rule count
```

## Testing with Nping (IPv6)

```bash
# TCP SYN to blocked port (expect no response or an ICMPv6 reject)
sudo nping -6 --tcp --flags syn -p 23 2001:db8::10

# TCP SYN to allowed port (expect SYN-ACK)
sudo nping -6 --tcp --flags syn -p 443 2001:db8::10

# UDP probe
sudo nping -6 --udp -p 161 2001:db8::10
```

## Testing with Scapy

```python
from scapy.all import *
from scapy.layers.inet6 import *

target = "2001:db8::10"

# Test TCP port (expect SYN-ACK for open, RST for closed, or no response / ICMPv6 unreachable for filtered)
pkt = IPv6(dst=target) / TCP(dport=22, flags="S")
resp = sr1(pkt, timeout=2, verbose=0, iface="eth0")

if resp:
    if resp.haslayer(TCP):
        if resp[TCP].flags == "SA":
            print(f"Port 22: OPEN")
        elif resp[TCP].flags == "RA":
            print(f"Port 22: CLOSED (RST)")
    elif resp.haslayer(ICMPv6DestUnreach):
        print(f"Port 22: FILTERED (ICMPv6 unreachable)")
else:
    print(f"Port 22: FILTERED (no response)")

# Test ICMPv6 pass-through
pkt = IPv6(dst=target) / ICMPv6EchoRequest()
resp = sr1(pkt, timeout=2, verbose=0, iface="eth0")
print("ICMP Echo:", "ALLOWED" if resp else "BLOCKED")
```

## Testing Extension Header Filtering

Many firewalls have bugs in handling extension headers:

```bash
# Test RA with a Hop-by-Hop header (common RA Guard evasion case on local links)
sudo ra6 -i eth0 -H 8 -P 2001:db8:1::/64 -d ff02::1

# Test fragmented TCP probes (ensure fragments do not bypass filtering)
python3 -c "
from scapy.all import *
from scapy.layers.inet import *
from scapy.layers.inet6 import *
pkt = IPv6(dst='2001:db8::10') / TCP(dport=80, flags='S') / Raw(b'A' * 256)
for frag in fragment6(pkt, 128):
    send(frag, iface='eth0', verbose=0)
"

# Test type 0 routing header with Segments Left > 0 (should be blocked per RFC 5095)
python3 -c "
from scapy.all import *
from scapy.layers.inet6 import *
from scapy.layers.inet import *
# The IPv6 destination is the first segment; the final destination is in the RH0 list.
pkt = IPv6(dst='2001:db8::20') / IPv6ExtHdrRouting(type=0, segleft=1, addresses=['2001:db8::10']) / TCP(dport=80)
send(pkt, iface='eth0', verbose=0)
"
```

## Required ICMPv6 Types (Must Not Be Blocked)

Test that critical ICMPv6 is permitted:

```bash
# Capture Packet Too Big messages during a large transfer
sudo tcpdump -i eth0 'icmp6 and ip6[40] == 2'

# Verify by checking whether PMTUD works end-to-end
# If PTB is blocked: large HTTP transfers may hang or stall
curl -6 --max-time 10 http://[2001:db8::10]/large-file
```

## Common IPv6 Firewall Test Cases

| Test | Expected Result | Why |
|---|---|---|
| ICMPv6 Echo Request | ALLOWED | Diagnostic |
| ICMPv6 Packet Too Big | ALLOWED | PMTUD requirement |
| NDP (Types 133-136) | ALLOWED on the local link | Address configuration |
| TCP to allowed ports | ALLOWED | Application traffic |
| TCP to denied ports | DROPPED or REJECTED | Security policy |
| Routing Header Type 0 | DROPPED | RFC 5095 |
| ICMPv6 RA from non-router on guarded access ports | DROPPED | RA Guard |
| IPv6 fragments | Depends | Application-specific |

## Automated Firewall Rule Testing

```bash
#!/bin/bash
# ipv6-fw-test.sh - Test IPv6 firewall rules

TARGET="2001:db8::10"

test_port() {
  local port=$1
  local expected=$2
  result=$(nmap -6 -Pn -p "$port" --open "$TARGET" 2>/dev/null | grep -c "/tcp open")
  if [ "$result" = "$expected" ]; then
    echo "PASS: Port $port"
  else
    echo "FAIL: Port $port (expected=$expected, got=$result)"
  fi
}

# Should be open
test_port 443 1
test_port 22 1

# Should not be open
test_port 23 0
test_port 3389 0
```

Regular firewall testing with packet crafting ensures that IPv6 firewall rules are as complete and correct as IPv4 rules - a gap that often exists in organizations that added IPv6 without reviewing their complete security posture.
