# How to Monitor Terraform Enterprise Health

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Terraform, Terraform Enterprise, Monitoring, Health Check, Observability, DevOps

Description: Learn how to set up comprehensive health monitoring for Terraform Enterprise, including health endpoints, metrics collection, alerting, and dashboard creation.

---

When Terraform Enterprise goes down, every team that provisions infrastructure is blocked. Unlike many internal tools where a few hours of downtime is an inconvenience, TFE downtime can stall deployments, block CI/CD pipelines, and delay incident response. Proactive monitoring catches problems before they become outages.

This guide covers everything you need to monitor TFE effectively - from the built-in health endpoint to custom metrics, alerting rules, and dashboards.

## Built-in Health Check Endpoint

TFE exposes a health check endpoint that reports the status of its internal components:

```bash
# Basic health check
curl -s https://tfe.example.com/_health_check

# Parse the response for component status
curl -s https://tfe.example.com/_health_check | jq .

# Example healthy response:
# {
#   "passed": true,
#   "checks": {
#     "database": "ok",
#     "redis": "ok",
#     "vault": "ok",
#     "object_storage": "ok"
#   }
# }
```

This endpoint checks:

- **Database connectivity**: Can TFE reach PostgreSQL?
- **Redis connectivity**: Is the Redis connection alive?
- **Object storage**: Can TFE read and write to S3/Azure Blob/GCS?
- **Internal Vault**: Is the encryption service healthy?

Use this endpoint as your primary availability check.

## Setting Up External Health Monitoring

### HTTP Health Check Script

```bash
#!/bin/bash
# monitor-tfe-health.sh
# Run every minute via cron

TFE_URL="https://tfe.example.com"
HEALTH_ENDPOINT="${TFE_URL}/_health_check"
LOG_FILE="/var/log/tfe-health.log"
TIMESTAMP=$(date '+%Y-%m-%d %H:%M:%S')

# Make the health check request with a 10-second timeout
RESPONSE=$(curl -s -o /dev/null -w "%{http_code}" \
  --max-time 10 \
  "${HEALTH_ENDPOINT}")

if [ "${RESPONSE}" = "200" ]; then
  echo "[${TIMESTAMP}] OK - HTTP ${RESPONSE}" >> "${LOG_FILE}"
else
  echo "[${TIMESTAMP}] CRITICAL - HTTP ${RESPONSE}" >> "${LOG_FILE}"
  # Trigger alert through your monitoring system
fi

# Also check the detailed health response
HEALTH_JSON=$(curl -s --max-time 10 "${HEALTH_ENDPOINT}")
PASSED=$(echo "${HEALTH_JSON}" | jq -r '.passed')

if [ "${PASSED}" != "true" ]; then
  echo "[${TIMESTAMP}] WARNING - Health check failed: ${HEALTH_JSON}" >> "${LOG_FILE}"
  # Check individual components
  echo "${HEALTH_JSON}" | jq -r '.checks | to_entries[] | select(.value != "ok") | "\(.key): \(.value)"'
fi
```

### Using OneUptime for Monitoring

[OneUptime](https://oneuptime.com) provides out-of-the-box HTTP monitoring that works well with TFE:

1. Create a new HTTP monitor pointing to `https://tfe.example.com/_health_check`
2. Set the expected status code to 200
3. Configure check intervals (every 1-2 minutes)
4. Set up alert rules for downtime notifications
5. Add team members to the notification list

This gives you uptime tracking, response time graphs, and incident management without building custom tooling.

## Monitoring TFE Infrastructure Components

### PostgreSQL Monitoring

```bash
#!/bin/bash
# monitor-tfe-postgres.sh
# Key PostgreSQL metrics to track

DB_HOST="tfe-postgres.abc123.us-east-1.rds.amazonaws.com"
DB_USER="tfe_monitor"
DB_NAME="tfe"

# Active connections
PGPASSWORD="${DB_PASSWORD}" psql -h "${DB_HOST}" -U "${DB_USER}" -d "${DB_NAME}" -t -c \
  "SELECT count(*) FROM pg_stat_activity WHERE state = 'active';"

# Database size
PGPASSWORD="${DB_PASSWORD}" psql -h "${DB_HOST}" -U "${DB_USER}" -d "${DB_NAME}" -t -c \
  "SELECT pg_size_pretty(pg_database_size('tfe'));"

# Long-running queries (potential problems)
PGPASSWORD="${DB_PASSWORD}" psql -h "${DB_HOST}" -U "${DB_USER}" -d "${DB_NAME}" -t -c \
  "SELECT pid, now() - pg_stat_activity.query_start AS duration, query
   FROM pg_stat_activity
   WHERE state != 'idle' AND now() - pg_stat_activity.query_start > interval '5 minutes'
   ORDER BY duration DESC;"

# Replication lag (if using read replicas)
PGPASSWORD="${DB_PASSWORD}" psql -h "${DB_HOST}" -U "${DB_USER}" -d "${DB_NAME}" -t -c \
  "SELECT CASE WHEN pg_last_wal_receive_lsn() = pg_last_wal_replay_lsn()
     THEN 0
     ELSE EXTRACT(EPOCH FROM now() - pg_last_xact_replay_timestamp())
   END AS replication_lag_seconds;"
```

### Redis Monitoring

```bash
# Key Redis metrics to collect
redis-cli -h tfe-redis.example.com -p 6379 -a "${REDIS_PASSWORD}" --no-auth-warning info | \
  grep -E "used_memory_human|connected_clients|evicted_keys|keyspace_hits|keyspace_misses|instantaneous_ops_per_sec"

# Calculate hit rate
HITS=$(redis-cli -h tfe-redis.example.com -a "${REDIS_PASSWORD}" --no-auth-warning info stats | grep keyspace_hits | cut -d: -f2 | tr -d '\r')
MISSES=$(redis-cli -h tfe-redis.example.com -a "${REDIS_PASSWORD}" --no-auth-warning info stats | grep keyspace_misses | cut -d: -f2 | tr -d '\r')

if [ $((HITS + MISSES)) -gt 0 ]; then
  HIT_RATE=$(echo "scale=2; ${HITS} * 100 / (${HITS} + ${MISSES})" | bc)
  echo "Redis hit rate: ${HIT_RATE}%"
fi
```

### Container and Host Monitoring

```bash
# Docker container metrics
docker stats tfe --no-stream --format \
  "CPU: {{.CPUPerc}}, Memory: {{.MemUsage}}, Net I/O: {{.NetIO}}, Block I/O: {{.BlockIO}}"

# Disk space monitoring
df -h /var/lib/docker | tail -1

# System load
uptime

# Check if TFE container is running
if ! docker ps --format '{{.Names}}' | grep -q '^tfe$'; then
  echo "CRITICAL: TFE container is not running!"
fi
```

## Prometheus Metrics Collection

If you use Prometheus, here is a setup for scraping TFE metrics:

```yaml
# prometheus.yml - Scrape configuration for TFE
scrape_configs:
  # TFE health check
  - job_name: 'tfe-health'
    metrics_path: '/_health_check'
    scheme: https
    scrape_interval: 30s
    static_configs:
      - targets: ['tfe.example.com']
    tls_config:
      insecure_skip_verify: false

  # Node exporter on the TFE host
  - job_name: 'tfe-node'
    static_configs:
      - targets: ['tfe-host:9100']

  # PostgreSQL exporter
  - job_name: 'tfe-postgres'
    static_configs:
      - targets: ['postgres-exporter:9187']

  # Redis exporter
  - job_name: 'tfe-redis'
    static_configs:
      - targets: ['redis-exporter:9121']
```

### Blackbox Exporter for Endpoint Monitoring

```yaml
# blackbox.yml - Probe TFE endpoints
modules:
  tfe_health:
    prober: http
    timeout: 10s
    http:
      valid_http_versions: ["HTTP/1.1", "HTTP/2.0"]
      valid_status_codes: [200]
      method: GET
      preferred_ip_protocol: "ip4"
      tls_config:
        insecure_skip_verify: false
```

## Alerting Rules

### Prometheus Alerting Rules

```yaml
# tfe-alerts.yml - Alerting rules for TFE
groups:
  - name: terraform-enterprise
    rules:
      # TFE is down
      - alert: TFEDown
        expr: probe_success{job="tfe-health"} == 0
        for: 2m
        labels:
          severity: critical
        annotations:
          summary: "Terraform Enterprise is unreachable"
          description: "TFE health check has been failing for more than 2 minutes"

      # TFE health check reports unhealthy components
      - alert: TFEComponentUnhealthy
        expr: probe_http_status_code{job="tfe-health"} != 200
        for: 5m
        labels:
          severity: warning
        annotations:
          summary: "TFE component health check failing"

      # High response time
      - alert: TFESlowResponse
        expr: probe_duration_seconds{job="tfe-health"} > 5
        for: 10m
        labels:
          severity: warning
        annotations:
          summary: "TFE response time is high ({{ $value }}s)"

      # Database connection pool exhaustion
      - alert: TFEDatabaseConnections
        expr: pg_stat_activity_count{datname="tfe"} > 80
        for: 5m
        labels:
          severity: warning
        annotations:
          summary: "TFE database connections are high"

      # Redis memory usage
      - alert: TFERedisMemory
        expr: redis_memory_used_bytes / redis_memory_max_bytes > 0.8
        for: 10m
        labels:
          severity: warning
        annotations:
          summary: "TFE Redis memory usage above 80%"

      # Disk space on TFE host
      - alert: TFEDiskSpace
        expr: (node_filesystem_avail_bytes{mountpoint="/"} / node_filesystem_size_bytes{mountpoint="/"}) < 0.15
        for: 5m
        labels:
          severity: warning
        annotations:
          summary: "TFE host disk space below 15%"
```

## Monitoring Run Queue Health

Track how quickly TFE processes runs to detect capacity issues:

```bash
#!/bin/bash
# monitor-tfe-runs.sh
# Track run queue depth and processing time

TFE_URL="https://tfe.example.com"
TOKEN="${TFE_ADMIN_TOKEN}"

# Count runs in each status
for STATUS in pending planning applying; do
  COUNT=$(curl -s \
    --header "Authorization: Bearer ${TOKEN}" \
    "${TFE_URL}/api/v2/admin/runs?filter[status]=${STATUS}" | \
    jq '.meta.pagination["total-count"]')
  echo "tfe_runs_${STATUS}: ${COUNT}"
done

# Alert if too many runs are pending
PENDING=$(curl -s \
  --header "Authorization: Bearer ${TOKEN}" \
  "${TFE_URL}/api/v2/admin/runs?filter[status]=pending" | \
  jq '.meta.pagination["total-count"]')

if [ "${PENDING}" -gt 50 ]; then
  echo "WARNING: ${PENDING} runs are pending - possible capacity issue"
fi
```

## Summary

Effective TFE monitoring covers multiple layers: the application health endpoint, the underlying infrastructure (database, Redis, storage), host resources, and business-level metrics like run queue depth. Start with the health check endpoint for basic availability monitoring, then layer on infrastructure metrics as your deployment matures. Set meaningful alerts that tell you about problems before your users notice them. Tools like [OneUptime](https://oneuptime.com) can centralize all of these checks into a single dashboard with proper alerting and incident management.
