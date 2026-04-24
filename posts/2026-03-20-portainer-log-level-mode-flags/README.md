# How to Use the --log-level and --log-mode Flags in Portainer - A Practical Guide

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Portainer, Docker, Logging, CLI, Debugging, Configuration

Description: Configure Portainer's logging verbosity and output format using the --log-level and --log-mode flags for effective debugging and production log management.

## Introduction

Portainer's logging behavior is controlled by two flags: `--log-level` sets how verbose the output is, and `--log-mode` determines the output format (human-readable or structured JSON). Proper log configuration is essential for debugging issues and integrating with log aggregation systems.

## Understanding the Flags

### --log-level

| Value | Description | Use Case |
|-------|-------------|----------|
| `ERROR` | Only errors | Minimal logging in production |
| `WARN` | Errors and warnings | Default production setting |
| `INFO` | Standard information (default) | General use |
| `DEBUG` | Detailed debug information | Troubleshooting |

### --log-mode

| Value | Description | Use Case |
|-------|-------------|----------|
| `PRETTY` | Human-readable (default) | Development, direct console |
| `JSON` | Structured JSON output | Log aggregation (ELK, Loki) |
| `NOCOLOR` | PRETTY without ANSI colors | Log files, some CI systems |

## Step 1: Enable Debug Logging

```bash
# Restart Portainer with debug logging for troubleshooting

docker stop portainer && docker rm portainer

docker run -d \
  -p 9000:9000 \
  -p 9443:9443 \
  --name portainer \
  --restart=unless-stopped \
  -v /var/run/docker.sock:/var/run/docker.sock \
  -v portainer_data:/data \
  portainer/portainer-ce:latest \
  --log-level=DEBUG

# View debug logs
docker logs -f portainer 2>&1 | head -50
```

## Step 2: Enable JSON Logging for Log Aggregation

```bash
# JSON format for Elasticsearch, Loki, or other log systems
docker run -d \
  -p 9000:9000 \
  -p 9443:9443 \
  --name portainer \
  --restart=unless-stopped \
  -v /var/run/docker.sock:/var/run/docker.sock \
  -v portainer_data:/data \
  portainer/portainer-ce:latest \
  --log-level=INFO \
  --log-mode=JSON

# JSON log example:
# {"level":"info","version":"2.x.x","time":1711929600,"message":"starting Portainer"}
# {"level":"warn","error":"context deadline exceeded","time":1711929601,"message":"unable to snapshot engine information"}
```

## Step 3: Send JSON Logs to Graylog

Configure Docker logging to forward Portainer logs:

```bash
docker run -d \
  -p 9000:9000 \
  --name portainer \
  --restart=unless-stopped \
  -v /var/run/docker.sock:/var/run/docker.sock \
  -v portainer_data:/data \
  --log-driver=gelf \
  --log-opt gelf-address=udp://graylog-host:12201 \
  --log-opt tag="portainer" \
  portainer/portainer-ce:latest \
  --log-level=INFO \
  --log-mode=JSON
```

## Step 4: Configure with Docker Compose

```yaml
services:
  portainer:
    image: portainer/portainer-ce:latest
    container_name: portainer
    restart: unless-stopped
    command: >
      --log-level=INFO
      --log-mode=JSON
    ports:
      - "9000:9000"
      - "9443:9443"
    volumes:
      - /var/run/docker.sock:/var/run/docker.sock
      - portainer_data:/data
    logging:
      driver: "json-file"
      options:
        max-size: "100m"
        max-file: "3"

volumes:
  portainer_data:
```

## Step 5: Debug a Specific Issue

```bash
# Enable debug logging temporarily to diagnose an issue
docker stop portainer && docker rm portainer

docker run -d \
  -p 9000:9000 \
  --name portainer \
  -v /var/run/docker.sock:/var/run/docker.sock \
  -v portainer_data:/data \
  portainer/portainer-ce:latest \
  --log-level=DEBUG

# Reproduce the issue
# Then collect logs
docker logs portainer --since 5m 2>&1 | grep -i "error\|warn\|debug" > /tmp/portainer-debug.log

# Analyze
cat /tmp/portainer-debug.log

# Return to INFO level after debugging
docker stop portainer && docker rm portainer
docker run -d \
  -p 9000:9000 \
  --name portainer \
  -v /var/run/docker.sock:/var/run/docker.sock \
  -v portainer_data:/data \
  portainer/portainer-ce:latest \
  --log-level=INFO
```

## Step 6: Parse JSON Logs with jq

```bash
# View JSON logs in a readable format
docker logs portainer 2>&1 | jq 'select(.level=="error")'

# Filter by log level
docker logs portainer 2>&1 | jq 'select(.level == "warn" or .level == "error")'

# Extract specific fields
docker logs portainer 2>&1 | jq '{time: .time, level: .level, message: .message}'

# Count errors per hour
docker logs portainer --since 1h 2>&1 | \
  jq -r 'select(.level=="error") | (.time | todateiso8601)[0:13]' | \
  sort | uniq -c
```

## Step 7: Send Logs to Loki

```yaml
# docker-compose.yml with Loki logging
# Requires the Grafana Loki Docker logging driver plugin on the Docker host
services:
  portainer:
    image: portainer/portainer-ce:latest
    command: --log-level=INFO --log-mode=JSON
    ports:
      - "9000:9000"
    volumes:
      - /var/run/docker.sock:/var/run/docker.sock
      - portainer_data:/data
    logging:
      driver: loki
      options:
        loki-url: "http://loki:3100/loki/api/v1/push"
        loki-labels: "service=portainer,environment=production"
        loki-batch-size: "400"

volumes:
  portainer_data:
```

## Step 8: Production Recommended Configuration

```bash
# Production: WARN level, JSON format for aggregation
docker run -d \
  -p 9000:9000 \
  -p 9443:9443 \
  -p 8000:8000 \
  --name portainer \
  --restart=unless-stopped \
  -v /var/run/docker.sock:/var/run/docker.sock \
  -v portainer_data:/data \
  portainer/portainer-ce:latest \
  --log-level=WARN \
  --log-mode=JSON \
  --snapshot-interval=5m
```

## Step 9: Rotate Log Files

```bash
# Configure Docker log rotation for Portainer
sudo tee /etc/docker/daemon.json > /dev/null << 'EOF'
{
  "log-driver": "json-file",
  "log-opts": {
    "max-size": "50m",
    "max-file": "5"
  }
}
EOF

sudo systemctl restart docker

# Or per-container log rotation
docker run -d \
  --log-driver=json-file \
  --log-opt max-size=50m \
  --log-opt max-file=5 \
  --name portainer \
  -p 9000:9000 \
  -p 9443:9443 \
  --restart=unless-stopped \
  -v /var/run/docker.sock:/var/run/docker.sock \
  -v portainer_data:/data \
  portainer/portainer-ce:latest \
  --log-level=INFO \
  --log-mode=JSON
```

## Step 10: Monitor Log Volume

```bash
# Check log size
docker inspect portainer | jq -r '.[0].LogPath' | xargs ls -lh

# If logs are growing fast, increase log level threshold
# DEBUG produces many more logs than INFO

# In general, DEBUG produces the most logs, followed by INFO, WARN, and ERROR
```

## Conclusion

Use `--log-level=DEBUG` when troubleshooting specific issues, then revert to `--log-level=INFO` or `--log-level=WARN` for production. Configure `--log-mode=JSON` whenever you're using a log aggregation system (Elasticsearch, Loki, Graylog) - structured logs are much easier to parse, filter, and alert on than human-readable text.
