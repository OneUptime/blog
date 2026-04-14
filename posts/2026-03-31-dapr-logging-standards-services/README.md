# How to Implement Logging Standards for Dapr Services

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Dapr, Logging, Observability, Kubernetes, OpenTelemetry

Description: Implement consistent structured logging standards for Dapr services using JSON format, correlation IDs, and integration with centralized log aggregation systems.

---

## Overview

Consistent logging across Dapr services is critical for debugging distributed systems. Dapr emits structured logs by default, and you can extend your application logs to follow the same standards for unified observability.

## Configuring Dapr Log Format

Configure Dapr sidecar to emit JSON-structured logs via annotations:

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: order-service
spec:
  template:
    metadata:
      annotations:
        dapr.io/enabled: "true"
        dapr.io/app-id: "order-service"
        dapr.io/log-level: "info"
        dapr.io/log-as-json: "true"
```

## Structured Application Logging

Use a structured logger in your service to match Dapr's log format:

```javascript
const winston = require('winston');

const logger = winston.createLogger({
  level: 'info',
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.json()
  ),
  defaultMeta: {
    service: 'order-service',
    version: '1.0.0'
  },
  transports: [new winston.transports.Console()]
});

// Log with consistent fields
logger.info('Order processed', {
  orderId: '12345',
  customerId: 'cust-789',
  traceId: req.headers['traceparent'],
  duration: 45
});
```

## Correlating Logs with Dapr Trace IDs

Dapr propagates W3C trace context headers. Extract and include them in your logs:

```javascript
app.post('/orders', (req, res) => {
  const traceParent = req.headers['traceparent'] || '';
  const traceId = traceParent.split('-')[1] || 'unknown';

  logger.info('Received order request', {
    traceId,
    method: req.method,
    path: req.path,
    body: req.body
  });

  // Process order...
});
```

## Centralized Log Aggregation with Fluentd

Deploy Fluentd to collect logs from all Dapr-enabled pods:

```yaml
apiVersion: v1
kind: ConfigMap
metadata:
  name: fluentd-config
data:
  fluent.conf: |
    <source>
      @type tail
      path /var/log/containers/*.log
      tag kubernetes.*
      <parse>
        @type json
      </parse>
    </source>
    <filter kubernetes.**>
      @type record_transformer
      <record>
        app_id ${record.dig("kubernetes", "labels", "app")}
        dapr_app_id ${record.dig("kubernetes", "annotations", "dapr.io/app-id")}
      </record>
    </filter>
    <match **>
      @type elasticsearch
      host elasticsearch.logging.svc.cluster.local
      port 9200
      index_name dapr-logs
    </match>
```

## Log Level Management

Dynamically change Dapr sidecar log level without restarting:

```bash
curl -X PUT http://localhost:3500/v1.0/metadata/logLevel \
  -H "Content-Type: text/plain" \
  -d 'debug'
```

## Alerting on Error Logs

Use a log-based alert query for critical Dapr errors:

```bash
# Kibana query for Dapr errors
level:error AND app_id:order-service AND NOT message:"expected error"
```

## Summary

Implementing consistent logging standards for Dapr services requires configuring JSON-structured sidecar logs, propagating trace context into application logs, and shipping all logs to a centralized system like Elasticsearch. By standardizing log fields such as traceId, service name, and version, you gain the visibility needed to quickly diagnose failures across distributed Dapr applications.
