# How to Forward Podman Container Logs to Loki

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Podman, Container, DevOps, Logging, Loki, Grafana

Description: Learn how to forward Podman container logs to Grafana Loki for cost-effective centralized logging, using Promtail, Fluent Bit, and direct API approaches.

---

> Loki is designed for logs the same way Prometheus is designed for metrics: lightweight indexing with powerful label-based queries.

Grafana Loki is a log aggregation system that indexes only metadata (labels) rather than the full text of log lines, making it significantly more cost-effective than Elasticsearch for large-scale logging. This guide shows how to get Podman container logs into Loki.

---

## Set Up Loki for Testing

Start a local Loki instance to test with.

```bash
# Run Loki locally

podman run -d \
  --name loki \
  -p 3100:3100 \
  grafana/loki:3.7.0

# Verify Loki is running
curl -s http://localhost:3100/ready

# Run Grafana for viewing logs
podman run -d \
  --name grafana \
  -p 3000:3000 \
  grafana/grafana:latest

# Add Loki as a data source in Grafana at http://localhost:3000
# URL: http://host.containers.internal:3100 (or use the Loki container IP)
```

## Approach 1: Promtail File Tailing

Promtail was Loki's native log collector, but it is deprecated and reached end-of-life on March 2, 2026. Use this approach only for existing Promtail deployments; for new deployments, prefer Fluent Bit or Grafana Alloy.

```bash
# Step 1: Create Promtail configuration
mkdir -p /etc/promtail

cat > /etc/promtail/config.yml << 'EOF'
server:
  http_listen_port: 9080

positions:
  filename: /tmp/positions.yaml

clients:
  - url: http://localhost:3100/loki/api/v1/push

scrape_configs:
  - job_name: podman
    static_configs:
      - targets:
          - localhost
        labels:
          job: podman
          __path__: /var/lib/containers/storage/overlay-containers/*/userdata/ctr.log

    pipeline_stages:
      - regex:
          expression: '^(?P<timestamp>[^ ]+) (?P<stream>stdout|stderr) (?P<flags>[^ ]+) (?P<content>.*)$'
      - labels:
          stream:
      - timestamp:
          source: timestamp
          format: RFC3339Nano
      - output:
          source: content
EOF

# Step 2: Run Promtail
podman run -d \
  --name promtail \
  --network host \
  -v /etc/promtail:/etc/promtail:ro \
  -v /var/lib/containers/storage:/var/lib/containers/storage:ro \
  grafana/promtail:latest \
  -config.file=/etc/promtail/config.yml
```

## Approach 2: Promtail with journald

Use Podman's journald log driver with Promtail's journal scraper for existing Promtail deployments.

```bash
# Step 1: Run containers with journald driver
podman run -d \
  --log-driver journald \
  --log-opt tag="{{.Name}}" \
  --name web \
  nginx:latest

# Step 2: Create Promtail config for journald
cat > /etc/promtail/journal-config.yml << 'EOF'
server:
  http_listen_port: 9080

positions:
  filename: /tmp/positions.yaml

clients:
  - url: http://localhost:3100/loki/api/v1/push

scrape_configs:
  - job_name: journal
    journal:
      max_age: 12h
      labels:
        job: systemd-journal
    relabel_configs:
      - source_labels: ['__journal_container_name']
        target_label: container
      - source_labels: ['__journal_image_name']
        target_label: image
      - source_labels: ['__journal_container_tag']
        target_label: tag
    pipeline_stages:
      - match:
          selector: '{job="systemd-journal"}'
          stages:
            - regex:
                expression: '(?P<level>(INFO|WARN|ERROR|DEBUG))'
            - labels:
                level:
EOF

# Step 3: Run Promtail with journal access
podman run -d \
  --name promtail \
  --network host \
  -v /etc/promtail:/etc/promtail:ro \
  -v /var/log/journal:/var/log/journal:ro \
  -v /run/log/journal:/run/log/journal:ro \
  -v /etc/machine-id:/etc/machine-id:ro \
  grafana/promtail:latest \
  -config.file=/etc/promtail/journal-config.yml
```

## Approach 3: Direct Push via Loki API

Push logs directly to Loki's HTTP API from a script.

```bash
#!/bin/bash
# loki-push.sh - Push container logs directly to Loki
# Usage: ./loki-push.sh <container-name> [loki-url]

CONTAINER="$1"
LOKI_URL="${2:-http://localhost:3100}"

podman logs -f --timestamps "$CONTAINER" 2>&1 | while IFS= read -r line; do
  TS=$(echo "$line" | awk '{print $1}')
  MSG=$(echo "$line" | cut -d' ' -f2-)

  # Convert timestamp to nanoseconds
  TS_NANO=$(date -d "$TS" +%s%N 2>/dev/null || echo "$(date +%s)000000000")

  # Push to Loki
  jq -nc --arg ts "$TS_NANO" --arg msg "$MSG" --arg container "$CONTAINER" \
    '{streams: [{stream: {container: $container, source: "podman"}, values: [[$ts, $msg]]}]}' |
  curl -s -X POST "${LOKI_URL}/loki/api/v1/push" \
    -H "Content-Type: application/json" \
    --data-binary @- &
done
```

## Approach 4: Fluent Bit to Loki

Use Fluent Bit with the Loki output plugin.

```bash
# Create Fluent Bit config for Loki output
mkdir -p /etc/fluent-bit

cat > /etc/fluent-bit/loki.conf << 'EOF'
[SERVICE]
    Flush        5
    Log_Level    info

[INPUT]
    Name         tail
    Path         /var/lib/containers/storage/overlay-containers/*/userdata/ctr.log
    Tag          podman.*
    Refresh_Interval 5

[OUTPUT]
    Name         loki
    Match        *
    Host         localhost
    Port         3100
    Labels       job=podman
    Auto_Kubernetes_Labels off
    Line_Format  json
EOF

# Run Fluent Bit
podman run -d \
  --name fluent-bit \
  --network host \
  -v /var/lib/containers/storage:/var/lib/containers/storage:ro \
  -v /etc/fluent-bit:/fluent-bit/etc:ro \
  fluent/fluent-bit:latest \
  -c /fluent-bit/etc/loki.conf
```

## Query Logs in Loki

Once logs are flowing to Loki, query them using LogQL.

```bash
# Query logs via the Loki API
# All logs from a specific container
curl -sG "http://localhost:3100/loki/api/v1/query_range" \
  --data-urlencode 'query={container="web"}' \
  --data-urlencode 'limit=10' | python3 -m json.tool

# Filter for errors
curl -sG "http://localhost:3100/loki/api/v1/query_range" \
  --data-urlencode 'query={container="web"} |= "error"' \
  --data-urlencode 'limit=10' | python3 -m json.tool

# Count log lines per container
curl -sG "http://localhost:3100/loki/api/v1/query" \
  --data-urlencode 'query=sum by (container) (count_over_time({job="systemd-journal"}[1h]))' | python3 -m json.tool

# Check Loki ingestion status
curl -s http://localhost:3100/metrics | grep loki_ingester
```

## Verify the Pipeline

```bash
# Generate test logs
podman run -d \
  --log-driver journald \
  --log-opt tag="loki-test" \
  --name loki-test \
  alpine sh -c 'for i in $(seq 1 100); do echo "Log line $i at $(date)"; sleep 1; done'

# Check Promtail targets
curl -s http://localhost:9080/targets

# Query the test logs in Loki
curl -sG "http://localhost:3100/loki/api/v1/query_range" \
  --data-urlencode 'query={container="loki-test"}' \
  --data-urlencode 'limit=5' | python3 -m json.tool

# Clean up
podman rm -f loki-test
```

## Summary

Forwarding Podman container logs to Loki can be done through Fluent Bit with the Loki output plugin, Promtail file tailing, Promtail journald integration, or direct API pushes. Promtail with the journald scraper provides rich metadata for existing Promtail deployments, but Promtail is deprecated; use Fluent Bit or Grafana Alloy for new deployments. Once logs are in Loki, use LogQL in Grafana for powerful label-based querying with low storage overhead.
