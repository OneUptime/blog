# How to Configure Telemetry Sampling Rates in Istio

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Istio, Telemetry, Tracing, Sampling, Observability

Description: Complete guide to configuring trace sampling rates in Istio, including random, per-workload, and context-propagated sampling strategies.

---

Sampling is one of those things that sounds simple but has a surprising amount of nuance. In a busy mesh handling thousands of requests per second, tracing every single request is not practical. It would consume too much CPU on the proxies, too much bandwidth on the network, and too much storage in your trace backend. Sampling lets you trace a percentage of requests while still getting statistically useful data.

Here is how to configure sampling rates properly in Istio.

## How Sampling Works in Istio

When a request enters the mesh, the first proxy it hits makes a sampling decision. It rolls the dice, and if the request falls within the sampling percentage, the proxy generates a trace span and sets propagation headers so that downstream services also trace that request.

The key headers are:

- `x-b3-traceid` - Unique ID for the trace
- `x-b3-spanid` - Unique ID for the span
- `x-b3-sampled` - Whether this trace is sampled (1) or not (0)
- `traceparent` - W3C trace context header (used by OpenTelemetry)

When `x-b3-sampled` is set to `1`, all downstream proxies will generate spans for that request regardless of their own sampling configuration. This is important because it means sampling is a per-trace decision, not a per-hop decision.

## Setting the Global Sampling Rate

The simplest configuration is a mesh-wide sampling rate:

```yaml
apiVersion: telemetry.istio.io/v1
kind: Telemetry
metadata:
  name: mesh-sampling
  namespace: istio-system
spec:
  tracing:
    - providers:
        - name: otel
      randomSamplingPercentage: 5.0
```

This tells Istio to sample 5% of requests randomly. The `randomSamplingPercentage` accepts a float between 0 and 100.

Common production values:

- **0.1%** - Very high traffic services (10K+ requests/second)
- **1%** - High traffic services (1K-10K requests/second)
- **5%** - Medium traffic services (100-1K requests/second)
- **10-25%** - Lower traffic services (under 100 requests/second)
- **100%** - Development and staging environments

## Setting the Sampling Rate via MeshConfig

You can also set sampling through the mesh configuration, which was the original way before the Telemetry API:

```yaml
apiVersion: install.istio.io/v1alpha1
kind: IstioOperator
spec:
  meshConfig:
    defaultConfig:
      tracing:
        sampling: 10.0
```

The Telemetry API approach is preferred because it supports namespace and workload-level overrides, but the meshConfig approach still works.

## Per-Namespace Sampling Rates

Different namespaces often have different traffic patterns. You can set namespace-specific rates:

```yaml
apiVersion: telemetry.istio.io/v1
kind: Telemetry
metadata:
  name: staging-full-sampling
  namespace: staging
spec:
  tracing:
    - providers:
        - name: otel
      randomSamplingPercentage: 100.0
---
apiVersion: telemetry.istio.io/v1
kind: Telemetry
metadata:
  name: production-sampling
  namespace: production
spec:
  tracing:
    - providers:
        - name: otel
      randomSamplingPercentage: 1.0
---
apiVersion: telemetry.istio.io/v1
kind: Telemetry
metadata:
  name: batch-no-sampling
  namespace: batch-processing
spec:
  tracing:
    - providers:
        - name: otel
      randomSamplingPercentage: 0.0
```

Namespace-scoped Telemetry resources override the mesh-wide configuration for workloads in that namespace.

## Per-Workload Sampling Rates

For even finer control, target specific workloads:

```yaml
apiVersion: telemetry.istio.io/v1
kind: Telemetry
metadata:
  name: api-gateway-sampling
  namespace: production
spec:
  selector:
    matchLabels:
      app: api-gateway
  tracing:
    - providers:
        - name: otel
      randomSamplingPercentage: 0.5
---
apiVersion: telemetry.istio.io/v1
kind: Telemetry
metadata:
  name: checkout-sampling
  namespace: production
spec:
  selector:
    matchLabels:
      app: checkout-service
  tracing:
    - providers:
        - name: otel
      randomSamplingPercentage: 10.0
```

The API gateway handles all incoming traffic, so a low rate keeps the volume manageable. The checkout service handles fewer but more important requests, so a higher rate gives better coverage.

## Pod Annotation Override

For quick debugging, you can override the sampling rate on a specific pod without creating a Telemetry resource:

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: debug-target
spec:
  template:
    metadata:
      annotations:
        proxy.istio.io/config: |
          tracing:
            sampling: 100.0
    spec:
      containers:
        - name: my-app
          image: my-app:v1
```

This is useful for short-term debugging. Apply the annotation, get your traces, then remove it.

## Force-Sampling Specific Requests

Sometimes you want to force tracing for specific requests without changing the global rate. You can do this by setting the trace header on the client side:

```bash
# Force sampling with B3 headers
curl -H "x-b3-sampled: 1" -H "x-b3-traceid: $(openssl rand -hex 16)" -H "x-b3-spanid: $(openssl rand -hex 8)" http://my-service/api/endpoint

# Force sampling with W3C trace context
curl -H "traceparent: 00-$(openssl rand -hex 16)-$(openssl rand -hex 8)-01" http://my-service/api/endpoint
```

When the proxy sees the `x-b3-sampled: 1` header (or the `01` flags in traceparent), it will generate spans regardless of the configured sampling rate.

This is how you can trace a specific request through the entire mesh for debugging without increasing the global rate.

## Understanding Sampling Precedence

Istio follows a clear precedence order for sampling configuration:

1. **Incoming trace headers** - If the request already has a sampling decision in its headers, that decision is respected
2. **Workload-specific Telemetry** - Selector-based Telemetry in the same namespace
3. **Namespace-scoped Telemetry** - Telemetry without a selector in the namespace
4. **Mesh-wide Telemetry** - Telemetry in `istio-system` without a selector
5. **MeshConfig** - The `tracing.sampling` field in mesh configuration

Higher-priority configurations override lower-priority ones.

## Tail-Based Sampling Alternative

Random sampling at the proxy level (head-based sampling) has a downside: you might miss interesting traces because the sampling decision is made before the request is processed. A request that will fail or be slow looks the same as any other request at the start.

Tail-based sampling makes the decision after the trace is complete. This requires an external component like the OpenTelemetry Collector:

```yaml
# OTel Collector config with tail sampling
processors:
  tail_sampling:
    decision_wait: 15s
    num_traces: 200000
    policies:
      - name: sample-errors
        type: status_code
        status_code:
          status_codes: [ERROR]
      - name: sample-slow
        type: latency
        latency:
          threshold_ms: 2000
      - name: sample-random
        type: probabilistic
        probabilistic:
          sampling_percentage: 1
```

With this setup, you would set Istio's sampling to 100% (so all spans reach the Collector) and let the Collector decide which traces to keep. This gives you all error traces and slow traces plus a random sample of normal ones.

The tradeoff is that 100% sampling at the proxy level costs more CPU and bandwidth. But you get much better trace coverage for the cases that matter.

## Verifying Your Sampling Configuration

Check what sampling rate is active for a specific proxy:

```bash
istioctl proxy-config bootstrap deploy/my-service -o json | jq '.bootstrap.tracing'
```

Check how many spans are actually being generated:

```bash
kubectl exec deploy/my-service -c istio-proxy -- curl -s localhost:15000/stats | grep "tracing.opentelemetry.spans"
```

And verify in your trace backend that traces are arriving at the expected rate relative to your request rate.

## Practical Tips

1. **Start with 100% in staging** - Always trace everything in non-production environments
2. **Use math to set production rates** - If you get 1000 req/sec and want 10 traces/sec, set sampling to 1%
3. **Monitor your trace backend** - If it is falling behind on ingestion, lower the rate
4. **Use force-sampling for debugging** - Do not increase the global rate just to capture one bad request
5. **Consider tail-based sampling** for the best of both worlds, if you can afford the proxy overhead

The right sampling rate is the one that gives you enough traces to debug issues without overwhelming your infrastructure. Start conservative and increase if you need more visibility.
