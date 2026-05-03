# How to Detect and Prevent UDP Flood Attacks

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: UDP, DDoS, Flood, Security, iptables, Linux, Networking

Description: Detect UDP flood attacks using traffic statistics and rate monitoring, and mitigate them with iptables rate limiting, kernel parameters, and connection tracking.

## Introduction

UDP flood attacks overwhelm a target by sending massive volumes of UDP packets to random ports. Since UDP is connectionless, the target must process each packet (at minimum, sending ICMP port unreachable responses), consuming CPU and bandwidth. The key to mitigation is distinguishing legitimate high-volume UDP traffic from an attack and applying targeted rate limiting.

## Detecting a UDP Flood

```bash
# Check if you're under UDP flood:

# Method 1: Watch interface statistics
watch -n 1 "ip -s link show eth0 | grep -A2 'RX:'"
# Rapidly increasing packet counter with no corresponding application load = flood

# Method 2: Monitor packet rate with nstat:
watch -n 1 "nstat | grep -E 'UdpIn|IcmpOutDestUnreachs'"
# High UdpInDatagrams with no corresponding application = flood
# High IcmpOutDestUnreachs = responding to unknown UDP ports (amplifying attack cost)

# Method 3: Top UDP sources (who is sending most):
tcpdump -i eth0 -n udp -l 2>/dev/null | \
  awk '{print $3}' | \
  cut -d. -f1-4 | \
  sort | uniq -c | sort -rn | head -20
# Shows top source IPs sending UDP

# Method 4: Check CPU and interrupt rate:
top -b -n 1 | head -5
cat /proc/interrupts | grep eth0 | awk '{print $NF, $(NF-1)}'
```

## Rate Limiting with iptables

```bash
# Limit total UDP packets to 1000 per second across all sources (global token bucket):
iptables -I INPUT -p udp -m limit --limit 1000/s --limit-burst 2000 -j ACCEPT
iptables -A INPUT -p udp -j DROP
# CAUTION: -m limit is a single global counter, not per-source. Adjust limits based on legitimate traffic.

# More targeted: rate limit UDP to specific ports under attack:
iptables -I INPUT -p udp --dport 53 -m limit --limit 5000/s --limit-burst 10000 -j ACCEPT
iptables -A INPUT -p udp --dport 53 -j DROP

# Rate limit per source IP (requires hashlimit module):
iptables -I INPUT -p udp \
  -m hashlimit \
  --hashlimit-name udp_limit \
  --hashlimit-above 100/sec \
  --hashlimit-burst 200 \
  --hashlimit-mode srcip \
  -j DROP
# Drops sources sending more than 100 UDP packets/sec
```

## Block UDP Amplification Reflection

```bash
# Common UDP amplification attack vectors:
# - DNS (port 53): amplification factor ~50x
# - NTP (port 123): amplification factor ~556x
# - SSDP (port 1900): amplification factor ~30x
# - Memcached (port 11211): amplification factor ~50000x

# Block known amplification ports if you don't use them:
iptables -A INPUT -p udp --dport 19 -j DROP    # Chargen
iptables -A INPUT -p udp --dport 1900 -j DROP  # SSDP/UPnP
iptables -A INPUT -p udp --dport 11211 -j DROP # Memcached

# For NTP: disable monlist command (the amplification vector):
# In /etc/ntp.conf:
# restrict default noquery
# disable monitor

# For DNS: rate-limit responses per client:
# In BIND /etc/named.conf:
# rate-limit { responses-per-second 10; };
```

## Kernel-Level Mitigations

```bash
# Reduce ICMP port unreachable rate (reduces amplification from our end):
sysctl -w net.ipv4.icmp_ratelimit=1000     # Min 1000ms between ICMP responses to the same target
sysctl -w net.ipv4.icmp_msgs_per_sec=1000  # Max 1000 ICMP/sec total from this host

# Increase network receive buffers to absorb bursts:
sysctl -w net.core.rmem_max=134217728      # 128 MB
sysctl -w net.core.netdev_max_backlog=50000

# Disable ICMP port unreachable responses entirely (reduces our amplification):
# iptables -A OUTPUT -p icmp --icmp-type port-unreachable -j DROP
# CAUTION: This breaks legitimate UDP service discovery

# Enable reverse path filtering (drops spoofed source IPs):
sysctl -w net.ipv4.conf.all.rp_filter=1
sysctl -w net.ipv4.conf.default.rp_filter=1
# This drops packets where the source IP would not be reachable via the incoming interface
# Effectively blocks spoofed source IP attacks
```

## Cloud/Hardware Mitigation

```bash
# For large-scale attacks, mitigation must happen upstream:

# AWS: Enable Shield Advanced for automatic UDP flood protection
# GCP: Cloud Armor Advanced Network DDoS Protection (L3/L4) for UDP floods
# CloudFlare: Magic Transit for network-layer DDoS protection

# BGP Blackholing (last resort for large attacks):
# Announce your IP to your ISP for blackholing
# This drops all traffic to that IP at the ISP level
# Only use if the IP is expendable
```

## Conclusion

UDP flood detection starts with monitoring packet rates on the interface and identifying abnormal `UdpInDatagrams` growth in `nstat`. For mitigation, use `iptables hashlimit` to rate-limit per source IP, enable reverse path filtering (`rp_filter`) to block spoofed sources, and limit ICMP port unreachable responses to reduce amplification effect. For volumetric attacks that exceed your link capacity, upstream scrubbing through your ISP or a DDoS protection service is the only effective mitigation.
