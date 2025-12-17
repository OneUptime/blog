# OpenTelemetry Semantic Conventions: Standard Names for Universal Understanding

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: OpenTelemetry, Semantic Conventions, Observability, Standards, Tracing, Metrics

Description: A comprehensive guide to OpenTelemetry semantic conventions- standardized attribute names that ensure consistent telemetry across services, languages, and backends for universal querying and analysis.

---

> Semantic conventions are the Rosetta Stone of observability. They transform vendor-specific naming chaos into a universal language that every tool understands.

This guide covers OpenTelemetry's semantic conventions- what they are, why they matter, and how to apply them correctly across your services.

---

## Table of Contents

1. What Are Semantic Conventions?
2. Why Semantic Conventions Matter
3. Resource Attributes
4. HTTP Conventions
5. Database Conventions
6. Messaging Conventions
7. RPC Conventions
8. Exception Conventions
9. Network Conventions
10. Cloud and Container Conventions
11. Custom Attributes Best Practices
12. Migration from Legacy Names
13. Tooling and Validation

---

## 1. What Are Semantic Conventions?

Semantic conventions are **standardized names and values** for attributes attached to telemetry data. They define:

- **Attribute names**: `http.request.method` not `httpMethod` or `method`
- **Attribute values**: `GET` not `get` or `Http-Get`
- **Required vs optional**: Which attributes must be present
- **Value types**: String, int, boolean, array

### Example comparison

**Without conventions (chaos):**
```json
// Service A
{"method": "GET", "url": "/api/users", "status": 200}

// Service B
{"http_method": "get", "endpoint": "/api/users", "response_code": "200"}

// Service C
{"httpMethod": "GET", "path": "/api/users", "statusCode": 200}
```

**With semantic conventions (consistency):**
```json
// All services
{
  "http.request.method": "GET",
  "url.path": "/api/users",
  "http.response.status_code": 200
}
```

---

## 2. Why Semantic Conventions Matter

| Benefit | Description |
|---------|-------------|
| Universal queries | Same query works across all services |
| Backend compatibility | Any OTLP backend understands the data |
| Auto-instrumentation | Libraries emit consistent attributes |
| Dashboards reuse | Build once, apply everywhere |
| AI/ML correlation | Patterns are recognizable across systems |

### Real-world impact

```sql
-- Without conventions: Different queries per service
SELECT * FROM traces WHERE service_a.method = 'GET'
SELECT * FROM traces WHERE service_b.http_method = 'get'
SELECT * FROM traces WHERE service_c.httpMethod = 'GET'

-- With conventions: One query for all
SELECT * FROM traces WHERE http.request.method = 'GET'
```

---

## 3. Resource Attributes

Resource attributes describe the **entity producing telemetry**.

### Service identification

| Attribute | Type | Description | Example |
|-----------|------|-------------|---------|
| `service.name` | string | Logical name of service | `payment-service` |
| `service.version` | string | Version of service | `1.2.3` |
| `service.namespace` | string | Namespace for grouping | `shop` |
| `service.instance.id` | string | Unique instance ID | `pod-abc123` |

### Deployment environment

| Attribute | Type | Description | Example |
|-----------|------|-------------|---------|
| `deployment.environment` | string | Environment name | `production` |
| `deployment.environment.name` | string | Descriptive name | `Production US-East` |

### Host information

| Attribute | Type | Description | Example |
|-----------|------|-------------|---------|
| `host.name` | string | Hostname | `server-01` |
| `host.id` | string | Unique host ID | `i-0123456789` |
| `host.type` | string | Host type | `n1-standard-1` |
| `host.arch` | string | CPU architecture | `amd64` |

### Implementation

```typescript
import { Resource } from '@opentelemetry/resources';
import {
  SEMRESATTRS_SERVICE_NAME,
  SEMRESATTRS_SERVICE_VERSION,
  SEMRESATTRS_DEPLOYMENT_ENVIRONMENT
} from '@opentelemetry/semantic-conventions';

const resource = new Resource({
  [SEMRESATTRS_SERVICE_NAME]: 'order-service',
  [SEMRESATTRS_SERVICE_VERSION]: '2.1.0',
  [SEMRESATTRS_DEPLOYMENT_ENVIRONMENT]: 'production',
  'service.namespace': 'ecommerce',
  'service.instance.id': process.env.POD_NAME || 'local',
});
```

---

## 4. HTTP Conventions

### Client spans (outbound requests)

| Attribute | Type | Required | Example |
|-----------|------|----------|---------|
| `http.request.method` | string | Yes | `GET`, `POST` |
| `url.full` | string | Yes | `https://api.example.com/users` |
| `http.response.status_code` | int | Yes | `200` |
| `server.address` | string | Recommended | `api.example.com` |
| `server.port` | int | Recommended | `443` |

### Server spans (inbound requests)

| Attribute | Type | Required | Example |
|-----------|------|----------|---------|
| `http.request.method` | string | Yes | `GET` |
| `url.path` | string | Yes | `/api/users/123` |
| `url.scheme` | string | Yes | `https` |
| `http.response.status_code` | int | Yes | `200` |
| `http.route` | string | Recommended | `/api/users/{id}` |
| `client.address` | string | Recommended | `192.168.1.1` |

### HTTP request body

| Attribute | Type | Description |
|-----------|------|-------------|
| `http.request.body.size` | int | Request body size in bytes |
| `http.response.body.size` | int | Response body size in bytes |

### Implementation

```typescript
import { trace, SpanKind } from '@opentelemetry/api';
import {
  SEMATTRS_HTTP_REQUEST_METHOD,
  SEMATTRS_HTTP_RESPONSE_STATUS_CODE,
  SEMATTRS_URL_FULL,
  SEMATTRS_SERVER_ADDRESS,
  SEMATTRS_SERVER_PORT
} from '@opentelemetry/semantic-conventions';

const tracer = trace.getTracer('http-client');

async function fetchUser(userId: string) {
  const url = `https://api.example.com/users/${userId}`;

  return tracer.startActiveSpan('HTTP GET', { kind: SpanKind.CLIENT }, async (span) => {
    span.setAttributes({
      [SEMATTRS_HTTP_REQUEST_METHOD]: 'GET',
      [SEMATTRS_URL_FULL]: url,
      [SEMATTRS_SERVER_ADDRESS]: 'api.example.com',
      [SEMATTRS_SERVER_PORT]: 443,
    });

    const response = await fetch(url);

    span.setAttribute(SEMATTRS_HTTP_RESPONSE_STATUS_CODE, response.status);
    span.end();

    return response.json();
  });
}
```

### Span naming for HTTP

```
// Server spans
HTTP {method}

// Client spans
HTTP {method}

// Examples
HTTP GET
HTTP POST
```

---

## 5. Database Conventions

### Common attributes

| Attribute | Type | Required | Example |
|-----------|------|----------|---------|
| `db.system` | string | Yes | `postgresql`, `mysql`, `mongodb` |
| `db.name` | string | Recommended | `users_db` |
| `db.operation` | string | Recommended | `SELECT`, `INSERT` |
| `db.statement` | string | Recommended | `SELECT * FROM users WHERE id = ?` |

### SQL-specific

| Attribute | Type | Description |
|-----------|------|-------------|
| `db.sql.table` | string | Primary table | `users` |

### NoSQL-specific

| Attribute | Type | Description |
|-----------|------|-------------|
| `db.mongodb.collection` | string | Collection name |
| `db.redis.database_index` | int | Redis DB index |
| `db.elasticsearch.index` | string | ES index name |

### Connection attributes

| Attribute | Type | Description |
|-----------|------|-------------|
| `server.address` | string | Database host |
| `server.port` | int | Database port |
| `db.user` | string | Database user |

### Implementation

```typescript
import { SEMATTRS_DB_SYSTEM, SEMATTRS_DB_NAME, SEMATTRS_DB_OPERATION, SEMATTRS_DB_STATEMENT } from '@opentelemetry/semantic-conventions';

async function queryUsers(query: string) {
  return tracer.startActiveSpan('db.query.users.select', { kind: SpanKind.CLIENT }, async (span) => {
    span.setAttributes({
      [SEMATTRS_DB_SYSTEM]: 'postgresql',
      [SEMATTRS_DB_NAME]: 'app_production',
      [SEMATTRS_DB_OPERATION]: 'SELECT',
      [SEMATTRS_DB_STATEMENT]: 'SELECT id, name FROM users WHERE active = $1',
      'db.sql.table': 'users',
      'server.address': 'db.example.com',
      'server.port': 5432,
    });

    const result = await db.query(query);
    span.setAttribute('db.rows_affected', result.rowCount);
    span.end();

    return result;
  });
}
```

### Span naming for database

```
{db.operation} {db.name}.{db.sql.table}

// Examples
SELECT app_production.users
INSERT app_production.orders
findOne users_db.customers
```

---

## 6. Messaging Conventions

### Producer spans

| Attribute | Type | Required | Example |
|-----------|------|----------|---------|
| `messaging.system` | string | Yes | `kafka`, `rabbitmq`, `sqs` |
| `messaging.destination.name` | string | Yes | `orders-topic` |
| `messaging.operation` | string | Yes | `publish`, `send` |
| `messaging.message.id` | string | Recommended | `msg-123` |

### Consumer spans

| Attribute | Type | Required | Example |
|-----------|------|----------|---------|
| `messaging.system` | string | Yes | `kafka` |
| `messaging.destination.name` | string | Yes | `orders-topic` |
| `messaging.operation` | string | Yes | `receive`, `process` |
| `messaging.consumer.group.name` | string | Recommended | `order-processor` |

### Kafka-specific

| Attribute | Type | Description |
|-----------|------|-------------|
| `messaging.kafka.consumer.group` | string | Consumer group ID |
| `messaging.kafka.partition` | int | Partition number |
| `messaging.kafka.offset` | int | Message offset |

### Implementation

```typescript
// Producer
async function publishOrder(order: Order) {
  return tracer.startActiveSpan('orders publish', { kind: SpanKind.PRODUCER }, async (span) => {
    span.setAttributes({
      'messaging.system': 'kafka',
      'messaging.destination.name': 'orders-topic',
      'messaging.operation': 'publish',
      'messaging.message.id': order.id,
      'messaging.kafka.partition': 0,
    });

    await kafka.send('orders-topic', JSON.stringify(order));
    span.end();
  });
}

// Consumer
async function processMessage(message: Message) {
  return tracer.startActiveSpan('orders process', { kind: SpanKind.CONSUMER }, async (span) => {
    span.setAttributes({
      'messaging.system': 'kafka',
      'messaging.destination.name': 'orders-topic',
      'messaging.operation': 'process',
      'messaging.message.id': message.key,
      'messaging.kafka.consumer.group': 'order-processor',
      'messaging.kafka.partition': message.partition,
      'messaging.kafka.offset': message.offset,
    });

    await handleOrder(JSON.parse(message.value));
    span.end();
  });
}
```

---

## 7. RPC Conventions

### Common RPC attributes

| Attribute | Type | Required | Example |
|-----------|------|----------|---------|
| `rpc.system` | string | Yes | `grpc`, `jsonrpc` |
| `rpc.service` | string | Yes | `UserService` |
| `rpc.method` | string | Yes | `GetUser` |

### gRPC-specific

| Attribute | Type | Description |
|-----------|------|-------------|
| `rpc.grpc.status_code` | int | gRPC status code |
| `rpc.grpc.request.metadata.<key>` | string | Request metadata |
| `rpc.grpc.response.metadata.<key>` | string | Response metadata |

### Implementation

```typescript
async function getUser(userId: string) {
  return tracer.startActiveSpan('UserService/GetUser', { kind: SpanKind.CLIENT }, async (span) => {
    span.setAttributes({
      'rpc.system': 'grpc',
      'rpc.service': 'UserService',
      'rpc.method': 'GetUser',
      'server.address': 'users.svc.cluster.local',
      'server.port': 50051,
    });

    try {
      const response = await grpcClient.getUser({ id: userId });
      span.setAttribute('rpc.grpc.status_code', 0); // OK
      return response;
    } catch (error) {
      span.setAttribute('rpc.grpc.status_code', error.code);
      throw error;
    } finally {
      span.end();
    }
  });
}
```

### Span naming for RPC

```
{rpc.service}/{rpc.method}

// Examples
UserService/GetUser
OrderService/CreateOrder
```

---

## 8. Exception Conventions

### Exception attributes

| Attribute | Type | Description |
|-----------|------|-------------|
| `exception.type` | string | Exception class name |
| `exception.message` | string | Exception message |
| `exception.stacktrace` | string | Full stack trace |
| `exception.escaped` | boolean | Did exception escape the span? |

### Recording exceptions

```typescript
import { SpanStatusCode } from '@opentelemetry/api';

async function riskyOperation() {
  const span = tracer.startSpan('risky.operation');

  try {
    await doSomethingRisky();
    span.setStatus({ code: SpanStatusCode.OK });
  } catch (error) {
    // Record exception with semantic conventions
    span.recordException(error); // Automatically sets exception.* attributes

    // Or manually:
    span.addEvent('exception', {
      'exception.type': error.constructor.name,
      'exception.message': error.message,
      'exception.stacktrace': error.stack,
      'exception.escaped': true,
    });

    span.setStatus({
      code: SpanStatusCode.ERROR,
      message: error.message,
    });

    throw error;
  } finally {
    span.end();
  }
}
```

---

## 9. Network Conventions

### Network attributes

| Attribute | Type | Description | Example |
|-----------|------|-------------|---------|
| `network.transport` | string | Transport protocol | `tcp`, `udp` |
| `network.type` | string | Network type | `ipv4`, `ipv6` |
| `network.protocol.name` | string | Application protocol | `http`, `grpc` |
| `network.protocol.version` | string | Protocol version | `1.1`, `2` |

### Connection attributes

| Attribute | Type | Description |
|-----------|------|-------------|
| `network.peer.address` | string | Peer IP address |
| `network.peer.port` | int | Peer port |
| `network.local.address` | string | Local IP address |
| `network.local.port` | int | Local port |

---

## 10. Cloud and Container Conventions

### Cloud provider

| Attribute | Type | Example |
|-----------|------|---------|
| `cloud.provider` | string | `aws`, `azure`, `gcp` |
| `cloud.account.id` | string | `123456789012` |
| `cloud.region` | string | `us-east-1` |
| `cloud.availability_zone` | string | `us-east-1a` |
| `cloud.platform` | string | `aws_ec2`, `aws_lambda` |

### Kubernetes

| Attribute | Type | Example |
|-----------|------|---------|
| `k8s.cluster.name` | string | `production` |
| `k8s.namespace.name` | string | `default` |
| `k8s.pod.name` | string | `api-pod-abc123` |
| `k8s.pod.uid` | string | `pod-uid-xyz` |
| `k8s.deployment.name` | string | `api` |
| `k8s.container.name` | string | `api-container` |

### Container

| Attribute | Type | Example |
|-----------|------|---------|
| `container.id` | string | `abc123def456` |
| `container.name` | string | `api-container` |
| `container.runtime` | string | `docker`, `containerd` |
| `container.image.name` | string | `myapp` |
| `container.image.tag` | string | `v1.2.3` |

### Implementation

```typescript
import { Resource } from '@opentelemetry/resources';

const resource = new Resource({
  // Service
  'service.name': 'order-service',
  'service.version': '1.0.0',

  // Cloud
  'cloud.provider': 'aws',
  'cloud.region': 'us-east-1',
  'cloud.availability_zone': 'us-east-1a',
  'cloud.account.id': process.env.AWS_ACCOUNT_ID,

  // Kubernetes (from downward API)
  'k8s.cluster.name': process.env.CLUSTER_NAME,
  'k8s.namespace.name': process.env.POD_NAMESPACE,
  'k8s.pod.name': process.env.POD_NAME,
  'k8s.deployment.name': process.env.DEPLOYMENT_NAME,

  // Container
  'container.id': getContainerId(),
  'container.image.name': process.env.CONTAINER_IMAGE,
  'container.image.tag': process.env.CONTAINER_TAG,
});
```

---

## 11. Custom Attributes Best Practices

### Naming conventions

```
// Use dot notation for namespacing
app.user.id           ✓
app.order.total       ✓
appUserId             ✗
app_user_id           ✗

// Use lowercase
http.request.method   ✓
HTTP.Request.Method   ✗

// Use snake_case for multi-word keys within namespace
app.payment.transaction_id  ✓
app.payment.transactionId   ✗
```

### Prefix custom attributes

```typescript
// Always prefix custom attributes to avoid conflicts
span.setAttributes({
  // Standard semantic conventions (no prefix)
  'http.request.method': 'POST',
  'http.response.status_code': 200,

  // Custom application attributes (prefixed)
  'app.user.id': userId,
  'app.order.id': orderId,
  'app.payment.amount': amount,
  'app.feature.flag': featureFlag,
});
```

### Cardinality guidelines

```typescript
// LOW cardinality (good for metrics)
'http.request.method': 'GET',           // ~10 values
'http.response.status_code': 200,       // ~50 values
'app.payment.type': 'credit_card',      // ~5 values

// HIGH cardinality (traces only)
'app.user.id': 'user-123456',           // Millions of values
'app.order.id': 'ord-789012',           // Unbounded
'app.session.id': 'sess-abc123',        // Unbounded

// AVOID in metrics
'app.request.body': '...',              // Unbounded strings
'app.user.email': 'user@example.com',   // PII + high cardinality
```

---

## 12. Migration from Legacy Names

### Common migrations

| Legacy Name | Semantic Convention |
|-------------|---------------------|
| `http.method` | `http.request.method` |
| `http.url` | `url.full` |
| `http.status_code` | `http.response.status_code` |
| `http.host` | `server.address` |
| `net.peer.ip` | `network.peer.address` |
| `db.type` | `db.system` |
| `messaging.destination` | `messaging.destination.name` |

### Migration strategy

```typescript
// Emit both during migration period
span.setAttributes({
  // New semantic conventions
  'http.request.method': method,
  'http.response.status_code': status,

  // Legacy (temporary, for backwards compatibility)
  'http.method': method,
  'http.status_code': status,
});

// After migration period, remove legacy
span.setAttributes({
  'http.request.method': method,
  'http.response.status_code': status,
});
```

### Collector transformation

```yaml
processors:
  transform:
    trace_statements:
      - context: span
        statements:
          # Rename legacy to semantic convention
          - set(attributes["http.request.method"], attributes["http.method"])
          - delete_key(attributes, "http.method")
          - set(attributes["http.response.status_code"], attributes["http.status_code"])
          - delete_key(attributes, "http.status_code")
```

---

## 13. Tooling and Validation

### Schema validation

```typescript
import { SemanticResourceAttributes, SemanticAttributes } from '@opentelemetry/semantic-conventions';

// TypeScript ensures correct attribute names
span.setAttribute(SemanticAttributes.HTTP_REQUEST_METHOD, 'GET'); // ✓ Valid
span.setAttribute('http.method', 'GET'); // Still works but not type-checked
```

### Linting custom attributes

```typescript
// Custom validation function
function validateAttributes(attrs: Record<string, unknown>): void {
  const customPrefix = 'app.';
  const semconvPrefixes = ['http.', 'db.', 'rpc.', 'messaging.', 'net.'];

  for (const key of Object.keys(attrs)) {
    const isStandard = semconvPrefixes.some(p => key.startsWith(p));
    const isCustom = key.startsWith(customPrefix);

    if (!isStandard && !isCustom) {
      console.warn(`Attribute "${key}" should use semantic convention or "${customPrefix}" prefix`);
    }
  }
}
```

### OpenTelemetry Schema URL

```typescript
// Include schema URL for version tracking
const resource = new Resource({
  'service.name': 'my-service',
}, 'https://opentelemetry.io/schemas/1.21.0');
```

---

## Summary

| Category | Key Attributes |
|----------|---------------|
| HTTP | `http.request.method`, `http.response.status_code`, `url.path` |
| Database | `db.system`, `db.name`, `db.operation`, `db.statement` |
| Messaging | `messaging.system`, `messaging.destination.name`, `messaging.operation` |
| RPC | `rpc.system`, `rpc.service`, `rpc.method` |
| Resource | `service.name`, `service.version`, `deployment.environment` |
| Cloud | `cloud.provider`, `cloud.region`, `k8s.namespace.name` |

Semantic conventions are the foundation of interoperable observability. Use them consistently, prefix custom attributes, and keep cardinality in check.

---

*Want to explore your semantically-correct telemetry? Send it to [OneUptime](https://oneuptime.com) and query with confidence.*

---

### See Also

- [What are Traces and Spans in OpenTelemetry](/blog/post/2025-08-27-traces-and-spans-in-opentelemetry/)
- [How to Name Spans in OpenTelemetry](/blog/post/2024-11-04-how-to-name-spans-in-opentelemetry/)
- [Resource Detection in OpenTelemetry](/blog/post/2025-12-17-opentelemetry-resource-detection/)
