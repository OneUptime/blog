# How to Audit Secret Access Patterns with Dapr

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Dapr, Security, Auditing, Secret Store, Observability, OpenTelemetry

Description: Learn how to audit and monitor secret access patterns in Dapr applications using middleware, tracing, and log analysis for security compliance.

---

Auditing secret access is a critical security requirement in enterprise environments. When microservices use Dapr to retrieve secrets, every access creates an opportunity to log who accessed what and when. Dapr exposes secret access through its HTTP and gRPC APIs, and by combining Dapr middleware, distributed tracing, and structured logging, you can build a comprehensive audit trail for all secret operations.

## Understanding Dapr's Secret Access Surface

Every secret retrieval goes through Dapr's sidecar via the secrets API:

```text
Application -> Dapr Sidecar HTTP/gRPC -> Secret Store Provider
```

This makes the sidecar an ideal interception point for auditing. Dapr logs all API calls with structured fields, and distributed tracing captures the full call chain.

## Enabling Structured Logging in Dapr

Configure Dapr sidecar to emit JSON-formatted logs for machine-readable parsing.

```bash
dapr run \
  --app-id order-service \
  --app-port 5000 \
  --log-level info \
  --log-as-json \
  -- python app.py
```

The Dapr sidecar will now output JSON logs like:

```json
{
  "level": "info",
  "time": "2026-03-31T10:00:00.000Z",
  "scope": "dapr.runtime",
  "msg": "secret request",
  "app_id": "order-service",
  "store": "aws-secrets",
  "secret_name": "prod/database/credentials",
  "namespace": "production"
}
```

For Kubernetes deployments, configure logging at the pod level:

```yaml
# kubernetes/dapr-config.yaml
apiVersion: dapr.io/v1alpha1
kind: Configuration
metadata:
  name: audit-config
  namespace: production
spec:
  logging:
    apiLogging:
      enabled: true
      obfuscateURLs: true
  tracing:
    samplingRate: "1"
    zipkin:
      endpointAddress: "http://zipkin:9411/api/v2/spans"
```

## Building a Secret Access Audit Middleware

Create a Dapr HTTP middleware component that intercepts and logs all secret API calls.

```yaml
# dapr/components/audit-middleware.yaml
apiVersion: dapr.io/v1alpha1
kind: Component
metadata:
  name: secret-audit-middleware
spec:
  type: middleware.http.routerchecker
  version: v1
  metadata:
  - name: allowedRoutes
    value: ".*"
```

For a custom audit interceptor, build a proxy service that logs all secret API requests:

```python
# audit_middleware.py
import json
import logging
import time
from datetime import datetime
from flask import Flask, request

app = Flask(__name__)
logger = logging.getLogger(__name__)
logging.basicConfig(
    level=logging.INFO,
    format='%(message)s'
)


def emit_audit_log(event: dict):
    """Emit a structured audit log entry."""
    audit_entry = {
        "audit": True,
        "timestamp": datetime.utcnow().isoformat() + "Z",
        "event": event.get("type"),
        "appId": event.get("appId"),
        "secretStore": event.get("secretStore"),
        "secretName": event.get("secretName"),
        "success": event.get("success", True),
        "latencyMs": event.get("latencyMs"),
        "sourceIp": event.get("sourceIp")
    }
    # Write to a dedicated audit log
    logger.info(json.dumps(audit_entry))


@app.before_request
def before_request():
    """Capture request start time."""
    request.start_time = time.time()


@app.after_request
def after_request(response):
    """Log secret API access after each request."""
    path = request.path

    # Only audit secret access endpoints
    if "/v1.0/secrets/" in path:
        parts = path.split("/")
        # Extract store name and secret name from path
        if len(parts) >= 4:
            store_name = parts[3]
            secret_name = "/".join(parts[4:]) if len(parts) > 4 else "unknown"

            latency_ms = round((time.time() - request.start_time) * 1000, 2)

            emit_audit_log({
                "type": "SECRET_ACCESS",
                "appId": request.headers.get("X-Dapr-App-Id", "unknown"),
                "secretStore": store_name,
                "secretName": secret_name,
                "success": response.status_code < 400,
                "latencyMs": latency_ms,
                "sourceIp": request.remote_addr
            })

    return response


if __name__ == "__main__":
    app.run(port=6000)
```

## Using OpenTelemetry to Trace Secret Access

Configure Dapr to emit OpenTelemetry spans for all secret operations, enabling distributed tracing across services.

```yaml
# dapr/components/otel-config.yaml
apiVersion: dapr.io/v1alpha1
kind: Configuration
metadata:
  name: otel-config
spec:
  tracing:
    samplingRate: "1"
    otel:
      endpointAddress: "otel-collector:4317"
      isSecure: false
      protocol: "grpc"
```

Instrument your application to add custom audit attributes to spans:

```python
from opentelemetry import trace
from opentelemetry.sdk.trace import TracerProvider
from opentelemetry.sdk.trace.export import BatchSpanProcessor
from opentelemetry.exporter.otlp.proto.grpc.trace_exporter import OTLPSpanExporter
import requests

# Configure the tracer
provider = TracerProvider()
exporter = OTLPSpanExporter(endpoint="http://otel-collector:4317", insecure=True)
provider.add_span_processor(BatchSpanProcessor(exporter))
trace.set_tracer_provider(provider)
tracer = trace.get_tracer("order-service.secret-client")

DAPR_HTTP_PORT = 3500

def get_secret_with_tracing(store: str, name: str, key: str = None) -> str:
    """Fetch a Dapr secret with full OpenTelemetry tracing."""
    with tracer.start_as_current_span("dapr.secret.get") as span:
        span.set_attribute("dapr.secret.store", store)
        span.set_attribute("dapr.secret.name", name)
        span.set_attribute("service.name", "order-service")

        try:
            url = f"http://localhost:{DAPR_HTTP_PORT}/v1.0/secrets/{store}/{name}"
            response = requests.get(url)
            response.raise_for_status()

            span.set_attribute("dapr.secret.success", True)
            span.set_attribute("dapr.secret.http_status", response.status_code)

            data = response.json()
            return data.get(key, data) if key else data

        except requests.exceptions.HTTPError as e:
            span.set_attribute("dapr.secret.success", False)
            span.set_attribute("dapr.secret.error", str(e))
            span.record_exception(e)
            raise
```

## Shipping Audit Logs to SIEM

Forward Dapr audit logs to a SIEM (Security Information and Event Management) system for analysis and alerting.

```yaml
# kubernetes/fluentd-configmap.yaml
apiVersion: v1
kind: ConfigMap
metadata:
  name: fluentd-config
data:
  fluent.conf: |
    <source>
      @type tail
      path /var/log/containers/*dapr*.log
      pos_file /var/log/fluentd-dapr.log.pos
      tag dapr.audit
      <parse>
        @type json
        time_key ts
        time_format %Y-%m-%dT%H:%M:%S.%LZ
      </parse>
    </source>

    <filter dapr.audit>
      @type grep
      <regexp>
        key msg
        pattern /secret request|secret access/
      </regexp>
    </filter>

    <match dapr.audit>
      @type elasticsearch
      host elasticsearch
      port 9200
      index_name dapr-secret-audit
      <buffer>
        flush_interval 5s
        chunk_limit_size 2m
      </buffer>
    </match>
```

## Querying and Alerting on Secret Access Patterns

Write queries to detect unusual secret access in your SIEM or log analytics system.

```python
# audit_analyzer.py
import json
from collections import defaultdict
from datetime import datetime
from typing import List, Dict

def analyze_secret_access(logs: List[dict]) -> Dict:
    """
    Analyze secret access logs for anomalies.
    Returns a report with access frequency, unusual patterns, and recommendations.
    """
    stats = {
        "total_accesses": len(logs),
        "by_app": defaultdict(int),
        "by_store": defaultdict(int),
        "by_secret": defaultdict(int),
        "failures": [],
        "high_frequency_apps": [],
        "anomalies": []
    }

    for log in logs:
        app_id = log.get("appId", "unknown")
        store = log.get("secretStore", "unknown")
        secret = log.get("secretName", "unknown")
        timestamp = datetime.fromisoformat(log.get("timestamp", "").replace("Z", ""))

        stats["by_app"][app_id] += 1
        stats["by_store"][store] += 1
        stats["by_secret"][secret] += 1

        # Track failures
        if not log.get("success", True):
            stats["failures"].append({
                "app": app_id,
                "secret": secret,
                "timestamp": log.get("timestamp")
            })

    # Detect high frequency access (more than 100 requests per hour per app)
    threshold = 100
    for app, count in stats["by_app"].items():
        if count > threshold:
            stats["high_frequency_apps"].append({
                "app": app,
                "count": count,
                "threshold": threshold
            })
            stats["anomalies"].append(
                f"App '{app}' accessed secrets {count} times - exceeds threshold of {threshold}"
            )

    return dict(stats)

# Example usage with sample logs
sample_logs = [
    {"appId": "order-service", "secretStore": "aws-secrets", "secretName": "prod/db/pass",
     "success": True, "timestamp": "2026-03-31T10:00:00Z"},
    {"appId": "order-service", "secretStore": "aws-secrets", "secretName": "prod/db/pass",
     "success": False, "timestamp": "2026-03-31T10:01:00Z"},
]

report = analyze_secret_access(sample_logs)
print(json.dumps(report, indent=2, default=str))
```

## Summary

Auditing secret access patterns in Dapr applications requires a layered approach: enabling structured JSON logging from the Dapr sidecar, adding OpenTelemetry spans with custom secret-access attributes, intercepting API calls with middleware, and shipping logs to a SIEM for analysis and alerting. You learned how to emit structured audit logs, trace secret access with OpenTelemetry, forward logs using Fluentd, and analyze access patterns programmatically to detect anomalies. This comprehensive audit pipeline satisfies compliance requirements and provides the visibility needed to detect and respond to unauthorized secret access in production.
