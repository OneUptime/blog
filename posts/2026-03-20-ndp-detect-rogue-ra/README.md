# How to Detect Rogue Router Advertisements on IPv6 Networks

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Rogue RA, IPv6 Security, NDP Security, Network Monitoring, Router Advertisement

Description: Detect rogue Router Advertisements on IPv6 networks using passive monitoring tools, packet captures, and dedicated rogue RA detection scripts.

## Introduction

Rogue Router Advertisements (RAs) are one of the most common IPv6 attack vectors. Any host with IPv6 connectivity can send an RA and cause other hosts to add a rogue default gateway. Detecting rogue RAs requires monitoring all RA messages on the network and comparing them against a known-good list of legitimate routers. Detection tools range from simple tcpdump captures to dedicated monitoring daemons.

## What Makes an RA Rogue

```text
Indicators of a Rogue Router Advertisement:

1. Unknown source address:
   Legitimate routers: fe80::1, fe80::2 (known in advance)
   Rogue RA: fe80::bad:cafe (not in approved router list)

2. Unexpected prefix advertisement:
   Legitimate: Prefix 2001:db8::/64 on VLAN 10
   Rogue: Prefix 10.0.0.0/8 (wrong prefix for this segment)

3. High Router Lifetime with no legitimate router:
   Legitimate: RouterLifetime=1800 from known router
   Rogue: RouterLifetime=65535 (maximize persistence)

4. Router Lifetime = 0 (invalidation attack):
   Legitimate routers send positive lifetime
   Attack: RouterLifetime=0 removes all hosts' default gateway

5. RA from a host port (port should have RA Guard):
   If RA Guard is not deployed, any host can send RAs
   Detection: Compare RA source MAC against known router MACs

6. Frequency anomaly:
   Routers send RA every ~200-600 seconds (Cisco IOS default 200s, radvd default 600s)
   RA flood: hundreds of RAs per second
```

## Passive Detection with tcpdump

Use tcpdump to capture and inspect all RAs on a segment.

```bash
# Capture all Router Advertisements on eth0

sudo tcpdump -i eth0 -v "icmp6 and ip6[40] == 134"
# ICMPv6 Type 134 = Router Advertisement

# More verbose output with timestamps
sudo tcpdump -i eth0 -vvv -t "icmp6 and ip6[40] == 134" 2>&1 | \
  grep -E "source|Router Advertisement|prefix|lifetime"

# Save captures for offline analysis
sudo tcpdump -i eth0 -w /tmp/ra_capture.pcap "icmp6 and ip6[40] == 134"

# Example of legitimate RA output:
# fe80::1 > ff02::1: ICMP6, router advertisement, length 56
#   hop limit 64, Flags [managed], pref medium, router lifetime 1800s
#   prefix info option (3), length 32 (4): 2001:db8::/64
#     valid time 2592000, pref. time 604800

# Suspicious RA output:
# fe80::bad:cafe > ff02::1: ICMP6, router advertisement, length 56
#   hop limit 64, Flags [], router lifetime 65535s  ← Very long lifetime
#   prefix info option (3), length 32 (4): ::/0     ← Wrong prefix
```

## Automated Rogue RA Detection Script

This Python script monitors RAs and alerts on unexpected sources.

```python
#!/usr/bin/env python3
"""
Rogue RA detector: monitors ICMPv6 RAs and alerts on unknown sources.
Requires: scapy (pip install scapy), root privileges
"""
from scapy.all import sniff, IPv6, ICMPv6ND_RA
import datetime

# Known legitimate router link-local addresses
KNOWN_ROUTERS = {
    "fe80::1",
    "fe80::2",
}

def check_ra(packet):
    if IPv6 in packet and ICMPv6ND_RA in packet:
        src = packet[IPv6].src
        timestamp = datetime.datetime.now().isoformat()
        if src not in KNOWN_ROUTERS:
            print(f"[ALERT] {timestamp} ROGUE RA from {src}")
            print(f"  Router Lifetime: {packet[ICMPv6ND_RA].routerlifetime}")
            # Check for invalidation attack
            if packet[ICMPv6ND_RA].routerlifetime == 0:
                print(f"  [CRITICAL] RA invalidation attack!")
        else:
            print(f"[OK] {timestamp} Legitimate RA from {src}")

print("Monitoring for Router Advertisements... (Ctrl+C to stop)")
sniff(filter="icmp6", prn=check_ra, iface="eth0", store=0)
```

## Using NDPMon for Continuous Monitoring

NDPMon is a dedicated daemon for monitoring NDP traffic and detecting anomalies.

```bash
# Install ndpmon (available on Debian/Ubuntu)
sudo apt-get install ndpmon

# Configure known routers in /etc/ndpmon/config_ndpmon.xml
# Example configuration:
cat /etc/ndpmon/config_ndpmon.xml
# <config_ndpmon>
#   <routers>
#     <router>
#       <mac>00:11:22:33:44:55</mac>
#       <lla>fe80::1</lla>
#       <prefixes>
#         <prefix>
#           <address>2001:db8::</address>
#           <mask>64</mask>
#         </prefix>
#       </prefixes>
#     </router>
#   </routers>
# </config_ndpmon>

# Start ndpmon
sudo ndpmon -i eth0 -c /etc/ndpmon/config_ndpmon.xml

# NDPMon will alert on:
# - RA from unknown source
# - RA with unknown prefix
# - RA with changed parameters
# - NA spoofing detected

# Check ndpmon logs
sudo tail -f /var/log/ndpmon.log
```

## Detecting RAs with ip6tables Logging

Log all RA messages received to detect rogues via syslog.

```bash
# Log all incoming Router Advertisements
sudo ip6tables -A INPUT -p icmpv6 --icmpv6-type router-advertisement \
    -j LOG --log-prefix "RA-RECEIVED: " --log-level 4

# After logging, allow only from known routers
sudo ip6tables -A INPUT -p icmpv6 --icmpv6-type router-advertisement \
    -s fe80::1 -j ACCEPT
sudo ip6tables -A INPUT -p icmpv6 --icmpv6-type router-advertisement \
    -s fe80::2 -j ACCEPT
sudo ip6tables -A INPUT -p icmpv6 --icmpv6-type router-advertisement \
    -j LOG --log-prefix "ROGUE-RA: " --log-level 2

# Monitor syslog for ROGUE-RA entries
sudo journalctl -f | grep "ROGUE-RA"

# Or filter kernel messages
sudo dmesg | grep "ROGUE-RA"
```

## Detecting RA Floods

```bash
# Count RAs per second using tcpdump + awk
sudo tcpdump -i eth0 -l "icmp6 and ip6[40] == 134" 2>/dev/null | \
  awk 'BEGIN{t=systime(); c=0}
       {c++; if(systime()-t>=1){print c " RA/sec"; c=0; t=systime()}}'

# Normal rate: ~0.005 RA/sec (one RA every 200 seconds)
# Flood: >10 RA/sec indicates attack

# Alert if more than 5 RAs per second:
# sudo ip6tables -A INPUT -p icmpv6 --icmpv6-type router-advertisement \
#     -m hashlimit --hashlimit-above 5/second --hashlimit-burst 10 \
#     --hashlimit-name RA_FLOOD -j LOG --log-prefix "RA-FLOOD: "
```

## Response to Detected Rogue RA

```bash
# If rogue RA detected, immediately check current default routes
ip -6 route show default
# Look for unexpected default routes added by rogue RA

# Remove rogue default route (if attacker is fe80::bad%eth0)
sudo ip -6 route del default via fe80::bad dev eth0

# Flush all default routes and re-add legitimate ones
sudo ip -6 route flush default
sudo ip -6 route add default via fe80::1 dev eth0

# If switch supports RA Guard: enable it immediately
# Contact switch admin to block RA on host ports

# If RA Guard not available: block on host with ip6tables
sudo ip6tables -A INPUT -p icmpv6 --icmpv6-type router-advertisement \
    -s fe80::bad -j DROP
```

## Conclusion

Rogue RA detection requires monitoring ICMPv6 Type 134 messages and comparing sources against a known-good list of legitimate routers. Passive detection uses tcpdump or ip6tables logging. Automated detection uses scripts with Scapy or dedicated tools like NDPMon. When a rogue RA is detected, immediately flush rogue default routes and investigate the source host. Long-term, deploy RA Guard on all managed switches to prevent rogue RAs from ever reaching hosts.
