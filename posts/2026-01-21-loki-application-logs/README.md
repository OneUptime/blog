# How to Collect Application Logs with Loki

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Grafana Loki, Application Logs, Structured Logging, Log Collection, Observability, Development

Description: A comprehensive guide to collecting application logs with Grafana Loki, covering structured logging libraries, direct SDK integration, logging best practices, and production deployment patterns.

---

Application logs are essential for debugging, monitoring, and understanding application behavior. This guide covers how to collect application logs from various programming languages and frameworks and ship them to Loki for centralized log management.

## Prerequisites

Before starting, ensure you have:

- Grafana Loki deployed and accessible
- Application development environment
- Understanding of your application's logging requirements
- Promtail or alternative log shipper configured

## Structured Logging Fundamentals

### Why Structured Logging

Structured logs enable:

- Easy parsing and filtering
- Consistent log format
- Efficient querying in Loki
- Better correlation across services

### Log Format Comparison

```
# Unstructured (hard to parse)
2024-01-15 10:30:00 ERROR Failed to process order 12345 for user john@example.com

# Structured JSON (easy to parse)
{"timestamp":"2024-01-15T10:30:00Z","level":"error","msg":"Failed to process order","order_id":"12345","user":"john@example.com"}
```

## Node.js Application Logging

### Winston with JSON Format

```javascript
// logger.js
const winston = require('winston');

const logger = winston.createLogger({
  level: process.env.LOG_LEVEL || 'info',
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.errors({ stack: true }),
    winston.format.json()
  ),
  defaultMeta: {
    service: 'order-service',
    version: process.env.APP_VERSION || '1.0.0'
  },
  transports: [
    new winston.transports.Console(),
    new winston.transports.File({
      filename: '/var/log/app/app.log',
      maxsize: 100 * 1024 * 1024, // 100MB
      maxFiles: 5
    })
  ]
});

// Usage
logger.info('Order created', {
  orderId: '12345',
  userId: 'user-789',
  amount: 99.99
});

logger.error('Payment failed', {
  orderId: '12345',
  error: 'Insufficient funds',
  gateway: 'stripe'
});

module.exports = logger;
```

### Pino (High Performance)

```javascript
// logger.js
const pino = require('pino');

const logger = pino({
  level: process.env.LOG_LEVEL || 'info',
  base: {
    service: 'api-gateway',
    version: process.env.APP_VERSION
  },
  timestamp: pino.stdTimeFunctions.isoTime,
  formatters: {
    level: (label) => ({ level: label })
  }
});

// Usage
logger.info({ orderId: '12345', userId: 'user-789' }, 'Order created');

// Child logger with context
const reqLogger = logger.child({ requestId: 'req-123' });
reqLogger.info('Processing request');

module.exports = logger;
```

### Express Middleware

```javascript
const express = require('express');
const pino = require('pino-http');
const logger = require('./logger');

const app = express();

app.use(pino({
  logger,
  customLogLevel: (req, res, err) => {
    if (res.statusCode >= 500 || err) return 'error';
    if (res.statusCode >= 400) return 'warn';
    return 'info';
  },
  customSuccessMessage: (req, res) => {
    return `${req.method} ${req.url} completed`;
  },
  customErrorMessage: (req, res, err) => {
    return `${req.method} ${req.url} failed: ${err.message}`;
  },
  customAttributeKeys: {
    req: 'request',
    res: 'response',
    responseTime: 'duration_ms'
  },
  redact: ['req.headers.authorization', 'req.headers.cookie']
}));
```

## Python Application Logging

### Structlog Configuration

```python
# logger.py
import structlog
import logging
import sys

def configure_logging(service_name: str, log_level: str = "INFO"):
    """Configure structured logging with structlog."""

    # Configure standard logging
    logging.basicConfig(
        format="%(message)s",
        stream=sys.stdout,
        level=getattr(logging, log_level.upper())
    )

    # Configure structlog
    structlog.configure(
        processors=[
            structlog.stdlib.filter_by_level,
            structlog.stdlib.add_logger_name,
            structlog.stdlib.add_log_level,
            structlog.stdlib.PositionalArgumentsFormatter(),
            structlog.processors.TimeStamper(fmt="iso"),
            structlog.processors.StackInfoRenderer(),
            structlog.processors.format_exc_info,
            structlog.processors.UnicodeDecoder(),
            structlog.processors.JSONRenderer()
        ],
        context_class=dict,
        logger_factory=structlog.stdlib.LoggerFactory(),
        wrapper_class=structlog.stdlib.BoundLogger,
        cache_logger_on_first_use=True,
    )

    return structlog.get_logger(service=service_name)

# Usage
logger = configure_logging("payment-service")

logger.info("payment_processed",
    order_id="12345",
    amount=99.99,
    currency="USD",
    gateway="stripe"
)

logger.error("payment_failed",
    order_id="12345",
    error="Card declined",
    error_code="card_declined"
)
```

### Python Logging with JSON Handler

```python
# json_logger.py
import logging
import json
from datetime import datetime

class JSONFormatter(logging.Formatter):
    def format(self, record):
        log_obj = {
            "timestamp": datetime.utcnow().isoformat() + "Z",
            "level": record.levelname.lower(),
            "logger": record.name,
            "message": record.getMessage(),
            "service": getattr(record, 'service', 'unknown'),
        }

        # Add extra fields
        if hasattr(record, 'extra'):
            log_obj.update(record.extra)

        # Add exception info
        if record.exc_info:
            log_obj["exception"] = self.formatException(record.exc_info)

        return json.dumps(log_obj)

def get_logger(name: str, service: str = "app"):
    logger = logging.getLogger(name)
    logger.setLevel(logging.DEBUG)

    handler = logging.StreamHandler()
    handler.setFormatter(JSONFormatter())
    logger.addHandler(handler)

    # Add service context
    old_factory = logging.getLogRecordFactory()

    def record_factory(*args, **kwargs):
        record = old_factory(*args, **kwargs)
        record.service = service
        return record

    logging.setLogRecordFactory(record_factory)

    return logger

# Usage
logger = get_logger(__name__, service="user-service")
logger.info("User created", extra={"user_id": "123", "email": "user@example.com"})
```

### FastAPI Integration

```python
from fastapi import FastAPI, Request
from starlette.middleware.base import BaseHTTPMiddleware
import structlog
import time
import uuid

logger = structlog.get_logger()

class LoggingMiddleware(BaseHTTPMiddleware):
    async def dispatch(self, request: Request, call_next):
        request_id = str(uuid.uuid4())
        start_time = time.time()

        # Bind request context
        structlog.contextvars.bind_contextvars(
            request_id=request_id,
            method=request.method,
            path=request.url.path,
            client_ip=request.client.host
        )

        logger.info("request_started")

        try:
            response = await call_next(request)
            duration_ms = (time.time() - start_time) * 1000

            logger.info("request_completed",
                status_code=response.status_code,
                duration_ms=round(duration_ms, 2)
            )

            response.headers["X-Request-ID"] = request_id
            return response

        except Exception as e:
            logger.error("request_failed", error=str(e))
            raise
        finally:
            structlog.contextvars.unbind_contextvars(
                "request_id", "method", "path", "client_ip"
            )

app = FastAPI()
app.add_middleware(LoggingMiddleware)
```

## Go Application Logging

### Zerolog Configuration

```go
// logger/logger.go
package logger

import (
    "os"
    "time"

    "github.com/rs/zerolog"
    "github.com/rs/zerolog/log"
)

func Init(serviceName, version string) zerolog.Logger {
    zerolog.TimeFieldFormat = time.RFC3339Nano

    logger := zerolog.New(os.Stdout).With().
        Timestamp().
        Str("service", serviceName).
        Str("version", version).
        Logger()

    // Set global logger
    log.Logger = logger

    return logger
}

// Usage
func main() {
    logger := logger.Init("order-service", "1.0.0")

    logger.Info().
        Str("order_id", "12345").
        Str("user_id", "user-789").
        Float64("amount", 99.99).
        Msg("Order created")

    logger.Error().
        Str("order_id", "12345").
        Err(errors.New("payment failed")).
        Msg("Failed to process order")
}
```

### Zap Configuration

```go
// logger/logger.go
package logger

import (
    "go.uber.org/zap"
    "go.uber.org/zap/zapcore"
)

func NewLogger(serviceName, version string) (*zap.Logger, error) {
    config := zap.NewProductionConfig()
    config.EncoderConfig.TimeKey = "timestamp"
    config.EncoderConfig.EncodeTime = zapcore.ISO8601TimeEncoder

    logger, err := config.Build(
        zap.Fields(
            zap.String("service", serviceName),
            zap.String("version", version),
        ),
    )
    if err != nil {
        return nil, err
    }

    return logger, nil
}

// Usage
func main() {
    logger, _ := logger.NewLogger("api-gateway", "2.0.0")
    defer logger.Sync()

    logger.Info("Request processed",
        zap.String("request_id", "req-123"),
        zap.Int("status_code", 200),
        zap.Duration("duration", time.Millisecond*45),
    )

    logger.Error("Database query failed",
        zap.Error(err),
        zap.String("query", "SELECT * FROM users"),
    )
}
```

### Gin Middleware

```go
func LoggingMiddleware(logger *zap.Logger) gin.HandlerFunc {
    return func(c *gin.Context) {
        start := time.Now()
        requestID := uuid.New().String()

        c.Set("request_id", requestID)
        c.Header("X-Request-ID", requestID)

        // Process request
        c.Next()

        duration := time.Since(start)

        logger.Info("HTTP Request",
            zap.String("request_id", requestID),
            zap.String("method", c.Request.Method),
            zap.String("path", c.Request.URL.Path),
            zap.Int("status", c.Writer.Status()),
            zap.Duration("duration", duration),
            zap.String("client_ip", c.ClientIP()),
        )
    }
}
```

## Java Application Logging

### Logback JSON Configuration

```xml
<!-- logback.xml -->
<configuration>
    <appender name="JSON" class="ch.qos.logback.core.ConsoleAppender">
        <encoder class="net.logstash.logback.encoder.LogstashEncoder">
            <includeMdcKeyName>requestId</includeMdcKeyName>
            <includeMdcKeyName>userId</includeMdcKeyName>
            <customFields>{"service":"order-service","version":"1.0.0"}</customFields>
        </encoder>
    </appender>

    <appender name="FILE" class="ch.qos.logback.core.rolling.RollingFileAppender">
        <file>/var/log/app/application.log</file>
        <rollingPolicy class="ch.qos.logback.core.rolling.TimeBasedRollingPolicy">
            <fileNamePattern>/var/log/app/application.%d{yyyy-MM-dd}.log</fileNamePattern>
            <maxHistory>30</maxHistory>
        </rollingPolicy>
        <encoder class="net.logstash.logback.encoder.LogstashEncoder"/>
    </appender>

    <root level="INFO">
        <appender-ref ref="JSON"/>
        <appender-ref ref="FILE"/>
    </root>
</configuration>
```

### Spring Boot Logging

```java
// LoggingConfig.java
@Configuration
public class LoggingConfig {

    @Bean
    public FilterRegistrationBean<RequestLoggingFilter> loggingFilter() {
        FilterRegistrationBean<RequestLoggingFilter> registration =
            new FilterRegistrationBean<>();
        registration.setFilter(new RequestLoggingFilter());
        registration.addUrlPatterns("/*");
        return registration;
    }
}

// RequestLoggingFilter.java
@Component
public class RequestLoggingFilter extends OncePerRequestFilter {

    private static final Logger logger = LoggerFactory.getLogger(RequestLoggingFilter.class);

    @Override
    protected void doFilterInternal(HttpServletRequest request,
                                    HttpServletResponse response,
                                    FilterChain filterChain) {
        String requestId = UUID.randomUUID().toString();
        MDC.put("requestId", requestId);

        long startTime = System.currentTimeMillis();

        try {
            filterChain.doFilter(request, response);
        } finally {
            long duration = System.currentTimeMillis() - startTime;

            logger.info("HTTP Request completed",
                kv("method", request.getMethod()),
                kv("path", request.getRequestURI()),
                kv("status", response.getStatus()),
                kv("duration_ms", duration)
            );

            MDC.clear();
        }
    }
}
```

## Direct Loki Integration

### Push API

```javascript
// loki-client.js
const axios = require('axios');

class LokiClient {
  constructor(url, labels = {}) {
    this.url = url;
    this.defaultLabels = labels;
    this.buffer = [];
    this.flushInterval = 5000;

    setInterval(() => this.flush(), this.flushInterval);
  }

  log(level, message, extraLabels = {}) {
    const timestamp = Date.now() * 1000000; // nanoseconds
    const labels = { ...this.defaultLabels, level, ...extraLabels };

    this.buffer.push({
      labels,
      timestamp: timestamp.toString(),
      line: typeof message === 'object' ? JSON.stringify(message) : message
    });
  }

  async flush() {
    if (this.buffer.length === 0) return;

    const streams = this.groupByLabels(this.buffer);
    this.buffer = [];

    const payload = {
      streams: Object.entries(streams).map(([labelStr, entries]) => ({
        stream: JSON.parse(labelStr),
        values: entries.map(e => [e.timestamp, e.line])
      }))
    };

    try {
      await axios.post(`${this.url}/loki/api/v1/push`, payload, {
        headers: { 'Content-Type': 'application/json' }
      });
    } catch (error) {
      console.error('Failed to push to Loki:', error.message);
    }
  }

  groupByLabels(entries) {
    return entries.reduce((acc, entry) => {
      const key = JSON.stringify(entry.labels);
      if (!acc[key]) acc[key] = [];
      acc[key].push(entry);
      return acc;
    }, {});
  }
}

// Usage
const loki = new LokiClient('http://loki:3100', {
  service: 'my-app',
  environment: 'production'
});

loki.log('info', { message: 'User logged in', userId: '123' });
loki.log('error', { message: 'Database error', error: 'Connection refused' });
```

### Python Loki Handler

```python
import logging
import requests
import time
import json
from threading import Thread, Lock
from queue import Queue

class LokiHandler(logging.Handler):
    def __init__(self, url, labels=None, batch_size=100, flush_interval=5):
        super().__init__()
        self.url = f"{url}/loki/api/v1/push"
        self.labels = labels or {}
        self.batch_size = batch_size
        self.flush_interval = flush_interval
        self.queue = Queue()
        self.lock = Lock()

        # Start background flush thread
        self.flush_thread = Thread(target=self._flush_loop, daemon=True)
        self.flush_thread.start()

    def emit(self, record):
        try:
            log_entry = {
                "labels": {
                    **self.labels,
                    "level": record.levelname.lower(),
                    "logger": record.name
                },
                "timestamp": str(int(time.time() * 1e9)),
                "line": self.format(record)
            }
            self.queue.put(log_entry)
        except Exception:
            self.handleError(record)

    def _flush_loop(self):
        while True:
            time.sleep(self.flush_interval)
            self._flush()

    def _flush(self):
        entries = []
        while not self.queue.empty() and len(entries) < self.batch_size:
            entries.append(self.queue.get())

        if not entries:
            return

        streams = {}
        for entry in entries:
            label_key = json.dumps(entry["labels"], sort_keys=True)
            if label_key not in streams:
                streams[label_key] = []
            streams[label_key].append([entry["timestamp"], entry["line"]])

        payload = {
            "streams": [
                {"stream": json.loads(k), "values": v}
                for k, v in streams.items()
            ]
        }

        try:
            requests.post(self.url, json=payload, timeout=10)
        except Exception as e:
            print(f"Failed to send logs to Loki: {e}")

# Usage
logger = logging.getLogger("my-app")
logger.setLevel(logging.INFO)

handler = LokiHandler(
    url="http://loki:3100",
    labels={"service": "my-app", "env": "production"}
)
handler.setFormatter(logging.Formatter('%(message)s'))
logger.addHandler(handler)

logger.info(json.dumps({"event": "user_login", "user_id": "123"}))
```

## Promtail Configuration for Applications

### File-Based Collection

```yaml
# promtail.yaml
server:
  http_listen_port: 9080

positions:
  filename: /tmp/positions.yaml

clients:
  - url: http://loki:3100/loki/api/v1/push

scrape_configs:
  - job_name: application
    static_configs:
      - targets: [localhost]
        labels:
          job: app
          __path__: /var/log/app/*.log
    pipeline_stages:
      - json:
          expressions:
            level: level
            service: service
            timestamp: timestamp
            message: message
      - labels:
          level:
          service:
      - timestamp:
          source: timestamp
          format: RFC3339
      - output:
          source: message
```

### Multi-Application Config

```yaml
scrape_configs:
  - job_name: order-service
    static_configs:
      - targets: [localhost]
        labels:
          job: order-service
          __path__: /var/log/order-service/*.log
    pipeline_stages:
      - json:
          expressions:
            level: level
            order_id: order_id
            user_id: user_id
      - labels:
          level:

  - job_name: payment-service
    static_configs:
      - targets: [localhost]
        labels:
          job: payment-service
          __path__: /var/log/payment-service/*.log
    pipeline_stages:
      - json:
          expressions:
            level: level
            transaction_id: transaction_id
      - labels:
          level:
```

## Kubernetes Logging

### Pod Logging with Annotations

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: my-app
spec:
  template:
    metadata:
      annotations:
        # Promtail annotations
        promtail.io/scrape: "true"
        promtail.io/parser: "json"
    spec:
      containers:
        - name: app
          image: my-app:latest
          env:
            - name: LOG_FORMAT
              value: "json"
            - name: LOG_LEVEL
              value: "info"
```

### Sidecar Pattern

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: my-app
spec:
  template:
    spec:
      containers:
        - name: app
          image: my-app:latest
          volumeMounts:
            - name: logs
              mountPath: /var/log/app

        - name: promtail
          image: grafana/promtail:2.9.4
          args:
            - -config.file=/etc/promtail/config.yaml
          volumeMounts:
            - name: logs
              mountPath: /var/log/app
            - name: promtail-config
              mountPath: /etc/promtail

      volumes:
        - name: logs
          emptyDir: {}
        - name: promtail-config
          configMap:
            name: promtail-sidecar-config
```

## LogQL Queries for Application Logs

### Query by Service

```logql
{service="order-service"} | json | level="error"
```

### Trace Request Flow

```logql
{job=~".*-service"} | json | request_id="req-12345"
```

### Error Rate by Service

```logql
sum by (service) (
  rate({job=~".*-service"} | json | level="error" [5m])
)
```

### Slow Requests

```logql
{service="api-gateway"}
| json
| duration_ms > 1000
| line_format "{{.method}} {{.path}} took {{.duration_ms}}ms"
```

## Best Practices

### Logging Guidelines

1. **Use Structured Logging**: Always log in JSON format
2. **Include Context**: Add request IDs, user IDs, and trace IDs
3. **Appropriate Log Levels**: Use debug, info, warn, error correctly
4. **Avoid Sensitive Data**: Never log passwords, tokens, or PII
5. **Keep Messages Concise**: Log meaningful information only

### Label Strategy

```yaml
# Good labels (low cardinality)
labels:
  service: order-service
  environment: production
  level: error

# Avoid (high cardinality)
labels:
  request_id: abc123  # Use log content instead
  user_id: user-789   # Use log content instead
```

### Performance Considerations

1. Use async logging
2. Batch log writes
3. Configure appropriate buffer sizes
4. Monitor log volume

## Conclusion

Collecting application logs with Loki requires proper structured logging implementation. Key takeaways:

- Use structured JSON logging in all applications
- Include request context (IDs, timestamps, metadata)
- Configure Promtail pipelines for JSON parsing
- Use appropriate labels for efficient querying
- Follow logging best practices for performance and security

With proper application logging, you gain deep visibility into application behavior and can effectively debug issues in production.
