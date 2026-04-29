# How to Monitor Microservice Logs Across Containers in Portainer

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Portainer, Docker, Logging, Microservice, Loki, ELK, Monitoring

Description: Set up centralized logging for microservices using Portainer's built-in log viewer and the PLG stack to aggregate logs across containers.

## Introduction

When running multiple microservices, logs are scattered across dozens of containers. Portainer provides built-in log viewing for individual containers, but for correlation and search across services, you need a centralized logging stack. This guide covers using Portainer's native log features alongside the PLG stack (Promtail, Loki, Grafana).

## Step 1: Using Portainer's Built-in Log Viewer

Portainer provides per-container log viewing with real-time streaming:

1. Navigate to **Containers** > select a container
2. Click the **Logs** tab
3. Use these features:
   - **Auto-refresh**: Enable for real-time streaming
   - **Lines**: Adjust how many lines to show (last 100, 500, 1000)
   - **Search**: Filter log output
   - **Since**: View logs from a specific time

```bash
# Equivalent Docker CLI commands

# View last 100 lines
docker logs --tail=100 mycontainer

# Follow logs in real-time
docker logs -f mycontainer

# View logs since a specific time
docker logs --since="2024-01-01T00:00:00" mycontainer

# Filter logs (not available in Docker natively - use grep)
docker logs mycontainer 2>&1 | grep ERROR
```

## Step 2: Deploy Centralized Logging Stack (PLG)

For cross-service log correlation, deploy Loki:

```yaml
# docker-compose.yml - PLG Logging Stack
version: "3.8"

networks:
  logging_network:
    driver: bridge

volumes:
  loki_data:
  grafana_data:

services:
  # Loki - log aggregation engine
  loki:
    image: grafana/loki:latest
    container_name: loki
    restart: unless-stopped
    ports:
      - "3100:3100"
    command: -config.file=/etc/loki/local-config.yaml
    volumes:
      - /opt/logging/loki:/etc/loki
      - loki_data:/loki
    networks:
      - logging_network

  # Promtail - log collector (runs on each host)
  promtail:
    image: grafana/promtail:latest
    container_name: promtail
    restart: unless-stopped
    volumes:
      # Access Docker logs
      - /var/log:/var/log:ro
      - /var/lib/docker/containers:/var/lib/docker/containers:ro
      - /var/run/docker.sock:/var/run/docker.sock:ro
      - /opt/logging/promtail:/etc/promtail
    command: -config.file=/etc/promtail/config.yml
    networks:
      - logging_network

  # Grafana - visualization
  grafana:
    image: grafana/grafana:latest
    container_name: grafana_logs
    restart: unless-stopped
    ports:
      - "3000:3000"
    environment:
      - GF_SECURITY_ADMIN_PASSWORD=admin_password
    volumes:
      - grafana_data:/var/lib/grafana
      - /opt/logging/grafana/provisioning:/etc/grafana/provisioning
    networks:
      - logging_network
```

## Step 3: Configure Loki

```yaml
# /opt/logging/loki/local-config.yaml
auth_enabled: false

server:
  http_listen_port: 3100
  grpc_listen_port: 9096

common:
  instance_addr: 127.0.0.1
  path_prefix: /loki
  storage:
    filesystem:
      chunks_directory: /loki/chunks
      rules_directory: /loki/rules
  replication_factor: 1
  ring:
    kvstore:
      store: inmemory

query_range:
  results_cache:
    cache:
      embedded_cache:
        enabled: true
        max_size_mb: 100

schema_config:
  configs:
    - from: 2024-01-01
      store: tsdb
      object_store: filesystem
      schema: v13
      index:
        prefix: index_
        period: 24h

ruler:
  alertmanager_url: http://alertmanager:9093
```

## Step 4: Configure Promtail

Note: Promtail reached end of life on March 2, 2026. Grafana now recommends [Grafana Alloy](https://grafana.com/docs/alloy/latest/) as the replacement collector. The config below still works for existing Promtail deployments, but new installations should use Alloy.

```yaml
# /opt/logging/promtail/config.yml
server:
  http_listen_port: 9080
  grpc_listen_port: 0

positions:
  filename: /tmp/positions.yaml

clients:
  - url: http://loki:3100/loki/api/v1/push

scrape_configs:
  # Scrape Docker container logs
  - job_name: docker
    docker_sd_configs:
      - host: unix:///var/run/docker.sock
        refresh_interval: 5s
    relabel_configs:
      # Use container name as job label
      - source_labels: ['__meta_docker_container_name']
        regex: '/(.*)'
        target_label: 'container'

      # Use image name
      - source_labels: ['__meta_docker_container_image']
        target_label: 'image'

      # Add stack name label
      - source_labels: ['__meta_docker_container_label_com_docker_compose_project']
        target_label: 'stack'

      # Add service name label
      - source_labels: ['__meta_docker_container_label_com_docker_compose_service']
        target_label: 'service'

    pipeline_stages:
      # Parse JSON logs
      - json:
          expressions:
            level: level
            message: message
            timestamp: time
      # Extract log level
      - labels:
          level:
      # Set log line from message field
      - output:
          source: message
```

## Step 5: Use Docker Log Driver to Send to Loki Directly

```yaml
# docker-compose.yml - Services that log directly to Loki
version: "3.8"

services:
  # Install Loki Docker driver first:
  # docker plugin install grafana/loki-docker-driver:latest --alias loki --grant-all-permissions

  user_service:
    image: user-service:latest
    logging:
      driver: loki
      options:
        loki-url: "http://loki:3100/loki/api/v1/push"
        loki-batch-size: "400"
        loki-retries: "3"
        loki-timeout: "10s"
        loki-max-backoff: "5s"
        loki-min-backoff: "500ms"
        labels: "container_name,service_name"
        loki-external-labels: "job=user-service,env=production"

  order_service:
    image: order-service:latest
    logging:
      driver: loki
      options:
        loki-url: "http://loki:3100/loki/api/v1/push"
        loki-external-labels: "job=order-service,env=production"
```

## Step 6: Grafana Log Queries

In Grafana, use LogQL to query your microservice logs:

```logql
# View all logs from user-service
{job="user-service"}

# View ERROR logs across all services
{stack="myapp"} |= "ERROR"

# Parse structured logs and filter by level
{container="api"} | json | level="error"

# Count errors per minute per service
sum by (service) (
  rate({stack="myapp"} |= "ERROR" [1m])
)

# Trace a specific request across all services
{stack="myapp"} |= "request-id-12345"

# Find slow requests (> 1000ms)
{job="api"} | json | duration > 1000
```

## Step 7: Auto-Provision Grafana Loki Datasource

```yaml
# /opt/logging/grafana/provisioning/datasources/loki.yml
apiVersion: 1

datasources:
  - name: Loki
    type: loki
    access: proxy
    url: http://loki:3100
    isDefault: true
    jsonData:
      maxLines: 1000
      derivedFields:
        - datasourceUid: Jaeger
          matcherRegex: "traceID=(\\w+)"
          name: TraceID
          url: "$${__value.raw}"
```

## Conclusion

Portainer's built-in log viewer is perfect for quickly checking individual container logs during development. For production microservices, the PLG stack gives you centralized, searchable log aggregation across all services. LogQL lets you correlate events across services by request ID or timestamp, making it possible to trace a user request from the API gateway through all downstream microservices. Both tools work together - use Portainer for operational management and Grafana/Loki for log analysis.
