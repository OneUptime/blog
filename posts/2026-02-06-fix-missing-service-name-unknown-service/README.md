# How to Fix the Mistake of Not Setting service.name and Getting "unknown_service" in Your Backend

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: OpenTelemetry, Configuration, Resources, Service Name

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

The simplest approach. Every OpenTelemetry SDK reads this variable:

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
export OTEL_RESOURCE_ATTRIBUTES="service.name=order-service,service.version=1.2.3,deployment.environment=production"
```

### Method 3: In Code

If you prefer to set it programmatically:

**Node.js:**

```javascript
const { Resource } = require('@opentelemetry/resources');
const { ATTR_SERVICE_NAME } = require('@opentelemetry/semantic-conventions');

const sdk = new NodeSDK({
  resource: new Resource({
    [ATTR_SERVICE_NAME]: 'order-service',
    'service.version': '1.2.3',
    'deployment.environment': 'production',
  }),
  // ... other config
});
```

**Python:**

```python
from opentelemetry.sdk.resources import Resource, SERVICE_NAME

resource = Resource.create({
    SERVICE_NAME: "order-service",
    "service.version": "1.2.3",
    "deployment.environment": "production",
})

provider = TracerProvider(resource=resource)
```

**Java:**

```java
Resource resource = Resource.getDefault()
    .merge(Resource.create(Attributes.builder()
        .put(ResourceAttributes.SERVICE_NAME, "order-service")
        .put(ResourceAttributes.SERVICE_VERSION, "1.2.3")
        .put(ResourceAttributes.DEPLOYMENT_ENVIRONMENT, "production")
        .build()));

SdkTracerProvider tracerProvider = SdkTracerProvider.builder()
    .setResource(resource)
    .build();
```

## What Happens Without service.name

The SDK constructs a default value using the pattern `unknown_service:<process_name>`. For a Node.js app, this is `unknown_service:node`. For Python, it is `unknown_service:python`. For Java, it is `unknown_service:java`.

If you have three Node.js microservices, they all show up as `unknown_service:node` in your backend, which is completely useless.

## Recommended Resource Attributes

While you are setting `service.name`, add these additional resource attributes for better observability:

```bash
OTEL_RESOURCE_ATTRIBUTES="service.name=order-service,service.version=1.2.3,deployment.environment=production,service.namespace=ecommerce"
```

| Attribute | Purpose | Example |
|-----------|---------|---------|
| `service.name` | Identifies the service | `order-service` |
| `service.version` | Identifies the deployed version | `1.2.3` or `abc123` |
| `deployment.environment` | Distinguishes prod from staging | `production`, `staging` |
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
      - key: deployment.environment
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
- Setting it in the Collector config but not in the SDK, which means the SDK still logs "unknown_service" warnings
- Using spaces or special characters in the service name (stick to lowercase letters, numbers, and hyphens)
- Forgetting to set it for background workers and cron jobs that share the same codebase as the web service

Setting `service.name` is a two-minute task that transforms your observability from a confusing mess into something actually useful.
