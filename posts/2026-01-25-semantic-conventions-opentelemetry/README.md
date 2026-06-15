# How to Implement Semantic Conventions in OpenTelemetry

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: OpenTelemetry, Semantic Conventions, Attribute, Naming Standards, Observability, Best Practice

Description: Learn how to implement OpenTelemetry semantic conventions for consistent attribute naming across your telemetry data.

---

Semantic conventions are standardized naming rules for telemetry attributes. When everyone uses the same names for the same concepts, dashboards, queries, and alerts work across different services and languages without translation.

This guide covers implementing OpenTelemetry semantic conventions to ensure consistency across your observability data.

## Why Semantic Conventions Matter

Without conventions, teams independently choose attribute names:

```text
# Team A

service: "payment-api"
request_path: "/api/charge"
response_code: 200

# Team B
service_name: "user-service"
http.route: "/users"
status: "200"

# Team C
svc: "order-processor"
endpoint: "/orders"
http_status: 200
```

Querying across these services becomes painful. With semantic conventions, everyone uses:

```text
service.name: "payment-api"
http.route: "/api/charge"
http.response.status_code: 200
```

## Core Resource Attributes

Resource attributes describe the entity producing telemetry. These should be set once at SDK initialization.

### Node.js Resource Setup

```javascript
// resource.js
const { resourceFromAttributes } = require('@opentelemetry/resources');
const {
  ATTR_DEPLOYMENT_ENVIRONMENT_NAME,
  ATTR_HOST_NAME,
  ATTR_PROCESS_PID,
  ATTR_PROCESS_RUNTIME_NAME,
  ATTR_PROCESS_RUNTIME_VERSION,
  ATTR_SERVICE_INSTANCE_ID,
  ATTR_SERVICE_NAME,
  ATTR_SERVICE_VERSION
} = require('@opentelemetry/semantic-conventions/incubating');
const os = require('os');
const { v4: uuidv4 } = require('uuid');

// Create resource with semantic convention attributes
function createResource() {
  return resourceFromAttributes({
    // Service identification
    [ATTR_SERVICE_NAME]: process.env.OTEL_SERVICE_NAME || 'unknown-service',
    [ATTR_SERVICE_VERSION]: process.env.npm_package_version || '0.0.0',
    [ATTR_SERVICE_INSTANCE_ID]: process.env.POD_NAME || uuidv4(),

    // Deployment context
    [ATTR_DEPLOYMENT_ENVIRONMENT_NAME]: process.env.DEPLOY_ENV || 'development',

    // Host information
    [ATTR_HOST_NAME]: os.hostname(),

    // Process information
    [ATTR_PROCESS_PID]: process.pid,
    [ATTR_PROCESS_RUNTIME_NAME]: 'nodejs',
    [ATTR_PROCESS_RUNTIME_VERSION]: process.version,

    // Custom attributes (use namespacing)
    'mycompany.team': process.env.TEAM_NAME || 'platform',
    'mycompany.cost_center': process.env.COST_CENTER || 'engineering'
  });
}

module.exports = { createResource };
```

### Python Resource Setup

```python
# resource.py
import os
import socket
import uuid
from opentelemetry.sdk.resources import Resource
from opentelemetry.semconv.attributes.deployment_attributes import DEPLOYMENT_ENVIRONMENT_NAME
from opentelemetry.semconv.attributes.host_attributes import HOST_NAME
from opentelemetry.semconv.attributes.process_attributes import (
    PROCESS_PID,
    PROCESS_RUNTIME_NAME,
    PROCESS_RUNTIME_VERSION,
)
from opentelemetry.semconv.attributes.service_attributes import (
    SERVICE_INSTANCE_ID,
    SERVICE_NAME,
    SERVICE_VERSION,
)

def create_resource():
    """
    Create a resource with semantic convention attributes.
    Call this when initializing the tracer/meter providers.
    """
    return Resource.create({
        # Service identification
        SERVICE_NAME: os.getenv("OTEL_SERVICE_NAME", "unknown-service"),
        SERVICE_VERSION: os.getenv("SERVICE_VERSION", "0.0.0"),
        SERVICE_INSTANCE_ID: os.getenv("POD_NAME", str(uuid.uuid4())),

        # Deployment context
        DEPLOYMENT_ENVIRONMENT_NAME: os.getenv("DEPLOY_ENV", "development"),

        # Host information
        HOST_NAME: socket.gethostname(),

        # Process information
        PROCESS_PID: os.getpid(),
        PROCESS_RUNTIME_NAME: "python",
        PROCESS_RUNTIME_VERSION: os.sys.version.split()[0],

        # Custom attributes with namespace
        "mycompany.team": os.getenv("TEAM_NAME", "platform"),
        "mycompany.cost_center": os.getenv("COST_CENTER", "engineering")
    })
```

## HTTP Semantic Conventions

HTTP is one of the most common protocols to instrument. Use these attributes consistently.

### HTTP Server Spans

```javascript
// http-server-instrumentation.js
const { context, trace, SpanKind, SpanStatusCode } = require('@opentelemetry/api');
const {
  ATTR_CLIENT_ADDRESS,
  ATTR_HTTP_REQUEST_BODY_SIZE,
  ATTR_HTTP_REQUEST_METHOD,
  ATTR_HTTP_RESPONSE_BODY_SIZE,
  ATTR_HTTP_RESPONSE_STATUS_CODE,
  ATTR_HTTP_ROUTE,
  ATTR_SERVER_ADDRESS,
  ATTR_SERVER_PORT,
  ATTR_URL_PATH,
  ATTR_URL_QUERY,
  ATTR_URL_SCHEME,
  ATTR_USER_AGENT_ORIGINAL
} = require('@opentelemetry/semantic-conventions/incubating');

const tracer = trace.getTracer('http-server');

function instrumentedHandler(req, res, next) {
  const spanName = req.route?.path ? `${req.method} ${req.route.path}` : req.method;
  const span = tracer.startSpan(spanName, {
    kind: SpanKind.SERVER,
    attributes: {
      // Required attributes
      [ATTR_HTTP_REQUEST_METHOD]: req.method,
      [ATTR_URL_SCHEME]: req.protocol,
      [ATTR_URL_PATH]: req.path,

      // Recommended attributes
      [ATTR_HTTP_ROUTE]: req.route?.path,
      [ATTR_URL_QUERY]: req.query ? new URLSearchParams(req.query).toString() : undefined,
      [ATTR_SERVER_ADDRESS]: req.hostname,
      [ATTR_SERVER_PORT]: req.socket.localPort,
      [ATTR_USER_AGENT_ORIGINAL]: req.get('user-agent'),
      [ATTR_CLIENT_ADDRESS]: req.ip,
      [ATTR_HTTP_REQUEST_BODY_SIZE]: Number(req.get('content-length')) || undefined
    }
  });

  // Capture response attributes
  res.on('finish', () => {
    span.setAttribute(ATTR_HTTP_RESPONSE_STATUS_CODE, res.statusCode);
    const responseLength = Number(res.get('content-length'));
    if (!Number.isNaN(responseLength)) {
      span.setAttribute(ATTR_HTTP_RESPONSE_BODY_SIZE, responseLength);
    }

    // Set span status based on HTTP status code
    if (res.statusCode >= 500) {
      span.setStatus({
        code: SpanStatusCode.ERROR
      });
    }

    span.end();
  });

  context.with(trace.setSpan(context.active(), span), next);
}
```

### HTTP Client Spans

```python
# http_client_instrumentation.py
import requests
from opentelemetry import trace
from opentelemetry.trace import SpanKind, Status, StatusCode
from opentelemetry.semconv.attributes.http_attributes import (
    HTTP_REQUEST_METHOD,
    HTTP_RESPONSE_STATUS_CODE,
)
from opentelemetry.semconv.attributes.server_attributes import SERVER_ADDRESS, SERVER_PORT
from opentelemetry.semconv.attributes.url_attributes import URL_FULL, URL_SCHEME

tracer = trace.get_tracer("http-client")

def make_request(method, url, **kwargs):
    """
    Make an HTTP request with proper semantic conventions.
    """
    from urllib.parse import urlparse
    parsed = urlparse(url)

    with tracer.start_as_current_span(
        method,
        kind=SpanKind.CLIENT,
        attributes={
            # Required attributes
            HTTP_REQUEST_METHOD: method,
            URL_FULL: url,

            # Recommended attributes
            URL_SCHEME: parsed.scheme,
            SERVER_ADDRESS: parsed.hostname,
            SERVER_PORT: parsed.port or (443 if parsed.scheme == "https" else 80),
        }
    ) as span:
        try:
            response = requests.request(method, url, **kwargs)

            # Add response attributes
            span.set_attribute(HTTP_RESPONSE_STATUS_CODE, response.status_code)
            span.set_attribute("http.response.body.size", len(response.content))

            # Set status based on response code
            if response.status_code >= 400:
                span.set_status(Status(StatusCode.ERROR, f"HTTP {response.status_code}"))

            return response

        except requests.RequestException as e:
            span.set_status(Status(StatusCode.ERROR, str(e)))
            span.record_exception(e)
            raise
```

## Database Semantic Conventions

Database operations have their own semantic conventions.

```javascript
// database-instrumentation.js
const { trace, SpanKind, SpanStatusCode } = require('@opentelemetry/api');
const {
  ATTR_DB_NAMESPACE,
  ATTR_DB_OPERATION_NAME,
  ATTR_DB_QUERY_TEXT,
  ATTR_DB_RESPONSE_RETURNED_ROWS,
  ATTR_DB_SYSTEM_NAME,
  ATTR_SERVER_ADDRESS,
  ATTR_SERVER_PORT
} = require('@opentelemetry/semantic-conventions/incubating');

const tracer = trace.getTracer('database');

async function executeQuery(pool, query, params = [], operationName) {
  // Prefer an operation name from the database client or call site.
  // This fallback is only for simple single-statement examples.
  const operation = operationName || query.trim().split(/\s+/)[0].toUpperCase();

  const span = tracer.startSpan(`${operation} ${pool.config.database}`, {
    kind: SpanKind.CLIENT,
    attributes: {
      // Database system identification
      [ATTR_DB_SYSTEM_NAME]: 'postgresql',
      [ATTR_DB_NAMESPACE]: pool.config.database,

      // Operation details
      [ATTR_DB_OPERATION_NAME]: operation,
      // Only include statement if not sensitive
      // Be careful not to log passwords or PII
      [ATTR_DB_QUERY_TEXT]: sanitizeQuery(query),

      // Network information
      [ATTR_SERVER_ADDRESS]: pool.config.host,
      [ATTR_SERVER_PORT]: pool.config.port
    }
  });

  try {
    const result = await pool.query(query, params);
    span.setAttribute(ATTR_DB_RESPONSE_RETURNED_ROWS, result.rowCount);
    return result;
  } catch (error) {
    span.setStatus({ code: SpanStatusCode.ERROR, message: error.message });
    span.recordException(error);
    throw error;
  } finally {
    span.end();
  }
}

function sanitizeQuery(query) {
  // Remove potential sensitive data from query for logging
  // This is a simple example - adapt based on your needs
  return query.replace(/VALUES\s*\([^)]+\)/gi, 'VALUES (...)');
}
```

## Messaging Semantic Conventions

For message queues like Kafka, RabbitMQ, or SQS:

```python
# messaging_instrumentation.py
import uuid
import pika
from opentelemetry import trace
from opentelemetry.propagate import extract, inject
from opentelemetry.trace import SpanKind, Status, StatusCode
from opentelemetry.semconv.attributes.messaging_attributes import (
    MESSAGING_DESTINATION_NAME,
    MESSAGING_MESSAGE_BODY_SIZE,
    MESSAGING_MESSAGE_CONVERSATION_ID,
    MESSAGING_MESSAGE_ID,
    MESSAGING_OPERATION_NAME,
    MESSAGING_OPERATION_TYPE,
    MESSAGING_SYSTEM,
)

tracer = trace.get_tracer("messaging")

def generate_message_id():
    return str(uuid.uuid4())

def publish_message(channel, queue_name, message, correlation_id=None):
    """
    Publish a message with proper semantic conventions.
    """
    with tracer.start_as_current_span(
        f"send {queue_name}",
        kind=SpanKind.PRODUCER,
        attributes={
            # Messaging system
            MESSAGING_SYSTEM: "rabbitmq",
            MESSAGING_DESTINATION_NAME: queue_name,

            # Message details
            MESSAGING_MESSAGE_BODY_SIZE: len(message),
            MESSAGING_OPERATION_NAME: "send",
            MESSAGING_OPERATION_TYPE: "send",

            # Optional correlation
            MESSAGING_MESSAGE_CONVERSATION_ID: correlation_id,
        }
    ) as span:
        # Inject trace context into message headers for propagation
        headers = {}
        inject(headers)

        try:
            channel.basic_publish(
                exchange='',
                routing_key=queue_name,
                body=message,
                properties=pika.BasicProperties(headers=headers)
            )
            span.set_attribute(MESSAGING_MESSAGE_ID, generate_message_id())
        except Exception as e:
            span.set_status(Status(StatusCode.ERROR, str(e)))
            span.record_exception(e)
            raise


def consume_message(channel, method, properties, body):
    """
    Process a consumed message with proper semantic conventions.
    """
    # Extract trace context from message headers
    ctx = extract(properties.headers or {})

    with tracer.start_as_current_span(
        f"process {method.routing_key}",
        context=ctx,
        kind=SpanKind.CONSUMER,
        attributes={
            MESSAGING_SYSTEM: "rabbitmq",
            MESSAGING_DESTINATION_NAME: method.routing_key,
            MESSAGING_MESSAGE_BODY_SIZE: len(body),
            MESSAGING_OPERATION_NAME: "process",
            MESSAGING_OPERATION_TYPE: "process",
        }
    ) as span:
        try:
            process_message(body)
            channel.basic_ack(delivery_tag=method.delivery_tag)
        except Exception as e:
            span.set_status(Status(StatusCode.ERROR, str(e)))
            span.record_exception(e)
            channel.basic_nack(delivery_tag=method.delivery_tag)
            raise
```

## Custom Semantic Conventions

When you need attributes not covered by standard conventions, create custom ones with proper namespacing.

```javascript
// custom-conventions.js

// Define your custom semantic conventions with a namespace
const CustomAttributes = {
  // Business domain attributes
  ORDER_ID: 'mycompany.order.id',
  ORDER_VALUE_CENTS: 'mycompany.order.value_cents',
  ORDER_ITEM_COUNT: 'mycompany.order.item_count',
  CUSTOMER_TIER: 'mycompany.customer.tier',
  CUSTOMER_REGION: 'mycompany.customer.region',

  // Feature flags
  FEATURE_FLAG_NAME: 'mycompany.feature_flag.name',
  FEATURE_FLAG_VARIANT: 'mycompany.feature_flag.variant',

  // A/B testing
  EXPERIMENT_ID: 'mycompany.experiment.id',
  EXPERIMENT_VARIANT: 'mycompany.experiment.variant'
};

// Use them consistently
function recordOrder(span, order) {
  span.setAttributes({
    [CustomAttributes.ORDER_ID]: order.id,
    [CustomAttributes.ORDER_VALUE_CENTS]: order.totalCents,
    [CustomAttributes.ORDER_ITEM_COUNT]: order.items.length,
    [CustomAttributes.CUSTOMER_TIER]: order.customer.tier,
    [CustomAttributes.CUSTOMER_REGION]: order.customer.region
  });
}

module.exports = { CustomAttributes, recordOrder };
```

## Validation and Enforcement

Use the OpenTelemetry Collector to validate and enforce conventions:

```yaml
# collector-config.yaml
receivers:
  otlp:
    protocols:
      grpc:
      http:

processors:
  # Transform non-standard resource attributes to standard ones
  resource:
    actions:
      # Rename legacy attributes to semantic conventions
      - key: service.name
        from_attribute: service
        action: upsert
      - key: service
        action: delete

  # Transform non-standard span attributes to standard ones
  attributes:
    actions:
      - key: http.response.status_code
        from_attribute: statusCode
        action: upsert
      - key: statusCode
        action: delete

  # Filter spans missing required attributes
  filter:
    error_mode: ignore
    trace_conditions:
      - 'resource.attributes["service.name"] == nil'
      - 'span.attributes["http.request.method"] == nil and span.kind == SPAN_KIND_SERVER'

exporters:
  debug:

service:
  pipelines:
    traces:
      receivers: [otlp]
      processors: [resource, attributes, filter]
      exporters: [debug]
```

## Reference Table

| Domain | Attribute | Example |
|--------|-----------|---------|
| Service | service.name | "payment-api" |
| Service | service.version | "1.2.3" |
| HTTP | http.request.method | "POST" |
| HTTP | http.route | "/api/orders/{id}" |
| HTTP | http.response.status_code | 200 |
| Database | db.system.name | "postgresql" |
| Database | db.namespace | "orders_db" |
| Database | db.operation.name | "SELECT" |
| Messaging | messaging.system | "kafka" |
| Messaging | messaging.destination.name | "order-events" |

## Summary

Semantic conventions provide a common language for telemetry attributes. Use the OpenTelemetry semantic conventions packages to get constant definitions. Apply standard attributes for HTTP, databases, and messaging. Create custom attributes with proper namespacing when standard conventions do not cover your needs.

Consistent naming makes your telemetry queryable across services, languages, and teams. It is worth the upfront investment to avoid translation headaches later.
