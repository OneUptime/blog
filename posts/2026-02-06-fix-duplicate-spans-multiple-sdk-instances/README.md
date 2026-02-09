# How to Fix Duplicate Spans Appearing in Your Tracing Backend Due to Multiple SDK Instances in the Same Process

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: OpenTelemetry, Tracing, SDK, Debugging

Description: Fix duplicate span generation caused by multiple OpenTelemetry SDK instances being initialized in the same application process.

You check your tracing backend and notice that every operation produces two or three identical spans. The traces look correct in structure, but each span appears multiple times. This is a telltale sign of multiple SDK instances running in the same process, each generating its own copy of every span.

## Why This Happens

The OpenTelemetry SDK uses a global TracerProvider. If your application initializes the SDK more than once, you end up with multiple TracerProviders, each with its own exporter. Every span gets exported once per provider.

Common scenarios that cause this:

1. A library initializes the SDK, and your application also initializes it
2. Auto-instrumentation is active alongside manual SDK initialization
3. Multiple initialization paths in a dependency injection framework
4. Hot-reload in development re-initializes the SDK without shutting down the previous instance

## Diagnosing the Problem

```bash
# Look at your tracing backend for duplicate span IDs
# Each span should have a unique span_id
# If you see the same operation with different span_ids but identical timestamps,
# you have multiple SDK instances

# In your application, add debug logging to see how many providers exist
```

For Python:

```python
from opentelemetry import trace

# Check how many span processors are registered
provider = trace.get_tracer_provider()
print(f"Provider type: {type(provider)}")

# If using the SDK provider, check processors
if hasattr(provider, '_active_span_processor'):
    processor = provider._active_span_processor
    if hasattr(processor, '_span_processors'):
        print(f"Number of processors: {len(processor._span_processors)}")
        # If this is > 1 and you only expected 1, you have duplicates
```

For Java, check the logs at startup:

```bash
# Look for multiple initialization messages
grep "OpenTelemetry SDK" app.log | wc -l
# If > 1, the SDK is being initialized multiple times
```

## Fix for Python

Make sure you only initialize the SDK once. Use a guard:

```python
from opentelemetry import trace
from opentelemetry.sdk.trace import TracerProvider
from opentelemetry.sdk.trace.export import BatchSpanProcessor
from opentelemetry.exporter.otlp.proto.grpc.trace_exporter import OTLPSpanExporter

# Only initialize if a real provider is not already set
_initialized = False

def init_telemetry():
    global _initialized
    if _initialized:
        return

    provider = TracerProvider()
    processor = BatchSpanProcessor(
        OTLPSpanExporter(endpoint="http://otel-collector:4317", insecure=True)
    )
    provider.add_span_processor(processor)
    trace.set_tracer_provider(provider)
    _initialized = True
```

## Fix for Node.js

In Node.js, the common mistake is initializing in multiple module files:

```javascript
// telemetry.js - single initialization module
const { NodeSDK } = require('@opentelemetry/sdk-node');
const { OTLPTraceExporter } = require('@opentelemetry/exporter-trace-otlp-grpc');

let sdk = null;

function initTelemetry() {
  // Prevent double initialization
  if (sdk !== null) {
    return;
  }

  sdk = new NodeSDK({
    traceExporter: new OTLPTraceExporter({
      url: 'http://otel-collector:4317',
    }),
  });

  sdk.start();
}

module.exports = { initTelemetry };
```

Import and call this from a single entry point:

```javascript
// index.js - must be the first import
const { initTelemetry } = require('./telemetry');
initTelemetry();

// Now import everything else
const express = require('express');
// ...
```

## Fix for Java (Auto-Instrumentation + Manual)

When using the Java auto-instrumentation agent alongside manual SDK configuration, the agent already creates a TracerProvider. Do not create another one:

```java
// WRONG - creates a second provider alongside the agent's provider
TracerProvider provider = SdkTracerProvider.builder()
    .addSpanProcessor(BatchSpanProcessor.builder(exporter).build())
    .build();
OpenTelemetrySdk.builder().setTracerProvider(provider).buildAndRegisterGlobal();

// CORRECT - use the globally registered provider from the agent
Tracer tracer = GlobalOpenTelemetry.getTracer("my-service");
// The agent has already configured the exporter and processor
```

If you need to add custom configuration, use the agent's extension mechanism instead of initializing a second SDK.

## Fix for Auto-Instrumentation + Manual Instrumentation

When using the Operator's auto-instrumentation alongside your own SDK initialization:

```yaml
# Option 1: Remove auto-instrumentation and manage the SDK yourself
# Do NOT add this annotation:
# instrumentation.opentelemetry.io/inject-python: "true"

# Option 2: Use auto-instrumentation and remove manual SDK initialization
# Add the annotation and remove your SDK init code
metadata:
  annotations:
    instrumentation.opentelemetry.io/inject-python: "true"
```

Pick one approach, not both.

## Detecting Duplicates in the Backend

If you are not sure whether you have duplicates, query your backend:

```sql
-- For backends with SQL-like query languages
SELECT span_name, count(*) as cnt
FROM spans
WHERE trace_id = 'your-trace-id'
GROUP BY span_name
HAVING count(*) > 1
ORDER BY cnt DESC;
```

## Cleanup

If you had multiple providers and need to shut them down cleanly:

```python
# Python - shutdown all processors before reinitializing
provider = trace.get_tracer_provider()
if hasattr(provider, 'shutdown'):
    provider.shutdown()

# Now initialize cleanly
new_provider = TracerProvider()
# ... configure and set
trace.set_tracer_provider(new_provider)
```

Duplicate spans double your storage costs and make traces confusing to read. The fix is always the same: ensure exactly one TracerProvider is initialized per process. Audit your initialization code, check for conflicts with auto-instrumentation, and add guards to prevent re-initialization.
