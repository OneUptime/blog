# How to Run Loki in Docker and Docker Compose

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Grafana Loki, Docker, Docker Compose, Log Management, Observability, Logging

Description: A comprehensive guide to running Grafana Loki in Docker containers, covering single-node setups, distributed deployments with Docker Compose, storage configuration, and production-ready configurations.

---

Grafana Loki is a horizontally scalable, highly available log aggregation system inspired by Prometheus. Unlike traditional log management systems that index the full content of logs, Loki only indexes metadata (labels), making it significantly more cost-effective and easier to operate. In this guide, you will learn how to run Loki in Docker for development and production environments.

## Prerequisites

Before starting, ensure you have:

- Docker Engine 20.10 or later installed
- Docker Compose v2.0 or later
- At least 2GB of available RAM
- Basic understanding of Docker networking

## Quick Start - Single Container

The fastest way to get Loki running is with a single Docker command:

```bash
docker run -d \
  --name loki \
  -p 3100:3100 \
  grafana/loki:2.9.4
```

Verify Loki is running:

```bash
curl http://localhost:3100/ready
```

You should see `ready` as the response.

## Basic Docker Compose Setup

For a more manageable setup, create a `docker-compose.yml` file:

```yaml
version: "3.8"

services:
  loki:
    image: grafana/loki:2.9.4
    container_name: loki
    ports:
      - "3100:3100"
    volumes:
      - loki-data:/loki
    command: -config.file=/etc/loki/local-config.yaml
    restart: unless-stopped
    healthcheck:
      test: ["CMD-SHELL", "wget --no-verbose --tries=1 --spider http://localhost:3100/ready || exit 1"]
      interval: 10s
      timeout: 5s
      retries: 5

volumes:
  loki-data:
```

Start the stack:

```bash
docker compose up -d
```

## Complete Stack with Grafana and Promtail

For a complete logging solution, deploy Loki with Grafana for visualization and Promtail for log collection:

```yaml
version: "3.8"

services:
  loki:
    image: grafana/loki:2.9.4
    container_name: loki
    ports:
      - "3100:3100"
    volumes:
      - ./loki-config.yaml:/etc/loki/local-config.yaml
      - loki-data:/loki
    command: -config.file=/etc/loki/local-config.yaml
    restart: unless-stopped
    networks:
      - loki-network
    healthcheck:
      test: ["CMD-SHELL", "wget --no-verbose --tries=1 --spider http://localhost:3100/ready || exit 1"]
      interval: 10s
      timeout: 5s
      retries: 5

  promtail:
    image: grafana/promtail:2.9.4
    container_name: promtail
    volumes:
      - ./promtail-config.yaml:/etc/promtail/config.yaml
      - /var/log:/var/log:ro
      - /var/lib/docker/containers:/var/lib/docker/containers:ro
    command: -config.file=/etc/promtail/config.yaml
    restart: unless-stopped
    networks:
      - loki-network
    depends_on:
      - loki

  grafana:
    image: grafana/grafana:10.3.1
    container_name: grafana
    ports:
      - "3000:3000"
    environment:
      - GF_SECURITY_ADMIN_USER=admin
      - GF_SECURITY_ADMIN_PASSWORD=admin
      - GF_USERS_ALLOW_SIGN_UP=false
    volumes:
      - grafana-data:/var/lib/grafana
      - ./grafana-provisioning:/etc/grafana/provisioning
    restart: unless-stopped
    networks:
      - loki-network
    depends_on:
      - loki

networks:
  loki-network:
    driver: bridge

volumes:
  loki-data:
  grafana-data:
```

## Loki Configuration File

Create a `loki-config.yaml` file with optimized settings:

```yaml
auth_enabled: false

server:
  http_listen_port: 3100
  grpc_listen_port: 9096
  log_level: info

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

ruler:
  alertmanager_url: http://localhost:9093

ingester:
  wal:
    enabled: true
    dir: /loki/wal
  lifecycler:
    ring:
      replication_factor: 1

limits_config:
  reject_old_samples: true
  reject_old_samples_max_age: 168h
  ingestion_rate_mb: 16
  ingestion_burst_size_mb: 24
  max_streams_per_user: 10000
  max_line_size: 256kb

chunk_store_config:
  chunk_cache_config:
    embedded_cache:
      enabled: true
      max_size_mb: 100

storage_config:
  tsdb_shipper:
    active_index_directory: /loki/tsdb-index
    cache_location: /loki/tsdb-cache

compactor:
  working_directory: /loki/compactor
  compaction_interval: 10m
  retention_enabled: true
  retention_delete_delay: 2h
  retention_delete_worker_count: 150
  delete_request_store: filesystem

table_manager:
  retention_deletes_enabled: true
  retention_period: 720h
```

## Promtail Configuration

Create a `promtail-config.yaml` file:

```yaml
server:
  http_listen_port: 9080
  grpc_listen_port: 0

positions:
  filename: /tmp/positions.yaml

clients:
  - url: http://loki:3100/loki/api/v1/push

scrape_configs:
  # Collect Docker container logs
  - job_name: docker
    static_configs:
      - targets:
          - localhost
        labels:
          job: docker
          __path__: /var/lib/docker/containers/*/*-json.log
    pipeline_stages:
      - json:
          expressions:
            log: log
            stream: stream
            time: time
      - labels:
          stream:
      - timestamp:
          source: time
          format: RFC3339Nano
      - output:
          source: log

  # Collect system logs
  - job_name: system
    static_configs:
      - targets:
          - localhost
        labels:
          job: syslog
          __path__: /var/log/syslog
      - targets:
          - localhost
        labels:
          job: authlog
          __path__: /var/log/auth.log
```

## Grafana Data Source Provisioning

Create the directory structure and provisioning file:

```bash
mkdir -p grafana-provisioning/datasources
```

Create `grafana-provisioning/datasources/loki.yaml`:

```yaml
apiVersion: 1

datasources:
  - name: Loki
    type: loki
    access: proxy
    url: http://loki:3100
    isDefault: true
    editable: false
    jsonData:
      maxLines: 1000
```

## Distributed Mode with Docker Compose

For production environments handling high log volumes, deploy Loki in distributed mode:

```yaml
version: "3.8"

services:
  # Read path components
  loki-read:
    image: grafana/loki:2.9.4
    container_name: loki-read
    command: -config.file=/etc/loki/config.yaml -target=read
    volumes:
      - ./loki-distributed-config.yaml:/etc/loki/config.yaml
      - loki-read-data:/loki
    ports:
      - "3101:3100"
    networks:
      - loki-network
    deploy:
      replicas: 2

  # Write path components
  loki-write:
    image: grafana/loki:2.9.4
    container_name: loki-write
    command: -config.file=/etc/loki/config.yaml -target=write
    volumes:
      - ./loki-distributed-config.yaml:/etc/loki/config.yaml
      - loki-write-data:/loki
    ports:
      - "3102:3100"
    networks:
      - loki-network
    deploy:
      replicas: 2

  # Backend components (compactor, ruler)
  loki-backend:
    image: grafana/loki:2.9.4
    container_name: loki-backend
    command: -config.file=/etc/loki/config.yaml -target=backend
    volumes:
      - ./loki-distributed-config.yaml:/etc/loki/config.yaml
      - loki-backend-data:/loki
    ports:
      - "3103:3100"
    networks:
      - loki-network

  # Gateway for load balancing
  loki-gateway:
    image: nginx:1.25
    container_name: loki-gateway
    volumes:
      - ./nginx.conf:/etc/nginx/nginx.conf:ro
    ports:
      - "3100:80"
    networks:
      - loki-network
    depends_on:
      - loki-read
      - loki-write

  # MinIO for object storage
  minio:
    image: minio/minio:latest
    container_name: minio
    entrypoint:
      - sh
      - -euc
      - |
        mkdir -p /data/loki-data && \
        minio server /data --console-address ":9001"
    environment:
      - MINIO_ROOT_USER=loki
      - MINIO_ROOT_PASSWORD=supersecret
    ports:
      - "9000:9000"
      - "9001:9001"
    volumes:
      - minio-data:/data
    networks:
      - loki-network

networks:
  loki-network:
    driver: bridge

volumes:
  loki-read-data:
  loki-write-data:
  loki-backend-data:
  minio-data:
```

## Distributed Loki Configuration

Create `loki-distributed-config.yaml`:

```yaml
auth_enabled: false

server:
  http_listen_port: 3100
  grpc_listen_port: 9095

common:
  path_prefix: /loki
  replication_factor: 2
  ring:
    kvstore:
      store: memberlist

memberlist:
  join_members:
    - loki-read:7946
    - loki-write:7946
    - loki-backend:7946

schema_config:
  configs:
    - from: 2020-10-24
      store: tsdb
      object_store: s3
      schema: v13
      index:
        prefix: index_
        period: 24h

storage_config:
  tsdb_shipper:
    active_index_directory: /loki/tsdb-index
    cache_location: /loki/tsdb-cache
  aws:
    s3: s3://loki:supersecret@minio:9000/loki-data
    s3forcepathstyle: true

limits_config:
  reject_old_samples: true
  reject_old_samples_max_age: 168h
  ingestion_rate_mb: 32
  ingestion_burst_size_mb: 48
  max_streams_per_user: 50000

compactor:
  working_directory: /loki/compactor
  compaction_interval: 10m
  retention_enabled: true
  retention_delete_delay: 2h
  delete_request_store: s3

ingester:
  wal:
    enabled: true
    dir: /loki/wal
  lifecycler:
    ring:
      replication_factor: 2

querier:
  max_concurrent: 4

query_scheduler:
  max_outstanding_requests_per_tenant: 2048

frontend:
  max_outstanding_per_tenant: 2048
  compress_responses: true

query_range:
  parallelise_shardable_queries: true
  results_cache:
    cache:
      embedded_cache:
        enabled: true
        max_size_mb: 200
```

## NGINX Gateway Configuration

Create `nginx.conf` for load balancing:

```nginx
worker_processes  5;
error_log  /dev/stderr;

events {
  worker_connections  4096;
}

http {
  default_type application/octet-stream;
  log_format main '$remote_addr - $remote_user [$time_local] "$request" '
                  '$status $body_bytes_sent "$http_referer" '
                  '"$http_user_agent"';
  access_log /dev/stderr main;

  sendfile     on;
  tcp_nopush   on;

  upstream loki-read {
    server loki-read:3100;
  }

  upstream loki-write {
    server loki-write:3100;
  }

  server {
    listen 80;

    location = /ready {
      proxy_pass http://loki-read/ready;
    }

    location = /loki/api/v1/push {
      proxy_pass http://loki-write$request_uri;
    }

    location /loki/api/v1/tail {
      proxy_pass http://loki-read$request_uri;
      proxy_set_header Upgrade $http_upgrade;
      proxy_set_header Connection "upgrade";
    }

    location ~ /loki/api/.* {
      proxy_pass http://loki-read$request_uri;
    }
  }
}
```

## Testing Your Loki Setup

### Push Test Logs via API

```bash
curl -X POST "http://localhost:3100/loki/api/v1/push" \
  -H "Content-Type: application/json" \
  -d '{
    "streams": [
      {
        "stream": {
          "job": "test",
          "level": "info"
        },
        "values": [
          ["'"$(date +%s)"'000000000", "This is a test log message"],
          ["'"$(date +%s)"'000000001", "Another test log message"]
        ]
      }
    ]
  }'
```

### Query Logs via API

```bash
curl -G "http://localhost:3100/loki/api/v1/query_range" \
  --data-urlencode 'query={job="test"}' \
  --data-urlencode 'start='$(date -d '1 hour ago' +%s)'000000000' \
  --data-urlencode 'end='$(date +%s)'000000000' \
  --data-urlencode 'limit=100' | jq .
```

### Basic LogQL Queries

Once your logs are flowing, use these LogQL queries in Grafana:

```logql
# View all logs from a specific job
{job="docker"}

# Filter logs containing specific text
{job="docker"} |= "error"

# Case-insensitive search
{job="docker"} |~ "(?i)error"

# Exclude certain patterns
{job="docker"} != "healthcheck"

# Parse JSON logs and filter
{job="docker"} | json | level="error"

# Count errors over time
count_over_time({job="docker"} |= "error" [5m])

# Error rate
sum(rate({job="docker"} |= "error" [5m]))
```

## Resource Limits and Performance Tuning

For production deployments, set resource limits in Docker Compose:

```yaml
services:
  loki:
    image: grafana/loki:2.9.4
    deploy:
      resources:
        limits:
          cpus: '2'
          memory: 4G
        reservations:
          cpus: '0.5'
          memory: 1G
    # ... rest of configuration
```

## Common Docker Commands for Loki

```bash
# View Loki logs
docker logs -f loki

# Check Loki metrics
curl http://localhost:3100/metrics

# Check configuration
curl http://localhost:3100/config

# Verify Loki is ready
curl http://localhost:3100/ready

# Check ingester status
curl http://localhost:3100/ring

# Restart Loki
docker compose restart loki

# Scale read replicas (distributed mode)
docker compose up -d --scale loki-read=3
```

## Troubleshooting

### Container Fails to Start

Check the logs for configuration errors:

```bash
docker logs loki 2>&1 | head -50
```

### Permission Issues

If you see permission errors, ensure proper ownership:

```bash
docker exec loki chown -R 10001:10001 /loki
```

### Memory Issues

If Loki is being killed by OOM, increase memory limits or tune the configuration:

```yaml
limits_config:
  max_streams_per_user: 5000
  max_line_size: 128kb
  ingestion_rate_mb: 8
  ingestion_burst_size_mb: 12
```

### Connectivity Issues

Verify network connectivity between containers:

```bash
docker exec promtail wget -q -O- http://loki:3100/ready
```

## Conclusion

You have learned how to deploy Grafana Loki using Docker and Docker Compose, from simple single-node setups to production-ready distributed deployments. Key takeaways include:

- Use the single-container setup for development and testing
- Deploy the complete stack with Grafana and Promtail for a full logging solution
- Use distributed mode with MinIO for production environments
- Always configure proper resource limits and retention policies
- Monitor Loki using its built-in metrics endpoint

The combination of Loki's efficient storage model and Docker's containerization provides a powerful, cost-effective logging solution that scales with your infrastructure needs.
