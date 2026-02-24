# How to Implement Progressive Delivery with Istio

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Istio, Kubernetes, Progressive Delivery, Deployment Strategy, Traffic Management

Description: A complete guide to implementing progressive delivery with Istio, covering canary releases, blue-green deployments, and traffic mirroring strategies.

---

Progressive delivery is a deployment strategy where you gradually expose new versions to increasingly larger audiences while monitoring for problems. It's an umbrella term that covers canary releases, blue-green deployments, A/B tests, and feature flags. Istio's traffic management capabilities make it a natural fit for implementing progressive delivery because it controls routing at the proxy level without changing your application code.

This guide covers how to implement a complete progressive delivery pipeline using Istio's native features.

## The Progressive Delivery Spectrum

Progressive delivery strategies range from simple to complex:

1. **Blue-Green**: Two identical environments. Switch traffic all at once.
2. **Canary**: Gradually shift traffic percentage to the new version.
3. **Traffic Mirroring**: Send a copy of production traffic to the new version without affecting users.
4. **Header-Based Routing**: Route specific users to the new version based on request headers.
5. **Feature Flags**: Enable features for specific user segments.

Istio supports all of these through VirtualService routing rules. You can combine them for a multi-stage delivery pipeline.

## Stage 1: Traffic Mirroring

Before sending any real user traffic to a new version, mirror production traffic to it. The mirror receives a copy of every request, but the response is discarded. Users always get responses from the current version.

```yaml
apiVersion: networking.istio.io/v1
kind: VirtualService
metadata:
  name: my-api
  namespace: production
spec:
  hosts:
  - my-api
  http:
  - route:
    - destination:
        host: my-api
        subset: stable
      weight: 100
    mirror:
      host: my-api
      subset: canary
    mirrorPercentage:
      value: 100
```

```yaml
apiVersion: networking.istio.io/v1
kind: DestinationRule
metadata:
  name: my-api
  namespace: production
spec:
  host: my-api
  subsets:
  - name: stable
    labels:
      version: v1
  - name: canary
    labels:
      version: v2
```

Monitor the canary's behavior under mirrored traffic:

```promql
# Error rate on mirrored traffic
sum(rate(istio_requests_total{
  destination_workload="my-api",
  destination_version="v2",
  response_code=~"5.*"
}[5m]))
```

If the canary handles mirrored traffic well, proceed to the next stage.

## Stage 2: Internal Testing with Header Routing

Route internal team traffic to the canary using a header-based rule. Production users still see the stable version:

```yaml
apiVersion: networking.istio.io/v1
kind: VirtualService
metadata:
  name: my-api
  namespace: production
spec:
  hosts:
  - my-api
  http:
  - match:
    - headers:
        x-canary:
          exact: "true"
    route:
    - destination:
        host: my-api
        subset: canary
  - route:
    - destination:
        host: my-api
        subset: stable
```

Internal testers add `x-canary: true` to their requests:

```bash
curl -H "x-canary: true" http://my-api.production/api/v1/resource
```

This lets your QA team test the new version with real production data and infrastructure before any external users see it.

## Stage 3: Percentage-Based Canary

After internal testing looks good, start routing a small percentage of real traffic:

```yaml
apiVersion: networking.istio.io/v1
kind: VirtualService
metadata:
  name: my-api
  namespace: production
spec:
  hosts:
  - my-api
  http:
  - match:
    - headers:
        x-canary:
          exact: "true"
    route:
    - destination:
        host: my-api
        subset: canary
  - route:
    - destination:
        host: my-api
        subset: stable
      weight: 95
    - destination:
        host: my-api
        subset: canary
      weight: 5
```

This sends 5% of regular traffic to the canary while still allowing header-based testing. Monitor key metrics:

```promql
# Compare latency between versions
histogram_quantile(0.99,
  sum(rate(istio_request_duration_milliseconds_bucket{
    destination_workload="my-api",
    destination_version="v2"
  }[5m])) by (le)
)
```

## Stage 4: Gradual Traffic Increase

If metrics look good, progressively increase the canary weight:

```bash
# 5% -> 10%
kubectl patch virtualservice my-api -n production --type='json' -p='[
  {"op": "replace", "path": "/spec/http/1/route/0/weight", "value": 90},
  {"op": "replace", "path": "/spec/http/1/route/1/weight", "value": 10}
]'

# 10% -> 25%
kubectl patch virtualservice my-api -n production --type='json' -p='[
  {"op": "replace", "path": "/spec/http/1/route/0/weight", "value": 75},
  {"op": "replace", "path": "/spec/http/1/route/1/weight", "value": 25}
]'

# 25% -> 50%
kubectl patch virtualservice my-api -n production --type='json' -p='[
  {"op": "replace", "path": "/spec/http/1/route/0/weight", "value": 50},
  {"op": "replace", "path": "/spec/http/1/route/1/weight", "value": 50}
]'
```

At each stage, wait for metrics to stabilize before proceeding.

## Stage 5: Full Promotion

Once the canary has proven itself at 50% traffic, promote it to stable:

```yaml
apiVersion: networking.istio.io/v1
kind: VirtualService
metadata:
  name: my-api
  namespace: production
spec:
  hosts:
  - my-api
  http:
  - route:
    - destination:
        host: my-api
        subset: stable
      weight: 100
```

Update the stable subset to point to the new version:

```bash
kubectl patch deployment my-api -n production -p '{"spec":{"template":{"metadata":{"labels":{"version":"v2"}}}}}'
```

## Automating the Pipeline

Doing all of this manually is tedious and error-prone. Automate it with Flagger:

```yaml
apiVersion: flagger.app/v1beta1
kind: Canary
metadata:
  name: my-api
  namespace: production
spec:
  targetRef:
    apiVersion: apps/v1
    kind: Deployment
    name: my-api
  service:
    port: 80
    targetPort: 8080
  analysis:
    interval: 1m
    threshold: 5
    stepWeights: [5, 10, 25, 50]
    metrics:
    - name: request-success-rate
      thresholdRange:
        min: 99
      interval: 1m
    - name: request-duration
      thresholdRange:
        max: 500
      interval: 1m
    webhooks:
    - name: smoke-test
      type: pre-rollout
      url: http://flagger-loadtester.production/
      metadata:
        type: bash
        cmd: "curl -sf http://my-api-canary.production/health"
    - name: mirror-test
      type: pre-rollout
      url: http://flagger-loadtester.production/
      metadata:
        cmd: "hey -z 30s -q 10 http://my-api-canary.production/"
```

## Blue-Green with Istio

For services that can't tolerate mixed-version traffic, use blue-green:

```yaml
apiVersion: networking.istio.io/v1
kind: VirtualService
metadata:
  name: my-api
  namespace: production
spec:
  hosts:
  - my-api
  http:
  - route:
    - destination:
        host: my-api
        subset: blue
      weight: 100
    - destination:
        host: my-api
        subset: green
      weight: 0
```

Switch traffic atomically:

```bash
kubectl patch virtualservice my-api -n production --type='json' -p='[
  {"op": "replace", "path": "/spec/http/0/route/0/weight", "value": 0},
  {"op": "replace", "path": "/spec/http/0/route/1/weight", "value": 100}
]'
```

This instantly sends all traffic to the green environment. If something goes wrong, switch back just as quickly.

## Combining Strategies

The real power of Istio is combining these strategies. A typical progressive delivery pipeline:

1. Mirror 100% of traffic to canary (stage 0)
2. Route internal testers via header (stage 1)
3. 5% canary traffic (stage 2)
4. 10% canary traffic (stage 3)
5. 25% canary traffic (stage 4)
6. 50% canary traffic (stage 5)
7. 100% promotion (stage 6)

Each stage gate is metric-based. If any stage fails, traffic goes back to 0% canary.

## Monitoring the Pipeline

Track the delivery pipeline with these metrics:

```promql
# Traffic distribution
sum(rate(istio_requests_total{destination_workload="my-api"}[5m])) by (destination_version)

# Error rate by version
sum(rate(istio_requests_total{destination_workload="my-api", response_code=~"5.*"}[5m])) by (destination_version)

# Latency by version
histogram_quantile(0.99, sum(rate(istio_request_duration_milliseconds_bucket{destination_workload="my-api"}[5m])) by (le, destination_version))
```

Progressive delivery with Istio turns deployments from binary events (works or doesn't) into a graduated, observable process. You start with zero risk (mirroring), progress through increasing exposure, and either promote with confidence or roll back before damage is done.
