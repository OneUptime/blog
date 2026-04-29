# How to Detect IPv6 Network Scanning

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: IPv6, Network Scanning, Security Detection, SIEM, Threat Detection, Suricata

Description: Detect IPv6 network scanning activity including /64 prefix scanning, ICMPv6 probes, and port scans using firewall logs, IDS signatures, and SIEM correlation.

## IPv6 Scanning Characteristics

IPv6 scanning differs fundamentally from IPv4 scanning:

| Aspect | IPv4 | IPv6 |
|---|---|---|
| Subnet size | /24 = 256 hosts | /64 = 18 quintillion |
| Sequential scan | Common | Impractical |
| Multicast probing | Rare | On-link all-nodes (ff02::1) is quick |
| Hitlist scanning | Less common | Primary method |
| DNS enumeration | Secondary | Primary reconnaissance |

Attackers targeting IPv6 use: on-link all-nodes multicast ping, DNS zone transfer, search engines (Shodan), and addresses from leaked IPv6 logs.

## Detection Method 1: Firewall Drop Rate

```text
# High rate of drops to unique /128 destinations = scanning

# Splunk: detect IPv6 port scanning

index=firewall action=drop network_type=ipv6
| bin _time span=5m
| stats
    dc(dst_ip) as unique_dests,
    dc(dst_port) as unique_ports,
    count as total_drops
    by src_ip, _time
| where unique_dests > 30 OR unique_ports > 20
| eval scan_type=case(
    unique_dests > 30 AND unique_ports < 5, "host_scan",
    unique_ports > 20 AND unique_dests < 5, "port_scan",
    unique_dests > 10 AND unique_ports > 10, "combined_scan"
)
| table _time, src_ip, unique_dests, unique_ports, total_drops, scan_type
```

## Detection Method 2: ICMPv6 Echo Probing

```bash
# Suricata: detect ICMPv6 echo probing and TCP SYN scans
# /etc/suricata/rules/ipv6-scan.rules

# Detect ICMPv6 echo to all-nodes multicast on the local link
alert ip any any -> ff02::1 any (
    msg:"IPv6 All-Nodes Multicast Ping - Reconnaissance";
    ip_proto:58;
    itype:128;
    threshold: type both, track by_src, count 5, seconds 10;
    sid:9001001; rev:2;
    classtype:network-scan;
)

# Detect high-rate ICMPv6 echo probing to IPv6 hosts
alert ip $EXTERNAL_NET any -> $HOME_NET any (
    msg:"High-Rate ICMPv6 Echo Probing";
    ip_proto:58;
    itype:128;
    threshold: type threshold, track by_src, count 50, seconds 60;
    sid:9001002; rev:2;
    classtype:network-scan;
)

# Detect high-rate TCP SYN probing to IPv6 hosts
alert tcp $EXTERNAL_NET any -> $HOME_NET any (
    msg:"IPv6 TCP SYN Probing";
    tcp.flags:S,CE;
    threshold: type threshold, track by_src, count 30, seconds 30;
    sid:9001003; rev:2;
    classtype:network-scan;
)
```

## Detection Method 3: DNS Reconnaissance

```text
# Attackers enumerate IPv6 by DNS zone transfer or AAAA queries

# Splunk: detect DNS enumeration for IPv6 hosts
index=dns query_type=AAAA
| bin _time span=1m
| stats
    dc(query_name) as unique_queries,
    count as total_queries
    by src_ip, _time
| where unique_queries > 100
| eval threat="DNS_IPv6_Enumeration"
| table _time, src_ip, unique_queries, total_queries, threat

# Detect DNS zone transfer attempts
index=dns query_type=AXFR
| stats count by src_ip, query_name
| where count > 0
| eval threat="DNS_Zone_Transfer_Attempt"
```

## Detection Method 4: NDP-Based Host Discovery

```bash
# Attackers on the same L2 segment can send Neighbor Solicitations (NS)
# to solicited-node multicast addresses to discover active IPv6 hosts.
# On Linux, monitor inbound NS rate instead of relying on INCOMPLETE NDP entries.

# Monitor inbound Neighbor Solicitation rate
#!/bin/bash
PREV_COUNT=$(nstat -asz 2>/dev/null | awk '/Icmp6InNeighborSolicits/ {print $2; found=1} END {if (!found) print 0}')
while true; do
    CURRENT=$(nstat -asz 2>/dev/null | awk '/Icmp6InNeighborSolicits/ {print $2; found=1} END {if (!found) print 0}')
    DELTA=$((CURRENT - PREV_COUNT))

    if [ ${DELTA} -gt 50 ]; then
        echo "$(date): ALERT: ${DELTA} inbound Neighbor Solicitations in 30s"
        echo "Total inbound NS: ${CURRENT}"
        echo "Use packet capture or firewall logs to identify source addresses"
    fi

    PREV_COUNT=${CURRENT}
    sleep 30
done
```

## Sigma Rule: IPv6 Scanning

```yaml
title: IPv6 Probe Event
name: ipv6_probe_event
status: stable
description: Detects IPv6 multicast ping or denied IPv6 probe events that can feed scan correlation
author: Security Team
date: 2026-03-20
tags:
    - attack.reconnaissance
    - attack.t1595.001
logsource:
    category: network
    product: firewall
detection:
    multicast_probe:
        dst_ip: 'ff02::1'
        protocol: icmpv6
        icmpv6_type: 128
    denied_unicast_probe:
        ip_version: ipv6
        event.action: 'deny'
    condition: multicast_probe or denied_unicast_probe
falsepositives:
    - Network management tools (Nagios, SNMP discovery)
    - IPv6 reachability testing
level: low
---
title: IPv6 Host Discovery Scan
id: c3d4e5f6-a7b8-9012-cdef-123456789012
status: stable
description: Detects repeated denied IPv6 probes from one source to many destinations
author: Security Team
date: 2026-03-20
tags:
    - attack.reconnaissance
    - attack.t1595.001
correlation:
    type: value_count
    rules:
        - ipv6_probe_event
    group-by:
        - src_ip
    timespan: 1m
    condition:
        field: dst_ip
        gt: 30
falsepositives:
    - Network management tools (Nagios, SNMP discovery)
    - IPv6 reachability testing
level: medium
```

## Automated Blocking Response

```bash
#!/bin/bash
# auto-block-ipv6-scanner.sh - Block detected scanners via ip6tables

THRESHOLD=50       # dropped packets from one source in today's log window
CHECK_INTERVAL=60  # seconds

# Requires: ip6tables LOG output or equivalent firewall log parsing
while true; do
    # Get top IPv6 sources with drops from today's log
    # (Using a log file example - replace with live firewall query as needed)
    SCANNERS=$(grep -E "$(date '+%b %e')" /var/log/ip6tables.log | \
        grep " DROP " | \
        grep -o 'SRC=[^ ]*' | sed 's/^SRC=//' | \
        sort | uniq -c | sort -rn | \
        awk -v threshold="${THRESHOLD}" '$1 > threshold {print $2}')

    for SCANNER in ${SCANNERS}; do
        # Check if already blocked
        if ! ip6tables -C INPUT -s "${SCANNER}" -j DROP 2>/dev/null; then
            echo "$(date): Blocking IPv6 scanner: ${SCANNER}"
            ip6tables -I INPUT -s "${SCANNER}" -j DROP
            ip6tables -I FORWARD -s "${SCANNER}" -j DROP

            # Auto-unblock after 1 hour
            (
                sleep 3600
                ip6tables -D INPUT -s "${SCANNER}" -j DROP 2>/dev/null
                ip6tables -D FORWARD -s "${SCANNER}" -j DROP 2>/dev/null
            ) &
        fi
    done

    sleep ${CHECK_INTERVAL}
done
```

## Conclusion

IPv6 scanning detection requires different thresholds than IPv4 due to the vast address space. Key detection signals: drops to > 30 unique /128 destinations from one source in 5 minutes (host scan), > 20 unique ports to one destination (port scan), ICMPv6 echo to ff02::1 on the local link (multicast reconnaissance), DNS AAAA bulk queries > 100/minute (DNS enumeration). Suricata rules using `threshold: type threshold, track by_src` provide efficient IDS-side detection. Correlate bursts of inbound Neighbor Solicitations with SIEM events to detect NDP-based host discovery on local links. Use /64 prefix grouping for attribution - IPv6 scanner may rotate between /128 addresses within a /64.
