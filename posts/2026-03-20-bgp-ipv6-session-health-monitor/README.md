# How to Monitor BGP IPv6 Session Health

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: BGP, IPv6, Monitoring, Health, Observability

Description: Learn how to monitor BGP IPv6 session health using FRRouting statistics, SNMP, BFD, and Prometheus-based alerting.

## Overview

BGP session health monitoring is critical for detecting peering failures before they impact traffic. Key metrics include session state, prefix counts, flap frequency, hold timer status, and notification messages.

## Core FRRouting Monitoring Commands

```bash
# Quick health check - session states and prefix counts

vtysh -c "show bgp ipv6 unicast summary"

# Detailed neighbor status including uptime and reset count
vtysh -c "show bgp neighbors 2001:db8::peer"

# Show last reset reason and any BGP NOTIFICATION details
vtysh -c "show bgp neighbors 2001:db8::peer" | grep -A 2 -E "Last reset|Notification"
```

## Key Metrics to Monitor

| Metric | Healthy State | Action if Abnormal |
|--------|--------------|-------------------|
| Session state | Established | Investigate TCP/routing/firewall |
| PfxRcvd | Expected count | Check filters and peer config |
| Up/Down time | Long uptime | Investigate flapping if resetting |
| MsgRcvd/MsgSent | Increasing over time | Flat during expected keepalives/updates or sudden reset to low values warrants investigation |
| Last reset / notification | None or rare | Frequent notification-based resets indicate protocol or configuration errors |

## BGP with BFD (Bidirectional Forwarding Detection)

BFD can provide sub-second failure detection for BGP sessions, much faster than the Hold timer:

```bash
# FRRouting - Enable BFD for a BGP IPv6 neighbor
vtysh
configure terminal

bfd
 peer 2001:db8::peer local-address 2001:db8::1
  no shutdown
 exit
exit

router bgp 65001
 neighbor 2001:db8::peer bfd      ! Enable BFD
 neighbor 2001:db8::peer bfd check-control-plane-failure  ! Optional

 address-family ipv6 unicast
  neighbor 2001:db8::peer activate
 exit-address-family

end

# Verify BFD session
vtysh -c "show bfd peers"
```

## Session Flap Detection

```bash
# Show session drop count and last reset reason
vtysh -c "show bgp neighbors 2001:db8::peer" | grep -E "Connections established|Last reset|Notification"

# Enable BGP neighbor change logging
vtysh
configure terminal

router bgp 65001
 bgp log-neighbor-changes
end
```

## Prometheus Monitoring with frr-exporter

```bash
# Install and run frr-exporter with the IPv6 BGP collector enabled
# (https://github.com/tynany/frr_exporter)
frr_exporter --collector.bgp6 --web.listen-address=":9342"

# Key BGP IPv6 metrics exposed (filter on afi="ipv6", safi="unicast"):
# frr_bgp_peer_groups_count_total
# frr_bgp_peer_state                        ← 1 = Established, 0 = down, 2 = administratively down
# frr_bgp_peer_message_received_total
# frr_bgp_peer_message_sent_total
# frr_bgp_peer_prefixes_received_count_total
```

## Prometheus Alert Rules

```yaml
# prometheus-alerts.yml
groups:
  - name: bgp_ipv6
    rules:
      - alert: BGPSessionDown
        expr: frr_bgp_peer_state{afi="ipv6",safi="unicast"} == 0
        for: 1m
        labels:
          severity: critical
        annotations:
          summary: "BGP IPv6 session down: {{ $labels.peer }}"

      - alert: BGPPrefixCountDrop
        expr: delta(frr_bgp_peer_prefixes_received_count_total{afi="ipv6",safi="unicast"}[5m]) < -100
        for: 2m
        labels:
          severity: warning
        annotations:
          summary: "BGP IPv6 prefix count dropped significantly"
```

## SNMP Monitoring

```bash
# FRR SNMP monitoring requires FRR built with --enable-snmp, `agentx` enabled,
# and a master SNMP agent. FRR supports BGP4-MIB (RFC 4273) and the draft
# BGP4V2-MIB for IPv6-capable peer tables.
# bgpPeerState / bgp4V2PeerState: 1=idle, 2=connect, 3=active, 4=opensent, 5=openconfirm, 6=established

# Walk the peer tables first to discover the exact peer index used by your agent
snmpwalk -v2c -c public router-ip BGP4-MIB::bgpPeerTable
snmpwalk -v2c -c public router-ip BGP4V2-MIB::bgp4V2PeerTable
```

## Automated Session Recovery Script

```bash
#!/bin/bash
# Check BGP session and alert if down

PEER="2001:db8::peer"
STATE=$(vtysh -c "show bgp neighbors $PEER" | sed -n 's/.*BGP state = \([^,(]*\).*/\1/p' | xargs)

if [ "$STATE" != "Established" ]; then
    echo "ALERT: BGP IPv6 session to $PEER is $STATE" | \
    mail -s "BGP Alert" ops@example.com

    # Optional: Force a reconnect
    vtysh -c "clear bgp ipv6 unicast $PEER"
fi
```

## Summary

Monitor BGP IPv6 health with `show bgp ipv6 unicast summary` for session states, BFD for sub-second failure detection, and Prometheus/frr-exporter for continuous metrics. Set alerts for session state changes and significant prefix count drops. Log all BGP notification messages to understand the cause of session resets.
