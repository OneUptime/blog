# How to Configure Structured JSON Logging in Dapr

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Dapr, Logging, JSON, Observability, Configuration

Description: Learn how to enable and configure structured JSON logging in Dapr sidecars and applications for consistent, queryable log output across microservices.

---

## Overview

Structured JSON logging produces machine-readable log entries with consistent fields that log management systems like Elasticsearch, Loki, and Datadog can parse and index efficiently. Dapr supports structured JSON logging natively, and configuring it consistently across your fleet is a key step in building observable microservices.

## Enabling JSON Logging on Dapr Sidecar

Enable JSON logging via pod annotations:

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: inventory-service
spec:
  template:
    metadata:
      annotations:
        dapr.io/enabled: "true"
        dapr.io/app-id: "inventory-service"
        dapr.io/app-port: "8080"
        dapr.io/log-as-json: "true"
        dapr.io/log-level: "info"
```

With JSON logging enabled, Dapr sidecar output looks like:

```json
{"time":"2026-03-31T10:00:00Z","level":"info","msg":"starting Dapr Runtime","instance":"inventory-service-abc","app_id":"inventory-service","ver":"1.13.0"}
{"time":"2026-03-31T10:00:05Z","level":"info","msg":"dapr initialized. Status: Running","instance":"inventory-service-abc","app_id":"inventory-service"}
```

## Configuring Log Level

Set the log level globally via annotation or per-container via the Dapr configuration:

```yaml
apiVersion: dapr.io/v1alpha1
kind: Configuration
metadata:
  name: logging-config
spec:
  logging:
    apiLogging:
      enabled: true
      obfuscateURLs: false
      omitHealthChecks: true
```

Available log levels: `debug`, `info`, `warn`, `error`, `fatal`. Use `debug` in development and `info` in production.

## Structuring Application Logs to Match Dapr Format

Align your application logs with Dapr's JSON format for consistent field names:

```javascript
// Node.js with pino logger matching Dapr format
const pino = require('pino');

const logger = pino({
  level: process.env.LOG_LEVEL || 'info',
  base: {
    app_id: process.env.APP_ID || 'my-service',
    instance: process.env.HOSTNAME
  },
  timestamp: pino.stdTimeFunctions.isoTime,
  formatters: {
    level: (label) => ({ level: label })
  }
});

logger.info({ orderId: '123', customerId: 'cust-456' }, 'Order created');
```

Output:

```json
{"time":"2026-03-31T10:01:00Z","level":"info","app_id":"order-service","instance":"order-pod-xyz","msg":"Order created","orderId":"123","customerId":"cust-456"}
```

## Python Structured Logging

For Python services using structlog:

```python
import structlog
import os

structlog.configure(
    processors=[
        structlog.processors.TimeStamper(fmt="iso"),
        structlog.stdlib.add_log_level,
        structlog.processors.JSONRenderer()
    ]
)

log = structlog.get_logger().bind(
    app_id=os.getenv("APP_ID", "python-service"),
    instance=os.getenv("HOSTNAME")
)

log.info("Processing request", request_id="req-789", method="POST", path="/orders")
```

## Enabling API Request Logging

Enable Dapr API access logs to capture every inbound and outbound request:

```yaml
annotations:
  dapr.io/enable-api-logging: "true"
```

This adds entries for each Dapr API call:

```json
{"time":"2026-03-31T10:02:00Z","level":"info","msg":"HTTP API Called","method":"POST","path":"/v1.0/state/redis-statestore","status":204,"latencyMs":3,"app_id":"order-service"}
```

## Omitting Health Check Logs

Health check endpoints generate noise in logs. Suppress them via configuration:

```yaml
spec:
  logging:
    apiLogging:
      omitHealthChecks: true
```

This filters out `GET /v1.0/healthz` entries from Dapr API logs.

## Summary

Structured JSON logging in Dapr is enabled through pod annotations and the Dapr Configuration CRD. Align your application logging format with Dapr's JSON field conventions (time, level, msg, app_id, instance) for consistent, unified log output. Enable API request logging for full request tracing and omit health check logs to reduce noise in production environments.
