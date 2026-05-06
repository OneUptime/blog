# How to Set Up Centralized Logging for Containers via Portainer

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Portainer, Docker, Logging, Centralized Logging, Observability, Log Management

Description: Configure centralized log collection from all containers in your Portainer environment using log drivers and log aggregation pipelines.

## Introduction

Docker containers write logs to stdout/stderr by default. Without centralized logging, you need to check each container individually in Portainer. Centralized logging aggregates all container logs into a single system where you can search, filter, and alert across all services simultaneously. This guide covers configuring Docker log rotation and deploying a Loki + Alloy + Grafana stack via Portainer.

## Step 1: Configure Docker Log Driver Globally

```json
{
  "log-driver": "json-file",
  "log-opts": {
    "max-size": "10m",
    "max-file": "3",
    "labels": "service_name,environment",
    "env": "NODE_ENV,APP_VERSION"
  }
}
```

```bash
# Apply and verify

sudo systemctl restart docker
docker info | grep -A 5 "Logging Driver"
```

These daemon-level defaults apply to newly created containers. Recreate existing containers if you want them to inherit the updated logging settings.

## Step 2: Deploy the Log Collection Stack

```yaml
# docker-compose.yml - Centralized logging with Loki + Alloy + Grafana

services:
  loki:
    image: grafana/loki:3.7.0
    container_name: loki
    restart: unless-stopped
    command: -config.file=/etc/loki/local-config.yaml
    volumes:
      - ./loki-config.yaml:/etc/loki/local-config.yaml:ro
      - loki_data:/loki
    ports:
      - "3100:3100"
    networks:
      - logging_net

  alloy:
    image: grafana/alloy:latest
    container_name: alloy
    restart: unless-stopped
    command: run --server.http.listen-addr=0.0.0.0:12345 --storage.path=/var/lib/alloy/data /etc/alloy/config.alloy
    volumes:
      - ./alloy-config.alloy:/etc/alloy/config.alloy:ro
      - /var/run/docker.sock:/var/run/docker.sock
      - alloy_data:/var/lib/alloy/data
    ports:
      - "12345:12345"
    networks:
      - logging_net
    depends_on:
      - loki

  grafana:
    image: grafana/grafana:latest
    container_name: grafana_logging
    restart: unless-stopped
    volumes:
      - grafana_logging_data:/var/lib/grafana
      - ./grafana-datasources.yaml:/etc/grafana/provisioning/datasources/loki.yaml:ro
    ports:
      - "3001:3000"
    environment:
      - GF_SECURITY_ADMIN_PASSWORD=admin
      - GF_USERS_ALLOW_SIGN_UP=false
    networks:
      - logging_net
    depends_on:
      - loki

volumes:
  loki_data:
  alloy_data:
  grafana_logging_data:

networks:
  logging_net:
    driver: bridge
```

## Step 3: Configure Loki and Alloy

```yaml
# loki-config.yaml - Loki storage configuration
auth_enabled: false

server:
  http_listen_port: 3100

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
    - from: 2020-10-24
      store: tsdb
      object_store: filesystem
      schema: v13
      index:
        prefix: index_
        period: 24h

limits_config:
  retention_period: 720h  # Keep logs for 30 days

compactor:
  working_directory: /loki/compactor
  compaction_interval: 10m
  retention_enabled: true
  delete_request_store: filesystem

frontend:
  encoding: protobuf
```

```alloy
# alloy-config.alloy - Collect from all Docker containers
discovery.docker "containers" {
  host             = "unix:///var/run/docker.sock"
  refresh_interval = "5s"
}

discovery.relabel "containers" {
  targets = []

  rule {
    source_labels = ["__meta_docker_container_name"]
    regex         = "/(.*)"
    target_label  = "container"
  }

  rule {
    source_labels = ["__meta_docker_container_log_stream"]
    target_label  = "stream"
  }

  rule {
    source_labels = ["__meta_docker_container_label_com_docker_compose_service"]
    target_label  = "service"
  }

  rule {
    source_labels = ["__meta_docker_container_label_com_docker_compose_project"]
    target_label  = "stack"
  }
}

loki.source.docker "containers" {
  host             = "unix:///var/run/docker.sock"
  targets          = discovery.docker.containers.targets
  labels           = {"platform" = "docker"}
  relabel_rules    = discovery.relabel.containers.rules
  forward_to       = [loki.write.local.receiver]
  refresh_interval = "5s"
}

loki.write "local" {
  endpoint {
    url = "http://loki:3100/loki/api/v1/push"
  }
}
```

## Step 4: Configure Grafana Loki Datasource

```yaml
# grafana-datasources.yaml - Auto-provision Loki datasource
apiVersion: 1

datasources:
  - name: Loki
    type: loki
    access: proxy
    url: http://loki:3100
    isDefault: true
    version: 1
    editable: false
    jsonData:
      maxLines: 1000
```

## Step 5: Query Logs with LogQL

```text
# LogQL queries for common use cases in Grafana Explore:

# All logs from a specific container
{container="api"}

# Error logs across all containers
{stack="myapp"} |= "error"

# Logs from a specific stack
{stack="myapp"} | line_format "{{.container}}: {{ __line__ }}"

# Count errors per container over 5 minutes
sum by (container) (
  count_over_time({stack="myapp"} |= "error" [5m])
)

# Extract HTTP status codes from nginx access logs
{container="nginx"} | pattern '<ip> - - [<_>] "<method> <path> <_>" <status> <_>'
| status >= 500

# Query recent logs through the Loki HTTP API
# curl -G -s "http://localhost:3100/loki/api/v1/query_range" \
#   --data-urlencode 'query={container="api"}' \
#   --data-urlencode "start=$(date -d '5 minutes ago' +%s)000000000" \
#   --data-urlencode "end=$(date +%s)000000000" | jq
```

## Step 6: Send Container Logs via Docker Log Driver to Loki

```bash
# Install the Loki Docker logging driver plugin on each Docker host
docker plugin install grafana/loki-docker-driver:3.7.0-amd64 --alias loki --grant-all-permissions

# Use grafana/loki-docker-driver:3.7.0-arm64 on ARM hosts
```

```yaml
# Configure containers to send directly to Loki
services:
  api:
    image: myapp/api:latest
    logging:
      driver: loki
      options:
        loki-url: "http://loki:3100/loki/api/v1/push"
        loki-batch-size: "400"
        loki-retries: "5"
        loki-external-labels: "container_name={{.Name}},service=api,environment=production,host=${HOSTNAME}"
        max-size: "10m"
        max-file: "3"
```

## Conclusion

Centralized logging transforms troubleshooting from container-by-container log inspection to cross-service search and correlation. The Alloy + Loki + Grafana stack is resource-efficient - Loki indexes only log metadata (labels), not the log content, keeping storage costs low. Grafana Alloy's Docker discovery automatically picks up new containers without configuration changes. Portainer's log viewer remains useful for quick checks, while Grafana Explore and Loki's LogQL handle complex cross-service queries, error aggregation, and alerting.
