# How to Ship Docker Container Logs to Loki

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Grafana Loki, Docker, Container Logs, Loki Docker Driver, Log Shipping, Observability

Description: A comprehensive guide to shipping Docker container logs to Grafana Loki using the Loki Docker driver, sidecar patterns, and file-based collection methods.

---

Docker containers generate logs that are essential for debugging, monitoring, and auditing applications. Grafana Loki provides multiple methods for collecting Docker container logs, from the native Loki Docker driver to sidecar patterns and file-based collection. This guide covers all approaches with production-ready configurations.

## Prerequisites

Before starting, ensure you have:

- Docker Engine 19.03 or later
- Grafana Loki instance running and accessible
- Docker Compose (optional, for multi-container setups)
- Basic understanding of Docker logging drivers

## Understanding Docker Logging

Docker supports multiple logging drivers:

| Driver | Description | Use Case |
|--------|-------------|----------|
| json-file | Default, writes to JSON files | Development, basic production |
| loki | Direct shipping to Loki | Simple Loki integration |
| fluentd | Ships to Fluentd | Existing Fluentd infrastructure |
| syslog | Ships to syslog | Legacy systems |
| journald | Ships to systemd journal | Linux systems |

## Method 1: Loki Docker Driver

The Loki Docker logging driver sends container logs directly to Loki.

### Installing the Loki Docker Driver

```bash
docker plugin install grafana/loki-docker-driver:2.9.4 --alias loki --grant-all-permissions
```

Verify installation:

```bash
docker plugin ls
```

### Using Loki Driver with Docker Run

```bash
docker run --log-driver=loki \
  --log-opt loki-url="http://loki:3100/loki/api/v1/push" \
  --log-opt loki-batch-size=400 \
  --log-opt loki-retries=5 \
  --log-opt loki-max-backoff=800ms \
  --log-opt loki-timeout=1s \
  --log-opt loki-external-labels="job=docker,container_name={{.Name}},container_id={{.ID}}" \
  nginx:latest
```

### Docker Compose Configuration

```yaml
version: "3.8"

services:
  app:
    image: myapp:latest
    logging:
      driver: loki
      options:
        loki-url: "http://loki:3100/loki/api/v1/push"
        loki-batch-size: "400"
        loki-retries: "5"
        loki-max-backoff: "800ms"
        loki-timeout: "1s"
        loki-pipeline-stages: |
          - json:
              expressions:
                level: level
                msg: msg
          - labels:
              level:
        loki-external-labels: "job=docker,environment=production"
    labels:
      logging: "promtail"
      logging_jobname: "myapp"

  nginx:
    image: nginx:latest
    logging:
      driver: loki
      options:
        loki-url: "http://loki:3100/loki/api/v1/push"
        loki-external-labels: "job=nginx,container_name={{.Name}}"
```

### Global Docker Daemon Configuration

Configure Loki as the default logging driver in `/etc/docker/daemon.json`:

```json
{
  "log-driver": "loki",
  "log-opts": {
    "loki-url": "http://loki:3100/loki/api/v1/push",
    "loki-batch-size": "400",
    "loki-retries": "5",
    "loki-max-backoff": "800ms",
    "loki-timeout": "1s",
    "loki-external-labels": "job=docker,host={{.Name}}"
  }
}
```

Restart Docker:

```bash
sudo systemctl restart docker
```

### Loki Driver Options

| Option | Description | Default |
|--------|-------------|---------|
| loki-url | Loki push API endpoint | Required |
| loki-batch-size | Number of log lines in a batch | 102400 |
| loki-batch-wait | Time to wait before sending batch | 1s |
| loki-timeout | Request timeout | 10s |
| loki-retries | Number of retries | 10 |
| loki-max-backoff | Max backoff time | 5s |
| loki-min-backoff | Min backoff time | 500ms |
| loki-external-labels | Additional labels | - |
| loki-pipeline-stages | Pipeline configuration | - |
| loki-tenant-id | Multi-tenant ID | - |
| loki-relabel-config | Relabel configuration | - |

### Template Variables

Use these variables in labels:

| Variable | Description |
|----------|-------------|
| {{.ID}} | Container ID |
| {{.FullID}} | Full container ID |
| {{.Name}} | Container name |
| {{.ImageID}} | Image ID |
| {{.ImageFullID}} | Full image ID |
| {{.ImageName}} | Image name |
| {{.DaemonName}} | Docker daemon name |

### Advanced Pipeline Configuration

```yaml
logging:
  driver: loki
  options:
    loki-url: "http://loki:3100/loki/api/v1/push"
    loki-pipeline-stages: |
      - multiline:
          firstline: '^\d{4}-\d{2}-\d{2}'
          max_wait_time: 3s
      - json:
          expressions:
            level: level
            message: msg
            timestamp: time
      - labels:
          level:
      - timestamp:
          source: timestamp
          format: RFC3339
      - output:
          source: message
```

## Method 2: Promtail with Docker File Logging

Collect logs from Docker's JSON file logging driver.

### Docker JSON File Configuration

```json
{
  "log-driver": "json-file",
  "log-opts": {
    "max-size": "100m",
    "max-file": "5",
    "labels": "app,environment"
  }
}
```

### Promtail Configuration

```yaml
server:
  http_listen_port: 9080
  grpc_listen_port: 0

positions:
  filename: /var/lib/promtail/positions.yaml

clients:
  - url: http://loki:3100/loki/api/v1/push

scrape_configs:
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
            attrs: attrs
      - regex:
          source: log
          expression: '^(?P<level>\w+)\s+(?P<message>.*)$'
      - labels:
          stream:
          level:
      - timestamp:
          source: time
          format: RFC3339Nano
      - output:
          source: log
```

### Docker Compose with Promtail Sidecar

```yaml
version: "3.8"

services:
  loki:
    image: grafana/loki:2.9.4
    ports:
      - "3100:3100"
    volumes:
      - loki-data:/loki
    command: -config.file=/etc/loki/local-config.yaml

  promtail:
    image: grafana/promtail:2.9.4
    volumes:
      - /var/lib/docker/containers:/var/lib/docker/containers:ro
      - /var/run/docker.sock:/var/run/docker.sock:ro
      - ./promtail-config.yaml:/etc/promtail/config.yaml
      - promtail-positions:/var/lib/promtail
    command: -config.file=/etc/promtail/config.yaml
    depends_on:
      - loki

  app:
    image: myapp:latest
    logging:
      driver: json-file
      options:
        max-size: "50m"
        max-file: "3"
    labels:
      logging: "promtail"
      app: "myapp"

volumes:
  loki-data:
  promtail-positions:
```

## Method 3: Promtail with Docker Service Discovery

Use Docker service discovery for automatic container detection.

### Promtail Docker SD Configuration

```yaml
server:
  http_listen_port: 9080
  grpc_listen_port: 0

positions:
  filename: /var/lib/promtail/positions.yaml

clients:
  - url: http://loki:3100/loki/api/v1/push

scrape_configs:
  - job_name: docker
    docker_sd_configs:
      - host: unix:///var/run/docker.sock
        refresh_interval: 5s
        filters:
          - name: label
            values: ["logging=promtail"]
    relabel_configs:
      # Keep only containers with logging label
      - source_labels: ['__meta_docker_container_label_logging']
        regex: promtail
        action: keep
      # Container name
      - source_labels: ['__meta_docker_container_name']
        regex: '/(.*)'
        target_label: container
      # Container ID
      - source_labels: ['__meta_docker_container_id']
        target_label: container_id
      # Image name
      - source_labels: ['__meta_docker_container_image']
        target_label: image
      # Log stream
      - source_labels: ['__meta_docker_container_log_stream']
        target_label: stream
      # Custom labels from container
      - source_labels: ['__meta_docker_container_label_app']
        target_label: app
      - source_labels: ['__meta_docker_container_label_environment']
        target_label: environment
      # Compose service name
      - source_labels: ['__meta_docker_container_label_com_docker_compose_service']
        target_label: compose_service
      # Compose project name
      - source_labels: ['__meta_docker_container_label_com_docker_compose_project']
        target_label: compose_project
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
```

### Run Promtail with Docker Socket Access

```bash
docker run -d \
  --name promtail \
  -v /var/lib/docker/containers:/var/lib/docker/containers:ro \
  -v /var/run/docker.sock:/var/run/docker.sock:ro \
  -v $(pwd)/promtail-config.yaml:/etc/promtail/config.yaml \
  grafana/promtail:2.9.4 \
  -config.file=/etc/promtail/config.yaml
```

## Method 4: Sidecar Container Pattern

Deploy a log shipping sidecar alongside each application container.

### Docker Compose Sidecar Pattern

```yaml
version: "3.8"

services:
  app:
    image: myapp:latest
    volumes:
      - app-logs:/var/log/app

  log-shipper:
    image: grafana/promtail:2.9.4
    volumes:
      - app-logs:/var/log/app:ro
      - ./promtail-sidecar.yaml:/etc/promtail/config.yaml
    command: -config.file=/etc/promtail/config.yaml
    depends_on:
      - app

volumes:
  app-logs:
```

Promtail sidecar configuration:

```yaml
server:
  http_listen_port: 9080
  grpc_listen_port: 0

positions:
  filename: /tmp/positions.yaml

clients:
  - url: http://loki:3100/loki/api/v1/push

scrape_configs:
  - job_name: app
    static_configs:
      - targets:
          - localhost
        labels:
          job: myapp
          __path__: /var/log/app/*.log
    pipeline_stages:
      - json:
          expressions:
            level: level
            message: msg
      - labels:
          level:
```

## Multi-Line Log Handling

### Java Application Stack Traces

```yaml
pipeline_stages:
  - multiline:
      firstline: '^\d{4}-\d{2}-\d{2}|^[A-Z][a-z]{2} \d{1,2}'
      max_wait_time: 3s
      max_lines: 500
  - json:
      expressions:
        log: log
        stream: stream
        time: time
  - regex:
      source: log
      expression: '^(?P<timestamp>\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2},\d{3}) (?P<level>\w+) (?P<message>.*)$'
  - labels:
      level:
  - output:
      source: log
```

### Python Tracebacks

```yaml
pipeline_stages:
  - multiline:
      firstline: '^Traceback|^\d{4}-\d{2}-\d{2}'
      max_wait_time: 3s
```

## Label Best Practices

### Recommended Labels

```yaml
loki-external-labels: |
  job=docker,
  environment={{.Environment}},
  host={{.DaemonName}},
  container_name={{.Name}},
  image={{.ImageName}}
```

### Avoiding High Cardinality

Do NOT use these as labels:
- Container ID (too many unique values)
- Request ID
- User ID
- Timestamps

## Complete Production Setup

### docker-compose.yml

```yaml
version: "3.8"

services:
  loki:
    image: grafana/loki:2.9.4
    ports:
      - "3100:3100"
    volumes:
      - ./loki-config.yaml:/etc/loki/local-config.yaml
      - loki-data:/loki
    command: -config.file=/etc/loki/local-config.yaml
    restart: unless-stopped
    healthcheck:
      test: ["CMD-SHELL", "wget --no-verbose --tries=1 --spider http://localhost:3100/ready || exit 1"]
      interval: 10s
      timeout: 5s
      retries: 5

  promtail:
    image: grafana/promtail:2.9.4
    volumes:
      - /var/lib/docker/containers:/var/lib/docker/containers:ro
      - /var/run/docker.sock:/var/run/docker.sock:ro
      - ./promtail-config.yaml:/etc/promtail/config.yaml
      - promtail-positions:/var/lib/promtail
    command: -config.file=/etc/promtail/config.yaml
    restart: unless-stopped
    depends_on:
      loki:
        condition: service_healthy

  grafana:
    image: grafana/grafana:10.3.1
    ports:
      - "3000:3000"
    environment:
      - GF_SECURITY_ADMIN_PASSWORD=admin
    volumes:
      - grafana-data:/var/lib/grafana
      - ./grafana-datasources.yaml:/etc/grafana/provisioning/datasources/datasources.yaml
    restart: unless-stopped
    depends_on:
      loki:
        condition: service_healthy

  # Application containers use json-file driver
  app:
    image: myapp:latest
    logging:
      driver: json-file
      options:
        max-size: "50m"
        max-file: "5"
    labels:
      logging: "promtail"
      app: "myapp"
      environment: "production"

volumes:
  loki-data:
  grafana-data:
  promtail-positions:
```

## Troubleshooting

### Check Loki Driver Status

```bash
# View driver logs
docker plugin inspect loki --format '{{.Settings.Mounts}}'

# Check plugin is enabled
docker plugin ls

# View container logging config
docker inspect <container_id> --format '{{.HostConfig.LogConfig}}'
```

### Debug Missing Logs

```bash
# Check Promtail targets
curl http://localhost:9080/targets

# Verify Docker socket access
docker exec promtail ls -la /var/run/docker.sock

# Check positions file
docker exec promtail cat /var/lib/promtail/positions.yaml
```

### Common Issues

**Driver Not Found**:
```bash
docker plugin install grafana/loki-docker-driver:2.9.4 --alias loki --grant-all-permissions
```

**Connection Refused**:
- Verify Loki URL is accessible from container network
- Check firewall rules

**Missing Container Labels**:
- Verify container has required labels
- Check relabel configs in Promtail

## Conclusion

Docker container logs can be shipped to Loki using multiple methods:

- **Loki Docker Driver**: Simplest setup for direct shipping
- **Promtail with JSON Files**: Works with existing file-based logging
- **Docker Service Discovery**: Automatic container detection
- **Sidecar Pattern**: Application-specific log processing

Key recommendations:

- Use appropriate labels without high cardinality
- Configure multi-line handling for stack traces
- Implement proper log rotation with json-file driver
- Monitor the log shipping pipeline for reliability
- Use service discovery for dynamic container environments

Choose the method that best fits your infrastructure and operational requirements.
