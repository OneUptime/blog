# How to Implement Semantic Conventions in OpenTelemetry

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: OpenTelemetry, Semantic Conventions, Attributes, Naming Standards, Observability, Best Practices

Description: Learn how to implement OpenTelemetry semantic conventions for consistent attribute naming across your telemetry data. This guide covers HTTP, database, messaging, and custom semantic conventions with practical examples.

---

Semantic conventions are standardized naming rules for telemetry attributes. When everyone uses the same names for the same concepts, dashboards, queries, and alerts work across different services and languages without translation.

This guide covers implementing OpenTelemetry semantic conventions to ensure consistency across your observability data.

## Why Semantic Conventions Matter

Without conventions, teams independently choose attribute names:

```
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

```
service.name: "payment-api"
http.route: "/api/charge"
http.response.status_code: 200
```

## Core Resource Attributes

Resource attributes describe the entity producing telemetry. These should be set once at SDK initialization.

### Node.js Resource Setup

```javascript
// resource.js
const { Resource } = require('@opentelemetry/resources');
const {
  SEMRESATTRS_SERVICE_NAME,
  SEMRESATTRS_SERVICE_VERSION,
  SEMRESATTRS_SERVICE_INSTANCE_ID,
  SEMRESATTRS_DEPLOYMENT_ENVIRONMENT,
  SEMRESATTRS_HOST_NAME,
  SEMRESATTRS_PROCESS_PID,
  SEMRESATTRS_PROCESS_RUNTIME_NAME,
  SEMRESATTRS_PROCESS_RUNTIME_VERSION
} = require('@opentelemetry/semantic-conventions');
const os = require('os');
const { v4: uuidv4 } = require('uuid');

// Create resource with semantic convention attributes
function createResource() {
  return new Resource({
    // Service identification
    [SEMRESATTRS_SERVICE_NAME]: process.env.OTEL_SERVICE_NAME || 'unknown-service',
    [SEMRESATTRS_SERVICE_VERSION]: process.env.npm_package_version || '0.0.0',
    [SEMRESATTRS_SERVICE_INSTANCE_ID]: process.env.POD_NAME || uuidv4(),

    // Deployment context
    [SEMRESATTRS_DEPLOYMENT_ENVIRONMENT]: process.env.DEPLOY_ENV || 'development',

    // Host information
    [SEMRESATTRS_HOST_NAME]: os.hostname(),

    // Process information
    [SEMRESATTRS_PROCESS_PID]: process.pid,
    [SEMRESATTRS_PROCESS_RUNTIME_NAME]: 'nodejs',
    [SEMRESATTRS_PROCESS_RUNTIME_VERSION]: process.version,

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
from opentelemetry.semconv.resource import ResourceAttributes

def create_resource():
    """
    Create a resource with semantic convention attributes.
    Call this when initializing the tracer/meter providers.
    """
    return Resource.create({
        # Service identification
        ResourceAttributes.SERVICE_NAME: os.getenv("OTEL_SERVICE_NAME", "unknown-service"),
        ResourceAttributes.SERVICE_VERSION: os.getenv("SERVICE_VERSION", "0.0.0"),
        ResourceAttributes.SERVICE_INSTANCE_ID: os.getenv("POD_NAME", str(uuid.uuid4())),

        # Deployment context
        ResourceAttributes.DEPLOYMENT_ENVIRONMENT: os.getenv("DEPLOY_ENV", "development"),

        # Host information
        ResourceAttributes.HOST_NAME: socket.gethostname(),

        # Process information
        ResourceAttributes.PROCESS_PID: os.getpid(),
        ResourceAttributes.PROCESS_RUNTIME_NAME: "python",
        ResourceAttributes.PROCESS_RUNTIME_VERSION: os.sys.version.split()[0],

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
const { trace, SpanKind, SpanStatusCode } = require('@opentelemetry/api');
const {
  SEMATTRS_HTTP_METHOD,
  SEMATTRS_HTTP_URL,
  SEMATTRS_HTTP_TARGET,
  SEMATTRS_HTTP_ROUTE,
  SEMATTRS_HTTP_STATUS_CODE,
  SEMATTRS_HTTP_REQUEST_CONTENT_LENGTH,
  SEMATTRS_HTTP_RESPONSE_CONTENT_LENGTH,
  SEMATTRS_HTTP_SCHEME,
  SEMATTRS_NET_HOST_NAME,
  SEMATTRS_NET_HOST_PORT,
  SEMATTRS_HTTP_USER_AGENT,
  SEMATTRS_HTTP_CLIENT_IP
} = require('@opentelemetry/semantic-conventions');

const tracer = trace.getTracer('http-server');

function instrumentedHandler(req, res, next) {
  const span = tracer.startSpan(`${req.method} ${req.route?.path || req.path}`, {
    kind: SpanKind.SERVER,
    attributes: {
      // Required attributes
      [SEMATTRS_HTTP_METHOD]: req.method,
      [SEMATTRS_HTTP_SCHEME]: req.protocol,
      [SEMATTRS_HTTP_TARGET]: req.originalUrl,

      // Recommended attributes
      [SEMATTRS_HTTP_ROUTE]: req.route?.path,
      [SEMATTRS_NET_HOST_NAME]: req.hostname,
      [SEMATTRS_NET_HOST_PORT]: req.socket.localPort,
      [SEMATTRS_HTTP_USER_AGENT]: req.get('user-agent'),
      [SEMATTRS_HTTP_CLIENT_IP]: req.ip,
      [SEMATTRS_HTTP_REQUEST_CONTENT_LENGTH]: req.get('content-length')
    }
  });

  // Capture response attributes
  res.on('finish', () => {
    span.setAttribute(SEMATTRS_HTTP_STATUS_CODE, res.statusCode);
    span.setAttribute(SEMATTRS_HTTP_RESPONSE_CONTENT_LENGTH, res.get('content-length'));

    // Set span status based on HTTP status code
    if (res.statusCode >= 400) {
      span.setStatus({
        code: SpanStatusCode.ERROR,
        message: `HTTP ${res.statusCode}`
      });
    }

    span.end();
  });

  next();
}
```

### HTTP Client Spans

```python
# http_client_instrumentation.py
import requests
from opentelemetry import trace
from opentelemetry.trace import SpanKind, Status, StatusCode
from opentelemetry.semconv.trace import SpanAttributes

tracer = trace.get_tracer("http-client")

def make_request(method, url, **kwargs):
    """
    Make an HTTP request with proper semantic conventions.
    """
    from urllib.parse import urlparse
    parsed = urlparse(url)

    with tracer.start_as_current_span(
        f"{method} {parsed.path}",
        kind=SpanKind.CLIENT,
        attributes={
            # Required attributes
            SpanAttributes.HTTP_METHOD: method,
            SpanAttributes.HTTP_URL: url,

            # Recommended attributes
            SpanAttributes.HTTP_SCHEME: parsed.scheme,
            SpanAttributes.NET_PEER_NAME: parsed.hostname,
            SpanAttributes.NET_PEER_PORT: parsed.port or (443 if parsed.scheme == "https" else 80),
        }
    ) as span:
        try:
            response = requests.request(method, url, **kwargs)

            # Add response attributes
            span.set_attribute(SpanAttributes.HTTP_STATUS_CODE, response.status_code)
            span.set_attribute(
                SpanAttributes.HTTP_RESPONSE_CONTENT_LENGTH,
                len(response.content)
            )

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
  SEMATTRS_DB_SYSTEM,
  SEMATTRS_DB_NAME,
  SEMATTRS_DB_USER,
  SEMATTRS_DB_STATEMENT,
  SEMATTRS_DB_OPERATION,
  SEMATTRS_NET_PEER_NAME,
  SEMATTRS_NET_PEER_PORT
} = require('@opentelemetry/semantic-conventions');

const tracer = trace.getTracer('database');

async function executeQuery(pool, query, params = []) {
  // Extract operation from query (SELECT, INSERT, UPDATE, DELETE)
  const operation = query.trim().split(/\s+/)[0].toUpperCase();

  const span = tracer.startSpan(`${operation} ${pool.config.database}`, {
    kind: SpanKind.CLIENT,
    attributes: {
      // Database system identification
      [SEMATTRS_DB_SYSTEM]: 'postgresql',
      [SEMATTRS_DB_NAME]: pool.config.database,
      [SEMATTRS_DB_USER]: pool.config.user,

      // Operation details
      [SEMATTRS_DB_OPERATION]: operation,
      // Only include statement if not sensitive
      // Be careful not to log passwords or PII
      [SEMATTRS_DB_STATEMENT]: sanitizeQuery(query),

      // Network information
      [SEMATTRS_NET_PEER_NAME]: pool.config.host,
      [SEMATTRS_NET_PEER_PORT]: pool.config.port
    }
  });

  try {
    const result = await pool.query(query, params);
    span.setAttribute('db.rows_affected', result.rowCount);
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
from opentelemetry import trace
from opentelemetry.trace import SpanKind, Status, StatusCode
from opentelemetry.semconv.trace import SpanAttributes

tracer = trace.get_tracer("messaging")

def publish_message(channel, queue_name, message, correlation_id=None):
    """
    Publish a message with proper semantic conventions.
    """
    with tracer.start_as_current_span(
        f"{queue_name} send",
        kind=SpanKind.PRODUCER,
        attributes={
            # Messaging system
            SpanAttributes.MESSAGING_SYSTEM: "rabbitmq",
            SpanAttributes.MESSAGING_DESTINATION: queue_name,
            SpanAttributes.MESSAGING_DESTINATION_KIND: "queue",

            # Message details
            SpanAttributes.MESSAGING_MESSAGE_PAYLOAD_SIZE_BYTES: len(message),
            SpanAttributes.MESSAGING_OPERATION: "send",

            # Optional correlation
            SpanAttributes.MESSAGING_CONVERSATION_ID: correlation_id,
        }
    ) as span:
        # Inject trace context into message headers for propagation
        headers = inject_context_to_headers({})

        try:
            channel.basic_publish(
                exchange='',
                routing_key=queue_name,
                body=message,
                properties=pika.BasicProperties(headers=headers)
            )
            span.set_attribute(SpanAttributes.MESSAGING_MESSAGE_ID, generate_message_id())
        except Exception as e:
            span.set_status(Status(StatusCode.ERROR, str(e)))
            span.record_exception(e)
            raise


def consume_message(channel, method, properties, body):
    """
    Process a consumed message with proper semantic conventions.
    """
    # Extract trace context from message headers
    ctx = extract_context_from_headers(properties.headers or {})

    with tracer.start_as_current_span(
        f"{method.routing_key} receive",
        context=ctx,
        kind=SpanKind.CONSUMER,
        attributes={
            SpanAttributes.MESSAGING_SYSTEM: "rabbitmq",
            SpanAttributes.MESSAGING_DESTINATION: method.routing_key,
            SpanAttributes.MESSAGING_DESTINATION_KIND: "queue",
            SpanAttributes.MESSAGING_MESSAGE_PAYLOAD_SIZE_BYTES: len(body),
            SpanAttributes.MESSAGING_OPERATION: "receive",
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
processors:
  # Transform non-standard attributes to standard ones
  attributes:
    actions:
      # Rename legacy attributes to semantic conventions
      - key: service
        action: delete
      - key: service.name
        from_attribute: service
        action: upsert

      - key: statusCode
        action: delete
      - key: http.response.status_code
        from_attribute: statusCode
        action: upsert

  # Filter spans missing required attributes
  filter:
    traces:
      span:
        - 'attributes["service.name"] == nil'
        - 'attributes["http.method"] == nil and kind == SPAN_KIND_SERVER'
```

## Reference Table

| Domain | Attribute | Example |
|--------|-----------|---------|
| Service | service.name | "payment-api" |
| Service | service.version | "1.2.3" |
| HTTP | http.method | "POST" |
| HTTP | http.route | "/api/orders/{id}" |
| HTTP | http.response.status_code | 200 |
| Database | db.system | "postgresql" |
| Database | db.name | "orders_db" |
| Database | db.operation | "SELECT" |
| Messaging | messaging.system | "kafka" |
| Messaging | messaging.destination | "order-events" |

## Summary

Semantic conventions provide a common language for telemetry attributes. Use the OpenTelemetry semantic conventions packages to get constant definitions. Apply standard attributes for HTTP, databases, and messaging. Create custom attributes with proper namespacing when standard conventions do not cover your needs.

Consistent naming makes your telemetry queryable across services, languages, and teams. It is worth the upfront investment to avoid translation headaches later.
