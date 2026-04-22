# How to Configure SecurityOnion for IPv6

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: SecurityOnion, IPv6, NSM, IDS, Network Security Monitoring, SOC

Description: Configure Security Onion network security monitoring platform to capture, analyze, and alert on IPv6 network traffic across your enterprise network.

---

Security Onion is a free and open platform for threat hunting, enterprise security monitoring, and log management. It integrates Suricata, Zeek, and Elastic Stack to provide comprehensive IPv6 network visibility.

## Installing Security Onion

```bash
# Security Onion is typically installed from ISO

# Download from: https://securityonionsolutions.com/software

# After installation, Security Onion Setup starts automatically.
# If you need to restart it manually:
sudo SecurityOnion/setup/so-setup iso

# Choose: IMPORT, EVAL, STANDALONE, or DISTRIBUTED
# Configure management interface
# Configure monitoring interface (for sniffing)
```

## Configuring Security Onion for IPv6 Monitoring

```bash
# Check current network configuration
ip -6 addr show

# Configure monitoring interface (promiscuous mode)
sudo ip link set eth1 promisc on

# Security Onion stores generated config in /opt/so/conf/
# Most files there are Salt-managed, so configure HOME_NET in SOC:
# Administration -> Configuration -> Suricata -> config -> vars -> address-groups -> HOME_NET
# Administration -> Configuration -> Zeek -> config -> networks -> HOME_NET
ls /opt/so/conf/
```

```yaml
# Suricata HOME_NET/EXTERNAL_NET values as shown in SOC Configuration
vars:
  address-groups:
    HOME_NET: "[192.168.0.0/16,10.0.0.0/8,172.16.0.0/12,2001:db8::/32,fd00::/8]"
    EXTERNAL_NET: any
```

## Adding IPv6 Detection Rules in Security Onion

```bash
# Security Onion NIDS rules are managed in SOC Detections.
# Test custom rules on a node that runs Suricata before adding them.

sudo tee /tmp/so-ipv6-local.rules > /dev/null << 'EOF'
# IPv6 ICMPv6 RA flood detection
alert icmpv6 any any -> [ff02::/16,$HOME_NET] any \
  (msg:"SO IPv6 RA Flood Detected"; itype:134; \
   threshold: type threshold, track by_src, count 10, seconds 5; \
   sid:9900001; rev:1;)

# IPv6 address scan detection
alert icmpv6 any any -> [ff02::/16,$HOME_NET] any \
  (msg:"SO IPv6 Address Scan NS Flood"; itype:135; \
   threshold: type threshold, track by_src, count 50, seconds 10; \
   sid:9900002; rev:1;)
EOF

# Test the rule file with a PCAP that should trigger it
sudo so-suricata-testrule /tmp/so-ipv6-local.rules /path/to/ipv6-test.pcap

# Add the tested rules in SOC:
# Detections -> + -> Language: Suricata -> paste signature -> CREATE
# Then wait for deployment or run Detections -> Options -> Suricata -> FULL UPDATE
```

## Zeek IPv6 Analysis in Security Onion

```bash
# View Zeek conn.log for IPv6 connections
sudo jq -r 'select((."id.orig_h" // "" | contains(":")) or (."id.resp_h" // "" | contains(":"))) |
  [.ts, ."id.orig_h", ."id.resp_h", .proto] | @tsv' \
  /nsm/zeek/logs/current/conn.log | head -20

# IPv6 DNS queries (AAAA records)
sudo jq -r 'select(.qtype_name == "AAAA") |
  [.ts, ."id.orig_h", .query, (.answers // [] | join(","))] | @tsv' \
  /nsm/zeek/logs/current/dns.log | head -20

# IPv6 HTTP traffic
sudo jq -r 'select((."id.orig_h" // "" | contains(":")) or (."id.resp_h" // "" | contains(":"))) |
  [.ts, ."id.orig_h", ."id.resp_h", .host, .uri] | @tsv' \
  /nsm/zeek/logs/current/http.log | head -20
```

## Using Security Onion Console for IPv6 Investigation

```bash
# Access Security Onion Console (SOC)
# Navigate to https://<manager-ip>

# Search for IPv6 events in Hunt, Dashboards, or Kibana
# Query: network.type:"ipv6"
# CIDR query example: source.ip:2001:db8::/32 OR destination.ip:2001:db8::/32

# Use Hunt for IPv6 threat hunting
# Query: network.type: "ipv6"
```

## IPv6 PCAP Capture in Security Onion

```bash
# Capture IPv6 traffic
sudo tcpdump -i eth1 -nn -s 0 -w /tmp/ipv6-capture.pcap ip6

# Replay PCAP for rule testing
sudo so-import-pcap /tmp/ipv6-capture.pcap

# Download PCAP from Security Onion
# Use the PCAP action in Alerts, Dashboards, or Hunt
```

## Network Sensor Deployment for IPv6

```bash
# For distributed deployments, configure sensors to monitor IPv6 VLANs
# If you need to add a monitor interface after Setup:
sudo so-monitor-add

# Verify sensor is capturing IPv6
sudo tcpdump -i bond0 -nn ip6 -c 5
```

## Alerting on IPv6 Threats

```bash
# View recent IPv6 NIDS alerts in SOC Alerts or Hunt
# Query: event.module:"suricata" AND event.dataset:"alert" AND network.type:"ipv6"

# Command-line query example
so-elasticsearch-query 'logs-*/_search?q=event.module:suricata%20AND%20event.dataset:alert%20AND%20network.type:ipv6'

# Check service health
sudo so-status

# Outbound email notifications require Security Onion Pro and are configured in:
# Administration -> Configuration -> ElastAlert / SOC notification settings
```

Security Onion's integrated Suricata, Zeek, and Elastic Stack provide a complete platform for IPv6 network security monitoring, with the `HOME_NET` variables in Suricata and Zeek configuration being the primary customization points for defining your IPv6 address space.
