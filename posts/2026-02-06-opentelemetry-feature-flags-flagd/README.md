# How to Use OpenTelemetry Feature Flags (flagd) to Correlate A/B Test Variants with Performance Metrics

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: OpenTelemetry, Feature Flags, flagd, A/B Testing, Performance Metrics

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
const { TracingHook } = require('@openfeature/open-telemetry-hooks');
const { trace } = require('@opentelemetry/api');

// Register the flagd provider
OpenFeature.setProvider(new FlagdProvider({
  host: 'localhost',
  port: 8013,
}));

// Add the tracing hook - this automatically adds flag evaluations to spans
OpenFeature.addHooks(new TracingHook());

const client = OpenFeature.getClient();

async function handleCheckout(req, res) {
  const span = trace.getActiveSpan();

  // Evaluate the feature flag
  // The TracingHook will automatically add these as span attributes:
  //   feature_flag.key = "checkout-flow"
  //   feature_flag.variant = "treatment-a"
  //   feature_flag.provider_name = "flagd"
  const variant = await client.getStringValue('checkout-flow', 'control', {
    targetingKey: req.userId,
  });

  // Also set it explicitly if you want more control
  span.setAttribute('ab_test.checkout_flow.variant', variant);

  if (variant === 'one-click') {
    return processOneClickCheckout(req, res);
  } else if (variant === 'streamlined') {
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
        variant = client.get_string_value(
            "checkout-flow",
            "control",
            evaluation_context={"targetingKey": user_id},
        )

        span.set_attribute("checkout.variant", variant)
        span.set_attribute("checkout.cart_size", len(cart["items"]))

        # Route to the appropriate checkout flow
        if variant == "one-click":
            result = one_click_checkout(cart)
        elif variant == "streamlined":
            result = streamlined_checkout(cart)
        else:
            result = classic_checkout(cart)

        span.set_attribute("checkout.success", result.success)
        return result
```

## Building Metrics Dashboards by Variant

Now that every span carries the flag variant, you can create metrics that break down performance by variant. Use the OpenTelemetry Collector's spanmetrics connector:

```yaml
# otel-collector-config.yaml
receivers:
  otlp:
    protocols:
      grpc:
        endpoint: 0.0.0.0:4317

connectors:
  spanmetrics:
    dimensions:
      - name: feature_flag.variant
      - name: feature_flag.key
      - name: checkout.variant
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
      exporters: [spanmetrics]
    metrics:
      receivers: [spanmetrics]
      exporters: [prometheus]
```

Query the resulting metrics in Prometheus or Grafana:

```promql
# P95 latency by checkout variant
histogram_quantile(0.95,
  sum(rate(duration_milliseconds_bucket{
    span_name="checkout",
    feature_flag_key="checkout-flow"
  }[5m])) by (le, feature_flag_variant)
)

# Error rate by variant
sum(rate(calls_total{
  span_name="checkout",
  status_code="STATUS_CODE_ERROR"
}[5m])) by (feature_flag_variant)
/
sum(rate(calls_total{
  span_name="checkout"
}[5m])) by (feature_flag_variant)
```

## Automated Variant Comparison

Write a script that pulls metrics for each variant and flags significant differences:

```python
# compare_variants.py
import requests

PROMETHEUS_URL = "http://localhost:9090"

def get_p95_by_variant(flag_key):
    """Fetch p95 latency for each variant of a feature flag."""
    query = f'''
    histogram_quantile(0.95,
      sum(rate(duration_milliseconds_bucket{{
        feature_flag_key="{flag_key}"
      }}[30m])) by (le, feature_flag_variant)
    )
    '''
    resp = requests.get(f"{PROMETHEUS_URL}/api/v1/query", params={"query": query})
    results = resp.json()["data"]["result"]

    variants = {}
    for result in results:
        variant = result["metric"]["feature_flag_variant"]
        p95 = float(result["value"][1])
        variants[variant] = p95

    return variants

variants = get_p95_by_variant("checkout-flow")
print("P95 latency by variant:")
for variant, latency in sorted(variants.items()):
    print(f"  {variant}: {latency:.1f}ms")

# Alert if any variant is 20% slower than control
control_latency = variants.get("control", 0)
for variant, latency in variants.items():
    if variant != "control" and latency > control_latency * 1.2:
        print(f"WARNING: {variant} is {((latency/control_latency)-1)*100:.0f}% slower than control")
```

## Summary

By wiring flagd into your OpenTelemetry instrumentation, every trace and metric carries the feature flag context. This lets you answer the question that matters most for A/B tests: "Does the new variant perform well enough to ship?" You do not need separate analytics pipelines or custom instrumentation per experiment. The flag evaluation just becomes another attribute on your existing telemetry.
