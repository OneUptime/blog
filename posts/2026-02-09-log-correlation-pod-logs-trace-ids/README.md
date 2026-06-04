# Build a Log Correlation Pipeline That Links Kubernetes Pod Logs to Trace IDs

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Kubernetes, Logging, Tracing

Description: Create a log correlation pipeline that automatically links Kubernetes pod logs to distributed trace IDs for seamless navigation between logs and traces during troubleshooting.

---

Logs and traces provide complementary views of application behavior. Logs offer detailed context while traces show request flow across services. Correlating them through trace IDs enables jumping from a trace span to related logs and vice versa, dramatically speeding up troubleshooting. This guide demonstrates building a correlation pipeline for Kubernetes.

## Understanding Log-Trace Correlation

Correlation works by:
1. Applications emit trace IDs in structured logs
2. Log collectors extract trace IDs as labels/fields
3. Observability platforms link logs and traces via trace ID

Benefits include:
- Quick navigation from trace spans to detailed logs
- Finding all logs for a distributed transaction
- Correlating errors across multiple services
- Understanding request context from logs

## Instrumenting Applications to Emit Trace IDs

Configure applications to include trace IDs in logs:

**Go with OpenTelemetry**:
```go
package main

import (
    "context"
    "go.opentelemetry.io/otel/trace"
    "go.uber.org/zap"
)

func processRequest(ctx context.Context, logger *zap.Logger) {
    span := trace.SpanFromContext(ctx)
    traceID := span.SpanContext().TraceID().String()
    spanID := span.SpanContext().SpanID().String()

    // Log with trace context
    logger.Info("Processing request",
        zap.String("trace_id", traceID),
        zap.String("span_id", spanID),
        zap.String("operation", "process_order"),
    )

    // Business logic here
}
```

**Java with Log4j2**:
```java
import io.opentelemetry.api.trace.Span;
import org.apache.logging.log4j.CloseableThreadContext;
import org.apache.logging.log4j.LogManager;
import org.apache.logging.log4j.Logger;

public class OrderService {
    private static final Logger logger = LogManager.getLogger(OrderService.class);

    public void processOrder(String orderId) {
        Span span = Span.current();
        String traceId = span.getSpanContext().getTraceId();
        String spanId = span.getSpanContext().getSpanId();

        // Add to MDC for automatic inclusion in logs
        try (CloseableThreadContext.Instance ignored = CloseableThreadContext
                .put("trace_id", traceId)
                .put("span_id", spanId)) {
            logger.info("Processing order: {}", orderId);

            // Business logic
        }
    }
}
```

**Python with structlog**:
```python
import structlog
from opentelemetry import trace

logger = structlog.get_logger()

def process_order(order_id):
    span = trace.get_current_span()
    trace_id = format(span.get_span_context().trace_id, '032x')
    span_id = format(span.get_span_context().span_id, '016x')

    logger.info(
        "processing_order",
        order_id=order_id,
        trace_id=trace_id,
        span_id=span_id
    )
```

## Extracting Trace IDs with Fluent Bit

Configure Fluent Bit to extract trace IDs and attach them as structured metadata:

```yaml
apiVersion: v1
kind: ConfigMap
metadata:
  name: fluent-bit-trace-correlation
  namespace: logging
data:
  fluent-bit.conf: |
    [INPUT]
        Name              tail
        Path              /var/log/containers/*.log
        Parser            docker
        Tag               kube.*
        Mem_Buf_Limit     5MB

    [FILTER]
        Name          parser
        Match         kube.*
        Key_Name      log
        Parser        json
        Reserve_Data  On
        Preserve_Key  On

    [FILTER]
        Name                kubernetes
        Match               kube.*
        Kube_URL            https://kubernetes.default.svc:443
        Merge_Log           On
        Keep_Log            Off

    # Add trace_id as top-level field if present
    [FILTER]
        Name    lua
        Match   kube.*
        script  /fluent-bit/scripts/extract-trace.lua
        call    extract_trace_context

    [OUTPUT]
        Name            loki
        Match           kube.*
        Host            loki.logging.svc.cluster.local
        Port            3100
        Labels          job=kubernetes,namespace=$kubernetes['namespace_name']
        # Store high-cardinality IDs as structured metadata, not stream labels
        Structured_Metadata trace_id=$trace_id,span_id=$span_id,pod=$kubernetes['pod_name']
        RemoveKeys      trace_id,span_id

  extract-trace.lua: |
    function extract_trace_context(tag, timestamp, record)
        -- Extract trace_id from various log formats
        local trace_id = record["trace_id"] or
                        record["traceId"] or
                        record["trace.id"] or
                        record["dd.trace_id"]

        local span_id = record["span_id"] or
                       record["spanId"] or
                       record["span.id"] or
                       record["dd.span_id"]

        if trace_id then
            record["trace_id"] = trace_id
        end

        if span_id then
            record["span_id"] = span_id
        end

        return 2, timestamp, record
    end
```

## Configuring Loki for Trace Correlation

Use a Loki schema that supports structured metadata:

```yaml
apiVersion: v1
kind: ConfigMap
metadata:
  name: loki-config
  namespace: logging
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

    schema_config:
      configs:
      - from: 2024-01-01
        store: tsdb
        object_store: filesystem
        schema: v13
        index:
          prefix: index_
          period: 24h

    storage_config:
      tsdb_shipper:
        active_index_directory: /loki/index
        cache_location: /loki/cache
      filesystem:
        directory: /loki/chunks

    # Enable structured metadata for trace and span IDs
    limits_config:
      allow_structured_metadata: true
      max_label_names_per_series: 30
```

## Querying Logs by Trace ID

Find all logs for a specific trace:

```logql
# Find all logs for a trace

{job="kubernetes"} | trace_id="4bf92f3577b34da6a3ce929d0e0e4736"

# Find logs with trace IDs (any trace)
{job="kubernetes"} | trace_id!=""

# Find errors for a specific trace in JSON logs
{job="kubernetes"} | trace_id="4bf92f3577b34da6a3ce929d0e0e4736" | json | level="error"

# Count logs per trace
sum by (trace_id) (
  count_over_time({namespace="production"} | trace_id!="" [1h])
)
```

## Configuring Grafana Data Links

Create automatic links between logs and traces:

```yaml
apiVersion: 1

datasources:
  - name: Loki
    type: loki
    uid: loki
    access: proxy
    url: http://loki.logging.svc.cluster.local:3100
    jsonData:
      derivedFields:
        - datasourceUid: tempo
          matcherType: label
          matcherRegex: 'trace[_]?id'
          name: TraceID
          url: '$${__value.raw}'
          urlDisplayLabel: 'View Trace in Tempo'
```

Configure Tempo to link back to logs:

```yaml
apiVersion: 1

datasources:
  - name: Tempo
    type: tempo
    uid: tempo
    access: proxy
    url: http://tempo.tracing.svc.cluster.local:3200
    jsonData:
      tracesToLogsV2:
        datasourceUid: loki
        spanStartTimeShift: '-2s'
        spanEndTimeShift: '2s'
        tags:
          - key: service.name
            value: service_name
          - key: namespace
          - key: pod
        filterByTraceID: true
        filterBySpanID: false
```

## Building Correlation Dashboard

Create a Grafana dashboard with linked logs and traces:

```json
{
  "dashboard": {
    "title": "Log-Trace Correlation",
    "panels": [
      {
        "title": "Traces",
        "type": "trace-list",
        "datasource": "Tempo",
        "targets": [{
          "queryType": "search",
          "serviceName": "$service"
        }]
      },
      {
        "title": "Related Logs",
        "type": "logs",
        "datasource": "Loki",
        "targets": [{
          "expr": "{namespace=\"$namespace\"} | trace_id=\"$trace_id\"",
          "refId": "A"
        }]
      },
      {
        "title": "Error Distribution by Trace",
        "type": "bargauge",
        "datasource": "Loki",
        "targets": [{
          "expr": "sum by (trace_id) (count_over_time({namespace=\"$namespace\"} | trace_id!=\"\" | json | level=\"error\" [1h]))"
        }]
      }
    ],
    "templating": {
      "list": [
        {
          "name": "namespace",
          "type": "query",
          "datasource": "Loki",
          "query": "label_values(namespace)"
        },
        {
          "name": "trace_id",
          "type": "textbox",
          "label": "Trace ID"
        }
      ]
    }
  }
}
```

## Implementing Automatic Correlation

Use Grafana's exemplar feature for metric-to-trace correlation:

```yaml
# Prometheus config
global:
  evaluation_interval: 15s

scrape_configs:
  - job_name: orders
    metrics_path: /metrics
    static_configs:
      - targets: ['orders:8080']
    scrape_protocols: [OpenMetricsText1.0.0, OpenMetricsText0.0.1, PrometheusText0.0.4]

# Start Prometheus with:
# --enable-feature=exemplar-storage
```

## Best Practices

1. **Standardize trace ID format**: Use consistent field names across services
2. **Include span IDs**: Enables precise log-to-span mapping
3. **Propagate context**: Ensure trace context flows through all service calls
4. **Store trace IDs as structured metadata**: Avoid high-cardinality stream labels
5. **Sample intelligently**: Keep all logs for sampled traces
6. **Add correlation metadata**: Include service name, operation, etc.
7. **Test correlation**: Verify links work in both directions

## Troubleshooting Correlation Issues

**Missing trace IDs in logs**:
- Verify application instrumentation
- Check log format and parsing
- Ensure MDC/context propagation is configured

**Broken links between systems**:
- Verify datasource UIDs match
- Check URL templates in data links
- Ensure trace ID format is consistent

**Performance issues**:
- Store trace IDs as structured metadata in Loki
- Keep high-cardinality fields out of stream labels
- Use appropriate retention policies

## Conclusion

Correlating logs with traces creates a powerful troubleshooting workflow. By ensuring trace IDs flow through your entire observability stack, you enable quick navigation between detailed logs and high-level trace views. Start by instrumenting your applications to emit trace IDs, configure your log pipeline to extract and store them as structured metadata, and set up Grafana to link the data sources. This investment pays dividends during incident response when every second counts.
