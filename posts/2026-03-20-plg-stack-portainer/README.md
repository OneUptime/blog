# How to Deploy the PLG Stack (Promtail, Loki, Grafana) via Portainer

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Portainer, Docker, PLG, Promtail, Loki, Grafana, Logging

Description: Deploy a lightweight Promtail + Loki + Grafana log aggregation stack via Portainer for container log collection without Elasticsearch's resource overhead.

## Introduction

The PLG stack offers a lightweight alternative to EFK for container log aggregation. Loki only indexes log labels (metadata) rather than full log content, requiring a fraction of Elasticsearch's memory. Promtail automatically discovers and ships Docker container logs. Grafana provides unified visualization for both metrics (Prometheus) and logs (Loki). This guide covers deploying a production-ready PLG stack via Portainer.

## Step 1: Deploy the PLG Stack

```yaml
# docker-compose.yml - Complete PLG stack

version: "3.8"

services:
  loki:
    image: grafana/loki:2.9.0
    container_name: loki
    restart: unless-stopped
    command: -config.file=/etc/loki/config.yaml
    volumes:
      - ./loki-config.yaml:/etc/loki/config.yaml
      - loki_data:/loki
    ports:
      - "3100:3100"
    networks:
      - plg_net
    healthcheck:
      test: ["CMD-SHELL", "wget -q -O- http://localhost:3100/ready"]
      interval: 30s
      timeout: 5s
      retries: 5

  promtail:
    image: grafana/promtail:2.9.0
    container_name: promtail
    restart: unless-stopped
    command: -config.file=/etc/promtail/config.yaml
    volumes:
      - ./promtail-config.yaml:/etc/promtail/config.yaml
      - /var/run/docker.sock:/var/run/docker.sock:ro
      - /var/lib/docker/containers:/var/lib/docker/containers:ro
      - promtail_positions:/tmp
    networks:
      - plg_net
    depends_on:
      loki:
        condition: service_healthy

  grafana:
    image: grafana/grafana:latest
    container_name: grafana
    restart: unless-stopped
    environment:
      - GF_SECURITY_ADMIN_USER=admin
      - GF_SECURITY_ADMIN_PASSWORD=admin_password
      - GF_USERS_ALLOW_SIGN_UP=false
      - GF_AUTH_ANONYMOUS_ENABLED=false
    volumes:
      - grafana_data:/var/lib/grafana
      - ./grafana-datasources.yaml:/etc/grafana/provisioning/datasources/loki.yaml
      - ./grafana-dashboards.yaml:/etc/grafana/provisioning/dashboards/default.yaml
      - ./dashboards:/var/lib/grafana/dashboards
    ports:
      - "3000:3000"
    networks:
      - plg_net
    depends_on:
      loki:
        condition: service_healthy

volumes:
  loki_data:
  grafana_data:
  promtail_positions:

networks:
  plg_net:
    driver: bridge
```

## Step 2: Configure Loki for Production

```yaml
# loki-config.yaml - Production-ready Loki configuration
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
    - from: 2023-01-01
      store: tsdb
      object_store: filesystem
      schema: v12
      index:
        prefix: index_
        period: 24h

limits_config:
  # Retention: delete logs older than 30 days
  retention_period: 30d
  # Ingestion limits
  ingestion_rate_mb: 16
  ingestion_burst_size_mb: 32
  # Query limits
  max_query_length: 721h
  max_entries_limit_per_query: 5000

compactor:
  working_directory: /loki/compactor
  compaction_interval: 10m
  retention_enabled: true
  retention_delete_delay: 2h
  retention_delete_worker_count: 150
```

## Step 3: Configure Promtail for Docker Discovery

```yaml
# promtail-config.yaml - Docker service discovery
server:
  http_listen_port: 9080
  grpc_listen_port: 0

positions:
  filename: /tmp/positions.yaml

clients:
  - url: http://loki:3100/loki/api/v1/push
    # Batch logs for efficiency
    batchwait: 1s
    batchsize: 1048576

scrape_configs:
  # Discover and scrape all Docker containers
  - job_name: docker
    docker_sd_configs:
      - host: unix:///var/run/docker.sock
        refresh_interval: 5s
        filters:
          - name: status
            values: [running]

    relabel_configs:
      # Container name as label
      - source_labels: ["__meta_docker_container_name"]
        regex: "/(.*)"
        target_label: container

      # Docker Compose service name
      - source_labels:
          ["__meta_docker_container_label_com_docker_compose_service"]
        target_label: service

      # Stack/project name
      - source_labels:
          ["__meta_docker_container_label_com_docker_compose_project"]
        target_label: stack

      # Log stream (stdout/stderr)
      - source_labels: ["__meta_docker_container_log_stream"]
        target_label: stream

      # Docker image name
      - source_labels: ["__meta_docker_container_image_name"]
        target_label: image

      # Custom labels from container
      - source_labels: ["__meta_docker_container_label_environment"]
        target_label: environment

    # Parse JSON logs if possible
    pipeline_stages:
      - json:
          expressions:
            level: level
            msg: msg
            timestamp: timestamp
      - labels:
          level:
      - timestamp:
          source: timestamp
          format: RFC3339Nano
```

## Step 4: Configure Grafana Datasources

```yaml
# grafana-datasources.yaml - Provision Loki datasource
apiVersion: 1

datasources:
  - name: Loki
    type: loki
    uid: loki
    access: proxy
    url: http://loki:3100
    isDefault: true
    jsonData:
      maxLines: 1000
      derivedFields:
        # Link trace IDs to Jaeger/Zipkin
        - datasourceUid: jaeger
          matcherRegex: "traceId=(\\w+)"
          name: TraceID
          url: "$${__value.raw}"
```

## Step 5: Essential LogQL Queries

```bash
# In Grafana Explore, use these LogQL queries:

# All logs from a stack
{stack="myapp"}

# Error logs across all services
{stack="myapp"} |= "error"

# Parse and filter JSON logs
{service="api"} | json | level = "error" | msg != ""

# Count errors per minute (metrics query)
sum(rate({stack="myapp"} |= "error" [1m])) by (service)

# Top 10 slowest requests (extract from access logs)
{service="nginx"}
  | pattern `<ip> - - [<_>] "<method> <path> <_>" <status> <bytes> "<_>" "<_>" <duration>`
  | duration > 1000ms
  | line_format "{{.method}} {{.path}} {{.duration}}ms"

# Alert query: errors in last 5 minutes
count_over_time({stack="myapp"} |= "error" [5m]) > 50
```

## Step 6: Use Loki Docker Log Driver

```yaml
# Send logs directly via Loki Docker driver (alternative to Promtail)
version: "3.8"

# Install Loki Docker plugin first:
# docker plugin install grafana/loki-docker-driver:latest --alias loki

services:
  api:
    image: myapp/api:latest
    logging:
      driver: loki
      options:
        loki-url: "http://loki:3100/loki/api/v1/push"
        loki-labels: "service=api,stack=myapp,environment=production"
        loki-retries: "5"
        loki-batch-size: "400"
        loki-timeout: "1s"
```

## Conclusion

The PLG stack provides 80% of EFK's functionality at 20% of the resource cost. Loki's label-only indexing strategy makes it highly efficient for Docker environments where log volume is high but search patterns follow predictable label-based filters. Promtail's Docker service discovery eliminates the need for per-container logging configuration - it automatically picks up new containers as they start. With Grafana already in your monitoring stack, adding Loki as a datasource gives you a unified dashboard for both metrics and logs without deploying additional infrastructure.
