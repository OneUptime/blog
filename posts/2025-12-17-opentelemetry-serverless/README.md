# OpenTelemetry for Serverless: Instrumenting AWS Lambda, Azure Functions, and Google Cloud Functions

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: OpenTelemetry, Serverless, AWS Lambda, Azure Functions, Cloud Functions, Observability, FaaS

Description: A comprehensive guide to instrumenting serverless functions with OpenTelemetry- handling cold starts, managing SDK lifecycle, and exporting telemetry from ephemeral compute environments.

---

> Serverless is observability on hard mode. Functions spin up, execute, and die in milliseconds- your telemetry strategy needs to match that reality.

This guide covers instrumenting serverless functions with OpenTelemetry across AWS Lambda, Azure Functions, and Google Cloud Functions, with strategies for the unique challenges of ephemeral compute.

---

## Table of Contents

1. Serverless Observability Challenges
2. AWS Lambda Instrumentation
3. Azure Functions Instrumentation
4. Google Cloud Functions Instrumentation
5. Cold Start Optimization
6. Context Propagation
7. Custom Spans and Metrics
8. Exporter Strategies
9. Lambda Layers and Extensions
10. Sampling for Serverless
11. Cost Optimization
12. Best Practices

---

## 1. Serverless Observability Challenges

### Unique constraints

| Challenge | Description | Impact |
|-----------|-------------|--------|
| Short-lived | Functions run milliseconds to minutes | SDK must initialize fast |
| Cold starts | First invocation pays initialization cost | Tracing adds to latency |
| No persistent state | Each invocation may be fresh | Can't batch across invocations |
| Billed by duration | Every millisecond costs money | Telemetry overhead matters |
| Concurrent instances | Many instances run simultaneously | High cardinality resources |

### What traditional APM gets wrong

```typescript
// Traditional approach - works for servers, fails for serverless
const sdk = new NodeSDK({
  // Expensive initialization on every cold start
  // Spans may not flush before function terminates
  // No awareness of invocation boundaries
});
sdk.start();
```

---

## 2. AWS Lambda Instrumentation

### Using the ADOT Lambda Layer

The AWS Distro for OpenTelemetry (ADOT) provides a pre-built Lambda layer.

```yaml
# SAM template
Resources:
  MyFunction:
    Type: AWS::Serverless::Function
    Properties:
      Handler: index.handler
      Runtime: nodejs18.x
      Layers:
        - !Sub arn:aws:lambda:${AWS::Region}:901920570463:layer:aws-otel-nodejs-amd64-ver-1-18-1:1
      Environment:
        Variables:
          AWS_LAMBDA_EXEC_WRAPPER: /opt/otel-handler
          OTEL_SERVICE_NAME: my-lambda-function
          OTEL_EXPORTER_OTLP_ENDPOINT: https://oneuptime.com/otlp
          OTEL_EXPORTER_OTLP_HEADERS: x-oneuptime-token=your-token
```

### Manual instrumentation (Node.js)

```typescript
// handler.ts
import { NodeSDK } from '@opentelemetry/sdk-node';
import { getNodeAutoInstrumentations } from '@opentelemetry/auto-instrumentations-node';
import { OTLPTraceExporter } from '@opentelemetry/exporter-otlp-http';
import { Resource } from '@opentelemetry/resources';
import { AwsLambdaInstrumentation } from '@opentelemetry/instrumentation-aws-lambda';
import { AwsInstrumentation } from '@opentelemetry/instrumentation-aws-sdk';
import { trace, context, SpanStatusCode } from '@opentelemetry/api';

// Initialize SDK OUTSIDE handler (runs once per cold start)
const sdk = new NodeSDK({
  resource: new Resource({
    'service.name': process.env.AWS_LAMBDA_FUNCTION_NAME,
    'service.version': process.env.AWS_LAMBDA_FUNCTION_VERSION,
    'faas.name': process.env.AWS_LAMBDA_FUNCTION_NAME,
    'cloud.provider': 'aws',
    'cloud.region': process.env.AWS_REGION,
  }),
  traceExporter: new OTLPTraceExporter({
    url: process.env.OTEL_EXPORTER_OTLP_ENDPOINT + '/v1/traces',
    headers: {
      'x-oneuptime-token': process.env.ONEUPTIME_TOKEN || '',
    },
  }),
  instrumentations: [
    getNodeAutoInstrumentations({
      '@opentelemetry/instrumentation-fs': { enabled: false },
    }),
    new AwsLambdaInstrumentation({
      disableAwsContextPropagation: false,
    }),
    new AwsInstrumentation({
      suppressInternalInstrumentation: true,
    }),
  ],
});

sdk.start();

const tracer = trace.getTracer('lambda-handler');

// Handler function
export const handler = async (event: any, context: any) => {
  const span = trace.getActiveSpan();

  // Add Lambda-specific attributes
  span?.setAttributes({
    'faas.invocation_id': context.awsRequestId,
    'faas.coldstart': !global.__OTEL_COLD_START_DONE,
    'faas.trigger': detectTriggerType(event),
  });

  global.__OTEL_COLD_START_DONE = true;

  try {
    const result = await processEvent(event);

    span?.setStatus({ code: SpanStatusCode.OK });
    return result;
  } catch (error) {
    span?.recordException(error);
    span?.setStatus({ code: SpanStatusCode.ERROR, message: error.message });
    throw error;
  } finally {
    // Ensure spans are flushed before Lambda freezes
    await sdk.shutdown();
  }
};

function detectTriggerType(event: any): string {
  if (event.Records?.[0]?.eventSource === 'aws:sqs') return 'sqs';
  if (event.Records?.[0]?.eventSource === 'aws:sns') return 'sns';
  if (event.Records?.[0]?.eventSource === 'aws:s3') return 's3';
  if (event.Records?.[0]?.kinesis) return 'kinesis';
  if (event.requestContext?.http) return 'http';
  if (event.requestContext?.apiId) return 'apigateway';
  return 'other';
}

async function processEvent(event: any) {
  return tracer.startActiveSpan('process.event', async (span) => {
    span.setAttribute('event.type', typeof event);

    // Business logic here
    const result = await doWork(event);

    span.end();
    return result;
  });
}
```

### Python Lambda

```python
# handler.py
import os
from opentelemetry import trace
from opentelemetry.sdk.trace import TracerProvider
from opentelemetry.sdk.trace.export import BatchSpanProcessor
from opentelemetry.exporter.otlp.proto.http.trace_exporter import OTLPSpanExporter
from opentelemetry.sdk.resources import Resource, SERVICE_NAME
from opentelemetry.instrumentation.aws_lambda import AwsLambdaInstrumentor
from opentelemetry.instrumentation.botocore import BotocoreInstrumentor

# Initialize outside handler
resource = Resource.create({
    SERVICE_NAME: os.environ.get('AWS_LAMBDA_FUNCTION_NAME', 'unknown'),
    'faas.name': os.environ.get('AWS_LAMBDA_FUNCTION_NAME'),
    'cloud.provider': 'aws',
    'cloud.region': os.environ.get('AWS_REGION'),
})

provider = TracerProvider(resource=resource)
processor = BatchSpanProcessor(OTLPSpanExporter(
    endpoint=os.environ.get('OTEL_EXPORTER_OTLP_ENDPOINT', '') + '/v1/traces',
    headers={'x-oneuptime-token': os.environ.get('ONEUPTIME_TOKEN', '')},
))
provider.add_span_processor(processor)
trace.set_tracer_provider(provider)

# Instrument
AwsLambdaInstrumentor().instrument()
BotocoreInstrumentor().instrument()

tracer = trace.get_tracer(__name__)
_cold_start = True

def handler(event, context):
    global _cold_start

    with tracer.start_as_current_span('lambda.handler') as span:
        span.set_attributes({
            'faas.invocation_id': context.aws_request_id,
            'faas.coldstart': _cold_start,
        })
        _cold_start = False

        try:
            result = process_event(event)
            return result
        except Exception as e:
            span.record_exception(e)
            raise
        finally:
            # Force flush before freeze
            provider.force_flush()

def process_event(event):
    with tracer.start_as_current_span('process.event') as span:
        # Business logic
        return {'statusCode': 200, 'body': 'OK'}
```

---

## 3. Azure Functions Instrumentation

### Node.js with Azure Functions

```typescript
// src/functions/httpTrigger.ts
import { app, HttpRequest, HttpResponseInit, InvocationContext } from '@azure/functions';
import { NodeSDK } from '@opentelemetry/sdk-node';
import { OTLPTraceExporter } from '@opentelemetry/exporter-otlp-http';
import { Resource } from '@opentelemetry/resources';
import { trace, SpanStatusCode } from '@opentelemetry/api';

// Initialize once
const sdk = new NodeSDK({
  resource: new Resource({
    'service.name': process.env.WEBSITE_SITE_NAME || 'azure-function',
    'cloud.provider': 'azure',
    'cloud.platform': 'azure_functions',
    'faas.name': process.env.WEBSITE_SITE_NAME,
  }),
  traceExporter: new OTLPTraceExporter({
    url: process.env.OTEL_EXPORTER_OTLP_ENDPOINT + '/v1/traces',
    headers: {
      'x-oneuptime-token': process.env.ONEUPTIME_TOKEN || '',
    },
  }),
});

sdk.start();

const tracer = trace.getTracer('azure-function');
let coldStart = true;

export async function httpTrigger(request: HttpRequest, context: InvocationContext): Promise<HttpResponseInit> {
  return tracer.startActiveSpan('http.trigger', async (span) => {
    span.setAttributes({
      'faas.invocation_id': context.invocationId,
      'faas.coldstart': coldStart,
      'http.method': request.method,
      'http.url': request.url,
    });
    coldStart = false;

    try {
      const body = await request.text();
      const result = await processRequest(body);

      span.setStatus({ code: SpanStatusCode.OK });
      return { body: JSON.stringify(result) };
    } catch (error: any) {
      span.recordException(error);
      span.setStatus({ code: SpanStatusCode.ERROR, message: error.message });
      return { status: 500, body: error.message };
    } finally {
      span.end();
      // Flush spans
      await sdk.shutdown();
    }
  });
}

app.http('httpTrigger', {
  methods: ['GET', 'POST'],
  authLevel: 'anonymous',
  handler: httpTrigger,
});
```

### Python with Azure Functions

```python
# function_app.py
import azure.functions as func
import os
from opentelemetry import trace
from opentelemetry.sdk.trace import TracerProvider
from opentelemetry.sdk.trace.export import BatchSpanProcessor
from opentelemetry.exporter.otlp.proto.http.trace_exporter import OTLPSpanExporter
from opentelemetry.sdk.resources import Resource

# Initialize
resource = Resource.create({
    'service.name': os.environ.get('WEBSITE_SITE_NAME', 'azure-function'),
    'cloud.provider': 'azure',
    'cloud.platform': 'azure_functions',
})

provider = TracerProvider(resource=resource)
provider.add_span_processor(BatchSpanProcessor(OTLPSpanExporter(
    endpoint=os.environ.get('OTEL_EXPORTER_OTLP_ENDPOINT', '') + '/v1/traces',
    headers={'x-oneuptime-token': os.environ.get('ONEUPTIME_TOKEN', '')},
)))
trace.set_tracer_provider(provider)

tracer = trace.get_tracer(__name__)
_cold_start = True

app = func.FunctionApp()

@app.function_name(name="HttpTrigger")
@app.route(route="hello")
def http_trigger(req: func.HttpRequest) -> func.HttpResponse:
    global _cold_start

    with tracer.start_as_current_span('http.trigger') as span:
        span.set_attributes({
            'faas.coldstart': _cold_start,
            'http.method': req.method,
            'http.url': req.url,
        })
        _cold_start = False

        try:
            name = req.params.get('name', 'World')
            return func.HttpResponse(f"Hello, {name}!")
        except Exception as e:
            span.record_exception(e)
            return func.HttpResponse(str(e), status_code=500)
        finally:
            provider.force_flush()
```

---

## 4. Google Cloud Functions Instrumentation

### Node.js Cloud Function

```typescript
// index.ts
import { NodeSDK } from '@opentelemetry/sdk-node';
import { OTLPTraceExporter } from '@opentelemetry/exporter-otlp-http';
import { Resource } from '@opentelemetry/resources';
import { trace, SpanStatusCode } from '@opentelemetry/api';
import { HttpFunction } from '@google-cloud/functions-framework';

// Initialize SDK
const sdk = new NodeSDK({
  resource: new Resource({
    'service.name': process.env.FUNCTION_NAME || process.env.K_SERVICE || 'gcp-function',
    'cloud.provider': 'gcp',
    'cloud.platform': 'gcp_cloud_functions',
    'faas.name': process.env.FUNCTION_NAME || process.env.K_SERVICE,
    'faas.version': process.env.K_REVISION,
  }),
  traceExporter: new OTLPTraceExporter({
    url: process.env.OTEL_EXPORTER_OTLP_ENDPOINT + '/v1/traces',
    headers: {
      'x-oneuptime-token': process.env.ONEUPTIME_TOKEN || '',
    },
  }),
});

sdk.start();

const tracer = trace.getTracer('gcp-function');
let coldStart = true;

export const helloHttp: HttpFunction = async (req, res) => {
  return tracer.startActiveSpan('http.function', async (span) => {
    span.setAttributes({
      'faas.coldstart': coldStart,
      'faas.execution_id': req.headers['function-execution-id'],
      'http.method': req.method,
      'http.url': req.url,
    });
    coldStart = false;

    try {
      const result = await processRequest(req.body);
      span.setStatus({ code: SpanStatusCode.OK });
      res.json(result);
    } catch (error: any) {
      span.recordException(error);
      span.setStatus({ code: SpanStatusCode.ERROR });
      res.status(500).send(error.message);
    } finally {
      span.end();
      // GCP functions have shorter timeouts, flush aggressively
      await sdk.shutdown();
    }
  });
};
```

### Python Cloud Function

```python
# main.py
import functions_framework
import os
from opentelemetry import trace
from opentelemetry.sdk.trace import TracerProvider
from opentelemetry.sdk.trace.export import BatchSpanProcessor
from opentelemetry.exporter.otlp.proto.http.trace_exporter import OTLPSpanExporter
from opentelemetry.sdk.resources import Resource

# Initialize
resource = Resource.create({
    'service.name': os.environ.get('FUNCTION_NAME', os.environ.get('K_SERVICE', 'gcp-function')),
    'cloud.provider': 'gcp',
    'cloud.platform': 'gcp_cloud_functions',
})

provider = TracerProvider(resource=resource)
provider.add_span_processor(BatchSpanProcessor(OTLPSpanExporter(
    endpoint=os.environ.get('OTEL_EXPORTER_OTLP_ENDPOINT', '') + '/v1/traces',
    headers={'x-oneuptime-token': os.environ.get('ONEUPTIME_TOKEN', '')},
)))
trace.set_tracer_provider(provider)

tracer = trace.get_tracer(__name__)
_cold_start = True

@functions_framework.http
def hello_http(request):
    global _cold_start

    with tracer.start_as_current_span('http.function') as span:
        span.set_attributes({
            'faas.coldstart': _cold_start,
            'http.method': request.method,
        })
        _cold_start = False

        try:
            name = request.args.get('name', 'World')
            return f'Hello, {name}!'
        except Exception as e:
            span.record_exception(e)
            return str(e), 500
        finally:
            provider.force_flush()
```

---

## 5. Cold Start Optimization

### Lazy initialization

```typescript
let sdkInitialized = false;
let sdk: NodeSDK;

function ensureSdkInitialized() {
  if (sdkInitialized) return;

  sdk = new NodeSDK({
    // Minimal configuration for fast init
    traceExporter: new OTLPTraceExporter({
      url: process.env.OTEL_EXPORTER_OTLP_ENDPOINT,
    }),
    // Disable expensive auto-instrumentations
    instrumentations: [
      // Only essential instrumentations
      new AwsLambdaInstrumentation(),
    ],
  });

  sdk.start();
  sdkInitialized = true;
}

export const handler = async (event, context) => {
  ensureSdkInitialized();
  // ... rest of handler
};
```

### Measuring cold start impact

```typescript
const initStart = Date.now();

// SDK initialization
const sdk = new NodeSDK({ /* ... */ });
sdk.start();

const initDuration = Date.now() - initStart;
console.log(`SDK init took ${initDuration}ms`);

export const handler = async (event, context) => {
  const span = trace.getActiveSpan();
  span?.setAttribute('faas.init_duration_ms', initDuration);
  // ...
};
```

### Warm-up strategies

```typescript
// Use provisioned concurrency (AWS) or min instances (GCP/Azure)
// Pre-warm SDK in handler initialization

// Also consider: lightweight exporters for cold paths
const exporter = process.env.COLD_START_OPTIMIZATION === 'true'
  ? new ConsoleSpanExporter() // Fast, but loses data
  : new OTLPTraceExporter({ /* ... */ }); // Full telemetry
```

---

## 6. Context Propagation

### API Gateway to Lambda

```typescript
// Extract context from API Gateway event
import { propagation, context } from '@opentelemetry/api';

function extractContext(event: any): Context {
  // API Gateway passes headers in event
  const headers = event.headers || {};

  return propagation.extract(context.active(), headers, {
    get: (carrier, key) => carrier[key.toLowerCase()],
    keys: (carrier) => Object.keys(carrier),
  });
}

export const handler = async (event, lambdaContext) => {
  const parentContext = extractContext(event);

  return context.with(parentContext, async () => {
    // Spans are now connected to upstream trace
    return tracer.startActiveSpan('handler', async (span) => {
      // ...
    });
  });
};
```

### SQS/SNS trigger context

```typescript
// Extract context from SQS message attributes
function extractFromSQS(record: any): Context {
  const attributes = record.messageAttributes || {};

  const carrier: Record<string, string> = {};
  if (attributes.traceparent) {
    carrier.traceparent = attributes.traceparent.stringValue;
  }
  if (attributes.tracestate) {
    carrier.tracestate = attributes.tracestate.stringValue;
  }

  return propagation.extract(context.active(), carrier);
}

export const sqsHandler = async (event) => {
  for (const record of event.Records) {
    const parentContext = extractFromSQS(record);

    await context.with(parentContext, async () => {
      await tracer.startActiveSpan('sqs.process', async (span) => {
        span.setAttribute('messaging.message_id', record.messageId);
        await processMessage(JSON.parse(record.body));
        span.end();
      });
    });
  }
};
```

---

## 7. Custom Spans and Metrics

### Adding business context

```typescript
export const handler = async (event, context) => {
  return tracer.startActiveSpan('order.process', async (span) => {
    // FaaS attributes
    span.setAttributes({
      'faas.invocation_id': context.awsRequestId,
      'faas.coldstart': !global.__warm,
      'faas.trigger': 'apigateway',
    });
    global.__warm = true;

    // Business attributes
    const order = JSON.parse(event.body);
    span.setAttributes({
      'order.id': order.id,
      'order.items': order.items.length,
      'order.total': order.total,
      'order.customer_tier': order.customerTier,
    });

    // Child spans for stages
    await tracer.startActiveSpan('order.validate', async (validateSpan) => {
      await validateOrder(order);
      validateSpan.end();
    });

    await tracer.startActiveSpan('order.charge', async (chargeSpan) => {
      chargeSpan.setAttribute('payment.method', order.paymentMethod);
      await chargeCustomer(order);
      chargeSpan.end();
    });

    span.addEvent('order.completed');
    return { statusCode: 200, body: JSON.stringify({ success: true }) };
  });
};
```

### Serverless metrics

```typescript
import { metrics } from '@opentelemetry/api';

const meter = metrics.getMeter('serverless-metrics');

const invocationCounter = meter.createCounter('faas.invocations', {
  description: 'Number of function invocations',
});

const coldStartCounter = meter.createCounter('faas.coldstarts', {
  description: 'Number of cold starts',
});

const durationHistogram = meter.createHistogram('faas.duration', {
  description: 'Function execution duration',
  unit: 'ms',
});

export const handler = async (event, context) => {
  const start = Date.now();
  const isColdStart = !global.__warm;
  global.__warm = true;

  invocationCounter.add(1, { 'faas.trigger': 'http' });
  if (isColdStart) {
    coldStartCounter.add(1);
  }

  try {
    return await processEvent(event);
  } finally {
    durationHistogram.record(Date.now() - start, {
      'faas.coldstart': isColdStart,
    });
  }
};
```

---

## 8. Exporter Strategies

### Sync vs async export

```typescript
// PROBLEM: Async export may not complete before freeze
const asyncExporter = new OTLPTraceExporter({ /* ... */ });
// Spans might be lost if function freezes

// SOLUTION 1: Force flush before return
export const handler = async (event, context) => {
  try {
    return await processEvent(event);
  } finally {
    await sdk.forceFlush();
  }
};

// SOLUTION 2: Use Lambda extension for async export
// The ADOT Lambda layer handles this automatically
```

### Using Lambda extensions

```yaml
# Lambda with ADOT Collector extension
Resources:
  MyFunction:
    Properties:
      Layers:
        # ADOT layer includes collector extension
        - arn:aws:lambda:us-east-1:901920570463:layer:aws-otel-collector-amd64-ver-0-88-0:1
      Environment:
        Variables:
          # SDK sends to local collector
          OTEL_EXPORTER_OTLP_ENDPOINT: http://localhost:4317
          # Collector forwards to backend
          OTEL_COLLECTOR_CONFIG_FILE: /var/task/collector.yaml
```

### Collector sidecar config

```yaml
# collector.yaml (bundled with Lambda)
receivers:
  otlp:
    protocols:
      grpc:
        endpoint: localhost:4317
      http:
        endpoint: localhost:4318

exporters:
  otlphttp:
    endpoint: https://oneuptime.com/otlp
    headers:
      x-oneuptime-token: ${ONEUPTIME_TOKEN}

service:
  pipelines:
    traces:
      receivers: [otlp]
      exporters: [otlphttp]
```

---

## 9. Lambda Layers and Extensions

### Building a custom layer

```dockerfile
# Dockerfile for layer
FROM public.ecr.aws/lambda/nodejs:18

# Install OpenTelemetry packages
RUN npm install \
  @opentelemetry/api \
  @opentelemetry/sdk-node \
  @opentelemetry/exporter-otlp-http \
  @opentelemetry/instrumentation-aws-lambda \
  --prefix /opt/nodejs

# Copy wrapper script
COPY otel-handler.sh /opt/otel-handler
RUN chmod +x /opt/otel-handler
```

```bash
# otel-handler.sh - wrapper script
#!/bin/bash
export NODE_OPTIONS="${NODE_OPTIONS} --require /opt/nodejs/node_modules/@opentelemetry/auto-instrumentations-node/register"
exec "$@"
```

### Using pre-built layers

```typescript
// Available ADOT Lambda layers by region
const ADOT_LAYERS = {
  'us-east-1': 'arn:aws:lambda:us-east-1:901920570463:layer:aws-otel-nodejs-amd64-ver-1-18-1:1',
  'us-west-2': 'arn:aws:lambda:us-west-2:901920570463:layer:aws-otel-nodejs-amd64-ver-1-18-1:1',
  'eu-west-1': 'arn:aws:lambda:eu-west-1:901920570463:layer:aws-otel-nodejs-amd64-ver-1-18-1:1',
  // ... other regions
};
```

---

## 10. Sampling for Serverless

### Aggressive head sampling

```typescript
import { ParentBasedSampler, TraceIdRatioBasedSampler } from '@opentelemetry/sdk-trace-base';

// Lower sampling rate for high-volume functions
const sampler = new ParentBasedSampler({
  root: new TraceIdRatioBasedSampler(0.01), // 1% of cold requests
});

// But always sample errors
class ServerlessSampler {
  shouldSample(context, traceId, name, kind, attributes) {
    // Always sample errors
    if (attributes?.['error'] || attributes?.['faas.error']) {
      return { decision: SamplingDecision.RECORD_AND_SAMPLE };
    }

    // Always sample cold starts
    if (attributes?.['faas.coldstart']) {
      return { decision: SamplingDecision.RECORD_AND_SAMPLE };
    }

    // Sample 1% of normal invocations
    return new TraceIdRatioBasedSampler(0.01).shouldSample(
      context, traceId, name, kind, attributes
    );
  }
}
```

---

## 11. Cost Optimization

### Telemetry cost model

| Component | Cost Driver | Optimization |
|-----------|-------------|--------------|
| SDK init | Cold start latency | Use layers, lazy init |
| Span export | Network + time | Batch, compress |
| Collector | Lambda duration | Use extensions |
| Backend ingestion | Span volume | Sample aggressively |

### Right-sizing telemetry

```typescript
// Development: full visibility
const devConfig = {
  sampler: new AlwaysOnSampler(),
  instrumentations: getNodeAutoInstrumentations(),
};

// Production: optimized for cost
const prodConfig = {
  sampler: new ParentBasedSampler({
    root: new TraceIdRatioBasedSampler(0.05), // 5%
  }),
  instrumentations: [
    // Only critical instrumentations
    new AwsLambdaInstrumentation(),
    new HttpInstrumentation(),
  ],
};
```

---

## 12. Best Practices

### Serverless observability checklist

| Practice | Why |
|----------|-----|
| Initialize SDK outside handler | Reuse across warm invocations |
| Track cold starts | Understand init overhead |
| Flush before return | Prevent span loss |
| Use extensions/layers | Offload export work |
| Sample aggressively | Control costs |
| Propagate context | Connect distributed traces |
| Add business attributes | Make traces actionable |

### Complete example

```typescript
// Optimized Lambda handler template
import { NodeSDK } from '@opentelemetry/sdk-node';
import { trace, context, SpanStatusCode, propagation } from '@opentelemetry/api';

// Global initialization (once per cold start)
const sdk = initializeSdk();
const tracer = trace.getTracer('lambda');
let warmStart = false;

function initializeSdk() {
  const sdk = new NodeSDK({ /* config */ });
  sdk.start();
  return sdk;
}

export const handler = async (event: any, ctx: any) => {
  // Extract parent context
  const parentCtx = propagation.extract(context.active(), event.headers || {});

  return context.with(parentCtx, async () => {
    return tracer.startActiveSpan('lambda.handler', async (span) => {
      // Standard FaaS attributes
      span.setAttributes({
        'faas.invocation_id': ctx.awsRequestId,
        'faas.coldstart': !warmStart,
        'faas.name': ctx.functionName,
        'faas.version': ctx.functionVersion,
      });
      warmStart = true;

      try {
        const result = await processEvent(event);
        span.setStatus({ code: SpanStatusCode.OK });
        return formatResponse(200, result);
      } catch (error: any) {
        span.recordException(error);
        span.setStatus({ code: SpanStatusCode.ERROR, message: error.message });
        return formatResponse(500, { error: error.message });
      } finally {
        span.end();
        await sdk.forceFlush();
      }
    });
  });
};
```

---

## Summary

| Platform | Layer/Extension | Key Consideration |
|----------|-----------------|-------------------|
| AWS Lambda | ADOT Layer | Use Lambda extension for async export |
| Azure Functions | Manual SDK | Shorter timeouts, flush aggressively |
| GCP Cloud Functions | Manual SDK | Leverage Cloud Trace integration |

Serverless observability requires understanding the ephemeral nature of functions. Initialize once, flush always, sample wisely, and use platform-specific optimizations.

---

*Ready to observe your serverless functions? Send telemetry to [OneUptime](https://oneuptime.com) and see cold starts, errors, and performance in one place.*

---

### See Also

- [Resource Detection in OpenTelemetry](/blog/post/2025-12-17-opentelemetry-resource-detection/)
- [OpenTelemetry Sampling Strategies](/blog/post/2025-08-25-how-to-reduce-noise-in-opentelemetry/)
- [OTLP Protocol Explained](/blog/post/2025-12-17-opentelemetry-otlp-protocol-explained/)
