# How to Set Up Docker Logging Drivers (json-file, syslog, fluentd)

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Docker, Logging, DevOps, Observability, Fluentd

Description: Learn how to configure Docker logging drivers to manage container logs effectively, including json-file options, syslog integration, and centralized logging with fluentd.

---

Docker supports multiple logging drivers that determine how container logs are stored and forwarded. Choosing the right driver and configuring it properly prevents disk exhaustion, enables centralized logging, and improves observability.

## Default Logging Behavior

By default, Docker uses the `json-file` driver, which stores logs as JSON in `/var/lib/docker/containers/<container-id>/<container-id>-json.log`.

```bash
# Check current logging driver

docker info | grep "Logging Driver"
# Logging Driver: json-file

# View log file location
docker inspect --format='{{.LogPath}}' mycontainer
```

## Available Logging Drivers

| Driver | Description | Use Case |
|--------|-------------|----------|
| `json-file` | JSON formatted files (default) | Development, simple setups |
| `local` | Optimized local file storage | Production single-host |
| `syslog` | System syslog | Traditional Unix logging |
| `journald` | systemd journal | systemd-based systems |
| `fluentd` | Fluentd collector | Centralized logging |
| `awslogs` | Amazon CloudWatch | AWS deployments |
| `gcplogs` | Google Cloud Logging | GCP deployments |
| `splunk` | Splunk HTTP Event Collector | Enterprise logging |
| `none` | Disable logging | When logs aren't needed |

## json-file Driver

### Basic Configuration

```bash
# Run with json-file options
docker run -d \
  --log-driver json-file \
  --log-opt max-size=10m \
  --log-opt max-file=3 \
  nginx
```

### Docker Compose

```yaml
services:
  app:
    image: myapp
    logging:
      driver: json-file
      options:
        max-size: "10m"
        max-file: "3"
        compress: "true"
```

### Available Options

| Option | Description | Default |
|--------|-------------|---------|
| `max-size` | Maximum size per log file | unlimited |
| `max-file` | Number of log files to keep | 1 |
| `compress` | Compress rotated logs | disabled |
| `labels` | Include container labels | - |
| `labels-regex` | Include labels matching a regex | - |
| `env` | Include environment variables | - |
| `env-regex` | Include environment variables matching a regex | - |

### Daemon-Wide Configuration

`/etc/docker/daemon.json`:

```json
{
  "log-driver": "json-file",
  "log-opts": {
    "max-size": "10m",
    "max-file": "3",
    "compress": "true"
  }
}
```

```bash
# Restart Docker to apply
sudo systemctl restart docker
```

## local Driver

The `local` driver is optimized for performance and disk usage.

```yaml
services:
  app:
    image: myapp
    logging:
      driver: local
      options:
        max-size: "10m"
        max-file: "3"
        compress: "true"
```

**Differences from json-file:**
- More efficient storage format
- Faster writes
- Less human-readable (binary format)
- Rotates by default (5 files of 20 MB each) and compresses by default
- Still accessible via `docker logs`

## syslog Driver

Forward logs to a syslog server.

### Local Syslog

```bash
docker run -d \
  --log-driver syslog \
  --log-opt syslog-facility=daemon \
  --log-opt tag="{{.Name}}" \
  myapp
```

### Remote Syslog Server

```yaml
services:
  app:
    image: myapp
    logging:
      driver: syslog
      options:
        syslog-address: "udp://logs.example.com:514"
        syslog-facility: "daemon"
        tag: "{{.Name}}/{{.ID}}"
        syslog-format: "rfc5424"
```

### Syslog Options

| Option | Description |
|--------|-------------|
| `syslog-address` | Syslog server address (tcp/udp/tcp+tls/unix/unixgram) |
| `syslog-tls-ca-cert` | TLS CA certificate path |
| `syslog-facility` | Syslog facility (daemon, local0-7, etc.) |
| `syslog-tls-cert` | TLS certificate path |
| `syslog-tls-key` | TLS key path |
| `syslog-tls-skip-verify` | Skip TLS verification |
| `syslog-format` | Message format (rfc3164, rfc5424, rfc5424micro) |
| `tag` | Log tag template |

### Tag Templates

```yaml
logging:
  options:
    # Available template variables:
    # {{.Name}}        Container name
    # {{.ID}}          First 12 characters of the container ID
    # {{.FullID}}      Full container ID
    # {{.ImageName}}   Image name
    # {{.DaemonName}}  Docker daemon name
    tag: "docker/{{.Name}}"
```

## fluentd Driver

Forward logs to Fluentd for centralized logging.

### Fluentd Setup

```yaml
# docker-compose.yml
version: '3.8'

services:
  fluentd:
    image: fluent/fluentd:v1.16-1
    ports:
      - "24224:24224"
      - "24224:24224/udp"
    volumes:
      - ./fluent.conf:/fluentd/etc/fluent.conf
      - ./logs:/fluentd/log

  app:
    image: myapp
    depends_on:
      - fluentd
    logging:
      driver: fluentd
      options:
        fluentd-address: "localhost:24224"
        tag: "docker.{{.Name}}"
        fluentd-async: "true"
```

### Fluentd Configuration

```xml
# fluent.conf
<source>
  @type forward
  port 24224
  bind 0.0.0.0
</source>

# Parse Docker logs
<filter docker.**>
  @type parser
  key_name log
  reserve_data true
  <parse>
    @type json
  </parse>
</filter>

# Output to file
<match docker.**>
  @type file
  path /fluentd/log/docker
  append true
  <buffer>
    flush_interval 10s
  </buffer>
</match>

# Or replace the file output with Elasticsearch.
# Requires fluent-plugin-elasticsearch in the Fluentd image.
<match docker.**>
  @type elasticsearch
  host elasticsearch
  port 9200
  index_name docker-logs
</match>
```

### Fluentd Options

| Option | Description | Default |
|--------|-------------|---------|
| `fluentd-address` | Fluentd address | localhost:24224 |
| `fluentd-async` | Async logging | false |
| `fluentd-buffer-limit` | Number of events buffered in memory | 1048576 |
| `fluentd-retry-wait` | Retry interval | 1s |
| `fluentd-max-retries` | Max retries | 4294967295 |
| `tag` | Log tag | first 12 characters of container ID |

## journald Driver

Integrate with systemd journal.

```yaml
services:
  app:
    image: myapp
    logging:
      driver: journald
      options:
        tag: "{{.Name}}"
        labels: "environment,version"
```

```bash
# View logs with journalctl
journalctl CONTAINER_NAME=myapp
journalctl -u docker.service

# Follow logs
journalctl -f CONTAINER_NAME=myapp
```

## Cloud Logging Drivers

### AWS CloudWatch

```yaml
services:
  app:
    image: myapp
    logging:
      driver: awslogs
      options:
        awslogs-region: "us-east-1"
        awslogs-group: "my-app-logs"
        tag: "{{.Name}}"
        awslogs-create-group: "true"
```

### Google Cloud Logging

```yaml
services:
  app:
    image: myapp
    logging:
      driver: gcplogs
      options:
        gcp-project: "my-project"
        gcp-log-cmd: "true"
        labels: "environment,version"
```

## Dual Logging (Local + Remote)

Docker doesn't natively support sending one container to multiple arbitrary log drivers. Docker Engine does provide a dual logging cache for remote drivers by default, so `docker logs` can read a local cache unless `cache-disabled` is set to `true`. Use these workarounds when you need to ship application logs to multiple destinations you control:

### Method 1: Sidecar Container

```yaml
services:
  app:
    image: myapp
    # This only ships logs if the app writes files under /var/log/app.
    logging:
      driver: json-file
      options:
        max-size: "10m"
    volumes:
      - app-logs:/var/log/app

  log-shipper:
    image: fluent/fluent-bit
    volumes:
      - app-logs:/var/log/app:ro
      - ./fluent-bit.conf:/fluent-bit/etc/fluent-bit.conf
    depends_on:
      - app

volumes:
  app-logs:
```

### Method 2: Application-Level Logging

Configure your application to write to both stdout and a log aggregator.

```javascript
// Node.js example with @fluent-org/logger
const { FluentClient } = require('@fluent-org/logger');

const fluent = new FluentClient('app', {
  socket: {
    host: 'fluentd',
    port: 24224,
    timeout: 3000
  }
});

async function logInfo(message, fields = {}) {
  const record = {
    timestamp: new Date().toISOString(),
    level: 'info',
    message,
    ...fields
  };

  console.log(JSON.stringify(record)); // Docker captures this
  await fluent.emit('info', record);
}
```

## Log Management Best Practices

### 1. Always Set Size Limits

`/etc/docker/daemon.json`:

```json
{
  "log-driver": "json-file",
  "log-opts": {
    "max-size": "10m",
    "max-file": "3"
  }
}
```

### 2. Use Labels for Filtering

```yaml
services:
  app:
    image: myapp
    labels:
      - "environment=production"
      - "service=api"
    logging:
      options:
        labels: "environment,service"
```

### 3. Structure Your Logs

```javascript
// Output structured JSON logs
console.log(JSON.stringify({
  timestamp: new Date().toISOString(),
  level: 'info',
  message: 'Request processed',
  requestId: '123',
  duration: 45
}));
```

### 4. Consider Log Volume

```yaml
# High-volume services: use async and buffering
services:
  high-traffic-api:
    logging:
      driver: fluentd
      options:
        fluentd-async: "true"
        fluentd-buffer-limit: "4096"
```

## Troubleshooting

### Check Driver Configuration

```bash
# Inspect container logging config
docker inspect --format='{{.HostConfig.LogConfig}}' mycontainer

# View daemon defaults
docker info --format '{{.LoggingDriver}}'
```

### Logs Not Appearing

```bash
# Check if logging driver supports docker logs
docker logs mycontainer
# Error: logs not available for driver X

# Remote drivers are readable through docker logs when Docker's
# dual logging cache is enabled. If cache-disabled=true, use the
# driver's native tools instead.
```

### Disk Space Issues

```bash
# Find large log files
sudo du -sh /var/lib/docker/containers/*/*-json.log | sort -h

# Emergency truncate for json-file logs only; stop the container first
# because direct edits can interfere with Docker's logging system.
docker stop <id>
sudo truncate -s 0 /var/lib/docker/containers/<id>/<id>-json.log
docker start <id>

# Remove unused objects (does not rotate logs for running containers)
docker system prune
```

## Complete Production Example

```yaml
version: '3.8'

x-logging: &default-logging
  driver: json-file
  options:
    max-size: "10m"
    max-file: "3"
    labels: "service,environment"

services:
  api:
    image: myapi
    labels:
      service: api
      environment: production
    logging: *default-logging

  worker:
    image: myworker
    labels:
      service: worker
      environment: production
    logging: *default-logging

  # Log aggregator
  fluentd:
    image: fluent/fluentd:v1.16-1
    ports:
      - "24224:24224"
    volumes:
      - ./fluent.conf:/fluentd/etc/fluent.conf
    logging:
      driver: local
      options:
        max-size: "5m"

  # Optional: run a service that logs directly to fluentd
  fluentd-app:
    image: myapi
    logging:
      driver: fluentd
      options:
        fluentd-address: "localhost:24224"
        tag: "docker.api"
        fluentd-async: "true"
```

## Summary

| Driver | `docker logs` | Best For |
|--------|---------------|----------|
| json-file | Yes | Development, simple production |
| local | Yes | Production single-host |
| syslog | Via dual logging cache by default | Unix/Linux infrastructure |
| journald | Yes, and via journalctl | systemd systems |
| fluentd | Via dual logging cache by default | Centralized logging |
| awslogs | Via dual logging cache by default | AWS deployments |
| none | N/A | Disable logging |

Choose `json-file` or `local` with size limits for most use cases. Use `fluentd` or cloud-native drivers when you need centralized log aggregation. Always configure log rotation to prevent disk exhaustion.
