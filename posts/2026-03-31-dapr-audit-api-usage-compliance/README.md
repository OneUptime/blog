# How to Audit Dapr API Usage for Compliance

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Dapr, Compliance, Audit, Observability, Security

Description: Learn how to capture, store, and analyze Dapr API usage logs for compliance audits using middleware, OpenTelemetry, and centralized log aggregation.

---

## Why Audit Dapr API Calls

Compliance frameworks like SOC 2, HIPAA, and PCI-DSS require organizations to demonstrate that access to sensitive data and services is logged and auditable. In a Dapr-based microservices architecture, every state store read/write, pub/sub publish, and service invocation is a potential audit event.

## Enabling Dapr HTTP Access Logs

Enable access logging in the Dapr sidecar configuration:

```yaml
apiVersion: dapr.io/v1alpha1
kind: Configuration
metadata:
  name: audit-config
  namespace: production
spec:
  logging:
    apiLogging:
      enabled: true
      obfuscateURLs: false
      omitHealthChecks: true
  tracing:
    samplingRate: "1"
    otel:
      endpointAddress: "otel-collector:4317"
      isSecure: false
      protocol: grpc
```

Apply this configuration to services:

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: payment-service
spec:
  template:
    metadata:
      annotations:
        dapr.io/enabled: "true"
        dapr.io/app-id: "payment-service"
        dapr.io/config: "audit-config"
```

## Building a Custom Audit Middleware

Create a Dapr HTTP middleware component that records all API operations:

```go
package main

import (
    "encoding/json"
    "net/http"
    "time"
)

type AuditEvent struct {
    Timestamp   time.Time `json:"timestamp"`
    AppID       string    `json:"app_id"`
    Operation   string    `json:"operation"`
    Resource    string    `json:"resource"`
    StatusCode  int       `json:"status_code"`
    DurationMs  int64     `json:"duration_ms"`
}

func auditMiddleware(next http.Handler) http.Handler {
    return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
        start := time.Now()
        wrapped := &responseWriter{ResponseWriter: w}
        next.ServeHTTP(wrapped, r)

        event := AuditEvent{
            Timestamp:  start,
            AppID:      r.Header.Get("dapr-app-id"),
            Operation:  r.Method,
            Resource:   r.URL.Path,
            StatusCode: wrapped.statusCode,
            DurationMs: time.Since(start).Milliseconds(),
        }
        data, _ := json.Marshal(event)
        // Write to audit log sink (e.g., Kafka, file, SIEM)
        auditLogger.Write(data)
    })
}
```

Register the middleware component:

```yaml
apiVersion: dapr.io/v1alpha1
kind: Component
metadata:
  name: audit-middleware
  namespace: production
spec:
  type: middleware.http.wasm
  version: v1
  metadata:
    - name: url
      value: "file:///opt/dapr/middleware/audit.wasm"
```

## Shipping Audit Logs with Fluentd

Configure Fluentd to collect Dapr sidecar logs and forward to your SIEM:

```yaml
apiVersion: v1
kind: ConfigMap
metadata:
  name: fluentd-dapr-audit
data:
  fluent.conf: |
    <source>
      @type tail
      path /var/log/containers/*_production_daprd-*.log
      tag dapr.audit
      <parse>
        @type json
      </parse>
    </source>
    <filter dapr.audit>
      @type grep
      <regexp>
        key msg
        pattern /invoke|state|publish/
      </regexp>
    </filter>
    <match dapr.audit>
      @type elasticsearch
      host elasticsearch.logging
      port 9200
      index_name dapr-audit
    </match>
```

## Querying Audit Trails

Query audit events in Elasticsearch or your log system:

```bash
# Using Elasticsearch query DSL
curl -X GET "http://elasticsearch:9200/dapr-audit/_search" \
  -H "Content-Type: application/json" \
  -d '{
    "query": {
      "bool": {
        "must": [
          {"term": {"app_id": "payment-service"}},
          {"range": {"timestamp": {"gte": "now-24h"}}}
        ]
      }
    },
    "sort": [{"timestamp": "desc"}]
  }'
```

## Summary

Auditing Dapr API usage for compliance requires enabling sidecar API logging, adding custom middleware to capture operation metadata, and shipping logs to a centralized SIEM or log aggregation system. Configure sampling at 100% for sensitive services and use structured log formats (JSON) to enable efficient querying. Retain audit logs according to your compliance framework's requirements, typically 1 to 7 years depending on the standard.
