# How to Configure DSCP Marking for IPv6 Packets

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: DSCP, IPv6, QoS, Traffic Marking, Ip6tables, nftables, Linux

Description: Configure DSCP marking for IPv6 packets on Linux using ip6tables, nftables, and tc to enable differentiated service treatment for different traffic types.

---

DSCP (Differentiated Services Code Point) marking sets the DSCP bits in the IPv6 Traffic Class field to signal routers and switches how to handle packets. Properly marking IPv6 traffic enables QoS enforcement throughout the network path.

## DSCP Marking with ip6tables (mangle table)

```bash
# Basic DSCP marking rules for IPv6 using ip6tables

# Mark VoIP signaling (SIP) with CS5

sudo ip6tables -t mangle -A PREROUTING \
  -p tcp --dport 5060 \
  -j DSCP --set-dscp-class CS5

sudo ip6tables -t mangle -A PREROUTING \
  -p udp --dport 5060 \
  -j DSCP --set-dscp-class CS5

# Mark VoIP media (RTP) with EF
sudo ip6tables -t mangle -A PREROUTING \
  -p udp --dport 10000:20000 \
  -j DSCP --set-dscp 46

# Mark locally generated UDP traffic from the current user with AF41
sudo ip6tables -t mangle -A OUTPUT \
  -p udp \
  -m owner --uid-owner "$(id -u)" \
  -j DSCP --set-dscp-class AF41

# Mark interactive traffic (SSH) with AF31
sudo ip6tables -t mangle -A PREROUTING \
  -p tcp --dport 22 \
  -j DSCP --set-dscp-class AF31

# Mark bulk data with AF11
sudo ip6tables -t mangle -A PREROUTING \
  -p tcp --dport 8080:8090 \
  -j DSCP --set-dscp-class AF11

# Default: mark remaining traffic as best effort (CS0)
```

## DSCP Marking with nftables for IPv6

```bash
# /etc/nftables.conf - DSCP marking for IPv6

table ip6 mangle {
    chain prerouting {
        type filter hook prerouting priority mangle; policy accept;

        # VoIP signaling - CS5 (40)
        tcp dport 5060 ip6 dscp set cs5
        udp dport 5060 ip6 dscp set cs5

        # VoIP media - EF (46)
        udp dport 10000-20000 ip6 dscp set ef

        # Video streaming - CS3 (24)
        tcp dport { 1935, 8554 } ip6 dscp set cs3

        # Interactive - AF31 (26)
        tcp dport { 22, 23 } ip6 dscp set af31

        # HTTP/S - default best effort
        tcp dport { 80, 443 } ip6 dscp set cs0
    }

    chain postrouting {
        type filter hook postrouting priority mangle; policy accept;

        # Re-mark ICMPv6 as highest priority (CS7)
        meta l4proto ipv6-icmp ip6 dscp set cs7
    }
}
```

```bash
sudo nft -f /etc/nftables.conf
sudo nft list ruleset
```

## DSCP Marking with tc (Traffic Control)

```bash
# Use tc to mark IPv6 traffic egressing an interface

# Install iproute2
sudo apt install iproute2 -y

# Attach a clsact qdisc so filters can run on egress
sudo tc qdisc replace dev eth0 clsact

# Mark IPv6 SIP traffic with DSCP CS5 (40) on egress
# pedit writes the IPv6 Traffic Class byte; retain 0xfc preserves ECN bits

sudo tc filter add dev eth0 egress protocol ipv6 flower \
  ip_proto udp \
  dst_port 5060 \
  action pedit ex munge ip6 traffic_class set 0xa0 retain 0xfc
```

## Python Script for DSCP Policy Management

```python
#!/usr/bin/env python3
# apply_ipv6_dscp.py - Apply DSCP marking rules

import subprocess

DSCP_RULES = [
    # (protocol, port_type, port_range, dscp_class, description)
    ('udp', 'dport', '5060', 'CS5', 'SIP Signaling'),
    ('udp', 'dport', '10000:20000', '46', 'RTP Media (EF)'),
    ('tcp', 'dport', '22', 'AF31', 'SSH Interactive'),
    ('tcp', 'dport', '443', 'CS0', 'HTTPS Best Effort'),
    ('tcp', 'dport', '1935', 'CS3', 'RTMP Streaming'),
]

def apply_dscp_rule(proto, port_type, port, dscp, desc):
    """Apply ip6tables DSCP marking rule."""
    if dscp.startswith('CS') or dscp.startswith('AF') or dscp == 'EF':
        set_dscp = f'--set-dscp-class {dscp}'
    else:
        set_dscp = f'--set-dscp {dscp}'

    cmd = (
        f'ip6tables -t mangle -A PREROUTING '
        f'-p {proto} --{port_type} {port} '
        f'-j DSCP {set_dscp}'
    )
    result = subprocess.run(cmd.split(), capture_output=True)
    if result.returncode == 0:
        print(f"Applied DSCP {dscp} for {desc}")
    else:
        print(f"Error applying {desc}: {result.stderr.decode()}")

for rule in DSCP_RULES:
    apply_dscp_rule(*rule)
```

## Verifying DSCP Marking

```bash
# Capture and verify DSCP marks on IPv6 packets
sudo tcpdump -i eth0 -nn ip6 -v | grep "class 0x"

# Filter for specific DSCP values
# DSCP EF = 46 (0x2e)
sudo tcpdump -i eth0 -nn "ip6 and (ip6[0:2] & 0x0fc0 == 0x0b80)"  # EF marking

# Use tshark for structured output
sudo tshark -i eth0 -f "ip6" \
  -T fields \
  -e ipv6.src \
  -e ipv6.tclass.dscp \
  -e ipv6.nxt | head -20

# Verify marking is preserved through router
# (Check at destination that DSCP was not remarked)
```

DSCP marking for IPv6 using ip6tables, nftables, or tc enables end-to-end QoS differentiation on Linux hosts and routers, with EF marking for VoIP RTP streams and CS values for signaling and network control being common and impactful marking policies to implement.
