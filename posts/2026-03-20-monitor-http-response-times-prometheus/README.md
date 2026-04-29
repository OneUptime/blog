# How to Monitor HTTP Response Times with curl and Prometheus

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Prometheus, curl, Monitoring, HTTP, DevOps, Observability

Description: Learn how to measure HTTP response times using curl's write-out format and expose those metrics to Prometheus for alerting and dashboards.

## Overview

Measuring HTTP response times is fundamental to SLO monitoring. This guide combines two tools: `curl` for precise timing measurements and Prometheus for storing and querying those metrics over time.

## Measuring HTTP Timing with curl

`curl` provides granular timing variables via its `-w` (write-out) format:

```bash
# Save a reusable timing format to a file

cat > /usr/local/bin/http-timing.fmt << 'EOF'
time_namelookup=%{time_namelookup}
time_connect=%{time_connect}
time_appconnect=%{time_appconnect}
time_pretransfer=%{time_pretransfer}
time_redirect=%{time_redirect}
time_starttransfer=%{time_starttransfer}
time_total=%{time_total}
http_code=%{http_code}
EOF

# Run a timed request
curl -s -o /dev/null -w "@/usr/local/bin/http-timing.fmt" https://api.example.com/health
```

## Building a Prometheus Exporter Script

The following shell script scrapes an HTTP endpoint and exposes metrics in Prometheus text format:

```bash
#!/bin/bash
# http_probe.sh - Expose HTTP timing as Prometheus metrics

TARGET_URL="${1:-https://api.example.com/health}"
METRICS_FILE="/var/lib/node_exporter/textfile_collector/http_probe.prom"

# Run curl and capture output
RESULT=$(curl -s -o /dev/null -w \
  "time_total=%{time_total} time_starttransfer=%{time_starttransfer} http_code=%{http_code}" \
  --connect-timeout 5 --max-time 10 \
  "$TARGET_URL" 2>/dev/null)

# Parse values
TIME_TOTAL=$(echo "$RESULT" | grep -oP 'time_total=\K[0-9.]+')
TTFB=$(echo "$RESULT" | grep -oP 'time_starttransfer=\K[0-9.]+')
HTTP_CODE=$(echo "$RESULT" | grep -oP 'http_code=\K[0-9]+')
UP=$([ "$HTTP_CODE" -eq 200 ] 2>/dev/null && echo 1 || echo 0)

# Write Prometheus text format to textfile collector directory
cat > "$METRICS_FILE" << PROM
# HELP http_probe_duration_seconds Total HTTP request duration
# TYPE http_probe_duration_seconds gauge
http_probe_duration_seconds{url="$TARGET_URL"} $TIME_TOTAL

# HELP http_probe_ttfb_seconds Time to first byte
# TYPE http_probe_ttfb_seconds gauge
http_probe_ttfb_seconds{url="$TARGET_URL"} $TTFB

# HELP http_probe_up Whether the endpoint returned HTTP 200
# TYPE http_probe_up gauge
http_probe_up{url="$TARGET_URL"} $UP
PROM
```

Schedule this via cron every minute:

```bash
# Run the probe every minute
* * * * * /usr/local/bin/http_probe.sh https://api.example.com/health
```

## Using Prometheus Blackbox Exporter (Recommended)

For production, use the official `blackbox_exporter` instead of shell scripts:

```yaml
# blackbox.yml
modules:
  http_2xx:
    prober: http
    timeout: 10s
    http:
      valid_http_versions: ["HTTP/1.1", "HTTP/2.0"]
      valid_status_codes: [200]
      method: GET
      tls_config:
        insecure_skip_verify: false
```

In your Prometheus config:

```yaml
# prometheus.yml
scrape_configs:
  - job_name: blackbox_http
    metrics_path: /probe
    params:
      module: [http_2xx]
    static_configs:
      - targets:
          - https://api.example.com/health
          - https://app.example.com/
    relabel_configs:
      - source_labels: [__address__]
        target_label: __param_target
      - source_labels: [__param_target]
        target_label: instance
      - target_label: __address__
        replacement: localhost:9115  # blackbox_exporter address
```

## Useful PromQL Queries

```promql
# P95 response time over last 5 minutes
# probe_duration_seconds is a gauge, so use quantile_over_time (not histogram_quantile)
quantile_over_time(0.95, probe_duration_seconds[5m])

# Alert if any endpoint has TTFB > 1 second
probe_http_duration_seconds{phase="processing"} > 1

# Endpoint availability
avg_over_time(probe_success[5m]) < 0.99
```

## Conclusion

For quick ad-hoc measurements, `curl -w` provides all the HTTP timing detail you need. For continuous monitoring, the Prometheus Blackbox Exporter is the production-grade solution-it handles retries, TLS validation, and integrates natively with Prometheus alerting.
