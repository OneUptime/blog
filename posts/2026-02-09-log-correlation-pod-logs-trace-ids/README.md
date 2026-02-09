# How to Build a Log Correlation Pipeline That Links Kubernetes Pod Logs to Trace IDs

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
    "go.opentelemetry.io/otel"
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
import org.apache.logging.log4j.LogManager;
import org.apache.logging.log4j.Logger;
import org.apache.logging.log4j.ThreadContext;

public class OrderService {
    private static final Logger logger = LogManager.getLogger(OrderService.class);

    public void processOrder(String orderId) {
        Span span = Span.current();
        String traceId = span.getSpanContext().getTraceId();
        String spanId = span.getSpanContext().getSpanId();

        // Add to MDC for automatic inclusion in logs
        ThreadContext.put("trace_id", traceId);
        ThreadContext.put("span_id", spanId);

        logger.info("Processing order: {}", orderId);

        // Business logic
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

Configure Fluent Bit to extract and label trace IDs:

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
        Name                kubernetes
        Match               kube.*
        Kube_URL            https://kubernetes.default.svc:443
        Merge_Log           On
        Keep_Log            Off

    # Extract trace_id from JSON logs
    [FILTER]
        Name          parser
        Match         kube.*
        Key_Name      log
        Parser        json
        Reserve_Data  On

    # Extract trace context as labels
    [FILTER]
        Name          nest
        Match         kube.*
        Operation     lift
        Nested_under  log

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
        Labels          job=kubernetes
        # Include trace_id in labels for correlation
        Label_keys      $trace_id,$span_id
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

Enable trace correlation in Loki configuration:

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

    # Enable trace correlation
    limits_config:
      enforce_metric_name: false
      max_label_names_per_series: 30

    # Link to Tempo for traces
    tempo:
      enabled: true
      datasource_uid: tempo-uid
```

## Querying Logs by Trace ID

Find all logs for a specific trace:

```logql
# Find all logs for a trace
{trace_id="4bf92f3577b34da6a3ce929d0e0e4736"}

# Find logs with trace IDs (any trace)
{trace_id!=""}

# Find errors for a specific trace
{trace_id="4bf92f3577b34da6a3ce929d0e0e4736", level="error"}

# Count logs per trace
sum by (trace_id) (
  count_over_time({namespace="production", trace_id!=""}[1h])
)
```

## Configuring Grafana Data Links

Create automatic links between logs and traces:

```json
{
  "datasource": "Loki",
  "dataLinks": [
    {
      "title": "View Trace in Tempo",
      "url": "/explore?left=%7B%22queries%22:%5B%7B%22refId%22:%22A%22,%22datasource%22:%22Tempo%22,%22query%22:%22${__value.raw}%22%7D%5D,%22range%22:%7B%22from%22:%22now-1h%22,%22to%22:%22now%22%7D%7D",
      "urlDisplayLabel": "Trace: ${__value.raw}",
      "field": "trace_id"
    }
  ]
}
```

Configure Tempo to link back to logs:

```yaml
apiVersion: v1
kind: ConfigMap
metadata:
  name: tempo-config
  namespace: tracing
data:
  tempo.yaml: |
    server:
      http_listen_port: 3200

    distributor:
      receivers:
        jaeger:
          protocols:
            grpc:
        otlp:
          protocols:
            grpc:

    ingester:
      trace_idle_period: 10s
      max_block_bytes: 1048576
      max_block_duration: 5m

    storage:
      trace:
        backend: local
        local:
          path: /var/tempo/traces

    # Link to Loki for logs
    overrides:
      trace_id_label_name: "trace_id"
      user_configurable_overrides:
        log_derived_labels:
          - name: "trace_id"
            source: "trace_id"
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
          "expr": "{namespace=\"$namespace\", trace_id=\"$trace_id\"}",
          "refId": "A"
        }]
      },
      {
        "title": "Error Distribution by Trace",
        "type": "bargauge",
        "datasource": "Loki",
        "targets": [{
          "expr": "sum by (trace_id) (count_over_time({namespace=\"$namespace\", level=\"error\", trace_id!=\"\"}[1h]))"
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

Use Grafana's exemplar feature for automatic correlation:

```yaml
# Loki config with exemplars
ruler:
  alertmanager_url: http://alertmanager:9093
  enable_api: true
  enable_sharding: false
  storage:
    type: local
    local:
      directory: /loki/rules

  # Enable exemplars
  wal:
    dir: /loki/ruler-wal
  remote_write:
    enabled: true
    client:
      url: http://prometheus:9090/api/v1/write

# Prometheus config
global:
  evaluation_interval: 15s

remote_write:
  - url: http://tempo:3200/api/v1/push
    write_relabel_configs:
      - source_labels: [__name__]
        regex: '.*'
        target_label: __tmp_exemplar_trace_id
        replacement: '${trace_id}'
```

## Best Practices

1. **Standardize trace ID format**: Use consistent field names across services
2. **Include span IDs**: Enables precise log-to-span mapping
3. **Propagate context**: Ensure trace context flows through all service calls
4. **Index trace IDs carefully**: Balance queryability with cardinality
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
- Index trace IDs in Loki
- Limit trace ID cardinality
- Use appropriate retention policies

## Conclusion

Correlating logs with traces creates a powerful troubleshooting workflow. By ensuring trace IDs flow through your entire observability stack, you enable quick navigation between detailed logs and high-level trace views. Start by instrumenting your applications to emit trace IDs, configure your log pipeline to extract and index them, and set up Grafana to link the data sources. This investment pays dividends during incident response when every second counts.
