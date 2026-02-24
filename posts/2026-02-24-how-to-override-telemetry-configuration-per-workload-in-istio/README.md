# How to Override Telemetry Configuration per Workload in Istio

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Istio, Telemetry API, Workload Configuration, Observability, Service Mesh

Description: How to apply workload-specific telemetry overrides in Istio for fine-grained control over metrics, logging, and tracing per service.

---

Sometimes namespace-level telemetry overrides aren't granular enough. You might have one service in a namespace that needs full tracing while the rest are fine with 1% sampling. Or a single noisy workload that generates so much metric data it's worth disabling some of its metrics independently.

The Telemetry API supports workload-level overrides using label selectors. A Telemetry resource with a `selector` field applies only to pods matching those labels, giving you per-service (or even per-deployment) control.

## How Workload Selectors Work

A workload-level Telemetry resource targets specific pods using `spec.selector.matchLabels`:

```yaml
apiVersion: telemetry.istio.io/v1
kind: Telemetry
metadata:
  name: reviews-telemetry
  namespace: bookinfo
spec:
  selector:
    matchLabels:
      app: reviews
  tracing:
    - providers:
        - name: zipkin
      randomSamplingPercentage: 100.0
```

This applies 100% trace sampling only to pods with the label `app: reviews` in the `bookinfo` namespace. All other pods in the namespace use the namespace-level or mesh-wide configuration.

## The Override Priority

Workload-level overrides sit at the top of the hierarchy:

1. Mesh-wide (`default` Telemetry in `istio-system`) - lowest priority
2. Namespace-level (`default` Telemetry in the workload's namespace)
3. Workload-level (Telemetry with `selector` in the workload's namespace) - highest priority

If all three exist, the workload-level configuration wins for the matched pods. Unmatched pods fall back to namespace-level, then mesh-wide.

## Example: Full Tracing for a Single Service

Your mesh-wide tracing is at 1%. A developer is debugging an issue with the `checkout` service and needs full traces:

```yaml
apiVersion: telemetry.istio.io/v1
kind: Telemetry
metadata:
  name: checkout-debug-tracing
  namespace: production
spec:
  selector:
    matchLabels:
      app: checkout
  tracing:
    - providers:
        - name: zipkin
      randomSamplingPercentage: 100.0
      customTags:
        debug_session:
          literal:
            value: "checkout-investigation-feb-2026"
```

Apply it, reproduce the issue, then delete it when done:

```bash
kubectl apply -f checkout-debug.yaml

# ... debug the issue ...

kubectl delete -f checkout-debug.yaml
```

The custom tag makes it easy to find these traces in Jaeger later.

## Example: Disable Metrics for a Noisy Workload

A health check service gets called thousands of times per second and generates tons of metrics that you never look at:

```yaml
apiVersion: telemetry.istio.io/v1
kind: Telemetry
metadata:
  name: healthcheck-quiet
  namespace: infra
spec:
  selector:
    matchLabels:
      app: healthcheck
  metrics:
    - providers:
        - name: prometheus
      overrides:
        - match:
            metric: ALL_METRICS
          disabled: true
  accessLogging:
    - providers:
        - name: envoy
      disabled: true
  tracing:
    - providers:
        - name: zipkin
      randomSamplingPercentage: 0
```

This completely silences the healthcheck workload from a telemetry perspective.

## Example: Custom Metrics for a Specific Service

Your payments service needs a `payment_method` label on its request metrics that other services don't need:

```yaml
apiVersion: telemetry.istio.io/v1
kind: Telemetry
metadata:
  name: payments-custom-metrics
  namespace: production
spec:
  selector:
    matchLabels:
      app: payments
  metrics:
    - providers:
        - name: prometheus
      overrides:
        - match:
            metric: REQUEST_COUNT
          tagOverrides:
            payment_method:
              operation: UPSERT
              value: "request.headers['x-payment-method'] || 'unknown'"
            payment_status:
              operation: UPSERT
              value: "response.headers['x-payment-status'] || 'unknown'"
```

Only the payments service gets these extra labels. Other services continue with the default label set, keeping their metric cardinality low.

## Example: Verbose Logging for a Specific Workload

During an incident, you need detailed access logs from just one service:

```yaml
apiVersion: telemetry.istio.io/v1
kind: Telemetry
metadata:
  name: api-gateway-verbose
  namespace: production
spec:
  selector:
    matchLabels:
      app: api-gateway
  accessLogging:
    - providers:
        - name: envoy
      filter:
        expression: ""
```

An empty filter expression logs every request. When the incident is resolved, delete this resource to go back to the namespace default (which might only log errors).

## Targeting Specific Versions

You can target a specific version of a service by adding the version label to the selector:

```yaml
apiVersion: telemetry.istio.io/v1
kind: Telemetry
metadata:
  name: reviews-v2-debug
  namespace: bookinfo
spec:
  selector:
    matchLabels:
      app: reviews
      version: v2
  tracing:
    - providers:
        - name: zipkin
      randomSamplingPercentage: 100.0
```

This traces 100% of requests to `reviews-v2` only. The `reviews-v1` and `reviews-v3` pods keep the default sampling rate.

## Multiple Workload Overrides in One Namespace

You can have multiple Telemetry resources with different selectors in the same namespace:

```yaml
apiVersion: telemetry.istio.io/v1
kind: Telemetry
metadata:
  name: frontend-telemetry
  namespace: production
spec:
  selector:
    matchLabels:
      app: frontend
  tracing:
    - providers:
        - name: zipkin
      randomSamplingPercentage: 10.0
---
apiVersion: telemetry.istio.io/v1
kind: Telemetry
metadata:
  name: backend-api-telemetry
  namespace: production
spec:
  selector:
    matchLabels:
      app: backend-api
  tracing:
    - providers:
        - name: zipkin
      randomSamplingPercentage: 50.0
  accessLogging:
    - providers:
        - name: json-access-log
```

The frontend gets 10% sampling with default logging. The backend API gets 50% sampling with JSON-formatted access logs. Everything else in the namespace uses the namespace default.

## Verifying Workload Overrides

### Check Which Telemetry Resources Exist

```bash
kubectl get telemetry -n production
```

Output:

```
NAME                     AGE
default                  30d
frontend-telemetry       2h
backend-api-telemetry    2h
```

### Verify the Effective Configuration

Check the proxy configuration on a specific pod:

```bash
# Get the pod name
kubectl get pods -n production -l app=frontend

# Check the proxy's tracing configuration
istioctl proxy-config bootstrap frontend-abc123-xyz -n production -o json | python3 -c "
import json, sys
config = json.load(sys.stdin)
tracing = config.get('bootstrap', {}).get('tracing', {})
print(json.dumps(tracing, indent=2))
"
```

### Generate Traffic and Check

Send requests to the specific workload and verify traces appear in Jaeger:

```bash
# Send 100 requests
for i in $(seq 1 100); do
  curl -s http://frontend.production/api/test
done

# At 10% sampling, you should see roughly 10 traces in Jaeger
```

## Lifecycle Management

Workload-level overrides are often temporary. They're useful for debugging sessions, incident investigation, or temporary feature testing. Treat them like feature flags.

### Track Temporary Overrides

Add annotations to track why overrides exist:

```yaml
apiVersion: telemetry.istio.io/v1
kind: Telemetry
metadata:
  name: checkout-debug-tracing
  namespace: production
  annotations:
    reason: "Debugging intermittent 503 errors - JIRA-1234"
    created-by: "oncall-eng"
    expires: "2026-02-28"
spec:
  selector:
    matchLabels:
      app: checkout
  tracing:
    - providers:
        - name: zipkin
      randomSamplingPercentage: 100.0
```

### Clean Up Script

Set up a simple check to find stale overrides:

```bash
#!/bin/bash
echo "Workload-level Telemetry overrides:"
kubectl get telemetry -A -o json | python3 -c "
import json, sys
data = json.load(sys.stdin)
for item in data.get('items', []):
    spec = item.get('spec', {})
    if 'selector' in spec:
        name = item['metadata']['name']
        ns = item['metadata']['namespace']
        age = item['metadata'].get('creationTimestamp', 'unknown')
        annotations = item['metadata'].get('annotations', {})
        reason = annotations.get('reason', 'no reason provided')
        print(f'{ns}/{name} (created: {age}) - {reason}')
"
```

## Best Practices

1. **Use workload overrides sparingly.** They add configuration complexity. If all services in a namespace need the same override, use a namespace-level override instead.

2. **Always set a reason annotation.** Future you (or your teammate) will wonder why this override exists.

3. **Clean up temporary overrides.** Debug overrides that stay forever waste resources and make configuration harder to understand.

4. **Test selectors carefully.** If your selector is too broad, it might match pods you didn't intend. If it's too narrow, it won't match anything.

5. **Watch for selector overlaps.** If two Telemetry resources both match the same pod, the behavior depends on how they merge. Avoid this by keeping selectors specific.

Workload-level overrides give you surgical precision over telemetry. Use them for debugging, special compliance requirements, or to tame individual noisy services. Just make sure to manage their lifecycle so they don't accumulate into configuration debt.
