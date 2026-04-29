# How to Monitor IPsec IPv6 Tunnel Status

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: IPv6, IPsec, Monitoring, strongSwan, Prometheus

Description: Learn how to monitor IPv6 IPsec tunnel status using command-line tools, SNMP, Prometheus metrics, and automated alerting for tunnel failures.

## Overview

Monitoring IPv6 IPsec tunnels ensures you detect failures, track performance, and maintain audit records. strongSwan exposes status and events through `swanctl` and the VICI (Versatile IKE Configuration Interface) socket. For production environments, integrate with Prometheus or Nagios for alerting and dashboards.

## Basic Monitoring Commands

### strongSwan

```bash
# List all active IKE SAs

swanctl --list-sas

# Sample output:
# gw1-to-gw2: #1, ESTABLISHED, IKEv2, gw1.example.com...gw2.example.com
#   local  'gw1.example.com' @ 2001:db8:gw1::1[500]
#   remote 'gw2.example.com' @ 2001:db8:gw2::1[500]
#   AES_CBC-256/HMAC_SHA2_256_128/PRF_HMAC_SHA2_256/ECP_256
#   established 3600s ago, reauth in 25200s
#   site1-site2: #1, reqid 1, INSTALLED, TUNNEL, ESP:AES_GCM_16-256
#     installed 3598s ago, rekeying in 1s, expires in 2s
#     in  SPI c12345ab, 45892 bytes, 721 packets,  42s ago
#     out SPI ab543210, 38422 bytes, 611 packets,  38s ago
#     local  2001:db8:site1::/48
#     remote 2001:db8:site2::/48

# List active connections (configured, not necessarily up)
swanctl --list-conns

# Show statistics
swanctl --stats
```

### Linux XFRM

```bash
# Show all SAs with byte counters
ip -s xfrm state list

# Show SAs for specific tunnel
ip xfrm state list src 2001:db8:gw1::1 dst 2001:db8:gw2::1

# Monitor SA events in real-time
ip xfrm monitor

# Show SPD (security policies)
ip xfrm policy list

# Check if traffic is being encrypted (counters should increase)
watch -n 2 "ip -s xfrm state list | grep -A 3 'spi 0x'"
```

## Shell Script: Tunnel Health Check

```bash
#!/bin/bash
# check-ipv6-vpn.sh - Monitor strongSwan IPv6 tunnels

TUNNEL_NAME="site1-site2"
REMOTE_HOST="2001:db8:site2::1"
ALERT_EMAIL="noc@example.com"

check_tunnel() {
    # Check IKE SA is established
    STATUS=$(swanctl --list-sas 2>/dev/null | grep -c "ESTABLISHED")
    if [ "$STATUS" -eq 0 ]; then
        echo "CRITICAL: No IKEv2 SA established"
        return 1
    fi

    # Check CHILD SA (IPsec SA) is installed
    CHILD=$(swanctl --list-sas 2>/dev/null | grep -c "INSTALLED")
    if [ "$CHILD" -eq 0 ]; then
        echo "CRITICAL: No IPsec CHILD SA installed"
        return 1
    fi

    # Test connectivity through tunnel
    if ! ping6 -c 2 -W 3 "$REMOTE_HOST" > /dev/null 2>&1; then
        echo "CRITICAL: Cannot ping remote host through tunnel"
        return 1
    fi

    echo "OK: Tunnel $TUNNEL_NAME is up and passing traffic"
    return 0
}

if ! check_tunnel; then
    echo "Tunnel DOWN at $(date)" | mail -s "IPv6 VPN Alert" "$ALERT_EMAIL"
    # Attempt restart
    swanctl --initiate --child "$TUNNEL_NAME"
fi
```

## Prometheus Monitoring

strongSwan exposes status via its VICI socket. Use a community exporter such as `sergeymakinen/ipsec_exporter`, which subscribes to VICI and translates SA state into Prometheus metrics:

```bash
# Build from source (Go)
git clone https://github.com/sergeymakinen/ipsec_exporter
cd ipsec_exporter && make
./ipsec_exporter --collector.type=vici --vici.address=unix:///var/run/charon.vici

# Metrics available (subset):
# ipsec_up                       - 1 if the exporter could query strongSwan
# ipsec_ike_sas                  - Number of currently registered IKE SAs
# ipsec_ike_sa_state             - State of each IKE SA (per-tunnel labels)
# ipsec_ike_sa_established_seconds - Seconds since the IKE SA was established
# ipsec_child_sa_state           - State of each CHILD SA
# ipsec_child_sa_bytes_in        - Bytes received on a CHILD SA
# ipsec_child_sa_bytes_out       - Bytes sent on a CHILD SA
# ipsec_child_sa_packets_in      - Packets received on a CHILD SA
# ipsec_child_sa_packets_out     - Packets sent on a CHILD SA
```

### Prometheus Alert Rules

```yaml
# /etc/prometheus/rules/ipsec.yml
groups:
  - name: ipsec_ipv6
    rules:
      - alert: IPsecTunnelDown
        expr: ipsec_ike_sas == 0
        for: 2m
        labels:
          severity: critical
        annotations:
          summary: "IPv6 IPsec tunnel is down"
          description: "No IKE SA registered for 2+ minutes"

      - alert: IPsecNoTraffic
        expr: rate(ipsec_child_sa_bytes_out[5m]) == 0
        for: 10m
        labels:
          severity: warning
        annotations:
          summary: "No outbound traffic on IPv6 IPsec tunnel"
```

## SNMP Monitoring

strongSwan does not ship a native SNMP plugin and there is no standard IKEv2 MIB. The usual approach is to expose `swanctl` output through net-snmp's `extend` directive on the strongSwan host:

```bash
# Install net-snmp
apt install snmpd snmp

# Add an extend OID that returns the count of established IKE SAs
# Append to /etc/snmp/snmpd.conf:
extend ipsec-ikesas /bin/sh -c "swanctl --list-sas 2>/dev/null | grep -c ESTABLISHED"

systemctl restart snmpd
```

```bash
# Query via SNMP using the NET-SNMP-EXTEND-MIB
snmpwalk -v2c -c public localhost 'NET-SNMP-EXTEND-MIB::nsExtendOutLine."ipsec-ikesas"'

# Or fetch the integer result directly
snmpget -v2c -c public localhost \
  'NET-SNMP-EXTEND-MIB::nsExtendOutputFull."ipsec-ikesas"'
```

## Nagios/Icinga Check

```bash
#!/bin/bash
# check_ipsec_ipv6.sh - Nagios plugin

TUNNEL="$1"
SA_COUNT=$(swanctl --list-sas 2>/dev/null | grep -c "ESTABLISHED")

if [ "$SA_COUNT" -gt 0 ]; then
    echo "OK - $SA_COUNT IPv6 IPsec SA(s) ESTABLISHED | sas=$SA_COUNT"
    exit 0
else
    echo "CRITICAL - No IPv6 IPsec SAs established"
    exit 2
fi
```

## Summary

Monitor IPv6 IPsec tunnels with `swanctl --list-sas` (connection state), `ip -s xfrm state list` (byte counters), and `ip xfrm monitor` (real-time events). For production, deploy a VICI-based Prometheus exporter (e.g. `sergeymakinen/ipsec_exporter`) and alert on `ipsec_ike_sas == 0`. Shell scripts can perform end-to-end verification by combining SA state checks with `ping6` tests. Always monitor both SA establishment (IKE layer) and traffic flow (IPsec layer) since an established IKE SA doesn't guarantee data is flowing.
