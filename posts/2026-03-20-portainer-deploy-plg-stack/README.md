# How to Deploy the PLG Stack (Promtail, Loki, Grafana) via Portainer - Deploy

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Portainer, PLG Stack, Promtail, Loki, Grafana, Logging

Description: Learn how to deploy the PLG logging stack (Promtail, Loki, Grafana) via Portainer for lightweight, efficient container log aggregation.

---

The PLG stack (Promtail, Loki, Grafana) is a lightweight alternative to the EFK stack. Loki indexes only log metadata (labels) rather than full text, making it far more storage-efficient. Grafana provides the query UI using LogQL. Promtail reached end-of-life on March 2, 2026, so for new deployments Grafana recommends Grafana Alloy; the configuration below is for existing Promtail-based setups.

## Stack Definition

In Portainer, save `loki.yaml`, `promtail.yaml`, and `grafana-datasources.yaml` on the Docker host under `/opt/plg`, then create a stack named `plg`:

```yaml
services:
  loki:
    image: grafana/loki:2.9.4
    command: -config.file=/etc/loki/loki.yaml
    volumes:
      - /opt/plg/loki.yaml:/etc/loki/loki.yaml:ro
      - loki_data:/loki
    ports:
      - "3100:3100"
    networks:
      - plg_net
    healthcheck:
      test: ["CMD-SHELL", "wget -q --spider http://localhost:3100/ready || exit 1"]
      interval: 10s
      timeout: 5s
      retries: 5

  promtail:
    image: grafana/promtail:2.9.4
    command: -config.file=/etc/promtail/promtail.yaml
    volumes:
      - /opt/plg/promtail.yaml:/etc/promtail/promtail.yaml:ro
      - /var/run/docker.sock:/var/run/docker.sock:ro
    networks:
      - plg_net
    depends_on:
      loki:
        condition: service_healthy

  grafana:
    image: grafana/grafana:10.3.1
    environment:
      GF_SECURITY_ADMIN_PASSWORD: grafanapassword
      GF_USERS_ALLOW_SIGN_UP: "false"
    ports:
      - "3000:3000"
    volumes:
      - grafana_data:/var/lib/grafana
      - /opt/plg/grafana-datasources.yaml:/etc/grafana/provisioning/datasources/loki.yaml:ro
    networks:
      - plg_net
    depends_on:
      - loki

volumes:
  loki_data:
  grafana_data:

networks:
  plg_net:
    driver: bridge
```

## Loki Configuration

Create `/opt/plg/loki.yaml`:

```yaml
auth_enabled: false

server:
  http_listen_port: 3100

ingester:
  lifecycler:
    address: 127.0.0.1
    ring:
      kvstore:
        store: inmemory
      replication_factor: 1
  chunk_idle_period: 3m
  max_chunk_age: 1h

schema_config:
  configs:
    - from: 2024-01-01
      store: boltdb-shipper
      object_store: filesystem
      schema: v11
      index:
        prefix: index_
        period: 24h

storage_config:
  boltdb_shipper:
    active_index_directory: /loki/boltdb-shipper-active
    cache_location: /loki/boltdb-shipper-cache
    shared_store: filesystem
  filesystem:
    directory: /loki/chunks

limits_config:
  retention_period: 30d
  ingestion_rate_mb: 16
  ingestion_burst_size_mb: 32

compactor:
  working_directory: /loki/compactor
  shared_store: filesystem
  retention_enabled: true
```

## Promtail Configuration

Create `/opt/plg/promtail.yaml` for Docker log discovery:

```yaml
server:
  http_listen_port: 9080
  grpc_listen_port: 0

positions:
  filename: /tmp/positions.yaml

clients:
  - url: http://loki:3100/loki/api/v1/push

scrape_configs:
  - job_name: docker
    docker_sd_configs:
      - host: unix:///var/run/docker.sock
        refresh_interval: 5s
        filters:
          - name: status
            values: ["running"]
    pipeline_stages:
      - docker: {}
    relabel_configs:
      - source_labels: ['__meta_docker_container_name']
        regex: '/(.*)'
        target_label: container
      - source_labels: ['__meta_docker_container_image']
        target_label: image
      - source_labels: ['__meta_docker_compose_service']
        target_label: service
      - source_labels: ['__meta_docker_compose_project']
        target_label: stack
```

## Grafana Auto-Provisioned Loki Datasource

Create `/opt/plg/grafana-datasources.yaml` to pre-configure the Loki data source:

```yaml
apiVersion: 1

datasources:
  - name: Loki
    type: loki
    access: proxy
    url: http://loki:3100
    isDefault: true
    editable: false
```

## Querying Logs with LogQL

In Grafana's Explore view with the Loki data source:

```logql
# All logs from a stack

{stack="my-app"}

# Error logs from the API service
{service="api"} |= "ERROR"

# JSON log parsing with filter
{service="api"} | json | level="error" | line_format "{{.msg}}"

# Rate of errors per service over 5 minutes
sum by (service) (rate({stack="my-app"} |= "error" [5m]))

# Requests slower than 500 ms
{service="api"} | json | response_ms > 500 | line_format "{{.response_ms}}ms {{.path}}"
```
