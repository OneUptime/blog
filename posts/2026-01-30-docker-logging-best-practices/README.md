# How to Implement Docker Logging Best Practices

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Docker, Logging, Observability, DevOps

Description: Configure Docker container logging with appropriate drivers, log rotation, centralized collection, and structured output for production environments.

---

Container logging in Docker requires deliberate configuration to avoid common pitfalls like disk exhaustion, lost logs, and debugging nightmares. This guide walks through practical implementations for production-ready Docker logging, from basic driver configuration to centralized log aggregation.

## Understanding Docker Logging Architecture

Docker captures stdout and stderr from containers and routes them through a logging driver. The default `json-file` driver writes logs to disk as JSON, but Docker supports multiple drivers for different use cases.

Here is how the logging flow works:

```
Container Process -> stdout/stderr -> Docker Daemon -> Logging Driver -> Destination
```

Each logging driver has trade-offs in terms of performance, features, and complexity. Choosing the right one depends on your infrastructure and requirements.

## Comparing Docker Logging Drivers

The following table summarizes the most commonly used logging drivers and their characteristics:

| Driver | Output Destination | Log Retention | docker logs Support | Best For |
|--------|-------------------|---------------|---------------------|----------|
| json-file | Local JSON files | Configurable | Yes | Development, small deployments |
| local | Local binary files | Configurable | Yes | Single-host production |
| syslog | Syslog server | Depends on server | No | Unix/Linux environments |
| journald | systemd journal | Depends on journal | Yes | systemd-based hosts |
| fluentd | Fluentd collector | Depends on backend | No | Centralized logging |
| gelf | Graylog server | Depends on server | No | Graylog deployments |
| awslogs | CloudWatch Logs | Configurable | No | AWS environments |
| splunk | Splunk server | Depends on server | No | Splunk deployments |
| none | Discarded | N/A | No | Performance-critical, logs handled internally |

## Configuring the json-file Driver

The `json-file` driver is Docker's default and works well for development and smaller deployments. Without configuration, logs grow unbounded and will eventually fill your disk.

### Basic Configuration with Log Rotation

This configuration limits each log file to 10MB and keeps a maximum of 5 rotated files per container:

```json
{
  "log-driver": "json-file",
  "log-opts": {
    "max-size": "10m",
    "max-file": "5",
    "compress": "true",
    "labels": "environment,service",
    "env": "APP_ENV,APP_VERSION"
  }
}
```

Save this configuration to `/etc/docker/daemon.json` and restart Docker:

```bash
# Apply the configuration
sudo systemctl restart docker

# Verify the configuration is active
docker info --format '{{.LoggingDriver}}'
```

### Per-Container Configuration

You can override the daemon defaults for individual containers. This is useful when certain containers need different retention policies.

The following command runs a container with custom log settings:

```bash
docker run -d \
  --name api-server \
  --log-driver json-file \
  --log-opt max-size=50m \
  --log-opt max-file=10 \
  --log-opt compress=true \
  --log-opt labels=app,tier \
  --label app=api \
  --label tier=backend \
  nginx:alpine
```

### Querying Logs with Labels

When you configure label capture, those labels appear in the log JSON. This helps with filtering and searching.

View logs with the captured metadata:

```bash
# View recent logs
docker logs --tail 100 api-server

# Follow logs in real-time
docker logs -f api-server

# View logs with timestamps
docker logs -t api-server

# View logs since a specific time
docker logs --since 2024-01-15T10:00:00 api-server
```

The raw log files are stored in `/var/lib/docker/containers/<container-id>/`. Each log entry looks like this:

```json
{
  "log": "192.168.1.1 - - [15/Jan/2024:10:30:45 +0000] \"GET /health HTTP/1.1\" 200 2\n",
  "stream": "stdout",
  "time": "2024-01-15T10:30:45.123456789Z",
  "attrs": {
    "app": "api",
    "tier": "backend"
  }
}
```

## Configuring the local Driver

The `local` driver is optimized for performance and uses a compressed binary format. It is a good choice when you need `docker logs` support but want better disk efficiency than `json-file`.

### Daemon Configuration for local Driver

This configuration uses the local driver with automatic compression:

```json
{
  "log-driver": "local",
  "log-opts": {
    "max-size": "50m",
    "max-file": "5",
    "compress": "true"
  }
}
```

### Comparing json-file and local Driver Performance

The local driver typically provides:

| Metric | json-file | local |
|--------|-----------|-------|
| Disk Usage | Higher (uncompressed JSON) | Lower (compressed binary) |
| Write Performance | Moderate | Better |
| Read Performance | Faster for small logs | Slightly slower |
| Human Readable | Yes (JSON files) | No (binary format) |
| docker logs Support | Yes | Yes |

## Implementing Syslog Logging

Syslog integration is useful when you already have syslog infrastructure or need to comply with logging standards that require syslog format.

### Setting Up a Syslog Server

First, configure rsyslog to receive remote logs. Add this to `/etc/rsyslog.d/docker.conf`:

```bash
# Load UDP and TCP modules for remote logging
module(load="imudp")
input(type="imudp" port="514")

module(load="imtcp")
input(type="imtcp" port="514")

# Template for Docker logs
template(name="DockerLogFormat" type="string"
  string="/var/log/docker/%HOSTNAME%/%PROGRAMNAME%.log")

# Route Docker logs to separate files
if $programname startswith 'docker-' then {
  action(type="omfile" dynaFile="DockerLogFormat")
  stop
}
```

Restart rsyslog to apply the configuration:

```bash
sudo systemctl restart rsyslog
```

### Configuring Docker for Syslog

Configure the daemon to use syslog by default:

```json
{
  "log-driver": "syslog",
  "log-opts": {
    "syslog-address": "udp://localhost:514",
    "syslog-facility": "daemon",
    "tag": "docker-{{.Name}}/{{.ID}}",
    "syslog-format": "rfc5424"
  }
}
```

### Running Containers with Syslog

You can specify syslog options per container:

```bash
docker run -d \
  --name web-app \
  --log-driver syslog \
  --log-opt syslog-address=tcp://syslog.example.com:514 \
  --log-opt syslog-facility=local0 \
  --log-opt tag="{{.ImageName}}/{{.Name}}/{{.ID}}" \
  --log-opt syslog-format=rfc5424micro \
  nginx:alpine
```

### Syslog Tag Template Variables

Docker supports these template variables in syslog tags:

| Variable | Description | Example Value |
|----------|-------------|---------------|
| {{.ID}} | Container ID (first 12 chars) | a1b2c3d4e5f6 |
| {{.FullID}} | Full container ID | a1b2c3d4e5f6... |
| {{.Name}} | Container name | web-app |
| {{.ImageID}} | Image ID (first 12 chars) | 7d9c54c1b2a3 |
| {{.ImageFullID}} | Full image ID | 7d9c54c1b2a3... |
| {{.ImageName}} | Image name | nginx:alpine |
| {{.DaemonName}} | Docker daemon name | docker |

## Setting Up Fluentd for Centralized Logging

Fluentd provides a powerful, plugin-based architecture for log collection, transformation, and routing. This setup demonstrates a production-ready centralized logging stack.

### Fluentd Configuration

Create a Fluentd configuration file at `fluentd/fluent.conf`:

```xml
# Accept logs from Docker containers on port 24224
<source>
  @type forward
  port 24224
  bind 0.0.0.0
</source>

# Parse JSON logs from containers
<filter docker.**>
  @type parser
  key_name log
  reserve_data true
  remove_key_name_field true
  <parse>
    @type json
  </parse>
</filter>

# Add timestamp and host information
<filter docker.**>
  @type record_transformer
  <record>
    hostname "#{Socket.gethostname}"
    received_at ${time}
  </record>
</filter>

# Route logs based on container labels
<match docker.api.**>
  @type elasticsearch
  host elasticsearch
  port 9200
  index_name api-logs
  logstash_format true
  logstash_prefix api
  flush_interval 5s
  <buffer>
    @type file
    path /fluentd/log/api-buffer
    flush_mode interval
    retry_type exponential_backoff
    flush_interval 5s
    retry_forever false
    retry_max_times 10
  </buffer>
</match>

<match docker.web.**>
  @type elasticsearch
  host elasticsearch
  port 9200
  index_name web-logs
  logstash_format true
  logstash_prefix web
  flush_interval 5s
  <buffer>
    @type file
    path /fluentd/log/web-buffer
    flush_mode interval
    retry_type exponential_backoff
    flush_interval 5s
  </buffer>
</match>

# Default route for unmatched logs
<match **>
  @type elasticsearch
  host elasticsearch
  port 9200
  index_name default-logs
  logstash_format true
  logstash_prefix default
  flush_interval 10s
  <buffer>
    @type file
    path /fluentd/log/default-buffer
    flush_mode interval
    flush_interval 10s
  </buffer>
</match>
```

### Fluentd Dockerfile

Create a custom Fluentd image with the Elasticsearch plugin:

```dockerfile
FROM fluent/fluentd:v1.16-debian

# Switch to root to install plugins
USER root

# Install Elasticsearch plugin and dependencies
RUN gem install fluent-plugin-elasticsearch \
    && gem sources --clear-all \
    && rm -rf /tmp/* /var/tmp/* /usr/lib/ruby/gems/*/cache/*.gem

# Create buffer directories
RUN mkdir -p /fluentd/log && chown -R fluent:fluent /fluentd

# Switch back to fluent user
USER fluent

EXPOSE 24224 24224/udp

CMD ["fluentd", "-c", "/fluentd/etc/fluent.conf"]
```

### Docker Compose for Centralized Logging Stack

This docker-compose.yml sets up Fluentd, Elasticsearch, and Kibana:

```yaml
version: "3.8"

services:
  fluentd:
    build:
      context: ./fluentd
      dockerfile: Dockerfile
    container_name: fluentd
    ports:
      - "24224:24224"
      - "24224:24224/udp"
    volumes:
      - ./fluentd/fluent.conf:/fluentd/etc/fluent.conf:ro
      - fluentd-buffer:/fluentd/log
    networks:
      - logging
    depends_on:
      - elasticsearch
    restart: unless-stopped
    logging:
      driver: json-file
      options:
        max-size: "10m"
        max-file: "3"

  elasticsearch:
    image: docker.elastic.co/elasticsearch/elasticsearch:8.11.0
    container_name: elasticsearch
    environment:
      - discovery.type=single-node
      - xpack.security.enabled=false
      - "ES_JAVA_OPTS=-Xms1g -Xmx1g"
      - cluster.name=docker-logging
    ports:
      - "9200:9200"
    volumes:
      - elasticsearch-data:/usr/share/elasticsearch/data
    networks:
      - logging
    healthcheck:
      test: ["CMD-SHELL", "curl -f http://localhost:9200/_cluster/health || exit 1"]
      interval: 30s
      timeout: 10s
      retries: 5
    restart: unless-stopped
    logging:
      driver: json-file
      options:
        max-size: "10m"
        max-file: "3"

  kibana:
    image: docker.elastic.co/kibana/kibana:8.11.0
    container_name: kibana
    environment:
      - ELASTICSEARCH_HOSTS=http://elasticsearch:9200
    ports:
      - "5601:5601"
    networks:
      - logging
    depends_on:
      elasticsearch:
        condition: service_healthy
    restart: unless-stopped
    logging:
      driver: json-file
      options:
        max-size: "10m"
        max-file: "3"

networks:
  logging:
    driver: bridge

volumes:
  elasticsearch-data:
  fluentd-buffer:
```

### Configuring Application Containers to Use Fluentd

Once the logging stack is running, configure your application containers:

```yaml
version: "3.8"

services:
  api:
    image: your-api-image:latest
    container_name: api
    logging:
      driver: fluentd
      options:
        fluentd-address: localhost:24224
        fluentd-async: "true"
        fluentd-retry-wait: "1s"
        fluentd-max-retries: "30"
        tag: docker.api.{{.Name}}
        labels: "environment,version,service"
    labels:
      environment: production
      version: "1.2.3"
      service: api
    networks:
      - app
      - logging

  web:
    image: nginx:alpine
    container_name: web
    logging:
      driver: fluentd
      options:
        fluentd-address: localhost:24224
        fluentd-async: "true"
        fluentd-retry-wait: "1s"
        fluentd-max-retries: "30"
        tag: docker.web.{{.Name}}
        labels: "environment,version,service"
    labels:
      environment: production
      version: "2.0.0"
      service: web
    networks:
      - app
      - logging

networks:
  app:
    driver: bridge
  logging:
    external: true
    name: centralized-logging_logging
```

## Implementing Structured Logging in Applications

Structured logging in JSON format allows for better parsing, filtering, and analysis. Here are examples for common application frameworks.

### Python Application with Structured Logging

Create a logging configuration that outputs JSON:

```python
import logging
import json
import sys
from datetime import datetime, timezone

class JSONFormatter(logging.Formatter):
    """Custom formatter that outputs JSON log records."""

    def format(self, record):
        log_record = {
            "timestamp": datetime.now(timezone.utc).isoformat(),
            "level": record.levelname,
            "logger": record.name,
            "message": record.getMessage(),
            "module": record.module,
            "function": record.funcName,
            "line": record.lineno
        }

        # Add exception info if present
        if record.exc_info:
            log_record["exception"] = self.formatException(record.exc_info)

        # Add extra fields
        if hasattr(record, "extra_fields"):
            log_record.update(record.extra_fields)

        return json.dumps(log_record)

def setup_logging(service_name, log_level=logging.INFO):
    """Configure structured JSON logging for the application."""

    # Create handler for stdout
    handler = logging.StreamHandler(sys.stdout)
    handler.setFormatter(JSONFormatter())

    # Configure root logger
    root_logger = logging.getLogger()
    root_logger.setLevel(log_level)
    root_logger.addHandler(handler)

    # Add service context to all logs
    old_factory = logging.getLogRecordFactory()

    def record_factory(*args, **kwargs):
        record = old_factory(*args, **kwargs)
        record.extra_fields = {"service": service_name}
        return record

    logging.setLogRecordFactory(record_factory)

    return root_logger

# Usage example
if __name__ == "__main__":
    logger = setup_logging("user-service")

    logger.info("Application started")
    logger.info("Processing request", extra={
        "extra_fields": {
            "request_id": "abc-123",
            "user_id": "user-456",
            "endpoint": "/api/users"
        }
    })
```

### Node.js Application with Pino

Pino is a high-performance JSON logger for Node.js:

```javascript
const pino = require('pino');

// Create the logger with production settings
const logger = pino({
  level: process.env.LOG_LEVEL || 'info',
  formatters: {
    level: (label) => {
      return { level: label };
    },
  },
  base: {
    service: process.env.SERVICE_NAME || 'node-app',
    version: process.env.APP_VERSION || '1.0.0',
    environment: process.env.NODE_ENV || 'development',
  },
  timestamp: pino.stdTimeFunctions.isoTime,
  // Redact sensitive fields
  redact: {
    paths: ['req.headers.authorization', 'password', 'secret'],
    censor: '[REDACTED]',
  },
});

// Create child logger with request context
function createRequestLogger(requestId, userId) {
  return logger.child({
    requestId,
    userId,
  });
}

// Express middleware for request logging
function requestLoggingMiddleware(req, res, next) {
  const requestId = req.headers['x-request-id'] || generateRequestId();
  const requestLogger = createRequestLogger(requestId, req.user?.id);

  req.log = requestLogger;

  const startTime = Date.now();

  res.on('finish', () => {
    const duration = Date.now() - startTime;
    requestLogger.info({
      method: req.method,
      url: req.url,
      statusCode: res.statusCode,
      durationMs: duration,
      contentLength: res.get('content-length'),
    }, 'Request completed');
  });

  next();
}

// Usage in application
logger.info('Server starting');
logger.info({ port: 3000, host: '0.0.0.0' }, 'Server configuration');

// Log with context
const reqLogger = createRequestLogger('req-123', 'user-456');
reqLogger.info({ action: 'create_order', orderId: 'order-789' }, 'Order created');
```

### Go Application with Zap

Zap provides structured, leveled logging in Go:

```go
package main

import (
    "net/http"
    "os"
    "time"

    "go.uber.org/zap"
    "go.uber.org/zap/zapcore"
)

// InitLogger creates a production-ready JSON logger
func InitLogger(serviceName, version string) (*zap.Logger, error) {
    config := zap.Config{
        Level:       zap.NewAtomicLevelAt(zapcore.InfoLevel),
        Development: false,
        Encoding:    "json",
        EncoderConfig: zapcore.EncoderConfig{
            TimeKey:        "timestamp",
            LevelKey:       "level",
            NameKey:        "logger",
            CallerKey:      "caller",
            FunctionKey:    zapcore.OmitKey,
            MessageKey:     "message",
            StacktraceKey:  "stacktrace",
            LineEnding:     zapcore.DefaultLineEnding,
            EncodeLevel:    zapcore.LowercaseLevelEncoder,
            EncodeTime:     zapcore.ISO8601TimeEncoder,
            EncodeDuration: zapcore.MillisDurationEncoder,
            EncodeCaller:   zapcore.ShortCallerEncoder,
        },
        OutputPaths:      []string{"stdout"},
        ErrorOutputPaths: []string{"stderr"},
        InitialFields: map[string]interface{}{
            "service": serviceName,
            "version": version,
        },
    }

    return config.Build()
}

// RequestLogger middleware adds request context to logs
func RequestLogger(logger *zap.Logger) func(http.Handler) http.Handler {
    return func(next http.Handler) http.Handler {
        return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
            start := time.Now()
            requestID := r.Header.Get("X-Request-ID")
            if requestID == "" {
                requestID = generateRequestID()
            }

            // Create request-scoped logger
            reqLogger := logger.With(
                zap.String("request_id", requestID),
                zap.String("method", r.Method),
                zap.String("path", r.URL.Path),
                zap.String("remote_addr", r.RemoteAddr),
            )

            // Wrap response writer to capture status code
            wrapped := &responseWriter{ResponseWriter: w, statusCode: 200}

            next.ServeHTTP(wrapped, r)

            reqLogger.Info("Request completed",
                zap.Int("status_code", wrapped.statusCode),
                zap.Duration("duration", time.Since(start)),
            )
        })
    }
}

type responseWriter struct {
    http.ResponseWriter
    statusCode int
}

func (rw *responseWriter) WriteHeader(code int) {
    rw.statusCode = code
    rw.ResponseWriter.WriteHeader(code)
}

func main() {
    logger, err := InitLogger("api-service", "1.0.0")
    if err != nil {
        panic(err)
    }
    defer logger.Sync()

    logger.Info("Application starting",
        zap.String("environment", os.Getenv("APP_ENV")),
    )

    // Example structured log
    logger.Info("Processing order",
        zap.String("order_id", "order-12345"),
        zap.String("user_id", "user-67890"),
        zap.Float64("amount", 99.99),
        zap.String("currency", "USD"),
    )
}
```

## Docker Compose Logging Configuration Patterns

Here are common patterns for configuring logging in docker-compose files.

### Default Logging for All Services

Set default logging options at the top level:

```yaml
version: "3.8"

x-logging: &default-logging
  driver: json-file
  options:
    max-size: "20m"
    max-file: "5"
    compress: "true"

services:
  api:
    image: api:latest
    logging: *default-logging

  worker:
    image: worker:latest
    logging: *default-logging

  scheduler:
    image: scheduler:latest
    logging: *default-logging
```

### Tiered Logging Configuration

Different services may need different logging configurations:

```yaml
version: "3.8"

x-logging-verbose: &logging-verbose
  driver: json-file
  options:
    max-size: "50m"
    max-file: "10"
    compress: "true"

x-logging-standard: &logging-standard
  driver: json-file
  options:
    max-size: "20m"
    max-file: "5"
    compress: "true"

x-logging-minimal: &logging-minimal
  driver: json-file
  options:
    max-size: "10m"
    max-file: "3"

services:
  # High-volume, important logs
  api-gateway:
    image: nginx:alpine
    logging: *logging-verbose

  # Standard application logs
  backend:
    image: backend:latest
    logging: *logging-standard

  # Low-priority, auxiliary services
  metrics-collector:
    image: metrics:latest
    logging: *logging-minimal

  # No logging needed, handled internally
  log-processor:
    image: processor:latest
    logging:
      driver: none
```

### Production Multi-Service Configuration

A complete example for a production microservices deployment:

```yaml
version: "3.8"

x-fluentd-logging: &fluentd-logging
  driver: fluentd
  options:
    fluentd-address: "${FLUENTD_HOST:-fluentd}:24224"
    fluentd-async: "true"
    fluentd-retry-wait: "1s"
    fluentd-max-retries: "30"
    fluentd-buffer-limit: "8388608"

services:
  nginx:
    image: nginx:alpine
    ports:
      - "80:80"
      - "443:443"
    volumes:
      - ./nginx/nginx.conf:/etc/nginx/nginx.conf:ro
    logging:
      <<: *fluentd-logging
      options:
        <<: *fluentd-logging
        tag: "docker.nginx.{{.Name}}"
    labels:
      service: nginx
      tier: frontend
    healthcheck:
      test: ["CMD", "nginx", "-t"]
      interval: 30s
      timeout: 10s
      retries: 3
    restart: unless-stopped

  api:
    image: api:${API_VERSION:-latest}
    environment:
      - LOG_LEVEL=${LOG_LEVEL:-info}
      - LOG_FORMAT=json
      - SERVICE_NAME=api
    logging:
      <<: *fluentd-logging
      options:
        <<: *fluentd-logging
        tag: "docker.api.{{.Name}}"
        labels: "service,tier,version"
    labels:
      service: api
      tier: backend
      version: ${API_VERSION:-latest}
    deploy:
      replicas: 3
      resources:
        limits:
          memory: 512M
          cpus: "0.5"
    healthcheck:
      test: ["CMD", "curl", "-f", "http://localhost:8080/health"]
      interval: 30s
      timeout: 10s
      retries: 3
    restart: unless-stopped

  worker:
    image: worker:${WORKER_VERSION:-latest}
    environment:
      - LOG_LEVEL=${LOG_LEVEL:-info}
      - LOG_FORMAT=json
      - SERVICE_NAME=worker
    logging:
      <<: *fluentd-logging
      options:
        <<: *fluentd-logging
        tag: "docker.worker.{{.Name}}"
        labels: "service,tier,version"
    labels:
      service: worker
      tier: backend
      version: ${WORKER_VERSION:-latest}
    deploy:
      replicas: 2
      resources:
        limits:
          memory: 1G
          cpus: "1.0"
    restart: unless-stopped

  redis:
    image: redis:7-alpine
    command: redis-server --loglevel notice
    logging:
      <<: *fluentd-logging
      options:
        <<: *fluentd-logging
        tag: "docker.redis.{{.Name}}"
    labels:
      service: redis
      tier: cache
    healthcheck:
      test: ["CMD", "redis-cli", "ping"]
      interval: 10s
      timeout: 5s
      retries: 3
    restart: unless-stopped

  postgres:
    image: postgres:15-alpine
    environment:
      POSTGRES_DB: ${DB_NAME}
      POSTGRES_USER: ${DB_USER}
      POSTGRES_PASSWORD: ${DB_PASSWORD}
    command:
      - "postgres"
      - "-c"
      - "log_statement=mod"
      - "-c"
      - "log_min_duration_statement=1000"
      - "-c"
      - "log_line_prefix=%t [%p]: [%l-1] user=%u,db=%d,app=%a,client=%h "
    logging:
      <<: *fluentd-logging
      options:
        <<: *fluentd-logging
        tag: "docker.postgres.{{.Name}}"
    labels:
      service: postgres
      tier: database
    volumes:
      - postgres-data:/var/lib/postgresql/data
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U ${DB_USER} -d ${DB_NAME}"]
      interval: 10s
      timeout: 5s
      retries: 5
    restart: unless-stopped

volumes:
  postgres-data:
```

## Log Management and Maintenance

### Monitoring Log Disk Usage

Create a script to monitor Docker log sizes:

```bash
#!/bin/bash
# docker-log-stats.sh - Display Docker container log sizes

LOG_DIR="/var/lib/docker/containers"
THRESHOLD_MB=100

echo "Container Log Sizes"
echo "===================="
printf "%-40s %10s %10s\n" "CONTAINER" "SIZE" "FILES"
echo "------------------------------------------------------------"

for container_dir in "$LOG_DIR"/*/; do
    if [ -d "$container_dir" ]; then
        container_id=$(basename "$container_dir")
        container_name=$(docker inspect --format '{{.Name}}' "$container_id" 2>/dev/null | sed 's/\///')

        if [ -n "$container_name" ]; then
            # Calculate total log size
            total_size=$(du -sh "$container_dir"*-json.log* 2>/dev/null | tail -1 | cut -f1)
            file_count=$(ls -1 "$container_dir"*-json.log* 2>/dev/null | wc -l)

            if [ -n "$total_size" ]; then
                printf "%-40s %10s %10s\n" "$container_name" "$total_size" "$file_count"
            fi
        fi
    fi
done

echo ""
echo "Containers exceeding ${THRESHOLD_MB}MB threshold:"
echo "------------------------------------------------"

for container_dir in "$LOG_DIR"/*/; do
    if [ -d "$container_dir" ]; then
        container_id=$(basename "$container_dir")
        container_name=$(docker inspect --format '{{.Name}}' "$container_id" 2>/dev/null | sed 's/\///')

        if [ -n "$container_name" ]; then
            size_bytes=$(du -sb "$container_dir"*-json.log* 2>/dev/null | awk '{sum+=$1} END {print sum}')
            size_mb=$((size_bytes / 1024 / 1024))

            if [ "$size_mb" -gt "$THRESHOLD_MB" ]; then
                echo "WARNING: $container_name is using ${size_mb}MB"
            fi
        fi
    fi
done
```

### Manual Log Truncation

For emergency situations when logs are consuming too much disk:

```bash
#!/bin/bash
# truncate-docker-logs.sh - Truncate logs for a specific container

CONTAINER_NAME=$1

if [ -z "$CONTAINER_NAME" ]; then
    echo "Usage: $0 <container_name>"
    exit 1
fi

CONTAINER_ID=$(docker inspect --format '{{.Id}}' "$CONTAINER_NAME" 2>/dev/null)

if [ -z "$CONTAINER_ID" ]; then
    echo "Container not found: $CONTAINER_NAME"
    exit 1
fi

LOG_FILE="/var/lib/docker/containers/${CONTAINER_ID}/${CONTAINER_ID}-json.log"

if [ -f "$LOG_FILE" ]; then
    echo "Current log size: $(du -h "$LOG_FILE" | cut -f1)"
    echo "Truncating log file..."
    sudo truncate -s 0 "$LOG_FILE"
    echo "Log file truncated."
else
    echo "Log file not found: $LOG_FILE"
fi
```

## Troubleshooting Common Issues

### Fluentd Connection Failures

When containers cannot connect to Fluentd, logs may be lost. Use async mode and retries:

```yaml
logging:
  driver: fluentd
  options:
    fluentd-address: fluentd:24224
    fluentd-async: "true"
    fluentd-retry-wait: "1s"
    fluentd-max-retries: "30"
    fluentd-buffer-limit: "16777216"  # 16MB buffer
    mode: non-blocking
    max-buffer-size: "4m"
```

### High Memory Usage with json-file Driver

If Docker is using excessive memory for logging, check these settings:

```json
{
  "log-driver": "json-file",
  "log-opts": {
    "max-size": "10m",
    "max-file": "3",
    "compress": "true",
    "mode": "non-blocking",
    "max-buffer-size": "4m"
  }
}
```

### Logs Not Appearing in Centralized System

Debug checklist:

```bash
# Check if container is using correct logging driver
docker inspect <container> --format '{{.HostConfig.LogConfig.Type}}'

# Check Fluentd connectivity
docker run --rm appropriate/curl curl -v telnet://fluentd:24224

# View Fluentd logs for errors
docker logs fluentd --tail 100

# Test log generation
docker run --rm \
  --log-driver fluentd \
  --log-opt fluentd-address=fluentd:24224 \
  --log-opt tag=test \
  alpine echo "Test log message"
```

## Summary

Implementing Docker logging best practices requires attention to several key areas:

1. **Choose the right driver**: Match your logging driver to your infrastructure. Use `json-file` or `local` for simple deployments, `fluentd` or similar for centralized logging.

2. **Always configure log rotation**: Never run containers without `max-size` and `max-file` options. Unbounded logs will eventually fill your disk.

3. **Use structured logging**: JSON-formatted logs from your applications enable better parsing, filtering, and analysis in any log management system.

4. **Standardize with docker-compose**: Use YAML anchors and extension fields to maintain consistent logging configuration across services.

5. **Monitor log storage**: Implement monitoring for log disk usage and have procedures ready for emergency log truncation.

6. **Plan for failure**: When using centralized logging, configure async mode and retries to prevent log loss during collector outages.

These practices will help you maintain observable, debuggable containerized applications without the common pitfalls of disk exhaustion and lost logs.
