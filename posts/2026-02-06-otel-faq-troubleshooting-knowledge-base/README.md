# How to Build an Internal OpenTelemetry FAQ and Troubleshooting Knowledge Base

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: OpenTelemetry, Troubleshooting, Knowledge Base, Developer Support

Description: Build an internal FAQ and troubleshooting knowledge base for OpenTelemetry that reduces repeated questions and speeds up debugging across your organization.

Every organization that adopts OpenTelemetry accumulates tribal knowledge. One engineer knows why traces disappear when you use async/await incorrectly. Another knows the exact collector config that fixes memory pressure under load. If that knowledge lives only in people's heads or scattered Slack threads, it is effectively lost. A structured FAQ and troubleshooting knowledge base captures it and makes it searchable.

## Organizing the Knowledge Base

Structure your knowledge base around the questions people actually ask, not around OpenTelemetry's architecture. Group entries into four categories:

1. **Setup and Configuration** - Getting started problems
2. **Missing or Broken Telemetry** - "Where did my data go?"
3. **Performance Issues** - Overhead and resource problems
4. **Querying and Analysis** - How to find what you need

## The FAQ Template

Every entry should follow a consistent format:

```markdown
## Q: [The exact question someone would ask]

**Symptoms**: What the developer observes
**Root Cause**: Why this happens
**Solution**: Step-by-step fix
**Related**: Links to other relevant entries
```

## Essential FAQ Entries

Here are the entries you will need within your first month of adoption.

### Setup and Configuration

**Q: My service is not sending any traces. How do I debug this?**

Symptoms: No traces appear in Jaeger/Tempo for your service.

Root Cause: Usually one of three things - the SDK is not initialized, the exporter endpoint is wrong, or a network issue is blocking the connection.

Solution:

```bash
# Step 1: Enable SDK debug logging to see what the exporter is doing
export OTEL_LOG_LEVEL=debug

# Step 2: Verify the collector endpoint is reachable from your service
curl -v http://otel-collector.observability:4317

# Step 3: Check if the SDK is initialized by looking for startup logs
# You should see something like:
# "OpenTelemetry SDK initialized with OTLP exporter"

# Step 4: Send a test span using the otel-cli tool
otel-cli exec --service "test-service" --name "test-span" -- echo "hello"
```

**Q: How do I set the service name for my application?**

Solution: Set the `OTEL_SERVICE_NAME` environment variable. This is the simplest approach and works across all languages:

```bash
export OTEL_SERVICE_NAME=order-service
```

Alternatively, set it in code through the Resource:

```python
from opentelemetry.sdk.resources import Resource

resource = Resource.create({"service.name": "order-service"})
```

### Missing or Broken Telemetry

**Q: My traces are missing spans. The waterfall has gaps.**

Symptoms: Trace view shows a parent span but child spans from downstream services are missing.

Root Cause: Context propagation is failing. The trace context headers are not being forwarded between services.

Solution:

```python
# Check that your HTTP client is instrumented
# If you are using requests:
from opentelemetry.instrumentation.requests import RequestsInstrumentor
RequestsInstrumentor().instrument()

# If you are making manual HTTP calls, inject context:
from opentelemetry.propagate import inject

headers = {}
inject(headers)
# Now pass these headers in your HTTP request
response = make_http_call(url, headers=headers)
```

**Q: My span attributes are not showing up in the backend.**

Symptoms: You set attributes on a span but they do not appear when you view the trace.

Root Cause: Either the attribute key has a typo, the attribute is being dropped by a processor, or you are setting attributes after the span has ended.

Solution:

```java
// Make sure you set attributes BEFORE calling span.end()
Span span = tracer.spanBuilder("process.order").startSpan();
try (Scope scope = span.makeCurrent()) {
    // Good: setting attributes while span is active
    span.setAttribute("order.id", orderId);
    doWork();
} finally {
    // span.end() must come AFTER all setAttribute calls
    span.end();
}
```

### Performance Issues

**Q: OpenTelemetry is adding too much latency to my requests.**

Symptoms: P99 latency increased after adding instrumentation.

Root Cause: Usually caused by synchronous exporting, excessive span creation, or large attribute payloads.

Solution:

```yaml
# Ensure you are using the batch span processor, not the simple one
# The batch processor queues spans and exports them in the background

# Check your SDK configuration:
# - BatchSpanProcessor (good - async, batched)
# - SimpleSpanProcessor (bad for production - synchronous)

# In your collector, tune the batch processor:
processors:
  batch:
    send_batch_size: 8192
    timeout: 5s
    send_batch_max_size: 16384
```

**Q: The collector is using too much memory.**

Symptoms: Collector pods are OOMKilled or memory usage is growing unbounded.

Root Cause: The collector is buffering more data than it can export, usually because the backend is slow or the batch sizes are too large.

Solution:

```yaml
# Add or tune the memory_limiter processor
# This MUST be the first processor in your pipeline
processors:
  memory_limiter:
    check_interval: 1s
    limit_mib: 1500       # Hard limit
    spike_limit_mib: 512  # Buffer for spikes

service:
  pipelines:
    traces:
      processors: [memory_limiter, batch]  # memory_limiter goes first
```

### Querying and Analysis

**Q: How do I find traces for a specific user?**

Solution: Make sure your services set a `user.id` attribute on spans. Then query by that attribute:

```bash
# In Jaeger, use the tag search:
# Service: order-service
# Tags: user.id=usr_abc123

# In Grafana with Tempo:
{ resource.service.name="order-service" && span.user.id="usr_abc123" }
```

## Maintaining the Knowledge Base

The knowledge base is only valuable if it stays current. Here is how to keep it alive:

- When someone asks a question in Slack that takes more than two minutes to answer, turn that answer into a knowledge base entry
- Assign a rotating "knowledge base gardener" role that reviews entries monthly
- Add links to relevant entries in your incident postmortems
- Include "check the KB" as a step in your on-call runbook before escalating

Store the knowledge base in a searchable format. A directory of Markdown files in your documentation repository works well. Avoid wikis that require special access or are hard to search.

A good troubleshooting knowledge base pays for itself the first time it saves an engineer from spending an hour debugging a problem someone else already solved. Start with the ten most common questions your team asks, and grow it from there.
