# How to Correlate CPU Profiling Data with OpenTelemetry Traces to Identify Hot Code Paths

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: OpenTelemetry, CPU Profiling, Traces, Performance

Description: Correlate CPU profiling data with OpenTelemetry traces to pinpoint the exact code paths consuming CPU time within slow production requests.

Traces tell you which operation is slow. CPU profiles tell you which lines of code are consuming time. Separately, they answer different questions. Together, they answer the question that actually matters: which specific code, in which specific request flow, is burning CPU cycles in production?

## The Correlation Problem

A trace shows that `order.calculate_totals` takes 800ms. But why? The span has no children, so the time is spent inside the function itself. Is it a hot loop? A regex that backtracks? An expensive serialization? The trace cannot tell you. A CPU profile can, but a standalone profile shows aggregated data across all requests. You need to link the profile to the specific trace to get the full picture.

## Setting Up Continuous Profiling

OpenTelemetry is developing profiling support as a signal type. In the meantime, several approaches let you collect profiles and correlate them with traces.

### Using Pyroscope with Span Profiles

Pyroscope supports linking profile data to OpenTelemetry spans:

```go
// Go service with Pyroscope span profiling
package main

import (
    "github.com/grafana/pyroscope-go"
    otelpyroscope "github.com/grafana/otel-profiling-go"
    "go.opentelemetry.io/otel"
)

func main() {
    // Initialize Pyroscope
    pyroscope.Start(pyroscope.Config{
        ApplicationName: "order-service",
        ServerAddress:   "http://pyroscope.internal:4040",
        ProfileTypes: []pyroscope.ProfileType{
            pyroscope.ProfileCPU,
            pyroscope.ProfileAllocObjects,
            pyroscope.ProfileAllocSpace,
        },
    })

    // Wrap the tracer provider with Pyroscope's profiling integration
    // This links profile data to active spans
    tp := otel.GetTracerProvider()
    otel.SetTracerProvider(otelpyroscope.NewTracerProvider(tp))

    // Now every span created through the tracer will have
    // associated CPU profile data
    startServer()
}
```

### Using async-profiler with Java

```java
// Java service: trigger profiling during slow operations
import one.profiler.AsyncProfiler;

public class OrderService {
    private static final AsyncProfiler profiler = AsyncProfiler.getInstance();

    public OrderResult calculateTotals(Order order) {
        Span span = tracer.spanBuilder("order.calculate_totals").startSpan();
        try (Scope scope = span.makeCurrent()) {
            span.setAttribute("order.id", order.getId());
            span.setAttribute("order.item_count", order.getItems().size());

            // Start profiling if this is a sampled trace
            String profileId = null;
            if (span.getSpanContext().isSampled()) {
                profileId = span.getSpanContext().getTraceId();
                profiler.execute(String.format(
                    "start,event=cpu,file=/tmp/profile-%s.jfr", profileId
                ));
            }

            OrderResult result = doExpensiveCalculation(order);

            // Stop profiling and attach reference to span
            if (profileId != null) {
                profiler.execute("stop");
                span.setAttribute("profile.id", profileId);
                span.setAttribute("profile.type", "cpu");
            }

            return result;
        } finally {
            span.end();
        }
    }
}
```

### Using perf with Node.js

```javascript
const { Session } = require('inspector');
const { trace } = require('@opentelemetry/api');

const tracer = trace.getTracer('order-service');

async function calculateTotals(order) {
  return tracer.startActiveSpan('order.calculate_totals', async (span) => {
    span.setAttribute('order.id', order.id);

    // Start CPU profiling for this span
    const session = new Session();
    session.connect();
    session.post('Profiler.enable');
    session.post('Profiler.start');

    const result = await doExpensiveCalculation(order);

    // Stop profiling and collect results
    const profile = await new Promise((resolve) => {
      session.post('Profiler.stop', (err, { profile }) => {
        resolve(profile);
      });
    });

    // Attach profile metadata to the span
    span.setAttribute('profile.sample_count', profile.samples.length);
    span.setAttribute('profile.duration_us', profile.endTime - profile.startTime);

    // Save profile with trace ID as reference
    const traceId = span.spanContext().traceId;
    saveProfile(traceId, profile);

    session.disconnect();
    span.end();
    return result;
  });
}
```

## Analyzing Correlated Data

Once you have both trace and profile data linked by trace ID, the debugging workflow becomes straightforward:

### Step 1: Find the Slow Trace

```
# Find traces where calculate_totals takes more than 500ms
{
  resource.service.name = "order-service"
  && name = "order.calculate_totals"
  && duration > 500ms
}
```

### Step 2: Get the Profile for That Trace

```bash
# Retrieve the profile linked to a specific trace
# If using Pyroscope:
curl "http://pyroscope.internal:4040/api/v1/profile?\
app=order-service&\
span_id=abc123def456&\
format=flamegraph"
```

### Step 3: Read the Flame Graph

The flame graph shows you exactly where CPU time is spent within the span's execution:

```
# Example flame graph output (simplified)
# Width represents CPU time percentage

calculateTotals()                          [================== 100% ==================]
  validateLineItems()                      [====== 35% ======]
    checkPriceRules()                      [=== 20% ===]
      regex.match(pricePattern)            [= 15% =]        <-- HOT PATH
    calculateTax()                         [== 10% ==]
  applyDiscounts()                         [======== 40% ========]
    loadDiscountRules()                    [=== 18% ===]
      json.parse(rulesConfig)             [== 12% ==]       <-- HOT PATH
    evaluateRules()                        [==== 22% ====]
  formatResponse()                         [===== 25% =====]
    serialize(orderResult)                 [=== 18% ===]     <-- HOT PATH
```

This immediately tells you three things:

1. `regex.match(pricePattern)` is spending 15% of CPU time on regex evaluation. The price pattern might need optimization or caching.
2. `json.parse(rulesConfig)` is parsing discount rules from JSON on every request. This should be cached.
3. `serialize(orderResult)` is using 18% of CPU time. Consider a more efficient serialization format or caching the serialized output.

## Automating Profile Collection

You do not want to profile every request. Profile sampling should be selective:

```python
import random
from opentelemetry import trace

# Profile 1% of requests, or 100% of requests that are already slow
PROFILE_SAMPLE_RATE = 0.01

def should_profile(span):
    """Decide whether to profile this request."""
    # Always profile if the trace is already marked for debugging
    if span.get_span_context().trace_flags & 0x01:
        return True
    # Random sampling for baseline profiling
    return random.random() < PROFILE_SAMPLE_RATE
```

## Building a Unified View

The ideal workflow is a single UI where you can go from a trace waterfall to a flame graph in one click. If your tools support it (Grafana with Tempo and Pyroscope, for example), configure the data source links:

```yaml
# Grafana data source configuration
# Links Tempo traces to Pyroscope profiles
datasources:
  - name: Tempo
    type: tempo
    jsonData:
      tracesToProfiles:
        datasourceUid: pyroscope-uid
        profileTypeId: "process_cpu:cpu:nanoseconds"
        tags:
          - key: service.name
            value: service_name
```

With this configuration, clicking on a span in the trace view opens the corresponding flame graph in a side panel. No manual correlation needed.

## Practical Tips

Do not profile in production without load testing first. Profiling adds overhead, typically 2-5% CPU for sampling profilers. Make sure your service can absorb that overhead.

Start with continuous profiling at a low sample rate rather than on-demand profiling. Continuous profiling catches intermittent issues that on-demand profiling misses because you have to know when to look.

When analyzing flame graphs, focus on the widest bars first. A function that uses 40% of CPU time is a better optimization target than one using 2%, even if the 2% function looks "wrong."

CPU profiles correlated with traces turn vague performance complaints into specific, actionable optimization targets. Set up the correlation, and the next time someone says "the API is slow," you will know exactly which line of code to fix.
