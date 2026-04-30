# How to Configure IDS/IPS Sensor Placement for IPv6

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: IDS, IPS, IPv6, Network Security, Sensor Placement, Architecture, NSM

Description: Design and implement optimal IDS/IPS sensor placement strategies for IPv6 networks, covering traffic visibility points, dual-stack monitoring, and tunnel inspection requirements.

---

Effective IDS/IPS sensor placement for IPv6 networks requires visibility at multiple network segments, including IPv6-only links, dual-stack zones, and tunnel endpoints. Unlike many IPv4 deployments, IPv6 typically does not rely on NAT for address conservation but introduces new protocol elements requiring inspection.

## IPv6 Network Visibility Considerations

```text
Network Architecture:
  Internet (IPv6)
      |
  [Border Router] ← Sensor 1: Internet-facing (North-South)
      |
  [Firewall]
      |
  [Core Switch] ← Sensor 2: Core aggregation
  /     |    \
[DMZ] [LAN] [Server Farm] ← Sensor 3: DMZ inline IPS
              |
         [Hosts/VMs] ← Host-based IDS (Wazuh/OSSEC)
```

## Sensor 1: Internet-Facing Placement

```bash
# Configure span port on border router for sensor

# Cisco IOS example:
# monitor session 1 source interface GigabitEthernet0/0
# monitor session 1 destination interface GigabitEthernet0/1

# Sensor captures all inbound/outbound IPv6
sudo suricata -c /etc/suricata/suricata.yaml -i eth1 -D

# Capture IPv6 only
sudo tcpdump -i eth1 ip6 -w /var/log/captures/border-ipv6.pcap

# Key alerts to watch:
# - IPv6 scanning from internet
# - IPv6 tunneling (protocol 41, UDP 3544)
# - DDoS attempts over IPv6
```

## Sensor 2: Core/Aggregation Placement

```bash
# Core switch span for east-west traffic
# Zeek provides rich protocol analysis
sudo zeekctl deploy

# Monitor IPv6 inter-VLAN traffic
# /opt/zeek/etc/node.cfg
# [worker-core]
# type=worker
# host=localhost
# interface=eth2  # Core span port

# Key visibility:
# - IPv6 lateral movement
# - IPv6 service discovery (mDNS over IPv6)
# - Internal-to-internal IPv6 attacks
```

## Sensor 3: DMZ Monitoring

```bash
# Suricata inline IPS for DMZ (blocks threats)
# NFQ mode
sudo ip6tables -A FORWARD -i eth-dmz -j NFQUEUE --queue-num 0
sudo ip6tables -A FORWARD -o eth-dmz -j NFQUEUE --queue-num 0

sudo suricata -c /etc/suricata/suricata.yaml -q 0

# Critical DMZ rules to enable:
# - Web application attacks over IPv6
# - IPv6 address scanning from DMZ
# - Malicious IPv6 extension headers
```

## IPv6 Tunnel Inspection

```bash
# Teredo tunneling inspection (UDP 3544)
sudo suricata -c /etc/suricata/suricata.yaml -i eth0
# Suricata decodes Teredo by default, but its decoder can
# misidentify some non-Teredo UDP traffic

# 6in4 inspection (IPv4 protocol 41)
sudo tcpdump -i eth0 -nn "ip proto 41" -v

# ISATAP inspection (also IPv4 protocol 41)
sudo tcpdump -i eth0 -nn "ip proto 41" -v

# Log and block unauthorized tunnels at the IPv4 border
sudo iptables -A FORWARD -p udp --dport 3544 \
  -j LOG --log-prefix "TEREDO-TUNNEL: "
sudo iptables -A FORWARD -p udp --dport 3544 -j DROP
sudo iptables -A FORWARD -p 41 \
  -j LOG --log-prefix "IPV6-IN-IPV4: "
sudo iptables -A FORWARD -p 41 -j DROP
```

## Dual-Stack Sensor Configuration

```yaml
# /etc/suricata/suricata.yaml for dual-stack sensor
af-packet:
  - interface: eth0     # Dual-stack interface
    cluster-id: 99
    cluster-type: cluster_flow
    defrag: yes

vars:
  address-groups:
    # Include both IPv4 and IPv6 home networks
    HOME_NET: "[10.0.0.0/8,192.168.0.0/16,2001:db8::/32,fd00::/8]"
    EXTERNAL_NET: "!$HOME_NET"
```

## Host-Based IDS Deployment

```bash
# Deploy Wazuh agent on all IPv6-capable hosts
# After configuring the Wazuh repository:
sudo apt-get install wazuh-agent -y

# If using manual enrollment with wazuh-authd, enable IPv6 on the manager
sudo /var/ossec/bin/agent-auth -m 2001:db8::10

# Configure host-level monitoring
# /var/ossec/etc/ossec.conf
# Monitor auth.log, syslog, and ip6tables logs

sudo systemctl start wazuh-agent
```

## Monitoring Sensor Health

```bash
# Check Suricata stats
sudo cat /var/log/suricata/stats.log | grep "capture.kernel_drops"

# Zeek status
sudo zeekctl status

# Ensure no packet drops
sudo ethtool -S eth1 | grep "rx_dropped\|missed"

# Network stats
sudo ss -6 -s  # IPv6 socket summary
```

Optimal IPv6 IDS/IPS sensor placement requires coverage at internet-facing edges for inbound threat detection, core aggregation points for east-west visibility, and DMZ inline placement for active prevention, with special attention to IPv6 tunnel inspection at boundary sensors.
