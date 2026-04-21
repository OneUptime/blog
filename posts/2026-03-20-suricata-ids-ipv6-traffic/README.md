# How to Configure Suricata IDS/IPS for IPv6 Traffic

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Suricata, IDS, IPS, IPv6, Network Security, Intrusion Detection, Linux

Description: Configure Suricata intrusion detection and prevention system to monitor and analyze IPv6 network traffic, including rules, logging, and inline IPS mode.

---

Suricata is a high-performance Network IDS, IPS, and Network Security Monitoring engine. It natively supports IPv6 inspection and can monitor, detect, and block threats in IPv6 traffic with the same capabilities as IPv4.

## Installing Suricata

```bash
# Ubuntu/Debian

sudo apt install suricata -y

# RHEL/CentOS
sudo dnf install -y epel-release dnf-plugins-core
sudo dnf -y copr enable @oisf/suricata-8.0
sudo dnf install -y suricata

# Check version
suricata -V

# Update rules (Emerging Threats)
sudo suricata-update
```

## Configuring Suricata for IPv6

```yaml
# /etc/suricata/suricata.yaml

# Network variables - define IPv6 address groups
vars:
  address-groups:
    HOME_NET: "[192.168.0.0/16,10.0.0.0/8,2001:db8::/32,fd00::/8]"
    EXTERNAL_NET: "!$HOME_NET"
    HTTP_SERVERS: "$HOME_NET"
    DNS_SERVERS: "[8.8.8.8,8.8.4.4,2001:4860:4860::8888]"

  port-groups:
    HTTP_PORTS: "80"
    HTTPS_PORTS: "443"
    DNS_PORTS: "53"

# Interface configuration
af-packet:
  - interface: eth0
    cluster-id: 99
    cluster-type: cluster_flow
    defrag: yes
    use-mmap: yes
    tpacket-v3: yes
```

## IPv6-Specific Detection Rules

```bash
# /etc/suricata/rules/local.rules

# Detect IPv6 Hop-by-Hop Options header bursts
alert ipv6 any any -> $HOME_NET any \
  (msg:"IPv6 Hop-by-Hop Options Header Burst"; \
   ipv6.hdr; content:"|00|"; offset:6; depth:1; \
   threshold: type threshold, track by_src, count 20, seconds 10; \
   sid:9000001; rev:1;)

# Detect ICMPv6 router advertisement flooding
alert icmpv6 any any -> [$HOME_NET,ff02::/16] any \
  (msg:"ICMPv6 Router Advertisement Flood"; \
   itype:134; \
   threshold: type threshold, track by_src, count 10, seconds 5; \
   sid:9000002; rev:1;)

# Detect IPv6 Neighbor Discovery spoofing
alert icmpv6 any any -> [$HOME_NET,ff02::/16] any \
  (msg:"Suspicious ICMPv6 Neighbor Advertisement"; \
   itype:136; \
   sid:9000003; rev:1;)

# Detect IPv4-mapped IPv6 source addresses
alert ipv6 ::ffff:0:0/96 any -> any any \
  (msg:"IPv4-Mapped IPv6 Source Address Detected"; \
   sid:9000004; rev:1;)
```

## Running Suricata in IDS Mode

```bash
# IDS mode - monitor interface
sudo suricata -c /etc/suricata/suricata.yaml -i eth0

# Run as daemon
sudo suricata -c /etc/suricata/suricata.yaml -i eth0 -D

# Check stats
sudo tail -f /var/log/suricata/stats.log

# Watch alerts
sudo tail -f /var/log/suricata/fast.log
```

## Running Suricata in Inline IPS Mode

```bash
# IPS mode using NFQ (Netfilter Queue)
# Configure iptables to send IPv6 traffic to Suricata
sudo ip6tables -I FORWARD -j NFQUEUE --queue-num 0
sudo ip6tables -I INPUT -j NFQUEUE --queue-num 0
sudo ip6tables -I OUTPUT -j NFQUEUE --queue-num 0

# Start Suricata in IPS mode
sudo suricata -c /etc/suricata/suricata.yaml -q 0

# IPS mode with AF_PACKET (requires two interfaces)
# In suricata.yaml:
# af-packet:
#   - interface: eth0
#     cluster-id: 98
#     cluster-type: cluster_flow
#     defrag: no
#     copy-mode: ips
#     copy-iface: eth1
#   - interface: eth1
#     cluster-id: 97
#     cluster-type: cluster_flow
#     defrag: no
#     copy-mode: ips
#     copy-iface: eth0
# stream:
#   inline: auto
```

## Systemd Service for Suricata

```ini
# /etc/systemd/system/suricata.service
[Unit]
Description=Suricata IDS/IPS
After=network-online.target

[Service]
Type=forking
ExecStart=/usr/bin/suricata -c /etc/suricata/suricata.yaml -i eth0 -D --pidfile /run/suricata.pid
ExecReload=/bin/kill -USR2 $MAINPID
PIDFile=/run/suricata.pid

[Install]
WantedBy=multi-user.target
```

## Analyzing Suricata IPv6 Logs

```bash
# View alerts with IPv6 context
sudo cat /var/log/suricata/eve.json | python3 -c "
import sys, json
for line in sys.stdin:
    e = json.loads(line)
    if e.get('event_type') == 'alert':
        src = e.get('src_ip','')
        if ':' in src:  # IPv6
            print(f'{src} -> {e[\"dest_ip\"]} : {e[\"alert\"][\"signature\"]}')
"

# Filter IPv6 events with jq
sudo cat /var/log/suricata/eve.json | jq 'select((.src_ip? // "") | contains(":"))' | head
```

Suricata's native IPv6 support enables comprehensive intrusion detection across all IP versions, with the `HOME_NET` variable being the key configuration point for defining your IPv6 address space to properly classify internal versus external traffic.
