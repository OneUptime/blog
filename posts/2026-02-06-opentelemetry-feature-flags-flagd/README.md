# How to Use OpenTelemetry Feature Flags to Correlate A/B Test Variants

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: OpenTelemetry, Feature Flag, Flagd, A/B Testing, Performance Metrics

Description: Use OpenTelemetry and flagd to connect feature flag variants with performance data, letting you measure the real impact of A/B tests.

Running A/B tests without performance data is risky. Variant B might convert 5% better but also add 200ms of latency. By connecting flagd (the OpenFeature-compatible feature flag daemon) with OpenTelemetry, you can see performance metrics broken down by flag variant. This post shows you how to set it up.

## Setting Up flagd

flagd is a lightweight feature flag daemon that implements the OpenFeature specification. It reads flag definitions from a file, ConfigMap, or remote source.

```bash
# Install flagd

brew install flagd

# Or run as a container
docker run -p 8013:8013 -v $(pwd)/flags.json:/flags.json \
  ghcr.io/open-feature/flagd:latest start \
  --uri file:/flags.json
```

Define your flags:

```json
{
  "$schema": "https://flagd.dev/schema/v0/flags.json",
  "flags": {
    "checkout-flow": {
      "state": "ENABLED",
      "variants": {
        "control": "classic",
        "treatment-a": "streamlined",
        "treatment-b": "one-click"
      },
      "defaultVariant": "control",
      "targeting": {
        "fractional": [
          ["control", 34],
          ["treatment-a", 33],
          ["treatment-b", 33]
        ]
      }
    }
  }
}
```

## Integrating flagd with OpenTelemetry in Your Application

The OpenFeature SDK has hooks that fire when flags are evaluated. Use these hooks to add flag information to your current OpenTelemetry span.

```javascript
// app.js - Node.js example
const { OpenFeature } = require('@openfeature/server-sdk');
const { FlagdProvider } = require('@openfeature/flagd-provider');
const { SpanEventHook } = require('@openfeature/open-telemetry-hooks');
const { trace } = require('@opentelemetry/api');

// Register the flagd provider
OpenFeature.setProvider(new FlagdProvider({
  host: 'localhost',
  port: 8013,
}));

// Add the tracing hook - this automatically adds flag evaluations as span events
OpenFeature.addHooks(new SpanEventHook());

const client = OpenFeature.getClient();

async function handleCheckout(req, res) {
  const span = trace.getActiveSpan();

  // Evaluate the feature flag
  // The SpanEventHook will automatically add a feature_flag.evaluation event
  // to the active span with semantic convention attributes such as:
  //   feature_flag.key = "checkout-flow"
  //   feature_flag.result.variant = "treatment-a"
  //   feature_flag.provider.name = "flagd"
  const details = await client.getStringDetails('checkout-flow', 'control', {
    targetingKey: req.userId,
  });
  const flow = details.value;
  const flagVariant = details.variant ?? flow;

  // Set it explicitly on the checkout span so span-derived metrics can group by it
  span?.setAttribute('checkout.flag_variant', flagVariant);

  if (flow === 'one-click') {
    return processOneClickCheckout(req, res);
  } else if (flow === 'streamlined') {
    return processStreamlinedCheckout(req, res);
  } else {
    return processClassicCheckout(req, res);
  }
}
```

## Python Example with flagd

```python
# app.py
from openfeature import api as openfeature_api
from openfeature.evaluation_context import EvaluationContext
from openfeature.contrib.provider.flagd import FlagdProvider
from openfeature.contrib.hook.opentelemetry import TracingHook
from opentelemetry import trace

# Configure OpenFeature with flagd
openfeature_api.set_provider(FlagdProvider(
    host="localhost",
    port=8013,
))
openfeature_api.add_hooks([TracingHook()])

client = openfeature_api.get_client()
tracer = trace.get_tracer("checkout-service")

def handle_checkout(user_id: str, cart: dict):
    with tracer.start_as_current_span("checkout") as span:
        # Evaluate the flag - tracing hook records it on the span
        details = client.get_string_details(
            "checkout-flow",
            "control",
            evaluation_context=EvaluationContext(targeting_key=user_id),
        )
        flow = details.value
        flag_variant = details.variant or flow

        # Set it explicitly on the checkout span so span-derived metrics can group by it
        span.set_attribute("checkout.flag_variant", flag_variant)
        span.set_attribute("checkout.cart_size", len(cart["items"]))

        # Route to the appropriate checkout flow
        if flow == "one-click":
            result = one_click_checkout(cart)
        elif flow == "streamlined":
            result = streamlined_checkout(cart)
        else:
            result = classic_checkout(cart)

        span.set_attribute("checkout.success", result.success)
        return result
```

## Building Metrics Dashboards by Variant

Now that the checkout span carries the flag variant, you can create metrics that break down performance by variant. Use the OpenTelemetry Collector's span metrics connector:

```yaml
# otel-collector-config.yaml
receivers:
  otlp:
    protocols:
      grpc:
        endpoint: 0.0.0.0:4317

connectors:
  span_metrics:
    namespace: ""
    dimensions:
      - name: checkout.flag_variant
    histogram:
      explicit:
        buckets: [10ms, 50ms, 100ms, 250ms, 500ms, 1s, 2s, 5s]

exporters:
  prometheus:
    endpoint: 0.0.0.0:8889

service:
  pipelines:
    traces:
      receivers: [otlp]
      exporters: [span_metrics]
    metrics:
      receivers: [span_metrics]
      exporters: [prometheus]
```

Query the resulting metrics in Prometheus or Grafana:

```promql
# P95 latency by checkout variant
histogram_quantile(0.95,
  sum(rate(duration_milliseconds_bucket{
    span_name="checkout"
  }[5m])) by (le, checkout_flag_variant)
)

# Error rate by variant
sum(rate(calls_total{
  span_name="checkout",
  status_code="STATUS_CODE_ERROR"
}[5m])) by (checkout_flag_variant)
/
sum(rate(calls_total{
  span_name="checkout"
}[5m])) by (checkout_flag_variant)
```

## Automated Variant Comparison

Write a script that pulls metrics for each variant and flags significant differences:

```python
# compare_variants.py
import requests

PROMETHEUS_URL = "http://localhost:9090"

def get_p95_by_variant():
    """Fetch p95 latency for each checkout variant."""
    query = '''
    histogram_quantile(0.95,
      sum(rate(duration_milliseconds_bucket{
        span_name="checkout"
      }[30m])) by (le, checkout_flag_variant)
    )
    '''
    resp = requests.get(f"{PROMETHEUS_URL}/api/v1/query", params={"query": query})
    results = resp.json()["data"]["result"]

    variants = {}
    for result in results:
        variant = result["metric"]["checkout_flag_variant"]
        p95 = float(result["value"][1])
        variants[variant] = p95

    return variants

variants = get_p95_by_variant()
print("P95 latency by variant:")
for variant, latency in sorted(variants.items()):
    print(f"  {variant}: {latency:.1f}ms")

# Alert if any variant is 20% slower than control
control_latency = variants.get("control", 0)
for variant, latency in variants.items():
    if control_latency > 0 and variant != "control" and latency > control_latency * 1.2:
        print(f"WARNING: {variant} is {((latency/control_latency)-1)*100:.0f}% slower than control")
```

## Summary

By wiring flagd into your OpenTelemetry instrumentation, your traces can include feature flag evaluation events, and your checkout spans can carry the resolved variant for metric aggregation. This lets you answer the question that matters most for A/B tests: "Does the new variant perform well enough to ship?" You do not need separate analytics pipelines or custom instrumentation per experiment. The flag evaluation becomes part of your existing telemetry.
