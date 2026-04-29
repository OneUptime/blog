# How to Write IPv6 Threat Detection Rules in SIEM

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: IPv6, SIEM, Threat Detection, Security Rules, Sigma, Detection Engineering

Description: Write effective threat detection rules for IPv6-specific attacks and anomalies using Sigma rule format and SIEM platform translations for Splunk, Elastic, and QRadar.

## IPv6-Specific Threat Categories

| Threat | Description | Detection Method |
|---|---|---|
| NDP cache overflow | Flood INCOMPLETE entries to exhaust neighbor cache | Rate: NS messages > threshold |
| Router Advertisement spoofing | Fake RA announcements to redirect traffic | Unexpected router link-local source |
| 6to4/Teredo tunneling | Bypass firewall via IPv6 tunnels | Protocol 41, UDP 3544 |
| IPv6 scanning | /64 prefix scanning to find active hosts | High ICMPv6/TCP SYN to unique /128s |
| DHCPv6 starvation | Exhaust DHCPv6 address pool | Rate: Solicit from unique client IDs (DUIDs) |
| IPv6 header manipulation | Extension header abuse | Unusual header chains |

## Sigma Rule Format for IPv6 Threats

```yaml
# sigma-ndp-flood.yml

# Detect NDP cache overflow attack

title: IPv6 Neighbor Solicitation
name: ipv6_ndp_neighbor_solicitation
logsource:
    category: network
    product: firewall
detection:
    selection:
        ip_version: ipv6
        protocol: icmpv6
        icmpv6_type: 135  # Neighbor Solicitation
    condition: selection

---
title: NDP Cache Overflow Attack
id: a1b2c3d4-e5f6-7890-abcd-ef1234567890
status: stable
description: Detects high rate of ICMPv6 Neighbor Solicitation messages
  indicating a possible NDP cache exhaustion attack
author: Security Team
date: 2026-03-20
tags:
    - attack.impact
    - attack.t1498  # Network Denial of Service
correlation:
    type: event_count
    rules:
        - ipv6_ndp_neighbor_solicitation
    group-by:
        - dst_ip
    timespan: 1m
    condition:
        gte: 300
falsepositives:
    - Large network with many hosts restarting simultaneously
level: high
```

```yaml
# sigma-rogue-ra.yml
# Detect Rogue Router Advertisement

title: Rogue IPv6 Router Advertisement
id: b2c3d4e5-f6a7-8901-bcde-f12345678901
status: stable
description: Detects ICMPv6 Router Advertisement from unauthorized source
author: Security Team
date: 2026-03-20
tags:
    - attack.t1557  # Adversary-in-the-Middle
logsource:
    category: network
    product: firewall
detection:
    selection:
        protocol: icmpv6
        icmpv6_type: 134  # Router Advertisement
    filter_legitimate:
        src_ip:
            - 'fe80::1'
            - 'fe80::2'
    condition: selection and not filter_legitimate
falsepositives:
    - New router deployment
    - Misconfigured radvd
level: high
```

## Splunk: IPv6 Threat Detection SPL

```text
index=firewall protocol=tcp action=drop
| where cidrmatch("::/0", src_ip) AND NOT cidrmatch("::ffff:0:0/96", src_ip)
| bin _time span=5m
| stats dc(dst_ip) as unique_dests, count as packets by src_ip, _time
| where unique_dests > 50
| eval threat="IPv6_port_scan"
| table _time, src_ip, unique_dests, packets, threat
| sort -unique_dests
```

```text
index=firewall protocol=icmpv6 icmpv6_type=135
| bin _time span=1m
| stats count as ns_count, dc(src_ip) as sources by dst_ip, _time
| where ns_count > 300
| eval severity=if(ns_count > 1000, "critical", "high")
| table _time, dst_ip, ns_count, sources, severity
```

```text
index=network
| where (proto=41 OR (proto=17 AND dst_port=3544))
| stats count by src_ip, dst_ip, proto
| eval tunnel_type=if(proto=41, "proto41_ipv6_encap", "Teredo")
| table src_ip, dst_ip, tunnel_type, count
| sort -count
```

## Elastic: Detection Rule YAML

```yaml
# Elastic Security detection rule for IPv6 scan
name: IPv6 Port Scan Detected
description: Detects potential IPv6 port scanning activity
risk_score: 73
severity: high
type: threshold
language: kuery
index:
  - packetbeat-*
  - logs-*
query: >
  event.category: "network" and
  network.type: "ipv6" and
  event.action: ("deny" or "drop" or "blocked") and
  not source.ip: ("fc00::/7" or "fe80::/10")
threshold:
  field:
    - source.ip
  value: 50
  cardinality:
    - field: destination.ip
      value: 50
from: now-5m
interval: 1m

---
# Rogue RA rule
name: Rogue IPv6 Router Advertisement
description: ICMPv6 RA from non-router source
type: eql
language: eql
index:
  - packetbeat-*
  - logs-*
query: |
  network where
    network.type == "ipv6" and
    network.transport == "ipv6-icmp" and
    icmp.type == 134 and
    not cidrMatch(source.ip, "fe80::1/128", "fe80::2/128")
```

## Sigma-to-Platform Conversion

```bash
# Install sigma CLI tool
python -m pip install sigma-cli

# Install Splunk and Elastic backend plugins
sigma plugin install splunk
sigma plugin install elasticsearch

# Install the QRadar AQL backend package
python -m pip install ibm-qradar-aql

# Convert a base Sigma rule to Splunk SPL
sigma convert -t splunk \
    sigma-rogue-ra.yml

# Convert a base Sigma rule to Elasticsearch EQL
sigma convert -t elasticsearch -f eql \
    sigma-rogue-ra.yml

# Convert a base Sigma rule to QRadar AQL
sigma convert -t ibm-qradar-aql -p qradar-aql-fields \
    sigma-rogue-ra.yml

# Convert a correlation rule in a backend that supports Sigma correlations
sigma convert -t splunk \
    sigma-ndp-flood.yml
```

## Tuning Rules to Reduce False Positives

```yaml
# Base rule with tuning parameters
title: IPv6 Internal Scanning Base Rule
name: ipv6_internal_scanning_base
detection:
    selection:
        src_ip|cidr: '::/0'
        dst_ip|cidr: '2001:db8:2000::/48'
        event.action: 'deny'
    filter_internal_scanners:
        # Exclude known security scanners
        src_ip|cidr:
            - '2001:db8:3000:100::/64'
    filter_backup_systems:
        # Exclude backup traffic patterns
        dst_port:
            - 445
            - 139
        src_ip|cidr:
            - '2001:db8:4000::/48'
    condition: selection and not (filter_internal_scanners or filter_backup_systems)

---
title: IPv6 Internal Scanning
correlation:
    type: value_count
    rules:
        - ipv6_internal_scanning_base
    group-by:
        - src_ip
    timespan: 5m
    condition:
        field: dst_ip
        gte: 20
```

## Conclusion

Effective IPv6 threat detection requires understanding IPv6-specific attack vectors. Use Sigma format for platform-independent base rules, and use Sigma correlations where the target backend supports them. The most critical rules to deploy: NDP flood detection (NS rate per target > 300/min), rogue RA detection (RA from non-router link-local sources), and IPv6 scanning (> 50 unique /128 destinations from one source IP in 5 minutes). Filter noise by whitelisting known infrastructure, security scanners, and backup systems. Always include `not filter_legitimate` in RA rules so only unexpected router link-local addresses alert.
