# How to Monitor VXLAN over IPv6

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: VXLAN, IPv6, Monitoring, Prometheus, Grafana, Network Observability

Description: Monitor VXLAN overlay networks over IPv6 using Prometheus node exporter, custom scripts, and Grafana dashboards for tunnel health, throughput, and FDB table metrics.

## Key VXLAN Metrics to Monitor

| Metric | What It Reveals |
|---|---|
| Tunnel interface tx/rx bytes | Overlay throughput per VNI |
| FDB entry count | Scale of MAC learning |
| VTEP reachability | Underlay health |
| Encap error count | Hardware/software failures |
| MTU mismatch events | Fragmentation problems |
| BGP EVPN route count | Control plane health |

## Prometheus Node Exporter for VXLAN

Node exporter automatically exposes network interface metrics including VXLAN:

```yaml
# prometheus.yml - scrape node exporter on all VTEPs

scrape_configs:
  - job_name: 'vtep-nodes'
    static_configs:
      - targets:
          - '[2001:db8:1::1]:9100'
          - '[2001:db8:2::1]:9100'
          - '[2001:db8:3::1]:9100'
    relabel_configs:
      - source_labels: [__address__]
        target_label: vtep_ip
        regex: '\[(.+)\]:\d+'
        replacement: '$1'
```

```text
# Key PromQL queries for VXLAN monitoring

# VXLAN throughput per VTEP (bytes/sec)
rate(node_network_transmit_bytes_total{device=~"vxlan.*"}[5m])

# FDB table size (via textfile collector)
vxlan_fdb_entries_total

# VTEP reachability success rate
rate(vtep_ping_success_total[5m]) / rate(vtep_ping_total[5m])

# Encapsulation errors
rate(node_network_transmit_errs_total{device=~"vxlan.*"}[5m])
```

## Custom VXLAN Metrics Script

Export custom metrics via Prometheus textfile collector:

```bash
#!/bin/bash
# /usr/local/bin/vxlan-metrics.sh
# Run via cron every 30 seconds, output to node_exporter textfile dir

TEXTFILE_DIR="/var/lib/node_exporter/textfile_collector"
OUTPUT="${TEXTFILE_DIR}/vxlan_metrics.prom"

# Collect metrics
{
    echo "# HELP vxlan_fdb_entries_total Number of FDB entries per VXLAN interface"
    echo "# TYPE vxlan_fdb_entries_total gauge"

    for IFACE in $(ip link show type vxlan | grep '^[0-9]' | awk '{print $2}' | tr -d ':'); do
        COUNT=$(bridge fdb show dev ${IFACE} 2>/dev/null | grep -v permanent | wc -l)
        VNI=$(ip -d link show ${IFACE} | grep vxlan | grep -oP 'id \K[0-9]+')
        echo "vxlan_fdb_entries_total{interface=\"${IFACE}\",vni=\"${VNI}\"} ${COUNT}"
    done

    echo "# HELP vxlan_vtep_reachable_bool VTEP underlay reachability (1=up, 0=down)"
    echo "# TYPE vxlan_vtep_reachable_bool gauge"

    REMOTE_VTEPS=("2001:db8:2::1" "2001:db8:3::1")
    for VTEP in "${REMOTE_VTEPS[@]}"; do
        if ping6 -c 1 -W 2 ${VTEP} &>/dev/null; then
            echo "vxlan_vtep_reachable_bool{remote=\"${VTEP}\"} 1"
        else
            echo "vxlan_vtep_reachable_bool{remote=\"${VTEP}\"} 0"
        fi
    done

} > "${OUTPUT}.tmp" && mv "${OUTPUT}.tmp" "${OUTPUT}"
```

## Monitoring BGP EVPN Route Counts

```bash
#!/bin/bash
# Export BGP EVPN route counts for monitoring

TEXTFILE_DIR="/var/lib/node_exporter/textfile_collector"

{
    echo "# HELP bgp_evpn_routes_total BGP EVPN route counts"
    echo "# TYPE bgp_evpn_routes_total gauge"

    # FRRouting vtysh
    if command -v vtysh &>/dev/null; then
        MAC_IP=$(vtysh -c "show bgp l2vpn evpn route type macip" 2>/dev/null | grep -c "Network")
        IP_PREFIX=$(vtysh -c "show bgp l2vpn evpn route type prefix" 2>/dev/null | grep -c "Network")
        echo "bgp_evpn_routes_total{type=\"mac_ip\"} ${MAC_IP:-0}"
        echo "bgp_evpn_routes_total{type=\"ip_prefix\"} ${IP_PREFIX:-0}"
    fi

} > "${TEXTFILE_DIR}/bgp_evpn.prom"
```

## Grafana Dashboard Queries

```text
# Dashboard: VXLAN Fabric Overview

# Panel 1: Overlay throughput (bytes/sec) per VTEP
sum by (instance) (
  rate(node_network_transmit_bytes_total{device=~"vxlan.*"}[5m])
)

# Panel 2: FDB table size over time
vxlan_fdb_entries_total

# Panel 3: VTEP reachability heatmap
vxlan_vtep_reachable_bool

# Panel 4: BGP EVPN route count
bgp_evpn_routes_total

# Panel 5: Underlay VTEP-to-VTEP latency
vtep_ping_rtt_ms
```

## Alerting Rules

```yaml
# prometheus-alerts.yml
groups:
  - name: vxlan-ipv6
    rules:
      - alert: VTEPUnreachable
        expr: vxlan_vtep_reachable_bool == 0
        for: 2m
        labels:
          severity: critical
        annotations:
          summary: "VTEP {{ $labels.remote }} unreachable"

      - alert: FDBTableTooLarge
        expr: vxlan_fdb_entries_total > 10000
        for: 5m
        labels:
          severity: warning
        annotations:
          summary: "FDB table size exceeds 10k entries on {{ $labels.interface }}"

      - alert: VXLANEncapErrors
        expr: rate(node_network_transmit_errs_total{device=~"vxlan.*"}[5m]) > 10
        for: 1m
        labels:
          severity: warning
        annotations:
          summary: "VXLAN encap errors on {{ $labels.device }}"
```

## Conclusion

VXLAN over IPv6 monitoring combines standard Linux network interface metrics from Prometheus node exporter with custom scripts for VXLAN-specific data like FDB table sizes, VTEP reachability, and BGP EVPN route counts. The Prometheus textfile collector is the most practical way to expose these custom metrics. Alert on VTEP unreachability (critical) and FDB table growth (warning for capacity planning). Grafana dashboards correlate underlay IPv6 health with overlay performance.
