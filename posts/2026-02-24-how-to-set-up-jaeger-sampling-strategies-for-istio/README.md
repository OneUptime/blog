# How to Set Up Jaeger Sampling Strategies for Istio

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Istio, Jaeger, Tracing, Sampling, Observability

Description: Configure Jaeger sampling strategies in Istio to balance trace coverage with storage costs and performance overhead.

---

Tracing every single request in a busy mesh generates a massive amount of data. If your service handles 10,000 requests per second and each trace contains 10 spans, that's 100,000 spans per second hitting your storage backend. You'll burn through disk space and your Jaeger collector will struggle to keep up. Sampling strategies let you decide which requests get traced, giving you enough data for debugging without the overhead of tracing everything.

## How Sampling Works in Istio

When a request enters the mesh, the Istio sidecar (Envoy) decides whether to trace it. If the request already has trace headers (like `x-b3-traceid`), the sidecar respects the existing sampling decision. If there are no trace headers, the sidecar makes the sampling decision based on the configured rate.

The key thing to understand: the sampling decision is made at the edge of the mesh (the first service to receive the request) and propagated to all downstream services through trace headers. This ensures that if a request is sampled, all its spans are captured.

## Configuring Sampling Rate in Istio

The simplest configuration is a fixed sampling rate in the Istio mesh config:

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

The `sampling` value is a percentage from 0.0 to 100.0. So `1.0` means 1% of requests are traced, not 100%.

Common sampling rates:
- Development: 100.0 (trace everything)
- Staging: 10.0 (10% of requests)
- Production low traffic: 1.0 to 5.0
- Production high traffic: 0.1 to 1.0

Apply the configuration:

```bash
istioctl install -f istio-operator.yaml
```

## Per-Workload Sampling Override

You can override the global sampling rate for specific workloads using pod annotations:

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: payment-service
spec:
  template:
    metadata:
      annotations:
        proxy.istio.io/config: |
          tracing:
            sampling: 10.0
    spec:
      containers:
        - name: payment-service
          image: myregistry/payment-service:v1
```

This sets a 10% sampling rate for the payment service, regardless of the global setting. This is useful for services where you need more trace data for debugging or performance analysis.

## Configuring Jaeger Collector Sampling

Beyond Istio's client-side sampling, Jaeger's collector can apply additional sampling strategies. This is configured through a JSON configuration:

```yaml
apiVersion: v1
kind: ConfigMap
metadata:
  name: jaeger-sampling-config
  namespace: istio-system
data:
  sampling.json: |
    {
      "service_strategies": [
        {
          "service": "payment-service",
          "type": "probabilistic",
          "param": 0.5
        },
        {
          "service": "health-check",
          "type": "probabilistic",
          "param": 0.001
        }
      ],
      "default_strategy": {
        "type": "probabilistic",
        "param": 0.01
      }
    }
```

Mount this config in the Jaeger collector:

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: jaeger-collector
  namespace: istio-system
spec:
  template:
    spec:
      containers:
        - name: jaeger-collector
          image: jaegertracing/jaeger-collector:1.53
          args:
            - --sampling.strategies-file=/etc/jaeger/sampling.json
          volumeMounts:
            - name: sampling-config
              mountPath: /etc/jaeger
      volumes:
        - name: sampling-config
          configMap:
            name: jaeger-sampling-config
```

## Sampling Strategy Types

Jaeger supports several sampling strategies:

### Probabilistic Sampling

Each trace has a fixed probability of being sampled:

```json
{
  "type": "probabilistic",
  "param": 0.01
}
```

The `param` is the probability between 0 and 1. `0.01` means 1% of traces are sampled. Simple and predictable.

### Rate Limiting Sampling

Sample a fixed number of traces per second:

```json
{
  "type": "ratelimiting",
  "param": 10
}
```

This samples at most 10 traces per second, regardless of traffic volume. This is great for high-traffic services where you want a consistent trace volume.

### Per-Operation Sampling

Different API endpoints might need different sampling rates:

```json
{
  "service_strategies": [
    {
      "service": "api-gateway",
      "type": "probabilistic",
      "param": 0.01,
      "operation_strategies": [
        {
          "operation": "/api/checkout",
          "type": "probabilistic",
          "param": 0.5
        },
        {
          "operation": "/health",
          "type": "probabilistic",
          "param": 0.001
        }
      ]
    }
  ]
}
```

This samples the checkout endpoint at 50% (because it's critical and you want maximum visibility) while sampling health checks at 0.1% (because they're noisy and not interesting).

## Adaptive Sampling

For the most sophisticated setup, Jaeger supports adaptive sampling that automatically adjusts rates based on traffic patterns:

```json
{
  "default_strategy": {
    "type": "probabilistic",
    "param": 0.01
  },
  "default_sampling_probability": 0.01
}
```

With adaptive sampling enabled, Jaeger's collector analyzes incoming trace traffic and adjusts sampling rates per service and operation to maintain a target number of traces per second. This requires the collector to be configured with the `--sampling.strategies-file` flag and a running Jaeger backend.

## Choosing the Right Sampling Rate

Here is a rough guide for choosing sampling rates:

| Scenario | Recommended Rate |
|---|---|
| Local development | 100% |
| Staging environment | 10-50% |
| Production < 100 RPS | 5-10% |
| Production 100-1000 RPS | 1-5% |
| Production 1000-10000 RPS | 0.1-1% |
| Production > 10000 RPS | 0.01-0.1% |

The goal is to have enough traces to debug issues without overwhelming your storage. A good rule of thumb: you want at least a few traces per minute for every service, even at low sampling rates.

## Ensuring Critical Traces Are Captured

Sometimes you need to guarantee a trace is captured, regardless of the sampling rate. You can do this by setting the sampling decision in the request headers:

```bash
# Force sampling for a specific request
curl -H "x-b3-sampled: 1" http://my-service/api/checkout
```

The `x-b3-sampled: 1` header tells all Istio sidecars in the path to sample this trace. This is useful for synthetic monitoring or when debugging a specific issue.

You can also set this programmatically in your application:

```python
import requests

# Always trace this request
headers = {
    "x-b3-sampled": "1",
    "x-b3-traceid": generate_trace_id(),
    "x-b3-spanid": generate_span_id(),
}
response = requests.get("http://payment-service/process", headers=headers)
```

## Monitoring Sampling Effectiveness

Track how many traces are being collected versus dropped:

```promql
# Traces received by collector
sum(rate(jaeger_collector_traces_received_total[5m]))

# Traces rejected by collector
sum(rate(jaeger_collector_traces_rejected_total[5m]))

# Spans saved to storage
sum(rate(jaeger_collector_spans_saved_by_svc_total[5m])) by (svc)
```

If the rejection rate is high, your collector can't keep up. Either reduce the sampling rate or scale up the collector.

## Verifying Sampling Configuration

Check what sampling rate a proxy is using:

```bash
# Check the proxy config
istioctl proxy-config bootstrap <pod-name> -o json | grep -A 5 "tracing"
```

Generate test traffic and count traces in Jaeger to confirm the rate:

```bash
# Send 1000 requests
for i in $(seq 1 1000); do
  curl -s http://my-service/api/test > /dev/null
done

# Check Jaeger for the number of traces for this service
# At 1% sampling, you should see approximately 10 traces
```

## Summary

Jaeger sampling strategies in Istio control the trade-off between trace visibility and resource consumption. Start with Istio's global sampling rate for simplicity, use per-workload annotations for services that need different rates, and configure Jaeger's collector-side strategies for per-operation control. Use rate-limiting sampling for predictable storage costs and probabilistic sampling for proportional coverage. Always monitor your sampling effectiveness and adjust rates as your traffic patterns change.
