# How to Configure Resource Merging Strategies When Combining Environment Variable and Host Resource Detectors

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: OpenTelemetry, Resource Detection, Configuration, SDK

Description: Configure resource merging strategies when using multiple OpenTelemetry resource detectors like environment variables and host detectors together.

The OpenTelemetry SDK supports multiple resource detectors that automatically discover metadata about your application's runtime environment. The environment variable detector reads from `OTEL_RESOURCE_ATTRIBUTES`, while the host detector reads hostname and OS information. When you enable both, their results need to be merged. Understanding how this merging works and how to control it prevents surprises where one detector's values silently overwrite another's.

## How Resource Merging Works

Each resource detector produces a `Resource` object with a set of key-value attributes. When multiple detectors run, their results are merged using a "last wins" strategy. The order in which detectors run determines which values take precedence when the same attribute key appears in multiple detectors.

## Python: Combining Detectors

```python
# resource_setup.py
from opentelemetry.sdk.resources import Resource, get_aggregated_resources
from opentelemetry.sdk.resources import (
    OTELResourceDetector,     # Reads OTEL_RESOURCE_ATTRIBUTES
    ProcessResourceDetector,   # Reads process info (PID, command line)
)
from opentelemetry.resourcedetector.host import HostResourceDetector

# Detectors run in order - later detectors can override earlier ones
detectors = [
    OTELResourceDetector(),      # Environment variables (lowest priority)
    HostResourceDetector(),       # Host metadata
    ProcessResourceDetector(),    # Process metadata (highest priority)
]

# get_aggregated_resources merges all detector results
# Later detectors override earlier ones for conflicting keys
detected_resource = get_aggregated_resources(detectors)

# You can also merge with a manually-defined resource
# Manual values take highest priority
manual_resource = Resource.create({
    "service.name": "checkout-service",
    "service.version": "1.4.2",
    "deployment.environment": "production",
})

# Merge: manual values override detected values
final_resource = manual_resource.merge(detected_resource)

print("Final resource attributes:")
for key, value in final_resource.attributes.items():
    print(f"  {key}: {value}")
```

## Understanding Merge Priority

The `Resource.merge()` method follows this rule: attributes from the "other" resource override attributes in the "self" resource. In code:

```python
# result contains all attributes from both resources
# When both have the same key, "other" wins
result = self_resource.merge(other_resource)

# Example:
r1 = Resource.create({"host.name": "from-env", "service.name": "svc-a"})
r2 = Resource.create({"host.name": "from-host-detector", "region": "us-east"})

merged = r1.merge(r2)
# merged.attributes:
#   host.name = "from-host-detector"  (r2 wins for conflicting key)
#   service.name = "svc-a"            (only in r1, kept)
#   region = "us-east"                (only in r2, kept)
```

## Setting Up Merge Order for Predictable Results

If you want environment variables to take the highest priority (so operators can override detected values without changing code):

```python
from opentelemetry.sdk.resources import Resource, get_aggregated_resources
from opentelemetry.sdk.resources import OTELResourceDetector

# Order: host detector first, then env vars override
detected = get_aggregated_resources([
    HostResourceDetector(),       # Detected values (lower priority)
    OTELResourceDetector(),       # Env vars override (higher priority)
])

# Code-defined values get lowest priority
code_resource = Resource.create({
    "service.name": "my-service",
    "host.name": "default-host",
})

# Merge so detected values override code values
# detected.merge(code_resource) = code values override detected
# code_resource.merge(detected) = detected values override code
final = code_resource.merge(detected)
```

## Go: Controlling Detector Order

```go
package main

import (
    "context"
    "fmt"
    "log"

    "go.opentelemetry.io/otel/sdk/resource"
    semconv "go.opentelemetry.io/otel/semconv/v1.21.0"
)

func buildResource(ctx context.Context) (*resource.Resource, error) {
    // Start with code-defined attributes (lowest priority)
    codeResource, err := resource.New(ctx,
        resource.WithAttributes(
            semconv.ServiceName("my-service"),
            semconv.ServiceVersion("1.0.0"),
            semconv.DeploymentEnvironment("production"),
        ),
    )
    if err != nil {
        return nil, err
    }

    // Detect from environment and host (higher priority)
    detectedResource, err := resource.New(ctx,
        resource.WithFromEnv(),     // Reads OTEL_RESOURCE_ATTRIBUTES
        resource.WithHost(),        // Reads host.name, host.id, os.type
        resource.WithProcess(),     // Reads process.pid, process.command
    )
    if err != nil {
        return nil, err
    }

    // Merge: detected values override code values
    merged, err := resource.Merge(codeResource, detectedResource)
    if err != nil {
        return nil, err
    }

    return merged, nil
}

func main() {
    ctx := context.Background()
    res, err := buildResource(ctx)
    if err != nil {
        log.Fatal(err)
    }

    for _, kv := range res.Attributes() {
        fmt.Printf("%s = %s\n", kv.Key, kv.Value.AsString())
    }
}
```

## Java: ResourceProvider and SPI

In Java, resource detectors register via SPI (Service Provider Interface). The merge order is determined by the detector's `order()` method:

```java
import io.opentelemetry.sdk.autoconfigure.spi.ResourceProvider;
import io.opentelemetry.sdk.resources.Resource;
import io.opentelemetry.api.common.Attributes;

// Custom resource provider with explicit ordering
public class AppResourceProvider implements ResourceProvider {

    @Override
    public Resource createResource(ConfigProperties config) {
        return Resource.create(Attributes.builder()
            .put("service.name", "my-service")
            .put("custom.app.id", "checkout-123")
            .build());
    }

    @Override
    public int order() {
        // Higher order = later execution = higher priority
        // Default detectors use order 0
        // Return a negative number for lower priority
        return -1;  // This runs before default detectors
    }
}
```

## Handling Conflicts Explicitly

When you know specific keys might conflict, you can add a validation step:

```python
def validate_resource(resource):
    """Check for potential resource attribute issues."""
    attrs = dict(resource.attributes)

    # Ensure service.name is set and not the default
    service_name = attrs.get("service.name", "")
    if service_name == "" or service_name == "unknown_service":
        raise ValueError(
            "service.name must be explicitly set. "
            "Set OTEL_SERVICE_NAME or OTEL_RESOURCE_ATTRIBUTES"
        )

    # Warn if host.name looks auto-generated
    host_name = attrs.get("host.name", "")
    if host_name.startswith("ip-") or len(host_name) > 50:
        print(f"Warning: host.name '{host_name}' looks auto-generated. "
              f"Consider setting it explicitly.")

    return resource
```

Resource merging is predictable once you understand the ordering rules. Define your priority chain (code defaults < detected values < environment overrides), set up your detectors in that order, and validate the final resource to catch any unexpected overrides.
