# How to Implement Redis SLA Monitoring

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Redis, SLA, Monitoring

Description: Learn how to implement Redis SLA monitoring by defining availability and latency targets, collecting metrics, calculating SLIs, and generating SLA compliance reports.

---

Redis SLA monitoring ensures you can measure whether your Redis deployment meets its service level agreements. This guide covers defining SLIs, collecting metrics, and building compliance reports.

## Define Your SLIs and SLOs

```text
SLI (Service Level Indicator) - What you measure:
  - Availability:    % of time Redis responds to PING within 1s
  - Latency P99:     99th percentile command latency
  - Error Rate:      % of commands returning errors
  - Throughput:      Commands per second

SLO (Service Level Objective) - Your target:
  - Availability:    >= 99.9% (43.8 min downtime/month)
  - Latency P99:     <= 5ms for GET/SET
  - Error Rate:      <= 0.1%
  - Throughput:      >= 10,000 ops/sec
```

## Availability Monitoring

```bash
#!/bin/bash
# redis-availability-check.sh
# Run every 30 seconds via cron or monitoring agent

REDIS_HOST="${1:-localhost}"
REDIS_PORT="${2:-6379}"
TIMEOUT=1
METRICS_FILE="/var/lib/node_exporter/redis_availability.prom"

START=$(date +%s%3N)
RESULT=$(timeout $TIMEOUT redis-cli -h "$REDIS_HOST" -p "$REDIS_PORT" PING 2>&1)
END=$(date +%s%3N)
LATENCY_MS=$((END - START))

if [ "$RESULT" = "PONG" ]; then
  AVAILABLE=1
else
  AVAILABLE=0
fi

cat > "$METRICS_FILE" << EOF
# HELP redis_available Redis availability (1=up, 0=down)
# TYPE redis_available gauge
redis_available{host="$REDIS_HOST"} $AVAILABLE

# HELP redis_ping_latency_ms PING latency in milliseconds
# TYPE redis_ping_latency_ms gauge
redis_ping_latency_ms{host="$REDIS_HOST"} $LATENCY_MS
EOF
```

## Prometheus Metrics Collection

Configure redis_exporter for full metrics:

```yaml
# docker-compose.yml snippet
services:
  redis-exporter:
    image: oliver006/redis_exporter:latest
    environment:
      REDIS_ADDR: "redis://redis:6379"
      REDIS_PASSWORD: "${REDIS_PASSWORD}"
    ports:
      - "9121:9121"
```

Key Prometheus queries for SLA:

```text
# Availability over 30 days
avg_over_time(redis_up[30d]) * 100

# P99 command latency
histogram_quantile(0.99, rate(redis_commands_duration_seconds_bucket[5m]))

# Error rate (requires Redis 6.2+)
rate(redis_total_error_replies[5m]) /
rate(redis_commands_processed_total[5m]) * 100
```

## Grafana Alert Rules

```yaml
# grafana-alerts.yml
groups:
  - name: redis-sla
    rules:
      - alert: RedisSLAAvailabilityBreach
        expr: avg_over_time(redis_up[1h]) < 0.999
        for: 5m
        labels:
          severity: critical
        annotations:
          summary: "Redis availability below SLA ({{ $value | humanizePercentage }})"

      - alert: RedisSLALatencyBreach
        expr: |
          histogram_quantile(0.99,
            rate(redis_commands_duration_seconds_bucket[5m])
          ) > 0.005
        for: 2m
        labels:
          severity: warning
        annotations:
          summary: "Redis P99 latency {{ $value | humanizeDuration }} exceeds 5ms SLO"
```

## Monthly SLA Report Script

```bash
#!/bin/bash
# generate-redis-sla-report.sh
PROMETHEUS_URL="${PROMETHEUS_URL:-http://prometheus:9090}"
MONTH=$(date -d "last month" +%Y-%m)

query_prometheus() {
  curl -s -G "$PROMETHEUS_URL/api/v1/query" --data-urlencode "query=$1" | \
    python3 -c "import sys,json; d=json.load(sys.stdin); print(d['data']['result'][0]['value'][1])"
}

AVAILABILITY=$(query_prometheus "avg_over_time(redis_up[30d])*100")
P99_LATENCY=$(query_prometheus "histogram_quantile(0.99,rate(redis_commands_duration_seconds_bucket[30d]))*1000")

cat << EOF
Redis SLA Report - $MONTH
==========================
Availability: ${AVAILABILITY}% (SLO: 99.9%)
P99 Latency:  ${P99_LATENCY}ms (SLO: 5ms)
EOF
```

## Summary

Redis SLA monitoring starts with defining measurable SLIs tied to availability, latency, and error rate targets. Use `redis_exporter` to expose metrics to Prometheus, build Grafana dashboards and alert rules for SLO breaches, and generate monthly compliance reports. Track your error budget consumption to know when to prioritize reliability work over feature development.
