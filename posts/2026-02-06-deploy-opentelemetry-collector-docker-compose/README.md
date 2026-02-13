# How to Deploy the OpenTelemetry Collector on Docker and Docker Compose

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: OpenTelemetry, Collector, Docker, Docker Compose, Deployment, Containers, Observability

Description: Deploy OpenTelemetry Collectors using Docker and Docker Compose for local development, testing, and production environments with complete configuration examples.

Docker and Docker Compose provide a straightforward way to deploy OpenTelemetry Collectors in containerized environments. Whether you're setting up local development, testing integrations, or running production workloads on Docker, this approach offers portability, reproducibility, and easy configuration management.

## Understanding Collector Docker Images

The OpenTelemetry project provides official Docker images through GitHub Container Registry:

**Core Collector** (`otel/opentelemetry-collector`): Contains essential receivers, processors, and exporters. Lightweight and suitable for basic use cases.

**Contrib Collector** (`otel/opentelemetry-collector-contrib`): Includes additional community-contributed components like cloud provider exporters, specialized receivers, and advanced processors. Recommended for most deployments.

Images are tagged with version numbers and architecture variants:

```bash
# Latest stable version
otel/opentelemetry-collector-contrib:0.93.0

# Latest release (not recommended for production)
otel/opentelemetry-collector-contrib:latest

# Specific architecture
otel/opentelemetry-collector-contrib:0.93.0-amd64
otel/opentelemetry-collector-contrib:0.93.0-arm64
```

## Running a Basic Collector with Docker

Start with a simple Docker deployment to understand the fundamentals:

```bash
# Create a configuration file
cat > collector-config.yaml << 'EOF'
receivers:
  otlp:
    protocols:
      grpc:
        endpoint: 0.0.0.0:4317
      http:
        endpoint: 0.0.0.0:4318

processors:
  batch:
    timeout: 10s

exporters:
  logging:
    verbosity: detailed

service:
  pipelines:
    traces:
      receivers: [otlp]
      processors: [batch]
      exporters: [logging]
    metrics:
      receivers: [otlp]
      processors: [batch]
      exporters: [logging]
    logs:
      receivers: [otlp]
      processors: [batch]
      exporters: [logging]
EOF

# Run the collector
docker run -d \
  --name otel-collector \
  -p 4317:4317 \
  -p 4318:4318 \
  -p 8888:8888 \
  -v $(pwd)/collector-config.yaml:/etc/otelcol/config.yaml \
  otel/opentelemetry-collector-contrib:0.93.0

# View logs
docker logs -f otel-collector

# Check collector health
curl http://localhost:8888/metrics

# Stop and remove
docker stop otel-collector
docker rm otel-collector
```

Key considerations for Docker deployments:

- **Port mapping**: Expose necessary ports for receivers and metrics
- **Configuration mounting**: Mount config files from the host
- **Persistent data**: Use volumes for queues and storage
- **Networking**: Connect to application containers using Docker networks

## Complete Docker Compose Setup

Docker Compose enables multi-container deployments with dependencies and networking:

```yaml
# docker-compose.yaml
# Complete observability stack with collector, backends, and applications

version: '3.8'

services:
  # OpenTelemetry Collector
  otel-collector:
    image: otel/opentelemetry-collector-contrib:0.93.0
    container_name: otel-collector
    command: ["--config=/etc/otelcol/config.yaml"]
    volumes:
      # Mount configuration file
      - ./collector-config.yaml:/etc/otelcol/config.yaml
      # Persistent storage for queues and file storage
      - collector-data:/data
    ports:
      # OTLP gRPC receiver
      - "4317:4317"
      # OTLP HTTP receiver
      - "4318:4318"
      # Prometheus metrics endpoint
      - "8888:8888"
      # Health check endpoint
      - "13133:13133"
    environment:
      # Environment variables for configuration
      - OTEL_LOG_LEVEL=info
    networks:
      - observability
    restart: unless-stopped
    healthcheck:
      test: ["CMD", "wget", "--spider", "-q", "http://localhost:13133"]
      interval: 30s
      timeout: 5s
      retries: 3
      start_period: 10s

  # Jaeger backend for traces
  jaeger:
    image: jaegertracing/all-in-one:1.52
    container_name: jaeger
    environment:
      - COLLECTOR_OTLP_ENABLED=true
    ports:
      # Jaeger UI
      - "16686:16686"
      # OTLP gRPC
      - "4320:4317"
      # OTLP HTTP
      - "4321:4318"
    networks:
      - observability
    restart: unless-stopped

  # Prometheus for metrics
  prometheus:
    image: prom/prometheus:v2.48.0
    container_name: prometheus
    command:
      - '--config.file=/etc/prometheus/prometheus.yml'
      - '--storage.tsdb.path=/prometheus'
      - '--web.enable-lifecycle'
      - '--web.enable-remote-write-receiver'
    volumes:
      - ./prometheus.yml:/etc/prometheus/prometheus.yml
      - prometheus-data:/prometheus
    ports:
      - "9090:9090"
    networks:
      - observability
    restart: unless-stopped

  # Loki for logs
  loki:
    image: grafana/loki:2.9.3
    container_name: loki
    ports:
      - "3100:3100"
    volumes:
      - ./loki-config.yaml:/etc/loki/local-config.yaml
      - loki-data:/loki
    command: -config.file=/etc/loki/local-config.yaml
    networks:
      - observability
    restart: unless-stopped

  # Grafana for visualization
  grafana:
    image: grafana/grafana:10.2.3
    container_name: grafana
    environment:
      - GF_AUTH_ANONYMOUS_ENABLED=true
      - GF_AUTH_ANONYMOUS_ORG_ROLE=Admin
      - GF_SECURITY_ADMIN_PASSWORD=admin
    ports:
      - "3000:3000"
    volumes:
      - grafana-data:/var/lib/grafana
      - ./grafana-datasources.yaml:/etc/grafana/provisioning/datasources/datasources.yaml
    networks:
      - observability
    restart: unless-stopped
    depends_on:
      - prometheus
      - loki
      - jaeger

  # Sample application for testing
  sample-app:
    image: otel/opentelemetry-demo-frontend:latest
    container_name: sample-app
    environment:
      # Send telemetry to collector
      - OTEL_EXPORTER_OTLP_ENDPOINT=http://otel-collector:4318
      - OTEL_SERVICE_NAME=sample-app
      - OTEL_RESOURCE_ATTRIBUTES=deployment.environment=dev
    ports:
      - "8080:8080"
    networks:
      - observability
    depends_on:
      - otel-collector

networks:
  observability:
    driver: bridge

volumes:
  collector-data:
  prometheus-data:
  loki-data:
  grafana-data:
```

Create the collector configuration file:

```yaml
# collector-config.yaml
# Production-ready collector configuration for Docker Compose

receivers:
  # OTLP receiver for application telemetry
  otlp:
    protocols:
      grpc:
        endpoint: 0.0.0.0:4317
      http:
        endpoint: 0.0.0.0:4318
        cors:
          allowed_origins:
            - "http://*"
            - "https://*"

  # Prometheus receiver to scrape metrics
  prometheus:
    config:
      scrape_configs:
        # Scrape collector's own metrics
        - job_name: 'otel-collector'
          scrape_interval: 30s
          static_configs:
            - targets: ['localhost:8888']

        # Scrape other services in the stack
        - job_name: 'prometheus'
          static_configs:
            - targets: ['prometheus:9090']

        - job_name: 'jaeger'
          static_configs:
            - targets: ['jaeger:14269']

  # Docker stats receiver for container metrics
  docker_stats:
    endpoint: unix:///var/run/docker.sock
    collection_interval: 30s
    timeout: 10s
    metrics:
      container.cpu.usage.total:
        enabled: true
      container.memory.usage.total:
        enabled: true
      container.network.io.usage.rx_bytes:
        enabled: true
      container.network.io.usage.tx_bytes:
        enabled: true

processors:
  # Memory limiter to prevent OOM
  memory_limiter:
    check_interval: 1s
    limit_mib: 512
    spike_limit_mib: 128

  # Batch processor for efficient export
  batch:
    timeout: 10s
    send_batch_size: 1024

  # Add resource attributes
  resource:
    attributes:
      - key: deployment.environment
        value: docker-compose
        action: insert
      - key: service.namespace
        value: local
        action: insert

  # Filter out noisy metrics
  filter/drop_internal:
    metrics:
      exclude:
        match_type: regexp
        metric_names:
          - ".*grpc.*"
          - ".*http.*"

  # Transform metric names
  metricstransform:
    transforms:
      - include: "^container\\..*"
        match_type: regexp
        action: update
        operations:
          - action: add_label
            new_label: source
            new_value: docker

exporters:
  # Export to Jaeger for traces
  otlp/jaeger:
    endpoint: jaeger:4317
    tls:
      insecure: true

  # Export to Prometheus for metrics
  prometheusremotewrite:
    endpoint: http://prometheus:9090/api/v1/write
    tls:
      insecure: true

  # Export to Loki for logs
  loki:
    endpoint: http://loki:3100/loki/api/v1/push
    tls:
      insecure: true

  # Debug exporter for troubleshooting
  logging:
    verbosity: normal
    sampling_initial: 5
    sampling_thereafter: 200

  # File exporter for persistence
  file:
    path: /data/telemetry.json
    rotation:
      max_megabytes: 100
      max_days: 3
      max_backups: 3

extensions:
  # Health check extension
  health_check:
    endpoint: 0.0.0.0:13133

  # Performance profiler
  pprof:
    endpoint: 0.0.0.0:1777

  # Memory ballast for stable memory usage
  memory_ballast:
    size_mib: 165

  # File storage for persistent queues
  file_storage:
    directory: /data/storage
    timeout: 10s

service:
  extensions: [health_check, pprof, memory_ballast, file_storage]

  pipelines:
    traces:
      receivers: [otlp]
      processors: [memory_limiter, resource, batch]
      exporters: [otlp/jaeger, logging]

    metrics:
      receivers: [otlp, prometheus, docker_stats]
      processors: [memory_limiter, filter/drop_internal, metricstransform, resource, batch]
      exporters: [prometheusremotewrite, file, logging]

    logs:
      receivers: [otlp]
      processors: [memory_limiter, resource, batch]
      exporters: [loki, logging]

  telemetry:
    logs:
      level: info
      development: false
      encoding: json
    metrics:
      level: detailed
      address: 0.0.0.0:8888
```

Create supporting configuration files:

```yaml
# prometheus.yml
# Prometheus configuration for scraping collector
global:
  scrape_interval: 30s
  evaluation_interval: 30s

scrape_configs:
  - job_name: 'prometheus'
    static_configs:
      - targets: ['localhost:9090']

  - job_name: 'otel-collector'
    static_configs:
      - targets: ['otel-collector:8888']
```

```yaml
# loki-config.yaml
# Loki configuration for log storage
auth_enabled: false

server:
  http_listen_port: 3100
  grpc_listen_port: 9096

common:
  path_prefix: /loki
  storage:
    filesystem:
      chunks_directory: /loki/chunks
      rules_directory: /loki/rules
  replication_factor: 1
  ring:
    instance_addr: 127.0.0.1
    kvstore:
      store: inmemory

schema_config:
  configs:
    - from: 2020-10-24
      store: boltdb-shipper
      object_store: filesystem
      schema: v11
      index:
        prefix: index_
        period: 24h

limits_config:
  reject_old_samples: true
  reject_old_samples_max_age: 168h
  ingestion_rate_mb: 10
  ingestion_burst_size_mb: 20
```

```yaml
# grafana-datasources.yaml
# Grafana datasource configuration
apiVersion: 1

datasources:
  - name: Prometheus
    type: prometheus
    access: proxy
    url: http://prometheus:9090
    isDefault: true
    editable: true

  - name: Loki
    type: loki
    access: proxy
    url: http://loki:3100
    editable: true

  - name: Jaeger
    type: jaeger
    access: proxy
    url: http://jaeger:16686
    editable: true
```

Deploy the stack:

```bash
# Start all services
docker-compose up -d

# View logs from all services
docker-compose logs -f

# View collector logs only
docker-compose logs -f otel-collector

# Check service health
docker-compose ps

# Access services:
# - Grafana: http://localhost:3000
# - Prometheus: http://localhost:9090
# - Jaeger UI: http://localhost:16686
# - Sample App: http://localhost:8080

# Stop all services
docker-compose down

# Stop and remove volumes (clears all data)
docker-compose down -v
```

## Docker Compose for Two-Tier Architecture

Implement agent and gateway collectors:

```yaml
# docker-compose-two-tier.yaml
# Two-tier collector architecture with agents and gateways

version: '3.8'

services:
  # Gateway collector
  gateway-collector:
    image: otel/opentelemetry-collector-contrib:0.93.0
    container_name: gateway-collector
    command: ["--config=/etc/otelcol/config.yaml"]
    volumes:
      - ./gateway-config.yaml:/etc/otelcol/config.yaml
    ports:
      - "4317:4317"
      - "4318:4318"
      - "8888:8888"
    networks:
      - observability
    restart: unless-stopped

  # Agent collector 1
  agent-collector-1:
    image: otel/opentelemetry-collector-contrib:0.93.0
    container_name: agent-collector-1
    command: ["--config=/etc/otelcol/config.yaml"]
    volumes:
      - ./agent-config.yaml:/etc/otelcol/config.yaml
    ports:
      - "4327:4317"
      - "4328:4318"
    environment:
      - AGENT_ID=agent-1
      - GATEWAY_ENDPOINT=gateway-collector:4317
    networks:
      - observability
    depends_on:
      - gateway-collector
    restart: unless-stopped

  # Agent collector 2
  agent-collector-2:
    image: otel/opentelemetry-collector-contrib:0.93.0
    container_name: agent-collector-2
    command: ["--config=/etc/otelcol/config.yaml"]
    volumes:
      - ./agent-config.yaml:/etc/otelcol/config.yaml
    ports:
      - "4337:4317"
      - "4338:4318"
    environment:
      - AGENT_ID=agent-2
      - GATEWAY_ENDPOINT=gateway-collector:4317
    networks:
      - observability
    depends_on:
      - gateway-collector
    restart: unless-stopped

  # Application 1 sends to agent-1
  app-1:
    image: otel/opentelemetry-demo-frontend:latest
    container_name: app-1
    environment:
      - OTEL_EXPORTER_OTLP_ENDPOINT=http://agent-collector-1:4318
      - OTEL_SERVICE_NAME=app-1
    ports:
      - "8081:8080"
    networks:
      - observability
    depends_on:
      - agent-collector-1

  # Application 2 sends to agent-2
  app-2:
    image: otel/opentelemetry-demo-frontend:latest
    container_name: app-2
    environment:
      - OTEL_EXPORTER_OTLP_ENDPOINT=http://agent-collector-2:4318
      - OTEL_SERVICE_NAME=app-2
    ports:
      - "8082:8080"
    networks:
      - observability
    depends_on:
      - agent-collector-2

  # Backends
  jaeger:
    image: jaegertracing/all-in-one:1.52
    container_name: jaeger
    ports:
      - "16686:16686"
      - "4320:4317"
    networks:
      - observability

networks:
  observability:
    driver: bridge
```

Create agent configuration:

```yaml
# agent-config.yaml
receivers:
  otlp:
    protocols:
      grpc:
        endpoint: 0.0.0.0:4317
      http:
        endpoint: 0.0.0.0:4318

processors:
  memory_limiter:
    limit_mib: 256
  batch:
    timeout: 5s
  resource:
    attributes:
      - key: collector.tier
        value: agent
        action: insert
      - key: agent.id
        value: ${AGENT_ID}
        action: insert

exporters:
  otlp:
    endpoint: ${GATEWAY_ENDPOINT}
    tls:
      insecure: true

service:
  pipelines:
    traces:
      receivers: [otlp]
      processors: [memory_limiter, resource, batch]
      exporters: [otlp]
    metrics:
      receivers: [otlp]
      processors: [memory_limiter, resource, batch]
      exporters: [otlp]
    logs:
      receivers: [otlp]
      processors: [memory_limiter, resource, batch]
      exporters: [otlp]
```

Create gateway configuration:

```yaml
# gateway-config.yaml
receivers:
  otlp:
    protocols:
      grpc:
        endpoint: 0.0.0.0:4317
      http:
        endpoint: 0.0.0.0:4318

processors:
  memory_limiter:
    limit_mib: 1024
  batch:
    timeout: 10s
    send_batch_size: 2048
  resource:
    attributes:
      - key: collector.tier
        value: gateway
        action: insert

exporters:
  otlp/jaeger:
    endpoint: jaeger:4317
    tls:
      insecure: true

service:
  pipelines:
    traces:
      receivers: [otlp]
      processors: [memory_limiter, resource, batch]
      exporters: [otlp/jaeger]
    metrics:
      receivers: [otlp]
      processors: [memory_limiter, resource, batch]
      exporters: [otlp/jaeger]
    logs:
      receivers: [otlp]
      processors: [memory_limiter, resource, batch]
      exporters: [otlp/jaeger]
```

## Using Docker Networks for Service Discovery

Docker networks enable automatic service discovery:

```yaml
# Applications reference collectors by service name
environment:
  - OTEL_EXPORTER_OTLP_ENDPOINT=http://otel-collector:4318

# Collectors reference backends by service name
exporters:
  otlp:
    endpoint: jaeger:4317
```

Create custom networks for isolation:

```yaml
networks:
  # Frontend network for application traffic
  frontend:
    driver: bridge
  # Backend network for collector-to-backend traffic
  backend:
    driver: bridge

services:
  app:
    networks:
      - frontend

  collector:
    networks:
      - frontend
      - backend

  jaeger:
    networks:
      - backend
```

## Mounting Docker Socket for Container Metrics

To collect Docker container metrics, mount the Docker socket:

```yaml
services:
  otel-collector:
    volumes:
      - /var/run/docker.sock:/var/run/docker.sock:ro
    # Note: This grants the collector access to Docker daemon
    # Use with caution in production
```

Update configuration to enable docker_stats receiver:

```yaml
receivers:
  docker_stats:
    endpoint: unix:///var/run/docker.sock
    collection_interval: 30s
```

## Environment Variable Substitution

Use environment variables for dynamic configuration:

```yaml
services:
  otel-collector:
    environment:
      - BACKEND_ENDPOINT=jaeger:4317
      - SAMPLING_RATE=0.1
      - ENVIRONMENT=production

# In collector-config.yaml
exporters:
  otlp:
    endpoint: ${BACKEND_ENDPOINT}

processors:
  probabilistic_sampler:
    sampling_percentage: ${SAMPLING_RATE}
```

Use `.env` file for sensitive values:

```bash
# .env
PROM_BEARER_TOKEN=secret-token-here
JAEGER_ENDPOINT=jaeger:4317
```

Reference in compose file:

```yaml
services:
  otel-collector:
    environment:
      - PROM_TOKEN=${PROM_BEARER_TOKEN}
      - BACKEND=${JAEGER_ENDPOINT}
```

## Health Checks and Dependencies

Configure health checks for reliable startup:

```yaml
services:
  otel-collector:
    healthcheck:
      test: ["CMD", "wget", "--spider", "-q", "http://localhost:13133"]
      interval: 10s
      timeout: 5s
      retries: 5
      start_period: 10s

  application:
    depends_on:
      otel-collector:
        condition: service_healthy
```

## Resource Limits

Set resource limits to prevent container overload:

```yaml
services:
  otel-collector:
    deploy:
      resources:
        limits:
          cpus: '2.0'
          memory: 2G
        reservations:
          cpus: '0.5'
          memory: 512M
```

## Production Considerations

For production Docker deployments:

1. **Use specific image tags**, not `latest`
2. **Mount certificates** for TLS connections
3. **Enable persistent queues** with volumes
4. **Configure log rotation** to prevent disk filling
5. **Set resource limits** to prevent resource exhaustion
6. **Use secrets management** for credentials
7. **Enable health checks** for container orchestration
8. **Implement backup strategies** for persistent data

## Troubleshooting

Common issues and solutions:

```bash
# Check collector logs
docker-compose logs otel-collector

# Verify network connectivity
docker-compose exec otel-collector wget -O- http://jaeger:16686

# Test OTLP endpoint
docker-compose exec otel-collector \
  curl -X POST http://localhost:4318/v1/traces \
  -H "Content-Type: application/json" \
  -d '{"resourceSpans":[]}'

# Check metrics endpoint
docker-compose exec otel-collector curl http://localhost:8888/metrics

# Validate configuration
docker-compose exec otel-collector \
  /otelcol-contrib validate --config=/etc/otelcol/config.yaml

# Inspect container
docker inspect otel-collector
```

## Related Resources

For other deployment options, see:

- [How to Deploy the OpenTelemetry Collector with the Kubernetes Operator](https://oneuptime.com/blog/post/2026-02-06-deploy-opentelemetry-collector-kubernetes-operator/view)
- [How to Deploy the OpenTelemetry Collector on AWS ECS Fargate](https://oneuptime.com/blog/post/2026-02-06-deploy-opentelemetry-collector-aws-ecs-fargate/view)
- [How to Set Up a Two-Tier Collector Architecture (Agent + Gateway)](https://oneuptime.com/blog/post/2026-02-06-two-tier-collector-architecture-agent-gateway/view)

Docker and Docker Compose provide a flexible, portable platform for deploying OpenTelemetry Collectors across development, testing, and production environments. The containerized approach ensures consistent behavior and simplifies configuration management.
