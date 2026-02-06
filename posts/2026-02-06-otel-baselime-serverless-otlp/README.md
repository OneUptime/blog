# How to Send OpenTelemetry Traces and Logs to Baselime via OTLP for Serverless Stack Observability

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: OpenTelemetry, Baselime, Serverless, OTLP

Description: Send OpenTelemetry traces and logs to Baselime via OTLP for full observability of your serverless applications on AWS Lambda and beyond.

Baselime is an observability platform built specifically for serverless and cloud-native applications. It accepts OpenTelemetry data through standard OTLP endpoints, making it easy to instrument AWS Lambda functions, Vercel serverless functions, and other event-driven compute platforms.

## Baselime OTLP Endpoint

Baselime's OTLP endpoint: `otel.baselime.io:4317` (gRPC) and `https://otel.baselime.io/v1` (HTTP). Authentication uses a `x-api-key` header with your Baselime API key.

## Instrumenting AWS Lambda with OpenTelemetry

Lambda functions need lightweight instrumentation since cold starts matter. Here is a Python Lambda example:

```python
# lambda_function.py
import json
from opentelemetry import trace
from opentelemetry.sdk.trace import TracerProvider
from opentelemetry.sdk.trace.export import SimpleSpanProcessor
from opentelemetry.exporter.otlp.proto.http.trace_exporter import OTLPSpanExporter
from opentelemetry.sdk.resources import Resource

# Configure once at module level (survives across warm invocations)
resource = Resource.create({
    "service.name": "order-processor-lambda",
    "cloud.provider": "aws",
    "cloud.platform": "aws_lambda",
    "faas.name": "order-processor",
    "deployment.environment": "production",
})

# Use SimpleSpanProcessor in Lambda to flush immediately
# BatchSpanProcessor might not flush before Lambda freezes
exporter = OTLPSpanExporter(
    endpoint="https://otel.baselime.io/v1/traces",
    headers={
        "x-api-key": "your-baselime-api-key",
    },
)

provider = TracerProvider(resource=resource)
provider.add_span_processor(SimpleSpanProcessor(exporter))
trace.set_tracer_provider(provider)

tracer = trace.get_tracer("order-processor")


def handler(event, context):
    """AWS Lambda handler with OpenTelemetry tracing."""
    with tracer.start_as_current_span(
        "lambda.handler",
        attributes={
            "faas.trigger": "http",
            "faas.invocation_id": context.aws_request_id,
            "faas.coldstart": not hasattr(handler, "_warm"),
            "cloud.account.id": context.invoked_function_arn.split(":")[4],
        }
    ) as span:
        handler._warm = True  # Mark as warm for next invocation

        try:
            # Parse the incoming event
            body = json.loads(event.get("body", "{}"))

            with tracer.start_as_current_span("process_order") as child:
                child.set_attribute("order.id", body.get("order_id", ""))
                result = process_order(body)

            return {
                "statusCode": 200,
                "body": json.dumps(result),
            }

        except Exception as e:
            span.record_exception(e)
            span.set_status(trace.Status(trace.StatusCode.ERROR))
            return {
                "statusCode": 500,
                "body": json.dumps({"error": str(e)}),
            }
        finally:
            # Force flush before Lambda freezes
            provider.force_flush()


def process_order(order_data):
    """Simulate order processing."""
    return {"status": "processed", "order_id": order_data.get("order_id")}
```

## Node.js Lambda Instrumentation

```javascript
// handler.js
const { NodeTracerProvider } = require("@opentelemetry/sdk-trace-node");
const { OTLPTraceExporter } = require("@opentelemetry/exporter-trace-otlp-http");
const { SimpleSpanProcessor } = require("@opentelemetry/sdk-trace-base");
const { Resource } = require("@opentelemetry/resources");
const { trace } = require("@opentelemetry/api");

// Set up tracing at module load time
const resource = new Resource({
  "service.name": "api-handler-lambda",
  "cloud.provider": "aws",
  "cloud.platform": "aws_lambda",
});

const exporter = new OTLPTraceExporter({
  url: "https://otel.baselime.io/v1/traces",
  headers: {
    "x-api-key": process.env.BASELIME_API_KEY,
  },
});

const provider = new NodeTracerProvider({ resource });
// SimpleSpanProcessor for Lambda (flushes immediately)
provider.addSpanProcessor(new SimpleSpanProcessor(exporter));
provider.register();

const tracer = trace.getTracer("api-handler");
let isWarm = false;

exports.handler = async (event, context) => {
  const span = tracer.startSpan("lambda.handler", {
    attributes: {
      "faas.trigger": "http",
      "faas.invocation_id": context.awsRequestId,
      "faas.coldstart": !isWarm,
    },
  });
  isWarm = true;

  try {
    const body = JSON.parse(event.body || "{}");

    const childSpan = tracer.startSpan("process_request");
    childSpan.setAttribute("request.path", event.path);
    const result = processRequest(body);
    childSpan.end();

    span.setAttribute("http.status_code", 200);
    span.end();

    // Flush before Lambda freezes
    await provider.forceFlush();

    return { statusCode: 200, body: JSON.stringify(result) };
  } catch (error) {
    span.recordException(error);
    span.setStatus({ code: trace.SpanStatusCode.ERROR });
    span.end();
    await provider.forceFlush();

    return { statusCode: 500, body: JSON.stringify({ error: error.message }) };
  }
};
```

## Sending Logs to Baselime

```python
import logging
from opentelemetry import _logs, trace
from opentelemetry.sdk._logs import LoggerProvider, LoggingHandler
from opentelemetry.sdk._logs.export import SimpleLogRecordProcessor
from opentelemetry.exporter.otlp.proto.http._log_exporter import OTLPLogExporter

log_exporter = OTLPLogExporter(
    endpoint="https://otel.baselime.io/v1/logs",
    headers={
        "x-api-key": "your-baselime-api-key",
    },
)

logger_provider = LoggerProvider(resource=resource)
# Use SimpleLogRecordProcessor for Lambda
logger_provider.add_log_record_processor(SimpleLogRecordProcessor(log_exporter))
_logs.set_logger_provider(logger_provider)

# Bridge Python logging
handler = LoggingHandler(level=logging.INFO, logger_provider=logger_provider)
logging.getLogger().addHandler(handler)

logger = logging.getLogger("order-processor")
logger.info("Processing order", extra={"order_id": "ORD-123"})
```

## Environment Variables for Lambda

Set these in your Lambda configuration or `serverless.yml`:

```yaml
# serverless.yml
provider:
  environment:
    BASELIME_API_KEY: ${ssm:/baselime/api-key}
    OTEL_SERVICE_NAME: order-processor
    OTEL_EXPORTER_OTLP_ENDPOINT: https://otel.baselime.io
    OTEL_EXPORTER_OTLP_HEADERS: x-api-key=${ssm:/baselime/api-key}
```

## Key Considerations for Serverless

1. **Use SimpleSpanProcessor**: BatchSpanProcessor may not flush before Lambda freezes the execution environment
2. **Always call force_flush()**: Ensure all spans are exported before the handler returns
3. **Track cold starts**: The `faas.coldstart` attribute helps you distinguish cold start latency from warm invocation latency
4. **Keep instrumentation lightweight**: Every millisecond of overhead directly affects your Lambda costs

Baselime's focus on serverless means it understands Lambda invocation patterns, cold starts, and event-driven architectures natively. The OTLP integration lets you send standard OpenTelemetry data without vendor lock-in.
