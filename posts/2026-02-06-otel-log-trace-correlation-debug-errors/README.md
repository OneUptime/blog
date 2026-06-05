# How to Use OpenTelemetry Log-Trace Correlation to Debug Errors Without

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: OpenTelemetry, Log, Trace, Debugging, Correlation

Description: Set up OpenTelemetry log-trace correlation to debug production errors by linking structured logs directly to the traces that produced them.

Reproducing production bugs locally is often impossible. The data is different, the timing is different, the infrastructure is different. But if your logs are correlated with your traces, you do not need to reproduce the bug. You can reconstruct exactly what happened by reading the logs and trace together, like reading a detailed narrative of the failed request.

## How Log-Trace Correlation Works

When a request is being processed, OpenTelemetry maintains a trace context (trace ID and span ID) in the current execution context. Log-trace correlation means injecting that trace context into every log line emitted during the request. Later, you can search for all logs with a specific trace ID to see every log message produced during a single request's lifecycle.

## Setting Up Correlation

### Python with the logging module

```python
import logging
from opentelemetry import trace
from opentelemetry.instrumentation.logging import LoggingInstrumentor

# Enable automatic injection of trace context into log records

LoggingInstrumentor().instrument()

# Configure your logging format to include trace context
logging.basicConfig(
    format='%(asctime)s %(levelname)s [%(name)s] '
           '[trace_id=%(otelTraceID)s span_id=%(otelSpanID)s] '
           '%(message)s',
    level=logging.INFO,
)

logger = logging.getLogger("order-service")

def process_order(order_id: str):
    # Every log line automatically includes the trace_id and span_id
    logger.info("Starting order processing", extra={"order_id": order_id})

    try:
        result = validate_order(order_id)
        logger.info("Order validated successfully", extra={
            "order_id": order_id,
            "item_count": result.item_count,
        })
    except ValueError as e:
        # This log line is linked to the same trace as the span
        logger.error("Order validation failed", extra={
            "order_id": order_id,
            "error": str(e),
        })
        raise
```

### Java with Logback

```xml
<!-- logback.xml configuration -->
<configuration>
  <appender name="STDOUT" class="ch.qos.logback.core.ConsoleAppender">
    <encoder>
      <pattern>
        %d{yyyy-MM-dd HH:mm:ss} %-5level [%thread]
        [trace_id=%X{trace_id} span_id=%X{span_id}]
        %logger{36} - %msg%n
      </pattern>
    </encoder>
  </appender>

  <!-- If you use the OpenTelemetry Java agent, the STDOUT appender
       can be referenced directly. If you use the standalone
       opentelemetry-logback-mdc-1.0 library instead, wrap it first. -->
  <appender name="OTEL" class="io.opentelemetry.instrumentation.logback.mdc.v1_0.OpenTelemetryAppender">
    <appender-ref ref="STDOUT"/>
  </appender>

  <root level="INFO">
    <appender-ref ref="OTEL" />
  </root>
</configuration>
```

```java
// The OpenTelemetry Java agent automatically populates
// the MDC (Mapped Diagnostic Context) with trace_id and span_id.
// If you are not using the agent, add the opentelemetry-logback-mdc-1.0
// dependency and wrap your Logback appender with OpenTelemetryAppender.

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;

public class OrderService {
    private static final Logger logger = LoggerFactory.getLogger(OrderService.class);

    public void processOrder(String orderId) {
        // trace_id and span_id are automatically in the MDC
        logger.info("Processing order: {}", orderId);

        try {
            validateInventory(orderId);
            logger.info("Inventory validated for order: {}", orderId);
        } catch (Exception e) {
            logger.error("Inventory check failed for order: {}", orderId, e);
            throw e;
        }
    }
}
```

### Node.js with Winston

```javascript
const winston = require('winston');
const { trace, context } = require('@opentelemetry/api');

// Create a custom format that adds trace context to every log entry
const traceFormat = winston.format((info) => {
  const span = trace.getSpan(context.active());
  if (span) {
    const spanContext = span.spanContext();
    info.trace_id = spanContext.traceId;
    info.span_id = spanContext.spanId;
    info.trace_flags = spanContext.traceFlags;
  }
  return info;
});

const logger = winston.createLogger({
  format: winston.format.combine(
    traceFormat(),
    winston.format.timestamp(),
    winston.format.json(),
  ),
  transports: [new winston.transports.Console()],
});

// Example output:
// {
//   "level": "error",
//   "message": "Payment processing failed",
//   "trace_id": "4bf92f3577b34da6a3ce929d0e0e4736",
//   "span_id": "00f067aa0ba902b7",
//   "timestamp": "2026-02-06T14:30:00.000Z",
//   "order_id": "ord_xyz"
// }
```

## The Debugging Workflow

Here is how you use log-trace correlation to debug a production error without reproducing it locally.

### Step 1: Find the Error Trace

Start from an alert, a customer report, or an error in your logging dashboard:

```text
# Search logs for errors in the order service
level:error AND service:order-service AND message:"payment failed"

# From the log entry, extract the trace_id
# Example log: 2026-02-06 14:30:00 ERROR [trace_id=4bf92f3577b34da6a3ce929d0e0e4736 span_id=00f067aa0ba902b7] Payment failed
```

### Step 2: Pull Up the Full Trace

Open the trace ID in your trace viewer. The waterfall shows you the request flow:

```text
Trace: 4bf92f3577b34da6a3ce929d0e0e4736 (14:30:00 UTC)
[ERROR] HTTP POST /api/v1/orders                    1200ms
  [OK]    order.validate                              50ms
  [OK]    inventory.reserve                           200ms
  [ERROR] payment.charge                              800ms
    [ERROR] HTTP POST payment-gateway/v1/charges      750ms
      Exception: "Card declined: insufficient funds"
```

### Step 3: Get All Logs for This Trace

Query your log backend for every log entry with this trace ID:

```text
# Loki query
{service="order-service"} |= "4bf92f3577b34da6a3ce929d0e0e4736"

# Elasticsearch query
trace_id:"4bf92f3577b34da6a3ce929d0e0e4736"
```

This gives you a complete narrative:

```text
14:30:00.001 INFO  [trace_id=4bf92f3577b34da6a3ce929d0e0e4736] Starting order processing, order_id=ord_789
14:30:00.051 INFO  [trace_id=4bf92f3577b34da6a3ce929d0e0e4736] Order validated, items=3, total=$149.99
14:30:00.052 INFO  [trace_id=4bf92f3577b34da6a3ce929d0e0e4736] Reserving inventory for 3 items
14:30:00.250 INFO  [trace_id=4bf92f3577b34da6a3ce929d0e0e4736] Inventory reserved successfully
14:30:00.251 INFO  [trace_id=4bf92f3577b34da6a3ce929d0e0e4736] Processing payment, method=credit_card
14:30:00.260 INFO  [trace_id=4bf92f3577b34da6a3ce929d0e0e4736] Calling payment gateway, amount=$149.99
14:30:01.010 WARN  [trace_id=4bf92f3577b34da6a3ce929d0e0e4736] Payment gateway returned decline, code=insufficient_funds
14:30:01.011 ERROR [trace_id=4bf92f3577b34da6a3ce929d0e0e4736] Payment failed for order ord_789: Card declined
14:30:01.012 INFO  [trace_id=4bf92f3577b34da6a3ce929d0e0e4736] Releasing inventory reservation
14:30:01.200 INFO  [trace_id=4bf92f3577b34da6a3ce929d0e0e4736] Returning error response to client, status=402
```

Now you know exactly what happened, in what order, without reproducing anything.

### Step 4: Check Across Services

If the trace spans multiple services, check logs from each service:

```text
# Get logs from the payment service for the same trace
{service="payment-service"} |= "4bf92f3577b34da6a3ce929d0e0e4736"

# Payment service logs might show:
14:30:00.270 INFO  [trace_id=4bf92f3577b34da6a3ce929d0e0e4736] Received charge request, amount=$149.99
14:30:00.275 INFO  [trace_id=4bf92f3577b34da6a3ce929d0e0e4736] Customer payment profile loaded, card=*4242
14:30:00.280 INFO  [trace_id=4bf92f3577b34da6a3ce929d0e0e4736] Sending to gateway, provider=stripe
14:30:01.005 WARN  [trace_id=4bf92f3577b34da6a3ce929d0e0e4736] Gateway response: decline, reason=insufficient_funds
14:30:01.008 ERROR [trace_id=4bf92f3577b34da6a3ce929d0e0e4736] Charge failed, returning error to caller
```

## Sending Logs Through the OTel Collector

For the best correlation experience, send both logs and traces through the OpenTelemetry Collector:

```yaml
# collector-config.yaml
receivers:
  otlp:
    protocols:
      grpc:
        endpoint: 0.0.0.0:4317

processors:
  batch:
    send_batch_size: 8192
    timeout: 5s

  # Enrich logs with resource attributes from the service
  resource:
    attributes:
      - key: deployment.environment
        value: production
        action: upsert

exporters:
  otlp/traces:
    endpoint: tempo:4317
    tls:
      insecure: true
  otlphttp/loki:
    endpoint: http://loki:3100/otlp

service:
  pipelines:
    traces:
      receivers: [otlp]
      processors: [batch, resource]
      exporters: [otlp/traces]
    logs:
      receivers: [otlp]
      processors: [batch, resource]
      exporters: [otlphttp/loki]
```

## Connecting Traces and Logs in Grafana

Configure Grafana to link between Tempo (traces) and Loki (logs):

```yaml
# Grafana datasource provisioning
datasources:
  - name: Tempo
    type: tempo
    jsonData:
      tracesToLogsV2:
        datasourceUid: loki-uid
        filterByTraceID: true
        filterBySpanID: false
        mapTagNamesEnabled: true
        mappedTags:
          - key: service.name
            value: service

  - name: Loki
    type: loki
    jsonData:
      derivedFields:
        - datasourceUid: tempo-uid
          matcherRegex: "trace_id=(\\w+)"
          name: TraceID
          url: "$${__value.raw}"
```

With this configuration, clicking a trace ID in a log entry takes you to the trace view, and clicking a span in the trace view shows you all related logs. This bidirectional navigation is the key to fast debugging.

## Practical Tips

Always use structured logging (JSON format) in production. It makes querying by trace ID reliable. Unstructured logs require regex parsing, which is fragile.

Set the log level on a per-request basis when you need more detail. If a request fails, you might want DEBUG-level logs. Use OpenTelemetry baggage or a feature flag to enable verbose logging for specific users or trace IDs without increasing log volume for all traffic.

Log-trace correlation eliminates the "I need to reproduce it locally" bottleneck. Every production error becomes a self-documented incident, with a complete timeline of what happened and why. Set it up once, and your debugging time drops permanently.
