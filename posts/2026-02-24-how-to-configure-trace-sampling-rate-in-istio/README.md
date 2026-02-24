# How to Configure Trace Sampling Rate in Istio

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Istio, Tracing, Sampling Rate, Observability, Performance

Description: Learn how to configure and tune trace sampling rates in Istio for the right balance between observability and performance overhead.

---

Tracing every single request in production is rarely practical. The storage costs add up fast, the tracing backend gets overwhelmed, and the Envoy sidecars spend resources generating and sending spans that nobody will ever look at. Sampling lets you trace a fraction of requests while still getting enough data to understand your system's behavior. Getting the sampling rate right is one of those things that seems simple but has a few subtleties worth understanding.

## How Sampling Works in Istio

When Envoy receives a request, it makes a sampling decision - should this request be traced or not? If the incoming request already has trace headers with a sampling flag, Envoy respects that decision. If there's no existing sampling decision (like for a new request entering the mesh), Envoy uses its configured sampling rate to decide.

This is called head-based sampling. The decision is made at the start of the trace, before anything is known about whether the request will be slow, fail, or succeed. Every subsequent service in the call chain respects the initial sampling decision.

## Setting the Sampling Rate via Telemetry API

The recommended way to configure sampling in modern Istio versions:

```yaml
apiVersion: telemetry.istio.io/v1
kind: Telemetry
metadata:
  name: tracing-config
  namespace: istio-system
spec:
  tracing:
    - providers:
        - name: zipkin
      randomSamplingPercentage: 1.0
```

This sets a 1% sampling rate mesh-wide. The value is a float, so you can use decimals like `0.1` for 0.1% sampling.

Common sampling rates and what they mean:

| Rate | Requests/sec at 10K RPS | Daily Trace Volume |
|------|--------------------------|-------------------|
| 100% | 10,000 | ~864M spans |
| 10% | 1,000 | ~86.4M spans |
| 1% | 100 | ~8.64M spans |
| 0.1% | 10 | ~864K spans |

## Setting Sampling via MeshConfig

You can also set the default sampling rate in the mesh configuration:

```yaml
apiVersion: install.istio.io/v1alpha1
kind: IstioOperator
spec:
  meshConfig:
    enableTracing: true
    defaultConfig:
      tracing:
        sampling: 1.0
```

Note that the Telemetry API takes precedence over MeshConfig when both are configured.

## Per-Namespace Sampling Rates

Different namespaces might need different sampling rates. A staging environment can afford 100% sampling, while production might need 1%:

```yaml
# Staging - trace everything
apiVersion: telemetry.istio.io/v1
kind: Telemetry
metadata:
  name: staging-tracing
  namespace: staging
spec:
  tracing:
    - providers:
        - name: zipkin
      randomSamplingPercentage: 100
---
# Production - conservative sampling
apiVersion: telemetry.istio.io/v1
kind: Telemetry
metadata:
  name: prod-tracing
  namespace: production
spec:
  tracing:
    - providers:
        - name: zipkin
      randomSamplingPercentage: 1.0
```

## Per-Workload Sampling

For critical services that you want to trace more aggressively:

```yaml
apiVersion: telemetry.istio.io/v1
kind: Telemetry
metadata:
  name: payment-tracing
  namespace: production
spec:
  selector:
    matchLabels:
      app: payment-service
  tracing:
    - providers:
        - name: zipkin
      randomSamplingPercentage: 10.0
```

The payment service gets 10% sampling while everything else in the namespace follows the namespace or mesh-wide default.

## Using Pod Annotations for Sampling

Individual pods can override the sampling rate using annotations:

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: my-service
spec:
  template:
    metadata:
      annotations:
        proxy.istio.io/config: |
          tracing:
            sampling: 50.0
    spec:
      containers:
        - name: my-service
          image: my-service:latest
```

This is useful for temporarily increasing the sampling rate on a specific deployment for debugging without changing any cluster-wide configuration.

## The Priority Order

When multiple sampling configurations exist, the most specific one wins:

1. Pod annotation (most specific)
2. Workload-level Telemetry (selector with matchLabels)
3. Namespace-level Telemetry
4. Mesh-wide Telemetry (in istio-system namespace)
5. MeshConfig defaultConfig.tracing.sampling (least specific)

## Force-Tracing with Debug Headers

Sometimes you need to trace a specific request regardless of the sampling rate. Envoy supports force-tracing through the `X-B3-Flags` header:

```bash
# Force-trace a specific request
curl -H "X-B3-Flags: 1" http://my-service.example.com/api/endpoint
```

Or use the `X-B3-Sampled` header:

```bash
# Explicitly set sampling decision to "yes"
curl -H "X-B3-Sampled: 1" http://my-service.example.com/api/endpoint
```

This is handy for debugging specific requests in production without changing the global sampling rate.

## Choosing the Right Sampling Rate

The right sampling rate depends on several factors:

**Traffic volume:** High-traffic services need lower sampling rates. A service handling 100K RPS at 1% still generates 1,000 traces per second.

**Backend capacity:** Check how many spans per second your tracing backend can ingest and store. Jaeger with Elasticsearch can typically handle 10,000-50,000 spans per second per collector instance.

**Debugging needs:** If you're actively investigating an issue, temporarily increase the sampling rate for the affected services.

**Cost:** Cloud-hosted tracing services often charge per span. At $0.20 per million spans, 100% sampling on a 10K RPS service costs about $150/day.

A practical approach:

```yaml
# Start here and adjust
apiVersion: telemetry.istio.io/v1
kind: Telemetry
metadata:
  name: baseline-tracing
  namespace: istio-system
spec:
  tracing:
    - providers:
        - name: otel-tracing
      randomSamplingPercentage: 1.0
```

Monitor your tracing backend's ingestion rate and storage growth for a week, then adjust up or down.

## Verifying the Sampling Rate

Check what sampling rate is actually configured for a workload:

```bash
# View the effective proxy config
istioctl proxy-config bootstrap deploy/my-service -o json | grep -A5 "random_sampling"

# Check the Telemetry resources in effect
kubectl get telemetry -A

# Verify by generating traffic and counting traces
for i in $(seq 1 1000); do
  kubectl exec deploy/sleep -- curl -s http://httpbin:8000/get > /dev/null
done
# Then check your tracing backend for approximately 10 traces (at 1% sampling)
```

## Dynamic Sampling Rate Changes

One nice feature of the Telemetry API is that changes take effect without restarting pods. Update the sampling rate:

```bash
kubectl patch telemetry baseline-tracing -n istio-system --type merge -p '
spec:
  tracing:
    - providers:
        - name: otel-tracing
      randomSamplingPercentage: 10.0
'
```

The Envoy sidecars pick up the new configuration through xDS updates from istiod. This typically takes a few seconds, though there can be a brief period where different pods are using different rates during the rollout.

## Combining Head-Based and Tail-Based Sampling

Head-based sampling (what Istio does natively) has a limitation: it can't know at the start of a request whether that request will be interesting. A 1% sampling rate means you might miss error traces.

For smarter sampling, combine Istio's head-based sampling with tail-based sampling in an OpenTelemetry Collector:

1. Set Istio's sampling rate to 100% (send all spans to the collector)
2. Configure the collector with tail-based sampling policies
3. The collector keeps error traces and slow traces at 100%, samples normal traces at a lower rate

This gives you complete visibility into errors and latency issues while keeping overall trace volume manageable. The tradeoff is higher resource usage on the collector and more network traffic from sidecars to the collector.

## Summary

Start with a low sampling rate (1%) in production and increase it for specific services or namespaces as needed. Use the Telemetry API for its flexibility and dynamic updates, pod annotations for temporary debugging overrides, and force-trace headers for individual requests. If you need error-aware sampling, route everything through an OpenTelemetry Collector with tail-based sampling policies.
