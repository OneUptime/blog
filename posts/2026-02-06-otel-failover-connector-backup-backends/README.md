# How to Use the Failover Connector to Automatically Switch Between Primary and Backup Backends

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: OpenTelemetry, Failover, High Availability, Connector, Collector

Description: Configure the OpenTelemetry failover connector to automatically switch telemetry export from a primary backend to a backup when failures are detected.

Your observability backend going down at the same time as a production incident is the worst-case scenario. You need to debug the incident, but you have no telemetry. The failover connector solves this by automatically switching to a backup backend when the primary is unreachable.

## How the Failover Connector Works

The failover connector monitors export errors on the primary pipeline. When the error rate exceeds a threshold, it reroutes all telemetry to the backup pipeline. Once the primary recovers, it switches back. This happens transparently, with no manual intervention needed.

```
                                 +--> [Primary Pipeline] --> [OneUptime]
[OTLP Receiver] --> [failover] --|
                                 +--> [Backup Pipeline]  --> [Local Storage]
```

## Configuration

```yaml
# otel-collector-config.yaml
receivers:
  otlp:
    protocols:
      grpc:
        endpoint: "0.0.0.0:4317"

connectors:
  failover:
    # List pipelines in priority order
    # The connector tries the first one, falls back to the second, etc.
    priority_levels:
      - [traces/primary]
      - [traces/backup]
    # How many consecutive failures before switching
    max_retries: 3
    # How often to check if the primary is back
    retry_interval: 30s
    # Time gap between recovery checks
    retry_gap: 5s

processors:
  batch/primary:
    send_batch_size: 512
    timeout: 5s

  batch/backup:
    send_batch_size: 256
    timeout: 2s

exporters:
  # Primary: your main observability backend
  otlp/primary:
    endpoint: "https://otlp.oneuptime.com:4317"
    headers:
      x-oneuptime-token: "${ONEUPTIME_TOKEN}"
    retry_on_failure:
      enabled: true
      initial_interval: 1s
      max_interval: 10s
      max_elapsed_time: 30s
    sending_queue:
      enabled: true
      queue_size: 10000

  # Backup: local file storage for later replay
  file/backup:
    path: /var/otel/backup/traces.jsonl
    rotation:
      max_megabytes: 1024
      max_days: 7
      max_backups: 5

service:
  pipelines:
    traces:
      receivers: [otlp]
      processors: []
      exporters: [failover]

    traces/primary:
      receivers: [failover]
      processors: [batch/primary]
      exporters: [otlp/primary]

    traces/backup:
      receivers: [failover]
      processors: [batch/backup]
      exporters: [file/backup]
```

## Using a Second OTLP Backend as Backup

Instead of local file storage, you might want a second OTLP backend as your failover target:

```yaml
exporters:
  otlp/primary:
    endpoint: "https://otlp.oneuptime.com:4317"
    headers:
      x-oneuptime-token: "${ONEUPTIME_TOKEN}"

  otlp/backup:
    endpoint: "backup-collector.dr-region.internal:4317"
    tls:
      insecure: false
    headers:
      x-backup-token: "${BACKUP_TOKEN}"

service:
  pipelines:
    traces/primary:
      receivers: [failover]
      processors: [batch/primary]
      exporters: [otlp/primary]

    traces/backup:
      receivers: [failover]
      processors: [batch/backup]
      exporters: [otlp/backup]
```

## Three-Level Failover

You can chain more than two levels for defense in depth:

```yaml
connectors:
  failover:
    priority_levels:
      - [traces/primary]    # Level 1: main backend
      - [traces/secondary]  # Level 2: DR region backend
      - [traces/emergency]  # Level 3: local file dump
    max_retries: 3
    retry_interval: 30s
```

## Alerting on Failover Events

You should know when failover happens. Monitor the collector's internal metrics:

```bash
# Check current failover state
curl -s http://localhost:8888/metrics | grep failover

# Key metrics:
# otelcol_connector_failover_current_level{connector="failover"} 0
#   (0 = primary, 1 = backup, etc.)
```

Set up an alert when the level changes from 0:

```yaml
# Prometheus alerting rule
groups:
  - name: otel-failover
    rules:
      - alert: OtelFailoverActive
        expr: otelcol_connector_failover_current_level > 0
        for: 1m
        labels:
          severity: critical
        annotations:
          summary: "OpenTelemetry collector has failed over to backup backend"
```

## Replaying Backup Data

If you used the file exporter as backup, you will want to replay that data once the primary recovers. Here is a simple replay script:

```bash
#!/bin/bash
# replay-backup.sh
# Replay backed-up telemetry to the primary backend

BACKUP_DIR="/var/otel/backup"
COLLECTOR_ENDPOINT="https://otlp.oneuptime.com:4318/v1/traces"

for file in ${BACKUP_DIR}/traces*.jsonl; do
  echo "Replaying ${file}..."

  # Send each line (each is a complete export request)
  while IFS= read -r line; do
    curl -s -X POST "${COLLECTOR_ENDPOINT}" \
      -H "Content-Type: application/json" \
      -H "x-oneuptime-token: ${ONEUPTIME_TOKEN}" \
      -d "${line}" > /dev/null

    # Throttle to avoid overwhelming the backend
    sleep 0.01
  done < "${file}"

  # Move replayed file to processed directory
  mv "${file}" "${BACKUP_DIR}/processed/"
  echo "Completed ${file}"
done
```

## Testing Failover

Before trusting failover in production, test it:

```bash
# Step 1: Start the collector normally, verify traces flow to primary
otelcol-contrib --config=config.yaml &

# Step 2: Block the primary backend (simulate outage)
iptables -A OUTPUT -d primary-backend.internal -j DROP

# Step 3: Wait for failover (check metrics)
sleep 60
curl -s http://localhost:8888/metrics | grep failover_current_level
# Should show level 1 (backup)

# Step 4: Verify traces are flowing to backup
ls -la /var/otel/backup/

# Step 5: Unblock the primary
iptables -D OUTPUT -d primary-backend.internal -j DROP

# Step 6: Wait for recovery (retry_interval)
sleep 60
curl -s http://localhost:8888/metrics | grep failover_current_level
# Should show level 0 (primary) again
```

## Wrapping Up

The failover connector is your safety net for backend outages. It ensures you never lose telemetry data during the critical moments when you need it most. Configure at least two levels (primary and backup), set up alerting on failover events, and have a replay strategy ready for when the primary comes back online. This is one of those things that feels like over-engineering until the day it saves you during an incident.
