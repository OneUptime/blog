# How to Correlate Metrics, Traces, and Logs in Istio

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Istio, Observability, Correlation, Tracing, Logging, Metrics

Description: How to correlate metrics, distributed traces, and logs across your Istio service mesh using trace IDs, span IDs, and shared labels for faster incident investigation.

---

When something goes wrong in a microservices system, you usually start with a metric alert, then dig into traces to find the failing service, and finally look at logs for the specific error. The problem is connecting these three signals together. Istio helps by injecting correlation identifiers into all three telemetry types, but you need to set things up correctly to make the correlation work.

## The Three Pillars and How They Connect

Metrics tell you something is wrong (error rate spiked). Traces tell you where the problem is (which service in the call chain). Logs tell you why (the actual error message). The thread that ties them together is the trace ID.

When Istio processes a request, it generates or propagates a trace ID. That same trace ID can appear in:
- Trace spans (obviously)
- Access logs (as the `x-request-id` or trace ID header)
- Metric labels (through custom configuration)

## Configuring Access Logs with Trace IDs

The default Istio access log format does not include trace IDs. You need to customize it:

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
        "duration": "%DURATION%",
        "upstream_service_time": "%RESP(X-ENVOY-UPSTREAM-SERVICE-TIME)%",
        "x_forwarded_for": "%REQ(X-FORWARDED-FOR)%",
        "user_agent": "%REQ(USER-AGENT)%",
        "request_id": "%REQ(X-REQUEST-ID)%",
        "trace_id": "%REQ(X-B3-TRACEID)%",
        "span_id": "%REQ(X-B3-SPANID)%",
        "authority": "%REQ(:AUTHORITY)%",
        "upstream_host": "%UPSTREAM_HOST%",
        "upstream_cluster": "%UPSTREAM_CLUSTER%",
        "source_namespace": "%ENVIRONMENT(POD_NAMESPACE)%",
        "source_app": "%ENVIRONMENT(APP)%",
        "destination_service": "%REQ(:AUTHORITY)%"
      }
```

The key fields are `request_id`, `trace_id`, and `span_id`. These let you jump from a log entry directly to the corresponding trace.

## Using OpenTelemetry Trace Context

If you are using OpenTelemetry (W3C trace context) instead of Zipkin (B3), the header names are different:

```yaml
accessLogFormat: |
  {
    "timestamp": "%START_TIME%",
    "trace_id": "%REQ(TRACEPARENT)%",
    "method": "%REQ(:METHOD)%",
    "path": "%REQ(X-ENVOY-ORIGINAL-PATH?:PATH)%",
    "response_code": "%RESPONSE_CODE%",
    "duration": "%DURATION%"
  }
```

Configure Istio to use W3C trace context:

```yaml
apiVersion: install.istio.io/v1alpha1
kind: IstioOperator
spec:
  meshConfig:
    defaultConfig:
      tracing:
        openCensusAgent:
          context:
          - W3C_TRACE_CONTEXT
```

## Linking Metrics to Traces

Metrics are aggregated, so you cannot link a single metric data point to a trace. But you can use shared labels to narrow down which traces correspond to a metric anomaly.

Istio metrics include labels like `destination_service_name`, `source_workload`, and `response_code`. Your traces have the same information as span attributes. So when your metric alert says "error rate on payment-service is 5%", you can query your trace backend for:

```
service.name = "payment-service" AND http.status_code >= 500 AND timestamp > <alert-time>
```

To make this work smoothly, ensure your metric labels and trace attributes use the same values:

```yaml
apiVersion: telemetry.istio.io/v1
kind: Telemetry
metadata:
  name: correlation-config
  namespace: istio-system
spec:
  tracing:
  - providers:
    - name: otel-tracing
    randomSamplingPercentage: 100
  accessLogging:
  - providers:
    - name: envoy
```

## Exemplars: Linking Metrics Directly to Traces

Prometheus supports exemplars, which attach a trace ID to individual metric samples. This creates a direct link from a metric to a specific trace.

Configure the OpenTelemetry Collector to export exemplars:

```yaml
exporters:
  prometheus:
    endpoint: 0.0.0.0:8889
    enable_open_metrics: true
```

In Grafana, when you hover over a metric data point, you can see the exemplar trace ID and click through to your trace backend.

## Application-Level Log Correlation

The sidecar access logs are great, but your application logs also need trace IDs. Your application needs to extract the trace context headers from incoming requests and include them in log output.

For a Node.js application:

```javascript
const express = require('express');
const app = express();

app.use((req, res, next) => {
  const traceId = req.headers['x-b3-traceid'] || req.headers['traceparent'];
  req.traceId = traceId;
  next();
});

app.get('/api/users', (req, res) => {
  console.log(JSON.stringify({
    level: 'info',
    message: 'Fetching users',
    trace_id: req.traceId,
    timestamp: new Date().toISOString()
  }));
  // ... handler logic
});
```

For a Python Flask application:

```python
import logging
import json
from flask import Flask, request

app = Flask(__name__)

class TraceFormatter(logging.Formatter):
    def format(self, record):
        trace_id = getattr(record, 'trace_id', 'unknown')
        log_entry = {
            'timestamp': self.formatTime(record),
            'level': record.levelname,
            'message': record.getMessage(),
            'trace_id': trace_id
        }
        return json.dumps(log_entry)

handler = logging.StreamHandler()
handler.setFormatter(TraceFormatter())
logging.root.addHandler(handler)
logging.root.setLevel(logging.INFO)

@app.route('/api/users')
def get_users():
    trace_id = request.headers.get('x-b3-traceid', 'unknown')
    logging.info('Fetching users', extra={'trace_id': trace_id})
    # ... handler logic
```

## Building the Correlation Pipeline

Use the OpenTelemetry Collector to ensure all three signals have matching identifiers:

```yaml
processors:
  resource:
    attributes:
    - key: service.name
      from_attribute: k8s.pod.labels.app
      action: insert
    - key: service.namespace
      from_attribute: k8s.namespace.name
      action: insert

  k8sattributes:
    extract:
      metadata:
      - k8s.pod.name
      - k8s.namespace.name
      - k8s.deployment.name
      labels:
      - tag_name: app
        key: app
        from: pod

service:
  pipelines:
    traces:
      receivers: [otlp]
      processors: [k8sattributes, resource, batch]
      exporters: [otlp/tempo]
    logs:
      receivers: [otlp]
      processors: [k8sattributes, resource, batch]
      exporters: [loki]
    metrics:
      receivers: [otlp]
      processors: [k8sattributes, resource, batch]
      exporters: [prometheus]
```

The `k8sattributes` processor enriches all three signal types with the same Kubernetes metadata, making correlation by service name and namespace straightforward.

## Grafana: The Correlation UI

Grafana has built-in support for correlating metrics, traces, and logs:

1. Configure data sources for Prometheus (metrics), Tempo or Jaeger (traces), and Loki (logs)
2. In Prometheus, enable exemplars to link to Tempo
3. In Loki, configure derived fields to extract trace IDs and link to Tempo

Loki derived fields configuration:

```yaml
# In Grafana Loki data source configuration
derivedFields:
- datasourceUid: tempo-uid
  matcherRegex: '"trace_id":"([a-f0-9]+)"'
  name: TraceID
  url: "$${__value.raw}"
```

This lets you click a trace ID in a log line and jump directly to the trace in Tempo.

## Practical Incident Investigation Flow

Here is how correlation works in practice during an incident:

```
1. Prometheus alert fires: error rate > 5% on payment-service
   Query: sum(rate(istio_requests_total{response_code=~"5..", destination_service_name="payment-service"}[5m]))

2. Look at exemplars on the metric graph -> click trace ID
   Jump to Tempo/Jaeger with the specific trace

3. Trace shows payment-service -> database-service call failing
   Note the span ID for the failing span

4. Query Loki for logs around the failure
   Query: {app="database-service"} |= "trace_id" | json | trace_id = "abc123"

5. Log shows: "connection pool exhausted, max connections reached"
   Root cause identified
```

The key to making correlation work is consistency. Use the same service names, the same trace propagation format, and structured logging with trace IDs everywhere. Once you have that, jumping between metrics, traces, and logs during an incident becomes fast and natural.
