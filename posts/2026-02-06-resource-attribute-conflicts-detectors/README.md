# How to Handle Resource Attribute Conflicts When Multiple Detectors Report Different Values for the Same Key

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: OpenTelemetry, Resource Attributes, Conflict Resolution, SDK

Description: Handle resource attribute conflicts when multiple OpenTelemetry resource detectors report different values for the same attribute key.

When you enable multiple resource detectors in the OpenTelemetry SDK, they can produce conflicting values for the same attribute key. The host detector might set `host.name` to the OS hostname, while the cloud detector sets it to the cloud instance name. The environment variable detector might set `service.name` to one value while your code sets it to another. Understanding and controlling how these conflicts resolve is essential for consistent telemetry.

## How Conflicts Happen

Here is a concrete example. You have three sources of resource attributes:

```python
# Source 1: Code defaults
code_resource = Resource.create({
    "service.name": "my-service",
    "host.name": "localhost",
    "deployment.environment": "development",
})

# Source 2: Host detector discovers
# host.name = "ip-172-31-42-7.ec2.internal"

# Source 3: Environment variables
# OTEL_RESOURCE_ATTRIBUTES="service.name=checkout-svc,deployment.environment=production"
```

The key `host.name` appears in both code and host detector. The keys `service.name` and `deployment.environment` appear in both code and environment variables. Which value wins?

## The Merge Algorithm

The OpenTelemetry SDK specification defines that `Resource.merge(other)` creates a new Resource where:

- All attributes from both resources are included
- When the same key exists in both, the "other" resource's value wins
- The schema URL from "other" takes precedence if both are set

```python
from opentelemetry.sdk.resources import Resource

r1 = Resource.create({"service.name": "from-code", "version": "1.0"})
r2 = Resource.create({"service.name": "from-env", "region": "us-east"})

# r1.merge(r2): r2's values win for conflicts
merged = r1.merge(r2)
# Result: service.name="from-env", version="1.0", region="us-east"

# r2.merge(r1): r1's values win for conflicts
merged = r2.merge(r1)
# Result: service.name="from-code", version="1.0", region="us-east"
```

The merge order determines the winner. This is not always obvious when using `get_aggregated_resources`.

## Controlling Priority with Detector Ordering

```python
from opentelemetry.sdk.resources import Resource, get_aggregated_resources, OTELResourceDetector

# Detectors listed later have HIGHER priority
# because get_aggregated_resources merges them in order
detectors = [
    HostResourceDetector(),      # Priority 1 (lowest)
    CloudResourceDetector(),     # Priority 2
    OTELResourceDetector(),      # Priority 3 (highest)
]

detected = get_aggregated_resources(detectors)
```

In this ordering, if the host detector and cloud detector both set `host.name`, the cloud detector's value wins. If the env var detector also sets `host.name`, it wins over both.

## Building a Priority-Aware Merge Function

For more explicit control, build your own merge function:

```python
from opentelemetry.sdk.resources import Resource


def merge_with_priority(*resources):
    """Merge resources with explicit priority.

    Resources are listed from lowest to highest priority.
    Later resources override earlier ones for conflicting keys.
    """
    result = Resource.create({})
    for res in resources:
        result = result.merge(res)
    return result


# Usage with explicit priority
final_resource = merge_with_priority(
    # Priority 1 (lowest): SDK defaults
    Resource.create({
        "service.name": "unknown_service",
        "deployment.environment": "development",
    }),

    # Priority 2: Host detection
    Resource.create({
        "host.name": get_hostname(),
        "host.arch": get_arch(),
    }),

    # Priority 3: Cloud provider detection
    Resource.create({
        "cloud.provider": "aws",
        "cloud.region": "us-east-1",
        "host.name": "i-0123456789abcdef0",  # Overrides host detection
    }),

    # Priority 4: Application config
    Resource.create({
        "service.name": "checkout-service",
        "service.version": "2.1.0",
    }),

    # Priority 5 (highest): Environment variable overrides
    Resource.create(
        parse_env_resource_attributes()
    ),
)
```

## Logging Conflicts for Debugging

When resource merging produces unexpected results, a debugging wrapper helps:

```python
from opentelemetry.sdk.resources import Resource
import logging

logger = logging.getLogger("resource.merger")


def merge_with_logging(base, other, other_name="other"):
    """Merge resources and log any conflicts."""
    base_attrs = dict(base.attributes)
    other_attrs = dict(other.attributes)

    # Find conflicting keys
    conflicts = {}
    for key in other_attrs:
        if key in base_attrs and base_attrs[key] != other_attrs[key]:
            conflicts[key] = {
                "old_value": base_attrs[key],
                "new_value": other_attrs[key],
                "source": other_name,
            }

    if conflicts:
        for key, info in conflicts.items():
            logger.warning(
                "Resource attribute conflict for '%s': "
                "'%s' overridden by '%s' (from %s)",
                key, info["old_value"], info["new_value"], info["source"]
            )

    return base.merge(other)


# Usage
resource = Resource.create({"service.name": "default"})
resource = merge_with_logging(
    resource,
    Resource.create({"service.name": "from-env"}),
    "environment variables"
)
# Logs: Resource attribute conflict for 'service.name':
#        'default' overridden by 'from-env' (from environment variables)
```

## Go: Handling Conflicts

```go
package main

import (
    "context"
    "fmt"
    "go.opentelemetry.io/otel/attribute"
    "go.opentelemetry.io/otel/sdk/resource"
    semconv "go.opentelemetry.io/otel/semconv/v1.21.0"
)

func buildResource(ctx context.Context) (*resource.Resource, error) {
    // Base resource with defaults
    base, _ := resource.New(ctx,
        resource.WithAttributes(
            semconv.ServiceName("default-service"),
            semconv.DeploymentEnvironment("development"),
        ),
    )

    // Detected resource (cloud + host)
    detected, _ := resource.New(ctx,
        resource.WithHost(),
        resource.WithFromEnv(),
    )

    // Application-specific override
    appResource, _ := resource.New(ctx,
        resource.WithAttributes(
            semconv.ServiceName("checkout-service"),
            semconv.ServiceVersion("1.2.3"),
        ),
    )

    // Merge in priority order: base < detected < app
    merged, err := resource.Merge(base, detected)
    if err != nil {
        return nil, err
    }
    merged, err = resource.Merge(merged, appResource)
    if err != nil {
        return nil, err
    }

    return merged, nil
}
```

## Best Practices for Avoiding Conflicts

1. **Use `OTEL_SERVICE_NAME`** instead of setting `service.name` in both code and `OTEL_RESOURCE_ATTRIBUTES`. The dedicated env var has the highest priority.

2. **Be explicit about detector order** in your setup code. Document which detector wins for which keys.

3. **Use `insert` actions in the Collector's resource processor** when you want to set defaults without overwriting SDK-provided values:

```yaml
processors:
  resource:
    attributes:
      - key: deployment.environment
        value: "production"
        action: insert  # Only set if not already present
```

4. **Validate the final resource** before creating the TracerProvider. Log or assert that critical attributes like `service.name` are set to expected values.

Resource attribute conflicts are a common source of confusion in OpenTelemetry setups. Being explicit about merge order and logging conflicts during development saves significant debugging time when your telemetry data shows unexpected values.
