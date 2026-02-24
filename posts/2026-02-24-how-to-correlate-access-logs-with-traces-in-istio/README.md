# How to Correlate Access Logs with Traces in Istio

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Istio, Access Logs, Distributed Tracing, Correlation, Observability

Description: Learn how to connect Istio access logs with distributed traces for a unified view of request flow through your service mesh.

---

When something goes wrong in production, you often start with one of two things: an error in the access logs or a slow trace. The problem is that these are usually separate systems with separate data. You find an error log, but then you need to manually search for the corresponding trace. Or you spot a slow trace but want to see the raw access log details. Correlating access logs with traces closes this gap and gives you a unified picture of every request.

## How Trace Context Flows Through Istio

Every request in an Istio mesh can carry trace context headers. When a request enters the mesh, the ingress gateway or the first sidecar proxy generates trace headers if they don't already exist. These headers travel with the request through every service hop.

The key headers for trace correlation are:

- `X-B3-TraceId` - The unique identifier for the entire trace
- `X-B3-SpanId` - The identifier for the current span
- `X-B3-ParentSpanId` - The identifier of the parent span
- `X-Request-Id` - Envoy's internal request identifier
- `traceparent` - W3C Trace Context header (when using W3C format)

Both the trace ID and the request ID can serve as correlation keys between logs and traces.

## Including Trace IDs in Access Logs

The first step is making sure your access logs include trace identifiers. Configure your mesh to use JSON logging with trace fields:

```yaml
apiVersion: install.istio.io/v1alpha1
kind: IstioOperator
spec:
  meshConfig:
    accessLogFile: /dev/stdout
    accessLogEncoding: JSON
    accessLogFormat: |
      {
        "timestamp": "%START_TIME%",
        "method": "%REQ(:METHOD)%",
        "path": "%REQ(X-ENVOY-ORIGINAL-PATH?:PATH)%",
        "protocol": "%PROTOCOL%",
        "response_code": "%RESPONSE_CODE%",
        "response_flags": "%RESPONSE_FLAGS%",
        "bytes_received": "%BYTES_RECEIVED%",
        "bytes_sent": "%BYTES_SENT%",
        "duration_ms": "%DURATION%",
        "upstream_service_time_ms": "%RESP(X-ENVOY-UPSTREAM-SERVICE-TIME)%",
        "request_id": "%REQ(X-REQUEST-ID)%",
        "upstream_host": "%UPSTREAM_HOST%",
        "upstream_cluster": "%UPSTREAM_CLUSTER%",
        "trace_id": "%REQ(X-B3-TRACEID)%",
        "span_id": "%REQ(X-B3-SPANID)%",
        "parent_span_id": "%REQ(X-B3-PARENTSPANID)%",
        "sampled": "%REQ(X-B3-SAMPLED)%"
      }
```

Now every access log entry includes the trace ID, span ID, and parent span ID. A sample log entry looks like:

```json
{
  "timestamp": "2026-02-24T14:30:00.000Z",
  "method": "GET",
  "path": "/api/orders/123",
  "response_code": 200,
  "duration_ms": 45,
  "request_id": "d4e5f6a7-b8c9-0d1e-2f3a-4b5c6d7e8f9a",
  "trace_id": "463ac35c9f6413ad48485a3953bb6124",
  "span_id": "0020000000000001",
  "parent_span_id": "0020000000000000"
}
```

## Supporting W3C Trace Context

If you're using W3C Trace Context instead of B3 headers, adjust the log format to capture the `traceparent` header:

```yaml
accessLogFormat: |
  {
    "timestamp": "%START_TIME%",
    "method": "%REQ(:METHOD)%",
    "path": "%REQ(X-ENVOY-ORIGINAL-PATH?:PATH)%",
    "response_code": "%RESPONSE_CODE%",
    "duration_ms": "%DURATION%",
    "request_id": "%REQ(X-REQUEST-ID)%",
    "traceparent": "%REQ(TRACEPARENT)%",
    "tracestate": "%REQ(TRACESTATE)%"
  }
```

The `traceparent` header has the format `00-<trace-id>-<span-id>-<flags>`, so you can extract the trace ID from it during log processing.

## Setting Up Correlation in Grafana

If you're using Grafana with Loki for logs and Tempo (or Jaeger) for traces, you can configure derived fields to create clickable links between the two.

First, configure Promtail to extract the trace_id field:

```yaml
# promtail-config.yaml
scrape_configs:
  - job_name: istio-proxy
    kubernetes_sd_configs:
      - role: pod
    relabel_configs:
      - source_labels: [__meta_kubernetes_pod_container_name]
        regex: istio-proxy
        action: keep
    pipeline_stages:
      - json:
          expressions:
            trace_id: trace_id
            method: method
            path: path
            response_code: response_code
            duration_ms: duration_ms
      - labels:
          method:
          response_code:
      - output:
          source: trace_id
```

Then in Grafana, configure the Loki data source with a derived field:

1. Go to Configuration > Data Sources > Loki
2. Scroll to Derived Fields
3. Add a new derived field:
   - Name: `TraceID`
   - Regex: `"trace_id":"([a-f0-9]+)"`
   - Internal Link: Enable and select your Tempo/Jaeger data source
   - URL: `${__value.raw}`

Now when you view a log entry in Grafana's Explore panel, the trace ID becomes a clickable link that takes you directly to the trace.

## Setting Up Correlation in Elasticsearch/Kibana

For the EFK stack, the approach is similar but uses Kibana's URL drilldown feature:

```yaml
# Fluentd config for parsing Istio JSON logs
<filter istio.access>
  @type parser
  key_name log
  reserve_data true
  <parse>
    @type json
  </parse>
</filter>
```

In Kibana, create a URL drilldown on the `trace_id` field that links to your Jaeger UI:

```
http://jaeger.your-cluster.local/trace/{{event.value}}
```

## Application-Side Correlation

For complete correlation, your application code should also include the trace ID in its own logs. Here's how to extract it from the incoming headers:

Python (Flask):

```python
import logging
from flask import request

@app.before_request
def add_trace_context():
    trace_id = request.headers.get('X-B3-Traceid', 'unknown')
    span_id = request.headers.get('X-B3-Spanid', 'unknown')
    request.trace_id = trace_id
    logging.getLogger().info(
        f"Processing request",
        extra={"trace_id": trace_id, "span_id": span_id}
    )
```

Go:

```go
func traceMiddleware(next http.Handler) http.Handler {
    return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
        traceID := r.Header.Get("X-B3-Traceid")
        spanID := r.Header.Get("X-B3-Spanid")

        logger := log.With().
            Str("trace_id", traceID).
            Str("span_id", spanID).
            Logger()

        ctx := logger.WithContext(r.Context())
        next.ServeHTTP(w, r.WithContext(ctx))
    })
}
```

Node.js (Express):

```javascript
app.use((req, res, next) => {
  const traceId = req.headers['x-b3-traceid'] || 'unknown';
  const spanId = req.headers['x-b3-spanid'] || 'unknown';

  req.logger = logger.child({ trace_id: traceId, span_id: spanId });
  next();
});
```

## Using OpenTelemetry for Unified Correlation

If you're using the OpenTelemetry Collector, you can route both access logs and traces through the same pipeline:

```yaml
apiVersion: install.istio.io/v1alpha1
kind: IstioOperator
spec:
  meshConfig:
    extensionProviders:
      - name: otel
        envoyOtelAls:
          service: otel-collector.observability.svc.cluster.local
          port: 4317
```

The OpenTelemetry Collector can then process both signals and ensure they share the same trace context:

```yaml
# otel-collector-config.yaml
receivers:
  otlp:
    protocols:
      grpc:
        endpoint: 0.0.0.0:4317

processors:
  batch:
    timeout: 5s
    send_batch_size: 1000

exporters:
  loki:
    endpoint: http://loki:3100/loki/api/v1/push
  otlp/tempo:
    endpoint: tempo:4317
    tls:
      insecure: true

service:
  pipelines:
    logs:
      receivers: [otlp]
      processors: [batch]
      exporters: [loki]
    traces:
      receivers: [otlp]
      processors: [batch]
      exporters: [otlp/tempo]
```

## Querying Correlated Data

Once everything is wired up, you can query in both directions.

Find all logs for a specific trace:

```bash
# In Loki/LogQL
{container="istio-proxy"} | json | trace_id = "463ac35c9f6413ad48485a3953bb6124"
```

Find the trace for a failed request you spotted in logs:

```bash
# Get the trace ID from the log entry, then query your tracing backend
curl "http://jaeger:16686/api/traces/463ac35c9f6413ad48485a3953bb6124"
```

## Troubleshooting Missing Correlations

If your logs show empty trace IDs, check these common issues:

1. Your application is not propagating trace headers between incoming and outgoing requests
2. The tracing sampling rate is set to 0%, so no traces are being generated
3. The trace header format in your log config doesn't match what your tracing backend uses

Verify trace headers are present with a test request:

```bash
kubectl exec deploy/sleep -- curl -v http://httpbin:8000/headers 2>&1 | grep -i "x-b3\|traceparent"
```

## Summary

Correlating access logs with traces gives you the ability to move seamlessly between different observability signals. Include trace IDs in your access log format, configure your log aggregation tool to recognize and link those IDs, and make sure your application propagates trace headers correctly. The initial setup takes some effort, but it dramatically speeds up incident response when you can jump from a log entry to a full trace with a single click.
