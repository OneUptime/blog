# How to Deploy Loki via Portainer

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Portainer, Loki, Logging, Grafana, Docker

Description: Learn how to deploy Grafana Loki via Portainer as a lightweight, cost-effective log aggregation system that integrates natively with Grafana for log exploration.

## What Is Loki?

Loki is Grafana's log aggregation system. Unlike Elasticsearch, Loki only indexes log labels (not the full log text), making it more storage-efficient. Logs are queried using LogQL, similar to PromQL.

## Loki + Promtail Stack via Portainer

**Stacks → Add Stack → loki**

```yaml
version: "3.8"

services:
  loki:
    image: grafana/loki:3.0.0
    restart: unless-stopped
    command: -config.file=/etc/loki/local-config.yaml
    volumes:
      - ./loki-config.yml:/etc/loki/local-config.yaml:ro
      - loki_data:/loki
    ports:
      - "3100:3100"
    healthcheck:
      test: ["CMD-SHELL", "wget -q --spider http://localhost:3100/ready || exit 1"]
      interval: 10s
      retries: 5

  promtail:
    image: grafana/promtail:3.0.0
    restart: unless-stopped
    command: -config.file=/etc/promtail/config.yml
    volumes:
      - ./promtail-config.yml:/etc/promtail/config.yml:ro
      - /var/log:/var/log:ro
      - /var/lib/docker/containers:/var/lib/docker/containers:ro
      - /run/docker.sock:/run/docker.sock:ro

volumes:
  loki_data:
```

## Loki Configuration

```yaml
# loki-config.yml

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

schema_config:
  configs:
    - from: 2024-01-01
      store: tsdb
      object_store: filesystem
      schema: v13
      index:
        prefix: index_
        period: 24h

limits_config:
  retention_period: 168h    # 7 days
```

## Promtail Configuration

```yaml
# promtail-config.yml
server:
  http_listen_port: 9080

positions:
  filename: /tmp/positions.yaml

clients:
  - url: http://loki:3100/loki/api/v1/push

scrape_configs:
  # Collect all Docker container logs
  - job_name: containers
    static_configs:
      - targets:
          - localhost
        labels:
          job: containers
          __path__: /var/lib/docker/containers/*/*-json.log

    pipeline_stages:
      - json:
          expressions:
            output: log
            stream: stream
            attrs:
      - json:
          expressions:
            tag: attrs.tag
          source: attrs
      - regex:
          expression: (?P<container_name>(?:[^|]*))\|0
          source: tag
      - labels:
          stream:
          container_name:
      - output:
          source: output

  # Collect system logs
  - job_name: syslog
    static_configs:
      - targets:
          - localhost
        labels:
          job: syslog
          __path__: /var/log/syslog
```

## Add Loki to Grafana

1. In Grafana: **Configuration → Data Sources → Add Data Source → Loki**
2. URL: `http://loki:3100`
3. Click **Save & Test**

## Querying Logs with LogQL

In Grafana Explore:

```logql
# View all logs from a specific container
{container_name="myapp"}

# Filter for errors
{container_name="myapp"} |= "ERROR"

# Parse JSON logs and filter
{container_name="api"} | json | level="error"

# Count errors per minute
rate({container_name="api"} |= "ERROR" [1m])
```

## Using Docker Log Driver (Alternative to Promtail)

Send container logs directly to Loki without Promtail:

```yaml
services:
  myapp:
    image: myapp:latest
    logging:
      driver: loki
      options:
        loki-url: "http://localhost:3100/loki/api/v1/push"
        loki-external-labels: "container_name={{.Name}},job=docker"
```

Install the Loki Docker driver: `docker plugin install grafana/loki-docker-driver --alias loki`

## Conclusion

Loki via Portainer is a lightweight, resource-efficient alternative to Elasticsearch for log aggregation. Promtail automatically collects and labels logs from all Docker containers on the host. Combined with Grafana, you get native log correlation with Prometheus metrics - switching between metrics and logs for the same container with a single click.
