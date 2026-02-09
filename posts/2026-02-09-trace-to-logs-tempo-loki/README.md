# How to Set Up Trace-to-Logs Linking Between Grafana Tempo and Loki for Kubernetes

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Kubernetes, Grafana, Tempo, Loki, Distributed Tracing, Logging

Description: Learn how to configure trace-to-logs linking between Grafana Tempo and Loki for seamless navigation from distributed traces to related log entries in Kubernetes environments.

---

Investigating issues requires correlating traces and logs. When you identify a problematic span in a trace, you need quick access to detailed logs from that specific request. Grafana Tempo and Loki provide built-in integration for trace-to-logs linking, enabling one-click navigation from trace spans to related log entries.

This integration works by matching trace IDs and span IDs embedded in both traces and logs. When properly configured, clicking a span in Tempo automatically queries Loki for logs from that specific request context, dramatically reducing investigation time.

## Deploying Tempo and Loki in Kubernetes

Start by deploying both Tempo and Loki in your Kubernetes cluster:

```yaml
# tempo-deployment.yaml
apiVersion: v1
kind: ConfigMap
metadata:
  name: tempo-config
  namespace: observability
data:
  tempo.yaml: |
    server:
      http_listen_port: 3100

    distributor:
      receivers:
        otlp:
          protocols:
            grpc:
              endpoint: 0.0.0.0:4317
            http:
              endpoint: 0.0.0.0:4318

    ingester:
      trace_idle_period: 10s
      max_block_bytes: 1048576
      max_block_duration: 5m

    compactor:
      compaction:
        block_retention: 48h

    storage:
      trace:
        backend: local
        local:
          path: /var/tempo/traces
        wal:
          path: /var/tempo/wal

    query_frontend:
      search:
        max_duration: 48h
---
apiVersion: apps/v1
kind: Deployment
metadata:
  name: tempo
  namespace: observability
spec:
  replicas: 1
  selector:
    matchLabels:
      app: tempo
  template:
    metadata:
      labels:
        app: tempo
    spec:
      containers:
      - name: tempo
        image: grafana/tempo:2.3.1
        args:
          - "-config.file=/etc/tempo/tempo.yaml"
        ports:
        - containerPort: 3100  # HTTP
        - containerPort: 4317  # OTLP gRPC
        - containerPort: 4318  # OTLP HTTP
        volumeMounts:
        - name: config
          mountPath: /etc/tempo
        - name: storage
          mountPath: /var/tempo
      volumes:
      - name: config
        configMap:
          name: tempo-config
      - name: storage
        emptyDir: {}
---
apiVersion: v1
kind: Service
metadata:
  name: tempo
  namespace: observability
spec:
  selector:
    app: tempo
  ports:
  - name: http
    port: 3100
  - name: otlp-grpc
    port: 4317
  - name: otlp-http
    port: 4318
```

Deploy Loki:

```yaml
# loki-deployment.yaml
apiVersion: v1
kind: ConfigMap
metadata:
  name: loki-config
  namespace: observability
data:
  loki.yaml: |
    auth_enabled: false

    server:
      http_listen_port: 3100

    ingester:
      lifecycler:
        ring:
          kvstore:
            store: inmemory
          replication_factor: 1
      chunk_idle_period: 5m
      chunk_retain_period: 30s

    schema_config:
      configs:
      - from: 2020-05-15
        store: boltdb-shipper
        object_store: filesystem
        schema: v11
        index:
          prefix: index_
          period: 24h

    storage_config:
      boltdb_shipper:
        active_index_directory: /loki/index
        cache_location: /loki/cache
        shared_store: filesystem
      filesystem:
        directory: /loki/chunks

    limits_config:
      enforce_metric_name: false
      reject_old_samples: true
      reject_old_samples_max_age: 168h

    chunk_store_config:
      max_look_back_period: 0s

    table_manager:
      retention_deletes_enabled: false
      retention_period: 0s
---
apiVersion: apps/v1
kind: Deployment
metadata:
  name: loki
  namespace: observability
spec:
  replicas: 1
  selector:
    matchLabels:
      app: loki
  template:
    metadata:
      labels:
        app: loki
    spec:
      containers:
      - name: loki
        image: grafana/loki:2.9.3
        args:
          - "-config.file=/etc/loki/loki.yaml"
        ports:
        - containerPort: 3100
        volumeMounts:
        - name: config
          mountPath: /etc/loki
        - name: storage
          mountPath: /loki
      volumes:
      - name: config
        configMap:
          name: loki-config
      - name: storage
        emptyDir: {}
---
apiVersion: v1
kind: Service
metadata:
  name: loki
  namespace: observability
spec:
  selector:
    app: loki
  ports:
  - name: http
    port: 3100
```

## Configuring Application Logging with Trace Context

Configure your application to include trace and span IDs in log output:

```go
// logger.go
package logging

import (
    "context"
    "log/slog"
    "os"

    "go.opentelemetry.io/otel/trace"
)

// NewLogger creates a structured logger that includes trace context
func NewLogger() *slog.Logger {
    handler := slog.NewJSONHandler(os.Stdout, &slog.HandlerOptions{
        Level: slog.LevelInfo,
    })

    wrappedHandler := &TraceContextHandler{handler: handler}
    return slog.New(wrappedHandler)
}

// TraceContextHandler adds trace context to log records
type TraceContextHandler struct {
    handler slog.Handler
}

func (h *TraceContextHandler) Enabled(ctx context.Context, level slog.Level) bool {
    return h.handler.Enabled(ctx, level)
}

func (h *TraceContextHandler) Handle(ctx context.Context, r slog.Record) error {
    // Extract trace context from span
    span := trace.SpanFromContext(ctx)
    if span.SpanContext().IsValid() {
        spanCtx := span.SpanContext()

        // Add trace ID and span ID to log record
        r.AddAttrs(
            slog.String("trace_id", spanCtx.TraceID().String()),
            slog.String("span_id", spanCtx.SpanID().String()),
            slog.Bool("trace_sampled", spanCtx.IsSampled()),
        )
    }

    return h.handler.Handle(ctx, r)
}

func (h *TraceContextHandler) WithAttrs(attrs []slog.Attr) slog.Handler {
    return &TraceContextHandler{
        handler: h.handler.WithAttrs(attrs),
    }
}

func (h *TraceContextHandler) WithGroup(name string) slog.Handler {
    return &TraceContextHandler{
        handler: h.handler.WithGroup(name),
    }
}

// Usage example
func ProcessPayment(ctx context.Context, amount float64) {
    logger := NewLogger()

    logger.InfoContext(ctx, "Processing payment",
        slog.Float64("amount", amount),
        slog.String("currency", "USD"),
    )

    // Payment processing logic...

    logger.InfoContext(ctx, "Payment processed successfully",
        slog.Float64("amount", amount),
    )
}
```

Example log output with trace context:

```json
{
  "time": "2026-02-09T10:15:30.123456Z",
  "level": "INFO",
  "msg": "Processing payment",
  "trace_id": "4bf92f3577b34da6a3ce929d0e0e4736",
  "span_id": "00f067aa0ba902b7",
  "trace_sampled": true,
  "amount": 99.99,
  "currency": "USD"
}
```

## Configuring Promtail to Ship Logs to Loki

Deploy Promtail as a DaemonSet to collect logs and ship them to Loki:

```yaml
# promtail-daemonset.yaml
apiVersion: v1
kind: ConfigMap
metadata:
  name: promtail-config
  namespace: observability
data:
  promtail.yaml: |
    server:
      http_listen_port: 9080
      grpc_listen_port: 0

    positions:
      filename: /tmp/positions.yaml

    clients:
      - url: http://loki.observability.svc.cluster.local:3100/loki/api/v1/push

    scrape_configs:
    - job_name: kubernetes-pods
      kubernetes_sd_configs:
      - role: pod
      pipeline_stages:
      - docker: {}
      - json:
          expressions:
            trace_id: trace_id
            span_id: span_id
            level: level
            message: msg
      - labels:
          trace_id:
          span_id:
          level:
      relabel_configs:
      - source_labels: [__meta_kubernetes_pod_node_name]
        target_label: node_name
      - source_labels: [__meta_kubernetes_namespace]
        target_label: namespace
      - source_labels: [__meta_kubernetes_pod_name]
        target_label: pod
      - source_labels: [__meta_kubernetes_pod_container_name]
        target_label: container
      - source_labels: [__meta_kubernetes_pod_label_app]
        target_label: app
---
apiVersion: apps/v1
kind: DaemonSet
metadata:
  name: promtail
  namespace: observability
spec:
  selector:
    matchLabels:
      app: promtail
  template:
    metadata:
      labels:
        app: promtail
    spec:
      serviceAccountName: promtail
      containers:
      - name: promtail
        image: grafana/promtail:2.9.3
        args:
          - "-config.file=/etc/promtail/promtail.yaml"
        volumeMounts:
        - name: config
          mountPath: /etc/promtail
        - name: varlog
          mountPath: /var/log
        - name: varlibdockercontainers
          mountPath: /var/lib/docker/containers
          readOnly: true
      volumes:
      - name: config
        configMap:
          name: promtail-config
      - name: varlog
        hostPath:
          path: /var/log
      - name: varlibdockercontainers
        hostPath:
          path: /var/lib/docker/containers
---
apiVersion: v1
kind: ServiceAccount
metadata:
  name: promtail
  namespace: observability
---
apiVersion: rbac.authorization.k8s.io/v1
kind: ClusterRole
metadata:
  name: promtail
rules:
- apiGroups: [""]
  resources:
  - nodes
  - pods
  - services
  - endpoints
  verbs: ["get", "list", "watch"]
---
apiVersion: rbac.authorization.k8s.io/v1
kind: ClusterRoleBinding
metadata:
  name: promtail
roleRef:
  apiGroup: rbac.authorization.k8s.io
  kind: ClusterRole
  name: promtail
subjects:
- kind: ServiceAccount
  name: promtail
  namespace: observability
```

## Configuring Grafana Data Sources

Configure Grafana with both Tempo and Loki data sources, with trace-to-logs linking:

```yaml
# grafana-datasources.yaml
apiVersion: v1
kind: ConfigMap
metadata:
  name: grafana-datasources
  namespace: observability
data:
  datasources.yaml: |
    apiVersion: 1
    datasources:
    - name: Tempo
      type: tempo
      access: proxy
      url: http://tempo.observability.svc.cluster.local:3100
      uid: tempo
      jsonData:
        httpMethod: GET
        tracesToLogs:
          # Enable trace-to-logs linking
          datasourceUid: 'loki'
          # Tags to use for log query
          tags: ['app', 'namespace', 'pod', 'container']
          # Map trace tags to Loki labels
          mappedTags:
            - key: app
              value: app
            - key: namespace
              value: namespace
            - key: pod
              value: pod
          # Filter logs by trace ID
          filterByTraceID: true
          # Filter logs by span ID
          filterBySpanID: true
          # Adjust timestamps for log context window
          spanStartTimeShift: '-1m'
          spanEndTimeShift: '1m'
        tracesToMetrics:
          datasourceUid: 'prometheus'
          tags:
            - key: service.name
              value: service_name
        serviceMap:
          datasourceUid: 'prometheus'
        search:
          hide: false
        nodeGraph:
          enabled: true
        lokiSearch:
          datasourceUid: 'loki'

    - name: Loki
      type: loki
      access: proxy
      url: http://loki.observability.svc.cluster.local:3100
      uid: loki
      jsonData:
        maxLines: 1000
        derivedFields:
          # Enable logs-to-traces linking
          - datasourceUid: tempo
            matcherRegex: "trace_id=(\\w+)"
            name: TraceID
            url: '$${__value.raw}'
            urlDisplayLabel: 'View Trace'
          - datasourceUid: tempo
            matcherRegex: '"trace_id":"(\\w+)"'
            name: TraceID
            url: '$${__value.raw}'
```

Deploy Grafana with the data sources:

```yaml
# grafana-deployment.yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: grafana
  namespace: observability
spec:
  replicas: 1
  selector:
    matchLabels:
      app: grafana
  template:
    metadata:
      labels:
        app: grafana
    spec:
      containers:
      - name: grafana
        image: grafana/grafana:10.2.3
        ports:
        - containerPort: 3000
        env:
        - name: GF_SECURITY_ADMIN_PASSWORD
          value: "admin"
        - name: GF_FEATURE_TOGGLES_ENABLE
          value: "traceToLogs,traceqlEditor"
        volumeMounts:
        - name: datasources
          mountPath: /etc/grafana/provisioning/datasources
      volumes:
      - name: datasources
        configMap:
          name: grafana-datasources
---
apiVersion: v1
kind: Service
metadata:
  name: grafana
  namespace: observability
spec:
  selector:
    app: grafana
  ports:
  - port: 3000
    targetPort: 3000
  type: LoadBalancer
```

## Using Trace-to-Logs in Grafana

Once configured, navigate from traces to logs:

1. Open Grafana and go to the Explore view
2. Select Tempo as the data source
3. Search for a trace using TraceQL or trace ID
4. Click on any span in the trace view
5. In the span details panel, click "Logs for this span"
6. Grafana automatically queries Loki for logs matching the trace ID and span ID

The generated Loki query will look like:

```logql
{namespace="production", app="payment-service"}
  | json
  | trace_id="4bf92f3577b34da6a3ce929d0e0e4736"
  | span_id="00f067aa0ba902b7"
```

## Creating Dashboards with Trace and Log Correlation

Build dashboards that show both traces and logs:

```json
{
  "dashboard": {
    "title": "Service Observability - Payment Service",
    "panels": [
      {
        "title": "Request Traces",
        "type": "traces",
        "datasource": "Tempo",
        "gridPos": {"h": 10, "w": 12, "x": 0, "y": 0},
        "targets": [
          {
            "query": "{resource.service.name=\"payment-service\"}",
            "queryType": "traceql"
          }
        ]
      },
      {
        "title": "Application Logs",
        "type": "logs",
        "datasource": "Loki",
        "gridPos": {"h": 10, "w": 12, "x": 12, "y": 0},
        "targets": [
          {
            "expr": "{namespace=\"production\", app=\"payment-service\"}"
          }
        ],
        "options": {
          "showTime": true,
          "showLabels": false,
          "showCommonLabels": false,
          "wrapLogMessage": true,
          "prettifyLogMessage": true,
          "enableLogDetails": true,
          "dedupStrategy": "none",
          "sortOrder": "Descending"
        }
      },
      {
        "title": "Error Traces with Logs",
        "type": "traces",
        "datasource": "Tempo",
        "gridPos": {"h": 10, "w": 24, "x": 0, "y": 10},
        "targets": [
          {
            "query": "{resource.service.name=\"payment-service\" && status=error}",
            "queryType": "traceql"
          }
        ]
      }
    ]
  }
}
```

## Validating Trace-to-Logs Integration

Test the integration with a simple script:

```python
# test_trace_logs_integration.py
import requests
import time
import json

def test_trace_logs_correlation():
    """Test that traces and logs are properly correlated"""

    # Make request to instrumented service
    response = requests.post(
        'http://payment-service.production.svc.cluster.local/charge',
        json={'amount': 100.00, 'customer_id': 'test-123'}
    )

    trace_id = response.headers.get('X-Trace-Id')
    print(f"Trace ID: {trace_id}")

    # Wait for data to be ingested
    time.sleep(5)

    # Query Tempo for trace
    tempo_response = requests.get(
        f'http://tempo.observability.svc.cluster.local:3100/api/traces/{trace_id}'
    )

    assert tempo_response.status_code == 200, f"Trace not found: {trace_id}"

    # Query Loki for logs with same trace ID
    loki_query = f'{{namespace="production", app="payment-service"}} | json | trace_id="{trace_id}"'
    loki_response = requests.get(
        'http://loki.observability.svc.cluster.local:3100/loki/api/v1/query_range',
        params={
            'query': loki_query,
            'limit': 100,
        }
    )

    assert loki_response.status_code == 200
    logs = loki_response.json()['data']['result']

    assert len(logs) > 0, f"No logs found for trace {trace_id}"

    print(f"Found {len(logs)} log streams for trace {trace_id}")

    # Verify trace ID in logs
    for stream in logs:
        for values in stream['values']:
            log_line = json.loads(values[1])
            assert log_line.get('trace_id') == trace_id
            print(f"  Log: {log_line['msg']}")

    print("Trace-to-logs correlation validated successfully!")

if __name__ == '__main__':
    test_trace_logs_correlation()
```

Trace-to-logs linking creates a seamless investigation workflow. By clicking from trace spans directly to related logs, you eliminate manual correlation steps and dramatically reduce the time needed to diagnose issues in Kubernetes environments.
