# How to Monitor IPv6 BGP Sessions with Monitoring Tools

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: BGP, IPv6, Monitoring, Prometheus, SNMP, Network Operations

Description: A guide to monitoring IPv6 BGP session state, prefix counts, and flap events using Prometheus BGP exporters, SNMP, and Grafana dashboards.

BGP over IPv6 (MP-BGP with IPv6 address family) is used for internet connectivity, data center fabrics, and cloud connectivity. Monitoring BGP session state, received prefixes, and session stability is critical for operational awareness.

## Key Metrics to Monitor

| Metric | Why It Matters |
|---|---|
| Session state (Established/Idle) | Indicates if the peer is up |
| Prefixes received | Measures prefix table changes |
| BGP updates (in/out) | Traffic on the BGP control plane |
| Session uptime | Stability indicator |
| Route flap count | Instability detection |

## Method 1: SNMP BGP-MIB Monitoring

Most routers expose BGP session data via the BGP-MIB (`1.3.6.1.2.1.15`):

```bash
# Query BGP session state via SNMP for an IPv6 router

snmpwalk -v2c -c public "[2001:db8::router1]" BGP-MIB::bgpPeerState

# Query IPv6 BGP peer information from the BGP4-MIB extension
snmpwalk -v2c -c public "[2001:db8::router1]" BGP4V2-MIB::bgp4V2PeerState
```

Prometheus SNMP Exporter configuration for BGP:

```yaml
# snmp.yml - Module for BGP4V2-MIB IPv6 session monitoring
modules:
  bgp_ipv6:
    walk:
      - 1.3.6.1.3.5.1.1.2   # bgp4V2PeerTable (peer state, admin status)
    metrics:
      - name: bgp4v2_peer_state
        oid: 1.3.6.1.3.5.1.1.2.1.13
        type: gauge
        help: "BGP session state (1=idle,2=connect,3=active,4=opensent,5=openconfirm,6=established)"
      - name: bgp4v2_peer_admin_status
        oid: 1.3.6.1.3.5.1.1.2.1.12
        type: gauge
        help: "BGP peer admin status (1=halted, 2=running)"
```

## Method 2: FRR/BIRD Prometheus Exporter

For Linux-based routers running FRR or BIRD:

```bash
# Install frr_exporter (exposes FRR BGP metrics for Prometheus)
go install github.com/tynany/frr_exporter@latest

# Run the exporter
frr_exporter --frr.vtysh.path=/usr/bin/vtysh \
  --web.listen-address="[::]:9342"
```

Prometheus config:

```yaml
# prometheus.yml - Scrape FRR BGP metrics
scrape_configs:
  - job_name: "frr-bgp-ipv6"
    static_configs:
      - targets: ["[2001:db8::router1]:9342"]
    relabel_configs:
      - source_labels: [__address__]
        target_label: instance
```

## Method 3: Bird Exporter for BIRD Router

```bash
# Install bird_exporter
bird_exporter -bird.socket=/var/run/bird/bird6.ctl \
  -web.listen-address="[::]:9324"
```

## Key PromQL Queries for IPv6 BGP

```promql
# BGP session state (6 = Established)
bgp_session_state{peer=~".*:.*"}  # IPv6 peers (addresses contain colons)

# Peers that are NOT in Established state
bgp_session_state{peer=~".*:.*"} != 6

# Prefixes received per IPv6 peer
bgp_prefixes_received_count{peer=~".*:.*", afi="ipv6", safi="unicast"}

# BGP session uptime
bgp_session_uptime_seconds{peer=~".*:.*"}

# Update rate (control plane traffic)
rate(bgp_updates_received_total{peer=~".*:.*"}[5m])
```

## Grafana Dashboard for IPv6 BGP

Key panels:
1. **Session State Table** - shows all IPv6 peers with current state
2. **Prefix Count Over Time** - track received prefix count stability
3. **Update Rate** - detect BGP churn
4. **Session Uptime** - sorted ascending to spot recently reset sessions

```promql
# Panel: IPv6 BGP Peer Status Summary
count by (state) (bgp_session_state{peer=~".*:.*"})

# Panel: Top IPv6 Peers by Prefix Count
topk(10, bgp_prefixes_received_count{peer=~".*:.*", afi="ipv6"})
```

## Alert for BGP Session Down

```yaml
# alerts-bgp-ipv6.yml
groups:
  - name: bgp-ipv6
    rules:
      - alert: IPv6BGPSessionDown
        expr: bgp_session_state{peer=~".*:.*"} != 6
        for: 2m
        labels:
          severity: critical
        annotations:
          summary: "IPv6 BGP session to {{ $labels.peer }} is DOWN"
          description: "BGP state: {{ $value }} (expected 6=Established)"
```

Monitoring IPv6 BGP sessions with dedicated exporters and Prometheus alerts ensures that BGP-dependent IPv6 connectivity issues are detected within minutes, before they impact end users.
