# How to Track and Report on Data Access Patterns in Telemetry Backends for Audit Purposes

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: OpenTelemetry, Audit, Data Access, Observability

Description: Track who accesses your telemetry data and generate audit reports to satisfy compliance requirements using proxy logging.

When auditors ask "who accessed what telemetry data and when?", most teams scramble. Telemetry backends like Prometheus, Loki, and Tempo rarely have built-in access auditing that meets compliance standards. This post shows how to track and report on data access patterns across your telemetry backends using a reverse proxy layer and OpenTelemetry instrumentation.

## The Problem

Your telemetry backends store sensitive operational data - traces with user IDs, logs with request payloads, metrics that reveal business patterns. Compliance frameworks like SOC 2 and GDPR require you to know who accesses this data. But most teams deploy Grafana in front of Prometheus and Loki without any access logging beyond basic authentication.

## Architecture Overview

The approach is straightforward: place an instrumented reverse proxy in front of each telemetry backend that logs every query with user identity, query content, and response metadata. These access logs flow through OpenTelemetry into a dedicated audit store.

## Building the Access Audit Proxy

Here is a lightweight Go reverse proxy that intercepts requests to telemetry backends and emits access logs via OpenTelemetry.

```go
// audit_proxy.go
// Reverse proxy that logs all queries to telemetry backends as OTel log records
package main

import (
    "context"
    "fmt"
    "net/http"
    "net/http/httputil"
    "net/url"
    "time"

    "go.opentelemetry.io/otel"
    "go.opentelemetry.io/otel/exporters/otlp/otlplog/otlploggrpc"
    sdklog "go.opentelemetry.io/otel/sdk/log"
    "go.opentelemetry.io/otel/log"
)

var auditLogger log.Logger

func initLogger() {
    exporter, _ := otlploggrpc.New(context.Background(),
        otlploggrpc.WithEndpoint("otel-collector:4317"),
        otlploggrpc.WithInsecure(),
    )
    provider := sdklog.NewLoggerProvider(
        sdklog.WithProcessor(sdklog.NewBatchProcessor(exporter)),
    )
    auditLogger = provider.Logger("telemetry.access.audit")
}

func auditHandler(target *url.URL) http.HandlerFunc {
    proxy := httputil.NewSingleHostReverseProxy(target)

    return func(w http.ResponseWriter, r *http.Request) {
        start := time.Now()

        // Extract user identity from headers set by your auth layer
        user := r.Header.Get("X-Forwarded-User")
        if user == "" {
            user = "anonymous"
        }

        // Wrap response writer to capture status code
        recorder := &statusRecorder{ResponseWriter: w, statusCode: 200}
        proxy.ServeHTTP(recorder, r)

        duration := time.Since(start)

        // Emit the access audit log record
        var record log.Record
        record.SetBody(log.StringValue(fmt.Sprintf(
            "user=%s method=%s path=%s query=%s status=%d duration=%s",
            user, r.Method, r.URL.Path, r.URL.RawQuery,
            recorder.statusCode, duration,
        )))
        record.AddAttributes(
            log.String("audit.user", user),
            log.String("audit.method", r.Method),
            log.String("audit.path", r.URL.Path),
            log.String("audit.query_params", r.URL.RawQuery),
            log.Int("audit.response_status", recorder.statusCode),
            log.String("audit.backend", target.Host),
            log.String("audit.duration", duration.String()),
        )
        auditLogger.Emit(r.Context(), record)
    }
}

type statusRecorder struct {
    http.ResponseWriter
    statusCode int
}

func (r *statusRecorder) WriteHeader(code int) {
    r.statusCode = code
    r.ResponseWriter.WriteHeader(code)
}
```

## Collector Configuration for Access Logs

The Collector receives access audit logs and routes them to a dedicated index, separate from your regular telemetry data.

```yaml
# otel-collector-access-audit.yaml
receivers:
  otlp:
    protocols:
      grpc:
        endpoint: 0.0.0.0:4317

processors:
  # Enrich with environment metadata
  resource:
    attributes:
      - key: environment
        value: "production"
        action: upsert
      - key: audit.type
        value: "data_access"
        action: insert

  # Batch for efficient writes
  batch:
    send_batch_size: 200
    timeout: 10s

exporters:
  # Send to a dedicated audit index in Elasticsearch
  elasticsearch:
    endpoints: ["https://es-audit.internal:9200"]
    logs_index: "telemetry-access-audit"
    tls:
      cert_file: /certs/client.crt
      key_file: /certs/client.key

  # Also send to S3 for long-term retention
  awss3:
    s3uploader:
      region: us-east-1
      s3_bucket: telemetry-access-audit
      s3_prefix: "access-logs"
      s3_partition: "hour"

service:
  pipelines:
    logs:
      receivers: [otlp]
      processors: [resource, batch]
      exporters: [elasticsearch, awss3]
```

## Deploying the Proxy in Kubernetes

Deploy the audit proxy as a sidecar or standalone service in front of each telemetry backend.

```yaml
# k8s-audit-proxy.yaml
# Deploys the audit proxy in front of Prometheus
apiVersion: apps/v1
kind: Deployment
metadata:
  name: prometheus-audit-proxy
  namespace: monitoring
spec:
  replicas: 2
  selector:
    matchLabels:
      app: prometheus-audit-proxy
  template:
    metadata:
      labels:
        app: prometheus-audit-proxy
    spec:
      containers:
        - name: audit-proxy
          image: your-registry/telemetry-audit-proxy:latest
          ports:
            - containerPort: 8080
          env:
            # The backend Prometheus instance to proxy to
            - name: BACKEND_URL
              value: "http://prometheus.monitoring.svc:9090"
            # Where to send OTel audit logs
            - name: OTEL_EXPORTER_OTLP_ENDPOINT
              value: "otel-collector.monitoring.svc:4317"
---
apiVersion: v1
kind: Service
metadata:
  name: prometheus-audited
  namespace: monitoring
spec:
  selector:
    app: prometheus-audit-proxy
  ports:
    - port: 9090
      targetPort: 8080
```

## Generating Access Reports

With access logs flowing into Elasticsearch, you can build reports for auditors. Here is a Python script that generates a weekly access summary.

```python
# generate_access_report.py
# Produces a weekly summary of who accessed which telemetry backends
from elasticsearch import Elasticsearch
from datetime import datetime, timedelta
from collections import defaultdict

es = Elasticsearch(["https://es-audit.internal:9200"])

def generate_weekly_report():
    """Query access audit logs and produce a summary report."""
    now = datetime.utcnow()
    week_ago = now - timedelta(days=7)

    query = {
        "query": {
            "bool": {
                "filter": [
                    {"range": {"@timestamp": {"gte": week_ago.isoformat(), "lte": now.isoformat()}}},
                    {"term": {"attributes.audit.type": "data_access"}},
                ]
            }
        },
        "size": 10000,
    }

    results = es.search(index="telemetry-access-audit", body=query)
    access_summary = defaultdict(lambda: defaultdict(int))

    for hit in results["hits"]["hits"]:
        attrs = hit["_source"].get("attributes", {})
        user = attrs.get("audit.user", "unknown")
        backend = attrs.get("audit.backend", "unknown")
        access_summary[user][backend] += 1

    # Format the report
    print(f"=== Telemetry Access Report: {week_ago.date()} to {now.date()} ===\n")
    for user, backends in sorted(access_summary.items()):
        print(f"User: {user}")
        for backend, count in sorted(backends.items()):
            print(f"  Backend: {backend} - {count} queries")
        print()

generate_weekly_report()
```

## Key Takeaways

Tracking data access patterns in telemetry backends is not optional in regulated environments. By placing an instrumented proxy in front of your backends and routing access logs through OpenTelemetry, you get a unified audit trail that covers Prometheus queries, Loki log searches, and Tempo trace lookups. The data lands in both a searchable index for ad-hoc investigation and durable storage for long-term retention. Auditors get clear evidence of who accessed what, and your team gets visibility into how telemetry data is actually being used.
