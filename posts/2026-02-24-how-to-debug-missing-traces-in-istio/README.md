# How to Debug Missing Traces in Istio

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Istio, Tracing, Debugging, Troubleshooting, Envoy

Description: A systematic troubleshooting guide for diagnosing and fixing missing or broken distributed traces in Istio service mesh deployments.

---

You set up tracing in Istio, configured the backend, deployed your services, and... no traces. Or maybe you see some traces but they're incomplete, with gaps where services should appear. Missing traces is one of the most common issues people hit with Istio observability, and the causes range from simple configuration mistakes to subtle header propagation bugs.

Here's a systematic approach to finding and fixing the problem.

## Step 1: Verify Tracing Is Enabled

Start at the mesh level. Check if tracing is actually configured:

```bash
# Check the mesh configuration
kubectl get configmap istio -n istio-system -o yaml | grep -A10 "enableTracing\|extensionProviders"

# Check Telemetry resources
kubectl get telemetry -A
```

If `enableTracing` is missing or set to `false`, tracing won't work. If there are no extension providers configured, Envoy doesn't know where to send spans.

Expected output should include something like:

```yaml
enableTracing: true
extensionProviders:
  - name: zipkin
    zipkin:
      service: zipkin.observability.svc.cluster.local
      port: 9411
```

And a Telemetry resource:

```yaml
apiVersion: telemetry.istio.io/v1
kind: Telemetry
metadata:
  name: mesh-tracing
  namespace: istio-system
spec:
  tracing:
    - providers:
        - name: zipkin
      randomSamplingPercentage: 100
```

## Step 2: Check the Proxy Configuration

Verify that the sidecar actually has the tracing configuration loaded:

```bash
# Check bootstrap config for tracing
istioctl proxy-config bootstrap deploy/my-service -o json 2>/dev/null | \
  python3 -c "
import json, sys
data = json.load(sys.stdin)
tracing = data.get('bootstrap', {}).get('tracing', {})
if tracing:
    print(json.dumps(tracing, indent=2))
else:
    print('No tracing configuration found in bootstrap')
"
```

If the tracing configuration is missing from the bootstrap, the sidecar needs to be restarted to pick up the new mesh configuration:

```bash
kubectl rollout restart deployment/my-service
```

## Step 3: Verify Backend Connectivity

The sidecar needs to reach the tracing backend. Test connectivity:

```bash
# For Zipkin backend
kubectl exec deploy/my-service -c istio-proxy -- \
  curl -s -o /dev/null -w "%{http_code}" http://zipkin.observability:9411/health

# For Jaeger backend
kubectl exec deploy/my-service -c istio-proxy -- \
  curl -s -o /dev/null -w "%{http_code}" http://jaeger-collector.observability:9411/

# For OpenTelemetry Collector
kubectl exec deploy/my-service -c istio-proxy -- \
  curl -s -o /dev/null -w "%{http_code}" http://otel-collector.observability:4318/v1/traces
```

If connectivity fails, check:

```bash
# Is the backend running?
kubectl get pods -n observability

# Is the service reachable?
kubectl get svc -n observability

# Are there network policies blocking traffic?
kubectl get networkpolicy -A
```

## Step 4: Check the Sampling Rate

A sampling rate of 0 means no traces get collected. This is a surprisingly common issue when the default config is left at 0:

```bash
# Check effective sampling rate from the proxy
istioctl proxy-config bootstrap deploy/my-service -o json | grep -i "random_sampling\|sampling"
```

If the sampling rate is 0 or very low, you might not see traces for your test requests. Temporarily increase it:

```yaml
apiVersion: telemetry.istio.io/v1
kind: Telemetry
metadata:
  name: debug-tracing
  namespace: istio-system
spec:
  tracing:
    - providers:
        - name: zipkin
      randomSamplingPercentage: 100
```

Or force-trace a specific request:

```bash
kubectl exec deploy/sleep -- curl -H "X-B3-Sampled: 1" -s http://my-service:8080/api/test
```

## Step 5: Check for Header Propagation Issues

This is the most common cause of broken (not missing) traces. You see spans, but they're disconnected - each service shows as a separate single-span trace.

Test if headers are being propagated:

```bash
# Send a request with a known trace ID
kubectl exec deploy/sleep -- curl -s \
  -H "X-B3-TraceId: aaaabbbbccccddddeeeeffffaaaabbbb" \
  -H "X-B3-SpanId: 1111222233334444" \
  -H "X-B3-Sampled: 1" \
  http://my-service:8080/api/test
```

Then search for that trace ID (`aaaabbbbccccddddeeeeffffaaaabbbb`) in your tracing backend. If you only see one span for the service but the service calls other services, the application isn't propagating headers.

You can also verify by having the downstream service echo headers:

```bash
# If you have httpbin in the mesh
kubectl exec deploy/sleep -- curl -s \
  -H "X-B3-TraceId: aaaabbbbccccddddeeeeffffaaaabbbb" \
  -H "X-B3-SpanId: 1111222233334444" \
  -H "X-B3-Sampled: 1" \
  http://httpbin:8000/headers
```

Check if the B3 headers appear in the output. They should - Envoy adds them. But if your service sits between sleep and httpbin, the headers should also pass through your service.

## Step 6: Verify the Sidecar Is Injected

No sidecar means no automatic tracing:

```bash
# Check if the pod has a sidecar
kubectl get pod -l app=my-service -o jsonpath='{.items[0].spec.containers[*].name}'
```

You should see both your application container and `istio-proxy`. If `istio-proxy` is missing:

```bash
# Check if the namespace has injection enabled
kubectl get namespace my-namespace --show-labels | grep istio-injection

# Enable injection if needed
kubectl label namespace my-namespace istio-injection=enabled

# Restart pods to get sidecars
kubectl rollout restart deployment -n my-namespace
```

## Step 7: Check Envoy Tracing Stats

Envoy keeps statistics about tracing:

```bash
kubectl exec deploy/my-service -c istio-proxy -- \
  curl -s localhost:15000/stats | grep tracing
```

Look for:

- `tracing.random_sampling` - Number of randomly sampled requests
- `tracing.not_traceable` - Requests skipped for tracing
- `tracing.health_check` - Health check requests (not traced)

If `random_sampling` is 0 but you're sending traffic, sampling might be disabled.

## Step 8: Check the Tracing Backend

Sometimes the problem is on the backend side:

```bash
# Jaeger: Check collector logs
kubectl logs deploy/jaeger-collector -n observability | tail -20

# Zipkin: Check for errors
kubectl logs deploy/zipkin -n observability | tail -20

# OTel Collector: Check for export errors
kubectl logs deploy/otel-collector -n observability | grep -i "error\|dropped\|failed"
```

Common backend issues:

- Storage is full (Elasticsearch disk space)
- Too many spans are coming in (collector queue overflow)
- Authentication issues (if using a cloud-hosted backend)

## Step 9: Check for Protocol Mismatches

Istio supports multiple trace header formats. If you configured the extension provider to use one format but your application propagates another, traces will break.

Check which format is configured:

```bash
kubectl get configmap istio -n istio-system -o yaml | grep -A5 extensionProviders
```

If you're using the `zipkin` provider, Envoy generates B3 headers. If you're using `opentelemetry`, Envoy generates W3C `traceparent` headers. Your application's propagation code needs to match.

## Step 10: Enable Debug Logging

As a last resort, enable debug logging for the tracing subsystem:

```bash
# Set tracing log level to debug
istioctl proxy-config log deploy/my-service --level tracing:debug

# Watch the logs
kubectl logs deploy/my-service -c istio-proxy -f 2>&1 | grep -i "trace\|span"

# Generate a request
kubectl exec deploy/sleep -- curl -s http://my-service:8080/api/test

# Reset when done
istioctl proxy-config log deploy/my-service --level warning
```

## Quick Diagnostic Checklist

Run through this checklist when traces are missing:

```bash
# 1. Tracing enabled in mesh config?
kubectl get cm istio -n istio-system -o yaml | grep enableTracing

# 2. Extension provider configured?
kubectl get cm istio -n istio-system -o yaml | grep -A5 extensionProviders

# 3. Telemetry resource exists?
kubectl get telemetry -A

# 4. Sampling rate > 0?
kubectl get telemetry -n istio-system -o yaml | grep randomSamplingPercentage

# 5. Sidecar injected?
kubectl get pod -l app=my-service -o jsonpath='{.items[0].spec.containers[*].name}'

# 6. Backend reachable?
kubectl exec deploy/my-service -c istio-proxy -- curl -s http://zipkin.observability:9411/health

# 7. Backend receiving spans?
kubectl logs deploy/zipkin -n observability --tail=5
```

## Common Fixes Summary

| Symptom | Likely Cause | Fix |
|---------|-------------|-----|
| No traces at all | Tracing not enabled | Add enableTracing and extension provider |
| No traces | Sampling rate is 0 | Set randomSamplingPercentage > 0 |
| No traces | Backend unreachable | Fix service name/port or network policy |
| Disconnected spans | No header propagation | Add header forwarding in app code |
| Missing services in trace | Sidecar not injected | Enable injection for the namespace |
| Partial traces | Mixed header formats | Align app propagation with Istio config |
| Intermittent traces | Low sampling rate | Increase rate or use force-trace header |

## Summary

Debugging missing traces is a process of elimination. Start from the mesh configuration and work your way down through proxy configuration, backend connectivity, sampling rates, header propagation, and backend health. The most common issues are a sampling rate of 0, missing header propagation in application code, and backend connectivity problems. The checklist above covers 95% of the cases you'll encounter.
