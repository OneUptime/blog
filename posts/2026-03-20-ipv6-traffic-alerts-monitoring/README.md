# How to Create IPv6 Traffic Alerts in Monitoring Systems

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: IPv6, Alerting, Prometheus, Grafana, Monitoring, Network Operations

Description: A guide to creating meaningful IPv6 traffic alerts in Prometheus and Grafana that detect anomalies, failures, and capacity issues.

Effective IPv6 alerting requires monitoring for both failures (endpoint down, routing issues) and anomalies (traffic spikes, sudden drops, latency increases). This guide covers practical alert rules for IPv6 environments.

These examples assume the blackbox exporter modules used for IPv6 checks set `preferred_ip_protocol: ip6` and `ip_protocol_fallback: false`, so probes do not silently fall back to IPv4.

## Alert Category 1: IPv6 Endpoint Availability

```yaml
# alerts-ipv6-availability.yml

groups:
  - name: ipv6-availability
    rules:
      # HTTP endpoint down over IPv6
      - alert: IPv6HTTPDown
        expr: probe_success{job="blackbox-http-ipv6"} == 0
        for: 2m
        labels:
          severity: critical
          category: availability
        annotations:
          summary: "IPv6 HTTP endpoint {{ $labels.instance }} is DOWN"
          runbook: "https://wiki.example.com/runbooks/ipv6-endpoint-down"

      # ICMP probe failing over IPv6
      - alert: IPv6PingFailing
        expr: probe_success{job="blackbox-icmp-ipv6"} == 0
        for: 3m
        labels:
          severity: warning
        annotations:
          summary: "IPv6 ICMP to {{ $labels.instance }} is failing"
```

## Alert Category 2: IPv6 Routing Issues

The following host-side rules assume `node_exporter`'s `netstat` collector is configured to expose the `Ip6_*` counters used here via `--collector.netstat.fields`.

```yaml
      # No-route errors indicate IPv6 routing failures
      - alert: IPv6NoRouteErrors
        expr: rate(node_netstat_Ip6_OutNoRoutes[5m]) > 5
        for: 5m
        labels:
          severity: warning
          category: routing
        annotations:
          summary: "IPv6 routing failures on {{ $labels.instance }}"

      # IPv6 source fragmentation failures can indicate MTU-related issues
      - alert: IPv6FragmentationFailures
        expr: rate(node_netstat_Ip6_FragFails[5m]) > 10
        for: 5m
        labels:
          severity: warning
          category: routing
        annotations:
          summary: "IPv6 source fragmentation failures on {{ $labels.instance }}"
```

## Alert Category 3: IPv6 Traffic Anomalies

```yaml
      # Sudden drop in IPv6 traffic (could indicate routing issue)
      - alert: IPv6TrafficDrop
        expr: >
          (
            rate(node_netstat_Ip6_InOctets[5m]) <
            rate(node_netstat_Ip6_InOctets[1h] offset 1h) * 0.1
          )
          and
          rate(node_netstat_Ip6_InOctets[1h] offset 1h) > 100
        for: 10m
        labels:
          severity: warning
        annotations:
          summary: "IPv6 traffic dropped significantly on {{ $labels.instance }}"

      # IPv6 traffic spike (possible DDoS or misconfiguration)
      - alert: IPv6TrafficSpike
        expr: >
          rate(node_netstat_Ip6_InOctets[5m]) >
          rate(node_netstat_Ip6_InOctets[1h] offset 1h) * 5
        for: 5m
        labels:
          severity: warning
        annotations:
          summary: "IPv6 traffic spike on {{ $labels.instance }}"
```

## Alert Category 4: IPv6 BGP Session Alerts

The following examples use Calico's documented BGP metrics.

```yaml
      # IPv6 BGP peers are down
      - alert: IPv6BGPSessionDown
        expr: bgp_peers{status="Down", ip_version="IPv6"} > 0
        for: 2m
        labels:
          severity: critical
        annotations:
          summary: "IPv6 BGP peers down on {{ $labels.instance }} (count={{ $value }})"

      # Imported IPv6 route count dropped significantly
      - alert: IPv6BGPRouteCountDrop
        expr: >
          bgp_routes_imported{ip_version="IPv6"} <
          bgp_routes_imported{ip_version="IPv6"} offset 30m * 0.8
        for: 5m
        labels:
          severity: warning
        annotations:
          summary: "IPv6 BGP route count dropped on {{ $labels.instance }}"
```

## Alert Category 5: IPv6 Reachability Regression

```yaml
      # IPv6 reachability drops relative to IPv4 for the same target set
      - alert: IPv6ReachabilityRegression
        expr: >
          (
            sum(probe_success{job="blackbox-http-ipv6"}) /
            sum(probe_success{job="blackbox-http-ipv4"})
          ) < 0.95
          and
          sum(probe_success{job="blackbox-http-ipv4"}) > 0
        for: 15m
        labels:
          severity: warning
        annotations:
          summary: "IPv6 endpoint reachability is lower than IPv4 (possible regression)"
```

## Grafana Alert Rules (UI)

In Grafana Alerts & IRM → Alert rules → + New alert rule:

```text
Alert name: IPv6 Endpoint Latency High
Query: avg_over_time(probe_duration_seconds{job="blackbox-http-ipv6"}[5m])
Condition: is above 2
For: 5 minutes
Labels: severity=warning, category=latency
Contact point: ops-slack-channel
```

## Alert Delivery Configuration

```yaml
# alertmanager.yml - Route IPv6 alerts to appropriate channels
route:
  receiver: default-receiver
  group_by: ['alertname', 'instance']
  routes:
    - receiver: pagerduty-critical
      continue: true
      matchers:
        - category="availability"
        - severity="critical"
    - receiver: netops-slack
      continue: true
      matchers:
        - category="routing"
    - receiver: ipv6-team-slack
      matchers:
        - alertname=~"^IPv6.*"
```

Well-structured IPv6 traffic alerts with clear severity levels and runbook links enable rapid incident response for IPv6-specific issues before they affect a significant portion of users.
