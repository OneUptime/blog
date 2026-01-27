# How to Use OpenTelemetry with Lambda Functions

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: OpenTelemetry, AWS Lambda, Serverless, Observability, Tracing, Python, Node.js, X-Ray

Description: A practical guide to instrumenting AWS Lambda functions with OpenTelemetry for distributed tracing, including layers, auto-instrumentation, manual spans, and X-Ray integration.

---

> Serverless functions execute in milliseconds but debugging them can take hours. **OpenTelemetry brings visibility to Lambda by capturing traces, spans, and context across invocations and downstream services.**

AWS Lambda abstracts away infrastructure, but it also abstracts away visibility. When a function times out, throws an error, or runs slower than expected, you need observability to understand what happened. OpenTelemetry provides a vendor-neutral way to instrument Lambda functions, capturing distributed traces that flow from API Gateway through Lambda to databases, queues, and external APIs.

This guide covers practical patterns for adding OpenTelemetry to Lambda functions in Python and Node.js, with attention to the unique constraints of serverless environments.

---

## Why OpenTelemetry for Lambda?

Lambda functions have unique observability challenges:

- **Short-lived execution**: Functions may run for only a few milliseconds
- **Cold starts**: Initialization overhead affects first invocations
- **Distributed context**: Requests often span multiple functions and services
- **Limited logging**: CloudWatch logs alone lack correlation and structure

OpenTelemetry addresses these by:

1. Propagating trace context across function invocations
2. Capturing timing for cold starts vs warm executions
3. Correlating Lambda traces with upstream and downstream services
4. Providing structured attributes for filtering and analysis

---

## Lambda Layers for OpenTelemetry

AWS provides official OpenTelemetry Lambda layers that bundle the SDK, auto-instrumentation, and collector. Using layers avoids bloating your deployment package and simplifies updates.

### Available Layers

AWS maintains layers for multiple runtimes:

| Runtime | Layer ARN Pattern |
|---------|-------------------|
| Python 3.9+ | `arn:aws:lambda:{region}:901920570463:layer:aws-otel-python-{arch}-ver-1-25-0:1` |
| Node.js 18+ | `arn:aws:lambda:{region}:901920570463:layer:aws-otel-nodejs-{arch}-ver-1-18-1:1` |
| Java 11+ | `arn:aws:lambda:{region}:901920570463:layer:aws-otel-java-wrapper-{arch}-ver-1-32-0:1` |
| Collector | `arn:aws:lambda:{region}:901920570463:layer:aws-otel-collector-{arch}-ver-0-98-0:1` |

Replace `{region}` with your AWS region and `{arch}` with `amd64` or `arm64`.

### Adding Layers via CloudFormation

```yaml
# template.yaml (SAM/CloudFormation)
Resources:
  MyFunction:
    Type: AWS::Serverless::Function
    Properties:
      FunctionName: my-traced-function
      Runtime: python3.11
      Handler: app.handler
      # Attach OpenTelemetry layers for instrumentation
      Layers:
        # Python auto-instrumentation layer
        - arn:aws:lambda:us-east-1:901920570463:layer:aws-otel-python-amd64-ver-1-25-0:1
        # Collector layer for exporting telemetry
        - arn:aws:lambda:us-east-1:901920570463:layer:aws-otel-collector-amd64-ver-0-98-0:1
      Environment:
        Variables:
          # Enable the wrapper script that initializes OpenTelemetry
          AWS_LAMBDA_EXEC_WRAPPER: /opt/otel-instrument
          # Configure OTLP endpoint for trace export
          OTEL_EXPORTER_OTLP_ENDPOINT: https://oneuptime.com/otlp
          # Authentication token for OneUptime
          OTEL_EXPORTER_OTLP_HEADERS: x-oneuptime-token=your-token-here
          # Service name appears in trace visualizations
          OTEL_SERVICE_NAME: my-traced-function
```

### Adding Layers via Terraform

```hcl
# main.tf
resource "aws_lambda_function" "traced_function" {
  function_name = "my-traced-function"
  runtime       = "nodejs18.x"
  handler       = "index.handler"
  role          = aws_iam_role.lambda_role.arn
  filename      = "function.zip"

  # Attach OpenTelemetry layers
  layers = [
    # Node.js auto-instrumentation layer
    "arn:aws:lambda:us-east-1:901920570463:layer:aws-otel-nodejs-amd64-ver-1-18-1:1",
    # Collector layer for exporting telemetry
    "arn:aws:lambda:us-east-1:901920570463:layer:aws-otel-collector-amd64-ver-0-98-0:1"
  ]

  environment {
    variables = {
      # Enable the wrapper script that initializes OpenTelemetry
      AWS_LAMBDA_EXEC_WRAPPER      = "/opt/otel-instrument"
      # Configure OTLP endpoint for trace export
      OTEL_EXPORTER_OTLP_ENDPOINT  = "https://oneuptime.com/otlp"
      # Authentication token for OneUptime
      OTEL_EXPORTER_OTLP_HEADERS   = "x-oneuptime-token=your-token-here"
      # Service name appears in trace visualizations
      OTEL_SERVICE_NAME            = "my-traced-function"
    }
  }
}
```

---

## Auto-Instrumentation

The OpenTelemetry Lambda layers provide automatic instrumentation for common libraries. With auto-instrumentation enabled, traces are captured without code changes.

### Python Auto-Instrumentation

When using the Python layer with `AWS_LAMBDA_EXEC_WRAPPER=/opt/otel-instrument`, the following are automatically traced:

- Lambda handler invocations
- AWS SDK calls (DynamoDB, S3, SQS, SNS, etc.)
- HTTP requests via `requests`, `urllib3`, `httpx`
- Database calls via `psycopg2`, `pymysql`, `boto3`

```python
# app.py
# No OpenTelemetry imports needed - auto-instrumentation handles everything

import boto3
import requests

# Initialize AWS clients outside handler for connection reuse
dynamodb = boto3.resource('dynamodb')
table = dynamodb.Table('users')

def handler(event, context):
    """
    Lambda handler - automatically traced by OpenTelemetry layer.
    All AWS SDK and HTTP calls are captured as child spans.
    """
    # This DynamoDB call is automatically traced
    user = table.get_item(Key={'user_id': event['user_id']})

    # This HTTP request is automatically traced
    response = requests.get('https://api.example.com/enrich',
                           params={'id': event['user_id']})

    return {
        'statusCode': 200,
        'body': {
            'user': user.get('Item'),
            'enrichment': response.json()
        }
    }
```

### Node.js Auto-Instrumentation

The Node.js layer automatically instruments:

- Lambda handler invocations
- AWS SDK v2 and v3 calls
- HTTP/HTTPS requests
- Express, Fastify (if bundled)
- Database clients (pg, mysql2, mongodb)

```javascript
// index.js
// No OpenTelemetry imports needed - auto-instrumentation handles everything

const { DynamoDBClient, GetItemCommand } = require('@aws-sdk/client-dynamodb');

// Initialize client outside handler for connection reuse across invocations
const dynamodb = new DynamoDBClient({});

exports.handler = async (event) => {
  /**
   * Lambda handler - automatically traced by OpenTelemetry layer.
   * All AWS SDK and HTTP calls are captured as child spans.
   */

  // This DynamoDB call is automatically traced
  const result = await dynamodb.send(new GetItemCommand({
    TableName: 'users',
    Key: { user_id: { S: event.user_id } }
  }));

  // This fetch call is automatically traced
  const enrichment = await fetch(`https://api.example.com/enrich?id=${event.user_id}`);
  const enrichmentData = await enrichment.json();

  return {
    statusCode: 200,
    body: JSON.stringify({
      user: result.Item,
      enrichment: enrichmentData
    })
  };
};
```

---

## Manual Instrumentation

Auto-instrumentation captures external calls, but custom business logic benefits from manual spans. Manual instrumentation lets you add context-specific attributes and trace internal operations.

### Python Manual Instrumentation

```python
# app.py
from opentelemetry import trace
from opentelemetry.trace import SpanKind, Status, StatusCode
import boto3

# Get a tracer instance for creating custom spans
# The name identifies the instrumentation scope in trace visualizations
tracer = trace.get_tracer('order-processor', '1.0.0')

dynamodb = boto3.resource('dynamodb')
orders_table = dynamodb.Table('orders')

def handler(event, context):
    """Process an order with custom tracing for business logic."""

    # Create a span for the entire order processing workflow
    with tracer.start_as_current_span(
        'process_order',
        kind=SpanKind.SERVER,
        attributes={
            'order.id': event.get('order_id'),
            'order.item_count': len(event.get('items', []))
        }
    ) as span:
        try:
            # Validate order - creates a child span
            validate_order(event)

            # Calculate pricing - creates a child span
            total = calculate_pricing(event['items'])
            span.set_attribute('order.total', total)

            # Persist to DynamoDB - auto-instrumented, appears as child span
            orders_table.put_item(Item={
                'order_id': event['order_id'],
                'items': event['items'],
                'total': str(total),
                'status': 'confirmed'
            })

            # Add event to mark successful completion
            span.add_event('order.confirmed', {'total': total})

            return {'statusCode': 200, 'body': {'order_id': event['order_id'], 'total': total}}

        except ValueError as e:
            # Record validation errors with appropriate status
            span.set_status(Status(StatusCode.ERROR, str(e)))
            span.record_exception(e)
            return {'statusCode': 400, 'body': {'error': str(e)}}


def validate_order(event):
    """Validate order has required fields."""
    # Create a span for validation logic
    with tracer.start_as_current_span('validate_order') as span:
        if not event.get('order_id'):
            raise ValueError('Missing order_id')
        if not event.get('items'):
            raise ValueError('Missing items')

        span.set_attribute('validation.passed', True)


def calculate_pricing(items):
    """Calculate total price for order items."""
    # Create a span for pricing calculation
    with tracer.start_as_current_span(
        'calculate_pricing',
        attributes={'item_count': len(items)}
    ) as span:
        total = 0
        for item in items:
            # Add event for each pricing lookup
            span.add_event('price_lookup', {'sku': item['sku']})
            total += item.get('price', 0) * item.get('quantity', 1)

        span.set_attribute('calculated_total', total)
        return total
```

### Node.js Manual Instrumentation

```javascript
// index.js
const { trace, SpanKind, SpanStatusCode } = require('@opentelemetry/api');
const { DynamoDBClient, PutItemCommand } = require('@aws-sdk/client-dynamodb');

// Get a tracer instance for creating custom spans
// The name identifies the instrumentation scope in trace visualizations
const tracer = trace.getTracer('order-processor', '1.0.0');

const dynamodb = new DynamoDBClient({});

exports.handler = async (event) => {
  /**
   * Process an order with custom tracing for business logic.
   */

  // Create a span for the entire order processing workflow
  return tracer.startActiveSpan('process_order', {
    kind: SpanKind.SERVER,
    attributes: {
      'order.id': event.order_id,
      'order.item_count': event.items?.length || 0
    }
  }, async (span) => {
    try {
      // Validate order - creates a child span
      await validateOrder(event);

      // Calculate pricing - creates a child span
      const total = await calculatePricing(event.items);
      span.setAttribute('order.total', total);

      // Persist to DynamoDB - auto-instrumented, appears as child span
      await dynamodb.send(new PutItemCommand({
        TableName: 'orders',
        Item: {
          order_id: { S: event.order_id },
          items: { S: JSON.stringify(event.items) },
          total: { N: total.toString() },
          status: { S: 'confirmed' }
        }
      }));

      // Add event to mark successful completion
      span.addEvent('order.confirmed', { total });
      span.end();

      return { statusCode: 200, body: JSON.stringify({ order_id: event.order_id, total }) };

    } catch (error) {
      // Record errors with appropriate status
      span.setStatus({ code: SpanStatusCode.ERROR, message: error.message });
      span.recordException(error);
      span.end();

      return { statusCode: 400, body: JSON.stringify({ error: error.message }) };
    }
  });
};


async function validateOrder(event) {
  /**
   * Validate order has required fields.
   */
  return tracer.startActiveSpan('validate_order', async (span) => {
    if (!event.order_id) {
      span.end();
      throw new Error('Missing order_id');
    }
    if (!event.items || event.items.length === 0) {
      span.end();
      throw new Error('Missing items');
    }

    span.setAttribute('validation.passed', true);
    span.end();
  });
}


async function calculatePricing(items) {
  /**
   * Calculate total price for order items.
   */
  return tracer.startActiveSpan('calculate_pricing', {
    attributes: { item_count: items.length }
  }, async (span) => {
    let total = 0;

    for (const item of items) {
      // Add event for each pricing lookup
      span.addEvent('price_lookup', { sku: item.sku });
      total += (item.price || 0) * (item.quantity || 1);
    }

    span.setAttribute('calculated_total', total);
    span.end();
    return total;
  });
}
```

---

## Exporter Configuration

Lambda functions need efficient exporters that minimize latency impact. The collector layer handles batching and export, but you control where traces go.

### Environment Variables for Export

```bash
# Required: OTLP endpoint for trace export
OTEL_EXPORTER_OTLP_ENDPOINT=https://oneuptime.com/otlp

# Required: Authentication headers
OTEL_EXPORTER_OTLP_HEADERS=x-oneuptime-token=your-token-here

# Optional: Use HTTP/protobuf for smaller payloads
OTEL_EXPORTER_OTLP_PROTOCOL=http/protobuf

# Optional: Timeout for export requests (default 10s)
OTEL_EXPORTER_OTLP_TIMEOUT=5000

# Optional: Compression for reduced bandwidth
OTEL_EXPORTER_OTLP_COMPRESSION=gzip
```

### Custom Collector Configuration

For advanced scenarios, you can override the default collector configuration:

```yaml
# collector.yaml
# Place in your function's root directory

receivers:
  otlp:
    protocols:
      grpc:
        endpoint: localhost:4317
      http:
        endpoint: localhost:4318

processors:
  # Batch spans to reduce export overhead
  batch:
    timeout: 1s
    send_batch_size: 50

  # Add Lambda-specific resource attributes
  resource:
    attributes:
      - key: cloud.provider
        value: aws
        action: upsert
      - key: cloud.platform
        value: aws_lambda
        action: upsert

exporters:
  # Export to OneUptime via OTLP
  otlp:
    endpoint: https://oneuptime.com/otlp
    headers:
      x-oneuptime-token: ${ONEUPTIME_TOKEN}

service:
  pipelines:
    traces:
      receivers: [otlp]
      processors: [batch, resource]
      exporters: [otlp]
```

Set the environment variable to use your custom config:

```bash
OPENTELEMETRY_COLLECTOR_CONFIG_FILE=/var/task/collector.yaml
```

---

## Cold Start Tracing

Cold starts are a critical metric for Lambda performance. OpenTelemetry can distinguish between cold and warm invocations.

### Detecting Cold Starts

```python
# app.py
from opentelemetry import trace
import time

tracer = trace.get_tracer('cold-start-detector')

# Module-level variable tracks initialization
# This runs once during cold start
_init_time = time.time()
_is_cold_start = True

def handler(event, context):
    """Handler that tracks cold start vs warm invocation."""
    global _is_cold_start

    with tracer.start_as_current_span('lambda.invoke') as span:
        # Record whether this is a cold start
        span.set_attribute('faas.coldstart', _is_cold_start)

        if _is_cold_start:
            # Calculate initialization duration
            init_duration = time.time() - _init_time
            span.set_attribute('faas.init_duration_ms', int(init_duration * 1000))
            span.add_event('cold_start', {
                'init_duration_ms': int(init_duration * 1000)
            })
            # Mark as warm for subsequent invocations
            _is_cold_start = False

        # Add remaining execution time from context
        span.set_attribute(
            'faas.remaining_time_ms',
            context.get_remaining_time_in_millis()
        )

        # Your business logic here
        result = process_event(event)

        return result


def process_event(event):
    """Business logic processing."""
    with tracer.start_as_current_span('process_event'):
        # Simulated processing
        return {'processed': True}
```

### Node.js Cold Start Detection

```javascript
// index.js
const { trace } = require('@opentelemetry/api');

const tracer = trace.getTracer('cold-start-detector');

// Module-level variables track initialization
// These run once during cold start
const initTime = Date.now();
let isColdStart = true;

exports.handler = async (event, context) => {
  /**
   * Handler that tracks cold start vs warm invocation.
   */

  return tracer.startActiveSpan('lambda.invoke', async (span) => {
    // Record whether this is a cold start
    span.setAttribute('faas.coldstart', isColdStart);

    if (isColdStart) {
      // Calculate initialization duration
      const initDuration = Date.now() - initTime;
      span.setAttribute('faas.init_duration_ms', initDuration);
      span.addEvent('cold_start', { init_duration_ms: initDuration });
      // Mark as warm for subsequent invocations
      isColdStart = false;
    }

    // Add remaining execution time from context
    span.setAttribute(
      'faas.remaining_time_ms',
      context.getRemainingTimeInMillis()
    );

    // Your business logic here
    const result = await processEvent(event);

    span.end();
    return result;
  });
};


async function processEvent(event) {
  /**
   * Business logic processing.
   */
  return tracer.startActiveSpan('process_event', async (span) => {
    // Simulated processing
    span.end();
    return { processed: true };
  });
}
```

---

## X-Ray Integration

AWS X-Ray is the native tracing service for Lambda. OpenTelemetry can work alongside X-Ray or replace it entirely.

### Using OpenTelemetry with X-Ray Propagation

When upstream services use X-Ray, configure OpenTelemetry to understand X-Ray trace headers:

```python
# telemetry.py
from opentelemetry import trace
from opentelemetry.sdk.trace import TracerProvider
from opentelemetry.sdk.trace.export import BatchSpanProcessor
from opentelemetry.exporter.otlp.proto.http.trace_exporter import OTLPSpanExporter
from opentelemetry.propagators.aws import AwsXRayPropagator
from opentelemetry.propagate import set_global_textmap
from opentelemetry.sdk.resources import Resource

def configure_telemetry():
    """
    Configure OpenTelemetry to work with X-Ray trace context.
    Call this during Lambda initialization (cold start).
    """

    # Set X-Ray propagator to understand incoming X-Ray trace headers
    # This enables trace continuity from API Gateway, ALB, etc.
    set_global_textmap(AwsXRayPropagator())

    # Configure resource attributes
    resource = Resource.create({
        'service.name': 'order-service',
        'service.version': '1.0.0',
        'cloud.provider': 'aws',
        'cloud.platform': 'aws_lambda'
    })

    # Create tracer provider with OTLP exporter
    provider = TracerProvider(resource=resource)

    # Export to OneUptime
    exporter = OTLPSpanExporter(
        endpoint='https://oneuptime.com/otlp/v1/traces',
        headers={'x-oneuptime-token': 'your-token-here'}
    )

    # Use batch processor for efficiency
    provider.add_span_processor(BatchSpanProcessor(exporter))

    # Set as global tracer provider
    trace.set_tracer_provider(provider)


# Initialize during cold start
configure_telemetry()
```

### Sending Traces to Both X-Ray and OneUptime

For gradual migration or compliance requirements, export to both:

```yaml
# collector.yaml
receivers:
  otlp:
    protocols:
      grpc:
        endpoint: localhost:4317

exporters:
  # Send to OneUptime
  otlp/oneuptime:
    endpoint: https://oneuptime.com/otlp
    headers:
      x-oneuptime-token: ${ONEUPTIME_TOKEN}

  # Also send to X-Ray via AWS OTLP endpoint
  otlp/xray:
    endpoint: https://xray.${AWS_REGION}.amazonaws.com
    headers:
      # Uses Lambda execution role credentials automatically

service:
  pipelines:
    traces:
      receivers: [otlp]
      exporters: [otlp/oneuptime, otlp/xray]
```

### X-Ray ID Format Conversion

X-Ray uses a different trace ID format. The OpenTelemetry X-Ray ID generator creates compatible IDs:

```python
# telemetry.py
from opentelemetry.sdk.trace import TracerProvider
from opentelemetry.sdk.extension.aws.trace import AwsXRayIdGenerator

# Use X-Ray compatible ID generator
# This ensures trace IDs work when viewed in X-Ray console
provider = TracerProvider(
    id_generator=AwsXRayIdGenerator(),
    resource=Resource.create({'service.name': 'my-service'})
)

trace.set_tracer_provider(provider)
```

---

## Best Practices Summary

### Layer Management

- **Use AWS-managed layers** for production stability and automatic updates
- **Pin layer versions** in production to avoid unexpected changes
- **Test layer updates** in staging before rolling out

### Instrumentation Strategy

- **Start with auto-instrumentation** to capture external calls automatically
- **Add manual spans** for business-critical operations and custom logic
- **Avoid over-instrumentation** in tight loops or high-frequency paths

### Performance Optimization

- **Initialize outside the handler** to reuse connections across invocations
- **Use batch processors** to reduce export overhead
- **Set appropriate timeouts** to prevent trace export from delaying responses

### Context Propagation

- **Configure propagators** to match upstream services (W3C, X-Ray, or both)
- **Include trace context** in async invocations (SQS, SNS, EventBridge)
- **Test end-to-end traces** across service boundaries

### Attributes and Events

| Attribute | Example | Purpose |
|-----------|---------|---------|
| `faas.coldstart` | `true` | Identify cold vs warm invocations |
| `faas.execution` | `arn:aws:lambda:...` | Link to specific function version |
| `faas.trigger` | `http`, `sqs`, `s3` | Identify invocation source |
| `order.id` | `ord_123` | Business context for filtering |
| `error.type` | `ValidationError` | Categorize failures |

### Resource Attributes

Always set these resource attributes for Lambda functions:

```python
resource = Resource.create({
    'service.name': 'order-service',          # Your service name
    'service.version': '1.2.3',               # Deployment version
    'cloud.provider': 'aws',                  # Cloud provider
    'cloud.platform': 'aws_lambda',           # Platform type
    'cloud.region': os.environ['AWS_REGION'], # Deployment region
    'faas.name': os.environ['AWS_LAMBDA_FUNCTION_NAME'],
    'faas.version': os.environ['AWS_LAMBDA_FUNCTION_VERSION']
})
```

### Sampling for High-Volume Functions

For functions with high invocation rates, configure sampling to control costs:

```bash
# Sample 10% of traces
OTEL_TRACES_SAMPLER=parentbased_traceidratio
OTEL_TRACES_SAMPLER_ARG=0.1
```

---

## Troubleshooting

### No Traces Appearing

1. Verify `AWS_LAMBDA_EXEC_WRAPPER` is set to `/opt/otel-instrument`
2. Check OTLP endpoint and authentication headers
3. Ensure layers are attached in the correct order (instrumentation, then collector)
4. Review CloudWatch logs for OpenTelemetry errors

### High Latency

1. Reduce batch processor timeout
2. Enable compression (`OTEL_EXPORTER_OTLP_COMPRESSION=gzip`)
3. Use regional OTLP endpoints to reduce network latency
4. Check if cold start initialization is causing delays

### Missing Child Spans

1. Verify auto-instrumentation library versions match runtime
2. Check that AWS SDK calls happen within the traced context
3. Ensure async operations properly propagate context

---

## Conclusion

OpenTelemetry transforms Lambda observability from scattered CloudWatch logs into coherent distributed traces. By using AWS-managed layers, you get automatic instrumentation for AWS SDK calls and HTTP requests. Manual spans add visibility into business logic. X-Ray integration maintains compatibility with existing AWS tooling while exporting to any OTLP-compatible backend.

The key is starting simple: attach the layers, set environment variables, and deploy. Once traces flow, add manual spans where you need deeper insight into specific operations.

---

*Ready to visualize your Lambda traces? Send them to [OneUptime](https://oneuptime.com) via OTLP and correlate with metrics and logs for complete serverless observability.*
