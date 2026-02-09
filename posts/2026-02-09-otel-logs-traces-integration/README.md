# How to implement OpenTelemetry logs integration with traces

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: OpenTelemetry, Logs, Traces, Observability, Correlation

Description: Learn how to integrate OpenTelemetry logs with traces by injecting trace context into log statements for unified observability and easier troubleshooting across logs and traces.

---

OpenTelemetry logs integration with traces provides unified observability by linking log statements to their associated traces. This correlation enables you to navigate from traces to related logs and vice versa, significantly improving troubleshooting efficiency.

## Understanding Logs and Traces Integration

Log-trace correlation works by injecting trace context (trace ID and span ID) into log statements. When viewing a trace, you can query logs with the same trace ID to see all log output for that request. Similarly, when investigating logs, you can find the corresponding trace.

This integration requires configuring logging libraries to extract trace context from the active span and include it in log records. Most OpenTelemetry SDKs provide logging integrations that handle this automatically.

## Python Logging Integration

Configure Python's logging module to include trace context in log records.

```python
# python_logging_integration.py
import logging
from opentelemetry import trace
from opentelemetry.sdk.trace import TracerProvider
from opentelemetry.sdk.trace.export import BatchSpanProcessor
from opentelemetry.exporter.otlp.proto.grpc.trace_exporter import OTLPSpanExporter
from opentelemetry.instrumentation.logging import LoggingInstrumentor

# Initialize tracing
trace.set_tracer_provider(TracerProvider())
tracer_provider = trace.get_tracer_provider()
tracer_provider.add_span_processor(
    BatchSpanProcessor(OTLPSpanExporter(endpoint="http://localhost:4317"))
)

# Instrument logging to inject trace context
LoggingInstrumentor().instrument(set_logging_format=True)

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - [trace_id=%(otelTraceID)s span_id=%(otelSpanID)s] - %(message)s'
)

logger = logging.getLogger(__name__)
tracer = trace.get_tracer(__name__)

# Use logging with trace context
def process_order(order_id):
    with tracer.start_as_current_span("process_order") as span:
        span.set_attribute("order.id", order_id)
        
        logger.info(f"Processing order {order_id}")  # Includes trace context
        
        try:
            validate_order(order_id)
            logger.info(f"Order {order_id} validated successfully")
            
            charge_payment(order_id)
            logger.info(f"Payment processed for order {order_id}")
            
            return {"status": "success"}
        except Exception as e:
            logger.error(f"Order processing failed: {str(e)}")  # Error with trace context
            raise

def validate_order(order_id):
    pass

def charge_payment(order_id):
    pass
```

The logging instrumentation automatically adds trace_id and span_id to every log statement within an active span.

## Structured Logging with JSON

Use structured logging with JSON format to make trace context machine-readable.

```python
# structured_logging.py
import logging
import json
from opentelemetry import trace
from opentelemetry.instrumentation.logging import LoggingInstrumentor

LoggingInstrumentor().instrument()

class JSONFormatter(logging.Formatter):
    def format(self, record):
        log_data = {
            "timestamp": self.formatTime(record),
            "level": record.levelname,
            "logger": record.name,
            "message": record.getMessage(),
        }
        
        # Add trace context if available
        if hasattr(record, 'otelTraceID'):
            log_data["trace_id"] = record.otelTraceID
        if hasattr(record, 'otelSpanID'):
            log_data["span_id"] = record.otelSpanID
        
        # Add extra fields
        if hasattr(record, 'extra_fields'):
            log_data.update(record.extra_fields)
        
        return json.dumps(log_data)

# Configure JSON logging
handler = logging.StreamHandler()
handler.setFormatter(JSONFormatter())
logger = logging.getLogger()
logger.addHandler(handler)
logger.setLevel(logging.INFO)

# Log with structured data
def process_payment(amount, method):
    span = trace.get_current_span()
    
    extra = {
        "payment": {
            "amount": amount,
            "method": method
        }
    }
    
    logger.info("Processing payment", extra={'extra_fields': extra})
```

## Node.js Logging Integration

Integrate OpenTelemetry with Winston or Pino for Node.js logging.

```javascript
// nodejs_logging_winston.js
const winston = require('winston');
const { trace, context } = require('@opentelemetry/api');

// Custom format to add trace context
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

// Configure Winston logger
const logger = winston.createLogger({
  level: 'info',
  format: winston.format.combine(
    traceFormat(),
    winston.format.timestamp(),
    winston.format.json()
  ),
  transports: [
    new winston.transports.Console(),
    new winston.transports.File({ filename: 'app.log' })
  ]
});

// Use logger in application
async function handleRequest(req, res) {
  const tracer = trace.getTracer('my-service');
  
  await tracer.startActiveSpan('handle_request', async (span) => {
    logger.info('Request received', {
      path: req.path,
      method: req.method
    });
    
    try {
      const result = await processRequest(req);
      logger.info('Request completed successfully');
      res.json(result);
    } catch (error) {
      logger.error('Request failed', { error: error.message });
      res.status(500).json({ error: 'Internal server error' });
    } finally {
      span.end();
    }
  });
}

async function processRequest(req) {
  return { data: 'processed' };
}
```

## Java Logging Integration

Configure Logback or Log4j2 to include trace context in Java applications.

```xml
<!-- logback.xml -->
<configuration>
    <appender name="CONSOLE" class="ch.qos.logback.core.ConsoleAppender">
        <encoder>
            <pattern>%d{HH:mm:ss.SSS} [%thread] %-5level %logger{36} [trace_id=%X{trace_id} span_id=%X{span_id}] - %msg%n</pattern>
        </encoder>
    </appender>

    <appender name="JSON" class="ch.qos.logback.core.ConsoleAppender">
        <encoder class="net.logstash.logback.encoder.LogstashEncoder">
            <includeMdcKeyName>trace_id</includeMdcKeyName>
            <includeMdcKeyName>span_id</includeMdcKeyName>
        </encoder>
    </appender>

    <root level="INFO">
        <appender-ref ref="CONSOLE" />
    </root>
</configuration>
```

```java
// JavaLoggingExample.java
import io.opentelemetry.api.trace.Span;
import io.opentelemetry.api.trace.Tracer;
import io.opentelemetry.context.Scope;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.slf4j.MDC;

public class OrderService {
    private static final Logger logger = LoggerFactory.getLogger(OrderService.class);
    private final Tracer tracer;

    public OrderService(Tracer tracer) {
        this.tracer = tracer;
    }

    public void processOrder(String orderId) {
        Span span = tracer.spanBuilder("processOrder")
            .startSpan();

        try (Scope scope = span.makeCurrent()) {
            // Add trace context to MDC
            MDC.put("trace_id", span.getSpanContext().getTraceId());
            MDC.put("span_id", span.getSpanContext().getSpanId());

            logger.info("Processing order: {}", orderId);

            validateOrder(orderId);
            logger.info("Order validated");

            chargePayment(orderId);
            logger.info("Payment charged");

        } catch (Exception e) {
            logger.error("Order processing failed", e);
            span.recordException(e);
            throw e;
        } finally {
            MDC.clear();
            span.end();
        }
    }

    private void validateOrder(String orderId) {
        // Validation logic
    }

    private void chargePayment(String orderId) {
        // Payment logic
    }
}
```

## Collector Log Processing

Configure the OpenTelemetry Collector to process logs and enrich them with additional context.

```yaml
# collector-logs-config.yaml
receivers:
  otlp:
    protocols:
      grpc:
        endpoint: 0.0.0.0:4317
      http:
        endpoint: 0.0.0.0:4318

  filelog:
    include: [/var/log/app/*.log]
    operators:
      - type: json_parser
      - type: trace_parser
        trace_id:
          parse_from: attributes.trace_id
        span_id:
          parse_from: attributes.span_id

processors:
  batch:
    timeout: 10s
  
  resource:
    attributes:
      - key: service.name
        value: my-application
        action: upsert

exporters:
  otlp/logs:
    endpoint: loki:3100
    tls:
      insecure: true
  
  otlp/traces:
    endpoint: tempo:4317
    tls:
      insecure: true

service:
  pipelines:
    logs:
      receivers: [otlp, filelog]
      processors: [batch, resource]
      exporters: [otlp/logs]
    
    traces:
      receivers: [otlp]
      processors: [batch, resource]
      exporters: [otlp/traces]
```

## Querying Correlated Logs

Query logs using trace IDs from your observability backend.

```python
# query_correlated_logs.py
"""
Example queries for different backends:

Grafana Loki:
{service="my-app"} |= "trace_id=4bf92f3577b34da6a3ce929d0e0e4736"

Elasticsearch:
GET /logs-*/_search
{
  "query": {
    "term": {
      "trace_id": "4bf92f3577b34da6a3ce929d0e0e4736"
    }
  }
}

Grafana Tempo:
Query trace by ID, then navigate to logs panel
which automatically queries logs with the same trace_id
"""
```

## Best Practices

Follow these best practices for log-trace integration.

First, always use structured logging with JSON format. This makes trace context easily parseable by log aggregation systems.

Second, include trace context in all log levels, not just errors. This provides complete visibility into request flows.

Third, use consistent field names across services. Standard names like `trace_id` and `span_id` enable universal queries.

Fourth, configure log sampling aligned with trace sampling. Keeping logs for dropped traces wastes storage.

Fifth, set up automated linking between traces and logs in your observability platform. Many backends support this natively.

Sixth, include additional context beyond trace IDs. Add user IDs, tenant IDs, and other business context for richer correlation.

OpenTelemetry logs integration with traces provides powerful correlation capabilities that significantly improve troubleshooting efficiency. Proper configuration ensures trace context flows through logging infrastructure, enabling seamless navigation between traces and logs in your observability platform.
