# How to Correlate Traces Across Dapr Services

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Dapr, Distributed Tracing, Correlation, Observability, Microservice, Debugging

Description: Correlate traces across multiple Dapr microservices using trace IDs, structured logging, and span baggage to connect logs, metrics, and traces.

---

## Overview

In a microservices system, a single user request may touch 5-10 services. Without trace correlation, diagnosing failures means combing through logs from multiple services independently. Dapr's automatic W3C Trace Context propagation gives every request a shared trace ID that flows across all service boundaries. This guide shows how to extract and use that trace ID to correlate observability signals.

## How Dapr Propagates Trace IDs

When Service A calls Service B via Dapr service invocation, Dapr:
1. Reads the `traceparent` header from the incoming request
2. Creates a child span with a new span ID but the same trace ID
3. Injects the updated `traceparent` into the outgoing request to Service B

The trace ID (`traceparent` field 2) stays constant across all services in the request chain.

## Extracting the Trace ID in Python

```python
from flask import Flask, request, g
import logging
import json

app = Flask(__name__)

def setup_logging():
    logging.basicConfig(
        format='%(message)s',
        level=logging.INFO
    )

def get_trace_id():
    traceparent = request.headers.get('traceparent', '')
    parts = traceparent.split('-')
    return parts[1] if len(parts) >= 2 else 'unknown'

@app.before_request
def inject_trace_id():
    g.trace_id = get_trace_id()

def log(message, **kwargs):
    logging.info(json.dumps({
        'message': message,
        'trace_id': g.get('trace_id', 'unknown'),
        **kwargs
    }))

@app.route('/orders', methods=['POST'])
def create_order():
    data = request.json.get('data', {})
    log('Creating order', order_id=data.get('orderId'))
    # ... process
    log('Order created', order_id=data.get('orderId'), status='success')
    return '', 200
```

## Extracting Trace ID in Go

```go
package main

import (
    "encoding/json"
    "log"
    "net/http"
    "strings"
)

func extractTraceID(r *http.Request) string {
    tp := r.Header.Get("traceparent")
    parts := strings.Split(tp, "-")
    if len(parts) >= 2 {
        return parts[1]
    }
    return "unknown"
}

func handler(w http.ResponseWriter, r *http.Request) {
    traceID := extractTraceID(r)

    logEntry := map[string]interface{}{
        "message":  "processing request",
        "trace_id": traceID,
        "service":  "order-service",
    }
    data, _ := json.Marshal(logEntry)
    log.Println(string(data))

    w.WriteHeader(http.StatusOK)
}
```

## Correlating Logs in Elasticsearch/OpenSearch

With structured JSON logs containing `trace_id`, query all logs for a request:

```json
GET /logs-*/_search
{
  "query": {
    "term": {
      "trace_id": "4bf92f3577b34da6a3ce929d0e0e4736"
    }
  },
  "sort": [{"@timestamp": "asc"}]
}
```

This returns logs from all services that handled this trace, in chronological order.

## Adding Trace ID to Response Headers

Expose trace IDs to API clients for support tickets:

```python
@app.after_request
def add_trace_header(response):
    response.headers['X-Trace-Id'] = g.get('trace_id', 'unknown')
    return response
```

Clients can then report the `X-Trace-Id` value when filing bugs.

## Correlating with Metrics

Track request durations with Prometheus and correlate with traces by timestamp:

```python
from prometheus_client import Histogram

request_duration = Histogram(
    'request_duration_seconds',
    'Request duration',
    ['service', 'endpoint']
)

@app.route('/orders', methods=['POST'])
def create_order():
    with request_duration.labels(
        service='order-service',
        endpoint='/orders'
    ).time():
        process_order()
```

Then correlate by timestamp: find the trace ID from a slow span, look up application logs with that trace ID, and check metric spikes at the same time.

## Searching Traces by Attributes in Jaeger

```bash
# Find all traces for a specific order ID
curl "http://localhost:16686/api/traces?service=order-service&tag=orderId:ORD-1001"

# Find traces with errors
curl "http://localhost:16686/api/traces?service=order-service&tag=error:true"
```

## Summary

Dapr's automatic W3C Trace Context propagation gives every cross-service request a shared trace ID. Extract this trace ID from the `traceparent` header in each service and include it in structured log output. This lets you query all logs for a single request across all services using one trace ID, dramatically reducing the time to diagnose production incidents.
