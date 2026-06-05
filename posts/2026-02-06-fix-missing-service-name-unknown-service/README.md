# How to Fix the Mistake of Not Setting service.name and Getting 'unknown_service'

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: OpenTelemetry, Configuration, Resource, Service Name

Description: Fix the unknown_service problem in your tracing backend by correctly setting the service.name resource attribute in OpenTelemetry.

You have deployed OpenTelemetry, traces are flowing, and then you open your tracing backend to find every single service labeled as "unknown_service:node" or "unknown_service:python". This happens because the `service.name` resource attribute was not set, and the SDK falls back to a default value that is not useful for distinguishing between services.

## Why service.name Matters

The `service.name` resource attribute is the primary way tracing backends identify and group traces by service. Without it:

- Your service map shows a single blob labeled "unknown_service"
- You cannot filter traces by service
- Alerting on service-specific latency is impossible
- Multiple services appear as one, making debugging hopeless

## How to Set service.name

There are three ways to set it, listed from most to least recommended.

### Method 1: OTEL_SERVICE_NAME Environment Variable

The simplest approach. OpenTelemetry SDKs that support environment configuration read this variable:

```bash
export OTEL_SERVICE_NAME=order-service
```

In Docker Compose:

```yaml
services:
  order-service:
    environment:
      OTEL_SERVICE_NAME: order-service
```

In Kubernetes:

```yaml
env:
  - name: OTEL_SERVICE_NAME
    value: "order-service"
```

### Method 2: OTEL_RESOURCE_ATTRIBUTES Environment Variable

You can set `service.name` along with other resource attributes:

```bash
export OTEL_RESOURCE_ATTRIBUTES="service.name=order-service,service.version=1.2.3,deployment.environment.name=production"
```

### Method 3: In Code

If you prefer to set it programmatically:

**Node.js:**

```javascript
const { NodeSDK } = require('@opentelemetry/sdk-node');
const { resourceFromAttributes } = require('@opentelemetry/resources');
const { ATTR_SERVICE_NAME } = require('@opentelemetry/semantic-conventions');

const sdk = new NodeSDK({
  resource: resourceFromAttributes({
    [ATTR_SERVICE_NAME]: 'order-service',
    'service.version': '1.2.3',
    'deployment.environment.name': 'production',
  }),
  // ... other config
});
```

**Python:**

```python
from opentelemetry.sdk.resources import Resource, SERVICE_NAME
from opentelemetry.sdk.trace import TracerProvider

resource = Resource.create({
    SERVICE_NAME: "order-service",
    "service.version": "1.2.3",
    "deployment.environment.name": "production",
})

provider = TracerProvider(resource=resource)
```

**Java:**

```java
import io.opentelemetry.api.common.AttributeKey;

Resource resource = Resource.getDefault()
    .merge(Resource.create(Attributes.builder()
        .put(AttributeKey.stringKey("service.name"), "order-service")
        .put(AttributeKey.stringKey("service.version"), "1.2.3")
        .put(AttributeKey.stringKey("deployment.environment.name"), "production")
        .build()));

SdkTracerProvider tracerProvider = SdkTracerProvider.builder()
    .setResource(resource)
    .build();
```

## What Happens Without service.name

The SDK constructs a default value using the pattern `unknown_service:<process_executable_name>`. For a Node.js app, this is `unknown_service:node`. For Python, it is commonly `unknown_service:python`. For Java, it is `unknown_service:java`.

If you have three Node.js microservices, they all show up as `unknown_service:node` in your backend, which is completely useless.

## Recommended Resource Attributes

While you are setting `service.name`, add these additional resource attributes for better observability:

```bash
OTEL_RESOURCE_ATTRIBUTES="service.name=order-service,service.version=1.2.3,deployment.environment.name=production,service.namespace=ecommerce"
```

| Attribute | Purpose | Example |
|-----------|---------|---------|
| `service.name` | Identifies the service | `order-service` |
| `service.version` | Identifies the deployed version | `1.2.3` or `abc123` |
| `deployment.environment.name` | Distinguishes prod from staging | `production`, `staging` |
| `service.namespace` | Groups related services | `ecommerce`, `payments` |

## Setting service.name in the Collector

You can also add or override `service.name` at the Collector level using the resource processor:

```yaml
processors:
  resource:
    attributes:
      - key: service.name
        value: "order-service"
        action: upsert
      - key: deployment.environment.name
        value: "production"
        action: upsert
```

This is useful when you cannot modify the application but need to fix the service name. However, setting it at the SDK level is preferred because the name travels with the data from the very beginning.

## Verifying It Works

After setting `service.name`, verify it is present in your spans:

```javascript
// Temporarily add console exporter to check
const { ConsoleSpanExporter } = require('@opentelemetry/sdk-trace-base');

// Look for the resource section in the output
// resource: {
//   attributes: {
//     'service.name': 'order-service',
//     ...
//   }
// }
```

Or check the Collector logs:

```bash
# Enable debug logging in the Collector

service:
  telemetry:
    logs:
      level: debug
```

You should see your service name in the resource attributes of every batch of spans that passes through.

## Common Mistakes

- Setting `OTEL_SERVICE_NAME` in the wrong shell or Dockerfile layer so it does not actually reach the application process
- Setting it in the Collector config but not in the SDK, which means telemetry may still start out with `unknown_service` before the Collector rewrites it
- Using inconsistent service name formats across services (prefer lowercase letters, numbers, and hyphens)
- Forgetting to set it for background workers and cron jobs that share the same codebase as the web service

Setting `service.name` is a two-minute task that transforms your observability from a confusing mess into something actually useful.
