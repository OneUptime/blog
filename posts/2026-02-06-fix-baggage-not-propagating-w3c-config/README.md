# How to Fix Baggage Values Not Propagating Across Service Boundaries Because W3CBaggagePropagator Is Not Configured

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: OpenTelemetry, Baggage, Context Propagation, W3C

Description: Fix baggage values not propagating between services because the W3C Baggage propagator is not configured in the SDK.

You set baggage values in Service A, expecting them to be available in Service B downstream. But when you read the baggage in Service B, it is empty. Trace context propagates fine, so trace IDs match across services, but baggage values vanish at the service boundary. The issue is that the W3C Baggage propagator is not included in your propagator configuration.

## Understanding Baggage vs Trace Context

OpenTelemetry uses two separate propagation mechanisms:

- **TraceContext (W3C)**: Propagates `traceparent` and `tracestate` headers for distributed tracing
- **Baggage (W3C)**: Propagates `baggage` header for key-value pairs across services

These are configured independently. Having trace context propagation enabled does not automatically enable baggage propagation.

```
Service A                          Service B
  |                                  |
  | traceparent: 00-trace-id-...  -> | Trace context works
  | baggage: user.id=123          -> | Baggage only works if propagator is configured
```

## Diagnosing the Problem

Check what propagators are configured:

```python
from opentelemetry import propagate

# Print the current propagator
print(type(propagate.get_global_textmap()))
# If this shows only TraceContextTextMapPropagator, baggage is NOT propagated
```

Check the HTTP headers being sent between services:

```bash
# In Service B, log incoming headers
# You should see both 'traceparent' and 'baggage' headers
# If 'baggage' is missing, the propagator is not injecting it
```

## The Fix: Add the Baggage Propagator

### Python

```python
from opentelemetry import propagate
from opentelemetry.propagators.composite import CompositePropagator
from opentelemetry.propagators.b3 import B3MultiFormat
from opentelemetry.trace.propagation import TraceContextTextMapPropagator
from opentelemetry.baggage.propagation import W3CBaggagePropagator

# Configure both propagators
propagate.set_global_textmap(
    CompositePropagator([
        TraceContextTextMapPropagator(),  # For trace context
        W3CBaggagePropagator(),            # For baggage
    ])
)
```

### Go

```go
package main

import (
    "go.opentelemetry.io/otel"
    "go.opentelemetry.io/otel/propagation"
)

func initPropagator() {
    // Set up composite propagator with both TraceContext and Baggage
    otel.SetTextMapPropagator(
        propagation.NewCompositeTextMapPropagator(
            propagation.TraceContext{},  // For trace context headers
            propagation.Baggage{},       // For baggage headers
        ),
    )
}
```

### Java

```java
import io.opentelemetry.api.baggage.propagation.W3CBaggagePropagator;
import io.opentelemetry.api.trace.propagation.W3CTraceContextPropagator;
import io.opentelemetry.context.propagation.ContextPropagators;
import io.opentelemetry.context.propagation.TextMapPropagator;

OpenTelemetrySdk.builder()
    .setPropagators(ContextPropagators.create(
        TextMapPropagator.composite(
            W3CTraceContextPropagator.getInstance(),
            W3CBaggagePropagator.getInstance()
        )
    ))
    .buildAndRegisterGlobal();
```

### Node.js

```javascript
const { W3CTraceContextPropagator } = require('@opentelemetry/core');
const { W3CBaggagePropagator } = require('@opentelemetry/core');
const { CompositePropagator } = require('@opentelemetry/core');

const { NodeSDK } = require('@opentelemetry/sdk-node');

const sdk = new NodeSDK({
  textMapPropagator: new CompositePropagator({
    propagators: [
      new W3CTraceContextPropagator(),
      new W3CBaggagePropagator(),
    ],
  }),
});
```

### Via Environment Variable

The simplest approach across all SDKs:

```bash
# Set both propagators via environment variable
export OTEL_PROPAGATORS="tracecontext,baggage"
```

This works with most OpenTelemetry SDKs and is the recommended approach when using auto-instrumentation.

## Using Baggage

Once the propagator is configured, setting and reading baggage:

```python
from opentelemetry import baggage, context

# Service A: Set baggage
ctx = baggage.set_baggage("user.id", "12345")
ctx = baggage.set_baggage("tenant.name", "acme-corp", context=ctx)

# The baggage will be propagated via the 'baggage' HTTP header
# Header: baggage: user.id=12345,tenant.name=acme-corp
```

```python
# Service B: Read baggage (it arrives automatically via context propagation)
user_id = baggage.get_baggage("user.id")
tenant = baggage.get_baggage("tenant.name")
print(f"User: {user_id}, Tenant: {tenant}")
```

## Important Caveats

### Baggage Is Not Encrypted

Baggage values are sent as plain text in HTTP headers. Do not put sensitive data (passwords, tokens, PII) in baggage:

```python
# DO NOT DO THIS
baggage.set_baggage("user.ssn", "123-45-6789")  # Sensitive data!

# DO THIS INSTEAD
baggage.set_baggage("user.id", "usr_abc123")  # Safe reference ID
```

### Both Services Must Configure the Propagator

The sending service needs the propagator to inject the `baggage` header. The receiving service needs it to extract the baggage from the header. If either side is missing the propagator, baggage will not work.

### Collector Does Not Need Baggage Configuration

The Collector passes through HTTP headers transparently. You do not need to configure the Collector for baggage propagation. Baggage is handled entirely by the SDKs in your application services.

## Verifying Propagation

```bash
# Trace the headers between services
# In Service A (sending side), log the outgoing headers
# In Service B (receiving side), log the incoming headers

# You should see:
# traceparent: 00-4bf92f3577b34da6a3ce929d0e0e4736-00f067aa0ba902b7-01
# baggage: user.id=12345,tenant.name=acme-corp
```

Baggage propagation is a powerful feature for passing contextual information across service boundaries, but it requires explicit configuration. Always set `OTEL_PROPAGATORS="tracecontext,baggage"` on all services that need to send or receive baggage.
