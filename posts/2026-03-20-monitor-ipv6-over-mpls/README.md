# How to Monitor IPv6 over MPLS

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: IPv6, MPLS, Monitoring, OAM, BFD, LSP Ping, Traceroute, SNMP

Description: Monitor IPv6 traffic traversing MPLS networks using MPLS OAM tools, BFD for fast failure detection, LSP ping/traceroute for path verification, and SNMP MIBs for IPv6-over-MPLS statistics.

---

Monitoring IPv6 over MPLS requires both IPv6 and MPLS OAM (Operations, Administration, and Maintenance) tools. MPLS LSP ping/traceroute verifies label-switched path health, BFD provides sub-second failure detection, and SNMP MIBs expose IPv6 VPN and LSP statistics.

## MPLS LSP Ping/Traceroute for 6PE/6VPE

```bash
# Cisco IOS - LSP ping for IPv6 prefix (6PE)

ping mpls ipv6 2001:db8:site-b::/48 verbose
# Sends MPLS OAM probe along the label-switched path
# Verifies PE2 can reach the IPv6 prefix with correct labels

# LSP traceroute for IPv6 prefix
traceroute mpls ipv6 2001:db8:site-b::/48 verbose
# Shows each hop with label info:
# Tracing MPLS Label Switched Path to 2001:db8:site-b::/48
# 1  10.1.1.2   [MPLS: Label 16 Exp 0] 4 ms
# 2  10.2.2.2   [MPLS: Label 17 Exp 0] 8 ms
# 3  10.0.0.2   [MPLS: Label 17 Exp 0] 12 ms (Egress)

# LSP ping for VPN (6VPE)
ping mpls ipv6 vrf CUSTOMER-A 2001:db8:site-b::/48
```

## BFD for 6PE/6VPE LSP Monitoring

```bash
# Configure BFD for MPLS LSP failure detection

# Cisco IOS - BFD on MPLS sessions
# For 6PE BGP sessions
router bgp 65000
 address-family ipv6
  neighbor 10.0.0.2 fall-over bfd
  # BFD detects PE2 failure in <1 second

# BFD on IPv6 BGP neighbors (CE-PE)
router bgp 65000
 address-family ipv6 vrf CUSTOMER-A
  neighbor 2001:db8:pe1-cea::2 fall-over bfd

# Configure BFD parameters
bfd-template single-hop FAST-BFD
 interval min-tx 100 min-rx 100 multiplier 3

# Apply to BGP neighbors
interface GigabitEthernet0/1
 bfd template FAST-BFD

# Check BFD sessions
show bfd neighbors
# State should show: Up
# LD/RD: local discriminator / remote discriminator
```

## SNMP Monitoring for IPv6 MPLS

```bash
# Configure SNMPv3 on PE routers
snmp-server view FULL-VIEW iso included
snmp-server group MONITOR-GROUP v3 priv read FULL-VIEW
snmp-server user MONITOR MONITOR-GROUP v3 auth sha AuthPass123 priv aes 128 PrivPass456

# Query MPLS LSP statistics via SNMP
# MPLS-LSR-STD-MIB: mplsInSegmentTable, mplsOutSegmentTable

# MPLS In-Segment octets (bytes received on LSP)
snmpwalk -v3 -u MONITOR -a SHA -A AuthPass123 -x AES -X PrivPass456 \
  -l authPriv \
  2001:db8::pe1 \
  MPLS-LSR-STD-MIB::mplsInSegmentOctets

# MPLS Out-Segment statistics
snmpwalk -v3 -u MONITOR \
  2001:db8::pe1 \
  MPLS-LSR-STD-MIB::mplsOutSegmentOctets

# IPv6 VPN statistics (VPNv6)
# MPLS-L3VPN-STD-MIB (RFC 4382) for per-VRF route counts
snmpwalk -v3 -u MONITOR \
  2001:db8::pe1 \
  MPLS-L3VPN-STD-MIB::mplsL3VpnVrfPerfCurrNumRoutes
```

## Prometheus Monitoring for IPv6/MPLS

```python
#!/usr/bin/env python3
# mpls_ipv6_monitor.py - Monitor IPv6 over MPLS via SNMP

from prometheus_client import start_http_server, Gauge
from pysnmp.hlapi import *
import time

# Metrics
mpls_lsp_status = Gauge('mpls_lsp_up', 'MPLS LSP status', ['lsp_name', 'dest'])
ipv6_vpn_routes = Gauge('ipv6_vpn_routes', 'VPNv6 routes per VRF', ['vrf'])
bgp_session_status = Gauge('bgp_session_up', 'BGP session status', ['neighbor'])

def snmp_get(host, oid, community='public'):
    """SNMP GET helper."""
    for errorIndication, errorStatus, errorIndex, varBinds in getCmd(
        SnmpEngine(),
        CommunityData(community),
        UdpTransportTarget((host, 161)),
        ContextData(),
        ObjectType(ObjectIdentity(oid))
    ):
        if errorIndication or errorStatus:
            return None
        for varBind in varBinds:
            return varBind[1]
    return None

def check_mpls_lsp_health(pe_ip):
    """Check MPLS LSP status for IPv6 paths."""
    # MPLS-TE-STD-MIB (RFC 3812) - tunnel state
    # 1.3.6.1.2.1.10.166.3.2.2.1.35 = mplsTunnelOperStatus
    # 1 = up, 2 = down, others = transitional/unavailable
    state_oid = '1.3.6.1.2.1.10.166.3.2.2.1.35.1.0.0.0'
    state = snmp_get(pe_ip, state_oid)
    if state:
        mpls_lsp_status.labels(
            lsp_name='primary',
            dest=pe_ip
        ).set(1 if int(state) == 1 else 0)

def collect_metrics():
    pe_routers = ['10.0.0.1', '10.0.0.2']
    for pe in pe_routers:
        check_mpls_lsp_health(pe)

if __name__ == '__main__':
    start_http_server(9200)
    print("MPLS IPv6 monitor listening on :9200")
    while True:
        collect_metrics()
        time.sleep(30)
```

## Cisco IOS Show Commands for IPv6/MPLS

```bash
# End-to-end IPv6 over MPLS health checks

# Check 6PE BGP sessions
show bgp ipv6 unicast summary | include Establ
# All PE neighbors should show Established state

# Verify IPv6 routes have MPLS labels
show bgp ipv6 unicast | include 2001:db8
# Look for: *>i prefix  next-hop  ... Label: XXXX

# Check MPLS forwarding table for IPv6
show mpls forwarding-table detail | include 2001:db8

# Monitor BGP prefix count per address family
show bgp summary all | include ipv6
# ipv6 unicast: X routes

# Check for IPv6 BGP prefix flaps
show bgp ipv6 unicast flap-statistics

# Monitor BFD for LSP health
show bfd neighbors details | include IPv6|State
```

IPv6 over MPLS monitoring centers on three layers: MPLS LSP ping/traceroute to verify the label-switched path integrity, BFD sessions on BGP neighbors for sub-second failure detection, and SNMP queries to MPLS-LSR-STD-MIB for per-LSP byte/packet counters that feed capacity planning and SLA reporting.
