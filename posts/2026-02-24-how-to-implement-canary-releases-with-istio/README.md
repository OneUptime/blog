# How to Implement Canary Releases with Istio

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Istio, Canary Release, Kubernetes, Traffic Management, Deployment

Description: Learn how to implement canary releases using Istio's weighted traffic routing to gradually roll out new versions and catch problems before they affect all users.

---

A canary release sends a small percentage of production traffic to a new version of your service. If the new version behaves well, you gradually increase the percentage until it handles all traffic. If something goes wrong, you route traffic back to the stable version.

The name comes from the coal mining practice of bringing canaries into mines to detect toxic gases. Your canary deployment detects bugs, performance regressions, and other problems before they hit your entire user base.

Kubernetes has a crude form of canary releases through replica counts, but it's imprecise and tied to pod scaling. Istio gives you exact percentage-based traffic splitting that's completely independent of how many pods you run.

## Preparing the Deployments

You need two deployments with version labels:

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: checkout-service-stable
  namespace: default
spec:
  replicas: 5
  selector:
    matchLabels:
      app: checkout-service
      version: stable
  template:
    metadata:
      labels:
        app: checkout-service
        version: stable
    spec:
      containers:
      - name: checkout
        image: myregistry/checkout:1.4.0
        ports:
        - containerPort: 8080
---
apiVersion: apps/v1
kind: Deployment
metadata:
  name: checkout-service-canary
  namespace: default
spec:
  replicas: 2
  selector:
    matchLabels:
      app: checkout-service
      version: canary
  template:
    metadata:
      labels:
        app: checkout-service
        version: canary
    spec:
      containers:
      - name: checkout
        image: myregistry/checkout:1.5.0
        ports:
        - containerPort: 8080
```

A single Service covers both:

```yaml
apiVersion: v1
kind: Service
metadata:
  name: checkout-service
  namespace: default
spec:
  selector:
    app: checkout-service
  ports:
  - port: 8080
    targetPort: 8080
```

## Setting Up Subsets

Define the stable and canary subsets:

```yaml
apiVersion: networking.istio.io/v1beta1
kind: DestinationRule
metadata:
  name: checkout-service-dr
  namespace: default
spec:
  host: checkout-service
  subsets:
  - name: stable
    labels:
      version: stable
  - name: canary
    labels:
      version: canary
```

## Starting the Canary at 5%

Begin by routing 5% of traffic to the canary:

```yaml
apiVersion: networking.istio.io/v1beta1
kind: VirtualService
metadata:
  name: checkout-service-vs
  namespace: default
spec:
  hosts:
  - checkout-service
  http:
  - route:
    - destination:
        host: checkout-service
        subset: stable
      weight: 95
    - destination:
        host: checkout-service
        subset: canary
      weight: 5
```

Apply it:

```bash
kubectl apply -f checkout-canary-5.yaml
```

Now 1 in 20 requests goes to the new version. That's enough to surface major problems without widespread impact.

## Monitoring the Canary

This is the most important part. Watch the canary's metrics and compare them to the stable version. With Istio's telemetry, you can query Prometheus:

```bash
# Error rate for canary
rate(istio_requests_total{destination_workload="checkout-service-canary",response_code=~"5.."}[5m])
/
rate(istio_requests_total{destination_workload="checkout-service-canary"}[5m])

# Error rate for stable
rate(istio_requests_total{destination_workload="checkout-service-stable",response_code=~"5.."}[5m])
/
rate(istio_requests_total{destination_workload="checkout-service-stable"}[5m])
```

Compare the error rates, response times (p50, p95, p99), and throughput between the two versions:

```bash
# P99 latency for canary
histogram_quantile(0.99, rate(istio_request_duration_milliseconds_bucket{destination_workload="checkout-service-canary"}[5m]))

# P99 latency for stable
histogram_quantile(0.99, rate(istio_request_duration_milliseconds_bucket{destination_workload="checkout-service-stable"}[5m]))
```

If the canary shows similar or better metrics, proceed to the next step.

## Gradually Increasing Traffic

Increase the canary percentage in stages. A typical progression looks like:

5% -> 10% -> 25% -> 50% -> 100%

At 10%:

```yaml
http:
- route:
  - destination:
      host: checkout-service
      subset: stable
    weight: 90
  - destination:
      host: checkout-service
      subset: canary
    weight: 10
```

At 25%:

```yaml
http:
- route:
  - destination:
      host: checkout-service
      subset: stable
    weight: 75
  - destination:
      host: checkout-service
      subset: canary
    weight: 25
```

At 50%:

```yaml
http:
- route:
  - destination:
      host: checkout-service
      subset: stable
    weight: 50
  - destination:
      host: checkout-service
      subset: canary
    weight: 50
```

Wait at each stage long enough to collect meaningful data. For high-traffic services, 15-30 minutes per stage might be enough. For lower-traffic services, you might need hours.

## Rolling Back the Canary

If the canary shows problems at any stage, route all traffic back to stable:

```yaml
http:
- route:
  - destination:
      host: checkout-service
      subset: stable
    weight: 100
  - destination:
      host: checkout-service
      subset: canary
    weight: 0
```

```bash
kubectl apply -f checkout-rollback.yaml
```

The rollback happens within seconds. No pods need to restart.

## Promoting the Canary

Once the canary is at 100% and stable, the release is complete. Clean up by updating the stable deployment to the new version and removing the canary:

```bash
# Update the stable deployment image
kubectl set image deployment/checkout-service-stable \
  checkout=myregistry/checkout:1.5.0 -n default

# Wait for rollout
kubectl rollout status deployment/checkout-service-stable -n default

# Delete the canary deployment
kubectl delete deployment checkout-service-canary -n default

# Update VirtualService to remove canary subset
kubectl apply -f checkout-stable-only.yaml
```

## Automating Canary Analysis

Manually watching dashboards is tedious and error-prone. You can automate canary analysis with a script:

```bash
#!/bin/bash

CANARY_ERROR_RATE=$(curl -s "http://prometheus:9090/api/v1/query" \
  --data-urlencode 'query=rate(istio_requests_total{destination_workload="checkout-service-canary",response_code=~"5.."}[5m]) / rate(istio_requests_total{destination_workload="checkout-service-canary"}[5m])' \
  | jq -r '.data.result[0].value[1]')

STABLE_ERROR_RATE=$(curl -s "http://prometheus:9090/api/v1/query" \
  --data-urlencode 'query=rate(istio_requests_total{destination_workload="checkout-service-stable",response_code=~"5.."}[5m]) / rate(istio_requests_total{destination_workload="checkout-service-stable"}[5m])' \
  | jq -r '.data.result[0].value[1]')

echo "Canary error rate: $CANARY_ERROR_RATE"
echo "Stable error rate: $STABLE_ERROR_RATE"

# Compare - if canary error rate is more than 2x stable, rollback
if (( $(echo "$CANARY_ERROR_RATE > $STABLE_ERROR_RATE * 2" | bc -l) )); then
  echo "Canary error rate too high. Rolling back..."
  kubectl apply -f checkout-rollback.yaml
  exit 1
fi

echo "Canary looks healthy."
```

For production-grade automation, consider using Flagger, which integrates with Istio to automate the full canary lifecycle including analysis, promotion, and rollback.

## Header-Based Canary Testing

Sometimes you want specific users or testers to always hit the canary. Use header-based routing alongside weighted routing:

```yaml
apiVersion: networking.istio.io/v1beta1
kind: VirtualService
metadata:
  name: checkout-service-vs
  namespace: default
spec:
  hosts:
  - checkout-service
  http:
  - match:
    - headers:
        x-canary:
          exact: "true"
    route:
    - destination:
        host: checkout-service
        subset: canary
  - route:
    - destination:
        host: checkout-service
        subset: stable
      weight: 90
    - destination:
        host: checkout-service
        subset: canary
      weight: 10
```

Requests with `x-canary: true` always go to the canary. Regular traffic follows the 90/10 split.

## Multiple Canaries

You can run multiple canary versions simultaneously by adding more subsets:

```yaml
spec:
  host: checkout-service
  subsets:
  - name: stable
    labels:
      version: stable
  - name: canary-a
    labels:
      version: canary-a
  - name: canary-b
    labels:
      version: canary-b
```

And split traffic between them:

```yaml
http:
- route:
  - destination:
      host: checkout-service
      subset: stable
    weight: 90
  - destination:
      host: checkout-service
      subset: canary-a
    weight: 5
  - destination:
      host: checkout-service
      subset: canary-b
    weight: 5
```

This is useful when you're testing two different approaches to the same problem and want to compare them head-to-head.

Canary releases with Istio give you a safety net for every deployment. The gradual traffic shift lets you validate changes against real production traffic while limiting blast radius. Combined with automated monitoring and rollback, it turns deployments from stressful events into routine operations.
