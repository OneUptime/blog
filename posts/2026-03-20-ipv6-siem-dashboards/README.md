# How to Build IPv6 Security Dashboards in SIEM

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: IPv6, SIEM, Dashboard, Security Monitoring, Grafana, Kibana, Splunk

Description: Design and build effective IPv6 security dashboards in Splunk, Kibana, and Grafana to visualize traffic patterns, threats, and protocol health at a glance.

## Dashboard Design Principles for IPv6

IPv6 dashboards need to account for:
- **Address space size**: /64 prefixes are often more meaningful than individual /128s
- **Address types**: global, ULA, link-local, multicast each have distinct behaviors
- **Protocol specifics**: NDP and RA are IPv6-specific control-plane mechanisms, and DHCPv6 behaves differently from DHCPv4
- **Dual-stack coexistence**: show IPv4 vs IPv6 split in traffic

## Panel 1: IPv6 vs IPv4 Traffic Split

```text
# Splunk: traffic version split (timechart)

index=firewall
| eval ip_version=if(match(src_ip, ":"), "IPv6", "IPv4")
| timechart span=1h count by ip_version

# Grafana/Prometheus query:
# sum(rate(firewall_packets_total[5m])) by (ip_version)
```

## Panel 2: IPv6 Address Type Distribution

```text
# Splunk: classify source address types
index=firewall src_ip="*:*"
| eval addr_type=case(
    cidrmatch("::1/128", src_ip), "loopback",
    cidrmatch("fe80::/10", src_ip), "link-local",
    cidrmatch("fc00::/7", src_ip), "ula",
    cidrmatch("ff00::/8", src_ip), "multicast",
    cidrmatch("2002::/16", src_ip), "6to4",
    cidrmatch("::ffff:0:0/96", src_ip), "ipv4-mapped",
    true(), "global"
)
| stats count by addr_type
| sort -count

# Visualization: pie chart or donut chart
# Baseline against your own environment; there is no universal healthy ratio
# for global, link-local, ULA, and other IPv6 traffic.
```

## Panel 3: Top IPv6 /64 Source Prefixes

```text
# Splunk: aggregate by a normalized /64 field (more meaningful than /128)
# Precompute src_prefix64 at ingest time because compressed IPv6 text is not
# reliable to split with a simple regex.
index=firewall src_prefix64=*
| stats count as events, dc(dst_ip) as unique_dests by src_prefix64
| sort -events
| head 20

# Kibana Vega / Elasticsearch: IPv6 prefix treemap
{
  "size": 0,
  "aggs": {
    "top_prefixes": {
      "ip_prefix": {
        "field": "source.ip",
        "prefix_length": 64,
        "append_prefix_length": true
      }
    }
  }
}
```

## Panel 4: NDP Protocol Health

```text
# Splunk: NDP message type breakdown
index=firewall protocol=icmpv6
| eval ndp_type=case(
    icmpv6_type=133, "Router Solicitation",
    icmpv6_type=134, "Router Advertisement",
    icmpv6_type=135, "Neighbor Solicitation",
    icmpv6_type=136, "Neighbor Advertisement",
    icmpv6_type=137, "Redirect",
    true(), "Other ICMPv6"
)
| timechart span=5m count by ndp_type

# Alert thresholds to annotate:
# NS > 500/min = potential flood
# RA from unexpected source = rogue RA
```

## Panel 5: IPv6 Security Events

```text
# Splunk: security events over time, categorized
(index=security OR index=ids) (src_ip="*:*" OR dest_ip="*:*")
| eval event_category=case(
    match(description, "(?i)scan"), "Scanning",
    match(description, "(?i)(rogue.*RA|RA.*spoof)"), "Rogue RA",
    match(description, "(?i)(NDP.*flood|NS.*flood)"), "NDP Flood",
    match(description, "(?i)poisoning"), "Cache Poisoning",
    match(description, "(?i)exfil"), "Data Exfiltration",
    true(), "Other"
)
| timechart span=1h count by event_category

# Color coding:
# Scanning: yellow (medium severity)
# Rogue RA: red (critical)
# NDP Flood: red (critical)
# Cache Poisoning: red (critical)
```

## Panel 6: Denied IPv6 Connections by Country

```text
# Splunk: geo-lookup for IPv6 sources
index=firewall action=drop src_ip="*:*"
| iplocation src_ip
| stats count by Country
| geom geo_countries featureIdField="Country"

# Note: IP geolocation is approximate, and internal/link-local/ULA addresses
# will not resolve to a country.
# Splunk ships dbip-city-lite.mmdb and supports GeoIP2-City.mmdb uploads when
# you need more accurate city/country data.
```

## Grafana Dashboard: IPv6 Infrastructure Metrics

```yaml
# Illustrative panel/query layout for Grafana
# Add these queries to dashboard panels; this is not a full dashboard export.

panels:
  - title: "IPv6 Traffic Rate"
    type: timeseries
    targets:
      - expr: 'sum(rate(network_bytes_total{ip_version="ipv6"}[5m])) by (interface)'

  - title: "NDP Cache Size"
    type: gauge
    targets:
      - expr: 'ndp_cache_total{iface="eth0"}'
    # Example if neigh/default/gc_thresh3 remains at the Linux default of 1024.
    thresholds:
      - value: 820
        color: yellow
      - value: 922
        color: red

  - title: "Active IPv6 RADIUS Sessions"
    type: stat
    targets:
      - expr: 'radius_ipv6_sessions'

  - title: "NDP Message Rate"
    type: timeseries
    targets:
      - expr: 'rate(ndp_messages_total{type="neighbor_solicitation"}[1m])'
      - expr: 'rate(ndp_messages_total{type="router_advertisement"}[1m])'

  - title: "Security Alerts by Type"
    type: bargauge
    targets:
      - expr: 'sum(increase(security_alerts_total{ip_version="ipv6"}[1h])) by (alert_type)'
```

## Kibana: IPv6 Security Overview Dashboard

```text
# Build these panels with Kibana Lens and Maps:
# - Metric: KQL `network.type: ipv6`
# - Area chart: KQL `network.type: ipv6`, break down by `event.action`
# - Data table: KQL `network.type: ipv6 AND event.action: deny`,
#   columns `source.ip` and Count
# - Map: use `source.geo.location` for point maps, or join on
#   `source.geo.country_iso_code` for a region map
```

## Conclusion

Effective IPv6 security dashboards require IPv6-aware panel design. Use /64 prefix aggregation for top-source panels - individual /128 addresses are often ephemeral due to privacy extensions. Always show the IPv4/IPv6 traffic split to track dual-stack adoption. Include NDP health panels (NS/NA/RA rates) alongside traditional connection metrics - NDP anomalies are IPv6-specific control-plane signals that deserve dedicated visibility beyond IPv4 flow metrics. In Grafana, define thresholds on NDP cache size relative to `gc_thresh3` (> 80% = yellow, > 90% = red; on Linux's default `gc_thresh3` of 1024, that is about 820 and 922). In Kibana, use the `ip_prefix` aggregation at /64 for prefix and volume analysis.
