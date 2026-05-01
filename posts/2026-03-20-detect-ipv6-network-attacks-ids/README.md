# How to Detect IPv6-Based Network Attacks with IDS

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: IPv6, IDS, Network Security, Attack Detection, Security, Intrusion Detection

Description: Identify and detect common IPv6-specific network attacks using IDS tools, covering Router Advertisement attacks, NDP spoofing, IPv6 header manipulation, and tunneling threats.

---

IPv6 introduces several new attack vectors that traditional IPv4-focused IDS systems may miss. Understanding IPv6-specific attack patterns enables security teams to write effective detection rules and respond to threats targeting IPv6 infrastructure.

## Common IPv6-Specific Attacks

### 1. Rogue Router Advertisement (RA) Attacks

```bash
# Rogue RA sends fake default route to all hosts

# Attacker becomes default gateway (MITM)

# Detection with tcpdump
sudo tcpdump -i eth0 -nn -v "icmp6 and ip6[40] == 134"

# Suricata rule to log Router Advertisements
# alert icmpv6 any any -> any any \
#   (msg:"ICMPv6 Router Advertisement observed"; itype:134; sid:1; rev:2;)

# RA Guard is typically enforced on switches; on a Linux host you can log RAs
sudo ip6tables -A INPUT -p ipv6-icmp --icmpv6-type router-advertisement \
  -j LOG --log-prefix "IPv6-RA: "
```

### 2. Neighbor Discovery Protocol (NDP) Spoofing

```bash
# NDP Spoofing = IPv6 equivalent of ARP poisoning

# Detect Neighbor Solicitations and Advertisements
sudo tcpdump -i eth0 -nn "icmp6 and (ip6[40] == 135 or ip6[40] == 136)"

# Check neighbor cache for anomalies
ip -6 neigh show | sort

# Monitor for NDP changes
watch -n 2 'ip -6 neigh show | sort'

# Built-in neighbor table monitor
ip -6 monitor neigh
```

### 3. IPv6 Extension Header Attacks

```bash
# Fragmentation attack - bypass IDS
# Send malicious payload split across fragments

# Detect fragmentation attempts
sudo tcpdump -i eth0 -nn "ip6 protochain 44"  # Match Fragment headers in the IPv6 header chain

# Check for unusual extension headers
sudo tcpdump -i eth0 -nn "ip6[6] == 0"   # Hop-by-hop options

# Suricata detection
# alert ipv6 any any -> any any \
#   (msg:"IPv6 Fragment Header observed"; ipv6.hdr; content:"|2c|"; offset:6; depth:1; \
#    threshold: type threshold, track by_src, count 100, seconds 5; \
#    sid:2; rev:2;)
```

### 4. IPv6 Tunneling (6in4, Teredo, ISATAP)

```bash
# Detect IPv6-in-IPv4 tunneling (protocol 41)
sudo tcpdump -i eth0 -nn "ip proto 41"

# Detect Teredo tunneling (UDP 3544)
sudo tcpdump -i eth0 -nn "udp port 3544"

# Detect deprecated 6to4 anycast relay usage
sudo tcpdump -i eth0 -nn "dst 192.88.99.1"

# Block unauthorized tunnels with iptables
sudo iptables -A INPUT -p 41 -j LOG --log-prefix "IPv6-TUNNEL: "
sudo iptables -A INPUT -p 41 -j DROP
```

### 5. Amplification Attacks

```bash
# ICMPv6 amplification via multicast
# Attacker sends to ff02::1 (all nodes)

# Detect multicast amplification attempts
sudo tcpdump -i eth0 -nn "ip6 dst ff02::1 and icmp6"

# Limit ICMPv6 echo replies without dropping essential ICMPv6 control traffic
sudo ip6tables -A OUTPUT -p ipv6-icmp --icmpv6-type echo-reply \
  -m limit --limit 100/second \
  -j ACCEPT
sudo ip6tables -A OUTPUT -p ipv6-icmp --icmpv6-type echo-reply -j DROP
```

## Monitoring Tools for IPv6 Attack Detection

```bash
# Built-in neighbor table monitor
ip -6 monitor neigh

# ipv6toolkit - security assessment tools
sudo apt install ipv6toolkit -y
sudo scan6 -i eth0 -L  # Scan for IPv6 hosts on the local link

# THC-IPv6 tools (for testing)
# sudo apt install thc-ipv6 -y

# Monitor with SIEM
# Common locations; paths vary by installation:
# /var/log/suricata/eve.json
# /opt/zeek/logs/current/notice.log
```

## Setting Up Detection Baselines

```bash
# Record normal IPv6 traffic patterns
sudo tcpdump -i eth0 -nn ip6 -w /tmp/baseline.pcap -G 3600 -W 1

# Analyze baseline
tcpdump -r /tmp/baseline.pcap -nn | \
  awk '{print $3}' | sed -E 's/\.[0-9]+$//' | sort | uniq -c | sort -rn | head -20

# Compare against anomalies
diff <(tcpdump -r /tmp/baseline.pcap -nn | awk '{print $3}' | sed -E 's/\.[0-9]+$//' | sort -u) \
     <(tcpdump -r /tmp/current.pcap -nn | awk '{print $3}' | sed -E 's/\.[0-9]+$//' | sort -u)
```

IPv6-specific attacks like Rogue Router Advertisements, NDP spoofing, and extension header manipulation require dedicated detection rules beyond what generic IDS configurations provide, making IPv6-aware rule writing and network monitoring essential for complete security coverage.
