# How to Set Up IPv6 Uptime Monitoring

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: IPv6, Uptime Monitoring, OneUptime, Prometheus, Blackbox Exporter, Availability

Description: A guide to setting up comprehensive IPv6 uptime monitoring for websites and services using OneUptime, Prometheus Blackbox Exporter, and simple shell scripts.

IPv6 uptime monitoring must be done explicitly - an IPv4 uptime check does not verify IPv6 reachability. This guide covers multiple approaches to monitor IPv6 endpoints for availability, response time, and certificate validity.

## Why IPv6 Uptime Monitoring Matters

Many services are dual-stack but only monitored over IPv4. If an IPv6-specific issue occurs (misconfigured route, expired RA, firewall rule change), IPv4 checks continue to pass while IPv6 users experience outages. Explicit IPv6 uptime monitoring closes this gap.

## Method 1: OneUptime for IPv6 Uptime Monitoring

[OneUptime](https://oneuptime.com) supports IPv6 endpoint monitoring from multiple global probe locations:

1. Log in to OneUptime
2. Navigate to **Monitors → Create Monitor**
3. Select **Website Monitor** for HTTP/HTTPS checks, or **Ping Monitor** / **IP Monitor** for reachability checks
4. For a Website Monitor, enter the IPv6 endpoint URL: `http://[2001:db8::10]:80/`
5. Set check interval (e.g., every 1 minute)
6. Configure alert notifications

To verify IPv6 explicitly, use a URL with the literal IPv6 address or monitor the IPv6 address directly with a Ping or IP monitor.

## Method 2: Prometheus Blackbox Exporter

```yaml
# prometheus.yml - Monitor IPv6 endpoints with Blackbox Exporter

scrape_configs:
  - job_name: "ipv6-uptime"
    metrics_path: /probe
    params:
      module: [http_ipv6_strict]
    static_configs:
      - targets:
          - "https://www.example.com"
          - "https://api.example.com"
    relabel_configs:
      - source_labels: [__address__]
        target_label: __param_target
      - source_labels: [__param_target]
        target_label: instance
      - target_label: __address__
        replacement: "127.0.0.1:9115"
```

```yaml
# blackbox.yml
modules:
  http_ipv6_strict:
    prober: http
    http:
      preferred_ip_protocol: "ip6"
      ip_protocol_fallback: false
      valid_status_codes: [200, 301, 302]
```

Uptime alert:

```yaml
- alert: IPv6ServiceDown
  expr: probe_success{job="ipv6-uptime"} == 0
  for: 1m
  annotations:
    summary: "IPv6 endpoint {{ $labels.instance }} is DOWN"
```

## Method 3: Simple Shell Script Uptime Check

```bash
#!/bin/bash
# check-ipv6-uptime.sh - Simple IPv6 uptime check script

ENDPOINTS=(
    "https://www.example.com"
    "https://api.example.com"
    "http://[2001:db8::10]:80/"
)

ALERT_EMAIL="ops@example.com"
FAILURES=0

for url in "${ENDPOINTS[@]}"; do
    # Use curl with IPv6 flag and timeout
    HTTP_CODE=$(curl -6 --max-time 10 -o /dev/null -s -w "%{http_code}" "$url")

    if [[ "$HTTP_CODE" -ge 200 && "$HTTP_CODE" -lt 400 ]]; then
        echo "OK: $url (HTTP $HTTP_CODE)"
    else
        echo "FAIL: $url (HTTP $HTTP_CODE)"
        FAILURES=$((FAILURES + 1))
        # Send alert
        echo "IPv6 uptime check FAILED for $url (HTTP $HTTP_CODE)" | \
            mail -s "IPv6 Uptime Alert" "$ALERT_EMAIL"
    fi
done

exit $FAILURES
```

## Method 4: UptimeRobot or Better Stack (External)

Configure an external monitoring service that supports IPv6:
- Enter the IPv6 URL: `http://[2001:db8::10]/`
- If the service offers an IP version setting, select IPv6
- Choose the shortest interval your plan supports (for example, 1 minute)
- Enable notifications for downtime

## Dual-Stack Comparison Monitoring

Monitor both IPv4 and IPv6 and compare:

```promql
# Alert if IPv6 is down but IPv4 is up (address-family-specific failure)
probe_success{job="ipv6-uptime", instance="https://www.example.com"} == 0
and on(instance)
probe_success{job="ipv4-uptime", instance="https://www.example.com"} == 1
```

This pattern detects IPv6-specific outages that would be invisible to IPv4-only monitoring.

## Recommended Monitoring Stack

| Layer | Tool | Purpose |
|---|---|---|
| External | OneUptime / UptimeRobot / Better Stack | Global IPv6 reachability from multiple regions |
| Internal | Prometheus + Blackbox | Detailed metrics and alerting |
| DNS | dig AAAA checks | Verify AAAA records are resolving |
| Certificate | Blackbox SSL check | Expiry monitoring for IPv6 HTTPS endpoints |

Combining external IPv6 uptime checks from multiple global locations with internal Prometheus monitoring provides the most complete picture of IPv6 service availability.
