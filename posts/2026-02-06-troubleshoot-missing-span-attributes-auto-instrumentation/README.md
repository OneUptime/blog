# How to Troubleshoot Missing Span Attributes When Auto-Instrumentation Drops Custom Attributes You Added

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: OpenTelemetry, Span Attributes, Auto-Instrumentation, SDK

Description: Troubleshoot missing custom span attributes that are silently dropped by auto-instrumentation or SDK configuration limits.

You added custom attributes to your spans in code, but when you look at the traces in your backend, those attributes are gone. Auto-instrumented spans show up fine, but your custom attributes are nowhere to be found. This post covers the most common reasons and fixes.

## Reason 1: Setting Attributes on the Wrong Span

Auto-instrumentation creates spans automatically for HTTP requests, database calls, etc. If you create a new span inside an auto-instrumented operation and set attributes on the auto-instrumented span instead of yours (or vice versa), the attributes end up on the wrong span or get lost.

```python
from opentelemetry import trace

tracer = trace.get_tracer("my-service")

def handle_request(request):
    # The auto-instrumentation already created a span for this HTTP request
    # Getting the current span gives you the auto-instrumented one
    current_span = trace.get_current_span()

    # Setting attributes on the current span works
    current_span.set_attribute("user.id", request.user_id)
    current_span.set_attribute("tenant.name", request.tenant)

    # But if you create a child span, attributes on the parent are separate
    with tracer.start_as_current_span("process-order") as child_span:
        child_span.set_attribute("order.id", "12345")
        # This attribute is on the child span, not the parent
        # The parent span (HTTP request) will not have order.id
```

## Reason 2: Attribute Limits in the SDK

The SDK has default limits on the number of attributes per span. The default is 128 attributes. If auto-instrumentation adds many attributes and your custom ones push the total over the limit, the extras get dropped:

```python
from opentelemetry.sdk.trace import TracerProvider

# Check the default limits
provider = TracerProvider(
    span_limits=trace.SpanLimits(
        max_attributes=128,               # Default
        max_attribute_length=None,         # No length limit by default
    )
)
```

Increase the limit if needed:

```python
from opentelemetry.sdk.trace import TracerProvider, SpanLimits

provider = TracerProvider(
    span_limits=SpanLimits(
        max_attributes=256,  # Increase the limit
    )
)
```

Or via environment variable:

```bash
export OTEL_SPAN_ATTRIBUTE_COUNT_LIMIT=256
```

## Reason 3: Attribute Added After Span Ends

If you set an attribute after the span has already ended, the SDK silently ignores it:

```python
with tracer.start_as_current_span("my-operation") as span:
    result = do_work()

# This is OUTSIDE the with block - the span is already ended
span.set_attribute("result.status", result.status)  # Silently ignored!
```

Fix: set attributes before the span ends:

```python
with tracer.start_as_current_span("my-operation") as span:
    result = do_work()
    # Set the attribute while the span is still open
    span.set_attribute("result.status", result.status)
```

## Reason 4: Collector Processor Stripping Attributes

The Collector might have a processor that modifies or removes attributes:

```yaml
# Check your Collector config for attribute processors
processors:
  attributes:
    actions:
      - key: user.id
        action: delete  # This removes the attribute!

  # Or a filter processor might drop spans with certain attributes
  filter:
    spans:
      exclude:
        match_type: strict
        attributes:
          - key: internal.debug
            value: "true"
```

Review your Collector pipeline configuration to make sure no processor is stripping your custom attributes.

## Reason 5: Attribute Key Naming Conflicts

If auto-instrumentation and your code both set the same attribute key, the last write wins:

```python
# Auto-instrumentation sets: http.method = "GET"
# Your code also sets:
span.set_attribute("http.method", "POST")  # Overwrites the auto-instrumented value

# Use a custom namespace for your attributes to avoid conflicts
span.set_attribute("app.custom_method", "POST")  # No conflict
```

## Reason 6: Auto-Instrumentation Configuration Overrides

The Operator's Instrumentation CR might configure attribute limits:

```yaml
apiVersion: opentelemetry.io/v1alpha1
kind: Instrumentation
metadata:
  name: my-instrumentation
spec:
  python:
    env:
      # This might override your SDK settings
      - name: OTEL_SPAN_ATTRIBUTE_COUNT_LIMIT
        value: "50"  # Very low limit!
```

Check the environment variables injected by the Operator:

```bash
kubectl get pod my-app-pod -o jsonpath='{.spec.containers[0].env[*]}' | jq . | grep -i "ATTR\|LIMIT"
```

## Debugging Attributes

Enable SDK debug logging to see what attributes are being set and whether any are dropped:

```python
import logging
logging.basicConfig(level=logging.DEBUG)

# For the OTel SDK specifically
otel_logger = logging.getLogger("opentelemetry")
otel_logger.setLevel(logging.DEBUG)
```

For Node.js:

```javascript
const { diag, DiagConsoleLogger, DiagLogLevel } = require('@opentelemetry/api');
diag.setLogger(new DiagConsoleLogger(), DiagLogLevel.DEBUG);
```

You can also use the Collector's debug exporter to see exactly what arrives:

```yaml
exporters:
  debug:
    verbosity: detailed

service:
  pipelines:
    traces:
      exporters: [debug, otlp]  # Log spans to console AND send to backend
```

## Best Practices

1. Use a custom namespace prefix for your attributes (e.g., `app.user.id` instead of just `user.id`)
2. Set attributes as early as possible, before the span ends
3. Monitor the `otelcol_processor_dropped_spans` metric to detect attribute-related drops
4. Keep your total attribute count well below the SDK limit

Missing attributes are frustrating to debug because the SDK does not throw errors when they are dropped. Always verify your spans contain the expected attributes by checking the raw output in your backend or using the Collector's debug exporter.
