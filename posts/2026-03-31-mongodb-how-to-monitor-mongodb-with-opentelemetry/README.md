# How to Monitor MongoDB with OpenTelemetry

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: MongoDB, OpenTelemetry, Monitoring, Trace, Metric

Description: Instrument MongoDB applications with OpenTelemetry to capture distributed traces, metrics, and logs for end-to-end observability across your stack.

---

## Overview

OpenTelemetry (OTel) provides vendor-neutral instrumentation for distributed systems. For MongoDB, OTel captures two things: application-level traces showing how long each MongoDB operation takes from your code's perspective, and infrastructure metrics via the OpenTelemetry Collector's MongoDB receiver. This guide covers both approaches.

## Architecture

```text
Application (Node.js/Python/Go)
    |
OTel SDK (auto-instrumentation)
    |
OTel Collector
    |-- Traces --> Jaeger / Tempo
    |-- Metrics --> Prometheus / Grafana
    |-- Logs --> Loki / Elasticsearch
```

## Part 1 - Trace MongoDB Operations from Node.js

### Install Dependencies

```bash
npm install \
  @opentelemetry/api \
  @opentelemetry/sdk-node \
  @opentelemetry/sdk-metrics \
  @opentelemetry/resources \
  @opentelemetry/semantic-conventions \
  @opentelemetry/auto-instrumentations-node \
  @opentelemetry/exporter-trace-otlp-http \
  @opentelemetry/exporter-metrics-otlp-http \
  mongodb
```

### Configure OpenTelemetry

```javascript
// tracing.js - load before all other imports
const { NodeSDK } = require("@opentelemetry/sdk-node")
const { getNodeAutoInstrumentations } = require("@opentelemetry/auto-instrumentations-node")
const { OTLPTraceExporter } = require("@opentelemetry/exporter-trace-otlp-http")
const { OTLPMetricExporter } = require("@opentelemetry/exporter-metrics-otlp-http")
const { PeriodicExportingMetricReader } = require("@opentelemetry/sdk-metrics")
const { Resource } = require("@opentelemetry/resources")
const { ATTR_SERVICE_NAME, ATTR_SERVICE_VERSION } = require("@opentelemetry/semantic-conventions")

const sdk = new NodeSDK({
  resource: new Resource({
    [ATTR_SERVICE_NAME]: "my-app",
    [ATTR_SERVICE_VERSION]: "1.0.0"
  }),
  traceExporter: new OTLPTraceExporter({
    url: "http://otel-collector:4318/v1/traces"
  }),
  metricReader: new PeriodicExportingMetricReader({
    exporter: new OTLPMetricExporter({
      url: "http://otel-collector:4318/v1/metrics"
    }),
    exportIntervalMillis: 15000
  }),
  instrumentations: [
    getNodeAutoInstrumentations({
      "@opentelemetry/instrumentation-mongodb": {
        enabled: true,
        dbStatementSerializer: (commandObj) => {
          return JSON.stringify(commandObj)
        }
      }
    })
  ]
})

sdk.start()
process.on("SIGTERM", () => sdk.shutdown())
```

### Run with Tracing

```bash
node -r ./tracing.js app.js
```

### Traced MongoDB Operations

```javascript
// app.js - traces are captured automatically
const { MongoClient } = require("mongodb")
const client = new MongoClient("mongodb://localhost:27017")

async function processOrder(orderId) {
  const db = client.db("ecommerce")

  // Each operation creates a child span automatically
  const order = await db.collection("orders").findOne({ _id: orderId })
  const product = await db.collection("products").findOne({ _id: order.productId })

  await db.collection("orders").updateOne(
    { _id: orderId },
    { $set: { status: "processing", updatedAt: new Date() } }
  )

  return { order, product }
}
```

Traces in Jaeger will show:
- `mongodb.find` span with collection name
- `mongodb.update` span with query details
- Duration for each operation
- Parent-child relationships

## Part 2 - Collect MongoDB Infrastructure Metrics via OTel Collector

### Configure the MongoDB Receiver

```yaml
# otel-collector-config.yaml
receivers:
  mongodb:
    hosts:
      - endpoint: localhost:27017
    username: otel_monitor
    password: ${env:MONGODB_PASSWORD}
    collection_interval: 30s
    initial_delay: 1s
    tls:
      insecure: true

  otlp:
    protocols:
      grpc:
        endpoint: 0.0.0.0:4317
      http:
        endpoint: 0.0.0.0:4318

exporters:
  prometheus:
    endpoint: "0.0.0.0:8889"
  otlp/jaeger:
    endpoint: jaeger:4317
    tls:
      insecure: true

processors:
  batch:
    timeout: 5s
  memory_limiter:
    limit_mib: 512

service:
  pipelines:
    metrics:
      receivers: [mongodb, otlp]
      processors: [memory_limiter, batch]
      exporters: [prometheus]
    traces:
      receivers: [otlp]
      processors: [batch]
      exporters: [otlp/jaeger]
```

### Create a Read-Only MongoDB User for OTel

```javascript
use admin
db.createUser({
  user: "otel_monitor",
  pwd: "otel-monitor-pass",
  roles: [
    { role: "clusterMonitor", db: "admin" },
    { role: "read", db: "local" }
  ]
})
```

## Part 3 - Add Custom MongoDB Spans

For fine-grained tracing, add manual spans:

```javascript
const { trace } = require("@opentelemetry/api")

const tracer = trace.getTracer("my-app")

async function searchProducts(query) {
  const span = tracer.startSpan("search-products", {
    attributes: {
      "db.system": "mongodb",
      "db.operation": "aggregate",
      "app.search.query": query
    }
  })

  try {
    const db = client.db("ecommerce")
    const results = await db.collection("products").aggregate([
      { $match: { $text: { $search: query } } },
      { $sort: { score: { $meta: "textScore" } } },
      { $limit: 20 }
    ]).toArray()

    span.setAttribute("app.results.count", results.length)
    return results
  } catch (err) {
    span.recordException(err)
    span.setStatus({ code: 2, message: err.message })
    throw err
  } finally {
    span.end()
  }
}
```

## Summary

OpenTelemetry provides two complementary ways to monitor MongoDB: auto-instrumentation at the driver level captures traces for every query with timing and operation details, while the OTel Collector's MongoDB receiver collects server-side infrastructure metrics like connections, operation rates, and replication lag. Together they provide end-to-end visibility from application code through to the database layer.
