# How to Monitor IPv6 Adoption Progress in Your Network

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: IPv6, Adoption, Monitoring, Metric, Prometheus, Analytics

Description: A guide to tracking and visualizing IPv6 adoption progress across your network infrastructure using metrics, dashboards, and weekly reports.

Tracking IPv6 adoption progress helps organizations measure the effectiveness of their migration efforts and identify gaps where IPv4-only infrastructure remains. This guide shows how to build adoption metrics and visualizations.

## Key IPv6 Adoption Metrics

| Metric | Description | Target |
|---|---|---|
| IPv6 hosts percentage | % of servers with IPv6 addresses | 100% |
| IPv6 traffic share | % of total traffic over IPv6 | Growing |
| Dual-stack services | % of services with AAAA records | 100% |
| IPv6 endpoint uptime | Availability of IPv6 endpoints | Equal to IPv4 |
| IPv6-only reachable | Services reachable from IPv6-only clients | 100% |

## Step 1: Track IPv6 Address Assignment

```promql
# Percentage of monitored hosts with IPv6 addresses

(
  count(node_netstat_Ip6_InReceives > 0)
  /
  count(node_netstat_Ip_InReceives)
) * 100
```

```promql
# Breakdown by environment
(
  count by (environment) (
    node_netstat_Ip6_InReceives{environment=~".+"} > 0
  )
  /
  count by (environment) (
    node_netstat_Ip_InReceives{environment=~".+"}
  )
) * 100
```

## Step 2: Measure IPv6 Traffic Share

```promql
# IPv6 traffic as percentage of total IP traffic
(
  sum(rate(node_netstat_Ip6_InReceives[5m]))
  /
  (
    sum(rate(node_netstat_Ip6_InReceives[5m])) +
    sum(rate(node_netstat_Ip_InReceives[5m]))
  )
) * 100
```

## Step 3: DNS AAAA Record Coverage

```bash
#!/bin/bash
# check-aaaa-coverage.sh - Check which services have AAAA records

SERVICES=(
    "www.example.com"
    "api.example.com"
    "mail.example.com"
    "cdn.example.com"
    "app.example.com"
)

TOTAL=${#SERVICES[@]}
WITH_AAAA=0

for svc in "${SERVICES[@]}"; do
    AAAA=$(dig AAAA "$svc" +short | grep -v "^$")
    if [[ -n "$AAAA" ]]; then
        WITH_AAAA=$((WITH_AAAA + 1))
        echo "OK: $svc has AAAA: $AAAA"
    else
        echo "MISSING: $svc has no AAAA record"
    fi
done

echo ""
echo "AAAA Coverage: $WITH_AAAA / $TOTAL ($(( WITH_AAAA * 100 / TOTAL ))%)"
```

## Step 4: Weekly Adoption Report with Ansible

```yaml
# generate-ipv6-adoption-report.yml
---
- name: Generate IPv6 Adoption Progress Report
  hosts: localhost
  gather_facts: true

  tasks:
    - name: Query Prometheus for IPv6 metrics
      ansible.builtin.uri:
        url: "http://prometheus:9090/api/v1/query"
        method: POST
        body_format: form-urlencoded
        body:
          query: "count(node_netstat_Ip6_InReceives > 0) / count(node_netstat_Ip_InReceives) * 100"
      register: adoption_rate

    - name: Generate HTML report
      ansible.builtin.template:
        src: adoption-report.html.j2
        dest: "/var/www/html/ipv6-adoption-report.html"

    - name: Email the report
      community.general.mail:
        to: "leadership@example.com"
        subject: "IPv6 Adoption Progress Report - {{ ansible_date_time.date }}"
        body: "Please see the attached IPv6 adoption report."
        attach:
          - "/var/www/html/ipv6-adoption-report.html"
```

## Step 5: Grafana Adoption Dashboard

Key panels for the adoption dashboard:

```promql
# Panel 1: IPv6 adoption rate over time (Stat/Gauge)
(count(node_netstat_Ip6_InReceives > 0) / count(node_netstat_Ip_InReceives)) * 100

# Panel 2: IPv6 vs IPv4 traffic share (Time series)
rate(node_netstat_Ip6_InReceives[1h])
rate(node_netstat_Ip_InReceives[1h])

# Panel 3: IPv6 endpoint uptime comparison (Bar gauge)
avg(probe_success{job="blackbox-http-ipv6"}) * 100
avg(probe_success{job="blackbox-http-ipv4"}) * 100

# Panel 4: Services with AAAA records (custom metric from script)
ipv6_aaaa_coverage_percent
```

## Step 6: Track Against Milestones

```yaml
# adoption-milestones.yml - Track adoption against targets
milestones:
  - name: "All servers have IPv6 addresses"
    metric: "ipv6_host_percentage"
    target: 100
    deadline: "2026-06-30"

  - name: "All DNS entries have AAAA records"
    metric: "ipv6_dns_coverage_percent"
    target: 100
    deadline: "2026-09-30"

  - name: "IPv6 traffic >= 30% of total"
    metric: "ipv6_traffic_share_percent"
    target: 30
    deadline: "2026-12-31"
```

Continuous IPv6 adoption tracking with weekly reports and executive dashboards ensures the organization maintains momentum on its IPv6 migration journey and can quickly identify gaps that need attention.
